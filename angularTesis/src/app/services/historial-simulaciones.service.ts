import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Materia } from '../models/materia.model';

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
    priorizaciones?: string[]; // Agregamos las priorizaciones
  };
}

const STORAGE_KEY = 'simulacionesGuardadas';

@Injectable({
  providedIn: 'root'
})
export class HistorialSimulacionesService {
  private simulacionesGuardadas: BehaviorSubject<SimulacionGuardada[]>;

  constructor() {
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

  // Obtener todas las simulaciones guardadas
  getSimulacionesGuardadas(): SimulacionGuardada[] {
    return this.simulacionesGuardadas.value;
  }

  // Obtener una simulación por ID
  getSimulacionPorId(id: string): SimulacionGuardada | undefined {
    return this.simulacionesGuardadas.value.find(sim => sim.id === id);
  }

  // Eliminar una simulación
  eliminarSimulacion(id: string): void {
    const simulacionesActuales = this.simulacionesGuardadas.value;
    const simulacionesActualizadas = simulacionesActuales.filter(sim => sim.id !== id);
    this.saveToStorage(simulacionesActualizadas);
    this.simulacionesGuardadas.next(simulacionesActualizadas);
  }

  // Verificar si ya existe una simulación con el mismo jobId
  existeSimulacionConJobId(jobId: string): boolean {
    const existe = this.simulacionesGuardadas.value.some(sim => sim.jobId === jobId);
    return existe;
  }

  // Verificar si ya existe una simulación con el mismo nombre
  existeSimulacionConNombre(nombre: string): boolean {
    const existe = this.simulacionesGuardadas.value.some(sim => sim.nombre === nombre);
    return existe;
  }

  // Limpiar todas las simulaciones
  limpiarHistorial(): void {
    this.saveToStorage([]);
    this.simulacionesGuardadas.next([]);
  }

  // Generar ID único
  private generarId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}
