import { Component, OnInit } from '@angular/core';
import { SimulacionService } from '../services/simulacion.service';
import {
  CommonModule,
  KeyValuePipe,
  NgFor,
  NgIf,
  ViewportScroller,
} from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import * as d3 from 'd3';
import { HistorialService } from '../services/historial.service';
import { HistorialSimulacionesService } from '../services/historial-simulaciones.service';
import { MateriaService } from '../services/materia.service';
import { Simulacion } from '../models/simulacion.model';
import { Proyeccion } from '../models/proyeccion.model';
import { Materia } from '../models/materia.model';

@Component({
  selector: 'app-simulacion-resultado',
  standalone: true,
  imports: [NgIf, NgFor, KeyValuePipe, FormsModule, CommonModule],
  templateUrl: './simulacion-resultado.html',
  styleUrl: './simulacion-resultado.css',
})
export class SimulacionResultado implements OnInit {
  public resultadoSimulacion: { [semestre: string]: Simulacion } = {};
  public creditosFaltantesTotales = 0;
  public nombreSimulacion = '';
  public jobIdActual: string | null = null;
  public simulacionGuardada = false;
  public mostrarModalGuardar = false;

  public estadisticasGenerales = {
    promedioMaterias: 0,
    promedioCreditos: 0,
    creditosFaltantes: 0,
    semestreMayorCarga: '',
  };

  // === Toast ===
  toast?: { kind: 'success'|'info'|'error', text: string };
  showToast = false;

  constructor(
    private router: Router,
    private simulacionService: SimulacionService,
    private historialService: HistorialService,
    private viewportScroller: ViewportScroller,
    private historialSimulacionesService: HistorialSimulacionesService,
    private materiaService: MateriaService
  ) {}

  // Función para ordenar semestres numéricamente
  orderByNumericSemestre = (a: any, b: any) => {
    const numA = parseInt(a.key, 10);
    const numB = parseInt(b.key, 10);
    return numA - numB;
  }

  ngOnInit(): void {
    this.viewportScroller.scrollToPosition([0, 0]);

    // Traer el estado actual desde el servicio (si volviste del selector, ya viene actualizado)
    this.resultadoSimulacion = this.simulacionService.getSimulacion();

    console.log("ResultadoSimulacion:", this.resultadoSimulacion);

    for (const key in this.resultadoSimulacion) {
      const semestreData = this.resultadoSimulacion[key];

      // Guardamos una copia de las materias con solo ID
      const materiasIds = semestreData.materiasAsociadas;

      // Reiniciamos el arreglo pero lo vamos llenando con los objetos completos
      semestreData.materiasAsociadas = [];

      materiasIds.forEach((m: any) => {
        this.materiaService.getMateriaById(m.id).subscribe((materia: any) => {
          semestreData.materiasAsociadas.push(materia);

          console.log(
            `Materia cargada para semestre ${semestreData.semestre}:`,
            materia
          );
        });
      });

      console.log("Semestre", key, "->", semestreData);
    }

    this.creditosFaltantesTotales =
      this.historialService.getHistorial()?.creditosFaltantes || 0;
    this.nombreSimulacion =
      this.simulacionService.getNombreSimulacionActual() ||
      "Simulación sin nombre";
    this.jobIdActual = this.simulacionService.getJobIdSimulacionActual();

    
    this.historialSimulacionesService
        .existeProyeccionConNombre(this.nombreSimulacion)
        .subscribe((existe: boolean) => {
          this.simulacionGuardada = existe;
      });
    
    this.calcularEstadisticasGenerales();
    setTimeout(() => this.crearGraficos(), 0);
  }


