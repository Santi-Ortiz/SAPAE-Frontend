import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { PensumDTO } from '../dtos/pensum-dto';
import { Progreso } from '../models/progreso.model';
import { MateriaDTO } from '../dtos/materia-dto';
import { Observable, tap } from 'rxjs';
import { Pensum } from '../models/pensum.model';

@Injectable({
  providedIn: 'root'
})
export class PensumService {

  private apiUrl = `${environment.SERVER_URL}/api/pensums`;

  private httpOptions = {
    headers: new HttpHeaders({
      "Content-Type": "application/json",
    })
  };

  private allPensum: PensumDTO[] = [];

  constructor(private http: HttpClient) { }

  obtenerPensum(): Observable<PensumDTO[]> {
    return this.http.get<PensumDTO[]>(this.apiUrl).pipe(
      tap(pensum => this.allPensum = pensum)
    );
  }

  // -------------------------------------------------
  // Métodos para acceder a las listas desde Progreso
  // -------------------------------------------------
  getElectivas(progreso: Progreso): MateriaDTO[] {
    return progreso.cursosElectivas ?? [];
  }

  getEnfasis(progreso: Progreso): MateriaDTO[] {
    return progreso.cursosEnfasis ?? [];
  }

  getComplementarias(progreso: Progreso): MateriaDTO[] {
    return [
      ...(progreso.cursosComplementariaLenguas ?? []),
      ...(progreso.cursosComplementariaInformacion ?? [])
    ];
  }

  getElectivasBasicas(progreso: Progreso): MateriaDTO[] {
    return progreso.cursosElectivaBasicas ?? [];
  }

  getTodasGenericas(progreso: Progreso) {
    return {
      electivas: this.getElectivas(progreso),
      enfasis: this.getEnfasis(progreso),
      complementarias: this.getComplementarias(progreso),
      basicas: this.getElectivasBasicas(progreso)
    };
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
