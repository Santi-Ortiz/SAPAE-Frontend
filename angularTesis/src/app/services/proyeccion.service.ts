import { Injectable } from '@angular/core';
import { Proyeccion } from '../models/proyeccion.model';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ProyeccionService {

  private proyeccion = new BehaviorSubject<Proyeccion>(new Proyeccion(0, 0, 0, 0, '', '', false));

  constructor() { }

  setProyeccion(proyeccion: Proyeccion) {
    this.proyeccion.next(proyeccion);
  }

  getProyeccion(): Proyeccion {
    return this.proyeccion.value;
  }
}
