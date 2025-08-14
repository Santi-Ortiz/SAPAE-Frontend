import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Progreso } from '../models/progreso.model';

const STORAGE_KEY = 'historialData';

@Injectable({
  providedIn: 'root'
})
export class HistorialService {
  private historial: BehaviorSubject<Progreso>;

  historial$ = this.historialSubject().asObservable();

  constructor() {
    const data = this.loadFromStorage();
    this.historial = new BehaviorSubject<Progreso>(data);
  }

  // inicializar el BehaviorSubject
  private historialSubject(): BehaviorSubject<Progreso> {
    const data = this.loadFromStorage();
    return new BehaviorSubject<Progreso>(data);
  }

  // Método para guardar en localStorage
  private saveToStorage(progreso: Progreso): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progreso));
  }

  // Método para leer desde localStorage
  private loadFromStorage(): Progreso {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsedData = JSON.parse(raw);
        const progreso = new Progreso();
        // Copiar todas las propiedades del objeto parseado al nuevo objeto Progreso
        Object.assign(progreso, parsedData);
        return progreso;
      } catch (e) {
        console.error('Error al parsear historial desde localStorage', e);
      }
    }
    return new Progreso();
  }

  setHistorial(progreso: Progreso | any): void {
    // Asegurar que el objeto es una instancia de Progreso
    let progresoInstance: Progreso;
    if (progreso instanceof Progreso) {
      progresoInstance = progreso;
    } else {
      progresoInstance = new Progreso();
      Object.assign(progresoInstance, progreso);
    }
    this.saveToStorage(progresoInstance);
    this.historial.next(progresoInstance);
  }

  getHistorial(): Progreso | null {
    return this.historial.value;
  }
}
