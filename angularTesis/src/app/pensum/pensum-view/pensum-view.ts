import {
  Component,
  AfterViewInit,
  ElementRef,
  ViewChild,
  OnInit,
  HostListener
} from '@angular/core';
import { NgIf, NgFor, NgClass } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PensumDTO } from '../../dtos/pensum-dto';
import { Progreso } from '../../models/progreso.model';
import { catchError, of } from 'rxjs';
import { PensumService } from '../../services/pensum.service';
import { HistorialService } from '../../services/historial.service';
import { NgZone, ChangeDetectorRef } from '@angular/core';
import * as d3 from 'd3';

@Component({
  selector: 'app-pensum-view',
  standalone: true,
  imports: [RouterModule, NgIf, NgFor, NgClass],
  templateUrl: './pensum-view.html',
  styleUrl: './pensum-view.css',
})
export class PensumView implements OnInit, AfterViewInit {
  progreso!: Progreso;
  materiasCursadasCodigos: Set<string> = new Set();
  allPensum: PensumDTO[] = [];
  errorMessage = '';
  conexionesActivas: string[] = [];
  mensajeSinRequisitos: string = '';
  mostrarMensaje: boolean = false;
  mensajeX: number = 0;
  mensajeY: number = 0;


  @ViewChild('svgRef') svgRef!: ElementRef<SVGSVGElement>;
  @ViewChild('contenedor') contenedorRef!: ElementRef<HTMLElement>;


  constructor(
    private pensumService: PensumService,
    private historialService: HistorialService,
    private zone: NgZone,
    private cdr: ChangeDetectorRef
  ) { }


  ngOnInit(): void {
    this.pensumService.obtenerPensum().pipe(
      catchError(error => {
        this.errorMessage = "Error al cargar el pensum";
        return of([]);
      })
    ).subscribe(materias => {
      this.allPensum = materias;

      // Obtener progreso desde historialService
      const progreso = this.historialService.getHistorial();
      if (progreso && progreso.listaMateriasFaltantes) {
        const faltantesCodigos = new Set(progreso.listaMateriasFaltantes.map(m => m.codigo));

        this.materiasCursadasCodigos = new Set(
          this.allPensum
            .filter(m => !faltantesCodigos.has(m.codigo))
            .map(m => m.codigo)
        );
      }

      this.zone.onStable.pipe().subscribe(() => {
        this.dibujarConexiones();
      });

      this.cdr.detectChanges();
    });
  }


  ngAfterViewInit(): void {
    requestAnimationFrame(() => {
      this.dibujarConexiones();
    });
  }


  @HostListener('window:resize')
  onResize() {
    this.dibujarConexiones();
  }

  @HostListener('window:scroll')
  onScroll() {
    this.dibujarConexiones();
  }

  agruparPorSemestre(materias: PensumDTO[] = this.allPensum) {
    const map = new Map<number, PensumDTO[]>();
    materias.forEach(m => {
      if (!map.has(m.semestre)) map.set(m.semestre, []);
      map.get(m.semestre)!.push(m);
    });
    return Array.from(map.entries()).map(([semestre, materias]) => ({ semestre, materias }));
  }

  seleccionarMateria(codigo: string) {
    if (this.materiasCursadasCodigos.has(codigo)) return; // bloquear interacción

    this.conexionesActivas = [];
    let tieneRequisitos = false;

    this.allPensum.forEach(materia => {
      try {
        const requisitos: string[] = JSON.parse(materia.requisitosJson || '[]');
        if (requisitos.includes(codigo)) {
          this.conexionesActivas.push(materia.codigo);
          tieneRequisitos = true;
        }
      } catch (e) { }
    });

    document.querySelectorAll('.caja').forEach(c => {
      c.classList.remove('resaltada');
    });

    const origenBox = document.getElementById(codigo);
    if (origenBox) {
      origenBox.classList.add('resaltada');

      if (!tieneRequisitos) {
        const rect = origenBox.getBoundingClientRect();
        const contenedorRect = this.contenedorRef?.nativeElement.getBoundingClientRect();

        this.mensajeX = rect.right - (contenedorRect?.left || 0) + 10;
        this.mensajeY = rect.top - (contenedorRect?.top || 0);
        this.mensajeSinRequisitos = 'Esta materia no es requisito para otra.';
        this.mostrarMensaje = true;

        setTimeout(() => {
          this.mostrarMensaje = false;
        }, 3000);
      } else {
        this.mostrarMensaje = false;
      }
    }

    this.dibujarConexiones(codigo);
  }

  private configurarSVG(svg: SVGElement, contenedor: HTMLElement) {
    const { scrollWidth: width, scrollHeight: height } = contenedor;
    svg.setAttribute('width', `${width}`);
    svg.setAttribute('height', `${height}`);
    svg.innerHTML = ''; // limpiar SVG
  }

