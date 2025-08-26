import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Materia } from '../models/materia.model';

@Injectable({
  providedIn: 'root'
})
export class MateriaService {

  private apiUrl = 'http://localhost:8080/api/materias';

  constructor(private http: HttpClient) { }

  getMaterias() {
    return this.http.get(this.apiUrl);
  }

  getMateriaById(id: number) {
    return this.http.get(`${this.apiUrl}/${id}`);
  }

  addMateria(materia: Materia) {
    return this.http.post(this.apiUrl, materia);
  }

  updateMateria(id: number, materia: Materia) {
    return this.http.put(`${this.apiUrl}/${id}`, materia);
  }

  deleteMateria(id: number) {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
