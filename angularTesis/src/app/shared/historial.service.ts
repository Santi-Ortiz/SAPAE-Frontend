import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ProgresoDTO } from '../dto/progreso-dto';

@Injectable({
  providedIn: 'root'
})
export class HistorialService {
  
  private historial = new BehaviorSubject<ProgresoDTO>(new ProgresoDTO());
  historial$ = this.historial.asObservable();

  constructor() { }

  setHistorial(progreso: ProgresoDTO) {
    this.historial.next(progreso);
  }

  getHistorial(): ProgresoDTO | null {
    return this.historial.value;
  }
}