  private crearMarcadores(d3svg: d3.Selection<SVGSVGElement, unknown, null, undefined>) {
    const defs = d3svg.append('defs');

    const colores = {
      clara: '#90E0EF',
      oscura: '#0077B6'
    };

    const direcciones = ['derecha', 'izquierda', 'arriba', 'abajo'];

    ['clara', 'oscura'].forEach(tipo => {
      direcciones.forEach(direccion => {
        const marker = defs.append('marker')
          .attr('id', `flecha-${tipo}-${direccion}`)
          .attr('markerWidth', 12)
          .attr('markerHeight', 12)
          .attr('markerUnits', 'userSpaceOnUse');

        // Orientación correcta para cada dirección
        if (direccion === 'arriba') {
          marker.attr('orient', 90);
        } else if (direccion === 'abajo') {
          marker.attr('refX', 6)
            .attr('refY', 10).attr('orient', -90);
        } else {
          marker.attr('refX', 10)
            .attr('refY', 6).attr('orient', 'auto');
        }

        marker.append('polygon')
          .attr('points', '2,2 10,6 2,10')
          .attr('fill', colores[tipo as 'clara' | 'oscura']);
      });
    });
  }

  private obtenerRelaciones(cajas: HTMLElement[]) {
    const salidas = new Map<string, HTMLElement[]>();
    const llegadas = new Map<string, HTMLElement[]>();

    cajas.forEach(destino => {
      const requisitos: string[] = JSON.parse(destino.getAttribute('data-requisitos') || '[]');
      requisitos.forEach(origenId => {
        salidas.set(origenId, [...(salidas.get(origenId) || []), destino]);
        llegadas.set(destino.id, [...(llegadas.get(destino.id) || []), document.getElementById(origenId)!]);
      });
    });

    return { salidas, llegadas };
  }

  private dibujarCurvas(
    d3svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
    cajas: HTMLElement[],
    salidas: Map<string, HTMLElement[]>,
    llegadas: Map<string, HTMLElement[]>,
    contenedorRect: DOMRect
  ) {
    const offsetX = 20;
    const offsetY = 10;

    cajas.forEach(destino => {
      const requisitos: string[] = JSON.parse(destino.getAttribute('data-requisitos') || '[]');
      const destinoRect = destino.getBoundingClientRect();
      const totalLlegadas = llegadas.get(destino.id)?.length || 1;
      let llegadaIndex = 0;

      requisitos.forEach(origenId => {
        const origen = document.getElementById(origenId);
        if (!origen) return;

        const origenRect = origen.getBoundingClientRect();
        const totalSalidas = salidas.get(origenId)?.length || 1;
        const salidaIndex = salidas.get(origenId)?.indexOf(destino) || 0;

        // Coordenadas del punto de salida (lado derecho del origen)
        const xOrigen = origenRect.right - contenedorRect.left;
        const yOrigen = origenRect.top - contenedorRect.top + ((salidaIndex + 1) / (totalSalidas + 1)) * origenRect.height;

        const distanciaHorizontal = destinoRect.left - origenRect.right;
        const entradaPorIzquierda = distanciaHorizontal < 80 || requisitos.length == 1;

        let xDestino: number, yDestino: number, direccion: string;

        if (entradaPorIzquierda) {
          direccion = 'izquierda';
          xDestino = destinoRect.left - contenedorRect.left;
          yDestino = destinoRect.top - contenedorRect.top +
            ((llegadaIndex + 1) / (totalLlegadas + 1)) * destinoRect.height;
        } else {
          const distanciaArriba = Math.abs(origenRect.top - destinoRect.top);
          const distanciaAbajo = Math.abs(origenRect.bottom - destinoRect.bottom);
          const entrarPorArriba = distanciaArriba < distanciaAbajo;

          direccion = entrarPorArriba ? 'arriba' : 'abajo';
          xDestino = destinoRect.left - contenedorRect.left + destinoRect.width / 2;
          yDestino = entrarPorArriba
            ? destinoRect.top - contenedorRect.top
            : destinoRect.bottom - contenedorRect.top;

        }

        llegadaIndex++;

        llegadaIndex++;

        const esActiva = this.conexionesActivas.includes(destino.id);
        const colorLinea = esActiva ? '#0077B6' : '#90E0EF';
        const tipo = esActiva ? 'oscura' : 'clara';
        const marcador = `flecha-${tipo}-${direccion}`;

        // Ruta escalonada: derecha → curva → arriba/abajo
        const puntosRuta: [number, number][] = [
          [xOrigen, yOrigen],
          [xOrigen + offsetX, yOrigen],
          [xOrigen + offsetX, yDestino],
          [xDestino, yDestino]
        ];

        const lineGenerator = d3.line()
          .x(d => d[0])
          .y(d => d[1])
          .curve(d3.curveStep);

        const path = d3svg.append('path')
          .attr('d', lineGenerator(puntosRuta))
          .attr('fill', 'none')
          .attr('stroke', colorLinea)
          .attr('stroke-width', esActiva ? 3 : 2)
          .attr('marker-end', `url(#${marcador})`);

        if (esActiva) {
          path.classed('resaltada', true);
          destino.classList.add('resaltada');
        }
      });
    });
  }

  dibujarConexiones(origenSeleccionado: string = '') {
    const svg = this.svgRef?.nativeElement;
    const contenedor = this.contenedorRef?.nativeElement;
    if (!svg || !contenedor) return;

    this.configurarSVG(svg, contenedor);
    const d3svg = d3.select(svg);
    this.crearMarcadores(d3svg);

    const contenedorRect = contenedor.getBoundingClientRect();
    const cajas = Array.from(document.querySelectorAll<HTMLElement>('.caja'));
    const { salidas, llegadas } = this.obtenerRelaciones(cajas);

    this.dibujarCurvas(d3svg, cajas, salidas, llegadas, contenedorRect);
  }


}