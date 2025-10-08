import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Materia } from '../models/materia.model';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Proyeccion } from '../models/proyeccion.model';
import { HttpHeaders } from '@angular/common/http';

export interface SimulacionGuardada {
  id: string;
  jobId?: string; // JobId de la simulación
  nombre: string;
  fechaCreacion: Date;
  resultadoSimulacion: { [semestre: string]: { materias: Materia[] } };
  parametros: {
    semestres: number;
    tipoMatricula: string;
    creditos: number;
    materias: number;
    priorizaciones?: string[]; 
    practicaProfesional?: boolean; 
  };
}

const STORAGE_KEY = 'simulacionesGuardadas';

@Injectable({
  providedIn: 'root'
})
export class HistorialSimulacionesService {
  private apiUrl = `${environment.SERVER_URL}/api/proyecciones`;
  private simulacionesGuardadas: BehaviorSubject<SimulacionGuardada[]>;

  constructor(private http: HttpClient) {
    const data = this.loadFromStorage();
    this.simulacionesGuardadas = new BehaviorSubject<SimulacionGuardada[]>(data);
  }

  get simulacionesGuardadas$() {
    return this.simulacionesGuardadas.asObservable();
  }

  // Método para guardar en sessionStorage
  private saveToStorage(simulaciones: SimulacionGuardada[]): void {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(simulaciones));
  }

  // Método para leer desde sessionStorage
  private loadFromStorage(): SimulacionGuardada[] {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsedData = JSON.parse(raw);
        // Convertir las fechas de string a Date
        return parsedData.map((sim: any) => ({
          ...sim,
          fechaCreacion: new Date(sim.fechaCreacion)
        }));
      } catch (e) {
        console.error('Error al parsear historial de simulaciones desde sessionStorage', e);
      }
    }
    return [];
  }

  // Guardar una nueva simulación
  guardarSimulacion(
    nombre: string,
    resultadoSimulacion: { [semestre: string]: { materias: Materia[] } },
    parametros: {
      semestres: number;
      tipoMatricula: string;
      creditos: number;
      materias: number;
      priorizaciones: string[];
    },
    jobId?: string
  ): void {
    const simulacionesActuales = this.simulacionesGuardadas.value;
    
    const nuevaSimulacion: SimulacionGuardada = {
      id: this.generarId(),
      jobId,
      nombre,
      fechaCreacion: new Date(),
      resultadoSimulacion,
      parametros
    };

    const simulacionesActualizadas = [...simulacionesActuales, nuevaSimulacion];
    this.saveToStorage(simulacionesActualizadas);
    this.simulacionesGuardadas.next(simulacionesActualizadas);
  }

  // Verificar si existe por JobId 
  existeProyeccionConJobId(jobId: string): Observable<boolean> { 
    return this.http.get<boolean>(`${this.apiUrl}/existe/job/${jobId}`, { withCredentials: true });

  }

  // Eliminar una proyección
  eliminarProyeccion(id: number): Observable<void> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
    });
    return this.http.delete<void>(`${this.apiUrl}/eliminar/${id}`, { headers });
  }

  // Verificar si existe una proyección por nombre
  existeProyeccionConNombre(nombre: string): Observable<boolean> {
    return this.http.get<boolean>(`${this.apiUrl}/existe/nombre/${nombre}`, { withCredentials: true });
  }

  // Eliminar todas las proyecciones del usuario
  limpiarProyecciones(): Observable<void> {
    return this.http.delete<void>(this.apiUrl, { withCredentials: true });
  }

  guardarProyeccion(proyeccion: Proyeccion): Observable<any> {
    return this.http.post(this.apiUrl, proyeccion, { withCredentials: true });
  }

  // Obtener todas las proyecciones del usuario
  getMisProyecciones(): Observable<Proyeccion[]> {
    return this.http.get<Proyeccion[]>(`${this.apiUrl}/mis-proyecciones`, { withCredentials: true });
  }

  // Obtener una proyección por ID
  getProyeccionPorId(id: number): Observable<Proyeccion> {
    return this.http.get<Proyeccion>(`${this.apiUrl}/${id}`, { withCredentials: true });
  }

  // Generar ID único
  private generarId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}
