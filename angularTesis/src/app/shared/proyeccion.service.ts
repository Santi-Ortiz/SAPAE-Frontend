import { Injectable } from '@angular/core';
import { ProyeccionDTO } from '../dto/proyeccion-dto';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ProyeccionService {

  private proyeccion = new BehaviorSubject<ProyeccionDTO>(new ProyeccionDTO(0, 0, 0, 0));

  constructor() { }

  setProyeccion(proyeccion: ProyeccionDTO) {
    this.proyeccion.next(proyeccion);
  }

  getProyeccion(): ProyeccionDTO {
    return this.proyeccion.value;
  }
}
