import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { SimulacionDTO } from '../dtos/simulacion-dto';
import { Simulacion } from '../models/simulacion.model';
import { environment } from '../../environments/environment';
import { Materia } from '../models/materia.model';

@Injectable({
  providedIn: 'root'
})
export class SimulacionService {
  public resultadoSimulacion?: any;
  private apiUrl = `${environment.SERVER_URL}/api/simulaciones`;

  constructor(private http: HttpClient) { }

  generarSimulacion(simulacionDTO: SimulacionDTO): Observable<Simulacion> {
    return this.http.post<Simulacion>(`${environment.SERVER_URL}/api/simulaciones/generar`, simulacionDTO);
  }

  getSimulacion(): any {
    return this.resultadoSimulacion!;
  }

  setSimulacion(data: { [semestre: string]: { materias: Materia[] } }): void {
    this.resultadoSimulacion = data;
  }

  getSimulaciones() {
    return this.http.get(this.apiUrl);
  }

  getSimulacionById(id: number) {
    return this.http.get(`${this.apiUrl}/${id}`);
  }

  addSimulacion(simulacion: Simulacion) {
    return this.http.post(this.apiUrl, simulacion);
  }

  deleteSimulacion(id: number) {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

}
