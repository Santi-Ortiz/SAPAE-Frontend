import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';
import { SimulacionDTO } from '../dtos/simulacion-dto';
import { Simulacion } from '../models/simulacion.model';
import { environment } from '../../environments/environment.development';
import { Materia } from '../models/materia.model';

@Injectable({
  providedIn: 'root'
})
export class SimulacionService {
  private readonly STORAGE_KEY = 'resultadoSimulacion';
  resultadoSimulacion!: Record<string, { materias: Materia[] }>;

  // Subject para la simulación organizada por semestres
  private simulacionSubject = new BehaviorSubject<any>(null);
  simulacion$ = this.simulacionSubject.asObservable();

  // Subject para las materias planas (todas juntas)
  private materiasSimuladasSubject = new BehaviorSubject<Materia[]>([]);
  materiasSimuladas$ = this.materiasSimuladasSubject.asObservable();

  constructor(private http: HttpClient) {
    // Si existe en localStorage, la cargamos
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored) {
      this.resultadoSimulacion = JSON.parse(stored);
      this.simulacionSubject.next(this.resultadoSimulacion);
    }
  }

  generarSimulacion(simulacionDTO: SimulacionDTO): Observable<Simulacion> {
    return this.http.post<Simulacion>(`${environment.SERVER_URL}/api/simulacion/generar`, simulacionDTO);
  }

  getSimulacion(): any {
    return this.resultadoSimulacion!;
  }

  setSimulacion(data: { [semestre: string]: { materias: Materia[] } }): void {
    this.resultadoSimulacion = data;

    // Guardar en localStorage
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));

    // Emitir cambios a los que estén suscritos
    this.simulacionSubject.next(data);
  }

  setMateriasSimuladas(materias: Materia[]): void {
    // Emitir lista plana de materias simuladas
    this.materiasSimuladasSubject.next(materias);
  }

  private materiasSimuladasPorKeySubject =
    new BehaviorSubject<Record<string, Materia[]>>({});
  materiasSimuladasPorKey$ = this.materiasSimuladasPorKeySubject.asObservable();

  setMateriasSimuladasPorKey(grupos: Record<string, Materia[]>): void {
    this.materiasSimuladasPorKeySubject.next(grupos);
  }

  limpiarSimulacion(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    this.simulacionSubject.next(null);
    this.materiasSimuladasSubject.next([]); // limpiar también las materias planas
  }
}
