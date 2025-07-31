import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ProgresoDTO } from '../dto/progreso-dto';

const STORAGE_KEY = 'historialData';

@Injectable({
  providedIn: 'root'
})
export class HistorialService {
  private historial: BehaviorSubject<ProgresoDTO>;

  historial$ = this.historialSubject().asObservable();

  constructor() {
    const data = this.loadFromStorage();
    this.historial = new BehaviorSubject<ProgresoDTO>(data);
  }

  // inicializar el BehaviorSubject
  private historialSubject(): BehaviorSubject<ProgresoDTO> {
    const data = this.loadFromStorage();
    return new BehaviorSubject<ProgresoDTO>(data);
  }

  // Método para guardar en localStorage
  private saveToStorage(progreso: ProgresoDTO): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progreso));
  }

  // Método para leer desde localStorage
  private loadFromStorage(): ProgresoDTO {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {
        console.error('Error al parsear historial desde localStorage', e);
      }
    }
    return new ProgresoDTO();
  }

  setHistorial(progreso: ProgresoDTO): void {
    this.saveToStorage(progreso);
    this.historial.next(progreso);
  }

  getHistorial(): ProgresoDTO | null {
    return this.historial.value;
  }
}
