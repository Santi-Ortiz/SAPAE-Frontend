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
  
    // Ajustar tamaño del SVG al contenedor
    const width = contenedor.scrollWidth;
    const height = contenedor.scrollHeight;
    svg.setAttribute('width', width + 'px');
    svg.setAttribute('height', height + 'px');
  
    svg.innerHTML = `
      <defs>
        <marker id="flecha" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto" markerUnits="userSpaceOnUse">
          <polygon points="0 0, 10 3.5, 0 7" fill="#2a5885" />
        </marker>
        <marker id="flecha-roja" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto" markerUnits="userSpaceOnUse">
          <polygon points="0 0, 10 3.5, 0 7" fill="red" />
        </marker>
      </defs>
    `;
  
    const contenedorRect = contenedor.getBoundingClientRect();
    const cajas = Array.from(document.querySelectorAll('.caja'));
  
    // Mapear cuántas conexiones salen y llegan a cada caja
    const salidasPorCaja = new Map<string, number>();
    const llegadasPorCaja = new Map<string, number>();
  
    cajas.forEach(destino => {
      const requisitosJson = destino.getAttribute('data-requisitos') || '[]';
      const destinoId = destino.getAttribute('id');
      let requisitos: string[] = [];
  
      try {
        requisitos = JSON.parse(requisitosJson);
      } catch {}
  
      requisitos.forEach((codigoOrigen: string) => {
        salidasPorCaja.set(codigoOrigen, (salidasPorCaja.get(codigoOrigen) || 0) + 1);
        llegadasPorCaja.set(destinoId || '', (llegadasPorCaja.get(destinoId || '') || 0) + 1);
      });
    });
  
    // Track para distribuir salidas/llegadas
    const salidasUsadas = new Map<string, number>();
    const llegadasUsadas = new Map<string, number>();
  
    cajas.forEach(destino => {
      const requisitosJson = destino.getAttribute('data-requisitos') || '[]';
      const destinoId = destino.getAttribute('id');
      let requisitos: string[] = [];
  
      try {
        requisitos = JSON.parse(requisitosJson);
      } catch {
        return;
      }
  
      const destinoRect = destino.getBoundingClientRect();
      const totalLlegadas = llegadasPorCaja.get(destinoId || '') || 1;
      const destinoIndex = llegadasUsadas.get(destinoId || '') || 0;
  
      // Distribuir verticalmente las llegadas
      const destinoYOffset = ((destinoIndex + 1) / (totalLlegadas + 1)) * destinoRect.height;
      const xDestino = destinoRect.left - contenedorRect.left;
      const yDestino = destinoRect.top - contenedorRect.top + destinoYOffset;
  
      llegadasUsadas.set(destinoId || '', destinoIndex + 1);
  
      requisitos.forEach((codigoOrigen: string) => {
        const origen = document.getElementById(codigoOrigen);
        if (!origen) return;
  
        const origenRect = origen.getBoundingClientRect();
        const totalSalidas = salidasPorCaja.get(codigoOrigen) || 1;
        const origenIndex = salidasUsadas.get(codigoOrigen) || 0;
  
        // Distribuir verticalmente las salidas
        const origenYOffset = ((origenIndex + 1) / (totalSalidas + 1)) * origenRect.height;
        const xOrigen = origenRect.right - contenedorRect.left;
        const yOrigen = origenRect.top - contenedorRect.top + origenYOffset;
  
        salidasUsadas.set(codigoOrigen, origenIndex + 1);
  
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  
        const canalX = (xOrigen + xDestino) / 2;

        const d = `
          M${xOrigen},${yOrigen}
          H${canalX}
          V${yDestino}
          H${xDestino}
        `;

        path.setAttribute('d', d.trim());
        path.setAttribute('fill', 'none');
  
        const esLineaActiva = this.conexionesActivas.includes(destinoId || '');
        path.setAttribute('stroke', esLineaActiva ? 'red' : '#2a5885');
        path.setAttribute('stroke-width', esLineaActiva ? '3' : '2');
        path.setAttribute('marker-end', `url(#${esLineaActiva ? 'flecha-roja' : 'flecha'})`);
  
        if (esLineaActiva) {
          path.classList.add('resaltada');
          destino.classList.add('resaltada');
        }
  
        svg.appendChild(path);
      });
    });
  }    
  
}