import {
  Component,
  AfterViewInit,
  ElementRef,
  ViewChild,
  OnInit,
  HostListener
} from '@angular/core';
import {  NgFor, NgClass } from '@angular/common';
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
  imports: [RouterModule, NgFor, NgClass],
  templateUrl: './pensum-view.html',
  styleUrl: './pensum-view.css',
})
export class PensumView implements OnInit, AfterViewInit {
  progreso!: Progreso;
  materiasCursadasCodigos: Set<string> = new Set();
  materiasCursadas: MateriaDTO[] = [];
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

  esMateriaBloqueada(materia: PensumDTO | MateriaDTO): boolean {
    const codigo = this.getCodigo(materia);
    //  Si ya fue cursada → bloquear SIEMPRE
    if (this.materiasCursadasCodigos.has(codigo)) {
      return true;
    }
    return false;
  } 
    
  // Normaliza todos los códigos al mismo formato 
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

        // La seleccionada es requisito de otra (flecha de salida)
        if (requisitos.includes(codSel)) {
          this.conexionesActivas.push(codMat);
          tieneConexiones = true;
        }

      } catch {}
    });

    // Quitar duplicados y asegurar todo normalizado
    this.conexionesActivas = Array.from(new Set(this.conexionesActivas.map(c => this.norm(c))));

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
    // --- Marcadores de flechas ---
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
  
    // --- calcular pasillos X entre columnas ---
    const columnas = Array.from(contenedor.querySelectorAll<HTMLElement>(".semestre-columna"));
    const gapCentersX: number[] = [];
    for (let i = 0; i < columnas.length - 1; i++) {
      const rightEdge = columnas[i].offsetLeft + columnas[i].offsetWidth;
      const nextLeft = columnas[i + 1].offsetLeft;
      gapCentersX.push(rightEdge + (nextLeft - rightEdge) / 2);
    }
  
    // --- calcular gaps verticales en cada columna ---
    const colGapCentersY: Array<number[]> = columnas.map(col => {
      const cajasEnCol = Array.from(col.querySelectorAll<HTMLElement>(".caja"))
        .sort((a, b) => a.offsetTop - b.offsetTop);
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
  
    cajas.forEach(destino => {
      const requisitos: string[] = llegadas.get(destino.id) || [];
      const totalLlegadas = requisitos.length || 1;
      let llegadaIndex = 0;
  
      requisitos.forEach(origenId => {
        const origen = document.getElementById(origenId) as HTMLElement | null;
        if (!origen) return;
  
        const totalSalidas = salidas.get(origenId)?.length || 1;
        const salidaIndex = salidas.get(origenId)?.indexOf(destino.id) || 0;
  
        // --- coordenadas de salida y entrada ---
        const xOrigen = origen.offsetLeft + origen.offsetWidth;
        const yOrigen =
          origen.offsetTop + ((salidaIndex + 1) / (totalSalidas + 1)) * origen.offsetHeight;
  
        const xDestino = destino.offsetLeft;
        const yDestinoBase =
          destino.offsetTop + ((llegadaIndex + 1) / (totalLlegadas + 1)) * destino.offsetHeight;
  
        // --- offset vertical extra para separar llegadas ---
        const offsetLlegadaY = (llegadaIndex - (totalLlegadas - 1) / 2) * 12;
        const yDestino = yDestinoBase + offsetLlegadaY;

        // offset horizontal: solo afecta la curva antes de llegar, no la punta
        const offsetLlegadaX = (llegadaIndex - (totalLlegadas - 1) / 2) * 12;

        llegadaIndex++;
  
        const esActiva =
          this.conexionesActivas.includes(destino.id) ||
          this.conexionesActivas.includes(origenId);
  
        const colorLinea = esActiva ? "#0077B6" : "#90E0EF";
        const tipo = esActiva ? "oscura" : "clara";
  
        // --- lógica de dos curvas optimizada ---
        const colOriIdx = columnas.findIndex(c => origen.closest(".semestre-columna") === c);
        const colDestIdx = columnas.findIndex(c => destino.closest(".semestre-columna") === c);
  
        // elegir canal X intermedio
        let xChannel: number;
        if (colOriIdx < colDestIdx) {
          xChannel = gapCentersX[colOriIdx] ?? (xOrigen + 40);
        } else if (colOriIdx > colDestIdx) {
          xChannel = gapCentersX[Math.max(0, colOriIdx - 1)] ?? (xOrigen - 40);
        } else {
          xChannel = xOrigen + 40; // misma columna
        }
  
        // offset horizontal para salidas múltiples
        const offsetLinea = (salidaIndex - (totalSalidas - 1) / 2) * 10;
  
        // decidir ruta
        const verticalDist = Math.abs(yDestino - yOrigen);
        let puntosRuta: [number, number][];
  
        if (verticalDist < 40) {
          puntosRuta = [
            [xOrigen, yOrigen],
            [xChannel + offsetLinea, yOrigen],
            [xDestino - 20 + offsetLlegadaX, yDestino], // curva horizontal
            [xDestino, yDestino]                       // flecha entra centrada
          ];
        } else {
          let yGapOrigen = (colGapCentersY[colOriIdx] || []).reduce(
            (best, g) => Math.abs(g - yOrigen) < Math.abs(best - yOrigen) ? g : best,
            (contenedor.clientHeight || 0) / 2
          );
          let yGapDestino = (colGapCentersY[colDestIdx] || []).reduce(
            (best, g) => Math.abs(g - yDestino) < Math.abs(best - yDestino) ? g : best,
            (contenedor.clientHeight || 0) / 2
          );
        
          // aplicar offsets
          yGapOrigen += offsetLinea;
          yGapDestino += offsetLlegadaY;
        
          puntosRuta = [
            [xOrigen, yOrigen],
            [xOrigen + 15, yGapOrigen],
            [xChannel + offsetLinea, yGapOrigen],
            [xChannel + offsetLinea, yGapDestino],
            [xDestino - 20 + offsetLlegadaX, yGapDestino], // curva horizontal
            [xDestino - 20 + offsetLlegadaX, yDestino],
            [xDestino, yDestino]                           // flecha fija en borde
          ];
        }
  
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
  
    const salidasGlobal = new Map<string, string[]>();
    const llegadasGlobal = new Map<string, string[]>();
  
    // Materias faltantes
    this.materiasFaltantes.forEach(grupo => {
      grupo.materias.forEach(faltante => {
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
}