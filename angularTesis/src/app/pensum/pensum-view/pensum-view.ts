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
import { MateriaDTO } from '../../dtos/materia-dto';
import { Progreso } from '../../models/progreso.model';
import { catchError, of, take } from 'rxjs';
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
  materiasFaltantes: { semestre: number; materias: PensumDTO[] }[] = [];
  allPensum: PensumDTO[] = [];
  ultimoSemestreCursado: number = 0;
  errorMessage = '';
  conexionesActivas: string[] = [];
  mensajeSinRequisitos: string = '';
  mostrarMensaje: boolean = false;
  mensajeX: number = 0;
  mensajeY: number = 0;
  soloMaterias: MateriaDTO[] = [];
  requisitosMap = new Map<string, string[]>();


  @ViewChild('svgRef') svgRef!: ElementRef<SVGSVGElement>;
  @ViewChild('contenedor') contenedorRef!: ElementRef<HTMLElement>;


  constructor(
    private pensumService: PensumService,
    private historialService: HistorialService,
    private zone: NgZone,
    private cdr: ChangeDetectorRef
  ) { }


  ngOnInit(): void {
    this.progreso = this.historialService.getHistorial()!; 
  
    this.pensumService.obtenerPensum().pipe(
      catchError(err => {
        console.error('Error cargando pensum', err);
        return of([] as PensumDTO[]);
      })
    ).subscribe(pensum => {
      this.allPensum = pensum;
  
      this.requisitosMap.clear();

      for (const m of this.allPensum) {
        let req: string[] = [];
        try {
          const r = (m.requisitos?.length ? m.requisitos : JSON.parse(m.requisitosJson || '[]')) as (string | number)[];
          req = r.map(String);
        } catch {
          req = [];
        }
        this.requisitosMap.set(String(m.codigo), req);
      }
  
      if (this.progreso) {
        this.soloMaterias = this.progreso.materias ?? [];
        this.materiasCursadasCodigos = new Set(this.soloMaterias.map(m => m.curso));
        this.materiasFaltantes = this.agruparMateriasFaltantes(this.progreso, this.allPensum);
        this.cdr.detectChanges();
        this.zone.onStable.pipe(take(1)).subscribe(() => this.dibujarConexiones());

      }

    });
  }
  
  getCodigo(m: PensumDTO | MateriaDTO): string {
    return (m as any).codigo ?? (m as any).curso;
  }  

  getRequisitosJson(codigoDestino: string): string { 
    const req = this.requisitosMap.get(String(codigoDestino)) || []; 
    return JSON.stringify(req);
  }

  agruparPorSemestre(materias: MateriaDTO[]) {
    const ordenSemestres = ["PrimPe", "SegPe", "TerPe"]; 
    const semestreMap = new Map<number, MateriaDTO[]>();
  
    const ciclosOrdenados = Array.from(
      new Set(
        materias
          .map(m => {
            const match = m.cicloLectivo.match(/(PrimPe|SegPe|TerPe)(\d{4})/);
            return match ? `${match[1]}-${match[2]}` : "";
          })
          .filter(c => c !== "")
      )
    ).sort((a, b) => {
      const [cicloA, anioA] = a.split("-");
      const [cicloB, anioB] = b.split("-");
      if (anioA !== anioB) return parseInt(anioA) - parseInt(anioB);
      return ordenSemestres.indexOf(cicloA) - ordenSemestres.indexOf(cicloB);
    });
  
    let semestreCounter = 1;
    const cicloToSemestre = new Map<string, number>();
  
    for (let i = 0; i < ciclosOrdenados.length; i++) {
      const [ciclo, anio] = ciclosOrdenados[i].split("-");
      if (ciclo === "SegPe") {
        cicloToSemestre.set(`${ciclo}-${anio}`, semestreCounter);
      } else {
        cicloToSemestre.set(`${ciclo}-${anio}`, semestreCounter);
        semestreCounter++;
      }
    }
  
    materias.forEach(m => {
      const match = m.cicloLectivo.match(/(PrimPe|SegPe|TerPe)(\d{4})/);
      if (match) {
        const clave = `${match[1]}-${match[2]}`;
        const semestre = cicloToSemestre.get(clave) ?? 0;
        if (!semestreMap.has(semestre)) semestreMap.set(semestre, []);
        semestreMap.get(semestre)!.push(m);
      }
    });
  
    return Array.from(semestreMap.entries()).map(([semestre, materias]) => ({
      semestre,
      materias
    }));
  }

  agruparMateriasFaltantes(progreso: Progreso, pensum: PensumDTO[]) {
    if (!progreso || !pensum || pensum.length === 0) return [];
  
    const semestreActual = progreso.semestre ?? 0; 
    const materiasCursadasCodigos = new Set(progreso.materias.map(m => m.curso));
  
    // Materias faltantes 
    const materiasFaltantes = (progreso.listaMateriasFaltantes?.length
      ? progreso.listaMateriasFaltantes.map(m => m.nombre)
      : pensum
          .filter(materia => !materiasCursadasCodigos.has(materia.codigo))
          .map(m => m.nombre)
    );
  
    // Buscar en el pensum cada materia faltante y asignarla a su semestre
    const agrupadoPorSemestre = new Map<number, PensumDTO[]>();
  
    materiasFaltantes.forEach(nombreMateria => {
      const materiaPensum = pensum.find(p => p.nombre === nombreMateria);
      if (materiaPensum && materiaPensum.semestre > semestreActual) {
        if (!agrupadoPorSemestre.has(materiaPensum.semestre)) {
          agrupadoPorSemestre.set(materiaPensum.semestre, []);
        }
        agrupadoPorSemestre.get(materiaPensum.semestre)!.push(materiaPensum);
      }
    });

    // Agregar cajas para créditos pendientes
    const creditosExtras = [
      { titulo: "Electiva", creditos: progreso.faltanElectiva ?? 0 },
      { titulo: "Complementaria", creditos: progreso.faltanComplementaria ?? 0 },
      { titulo: "Énfasis", creditos: progreso.faltanEnfasis ?? 0 },
      { titulo: "Electiva Ciencias Básicas", creditos: progreso.faltanElectivaBasicas ?? 0 }
    ];

    creditosExtras.forEach(extra => {
      if (extra.creditos > 0) {
        const semestreExtra = semestreActual + 1;
        if (!agrupadoPorSemestre.has(semestreExtra)) {
          agrupadoPorSemestre.set(semestreExtra, []);
        }
        agrupadoPorSemestre.get(semestreExtra)!.push(
          new PensumDTO(
            "0",
            extra.titulo,
            extra.creditos,
            semestreExtra,
            "[]"
          )
        );
      }
    });
  
    // Devolver arreglo 
    return Array.from(agrupadoPorSemestre.entries())
      .sort(([a], [b]) => a - b)
      .map(([semestre, materias]) => ({ semestre, materias }));
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

  private dibujarCurvas(
    d3svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
    salidas: Map<string, HTMLElement[]>,
    contenedor: HTMLElement
  ) {
    const contenedorRect = contenedor.getBoundingClientRect();
    const offsetLeft = contenedorRect.left + contenedor.scrollLeft;
    const offsetTop = contenedorRect.top + contenedor.scrollTop;
  
    const offsetX = 20;
    const offsetY = 0;
  
    salidas.forEach((destinos, idOrigen) => {
      const origen = document.getElementById(idOrigen);
      if (!origen) return;
  
      const origenRect = origen.getBoundingClientRect();
      const totalSalidas = destinos.length;
  
      destinos.forEach((destino, i) => {
        const destinoRect = destino.getBoundingClientRect();
  
        const xOrigen = origenRect.right - offsetLeft;
        const yOrigen =
          origenRect.top -
          offsetTop +
          ((i + 1) / (totalSalidas + 1)) * origenRect.height;
  
        const xDestino = destinoRect.left - offsetLeft;
        const yDestino = destinoRect.top - offsetTop + destinoRect.height / 2;
  
        // Determinar dirección para el marcador
        let direccion = "derecha";
        if (xDestino < xOrigen && Math.abs(yDestino - yOrigen) < origenRect.height / 2) {
          direccion = "izquierda";
        } else if (yDestino < yOrigen && Math.abs(xDestino - xOrigen) < origenRect.width / 2) {
          direccion = "arriba";
        } else if (yDestino > yOrigen && Math.abs(xDestino - xOrigen) < origenRect.width / 2) {
          direccion = "abajo";
        }
  
        // Puntos de la curva
        const puntosRuta: [number, number][] = [
          [xOrigen, yOrigen],
          [xOrigen + offsetX, yOrigen],
          [xOrigen + offsetX, yDestino + offsetY],
          [xDestino, yDestino + offsetY],
        ];
  
        const lineGenerator = d3.line<[number, number]>()
          .x((d) => d[0])
          .y((d) => d[1])
          .curve(d3.curveStep);
  
        d3svg.append("path")
          .attr("d", lineGenerator(puntosRuta)!)
          .attr("fill", "none")
          .attr("stroke", "#0077B6")
          .attr("stroke-width", 2)
          .attr("marker-end", `url(#flecha-oscura-${direccion})`);
      });
    });
  }

  obtenerRelaciones(cajas: HTMLElement[]) {
    const salidas = new Map<string, HTMLElement[]>();
    const llegadas = new Map<string, HTMLElement[]>();
  
    // Unificar materias cursadas y faltantes con su código y elemento
    const todasLasMaterias: { codigo: string; elemento: HTMLElement }[] = [
      ...this.soloMaterias
        .map(m => {
          const el = cajas.find(c => c.id === String(m.curso));
          return el ? { codigo: String(m.curso), elemento: el } : null;
        })
        .filter((m): m is { codigo: string; elemento: HTMLElement } => m !== null),
      ...this.allPensum
        .map(m => {
          const el = cajas.find(c => c.id === String(m.codigo));
          return el ? { codigo: String(m.codigo), elemento: el } : null;
        })
        .filter((m): m is { codigo: string; elemento: HTMLElement } => m !== null)
    ];
  
    for (const [codigoDestino, requisitos] of this.requisitosMap.entries()) {
      const destinoMateria = todasLasMaterias.find(m => m.codigo === codigoDestino);
      if (!destinoMateria) continue;
  
      requisitos.forEach(codigoOrigen => {
        const origenMateria = todasLasMaterias.find(m => m.codigo === codigoOrigen);
        if (!origenMateria) return;
  
        if (!salidas.has(codigoOrigen)) salidas.set(codigoOrigen, []);
        salidas.get(codigoOrigen)!.push(destinoMateria.elemento);
  
        if (!llegadas.has(codigoDestino)) llegadas.set(codigoDestino, []);
        llegadas.get(codigoDestino)!.push(origenMateria.elemento);
      });
    }
  
    console.log("Salidas Map:", salidas);
    console.log("Llegadas Map:", llegadas);
  
    return { salidas, llegadas };
  }
  
  esMateriaBloqueada(materia: PensumDTO | MateriaDTO, semestreGrupo?: number): boolean {
    const semestreActual = this.progreso?.semestre ?? 0;
    const codigo = this.getCodigo(materia);
  
    // Determinar semestre de la materia en pantalla
    const semestreMateria =
      (materia as any).semestre !== undefined
        ? (materia as any).semestre
        : (semestreGrupo ?? 0);
  
    // 1) Si NO es del último semestre cursado → bloquear
    if (semestreMateria !== semestreActual) return true;

    // 2) Si ya está cursada → bloquear
    if (this.materiasCursadasCodigos.has(codigo)) return true;
    
    // 3) Si es requisito de alguna materia faltante → NO bloquear
    const esRequisitoDeFaltante = this.materiasFaltantes.some(grupo =>
      grupo.materias.some(faltante => {
        try {
          const requisitos: string[] = JSON.parse(faltante.requisitosJson || '[]');
          return requisitos.includes(codigo);
        } catch {
          return false;
        }
      })
    );
    if (esRequisitoDeFaltante) return false;
  
    this.dibujarConexiones(codigo);
    // 4) Si no cumple lo anterior → bloquear
    return true;
  }
  
  
  seleccionarMateria(codigo: string) {
    this.conexionesActivas = [];
  
    let tieneRequisitos = false;
    this.allPensum.forEach(m => {
      try {
        const reqs: string[] = JSON.parse(m.requisitosJson || '[]');
        if (reqs.includes(codigo)) {
          this.conexionesActivas.push(m.codigo);
          tieneRequisitos = true;
        }
      } catch {}
    });
  
    document.querySelectorAll('.caja').forEach(c => c.classList.remove('resaltada'));
    const origenBox = document.getElementById(codigo);
    if (origenBox) origenBox.classList.add('resaltada');
  
    if (!tieneRequisitos) {
      this.mostrarMensaje = true;
      this.mensajeSinRequisitos = 'Esta materia no es requisito para otra.';
      setTimeout(() => (this.mostrarMensaje = false), 3000);
    } else {
      this.mostrarMensaje = false;
    }
  
    this.dibujarConexiones(codigo);
  }
  
  
  dibujarConexiones(origenSeleccionado: string = '') {
    const svg = this.svgRef?.nativeElement;
    const contenedor = this.contenedorRef?.nativeElement;
    if (!svg || !contenedor) return;
  
    this.configurarSVG(svg, contenedor);
    const d3svg = d3.select(svg);
    this.crearMarcadores(d3svg);
  
    const { salidas } = this.obtenerRelaciones(Array.from(document.querySelectorAll<HTMLElement>('.caja')));
  
    this.dibujarCurvas(d3svg, salidas, contenedor);
  }
  
  
}