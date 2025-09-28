import { Injectable } from '@angular/core';
import { Proyeccion } from '../models/proyeccion.model';
import { BehaviorSubject } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ProyeccionService {

  private apiUrl = `${environment.SERVER_URL}/api/proyecciones`;

  private proyeccion = new BehaviorSubject<Proyeccion>(new Proyeccion(0, 0, 0, '', '', false));

  constructor(private http: HttpClient) { }

  setProyeccion(proyeccion: Proyeccion) {
    this.proyeccion.next(proyeccion);
  }

  getProyeccion(): Proyeccion {
    return this.proyeccion.value;
  }

  getProyecciones() {
    return this.http.get(`${environment.SERVER_URL}/mis-proyecciones`);
  }

  getProyeccionById(id: number) {
    return this.http.get(`${this.apiUrl}/${id}`);
  }

  crearProyeccion(proyeccion: Proyeccion) {
    return this.http.post(this.apiUrl, proyeccion);
  }

  actualizarProyeccion(id: number, proyeccion: Proyeccion) {
    return this.http.put(`${this.apiUrl}/${id}`, proyeccion);
  }

  eliminarProyeccion(id: number) {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
