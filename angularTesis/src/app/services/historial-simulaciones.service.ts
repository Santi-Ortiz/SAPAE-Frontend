import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Proyeccion } from '../models/proyeccion.model';

@Injectable({
  providedIn: 'root'
})
export class HistorialSimulacionesService {
  private apiUrl = `${environment.SERVER_URL}/api/proyecciones`;

  constructor(private http: HttpClient) {}

  // Guardar una proyección en BD
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

  // Verificar si existe por JobId 
  existeProyeccionConJobId(jobId: string): Observable<boolean> { 
    return this.http.get<boolean>(`${this.apiUrl}/existe/job/${jobId}`, { withCredentials: true });

  }

  // Eliminar una proyección
  eliminarProyeccion(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, { withCredentials: true });
  }

  // Verificar si existe una proyección por nombre
  existeProyeccionConNombre(nombre: string): Observable<boolean> {
    return this.http.get<boolean>(`${this.apiUrl}/existe/nombre/${nombre}`, { withCredentials: true });
  }

  // Eliminar todas las proyecciones del usuario
  limpiarProyecciones(): Observable<void> {
    return this.http.delete<void>(this.apiUrl, { withCredentials: true });
  }
}
