import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Facultad } from '../models/facultad.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class FacultadService {

  private apiUrl = `${environment.SERVER_URL}/api/facultades`;

  constructor(private http: HttpClient) { }

  getFacultades() {
    return this.http.get(this.apiUrl);
  }

  getFacultadById(id: number) {
    return this.http.get(`${this.apiUrl}/${id}`);
  }

  addFacultad(facultad: Facultad) {
    return this.http.post(this.apiUrl, facultad);
  }

  updateFacultad(id: number, facultad: Facultad) {
    return this.http.put(`${this.apiUrl}/${id}`, facultad);
  }

  deleteFacultad(id: number) {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
