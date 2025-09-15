import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import {
  Observable,
  BehaviorSubject,
  timer,
  switchMap,
  takeWhile,
  of,
  forkJoin,
  catchError,
  Subscription,
} from 'rxjs';
import { SimulacionDTO } from '../dtos/simulacion-dto';
import { Simulacion } from '../models/simulacion.model';
import { environment } from '../../environments/environment';
import { Materia } from '../models/materia.model';
import { SimulacionJobResponse } from '../dtos/simulacion-job-response.dto';
import { SimulacionJobStatus } from '../dtos/simulacion-job-status.dto';

@Injectable({
  providedIn: 'root',
})
export class SimulacionService {
  private apiUrl = `${environment.SERVER_URL}`;
  private readonly STORAGE_KEY = 'resultadoSimulacion';
  private readonly JOBS_STORAGE_KEY = 'simulacionJobs';
  private readonly NOMBRE_SIMULACION_KEY = 'nombreSimulacionActual';
  private readonly PARAMETROS_SIMULACION_KEY = 'parametrosSimulacionActual';
  private readonly JOB_ID_ACTUAL_KEY = 'jobIdSimulacionActual';

  public resultadoSimulacion!: Record<string, { materias: Materia[] }>;

  private simulacionSubject = new BehaviorSubject<any>(null);
  simulacion$ = this.simulacionSubject.asObservable();

  private simulacion: { [semestre: string]: { materias: Materia[] } } = {};

  // Materias planas y agrupadas
  private materiasSimuladasSubject = new BehaviorSubject<Materia[]>([]);
  materiasSimuladas$ = this.materiasSimuladasSubject.asObservable();

  private materiasSimuladasPorKeySubject = new BehaviorSubject<
    Record<string, Materia[]>
  >({});
  materiasSimuladasPorKey$ =
    this.materiasSimuladasPorKeySubject.asObservable();

  // Notificaciones
  private notificacionesSubject = new BehaviorSubject<string[]>([]);
  notificaciones$ = this.notificacionesSubject.asObservable();

  // Jobs
  private jobsActivosSubject = new BehaviorSubject<SimulacionJobStatus[]>([]);
  jobsActivos$ = this.jobsActivosSubject.asObservable();

  private intervalSubscription?: Subscription;

  constructor(private http: HttpClient) {
    const stored = sessionStorage.getItem(this.STORAGE_KEY);
    if (stored) {
      this.resultadoSimulacion = JSON.parse(stored);
      this.simulacionSubject.next(this.resultadoSimulacion);
    }
    this.cargarJobsActivos();
    this.monitorearJobsActivos();
  }

  generarSimulacion(
    simulacionDTO: SimulacionDTO
  ): Observable<Record<string, { materias: Materia[] }>> {
    return this.http.post<Record<string, { materias: Materia[] }>>(
      `${environment.SERVER_URL}/api/simulaciones/generar`,
      simulacionDTO
    );
  }

  iniciarSimulacion(
    simulacionDTO: SimulacionDTO
  ): Observable<SimulacionJobResponse> {
    return this.http.post<SimulacionJobResponse>(
      `${environment.SERVER_URL}/api/simulaciones/iniciar`,
      simulacionDTO
    );
  }

  consultarEstadoJob(jobId: string): Observable<SimulacionJobStatus> {
    return this.http.get<SimulacionJobStatus>(
      `${environment.SERVER_URL}/api/simulaciones/estado/${jobId}`
    );
  }

  obtenerResultadoJob(jobId: string): Observable<any> {
    return this.http.get<any>(
      `${environment.SERVER_URL}/api/simulaciones/resultado/${jobId}`
    );
  }

  agregarJobAlMonitoreo(jobId: string, descripcion: string, nombre: string) {
    const jobsActivos = this.getJobsActivos();
    const nuevoJob: SimulacionJobStatus = {
      jobId,
      estado: 'PENDIENTE',
      mensaje: descripcion,
      nombre,
    };
    jobsActivos.push(nuevoJob);
    this.guardarJobsActivos(jobsActivos);
    this.jobsActivosSubject.next(jobsActivos);
  }

  private monitorearJobsActivos(): void {
    this.intervalSubscription = timer(0, 5000)
      .pipe(
        switchMap(() => {
          const jobsActivos = this.getJobsActivos();
          const jobsPendientes = jobsActivos.filter(
            (job) =>
              job.estado === 'PENDIENTE' ||
              job.estado === 'EN_PROGRESO' ||
              job.estado === 'EN_PROCESO'
          );

          if (jobsPendientes.length === 0) return of([]);

          const consultas = jobsPendientes.map((job) =>
            this.consultarEstadoJob(job.jobId).pipe(catchError(() => of(null)))
          );
          return consultas.length > 0 ? forkJoin(consultas) : of([]);
        })
      )
      .subscribe((resultados) => {
        resultados.forEach((status) => {
          if (status) this.actualizarEstadoJob(status);
        });
      });
  }

  private actualizarEstadoJob(status: SimulacionJobStatus): void {
    const jobsActivos = this.getJobsActivos();
    const index = jobsActivos.findIndex((job) => job.jobId === status.jobId);

    if (index !== -1) {
      const nombreOriginal = jobsActivos[index].nombre;
      jobsActivos[index] = { ...status, nombre: nombreOriginal };

      if (status.estado === 'COMPLETADA') {
        this.obtenerResultadoJob(status.jobId).subscribe({
          next: (resultado) => {
            this.setSimulacion(resultado);
            this.setJobIdSimulacionActual(status.jobId);
            this.agregarNotificacion(`Simulación completada: ${nombreOriginal}`);
          },
        });
      } else if (status.estado === 'ERROR') {
        this.agregarNotificacion(
          `Error en simulación: ${status.error || 'Error desconocido'}`
        );
        setTimeout(() => this.removerJobDelMonitoreo(status.jobId), 60000);
      }

      this.guardarJobsActivos(jobsActivos);
      this.jobsActivosSubject.next([...jobsActivos]);
    }
  }

