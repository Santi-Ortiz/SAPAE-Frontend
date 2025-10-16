import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { InformeAvance } from '../models/informe_avance.model';

@Injectable({
  providedIn: 'root'
})
export class LecturaService {

  private apiUrl = `${environment.SERVER_URL}`;

  constructor(private http: HttpClient) { }

  subirArchivo(file: File): Observable<any> {

    const formData = new FormData();
    formData.append('archivo', file, file.name);

    return this.http.post<any>(`${this.apiUrl}/guardarInforme`, formData).pipe(
      catchError(this.handleError)
    );
  }


  private handleError(error: HttpErrorResponse) {
    console.error('Error en la petición de archivo:', error.status, error.message);
    console.error('Error details:', error.error);
    return throwError(() => new Error('Error al subir el archivo'));
  }

  getUltimoInformeAvance(): Observable<InformeAvance> {
    return this.http.get<InformeAvance>(`${this.apiUrl}/ultimo-informe`, { withCredentials: true });
  }
}
