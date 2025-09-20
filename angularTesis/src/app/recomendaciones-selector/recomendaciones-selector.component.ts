import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { SimulacionRecomBridgeService } from '../services/simulacion-recomendacion.service';

@Component({
  selector: 'app-recomendaciones-selector',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './recomendaciones-selector.component.html',
  styleUrl: './recomendaciones-selector.component.css'
})
export class RecomendacionesSelectorComponent implements OnInit {

  // filtros
  pregunta: string = '';
  creditos: number | 'cualquiera' = 'cualquiera';
  tipo: string = 'cualquiera';

  // contexto que llega desde simulación
  semestre!: number;                 // p.ej. 7
  index?: number;                    // índice de la fila a reemplazar (opcional)
  fromSim: boolean = true;           // este componente siempre es “de selección”

  // resultado
  materias: any[] = [];
  sugerencias: any[] = [];
  explicacion: string = '';

  cargando = false;
  error = '';
  tried = false;                     // para no mostrar mensajes hasta que se haga la 1ª consulta

  constructor(
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router,
    private bridge: SimulacionRecomBridgeService
  ) {}

  ngOnInit(): void {
    // leer query params desde simulación
    this.route.queryParamMap.subscribe(params => {
      const tipoQP = (params.get('tipo') || 'cualquiera').toLowerCase();
      this.tipo = tipoQP;
      this.semestre = Number(params.get('semestre') || 0);
      const idx = params.get('index');
      this.index = (idx !== null && idx !== undefined) ? Number(idx) : undefined;
    });
  }

  incCreditos() {
    if (this.creditos === 'cualquiera') { this.creditos = 1; return; }
    const v = Number(this.creditos) || 0;
    this.creditos = Math.min(10, v + 1);
  }
  decCreditos() {
    if (this.creditos === 'cualquiera') return;
    const v = Number(this.creditos) || 1;
    this.creditos = Math.max(1, v - 1);
  }
  setCualquieraCreditos() { this.creditos = 'cualquiera'; }

  consultarIA() {
    if (!this.pregunta.trim()) return;

    this.cargando = true;
    this.error = '';
    this.tried = true;
    this.materias = [];
    this.sugerencias = [];
    this.explicacion = '';

    const body: any = {
      intereses: this.pregunta,
      tipo: this.tipo
    };
    body.creditos = this.creditos === 'cualquiera' ? 'cualquiera' : Number(this.creditos);

    this.http.post<any>('http://localhost:8080/api/rag/recomendar', body).subscribe({
      next: (res) => {
        this.materias = Array.isArray(res?.materias) ? res.materias : [];
        // el backend puede responder como 'sugerencias' o 'sugerenciasIgnoreCreds'; soporta ambos
        this.sugerencias = Array.isArray(res?.sugerencias)
          ? res.sugerencias
          : (Array.isArray(res?.sugerenciasIgnoreCreds) ? res.sugerenciasIgnoreCreds : []);
        this.explicacion = res?.explicacion || '';
        this.cargando = false;
      },
      error: () => {
        this.error = 'Error al consultar el servicio de recomendaciones.';
        this.cargando = false;
      }
    });
  }

  // Selección → reemplazo en simulación y vuelta a resultados (con toast)
  seleccionar(m: any) {
    const selec = {
      tipo: this.tipo,                       // electivas | complementarias | énfasis
      semestre: this.semestre,              // semestre del bloque
      index: this.index,                    // fila, si la tenemos
      nombre: m?.nombre || m?.Nombre || '',
      creditos: Number(m?.creditos ?? m?.Creditos ?? 0),
      id: m?.id || m?.ID || m?.codigo || ''
    };

    const okMsg = `Se actualizó "${selec.nombre}" en el semestre ${this.semestre}.`;

    this.bridge.applySelection(selec).subscribe({
      next: () => {
        // vuelve a la pantalla de resultados de simulación con notificación y foco
        this.router.navigate(['/pensum/simulacion-resultado'], {
          state: {
            toast: { kind: 'success', text: okMsg },
            focus: { sem: this.semestre, idx: this.index }
          }
        }).catch(() => {
          this.router.navigate(['/simulacion-resultado'], {
            state: {
              toast: { kind: 'success', text: okMsg },
              focus: { sem: this.semestre, idx: this.index }
            }
          });
        });
      },
      error: () => {
        // si falla el backend igual actualizamos localmente (el servicio ya lo hace)
        this.router.navigate(['/pensum/simulacion-resultado'], {
          state: {
            toast: { kind: 'info', text: 'Se actualizó localmente, pero no se pudo guardar en el servidor.' },
            focus: { sem: this.semestre, idx: this.index }
          }
        }).catch(() => {
          this.router.navigate(['/simulacion-resultado'], {
            state: {
              toast: { kind: 'info', text: 'Se actualizó localmente, pero no se pudo guardar en el servidor.' },
            focus: { sem: this.semestre, idx: this.index }
            }
          });
        });
      }
    });
  }
}
