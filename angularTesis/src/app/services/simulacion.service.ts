import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, timer, switchMap, takeWhile, of, forkJoin, catchError, Subscription } from 'rxjs';
import { SimulacionDTO } from '../dtos/simulacion-dto';
import { Simulacion } from '../models/simulacion.model';
import { environment } from '../../environments/environment.development';
import { Materia } from '../models/materia.model';
import { SimulacionJobResponse } from '../dtos/simulacion-job-response.dto';
import { SimulacionJobStatus } from '../dtos/simulacion-job-status.dto';

@Injectable({
  providedIn: 'root'
})
export class SimulacionService {
  private readonly STORAGE_KEY = 'resultadoSimulacion';
  private readonly JOBS_STORAGE_KEY = 'simulacionJobs';
  resultadoSimulacion!: Record<string, { materias: Materia[] }>;

  // Subject para la simulación organizada por semestres
  private simulacionSubject = new BehaviorSubject<any>(null);
  simulacion$ = this.simulacionSubject.asObservable();

  // Subject para las materias planas (todas juntas)
  private materiasSimuladasSubject = new BehaviorSubject<Materia[]>([]);
  materiasSimuladas$ = this.materiasSimuladasSubject.asObservable();

  // Subject para las materias agrupadas por key (semestre)
  private materiasSimuladasPorKeySubject = new BehaviorSubject<Record<string, Materia[]>>({});
  materiasSimuladasPorKey$ = this.materiasSimuladasPorKeySubject.asObservable();

  // Subject para notificaciones de simulaciones
  private notificacionesSubject = new BehaviorSubject<string[]>([]);
  notificaciones$ = this.notificacionesSubject.asObservable();

  // Subject para jobs activos
  private jobsActivosSubject = new BehaviorSubject<SimulacionJobStatus[]>([]);
  jobsActivos$ = this.jobsActivosSubject.asObservable();

  // Subscription para el polling
  private intervalSubscription?: Subscription;

  constructor(private http: HttpClient) {
    // Si existe en localStorage, la cargamos
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored) {
      this.resultadoSimulacion = JSON.parse(stored);
      this.simulacionSubject.next(this.resultadoSimulacion);
    }

    // Cargar jobs activos del localStorage
    this.cargarJobsActivos();
    
