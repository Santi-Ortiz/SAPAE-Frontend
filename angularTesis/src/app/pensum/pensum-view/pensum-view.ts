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
  

  dibujarConexiones(origenSeleccionado: string = '') {
    const svg = this.svgRef?.nativeElement;
    const contenedor = this.contenedorRef?.nativeElement;
    if (!svg || !contenedor) return;

    const width = contenedor.scrollWidth;
    const height = contenedor.scrollHeight;
    svg.setAttribute('width', `${width}px`);
    svg.setAttribute('height', `${height}px`);

    svg.innerHTML = ''; // limpiar SVG antes de dibujar

    const d3svg = d3.select(svg);

    // Definir flechas
    const defs = d3svg.append('defs');

    const marker = defs.append('marker')
      .attr('id', 'flecha')
      .attr('markerWidth', 10)
      .attr('markerHeight', 7)
      .attr('refX', 10)
      .attr('refY', 3.5)
      .attr('orient', 'auto')
      .attr('markerUnits', 'userSpaceOnUse');

    marker.append('polygon')
      .attr('points', '0 0, 10 3.5, 0 7')
      .attr('fill', '#2a5885');

    const markerRojo = defs.append('marker')
      .attr('id', 'flecha-roja')
      .attr('markerWidth', 10)
      .attr('markerHeight', 7)
      .attr('refX', 10)
      .attr('refY', 3.5)
      .attr('orient', 'auto')
      .attr('markerUnits', 'userSpaceOnUse');

    markerRojo.append('polygon')
      .attr('points', '0 0, 10 3.5, 0 7')
      .attr('fill', 'black');

    const contenedorRect = contenedor.getBoundingClientRect();
    const cajas = Array.from(document.querySelectorAll('.caja'));

    const salidasPorCaja = new Map<string, number>();
    const llegadasPorCaja = new Map<string, number>();

    cajas.forEach(destino => {
      const requisitosJson = destino.getAttribute('data-requisitos') || '[]';
      const destinoId = destino.getAttribute('id')!;
      let requisitos: string[] = [];

      try {
        requisitos = JSON.parse(requisitosJson);
      } catch {}

      requisitos.forEach(codigoOrigen => {
        salidasPorCaja.set(codigoOrigen, (salidasPorCaja.get(codigoOrigen) || 0) + 1);
        llegadasPorCaja.set(destinoId, (llegadasPorCaja.get(destinoId) || 0) + 1);
      });
    });

    const salidasUsadas = new Map<string, number>();
    const llegadasUsadas = new Map<string, number>();

    cajas.forEach(destino => {
      const requisitosJson = destino.getAttribute('data-requisitos') || '[]';
      const destinoId = destino.getAttribute('id')!;
      let requisitos: string[] = [];

      try {
        requisitos = JSON.parse(requisitosJson);
      } catch { return; }

      const destinoRect = destino.getBoundingClientRect();
      const totalLlegadas = llegadasPorCaja.get(destinoId) || 1;
      const destinoIndex = llegadasUsadas.get(destinoId) || 0;

      const destinoYOffset = ((destinoIndex + 1) / (totalLlegadas + 1)) * destinoRect.height;
      const xDestino = destinoRect.left - contenedorRect.left;
      const yDestino = destinoRect.top - contenedorRect.top + destinoYOffset;

      llegadasUsadas.set(destinoId, destinoIndex + 1);

      requisitos.forEach(codigoOrigen => {
        const origen = document.getElementById(codigoOrigen);
        if (!origen) return;

        const origenRect = origen.getBoundingClientRect();
        const totalSalidas = salidasPorCaja.get(codigoOrigen) || 1;
        const origenIndex = salidasUsadas.get(codigoOrigen) || 0;

        const origenYOffset = ((origenIndex + 1) / (totalSalidas + 1)) * origenRect.height;
        const xOrigen = origenRect.right - contenedorRect.left;
        const yOrigen = origenRect.top - contenedorRect.top + origenYOffset;

        salidasUsadas.set(codigoOrigen, origenIndex + 1);

        const esLineaActiva = this.conexionesActivas.includes(destinoId);

        // Dibuja curva Bezier (suave)
        const curva = d3svg.append('path')
          .attr('d', `
            M${xOrigen},${yOrigen}
            C${(xOrigen + xDestino) / 2},${yOrigen}
            ${(xOrigen + xDestino) / 2},${yDestino}
            ${xDestino},${yDestino}
          `)
          .attr('fill', 'none')
          .attr('stroke', esLineaActiva ? 'red' : '#2a5885')
          .attr('stroke-width', esLineaActiva ? 3 : 2)
          .attr('marker-end', `url(#${esLineaActiva ? 'flecha-roja' : 'flecha'})`);

        if (esLineaActiva) {
          curva.classed('resaltada', true);
          destino.classList.add('resaltada');
        }
      });
    });

    
  }
    
  
}