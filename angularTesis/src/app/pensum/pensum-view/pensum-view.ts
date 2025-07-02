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

  @ViewChild('svgRef') svgRef!: ElementRef<SVGSVGElement>;

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

  dibujarConexiones(origenSeleccionado: string = '') {
    const svg = this.svgRef?.nativeElement;
    if (!svg) return;
  
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
  
    const cajas = document.querySelectorAll('.caja');
  
    cajas.forEach(destino => {
      const requisitosJson = destino.getAttribute('data-requisitos') || '[]';
      const destinoId = destino.getAttribute('id');
  
      let requisitos: string[];
      try {
        requisitos = JSON.parse(requisitosJson);
      } catch {
        return;
      }
  
      const destinoRect = destino.getBoundingClientRect();
      const xDestino = destinoRect.left + window.scrollX;
      const yDestino = destinoRect.top + window.scrollY + destinoRect.height / 2;
  
      requisitos.forEach((codigoOrigen: string, index: number) => {
        const origen = document.getElementById(codigoOrigen);
        if (!origen) return;
  
        const origenRect = origen.getBoundingClientRect();
        const xOrigen = origenRect.right + window.scrollX;
        const yOrigen = origenRect.top + window.scrollY + origenRect.height / 2;
  
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  
        // Espaciado dinámico para evitar que se crucen las líneas
        const offsetVertical = 12;
        const yOffset = index * offsetVertical;
        const curvaX = xOrigen + 40 + index * 5;
  
        const d = `
          M${xOrigen},${yOrigen + yOffset}
          H${curvaX}
          V${yDestino + yOffset}
          H${xDestino}
        `;
  
        path.setAttribute('d', d);
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
  

  seleccionarMateria(codigo: string) {
    this.conexionesActivas = [];
  
    // Buscar materias que tengan la materia seleccionada como requisito
    this.allPensum.forEach(materia => {
      try {
        const requisitos: string[] = JSON.parse(materia.requisitosJson || '[]');
        if (requisitos.includes(codigo)) {
          this.conexionesActivas.push(materia.codigo); // guardar destinos (dependientes)
        }
      } catch (e) {
        // Ignorar errores 
      }
    });

    document.querySelectorAll('.caja').forEach(c => {
      c.classList.remove('resaltada');
    });
    const origenBox = document.getElementById(codigo);
    if (origenBox) origenBox.classList.add('resaltada');
    
  
    this.dibujarConexiones(codigo); // pasar el origen seleccionado
  }
  
  
}