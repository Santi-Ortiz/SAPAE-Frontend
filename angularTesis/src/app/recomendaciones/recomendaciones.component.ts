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
  creditos: number | 'cualquiera' = 'cualquiera';
  tipo: string = 'cualquiera';

  materias: any[] = [];
  explicacion: string = '';
  cargando: boolean = false;
  error: string = '';

  constructor(private http: HttpClient) {}

  incCreditos() {
    if (this.creditos === 'cualquiera') { this.creditos = 1; return; }
    const v = Number(this.creditos) || 0;
    this.creditos = Math.min(10, v + 1);
  }

  decCreditos() {
    if (this.creditos === 'cualquiera') { return; }
    const v = Number(this.creditos) || 1;
    const next = Math.max(1, v - 1);
    this.creditos = next === 1 ? 1 : next;
  }

  setCualquieraCreditos() {
    this.creditos = 'cualquiera';
  }

  consultarIA() {
    if (!this.pregunta.trim()) return;

    this.cargando = true;
    this.materias = [];
    this.explicacion = '';
    this.error = '';

    const body: any = {
      intereses: this.pregunta,
      tipo: this.tipo
    };
    body.creditos = this.creditos === 'cualquiera' ? 'cualquiera' : Number(this.creditos);

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
