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
  materias: any[] = [];
  explicacion: string = '';
  cargando: boolean = false;
  error: string = '';

  constructor(private http: HttpClient) {}

  consultarIA() {
    if (!this.pregunta.trim()) return;

    this.cargando = true;
    this.materias = [];
    this.explicacion = '';
    this.error = '';

    const body = { intereses: this.pregunta };

    this.http.post<any>('http://localhost:8080/api/rag/recomendar', body).subscribe(
      (res) => {
        if (res && res.materias && Array.isArray(res.materias)) {
          this.materias = res.materias;
          this.explicacion = res.explicacion || '';
        } else {
          this.error = 'La respuesta del servicio no es válida.';
        }
        this.cargando = false;
      },
      (error) => {
        console.error("Error HTTP:", error);
        this.error = 'Error al consultar el servicio de recomendaciones.';
        this.cargando = false;
      }
    );
  }
}