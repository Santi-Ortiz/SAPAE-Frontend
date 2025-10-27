import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { SimulacionService } from '../services/simulacion.service';
import { Observable, of, switchMap } from 'rxjs';

export interface SeleccionDTO {
  tipo: string;        // 'electivas' | 'complementarias' | 'énfasis'
  semestre: number;    // semestre donde se reemplaza
  index?: number;      // índice de la fila (opcional)
  nombre: string;
  creditos: number;
  id?: string;
}

@Injectable({ providedIn: 'root' })
export class SimulacionRecomBridgeService {
  constructor(
    private http: HttpClient,
    private simService: SimulacionService
  ) {}

  private tipoToCodigo(tipo: string): { codigo: string, tipoNorm: string } {
    const t = (tipo || '').toLowerCase();
    if (t === 'electivas' || t === 'electiva')   return { codigo: '0', tipoNorm: 'electiva' };
    if (t === 'complementarias' || t === 'complementaria') return { codigo: '1', tipoNorm: 'complementaria' };
    if (t === 'énfasis' || t === 'enfasis')      return { codigo: '5', tipoNorm: 'enfasis' };
    return { codigo: '', tipoNorm: t || 'otro' };
  }

  applySelection(sel: SeleccionDTO): Observable<any> {
    // 1) actualizar en memoria
    const sim = this.simService.getSimulacion() || {};
    const key = String(sel.semestre);
    const bloque = sim[key];
    if (bloque && Array.isArray(bloque.materias)) {
      const { codigo, tipoNorm } = this.tipoToCodigo(sel.tipo);
      // buscar índice
      let idx = -1;
      if (sel.index !== undefined && sel.index !== null && sel.index >= 0 && sel.index < bloque.materias.length) {
        idx = sel.index;
      } else {
        idx = bloque.materias.findIndex((m: any) => m?.codigo === codigo);
      }
      if (idx !== -1) {
        bloque.materias[idx] = {
          codigo: sel.id || 'RAG',
          nombre: sel.nombre,
          creditos: sel.creditos,
          semestre: sel.semestre,
          tipo: tipoNorm
        };
        sim[key] = bloque;
        this.simService.setSimulacion(sim);
      }
    }

    // 2) si hay jobId → persistir también en backend
    const jobId = this.simService.getJobIdSimulacionActual && this.simService.getJobIdSimulacionActual();
    if (!jobId) return of({ ok: true, persisted: false });

    const payload = {
      tipo: sel.tipo,
      semestre: sel.semestre,
      index: sel.index ?? -1,
      nombre: sel.nombre,
      creditos: sel.creditos,
      id: sel.id || ''
    };
    return of({ ok: true, persisted: true });
  }
}
