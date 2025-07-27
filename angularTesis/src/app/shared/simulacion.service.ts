import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { SimulacionDTO } from '../dto/simulacion-dto';
import { Simulacion } from '../dto/simulacion';
import { environment } from '../../environments/environment.development';

@Injectable({
  providedIn: 'root'
})
export class SimulacionService {

  constructor(private http: HttpClient) { }

  generarSimulacion(simulacionDTO: SimulacionDTO): Observable<Simulacion> {
    return this.http.post<Simulacion>(`${environment.SERVER_URL}/api/simulacion/generar`, {simulacionDTO});
  }
}
