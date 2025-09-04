import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class LecturaService {

  private apiUrl = `${environment.SERVER_URL}/guardarInforme`;

  constructor(private http: HttpClient) { }

  subirArchivo(file: File): Observable<any> {

    const formData = new FormData();
    formData.append('archivo', file, file.name);

    return this.http.post<any>(this.apiUrl, formData).pipe(
      catchError(this.handleError)
    );
  }


  private handleError(error: HttpErrorResponse) {
    console.error('Error en la petición de archivo:', error.status, error.message);
    console.error('Error details:', error.error);
    return throwError(() => new Error('Error al subir el archivo'));
  }
}
