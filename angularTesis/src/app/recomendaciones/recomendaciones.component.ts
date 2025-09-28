import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';

type ModoCreditos = 'exacto' | 'rango';

@Component({
  selector: 'app-recomendaciones',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './recomendaciones.component.html',
  styleUrl: './recomendaciones.component.css'
})
export class RecomendacionesComponent {

  pregunta: string = '';
  tipo: string = 'cualquiera';

  // ===== Modo de créditos =====
  modoCreditos: ModoCreditos = 'exacto';

  // Exacto (existente)
  creditos: number | 'cualquiera' = 'cualquiera';

  // Rango (nuevo)
  creditosMin: number | 'cualquiera' = 'cualquiera';
  creditosMax: number | 'cualquiera' = 'cualquiera';

  materias: any[] = [];            // tabla 1 (fuertes)
  explicacion: string = '';

  materiasSugeridas: any[] = [];   // tabla 2 (moderadas)
  explicacionSugeridas: string = '';

  cargando: boolean = false;
  error: string = '';
  hasSearched: boolean = false;    // <-- clave para no renderizar al inicio

  constructor(private http: HttpClient) {}

  // ===== Switch de modo
  onToggleModo(isRango: boolean) {
    this.modoCreditos = isRango ? 'rango' : 'exacto';
  }

  // ===== Exacto: handlers existentes
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

  // ===== Rango: helpers
  private ensureRangeInvariant() {
    const minVal = (this.creditosMin === 'cualquiera') ? null : Number(this.creditosMin);
    const maxVal = (this.creditosMax === 'cualquiera') ? null : Number(this.creditosMax);
    if (minVal !== null && maxVal !== null && minVal > maxVal) {
      this.creditosMax = minVal; // Mantén coherencia (mín <= máx)
    }
  }

  incMin() {
    if (this.creditosMin === 'cualquiera') { this.creditosMin = 1; this.ensureRangeInvariant(); return; }
    this.creditosMin = Math.min(10, (Number(this.creditosMin) || 0) + 1);
    this.ensureRangeInvariant();
  }
  decMin() {
    if (this.creditosMin === 'cualquiera') return;
    const v = Number(this.creditosMin) || 1;
    this.creditosMin = Math.max(1, v - 1);
    this.ensureRangeInvariant();
  }
  setAnyMin() { this.creditosMin = 'cualquiera'; this.ensureRangeInvariant(); }

  incMax() {
    if (this.creditosMax === 'cualquiera') { this.creditosMax = 1; this.ensureRangeInvariant(); return; }
    this.creditosMax = Math.min(10, (Number(this.creditosMax) || 0) + 1);
    this.ensureRangeInvariant();
  }
  decMax() {
    if (this.creditosMax === 'cualquiera') return;
    const v = Number(this.creditosMax) || 1;
    this.creditosMax = Math.max(1, v - 1);
    this.ensureRangeInvariant();
  }
  setAnyMax() { this.creditosMax = 'cualquiera'; this.ensureRangeInvariant(); }

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

    // Construcción del body (retrocompatible)
    const body: any = {
      intereses: this.pregunta,
      tipo: this.tipo
    };

    if (this.modoCreditos === 'exacto') {
      body.creditos = this.creditos === 'cualquiera' ? 'cualquiera' : Number(this.creditos);
    } else {
      const minVal = (this.creditosMin === 'cualquiera') ? null : Number(this.creditosMin);
      const maxVal = (this.creditosMax === 'cualquiera') ? null : Number(this.creditosMax);

      if (minVal === null && maxVal === null) {
        body.creditos = 'cualquiera';
      } else {
        if (minVal !== null) body.creditos_min = minVal;
        if (maxVal !== null) body.creditos_max = maxVal;
        // Back-compat: si min y max son iguales, también enviamos 'creditos'
        if (minVal !== null && maxVal !== null && minVal === maxVal) {
          body.creditos = minVal;
        }
      }
    }

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
