import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class LecturaService {

  private apiUrl = 'http://localhost:8080/subir-pdf'; 

  constructor(private http: HttpClient) {}

  subirArchivo(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('archivo', file, file.name);
  
    return this.http.post<any>(this.apiUrl, formData).pipe(
      catchError(this.handleError)
    );
  }
  

  private handleError(error: HttpErrorResponse) {
    console.error('Error en la petición:', error);
    return throwError(() => new Error('Error al subir el archivo'));
  }
}
