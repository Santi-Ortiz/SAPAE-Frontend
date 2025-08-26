import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { EstudianteDTO } from '../dtos/estudiante-dto';
import { Estudiante } from '../models/estudiante.model';

@Injectable({
  providedIn: 'root'
})
export class EstudianteService {

  private apiUrl = 'http://localhost:8080/api/estudiantes';

  constructor(private http: HttpClient) { }

  getEstudiantes() {
    return this.http.get(this.apiUrl);
  }

  getEstudianteById(id: number) {
    return this.http.get(`${this.apiUrl}/${id}`);
  }

  addEstudiante(estudianteDTO: EstudianteDTO) {
    return this.http.post(this.apiUrl, estudianteDTO);
  }

  updateEstudiante(id: number, estudianteDTO: Estudiante) {
    return this.http.put(`${this.apiUrl}/${id}`, estudianteDTO);
  }

  deleteEstudiante(id: number) {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
