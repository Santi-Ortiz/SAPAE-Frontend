import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment.development';
import { PensumDTO } from '../dtos/pensum-dto';
import { Progreso } from '../models/progreso.model';
import { MateriaDTO } from '../dtos/materia-dto';
import { Observable, tap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PensumService {
  private httpOptions = {
    headers: new HttpHeaders({
      "Content-Type": "application/json",
    })
  };

  private allPensum: PensumDTO[] = [];

  constructor(private http: HttpClient) { }

  obtenerPensum(): Observable<PensumDTO[]> {
    return this.http.get<PensumDTO[]>(`${environment.SERVER_URL}/api/pensum`).pipe(
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
}
