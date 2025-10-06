import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

/** Petición para recomendar materias (retrocompatible con tu backend). */
export interface RecommendRequest {
  intereses: string;
  tipo: string;  // 'cualquiera' | 'énfasis' | 'electivas' | 'complementarias' | 'electivas_ciencias_basicas' ...
  creditos?: number | 'cualquiera';
  creditos_min?: number;
  creditos_max?: number;
}

@Injectable({ providedIn: 'root' })
export class RagApiService {
  // Si luego usas environments, mueve esto allí:
  private readonly BASE = 'http://localhost:8080';
  private readonly RAG_BASE = `${this.BASE}/api/rag`;

  constructor(private http: HttpClient) {}

  /** Búsqueda / QA (respuesta en texto plano). */
  queryReglamento(question: string): Observable<string> {
    const body = { question };
    // Usa el overload de texto. 'as const' asegura el literal tipo 'text'
    return this.http.post(`${this.RAG_BASE}`, body, { responseType: 'text' as const });
  }

  /** Recomendaciones de materias (deja el shape tal cual lo devuelve tu backend). */
  recomendarMaterias(payload: RecommendRequest): Observable<any> {
    return this.http.post<any>(`${this.RAG_BASE}/recomendar`, payload);
  }
}
