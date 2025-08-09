import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { SimulacionDTO } from '../dtos/simulacion-dto';
import { Simulacion } from '../models/simulacion.model';
import { environment } from '../../environments/environment.development';
import { Materia } from '../models/materia.model';

@Injectable({
  providedIn: 'root'
})
export class SimulacionService {
  public resultadoSimulacion?: any;

  constructor(private http: HttpClient) { }

  generarSimulacion(simulacionDTO: SimulacionDTO): Observable<Simulacion> {
    return this.http.post<Simulacion>(`${environment.SERVER_URL}/api/simulacion/generar`, simulacionDTO);
  }

  getSimulacion(): any {
    return this.resultadoSimulacion!;
  }

  setSimulacion(data: { [semestre: string]: { materias: Materia[] } }): void {
    this.resultadoSimulacion = data;
  }
}
