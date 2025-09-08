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
  private readonly NOMBRE_SIMULACION_KEY = 'nombreSimulacionActual';
  private readonly PARAMETROS_SIMULACION_KEY = 'parametrosSimulacionActual';
  private readonly JOB_ID_ACTUAL_KEY = 'jobIdSimulacionActual';
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
    // Si existe en sessionStorage, la cargamos
    const stored = sessionStorage.getItem(this.STORAGE_KEY);
    if (stored) {
      this.resultadoSimulacion = JSON.parse(stored);
      this.simulacionSubject.next(this.resultadoSimulacion);
    }

    // Cargar jobs activos del sessionStorage
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
  agregarJobAlMonitoreo(jobId: string, descripcion: string, nombre: string): void {
    const jobsActivos = this.getJobsActivos();
    const nuevoJob: SimulacionJobStatus = {
      jobId: jobId,
      estado: 'PENDIENTE',
      mensaje: descripcion,
      nombre: nombre
    };
    
    jobsActivos.push(nuevoJob);
    this.guardarJobsActivos(jobsActivos);
    this.jobsActivosSubject.next(jobsActivos);
  }

  // Monitorear jobs activos
  private monitorearJobsActivos(): void {
    console.log('Iniciando monitoreo de jobs activos...');
    
    this.intervalSubscription = timer(0, 5000) // Revisar cada 5 segundos
      .pipe(
        switchMap(() => {
          const jobsActivos = this.getJobsActivos();
          
          const jobsPendientes = jobsActivos.filter(job => 
            job.estado === 'PENDIENTE' || job.estado === 'EN_PROGRESO' || job.estado === 'EN_PROCESO'
          );
          
          
          if (jobsPendientes.length === 0) {
            return of([]);
          }

          // Consultar estado de cada job pendiente - CORREGIDO
          const consultas = jobsPendientes.map(job => 
            this.consultarEstadoJob(job.jobId).pipe(
              catchError(error => {
                return of(null);
              })
            )
          );
          
          return consultas.length > 0 ? forkJoin(consultas) : of([]);
        })
      )
      .subscribe(resultados => {
        if (resultados && resultados.length > 0) {
          resultados.forEach(status => {
            if (status) { // Solo procesar si no es null (error)
              this.actualizarEstadoJob(status);
            }
          });
        }
      });
  }

  // Actualizar estado de un job específico
  private actualizarEstadoJob(status: SimulacionJobStatus): void {
    
    const jobsActivos = this.getJobsActivos();
    const index = jobsActivos.findIndex(job => job.jobId === status.jobId);
    
    if (index !== -1) {
      const estadoAnterior = jobsActivos[index].estado;
      const nombreOriginal = jobsActivos[index].nombre; 
      
      jobsActivos[index] = {
        ...status,
        nombre: nombreOriginal
      };
      
      // Si el job está completado, obtener el resultado
      if (status.estado === 'COMPLETADA') {
        this.obtenerResultadoJob(status.jobId).subscribe({
          next: (resultado) => {
            this.setSimulacion(resultado);
            this.setJobIdSimulacionActual(status.jobId); // Guardar el jobId de la simulación completada
            this.agregarNotificacion(`Simulación completada: ${nombreOriginal}`);
            
          },
          error: (error) => {
            console.error('Error obteniendo resultado:', error);
          }
        });
      } else if (status.estado === 'ERROR') {
        this.agregarNotificacion(`Error en simulación: ${status.error || 'Error desconocido'}`);
        
        setTimeout(() => {
          this.removerJobDelMonitoreo(status.jobId);
        }, 60000); // 1 minuto
      }
      
      // Actualizar sessionStorage y notificar cambios
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

  // Métodos para manejar sessionStorage de jobs
  private getJobsActivos(): SimulacionJobStatus[] {
    const stored = sessionStorage.getItem(this.JOBS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  private guardarJobsActivos(jobs: SimulacionJobStatus[]): void {
    sessionStorage.setItem(this.JOBS_STORAGE_KEY, JSON.stringify(jobs));
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
    const stored = sessionStorage.getItem('simulacion-notificaciones');
    return stored ? JSON.parse(stored) : [];
  }

  private guardarNotificaciones(notificaciones: string[]): void {
    sessionStorage.setItem('simulacion-notificaciones', JSON.stringify(notificaciones));
  }

  // Métodos existentes
  postSimulacion(simulacionDTO: SimulacionDTO): Observable<any> {
    return this.http.post(`${environment.SERVER_URL}/api/simulacion`, simulacionDTO);
  }

  setSimulacion(simulacion: any): void {
    sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(simulacion));
    this.resultadoSimulacion = simulacion;
    this.simulacionSubject.next(simulacion);

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

  setNombreSimulacionActual(nombre: string): void {
    sessionStorage.setItem(this.NOMBRE_SIMULACION_KEY, nombre);
  }

  getNombreSimulacionActual(): string | null {
    return sessionStorage.getItem(this.NOMBRE_SIMULACION_KEY);
  }

  limpiarNombreSimulacionActual(): void {
    sessionStorage.removeItem(this.NOMBRE_SIMULACION_KEY);
  }

  setParametrosSimulacionActual(parametros: any): void {
    sessionStorage.setItem(this.PARAMETROS_SIMULACION_KEY, JSON.stringify(parametros));
  }

  getParametrosSimulacionActual(): any | null {
    const parametros = sessionStorage.getItem(this.PARAMETROS_SIMULACION_KEY);
    return parametros ? JSON.parse(parametros) : null;
  }

  limpiarParametrosSimulacionActual(): void {
    sessionStorage.removeItem(this.PARAMETROS_SIMULACION_KEY);
  }

  setJobIdSimulacionActual(jobId: string): void {
    sessionStorage.setItem(this.JOB_ID_ACTUAL_KEY, jobId);
  }

  getJobIdSimulacionActual(): string | null {
    return sessionStorage.getItem(this.JOB_ID_ACTUAL_KEY);
  }

  limpiarJobIdSimulacionActual(): void {
    sessionStorage.removeItem(this.JOB_ID_ACTUAL_KEY);
  }

  resetearSimulacion(): void {
    sessionStorage.removeItem(this.STORAGE_KEY);
    this.limpiarNombreSimulacionActual();
    this.limpiarParametrosSimulacionActual();
    this.limpiarJobIdSimulacionActual();
    this.resultadoSimulacion = {};
    this.simulacionSubject.next(null);
    this.materiasSimuladasSubject.next([]);
    this.materiasSimuladasPorKeySubject.next({});
  }

  ngOnDestroy(): void {
    if (this.intervalSubscription) {
      this.intervalSubscription.unsubscribe();
    }
  }
}
