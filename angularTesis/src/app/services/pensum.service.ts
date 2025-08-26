import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment.development';
import { PensumDTO } from '../dtos/pensum-dto';
import { Observable } from 'rxjs';
import { Pensum } from '../models/pensum.model';

@Injectable({
  providedIn: 'root'
})
export class PensumService {

  private apiUrl = 'http://localhost:8080/api/pensums';

  private httpOptions = {
    headers: new HttpHeaders({
      "Content-Type": "application/json",
    })
  };

  constructor(private http: HttpClient) { }

  obtenerPensum(): Observable<PensumDTO[]> {
    return this.http.get<PensumDTO[]>(`${environment.SERVER_URL}/api/pensum`);
  }

  // Obtiene todos los pensums 
  getPensums() {
    return this.http.get(`${this.apiUrl}/todos`);
  }

  // Devuelve la lista de materias a partir de la lectura del archivo Json
  getPensumsJson() {
    return this.http.get(`${this.apiUrl}`);
  }

  // Obtiene un pensum por su ID
  getPensumById(id: number) {
    return this.http.get<Pensum>(`${this.apiUrl}/${id}`);
  }

  // Crea un nuevo pensum
  addPensum(pensum: Pensum) {
    return this.http.post(this.apiUrl, pensum);
  }

  // Actualiza un pensum existente
  updatePensum(id: number, pensum: Pensum) {
    return this.http.put(`${this.apiUrl}/${id}`, pensum);
  }

  // Elimina un pensum por su ID
  deletePensum(id: number) {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

}
