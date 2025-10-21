import {
  Component,
  AfterViewInit,
  ElementRef,
  ViewChild,
  OnInit,
  OnDestroy,
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
import { catchError, of, take, Subscription } from 'rxjs';
import { PensumService } from '../../services/pensum.service';
import { SimulacionService } from '../../services/simulacion.service';
import { HistorialService } from '../../services/historial.service';
import * as d3 from 'd3';
import { MateriaService } from '../../services/materia.service';

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
export class PensumSimulacion implements OnInit, AfterViewInit, OnDestroy {
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
  private subscriptions: Subscription[] = [];

  @ViewChild('svgRef') svgRef!: ElementRef<SVGSVGElement>;
  @ViewChild('contenedor') contenedorRef!: ElementRef<HTMLElement>;

  constructor(
    private router: Router,
    private simulacionService: SimulacionService,
    private pensumService: PensumService,
    private materiaService: MateriaService,
    private historialService: HistorialService,
    private zone: NgZone,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.progreso = this.historialService.getHistorial()!;
    console.log("Progreso:", this.progreso);

    this.pensumService.obtenerPensum().pipe(
      catchError(err => {
        console.error('Error cargando pensum', err);
        return of([] as PensumDTO[]);
      })
    ).subscribe(pensum => {
      this.allPensum = pensum;
      this.requisitosMap.clear();

      // Cargar requisitos desde la BD
      this.allPensum.forEach(materia => {
        if (materia.codigo) {
          this.materiaService.getRequisitosDeMateria(materia.codigo).subscribe({
            next: (requisitos: string[]) => {
              // requisitos ya son códigos string
              const codigos = requisitos.map(cod => String(cod));
              this.requisitosMap.set(String(materia.codigo), codigos);
              console.log(`Requisitos cargados para ${materia.codigo}:`, codigos);
            },
            error: (err) => {
              console.error(`Error obteniendo requisitos de ${materia.codigo}:`, err);
              this.requisitosMap.set(String(materia.codigo), []); // si falla, dejar vacío
            }
          });
        }
      });

      // Procesar progreso del estudiante
      if (this.progreso) {
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
            } else {
              // Si no hay grupos, limpiar los datos
              this.materiasSimuladas = [];
              this.materiasAgrupadas = [];
              this.cdr.detectChanges();
            }
        })
      }

      this.resetearSeleccion();
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
      const materias = (grupos[key] || []).map(m => {
        let cssClass = this.materiasCursadasCodigos.has(m.codigo) 
          ? 'bloqueada' 
          : 'simulada'; 
        return { ...m, cssClass };
      });
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
      if (match) {
        const clave = `${match[1]}-${match[2]}`;
        const semestre = cicloToSemestre.get(clave) ?? 0;
        if (!semestreMap.has(semestre)) semestreMap.set(semestre, []);
  
        // 🔹 normalizar créditos
        const cred = parseFloat((m.cred ?? "0").toString().replace(",", "."));
  
        // 🔹 normalizar calificación
        const califNum = Number(m.calif);
        let clase = "bloqueada"; // por defecto
        if (!isNaN(califNum) && califNum < 3) {
          clase = "perdida";
        } else if (semestre === ultimoSemestre) {
          clase = "actual";
        }
  
        // incluir solo materias con créditos válidos (>0)
        if (cred > 0) {
          semestreMap.get(semestre)!.push({ ...m, cred, cssClass: clase });
        }
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
    console.log(`MATERIA SELECCIONADA: ${codigo}`);
    const codSel = this.norm(codigo);

    if (this.materiasCursadasCodigos.has(codSel)) return;

    this.conexionesActivas = [codSel];
    let tieneConexiones = false;

    this.allPensum.forEach(materia => {
      try {
        const codMat = this.norm(materia.codigo);
        const parsed = JSON.parse(materia.requisitosJson || '[]');
        const requisitos: string[] = (Array.isArray(parsed) ? parsed : [])
          .map(r => this.norm(r));

        /* La seleccionada es requisito de otra (flecha de salida)
        if (requisitos.includes(codSel)) {
          this.conexionesActivas.push(codMat);
          tieneConexiones = true;
        }*/

      } catch {}
    });

    // Quitar duplicados y asegurar todo normalizado
    this.conexionesActivas = Array.from(new Set(this.conexionesActivas.map(c => this.norm(c))));

    // Quitar resaltados previos
    document.querySelectorAll('.caja').forEach(c => c.classList.remove('resaltada'));

    // Resaltar origen con el MISMO id del HTML
    const origenBox = document.getElementById(codSel);
    if (origenBox && origenBox.classList.contains('simulada')) {
      origenBox.classList.add('resaltada');
    }

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
      // --- Marcadores ---
      d3svg.select("defs").remove();
      const defs = d3svg.append("defs");
      ["clara", "oscura"].forEach(tipo => {
        defs.append("marker")
          .attr("id", `flecha-${tipo}-izquierda`)
          .attr("viewBox", "0 -3 6 6")
          .attr("refX", 6)
          .attr("refY", 0)
          .attr("markerWidth", 4)
          .attr("markerHeight", 4)
          .attr("orient", "auto")
          .append("path")
          .attr("d", "M0,-3L6,0L0,3")
          .attr("fill", tipo === "oscura" ? "#0077B6" : "#90E0EF");
      });
    
      d3svg.selectAll("g.capa-lineas, g.capa-lineas-resaltadas").remove();
      const capaLineas = d3svg.append("g").attr("class", "capa-lineas");
      const capaLineasResaltadas = d3svg.append("g").attr("class", "capa-lineas-resaltadas");
    
      const columnas = Array.from(contenedor.querySelectorAll<HTMLElement>(".semestre-columna"));
      const gapCentersX: number[] = [];
      for (let i = 0; i < columnas.length - 1; i++) {
        const rightEdge = columnas[i].offsetLeft + columnas[i].offsetWidth;
        const nextLeft = columnas[i + 1].offsetLeft;
        gapCentersX.push(rightEdge + (nextLeft - rightEdge) / 2);
      }
    
      // parámetros ajustados (canales más pegados)
      const offsetHorizBase = 12;
      const laneSpacingY = 8;
      const laneSpacingX = 6;
      const offsetLlegada = 10;
      const shortRun = 10;
    
      const colGapCentersY: Array<number[]> = columnas.map(col => {
        const cajasEnCol = Array.from(col.querySelectorAll<HTMLElement>(".caja"))
          .sort((a, b) => a.offsetTop - b.offsetTop);
        if (cajasEnCol.length <= 1) return [];
        const gaps: number[] = [];
        for (let j = 0; j < cajasEnCol.length - 1; j++) {
          const bottom = cajasEnCol[j].offsetTop + cajasEnCol[j].offsetHeight;
          const topNext = cajasEnCol[j + 1].offsetTop;
          gaps.push(bottom + (topNext - bottom) / 2);
        }
        return gaps;
      });
    
      const lineGenerator = d3.line<[number, number]>()
        .x(d => d[0])
        .y(d => d[1])
        .curve(d3.curveStep);
    
      // --- GRID & ocupación de CAJAS ---
      const cellSize = Math.max(7, Math.round(Math.max(laneSpacingX, laneSpacingY) * 0.1));
      const occupied: Set<string> = new Set();
      const keyOf = (gx: number, gy: number) => `${gx},${gy}`;
    
      function toGridCoord(x: number, y: number): [number, number] {
        // índices de celda
        return [Math.round(x / cellSize), Math.round(y / cellSize)];
      }
    
      function fromGridCoord(gx: number, gy: number): [number, number] {
        // centro de la celda
        return [gx * cellSize + cellSize / 2, gy * cellSize + cellSize / 2];
      }
    
      function occupySegmentGrid(x1: number, y1: number, x2: number, y2: number) {
        const minX = Math.min(x1, x2), maxX = Math.max(x1, x2);
        const minY = Math.min(y1, y2), maxY = Math.max(y1, y2);
        const [gx1] = toGridCoord(minX, minY);
        const [gx2] = toGridCoord(maxX, minY);
        const [, gy1] = toGridCoord(minX, minY);
        const [, gy2] = toGridCoord(minX, maxY);
    
        for (let gx = Math.min(gx1, gx2); gx <= Math.max(gx1, gx2); gx++) {
          for (let gy = Math.min(gy1, gy2); gy <= Math.max(gy1, gy2); gy++) {
            occupied.add(keyOf(gx, gy));
          }
        }
      }
    
      // NO marcamos líneas como ocupadas para que se puedan sobreescribir,
      // pero sí usaremos la grid para detectar cajas y desplazar canales.
      function reservarEnGridNoOccupy(x: number, y: number): [number, number] {
        const [gx0, gy0] = toGridCoord(x, y);
        // buscamos la celda más cercana (sin marcarla)
        const free = findFreeCellNear(gx0, gy0, 6) || [gx0, gy0];
        return fromGridCoord(free[0], free[1]);
      }
    
      function findFreeCellNear(gx0: number, gy0: number, maxRadius = 8): [number, number] | null {
        for (let r = 0; r <= maxRadius; r++) {
          for (let dx = -r; dx <= r; dx++) {
            const dyCandidates = [-r, r];
            for (const dy of dyCandidates) {
              const gx = gx0 + dx;
              const gy = gy0 + dy;
              if (!occupied.has(keyOf(gx, gy))) return [gx, gy];
            }
          }
          for (let dy = -r + 1; dy <= r - 1; dy++) {
            const dxCandidates = [-r, r];
            for (const dx of dxCandidates) {
              const gx = gx0 + dx;
              const gy = gy0 + dy;
              if (!occupied.has(keyOf(gx, gy))) return [gx, gy];
            }
          }
        }
        return null;
      }
    
      // Verifica si algún bloque de celdas en el rectángulo (x1,y1)-(x2,y2) está ocupado
      function rectIntersectsOccupied(x1: number, y1: number, x2: number, y2: number): boolean {
        const minX = Math.min(x1, x2), maxX = Math.max(x1, x2);
        const minY = Math.min(y1, y2), maxY = Math.max(y1, y2);
        const [gx1] = toGridCoord(minX, minY);
        const [gx2] = toGridCoord(maxX, minY);
        const [, gy1] = toGridCoord(minX, minY);
        const [, gy2] = toGridCoord(minX, maxY);
    
        for (let gx = Math.min(gx1, gx2); gx <= Math.max(gx1, gx2); gx++) {
          for (let gy = Math.min(gy1, gy2); gy <= Math.max(gy1, gy2); gy++) {
            if (occupied.has(keyOf(gx, gy))) return true;
          }
        }
        return false;
      }
    
      // Busca un Y libre alrededor de yDeseado en la columna de grid correspondiente a x
      function findFreeY(x: number, yDeseado: number, maxSearch = 30): number {
        const [gx, gyStart] = toGridCoord(x, yDeseado);
        if (!occupied.has(keyOf(gx, gyStart))) return fromGridCoord(gx, gyStart)[1];
    
        for (let r = 1; r <= maxSearch; r++) {
          // priorizar dirección del destino: primero hacia afuera del rectángulo central
          const up = gyStart - r;
          const down = gyStart + r;
          if (!occupied.has(keyOf(gx, up))) return fromGridCoord(gx, up)[1];
          if (!occupied.has(keyOf(gx, down))) return fromGridCoord(gx, down)[1];
        }
        // fallback: devolver yDeseado sin cambiar (no ideal, pero evita bloqueo infinito)
        return yDeseado;
      }
    
      // --- Reservar las áreas ocupadas por las cajas en el grid (con padding) ---
      const padding = 4; // ajustable
      cajas.forEach(caja => {
        const left = caja.offsetLeft - padding;
        const right = caja.offsetLeft + caja.offsetWidth + padding;
        const top = caja.offsetTop - padding;
        const bottom = caja.offsetTop + caja.offsetHeight + padding;
        occupySegmentGrid(left, top, right, bottom);
      });
    
      const verticalLaneCounters: Map<string, number> = new Map();
    
      cajas.forEach(destino => {
        const requisitos: string[] = llegadas.get(destino.id) || [];
        const totalLlegadas = requisitos.length || 1;
    
        requisitos.forEach(origenId => {
          const origen = document.getElementById(origenId);
          if (!origen) return;
    
          const totalSalidas = salidas.get(origenId)?.length || 1;
          const salidaIndex = salidas.get(origenId)?.indexOf(destino.id) ?? 0;
    
          const xOrigen = origen.offsetLeft + origen.offsetWidth;
          const yOrigen = origen.offsetTop + ((salidaIndex + 1) / (totalSalidas + 1)) * origen.offsetHeight;
          const xDestino = destino.offsetLeft;
    
          // --- distribuir flechas verticalmente (slot dentro de la caja destino) ---
          if (!verticalLaneCounters.has(destino.id)) verticalLaneCounters.set(destino.id, 0);
          const slotIndex = verticalLaneCounters.get(destino.id)!;
          const marginY = 4;
          const heightCaja = destino.offsetHeight - 2 * marginY;
          const stepY = heightCaja / totalLlegadas;
          const yDestino = destino.offsetTop + marginY + stepY * slotIndex + stepY / 2;
          verticalLaneCounters.set(destino.id, slotIndex + 1);
    
          const esActiva = this.conexionesActivas.includes(destino.id) || this.conexionesActivas.includes(origenId);
          const colorLinea = esActiva ? "#0077B6" : "#90E0EF";
          const tipo = esActiva ? "oscura" : "clara";
    
          const colOriIdx = columnas.findIndex(c => origen.closest(".semestre-columna") === c);
          const colDestIdx = columnas.findIndex(c => destino.closest(".semestre-columna") === c);
    
          // --- Caso especial: columnas adyacentes y cajas cercanas (línea recta) ---
          const distanciaX = Math.abs(xDestino - xOrigen);
          const distanciaY = Math.abs(yDestino - yOrigen);
          if (colOriIdx !== colDestIdx && distanciaX < 70 && distanciaY < 25) {
            const capa = esActiva ? capaLineasResaltadas : capaLineas;
            const path = capa.append("path")
              .attr("d", `M ${xOrigen} ${yOrigen} L ${xDestino} ${yDestino}`)
              .attr("fill", "none")
              .attr("stroke", colorLinea)
              .attr("stroke-width", esActiva ? 2 : 1.6)
              .attr("marker-end", `url(#flecha-${tipo}-izquierda)`);
    
            if (esActiva) {
              path.classed("resaltada", true);
              destino.classList.add("resaltada");
              origen.classList.add("resaltada");
              path.raise();
            }
    
            // no ocupamos celdas por la línea: permitimos solapamiento
            return;
          }
    
          // --- calcular canal X base (canales pequeños) ---
          let rawXChannel: number;
          if (colOriIdx < colDestIdx) {
            const gapX = gapCentersX[colOriIdx] ?? (xOrigen + shortRun);
            rawXChannel = Math.min(xOrigen + shortRun, gapX - 8) + salidaIndex * laneSpacingX;
          } else if (colOriIdx > colDestIdx) {
            const gapX = gapCentersX[Math.max(0, colOriIdx - 1)] ?? (xOrigen - shortRun);
            rawXChannel = Math.max(xOrigen - shortRun, gapX + 8) - salidaIndex * laneSpacingX;
          } else {
            rawXChannel = xOrigen + Math.min(shortRun, offsetHorizBase ?? 30) + salidaIndex * laneSpacingX;
          }
    
          // calcular Y candidato y ajustarlo con la grid para no pasar por cajas
          const channelYraw = (function chooseChannelY() {
            const gaps = colGapCentersY[colDestIdx] || [];
            for (let i = 0; i < gaps.length; i++) {
              const g = gaps[i];
              if (g > Math.min(yOrigen, yDestino) + 2 && g < Math.max(yOrigen, yDestino) - 2) return g;
            }
            if (gaps.length > 0) {
              let best = gaps[0];
              let bestDist = Math.abs(best - (yOrigen + yDestino) / 2);
              for (let i = 1; i < gaps.length; i++) {
                const d = Math.abs(gaps[i] - (yOrigen + yDestino) / 2);
                if (d < bestDist) { best = gaps[i]; bestDist = d; }
              }
              return best;
            }
            return yOrigen + (yDestino - yOrigen) * 0.2;
          })();
    
          // Snap al grid (sin ocupar) y forzar Y libre si cae sobre caja
          const [snapX, snapY] = reservarEnGridNoOccupy(rawXChannel, channelYraw);
          const channelYGrid = findFreeY(snapX, snapY);
    
          // Si origen y destino casi comparten Y, forzamos un pequeño quiebre (no recta) salvo caso cercano
          let puntosRuta: [number, number][];
          if (Math.abs(yDestino - yOrigen) < 20 && colOriIdx !== colDestIdx) {
            // comprobar si la recta horizontal entre xOrigen->xDestino cruza alguna caja;
            // si no, se puede usar la ruta directa corta; si sí, forzamos quiebre mínimo.
            const horizontalCrosses = rectIntersectsOccupied(xOrigen, yOrigen - 1, xDestino, yOrigen + 1);
            if (!horizontalCrosses && distanciaX < 90) {
              // usar una ruta corta con pequeño salto al canal
              puntosRuta = [
                [xOrigen, yOrigen],
                [snapX, yOrigen],
                [xDestino - offsetLlegada, yDestino],
                [xDestino, yDestino]
              ];
            } else {
              // forzar pequeño quiebre para que no atraviese cajas
              puntosRuta = [
                [xOrigen, yOrigen],
                [snapX, yOrigen],
                [snapX, channelYGrid - 4],
                [xDestino - offsetLlegada, channelYGrid - 4],
                [xDestino - offsetLlegada, yDestino],
                [xDestino, yDestino]
              ];
            }
          } else {
            puntosRuta = [
              [xOrigen, yOrigen],
              [snapX, yOrigen],
              [snapX, channelYGrid],
              [xDestino - offsetLlegada, channelYGrid],
              [xDestino - offsetLlegada, yDestino],
              [xDestino, yDestino]
            ];
          }
    
          // dibujar la ruta — no marcamos esas celdas como ocupadas para permitir solapamiento
          const capa = esActiva ? capaLineasResaltadas : capaLineas;
          const path = capa.append("path")
            .attr("d", lineGenerator(puntosRuta)!)
            .attr("fill", "none")
            .attr("stroke", colorLinea)
            .attr("stroke-width", esActiva ? 2 : 1.6)
            .attr("marker-end", `url(#flecha-${tipo}-izquierda)`);
    
          if (esActiva) {
            path.classed("resaltada", true);
            destino.classList.add("resaltada");
            origen.classList.add("resaltada");
            path.raise();
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
  
    /*this.materiasSimuladas.forEach(materia => {
      const requisitos: string[] = materia.requisitos ?? [];
      const codigoDestino = String(materia.codigo).padStart(6, "0").trim();
  
      requisitos.forEach(req => {
        const reqCode = String(req).padStart(6, "0").trim();
  
        if (!this.salidasGlobal.has(reqCode)) this.salidasGlobal.set(reqCode, []);
        this.salidasGlobal.get(reqCode)!.push(codigoDestino);
  
        if (!this.llegadasGlobal.has(codigoDestino)) this.llegadasGlobal.set(codigoDestino, []);
        this.llegadasGlobal.get(codigoDestino)!.push(reqCode);
      });
    });*/

    this.requisitosMap.forEach((requisitos: string[], simulada: string) => {
      const codigoDestino = String(simulada).padStart(6, "0").trim();

      requisitos.forEach((requisitoCodigo: string) => {
        const reqCode = String(requisitoCodigo).padStart(6, "0").trim();

        // relación requisito → faltante
        if (!this.salidasGlobal.has(reqCode)) this.salidasGlobal.set(reqCode, []);
        this.salidasGlobal.get(reqCode)!.push(codigoDestino);
  
        if (!this.llegadasGlobal.has(codigoDestino)) this.llegadasGlobal.set(codigoDestino, []);
        this.llegadasGlobal.get(codigoDestino)!.push(reqCode);
      });
    });
  
    //console.log("Llegadas simuladas (una sola vez):", this.llegadasGlobal);
    //console.log("Salidas simuladas (una sola vez):", this.salidasGlobal);
  
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

  ngOnDestroy(): void {
    // Limpiar todas las suscripciones
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.subscriptions = [];
    
    // Limpiar listeners de eventos de DOM
    if (this.listenersAgregados) {
      // Remover listeners, aunque no tenemos referencias específicas, 
      // al menos marcamos que ya no están activos
      this.listenersAgregados = false;
    }
    
    // Limpiar los datos del componente
    this.materiasSimuladas = [];
    this.materiasAgrupadas = [];
    this.requisitosMap.clear();
    this.llegadasGlobal.clear();
    this.salidasGlobal.clear();
  }

  public volverSimulacion(): void {
    this.router.navigate(["/simulaciones/mostrar"]);
  }

  private resetearSeleccion(): void {
    const cajas = document.querySelectorAll('.caja.resaltada');
    cajas.forEach(caja => caja.classList.remove('resaltada'));
  }
}
