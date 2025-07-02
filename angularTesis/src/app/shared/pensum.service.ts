import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment.development';
import { PensumDTO } from '../dto/pensum-dto';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PensumService {
  private httpOptions = {
    headers: new HttpHeaders({
      "Content-Type": "application/json",
    })
  };

  constructor(private http: HttpClient) {}

  obtenerPensum(): Observable<PensumDTO[]> {
    return this.http.get<PensumDTO[]>(`${environment.SERVER_URL}/api/pensum`);
  }
}