  obtenerMaterias(value: any): Materia[] {
    if (!value) return [];
    if (Array.isArray(value.materias)) return value.materias;
    if (Array.isArray(value.materiasAsociadas)) {
      return value.materiasAsociadas.map((sm: any) => sm.materia).filter(Boolean);
    }

    const nav = this.router.getCurrentNavigation();
    const st = (nav?.extras?.state as any) || null;
    if (st?.toast) {
      this.toast = st.toast;
      this.showToast = true;
      setTimeout(() => this.showToast = false, 3000);
    }
    if (st?.focus?.sem != null) {
      setTimeout(() => {
        const el = document.getElementById('sem-' + String(st.focus.sem));
        el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 0);
    }

    this.calcularEstadisticasGenerales();
    setTimeout(() => this.crearGraficos(), 0);

    return [];
  }

  /* ======= Enlace hacia el módulo de recomendaciones (selector) ======= */

  public esReemplazable(materia: Materia): boolean {
    const t = (materia?.tipo || '').toLowerCase();
    return t === 'electiva' || t === 'enfasis' || t === 'complementaria';
  }

  private mapTipoToQuery(tipoMateria: string): 'electivas' | 'énfasis' | 'complementarias' {
    const t = (tipoMateria || '').toLowerCase();
    if (t === 'electiva') return 'electivas';
    if (t === 'enfasis' || t === 'énfasis') return 'énfasis';
    return 'complementarias';
  }

  public irARecomendaciones(materia: Materia, semestreKey: string, index: number): void {
    const tipoQuery = this.mapTipoToQuery(materia.tipo || '');
    // Enviamos al componente selector (el que muestra el botón "Seleccionar")
    this.router.navigate(
      ['/recomendar-seleccion'],
      {
        queryParams: {
          tipo: tipoQuery,
          semestre: Number(semestreKey),
          index
        }
      }
    );
  }

  /* ======= Utilidades ya existentes ======= */

  public calcularCreditosFaltantesPorSemestre(semestreKey: string): number {
    let totalCursados = 0;
    for (const key in this.resultadoSimulacion) {
      if (parseInt(key) <= parseInt(semestreKey)) {
        const materias = this.obtenerMaterias(this.resultadoSimulacion[key]);
        totalCursados += materias.reduce((sum, m) => sum + (m?.creditos ?? 0), 0);
      }
    }
    return Math.max(this.creditosFaltantesTotales - totalCursados, 0);
  }

  public calcularResumen(value: any) {
    if (!value) {
      return {
        totalCreditos: 0,
        totalMaterias: 0,
        horasEstudio: 0,
      };
    }

    const materias: Materia[] =
      value.materias ??
      (value.materiasAsociadas?.map((sm: any) => sm.materia) ?? []);

    const totalCreditos = materias.reduce((sum, m) => sum + (m?.creditos ?? 0), 0);
    const horasEstudio = (totalCreditos * 48) / 18 / 5;

    return {
      totalCreditos,
      totalMaterias: materias.length,
      horasEstudio: Number(horasEstudio.toFixed(2)),
    };
  }

  calcularEstadisticasGenerales(): void {
    const semestres = Object.values(this.resultadoSimulacion);
    const numSemestres = semestres.length;

    let totalMaterias = 0;
    let totalCreditos = 0;
    let semestreMayorCarga = '';
    let maxCreditos = 0;

    Object.entries(this.resultadoSimulacion).forEach(([key, value]) => {
      const materias = this.obtenerMaterias(value);
      const sumaCreditos = materias.reduce((sum, m) => sum + (m?.creditos ?? 0), 0);
      totalMaterias += materias.length;
      totalCreditos += sumaCreditos;

      if (sumaCreditos > maxCreditos) {
        maxCreditos = sumaCreditos;
        semestreMayorCarga = key;
      }
    });

    const creditosFaltantes = Math.max(
      this.creditosFaltantesTotales - totalCreditos,
      0
    );

    this.estadisticasGenerales = {
      promedioMaterias: numSemestres ? Math.round(totalMaterias / numSemestres) : 0,
      promedioCreditos: numSemestres ? Math.round(totalCreditos / numSemestres) : 0,
      creditosFaltantes,
      semestreMayorCarga,
    };
  }

  public mapaNombresTipos: { [key: string]: string } = {
    nucleoCienciasBasicas: 'Núcleo de Ciencias Básicas',
    nucleoIngenieria: 'Núcleo de Ingeniería',
    nucleoSociohumanisticas: 'Núcleo de Socio-humanísticas',
    enfasis: 'Énfasis',
    complementaria: 'Complementaria',
    electiva: 'Electiva',
    practicaProfesional: 'Práctica Profesional',
  };

  public obtenerNombre(tipoMateria: string): string {
    return this.mapaNombresTipos[tipoMateria] || tipoMateria;
  }

  crearGraficos(): void {
    if (!this.resultadoSimulacion) return;
    for (const key in this.resultadoSimulacion) {
      if (this.resultadoSimulacion.hasOwnProperty(key)) {
        const materias = this.obtenerMaterias(this.resultadoSimulacion[key]);
        this.dibujarPieChart(materias, key);
      }
    }
  }

  private dibujarPieChart(materias: Materia[], semestreKey: string): void {
    const conteoPorTipo = materias.reduce((acc, materia) => {
      const tipo = this.obtenerNombre(materia.tipo!);
      acc[tipo] = (acc[tipo] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const dataParaGrafico = Object.entries(conteoPorTipo).map(
      ([tipo, cantidad]) => ({ tipo, cantidad })
    );
    if (dataParaGrafico.length === 0) return;

    const totalMaterias = d3.sum(dataParaGrafico, (d) => d.cantidad);
    const chartId = `#pie-chart-semestre-${semestreKey}`;
    const width = 300,
      height = 300,
      radius = Math.min(width, height) / 2;

    d3.select(chartId).selectAll('*').remove();
    const svg = d3
      .select(chartId)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr(
        'transform',
        'translate(' + width / 2 + ',' + height / 2 + ')'
      );

    const pie = d3
      .pie<any>()
      .value((d: any) => d.cantidad)
      .sort(null);

    const arc = d3.arc<any>().innerRadius(0).outerRadius(radius);
    const color = d3.scaleOrdinal(d3.schemeCategory10);

    const g = svg
      .selectAll('.arc')
      .data(pie(dataParaGrafico))
      .enter()
      .append('g')
      .attr('class', 'arc');

    g.append('path')
      .attr('d', arc)
      .style('fill', (d: any) => color(d.data.tipo));

    g.append('title').text(
      (d: any) =>
        `${d.data.tipo}: ${d.data.cantidad} (${(
          (d.data.cantidad / totalMaterias) *
          100
        ).toFixed(1)}%)`
    );
  }

  regresar(): void {
    this.router.navigate(['/simulacion-parametros']);
  }

  mostrarGuardar(): void {
    this.mostrarModalGuardar = true;
  }

  cancelarGuardar(): void {
    this.mostrarModalGuardar = false;
  }

  public visualizarSimulacion(): void { 
    this.simulacionService.setSimulacion(this.resultadoSimulacion); 
    const currentUrl = this.router.url; 
    if (currentUrl === '/pensum/simulacion') { 
      this.router.navigateByUrl('/', { skipLocationChange: true })
      .then(() => { this.router.navigate(['/pensum/simulacion']); }); 
    } else { this.router.navigate(['/pensum/simulacion']); } 
  }

  public guardarSimulacion(): void {
    const parametrosGuardados = this.simulacionService.getParametrosSimulacionActual();

    const parametrosSimulacion = parametrosGuardados || {
      semestres: Object.keys(this.resultadoSimulacion).length,
      tipoMatricula: 'No especificado',
      creditos: 0,
      materias: 0,
      priorizaciones: [],
      practicaProfesional: false
    };

    this.historialSimulacionesService.guardarProyeccion(parametrosSimulacion).subscribe({
      next: () => {
        console.log("Proyección guardada correctamente");
        this.simulacionGuardada = true;
        this.mostrarModalGuardar = false;
        this.router.navigate(['/historial-simulaciones']);
      },
      error: (err) => console.error("Error guardando proyección en BD", err)
    });
  }

  public volverFormSimulacion(): void {
    this.router.navigate(["/simulaciones"]);
  }

}
