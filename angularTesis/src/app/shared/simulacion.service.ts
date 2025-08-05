import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { SimulacionDTO } from '../dto/simulacion-dto';
import { Simulacion } from '../dto/simulacion';
import { environment } from '../../environments/environment.development';
import { MateriajsonDTO } from '../dto/materiajson-dto';

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

  setSimulacion(data: { [semestre: string]: { materias: MateriajsonDTO[] } }): void {
    this.resultadoSimulacion = data;
  }
}