  removerJobDelMonitoreo(jobId: string) {
    const jobsActivos = this.getJobsActivos().filter(
      (job) => job.jobId !== jobId
    );
    this.guardarJobsActivos(jobsActivos);
    this.jobsActivosSubject.next(jobsActivos);
  }

  private getJobsActivos(): SimulacionJobStatus[] {
    const stored = sessionStorage.getItem(this.JOBS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  private guardarJobsActivos(jobs: SimulacionJobStatus[]) {
    sessionStorage.setItem(this.JOBS_STORAGE_KEY, JSON.stringify(jobs));
  }

  private cargarJobsActivos() {
    this.jobsActivosSubject.next(this.getJobsActivos());
  }

  agregarNotificacion(mensaje: string) {
    const notificaciones = this.getNotificaciones();
    notificaciones.push(mensaje);
    this.guardarNotificaciones(notificaciones);
    this.notificacionesSubject.next(notificaciones);
  }

  limpiarNotificaciones() {
    this.guardarNotificaciones([]);
    this.notificacionesSubject.next([]);
  }

  private getNotificaciones(): string[] {
    const stored = sessionStorage.getItem('simulacion-notificaciones');
    return stored ? JSON.parse(stored) : [];
  }

  private guardarNotificaciones(notificaciones: string[]) {
    sessionStorage.setItem(
      'simulacion-notificaciones',
      JSON.stringify(notificaciones)
    );
  }

  postSimulacion(simulacionDTO: SimulacionDTO): Observable<any> {
    return this.http.post(
      `${environment.SERVER_URL}/api/simulaciones`,
      simulacionDTO
    );
  }

  setSimulacion(simulacion: any): void {
    if (simulacion?.materiasAsociadas) {
      const normalizada: { [semestre: string]: { materias: Materia[] } } = {};
      simulacion.materiasAsociadas.forEach((m: Materia) => {
        const semestre = m.semestre?.toString() || '0';
        if (!normalizada[semestre]) {
          normalizada[semestre] = { materias: [] };
        }
        normalizada[semestre].materias.push(m);
      });
      this.simulacion = normalizada;
    } else {
      this.simulacion = simulacion;
    }
    sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.simulacion));
    this.simulacionSubject.next(this.simulacion);
  }

  getSimulacion(): any {
    if (!this.simulacion) {
      const data = sessionStorage.getItem(this.STORAGE_KEY);
      if (data) this.simulacion = JSON.parse(data);
    }
    return this.simulacion;
  }

  setMateriasSimuladasPorKey(grupos: Record<string, Materia[]>) {
    this.materiasSimuladasPorKeySubject.next(grupos);
    const todasLasMaterias = Object.values(grupos).flat();
    this.materiasSimuladasSubject.next(todasLasMaterias);
  }

  setNombreSimulacionActual(nombre: string) {
    sessionStorage.setItem(this.NOMBRE_SIMULACION_KEY, nombre);
  }

  getNombreSimulacionActual(): string | null {
    return sessionStorage.getItem(this.NOMBRE_SIMULACION_KEY);
  }
  limpiarNombreSimulacionActual() {
    sessionStorage.removeItem(this.NOMBRE_SIMULACION_KEY);
  }

  setParametrosSimulacionActual(parametros: any) {
    sessionStorage.setItem(
      this.PARAMETROS_SIMULACION_KEY,
      JSON.stringify(parametros)
    );
  }
  getParametrosSimulacionActual(): any | null {
    const parametros = sessionStorage.getItem(this.PARAMETROS_SIMULACION_KEY);
    return parametros ? JSON.parse(parametros) : null;
  }
  limpiarParametrosSimulacionActual() {
    sessionStorage.removeItem(this.PARAMETROS_SIMULACION_KEY);
  }

  setJobIdSimulacionActual(jobId: string) {
    sessionStorage.setItem(this.JOB_ID_ACTUAL_KEY, jobId);
  }
  getJobIdSimulacionActual(): string | null {
    return sessionStorage.getItem(this.JOB_ID_ACTUAL_KEY);
  }
  limpiarJobIdSimulacionActual() {
    sessionStorage.removeItem(this.JOB_ID_ACTUAL_KEY);
  }

  resetearSimulacion() {
    sessionStorage.removeItem(this.STORAGE_KEY);
    this.limpiarNombreSimulacionActual();
    this.limpiarParametrosSimulacionActual();
    this.limpiarJobIdSimulacionActual();
    this.resultadoSimulacion = {};
    this.simulacionSubject.next(null);
    this.materiasSimuladasSubject.next([]);
    this.materiasSimuladasPorKeySubject.next({});
  }

  ngOnDestroy() {
    this.intervalSubscription?.unsubscribe();
  }

  getSimulaciones(): Observable<Simulacion[]> {
    return this.http.get<Simulacion[]>(`${this.apiUrl}/api/simulaciones`);
  }

  getSimulacionById(id: number): Observable<Simulacion> {
    return this.http.get<Simulacion>(`${this.apiUrl}/api/simulaciones/${id}`);
  }

  addSimulacion(simulacion: Simulacion) {
    return this.http.post(this.apiUrl, simulacion);
  }

  deleteSimulacion(id: number) {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}