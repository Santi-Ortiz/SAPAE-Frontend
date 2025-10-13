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
type PensumItem = PensumDTO & { cssClass?: string, dataEtiqueta?: string; };
type MateriaItem = MateriaDTO & { cssClass?: string };

@Component({
  selector: 'app-pensum-view',
  standalone: true,
  imports: [RouterModule, NgFor, NgIf, NgClass],
  templateUrl: './pensum-view.html',
  styleUrl: './pensum-view.css',
})
export class PensumView implements OnInit, AfterViewInit {
  progreso!: Progreso;
  materiasCursadasCodigos: Set<string> = new Set();
  materiasCursadas: MateriaDTO[] = [];
  materiasFaltantes: { semestre: number; materias: PensumItem[] }[] = [];
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
  vistaHistorico: boolean = true;


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
    console.log("Progreso:", this.progreso);
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
        if (this.vistaHistorico) {
          this.materiasFaltantes = this.agruparMateriasFaltantes(this.progreso, this.allPensum);
        } else {
          const pensumReemplazado = this.reemplazarGenericas(this.allPensum, this.progreso);
          this.materiasFaltantes = this.agruparPorSemestrePensum(pensumReemplazado, this.progreso);
        }        
        this.cdr.detectChanges();
        this.zone.onStable.pipe(take(1)).subscribe(() => this.dibujarConexiones());
      }
      this.resetearSeleccion();

    });
  }

  getCodigo(m: PensumDTO | MateriaDTO): string {
    return (m as any).codigo ?? (m as any).curso;
  }

  private normCodigo(c: any): string {
    const s = String(c ?? '').trim();
    return /^\d+$/.test(s) ? s.padStart(6, '0') : s;
  }  

  getRequisitosJson(codigoDestino: string): string {
    const req = this.requisitosMap.get(String(codigoDestino)) || [];
    return JSON.stringify(req);
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
  
        // normalizar créditos
        const cred = parseFloat((m.cred ?? "0").toString().replace(",", "."));
  
        // normalizar calificación
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

  agruparPorSemestrePensum(
    pensum: PensumDTO[],
    progreso: Progreso
  ): { semestre: number; materias: PensumItem[] }[] {
    const semestreMap = new Map<number, PensumItem[]>();
  
    // Normalizar todos los códigos del progreso
    const todas = (progreso?.materias ?? []).map(m => ({
      codigo: this.normCodigo(m.curso),
      calif: m.calif
    }));
  
    const cursandoSet = new Set(
      todas.filter(m => m.calif === 'SIN CALIFICACIÓN').map(m => m.codigo)
    );
    const cursadasSet = new Set(
      todas.filter(m => m.calif !== 'SIN CALIFICACIÓN').map(m => m.codigo)
    );
  
    // 🧮 Contar cuántas veces se cursó cada materia
    const contadorRepeticiones = new Map<string, number>();
    for (const m of todas) {
      const codigo = m.codigo;
      contadorRepeticiones.set(codigo, (contadorRepeticiones.get(codigo) || 0) + 1);
    }
  
    pensum.forEach(m => {
      if (!semestreMap.has(m.semestre)) semestreMap.set(m.semestre, []);
  
      let clase = "faltante";
      const codigoNorm = this.normCodigo(m.codigo);
      let etiqueta = "";
  
      if (cursandoSet.has(codigoNorm)) {
        clase = "actual";
      } else if (cursadasSet.has(codigoNorm)) {
        const materiaHist = (progreso?.materias ?? []).find(
          x => this.normCodigo(x.curso) === codigoNorm
        );
        const califNum = Number(materiaHist?.calif);
        const vecesVista = contadorRepeticiones.get(codigoNorm) ?? 1;
  
        if (vecesVista > 1) {
          clase = "repetida";
          etiqueta = `Vista ${vecesVista} veces`;
        } else if (!isNaN(califNum) && califNum < 3) {
          clase = "repetida";
          etiqueta = "Repetida";
        } else {
          clase = "bloqueada";
        }
      }
  
      // ✅ Guardamos la etiqueta como un atributo data-* para el HTML
      const item: PensumItem = { ...m, cssClass: clase };
      (item as any).dataEtiqueta = etiqueta;
  
      semestreMap.get(m.semestre)!.push(item);
    });
  
    // 🔗 Asegurar que las relaciones (requisitos) sigan mostrándose
    // Si tienes un método que dibuja las líneas, aquí se conserva la estructura base.
    // (Generalmente el dibujo ocurre después en la vista, no en este método)
  
    return Array.from(semestreMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([semestre, materias]) => ({
        semestre,
        materias: materias.map(m => ({
          ...m,
          requisitos: m.requisitos ?? [] // 👈 mantiene los requisitos del pensum
        }))
      }));
  }
  
  
  
   
  agruparMateriasFaltantes(progreso: any,pensum: PensumDTO[]): { semestre: number; materias: PensumItem[] }[] {
    if (!progreso || !pensum || pensum.length === 0) return [];
  
    const semestreActual: number = progreso.semestre ?? 0;
    const proximoSemestre = semestreActual + 1;
  
    // Conjunto de códigos ya cursados (en tu código usas m.curso como código)
    const materiasCursadasCodigos = new Set<string>(
      (progreso.materias ?? []).map((m: any) => String(m.curso))
    );
  
    const agrupadoPorSemestre = new Map<number, PensumItem[]>();
    const addedCodes = new Set<string>();
  
    // Normalizar string para comparar sin case y sin acentos si quieres (aquí solo lowercase)
    const normalize = (s?: string) => (s || "").toLowerCase().trim();
  
    // Construir lista de pensum items faltantes
    const faltantesPensumItems: PensumDTO[] = [];
  
    if (progreso.listaMateriasFaltantes && progreso.listaMateriasFaltantes.length > 0) {
      // Si el progreso trae una lista explícita de faltantes intentamos mapearla al pensum
      for (const lf of progreso.listaMateriasFaltantes) {
        // lf puede ser string o objeto { nombre: ... } según tu implementación
        const textoLF: string = typeof lf === "string" ? lf : (lf.nombre ?? lf.codigo ?? "");
        const textoNorm = normalize(textoLF);
  
        // Buscar por codigo exacto primero, luego por nombre exacto, luego por contains
        let match = pensum.find(p => String(p.codigo) === textoLF || normalize(p.codigo) === textoNorm);
        if (!match) {
          match = pensum.find(p => normalize(p.nombre) === textoNorm);
        }
        if (!match) {
          match = pensum.find(p => normalize(p.nombre).includes(textoNorm));
        }
  
        if (match && !addedCodes.has(String(match.codigo))) {
          faltantesPensumItems.push(match);
          addedCodes.add(String(match.codigo));
        }
      }
    } else {
      // Tomar todas las del pensum que no están cursadas
      for (const p of pensum) {
        if (!materiasCursadasCodigos.has(String(p.codigo)) && !addedCodes.has(String(p.codigo))) {
          faltantesPensumItems.push(p);
          addedCodes.add(String(p.codigo));
        }
      }
    }
  
    // Asignar cada materia faltante a su semestre destino:
    // - si pensum.semestre > semestreActual => target = pensum.semestre
    // - si pensum.semestre <= semestreActual => target = semestreActual + 1 
    for (const p of faltantesPensumItems) {
      const semOriginal = Number(p.semestre ?? proximoSemestre);
      const semestreDestino = semOriginal > semestreActual ? semOriginal : proximoSemestre;
  
      if (!agrupadoPorSemestre.has(semestreDestino)) {
        agrupadoPorSemestre.set(semestreDestino, []);
      }
  
      const item: PensumItem = { ...(p as PensumDTO), cssClass: "faltante" };
      agrupadoPorSemestre.get(semestreDestino)!.push(item);
    }
  
    // Ordenar semestres ascendente y devolver en el formato esperado
    return Array.from(agrupadoPorSemestre.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([semestre, materias]) => ({ semestre, materias }));
  }
  
  
  private reemplazarGenericas(pensum: PensumDTO[], progreso: Progreso): PensumDTO[] {
    const electivas = progreso.cursosElectivas ?? [];
    const complementarias = [
      ...(progreso.cursosComplementariaLenguas ?? []),
      ...(progreso.cursosComplementariaInformacion ?? [])
    ];
    const enfasis = progreso.cursosEnfasis ?? [];
    const basicas = progreso.cursosElectivaBasicas ?? [];
  
    let idxElectiva = 0, idxCompl = 0, idxEnfasis = 0, idxBasica = 0;
  
    const normalizarCred = (valor: any): number => {
      if (valor == null) return 0;
      const num = parseFloat(String(valor).replace(',', '.'));
      return isNaN(num) ? 0 : num;
    };
  
    return pensum.map(m => {
      const nombreNorm = (m.nombre ?? '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  
      if (nombreNorm.includes("basicas") && basicas[idxBasica]) {
        const real = basicas[idxBasica++];
        return new PensumDTO(String(real.curso), real.titulo, normalizarCred(real.cred ?? real.cred), m.semestre, "[]", []);
      }
      if (nombreNorm.includes("electiva") && electivas[idxElectiva]) {
        const real = electivas[idxElectiva++];
        return new PensumDTO(String(real.curso), real.titulo, normalizarCred(real.cred ?? real.cred), m.semestre, "[]", []);
      }
      if (nombreNorm.includes("complementaria") && complementarias[idxCompl]) {
        const real = complementarias[idxCompl++];
        return new PensumDTO(String(real.curso), real.titulo, normalizarCred(real.cred ?? real.cred), m.semestre, "[]", []);
      }
      if ((nombreNorm.includes("énfasis") || nombreNorm.includes("enfasis")) && enfasis[idxEnfasis]) {
        const real = enfasis[idxEnfasis++];
        return new PensumDTO(String(real.curso), real.titulo, normalizarCred(real.cred ?? real.cred), m.semestre, "[]", []);
      }
      return m; // no era genérica → devolver igual
    });
  }

  esMateriaBloqueada(materia: PensumDTO | MateriaDTO): boolean {
    const codigo = this.getCodigo(materia);
    //  Si ya fue cursada → bloquear SIEMPRE
    if (this.materiasCursadasCodigos.has(codigo)) {
      return true;
    }
    return false;
  }

  seleccionarMateria(codigo: string) {
    console.log(`MATERIA SELECCIONADA: ${codigo}`);
    const codSel = this.normCodigo(codigo);

    if (this.materiasCursadasCodigos.has(codSel)) return;

    this.conexionesActivas = [codSel];
    let tieneConexiones = false;

    this.allPensum.forEach(materia => {
      try {
        const codMat = this.normCodigo(materia.codigo);
        const parsed = JSON.parse(materia.requisitosJson || '[]');
        const requisitos: string[] = (Array.isArray(parsed) ? parsed : [])
          .map(r => this.normCodigo(r));

        /* La seleccionada es requisito de otra (flecha de salida)
        if (requisitos.includes(codSel)) {
          this.conexionesActivas.push(codMat);
          tieneConexiones = true;
        }*/

      } catch { }
    });

    // Quitar duplicados y asegurar todo normalizado
    this.conexionesActivas = Array.from(new Set(this.conexionesActivas.map(c => this.normCodigo(c))));

    // Quitar resaltados previos
    document.querySelectorAll('.caja').forEach(c => c.classList.remove('resaltada'));

    // Resaltar origen con el MISMO id del HTML
    const origenBox = document.getElementById(codSel);
    if (origenBox) {
      origenBox.classList.add('resaltada');
    }

    this.dibujarConexiones();
  }


  ngAfterViewInit() {
    // Inicializar el estado del toggle (por defecto: "Según plan de estudios")
    this.inicializarEstadoToggle();

    this.zone.onStable.subscribe(() => {
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
  
        // --- Caso especial: columnas adyacentes y cajas cercanas (dos giros, no diagonal) ---
        const distanciaX = Math.abs(xDestino - xOrigen);
        const distanciaY = Math.abs(yDestino - yOrigen);

        if (colOriIdx !== colDestIdx && distanciaX < 70 && distanciaY < 25) {
          const capa = esActiva ? capaLineasResaltadas : capaLineas;

          // Elegimos un canal intermedio X donde realizar la transición vertical.
          // Preferimos el gapCentersX entre las columnas si existe; si no, usamos el punto medio.
          const preferredGap = gapCentersX[colOriIdx] ?? gapCentersX[Math.max(0, colOriIdx - 1)] ?? (xOrigen + xDestino) / 2;
          // Aseguramos que el canal no esté dentro de las cajas (margen)
          const canalX = Math.max(Math.min(preferredGap, Math.max(xOrigen, xDestino) - 8), Math.min(xOrigen, xDestino) + 8);

          // Puntos: salir horizontal del origen hasta canalX, ir vertical al nivel del destino, y entrar horizontal al destino.
          const xEntradaDestino = xDestino - offsetLlegada; // punto justo antes de entrar a la caja destino

          // Usamos comandos SVG M, L para mantener líneas rectas en ángulo recto.
          const d = [
            `M ${xOrigen} ${yOrigen}`,        // inicio un pelín dentro del borde derecho del origen
            `L ${canalX} ${yOrigen}`,              // horizontal hasta el canal
            `L ${canalX} ${yDestino}`,             // vertical en el canal hasta la altura de la entrada destino
            `L ${xEntradaDestino} ${yDestino}`,    // horizontal hasta justo antes del destino
            `L ${xDestino} ${yDestino}`            // entrada final al centro/destino (opcional)
          ].join(" ");

          const path = capa.append("path")
            .attr("d", d)
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

    const salidasGlobal = new Map<string, string[]>();
    const llegadasGlobal = new Map<string, string[]>();

    // Materias faltantes
    this.materiasFaltantes.forEach(grupo => {
      grupo.materias.forEach(faltante => {
        if (faltante.cssClass !== "faltante") return; // solo faltantes
        let requisitos: string[] = [];

        if ((faltante as PensumDTO).requisitos) {
          requisitos = (faltante as PensumDTO).requisitos;
        } else if ((faltante as any).requisitosJson) {
          try {
            requisitos = JSON.parse((faltante as any).requisitosJson);
          } catch {
            requisitos = [];
          }
        }

        const codigoFaltante = String(this.getCodigo(faltante)).padStart(6, "0").trim();

        requisitos.forEach(requisitoCodigo => {
          const reqCode = String(requisitoCodigo).padStart(6, "0").trim();

          // conexión requisito → faltante
          if (!salidasGlobal.has(reqCode)) salidasGlobal.set(reqCode, []);
          salidasGlobal.get(reqCode)!.push(codigoFaltante);

          if (!llegadasGlobal.has(codigoFaltante)) llegadasGlobal.set(codigoFaltante, []);
          llegadasGlobal.get(codigoFaltante)!.push(reqCode);
        });
      });
    });

    console.log("Llegadas:", llegadasGlobal);
    console.log("Salidas:", salidasGlobal);

    const cajas = Array.from(document.querySelectorAll<HTMLElement>('.caja'));

    // Dibujar todas las curvas
    this.dibujarCurvas(d3svg, cajas, salidasGlobal, llegadasGlobal, contenedor);

    // Recalcular al hacer scroll o resize
    window.addEventListener("scroll", () =>
      this.dibujarCurvas(d3svg, cajas, salidasGlobal, llegadasGlobal, contenedor)
    );
    window.addEventListener("resize", () =>
      this.dibujarCurvas(d3svg, cajas, salidasGlobal, llegadasGlobal, contenedor)
    );
  }

  /**
   * Inicializar el estado visual del toggle
   */
  inicializarEstadoToggle(): void {
    const historicoLabel = document.getElementById('historico-label');
    historicoLabel?.classList.add('active');
  }

  /**
   * Método para cambiar entre vista histórica y vista por plan de estudios
   */
  cambiarVista(): void {
    this.vistaHistorico = !this.vistaHistorico;
  
    if (this.vistaHistorico) {
      // histórico → agrupamos solo las materias cursadas/faltantes
      this.materiasFaltantes = this.agruparMateriasFaltantes(this.progreso, this.allPensum);
    } else {
      // plan de estudios completo → con reemplazo de genéricas
      const pensumReemplazado = this.reemplazarGenericas(this.allPensum, this.progreso);
      this.materiasFaltantes = this.agruparPorSemestrePensum(pensumReemplazado, this.progreso);
    }
  
    const historicoLabel = document.getElementById('historico-label');
    const planLabel = document.getElementById('plan-label');
  
    if (this.vistaHistorico) {
      historicoLabel?.classList.add('active');
      planLabel?.classList.remove('active');
    } else {
      historicoLabel?.classList.remove('active');
      planLabel?.classList.add('active');
    }

    this.resetearSeleccion();
  
    console.log(`Vista cambiada a: ${this.vistaHistorico ? 'Tu histórico' : 'Según plan de estudios'}`);
  }

  private resetearSeleccion(): void {
    const cajas = document.querySelectorAll('.caja.resaltada');
    cajas.forEach(caja => caja.classList.remove('resaltada'));
  }
  
  
  
}