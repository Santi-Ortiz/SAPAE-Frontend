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

  materias: any[] = [];            // tabla 1 (fuertes)
  explicacion: string = '';

  materiasSugeridas: any[] = [];   // tabla 2 (moderadas)
  explicacionSugeridas: string = '';

  cargando: boolean = false;
  error: string = '';
  hasSearched: boolean = false;    // <-- clave para no renderizar al inicio

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

  setCualquieraCreditos() { this.creditos = 'cualquiera'; }

  consultarIA() {
    if (!this.pregunta.trim()) return;

    this.cargando = true;
    this.error = '';
    this.hasSearched = false;

    // limpiar resultados
    this.materias = [];
    this.explicacion = '';
    this.materiasSugeridas = [];
    this.explicacionSugeridas = '';

    const body: any = {
      intereses: this.pregunta,
      tipo: this.tipo,
      creditos: this.creditos === 'cualquiera' ? 'cualquiera' : Number(this.creditos)
    };

    this.http.post<any>('http://localhost:8080/api/rag/recomendar', body).subscribe(
      (res) => {
        try {
          this.materias = Array.isArray(res?.materias) ? res.materias : [];
          this.explicacion = res?.explicacion || '';

          this.materiasSugeridas = Array.isArray(res?.materias_sugeridas) ? res.materias_sugeridas : [];
          this.explicacionSugeridas = res?.explicacion_sugeridas || '';
        } catch {
          this.error = 'La respuesta del servicio no es válida.';
        } finally {
          this.cargando = false;
          this.hasSearched = true;
        }
      },
      (error) => {
        console.error("Error HTTP:", error);
        this.error = 'Error al consultar el servicio de recomendaciones.';
        this.cargando = false;
        this.hasSearched = true;
      }
    );
  }
}
