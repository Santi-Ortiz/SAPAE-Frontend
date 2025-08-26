import {
  Component,
  AfterViewInit,
  ElementRef,
  ViewChild,
  OnInit,
  HostListener,
  NgZone,
  ChangeDetectorRef
} from '@angular/core';
import { NgFor, NgClass } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { PensumDTO } from '../../dtos/pensum-dto';
import { MateriaDTO } from '../../dtos/materia-dto';
import { Materia } from '../../models/materia.model';
import { Progreso } from '../../models/progreso.model';
import { catchError, of, take } from 'rxjs';
import { PensumService } from '../../services/pensum.service';
import { SimulacionService } from '../../services/simulacion.service';
import { HistorialService } from '../../services/historial.service';
import * as d3 from 'd3';

type GrupoMaterias = {
  key: string;
  materias: (Materia & { cssClass: string })[];
};

@Component({
  selector: 'app-pensum-simulacion',
  standalone: true,
  imports: [RouterModule, NgFor, NgClass],
  templateUrl: './pensum-simulacion.html',
  styleUrl: './pensum-simulacion.css',
})
export class PensumSimulacion implements OnInit, AfterViewInit {
  progreso!: Progreso;
  materiasCursadasCodigos: Set<string> = new Set();
  materiasCursadas: MateriaDTO[] = [];
  materiasSimuladas: Materia[] = [];
  materiasAgrupadas: GrupoMaterias[] = [];
  allPensum: PensumDTO[] = [];
  conexionesActivas: string[] = [];
  soloMaterias: MateriaDTO[] = [];
  requisitosMap = new Map<string, string[]>();
  private llegadasGlobal = new Map<string, string[]>();
  private salidasGlobal = new Map<string, string[]>();
  private listenersAgregados = false;

  @ViewChild('svgRef') svgRef!: ElementRef<SVGSVGElement>;
  @ViewChild('contenedor') contenedorRef!: ElementRef<HTMLElement>;

  constructor(
    private router: Router,
    private simulacionService: SimulacionService,
    private pensumService: PensumService,
    private historialService: HistorialService,
    private zone: NgZone,
    private cdr: ChangeDetectorRef
  ) {}

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

