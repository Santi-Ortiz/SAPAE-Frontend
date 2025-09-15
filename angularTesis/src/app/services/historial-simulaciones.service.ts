import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Materia } from '../models/materia.model';

export interface SimulacionGuardada {
  id: number;
  jobId?: string;
  nombre: string;
  fechaCreacion: Date;
  resultadoSimulacion: any; 
  parametros: {
    semestres: number;
    tipoMatricula: string;
    creditos: number;
    materias: number;
    priorizaciones?: string[];
  };
}

@Injectable({
  providedIn: 'root'
})
export class HistorialSimulacionesService {
  private apiUrl = `${environment.SERVER_URL}/api/simulaciones`;

  constructor(private http: HttpClient) {}

  // Guardar una simulación en BD
  guardarSimulacion(
    nombre: string,
    resultadoSimulacion: any,
    parametros: {
      semestres: number;
      tipoMatricula: string;
      creditos: number;
      materias: number;
      priorizaciones?: string[];
    },
    jobId?: string
  ): Observable<SimulacionGuardada> {
    const nuevaSimulacion: Omit<SimulacionGuardada, 'id'> = {
      jobId,
      nombre,
      fechaCreacion: new Date(),
      resultadoSimulacion,
      parametros
    };
    return this.http.post<SimulacionGuardada>(this.apiUrl, nuevaSimulacion);
  }

  // Obtener todas las simulaciones
  getSimulacionesGuardadas(): Observable<SimulacionGuardada[]> {
    return this.http.get<SimulacionGuardada[]>(this.apiUrl);
  }

  // Obtener una simulación por ID
  getSimulacionPorId(id: number): Observable<SimulacionGuardada> {
    return this.http.get<SimulacionGuardada>(`${this.apiUrl}/${id}`);
  }

  // Eliminar una simulación
  eliminarSimulacion(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  // Verificar si existe por JobId
  existeSimulacionConJobId(jobId: string): Observable<boolean> {
    return this.http.get<boolean>(`${this.apiUrl}/existe/job/${jobId}`);
  }

  // Verificar si existe por nombre
  existeSimulacionConNombre(nombre: string): Observable<boolean> {
    return this.http.get<boolean>(`${this.apiUrl}/existe/nombre/${nombre}`);
  }

  // Limpiar todas las simulaciones
  limpiarHistorial(): Observable<void> {
    return this.http.delete<void>(this.apiUrl, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
  }

}
