import {
  Component,
  AfterViewInit,
  ElementRef,
  ViewChild,
  OnInit,
  HostListener
} from '@angular/core';
import { NgIf, NgFor, AsyncPipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PensumDTO } from '../../dto/pensum-dto';
import { catchError, of } from 'rxjs';
import { PensumService } from '../../shared/pensum.service';
import { NgZone, ChangeDetectorRef } from '@angular/core';
import * as d3 from 'd3';

@Component({
  selector: 'app-pensum-view',
  standalone: true,
  imports: [RouterModule, NgIf, NgFor, AsyncPipe],
  templateUrl: './pensum-view.html',
  styleUrl: './pensum-view.css',
})
export class PensumView implements OnInit, AfterViewInit {
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
    private zone: NgZone,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.pensumService.obtenerPensum().pipe(
      catchError(error => {
        this.errorMessage = "Error al cargar el pensum";
        return of([]);
      })
    ).subscribe(materias => {
      this.allPensum = materias;

      this.zone.onStable.pipe().subscribe(() => {
        this.dibujarConexiones();
      });

      this.cdr.detectChanges();
    });
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.dibujarConexiones(), 0);
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
    this.conexionesActivas = [];
  
    let tieneRequisitos = false;
  
    this.allPensum.forEach(materia => {
      try {
        const requisitos: string[] = JSON.parse(materia.requisitosJson || '[]');
        if (requisitos.includes(codigo)) {
          this.conexionesActivas.push(materia.codigo); // guardar dependientes
          tieneRequisitos = true;
        }
      } catch (e) {}
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
  
        // Mostrar mensaje a la derecha
        this.mensajeX = rect.right - (contenedorRect?.left || 0) + 10;
        this.mensajeY = rect.top - (contenedorRect?.top || 0);
        this.mensajeSinRequisitos = 'Esta materia no es requisito para otra.';
        this.mostrarMensaje = true;
  
        setTimeout(() => {
          this.mostrarMensaje = false;
        }, 3000); // oculta en 3s
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
  
    // Flecha azul clara
    defs.append('marker')
      .attr('id', 'flecha-clara')
      .attr('markerWidth', 10)
      .attr('markerHeight', 7)
      .attr('refX', 10)
      .attr('refY', 3.5)
      .attr('orient', 'auto')
      .attr('markerUnits', 'userSpaceOnUse')
      .append('polygon')
      .attr('points', '0 0, 10 3.5, 0 7')
      .attr('fill', '#90E0EF');
  
    // Flecha azul oscura (para resaltado)
    defs.append('marker')
      .attr('id', 'flecha-oscura')
      .attr('markerWidth', 10)
      .attr('markerHeight', 7)
      .attr('refX', 10)
      .attr('refY', 3.5)
      .attr('orient', 'auto')
      .attr('markerUnits', 'userSpaceOnUse')
      .append('polygon')
      .attr('points', '0 0, 10 3.5, 0 7')
      .attr('fill', '#0077B6');
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
    const offsetX = 40;
  
    cajas.forEach(destino => {
      const requisitos: string[] = JSON.parse(destino.getAttribute('data-requisitos') || '[]');
      const destinoRect = destino.getBoundingClientRect();
      const totalLlegadas = llegadas.get(destino.id)?.length || 1;
      let destinoIndex = 0;
  
      requisitos.forEach(origenId => {
        const origen = document.getElementById(origenId);
        if (!origen) return;
  
        const origenRect = origen.getBoundingClientRect();
        const totalSalidas = salidas.get(origenId)?.length || 1;
        const salidaIndex = salidas.get(origenId)?.indexOf(destino) || 0;
  
        // Coordenadas relativas al contenedor
        const xOrigen = origenRect.right - contenedorRect.left;
        const yOrigen = origenRect.top - contenedorRect.top + ((salidaIndex + 1) / (totalSalidas + 1)) * origenRect.height;
  
        const xDestino = destinoRect.left - contenedorRect.left;
        const yDestino = destinoRect.top - contenedorRect.top + ((destinoIndex + 1) / (totalLlegadas + 1)) * destinoRect.height;
        destinoIndex++;
  
        const esActiva = this.conexionesActivas.includes(destino.id);
        const colorLinea = esActiva ? '#0077B6' : '#90E0EF';
        const marcador = esActiva ? 'flecha-oscura' : 'flecha-clara';

        const path = d3svg.append('path')
          .attr('d', `
            M${xOrigen},${yOrigen}
            C${xOrigen + offsetX},${yOrigen}
            ${xDestino - offsetX},${yDestino}
            ${xDestino},${yDestino}
          `)
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