      // Materias simuladas
      this.simulacionService.materiasSimuladasPorKey$.subscribe(grupos => {
        if (grupos && Object.keys(grupos).length > 0) {
          this.soloMaterias = this.progreso?.materias ?? [];
          this.materiasCursadasCodigos = new Set(this.soloMaterias.map(m => m.curso));
  
          // lista plana de Materia[]
          this.materiasSimuladas = Object.values(grupos).flatMap(arr => arr);
  
          // agrupado por key (manteniendo la key original)
          this.materiasAgrupadas = this.agruparMateriasSimuladasPorKey(grupos);
  
          this.cdr.detectChanges();
          this.zone.onStable.pipe(take(1)).subscribe(() => this.dibujarConexiones());
        }
      });
    });
  }

  getCodigo(m: Materia | MateriaDTO): string {
    return (m as any).codigo ?? (m as any).curso;
  }

  getRequisitosJson(codigoDestino: string): string {
    const req = this.requisitosMap.get(String(codigoDestino)) || [];
    return JSON.stringify(req);
  } 

  agruparMateriasSimuladasPorKey(grupos: Record<string, Materia[]>) : GrupoMaterias[] {
    const salida: GrupoMaterias[] = [];
  
    for (const key of Object.keys(grupos)) {
      const materias = (grupos[key] || []).map(m => ({
        ...m,
        cssClass: this.materiasCursadasCodigos.has(m.codigo) ? 'bloqueada' : 'faltante'
      }));
      salida.push({ key, materias });
    }
  
    return salida;
  }

    agruparPorSemestre(materias: MateriaDTO[]) {
      const ordenSemestres = ["PrimPe", "SegPe", "TerPe"]; 
      const semestreMap = new Map<number, (MateriaDTO & { cssClass: string })[]>();
    
      // ordenar ciclos
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
    
      // último semestre cursado
      const ultimoSemestre = Math.max(...Array.from(cicloToSemestre.values()));
    
      materias.forEach(m => {
        const match = m.cicloLectivo.match(/(PrimPe|SegPe|TerPe)(\d{4})/);
        if (match && m.cred > 0) {
          const clave = `${match[1]}-${match[2]}`;
          const semestre = cicloToSemestre.get(clave) ?? 0;
          if (!semestreMap.has(semestre)) semestreMap.set(semestre, []);
          
          const califNum = Number(m.calif);
    
          // asignar clases según condición
          let clase = "bloqueada"; // por defecto
          if (!isNaN(califNum) && califNum < 3) {
            clase = "perdida";
          } else if (semestre === ultimoSemestre) {
            clase = "actual";
          }
          semestreMap.get(semestre)!.push({ ...m, cssClass: clase });
        }
      });
    
      return Array.from(semestreMap.entries()).map(([semestre, materias]) => ({
        semestre,
        materias
      }));
  }

  esMateriaBloqueada(materia: Materia): boolean {
    return this.materiasCursadasCodigos.has(materia.codigo);
  }

  private norm(c: any): string {
    const s = String(c ?? '').trim();
    return /^\d+$/.test(s) ? s.padStart(6, '0') : s;
  }

  seleccionarMateria(codigo: string) {
    const codSel = this.norm(codigo);
    if (this.materiasCursadasCodigos.has(codSel)) return;

    this.conexionesActivas = [codSel];
    let tieneConexiones = false;

    this.allPensum.forEach(materia => {
      try {
        const codMat = this.norm(materia.codigo);
        const parsed = JSON.parse(materia.requisitosJson || '[]');
        const requisitos: string[] = (Array.isArray(parsed) ? parsed : []).map(r => this.norm(r));

        if (requisitos.includes(codSel)) {
          this.conexionesActivas.push(codMat);
          tieneConexiones = true;
        }
      } catch {}
    });

    this.conexionesActivas = Array.from(new Set(this.conexionesActivas.map(c => this.norm(c))));
    document.querySelectorAll('.caja').forEach(c => c.classList.remove('resaltada'));

    const origenBox = document.getElementById(codSel);
    if (origenBox) origenBox.classList.add('resaltada');

    this.dibujarConexiones();
  }

  ngAfterViewInit() {
    this.zone.onStable.subscribe(() => this.dibujarConexiones());
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
    svg.innerHTML = '';
  }

  private dibujarCurvas(
      d3svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
      cajas: HTMLElement[],
      salidas: Map<string, string[]>,
      llegadas: Map<string, string[]>,
      contenedor: HTMLElement
    ) {
    
      // Marcadores de las flechas 
      const defs = d3svg.append("defs");
      ["clara", "oscura"].forEach(tipo => {
        defs.append("marker")
        .attr("id", `flecha-${tipo}-izquierda`)
        .attr("viewBox", "0 -3 6 6")
        .attr("refX", 6)
        .attr("refY", 0)
        .attr("markerWidth", 4)
        .attr("markerHeight", 4)
        .attr("orient", "0")
        .append("path")
        .attr("d", "M0,-3L6,0L0,3")
        .attr("fill", tipo === "oscura" ? "#0077B6" : "#90E0EF");
      });
    
      const svg = d3svg.node();
      if (!svg) return;
    
      // Dibujar flechas 
      cajas.forEach(destino => {
        const requisitos: string[] = llegadas.get(destino.id) || [];
        const totalLlegadas = requisitos.length || 1;
        let llegadaIndex = 0;
    
        requisitos.forEach(origenId => {
          const origen = document.getElementById(origenId);
          if (!origen) return;
    
          const totalSalidas = salidas.get(origenId)?.length || 1;
          const salidaIndex = salidas.get(origenId)?.indexOf(destino.id) || 0;
    
          const origenLeft = origen.offsetLeft;
          const origenTop = origen.offsetTop;
          const origenWidth = origen.offsetWidth;
          const origenHeight = origen.offsetHeight;
  
          const destinoLeft = destino.offsetLeft;
          const destinoTop = destino.offsetTop;
          const destinoHeight = destino.offsetHeight;
  
          // Flecha desde borde derecho del origen hasta borde izquierdo del destino
          const xOrigen = origenLeft + origenWidth;
          const yOrigen =
            origenTop + ((salidaIndex + 1) / (totalSalidas + 1)) * origenHeight;
  
          const xDestino = destinoLeft;
          const yDestino =
            destinoTop + ((llegadaIndex + 1) / (totalLlegadas + 1)) * destinoHeight;
  
          llegadaIndex++;
    
          const esActiva =
          this.conexionesActivas.includes(destino.id) ||
          this.conexionesActivas.includes(origenId);
  
          const colorLinea = esActiva ? "#0077B6" : "#90E0EF";
          const tipo = esActiva ? "oscura" : "clara";
    
          // margen horizontal base más pequeño
          const margenBase = 15;  
  
          // separa las líneas para que no se sobrepongan
          const margenExtra = (salidaIndex - (totalSalidas - 1) / 2) * 12;
  
          // coordenada intermedia en X (primer giro)
          const puntoIntermedioX = xOrigen + margenBase + margenExtra;
  
          const puntosRuta: [number, number][] = [
            [xOrigen, yOrigen],
            [puntoIntermedioX, yOrigen],
            [puntoIntermedioX, yDestino],
            [xDestino, yDestino]
          ];
  
  
          const lineGenerator = d3.line<[number, number]>()
            .x(d => d[0])
            .y(d => d[1])
            .curve(d3.curveStep);
    
          const path = d3svg.append("path")
            .attr("d", lineGenerator(puntosRuta)!)
            .attr("fill", "none")
            .attr("stroke", colorLinea)
            .attr("stroke-width", esActiva ? 3 : 2)
            .attr("marker-end", `url(#flecha-${tipo}-izquierda)`);
    
            if (esActiva) {
              path.classed("resaltada", true);
              destino.classList.add("resaltada");
              origen.classList.add("resaltada");
            } 
        });
      });
    }

  dibujarConexiones() {
    const svg = this.svgRef?.nativeElement;
    const contenedor = this.contenedorRef?.nativeElement;
    if (!svg || !contenedor) return;
  
    this.configurarSVG(svg, contenedor);
    const d3svg = d3.select(svg);
  
    this.llegadasGlobal.clear();
    this.salidasGlobal.clear();
  
    this.materiasSimuladas.forEach(materia => {
      const requisitos: string[] = materia.requisitos ?? [];
      const codigoDestino = String(materia.codigo).padStart(6, "0").trim();
  
      requisitos.forEach(req => {
        const reqCode = String(req).padStart(6, "0").trim();
  
        if (!this.salidasGlobal.has(reqCode)) this.salidasGlobal.set(reqCode, []);
        this.salidasGlobal.get(reqCode)!.push(codigoDestino);
  
        if (!this.llegadasGlobal.has(codigoDestino)) this.llegadasGlobal.set(codigoDestino, []);
        this.llegadasGlobal.get(codigoDestino)!.push(reqCode);
      });
    });
  
    console.log("Llegadas simuladas (una sola vez):", this.llegadasGlobal);
    console.log("Salidas simuladas (una sola vez):", this.salidasGlobal);
  
    const cajas = Array.from(document.querySelectorAll<HTMLElement>(".caja"));
  
    // Dibujar todas las curvas
    this.dibujarCurvas(d3svg, cajas, this.salidasGlobal, this.llegadasGlobal, contenedor);
  
    if (!this.listenersAgregados) {
      this.listenersAgregados = true;
  
      window.addEventListener("scroll", () =>
        this.dibujarCurvas(d3svg, cajas, this.salidasGlobal, this.llegadasGlobal, contenedor)
      );
  
      window.addEventListener("resize", () =>
        this.dibujarCurvas(d3svg, cajas, this.salidasGlobal, this.llegadasGlobal, contenedor)
      );
    }
  }

  public volverSimulacion(): void {
    this.router.navigate(["/simulacion/mostrar"]);
  }
}
