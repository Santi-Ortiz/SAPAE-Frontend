import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { PensumMateria } from '../models/pensum_materia';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PensumMateriaService {

  private apiUrl = `${environment.SERVER_URL}/api/pensum-materias`;

  constructor(private http: HttpClient) { }

  // Se obtienen todas las materias de un pensum con información completa
  getMateriasPensum(pensumId: number) {
    return this.http.get(`${this.apiUrl}/pensum/${pensumId}`);
  }

  // Se obtienen los pensums que contienen una materia específica
  getPensumsMateria(materiaId: number) {
    return this.http.get(`${this.apiUrl}/materia/${materiaId}`);
  }

  // Se asocia una materia a un pensum
  addMateriaToPensum(pensumId: number, materiaId: number) {
    return this.http.post(`${this.apiUrl}/asociar/${pensumId}/${materiaId}`, {});
  }

  // Se asocian múltiples materias a un pensum
  addMateriasToPensum(pensumId: number, materiaIds: number[]) {
    return this.http.post(`${this.apiUrl}/asociar-multiples/${pensumId}`, { materiaIds });
  }

  // Se elimina una asociación entre un pensum y una materia, es decir, un registro de PensumMateria
  deleteMateriaFromPensum(id: number) {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  // Se eliminan todas las materias de un pensum
  deleteAllMateriasFromPensum(pensumId: number) {
    return this.http.delete(`${this.apiUrl}/limpiar/${pensumId}`);
  }

}
