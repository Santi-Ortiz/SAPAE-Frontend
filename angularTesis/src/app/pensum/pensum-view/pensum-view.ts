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
      if (match && m.cred > 0) {
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

        // Caso 1: la seleccionada es requisito de otra (flecha de salida)
        if (requisitos.includes(codSel)) {
          this.conexionesActivas.push(codMat);
          tieneConexiones = true;
        }

        // Caso 2: otra es requisito de la seleccionada (flechas de entrada)
        if (codMat === codSel && requisitos.length) {
          this.conexionesActivas.push(...requisitos);
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

      if (!tieneConexiones) {
        const rect = origenBox.getBoundingClientRect();
        const contRect = this.contenedorRef?.nativeElement.getBoundingClientRect();
        this.mensajeX = rect.right - (contRect?.left || 0) + 10;
        this.mensajeY = rect.top - (contRect?.top || 0);
        this.mensajeSinRequisitos = 'Esta materia no tiene conexiones.';
        this.mostrarMensaje = true;
        setTimeout(() => (this.mostrarMensaje = false), 3000);
      } else {
        this.mostrarMensaje = false;
      }
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
  
    const salidasGlobal = new Map<string, string[]>();
    const llegadasGlobal = new Map<string, string[]>();
  
    const semestreActual = this.progreso?.semestre ?? 0;
    const materias = this.progreso?.materias;
  
    // Agrupamos materias cursadas
    const materiasPorSemestre = this.agruparPorSemestre(materias);
  
    // Obtenemos las cursadas del último semestre
    const materiasUltimoSemestre =
    materiasPorSemestre.find(g => g.semestre === semestreActual)?.materias || [];
  
    // Set para búsqueda rápida
    const codigosUltimoSemestre = new Set(
      materiasUltimoSemestre.map(m => String(this.getCodigo(m)).padStart(6, "0").trim())
    );
  
    // También armamos un Set con TODOS los códigos faltantes
    const codigosFaltantes = new Set<string>();
    this.materiasFaltantes.forEach(grupo =>
      grupo.materias.forEach(f => {
        codigosFaltantes.add(String(this.getCodigo(f)).padStart(6, "0").trim());
      })
    );
  
    // Recorrer faltantes
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
  
          // Caso 1: requisito está en el último semestre cursado
          if (codigosUltimoSemestre.has(reqCode)) {
            if (!salidasGlobal.has(reqCode)) salidasGlobal.set(reqCode, []);
            salidasGlobal.get(reqCode)!.push(codigoFaltante);
  
            if (!llegadasGlobal.has(codigoFaltante)) llegadasGlobal.set(codigoFaltante, []);
            llegadasGlobal.get(codigoFaltante)!.push(reqCode);
          }
  
          // Caso 2: requisito también es otra materia faltante
          if (codigosFaltantes.has(reqCode)) {
            if (!salidasGlobal.has(reqCode)) salidasGlobal.set(reqCode, []);
            salidasGlobal.get(reqCode)!.push(codigoFaltante);
  
            if (!llegadasGlobal.has(codigoFaltante)) llegadasGlobal.set(codigoFaltante, []);
            llegadasGlobal.get(codigoFaltante)!.push(reqCode);
          }
        });
      });
    });
  
    console.log("Llegadas:", llegadasGlobal);
    console.log("Salidas:", salidasGlobal);
    const cajas = Array.from(document.querySelectorAll<HTMLElement>('.caja'));
  
    // Dibujar todas las curvas
    this.dibujarCurvas(d3svg, cajas, salidasGlobal, llegadasGlobal, contenedor);
    // Recalcular al hacer scroll o resize
    window.addEventListener("scroll", () => this.dibujarCurvas(d3svg, cajas, salidasGlobal, llegadasGlobal, contenedor));
    window.addEventListener("resize", () => this.dibujarCurvas(d3svg, cajas, salidasGlobal, llegadasGlobal, contenedor));

  }    
}