    // Monitorear jobs activos
    this.monitorearJobsActivos();
  }

  // Método para iniciar simulación asíncrona
  iniciarSimulacion(simulacionDTO: SimulacionDTO): Observable<SimulacionJobResponse> {
    return this.http.post<SimulacionJobResponse>(`${environment.SERVER_URL}/api/simulacion/iniciar`, simulacionDTO);
  }

  // Método para consultar estado de un job
  consultarEstadoJob(jobId: string): Observable<SimulacionJobStatus> {
    return this.http.get<SimulacionJobStatus>(`${environment.SERVER_URL}/api/simulacion/estado/${jobId}`);
  }

  // Método para obtener resultado de un job completado
  obtenerResultadoJob(jobId: string): Observable<any> {
    return this.http.get<any>(`${environment.SERVER_URL}/api/simulacion/resultado/${jobId}`);
  }

  // Agregar job al monitoreo
  agregarJobAlMonitoreo(jobId: string, descripcion: string): void {
    const jobsActivos = this.getJobsActivos();
    const nuevoJob: SimulacionJobStatus = {
      jobId: jobId,
      estado: 'PENDIENTE',
      mensaje: descripcion
    };
    
    jobsActivos.push(nuevoJob);
    this.guardarJobsActivos(jobsActivos);
    this.jobsActivosSubject.next(jobsActivos);
  }

  // Monitorear jobs activos periódicamente
  private monitorearJobsActivos(): void {
    console.log('Iniciando monitoreo de jobs activos...');
    
    this.intervalSubscription = timer(0, 5000) // Revisar cada 5 segundos
      .pipe(
        switchMap(() => {
          const jobsActivos = this.getJobsActivos();
          console.log('Jobs en localStorage:', jobsActivos);
          
          const jobsPendientes = jobsActivos.filter(job => 
            job.estado === 'PENDIENTE' || job.estado === 'EN_PROGRESO' || job.estado === 'EN_PROCESO'
          );
          
          console.log('Jobs pendientes para verificar:', jobsPendientes);
          
          if (jobsPendientes.length === 0) {
            console.log('No hay jobs pendientes, finalizando monitoreo');
            return of([]);
          }

          console.log('Verificando estado de jobs:', jobsPendientes.map(j => j.jobId));

          // Consultar estado de cada job pendiente - CORREGIDO
          const consultas = jobsPendientes.map(job => 
            this.consultarEstadoJob(job.jobId).pipe(
              catchError(error => {
                console.error(`Error consultando job ${job.jobId}:`, error);
                return of(null); // Retornar null en caso de error
              })
            )
          );
          
          // Usar forkJoin para ejecutar todas las consultas en paralelo
          return consultas.length > 0 ? forkJoin(consultas) : of([]);
        })
      )
      .subscribe(resultados => {
        console.log('Resultados del polling:', resultados);
        if (resultados && resultados.length > 0) {
          resultados.forEach(status => {
            if (status) { // Solo procesar si no es null (error)
              console.log('Estado recibido del backend:', status);
              this.actualizarEstadoJob(status);
            }
          });
        }
      });
  }

  // Actualizar estado de un job específico
  private actualizarEstadoJob(status: SimulacionJobStatus): void {
    console.log('Actualizando estado de job:', status);
    
    const jobsActivos = this.getJobsActivos();
    const index = jobsActivos.findIndex(job => job.jobId === status.jobId);
    
    if (index !== -1) {
      const estadoAnterior = jobsActivos[index].estado;
      jobsActivos[index] = status;
      
      console.log(`Job ${status.jobId} cambió de ${estadoAnterior} a ${status.estado}`);
      
      // Si el job está completado, obtener el resultado
      if (status.estado === 'COMPLETADA') {
        console.log('Job completado, obteniendo resultado...');
        this.obtenerResultadoJob(status.jobId).subscribe({
          next: (resultado) => {
            console.log('Resultado obtenido:', resultado);
            this.setSimulacion(resultado);
            this.agregarNotificacion(`Simulación completada: ${status.mensaje || 'Simulación finalizada'}`);
            
          },
          error: (error) => {
            console.error('Error obteniendo resultado:', error);
          }
        });
      } else if (status.estado === 'ERROR') {
        console.log('Job con error:', status.error);
        this.agregarNotificacion(`Error en simulación: ${status.error || 'Error desconocido'}`);
        
        // Remover job con error después de un tiempo
        setTimeout(() => {
          this.removerJobDelMonitoreo(status.jobId);
        }, 60000); // 1 minuto
      }
      
      // Actualizar localStorage y notificar cambios
      this.guardarJobsActivos(jobsActivos);
      this.jobsActivosSubject.next([...jobsActivos]);
    } else {
      console.warn(`Job ${status.jobId} no encontrado en la lista activa`);
    }
  }

  // Remover job del monitoreo
  removerJobDelMonitoreo(jobId: string): void {
    const jobsActivos = this.getJobsActivos();
    const jobsFiltrados = jobsActivos.filter(job => job.jobId !== jobId);
    this.guardarJobsActivos(jobsFiltrados);
    this.jobsActivosSubject.next(jobsFiltrados);
  }

  // Métodos para manejar localStorage de jobs
  private getJobsActivos(): SimulacionJobStatus[] {
    const stored = localStorage.getItem(this.JOBS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  private guardarJobsActivos(jobs: SimulacionJobStatus[]): void {
    localStorage.setItem(this.JOBS_STORAGE_KEY, JSON.stringify(jobs));
  }

  private cargarJobsActivos(): void {
    const jobs = this.getJobsActivos();
    this.jobsActivosSubject.next(jobs);
  }

  // Métodos para notificaciones
  agregarNotificacion(mensaje: string): void {
    const notificaciones = this.getNotificaciones();
    notificaciones.push(mensaje);
    this.guardarNotificaciones(notificaciones);
    this.notificacionesSubject.next(notificaciones);
  }

  limpiarNotificaciones(): void {
    this.guardarNotificaciones([]);
    this.notificacionesSubject.next([]);
  }

  private getNotificaciones(): string[] {
    const stored = localStorage.getItem('simulacion-notificaciones');
    return stored ? JSON.parse(stored) : [];
  }

  private guardarNotificaciones(notificaciones: string[]): void {
    localStorage.setItem('simulacion-notificaciones', JSON.stringify(notificaciones));
  }

  // Métodos existentes (simulación síncrona)
  postSimulacion(simulacionDTO: SimulacionDTO): Observable<any> {
    return this.http.post(`${environment.SERVER_URL}/api/simulacion`, simulacionDTO);
  }

  setSimulacion(simulacion: any): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(simulacion));
    this.resultadoSimulacion = simulacion;
    this.simulacionSubject.next(simulacion);

    // Extraer todas las materias y emitir por el Subject de materias planas
    const todasLasMaterias: Materia[] = [];
    const gruposPorKey: Record<string, Materia[]> = {};
    
    for (const semestre in simulacion) {
      if (simulacion[semestre] && simulacion[semestre].materias) {
        const materiasDelSemestre = simulacion[semestre].materias;
        todasLasMaterias.push(...materiasDelSemestre);
        gruposPorKey[semestre] = materiasDelSemestre;
      }
    }
    
    this.materiasSimuladasSubject.next(todasLasMaterias);
    this.materiasSimuladasPorKeySubject.next(gruposPorKey);
  }

  // Método para establecer materias agrupadas por key
  setMateriasSimuladasPorKey(grupos: Record<string, Materia[]>): void {
    this.materiasSimuladasPorKeySubject.next(grupos);
    
    // También actualizar las materias planas
    const todasLasMaterias: Materia[] = Object.values(grupos).flatMap(arr => arr);
    this.materiasSimuladasSubject.next(todasLasMaterias);
  }

  getSimulacion(): any {
    return this.resultadoSimulacion;
  }

  resetearSimulacion(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    this.resultadoSimulacion = {};
    this.simulacionSubject.next(null);
    this.materiasSimuladasSubject.next([]);
    this.materiasSimuladasPorKeySubject.next({});
  }

  // Limpiar recursos al destruir el servicio
  ngOnDestroy(): void {
    if (this.intervalSubscription) {
      this.intervalSubscription.unsubscribe();
    }
  }
}
