import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-recomendaciones',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './recomendaciones.component.html',
  styleUrl: './recomendaciones.component.css'
})
export class RecomendacionesComponent {

  pregunta: string = '';
  respuesta: string = '';
  cargando: boolean = false;

  constructor(private http: HttpClient) {}

  consultarIA() {
    if (!this.pregunta.trim()) return;

    this.cargando = true;
    this.respuesta = '';

    const body = { question: this.pregunta };

    this.http.post('http://localhost:8080/api/rag/recomendar', body, { responseType: 'text' }).subscribe(
      (res) => {
        this.respuesta = res;
        this.cargando = false;
      },
      (error) => {
        this.respuesta = 'Error al consultar el servicio de recomendaciones.';
        this.cargando = false;
        console.error(error);
      }
    );
  }
}