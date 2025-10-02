import { Component, OnInit } from '@angular/core';
import { CommonModule, KeyValuePipe, NgFor, NgIf, ViewportScroller } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import * as d3 from 'd3';

import { SimulacionService } from '../services/simulacion.service';
import { HistorialService } from '../services/historial.service';
import { HistorialSimulacionesService } from '../services/historial-simulaciones.service';
import { Materia } from '../models/materia.model';

@Component({
  selector: 'app-simulacion-resultado',
  standalone: true,
  imports: [NgIf, NgFor, KeyValuePipe, FormsModule, CommonModule],
  templateUrl: './simulacion-resultado.html',
  styleUrl: './simulacion-resultado.css'
})
export class SimulacionResultado implements OnInit {

  public resultadoSimulacion: { [semestre: string]: { materias: Materia[] } } = {};
  public creditosFaltantesTotales:number = 0;
  public nombreSimulacion: string = '';
  public jobIdActual: string | null = null;
  public simulacionGuardada: boolean = false;
  public mostrarModalGuardar: boolean = false;

  public estadisticasGenerales = {
    promedioMaterias: 0,
    promedioCreditos: 0,
    creditosFaltantes: 0,
    semestreMayorCarga: ''
  };

  // === Toast ===
  toast?: { kind: 'success'|'info'|'error', text: string };
  showToast = false;

  constructor(
    private router: Router,
    private simulacionService: SimulacionService,
    private historialService: HistorialService,
    private viewportScroller: ViewportScroller,
    private historialSimulacionesService: HistorialSimulacionesService
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
    this.creditosFaltantesTotales = this.historialService.getHistorial()?.creditosFaltantes || 0;
    this.nombreSimulacion = this.simulacionService.getNombreSimulacionActual() || 'Simulación sin nombre';
    this.jobIdActual = this.simulacionService.getJobIdSimulacionActual();

    // Verificar si la simulación ya está guardada
    if (this.jobIdActual) {
      this.simulacionGuardada = this.historialSimulacionesService.existeSimulacionConJobId(this.jobIdActual);
    } else {
      this.simulacionGuardada = this.historialSimulacionesService.existeSimulacionConNombre(this.nombreSimulacion);
    }

    // === Leer estado de navegación (toast + foco) si venimos del selector ===
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
        totalCursados += this.resultadoSimulacion[key].materias.reduce((sum, m) => sum + m.creditos, 0);
      }
    }
    return Math.max(this.creditosFaltantesTotales - totalCursados, 0);
  }

  public calcularResumen(materias: Materia[]): { totalCreditos: number, totalMaterias: number, horasEstudio: number} {
    const totalCreditos = materias.reduce((sum, m) => sum + m.creditos, 0);
    const horasEstudio = (totalCreditos * 48 / 18 / 5);
    return {
      totalCreditos,
      totalMaterias: materias.length,
      horasEstudio: Number(horasEstudio.toFixed(2))
    };
  }

  calcularEstadisticasGenerales(): void {
    const semestres = Object.values(this.resultadoSimulacion);
    const numSemestres = semestres.length;

    let totalMaterias = 0;
    let totalCreditos = 0;
    let creditosFaltantes = this.creditosFaltantesTotales;
    let semestreMayorCarga = '';
    let maxCreditos = 0;

    Object.entries(this.resultadoSimulacion).forEach(([key, value]) => {
      const materias = value.materias;
      const sumaCreditos = materias.reduce((sum, m) => sum + m.creditos, 0);
      totalMaterias += materias.length;
      totalCreditos += sumaCreditos;

      if (sumaCreditos > maxCreditos) {
        maxCreditos = sumaCreditos;
        semestreMayorCarga = key;
      }
    });

    creditosFaltantes = Math.max(this.creditosFaltantesTotales - totalCreditos, 0);

    this.estadisticasGenerales = {
      promedioMaterias: numSemestres ? Math.round((totalMaterias / numSemestres)) : 0,
      promedioCreditos: numSemestres ? Math.round((totalCreditos / numSemestres)) : 0,
      creditosFaltantes,
      semestreMayorCarga
    };
  }

  public mapaNombresTipos: { [key: string]: string } = {
    'nucleoCienciasBasicas': 'Núcleo de Ciencias Básicas',
    'nucleoIngenieria': 'Núcleo de Ingeniería',
    'nucleoSociohumanisticas': 'Núcleo de Socio-humanísticas',
    'enfasis': 'Énfasis',
    'complementaria': 'Complementaria',
    'electiva': 'Electiva',
    'practicaProfesional': 'Práctica Profesional'
  };

  public obtenerNombre(tipoMateria: string): string {
    return this.mapaNombresTipos[tipoMateria] || tipoMateria;
  }

  crearGraficos(): void {
    if (!this.resultadoSimulacion) return;
    for (const key in this.resultadoSimulacion) {
      if (this.resultadoSimulacion.hasOwnProperty(key)) {
        const semestreData = this.resultadoSimulacion[key];
        this.dibujarPieChart(semestreData.materias, key);
      }
    }
  }

  private dibujarPieChart(materias: Materia[], semestreKey: string): void {
    const conteoPorTipo = materias.reduce((acc, materia) => {
      const tipo = this.obtenerNombre(materia.tipo!);
      acc[tipo] = (acc[tipo] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });

    const dataParaGrafico = Object.entries(conteoPorTipo).map(([key, value]) => {
      return { tipo: key, cantidad: value };
    });

    if (dataParaGrafico.length === 0) return;

    const totalMaterias = d3.sum(dataParaGrafico, d => d.cantidad);

    const chartId = `#pie-chart-semestre-${semestreKey}`;
    d3.select(`${chartId} svg`).remove();

    const width = 700;
    const height = 280;
    const radius = Math.min(height, height) / 2;
    const chartCenterX = radius;
    const chartCenterY = height / 2;

    const svg = d3.select(chartId)
      .append('svg')
      .attr('width', width)
      .attr('height', height);

    const chartGroup = svg.append('g')
      .attr('transform', `translate(${chartCenterX}, ${chartCenterY})`);

    const color = d3.scaleOrdinal<string>()
      .domain(dataParaGrafico.map(d => d.tipo))
      .range(["#0077b6", "#00b4d8", "#90e0ef", "#caf0f8", "#ade8f4"]);

    const pie = d3.pie<{ tipo: string, cantidad: number }>()
      .value(d => d.cantidad)
      .sort(null);

    const arc = d3.arc<d3.PieArcDatum<{ tipo: string, cantidad: number }>>()
      .innerRadius(radius * 0.5)
      .outerRadius(radius * 0.9);

    chartGroup.selectAll('path')
      .data(pie(dataParaGrafico))
      .enter()
      .append('path')
      .attr('d', arc)
      .attr('fill', d => color(d.data.tipo))
      .attr('stroke', 'white')
      .style('stroke-width', '3px');

    chartGroup.selectAll('text.percentage')
      .data(pie(dataParaGrafico))
      .enter()
      .append('text')
      .attr('class', 'percentage')
      .text(d => (d.data.cantidad / totalMaterias * 100).toFixed(0) + '%')
      .attr('transform', d => `translate(${arc.centroid(d)})`)
      .style('text-anchor', 'middle')
      .style('font-size', '15px')
      .style('font-weight', 'bold')
      .style('fill', 'white');

    const legendGroup = svg.append('g')
      .attr('class', 'legend-group')
      .attr('transform', `translate(${radius * 2 + 40}, 40)`);

    const legendItems = legendGroup.selectAll('.legend-item')
      .data(dataParaGrafico)
      .enter()
      .append('g')
      .attr('class', 'legend-item')
      .attr('transform', (_d, i) => `translate(0, ${i * 30})`);

    legendItems.append('rect')
      .attr('width', 20)
      .attr('height', 20)
      .attr('rx', 5)
      .attr('fill', d => color(d.tipo));

    legendItems.append('text')
      .attr('x', 28)
      .attr('y', 10)
      .attr('dy', '0.35em')
      .text(d => `${d.tipo} (${d.cantidad} materias)`)
      .style('font-size', '14px')
      .style('fill', '#333');
  }

  public volverFormSimulacion(): void {
    this.router.navigate(["/simulacion"]);
  }

  public visualizarSimulacion(): void {
    this.simulacionService.setSimulacion(this.resultadoSimulacion);
    const currentUrl = this.router.url;
    if (currentUrl === '/pensum/simulacion') {
      this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
        this.router.navigate(['/pensum/simulacion']);
      });
    } else {
      this.router.navigate(['/pensum/simulacion']);
    }
  }

  public guardarSimulacion(): void {
    const parametrosGuardados = this.simulacionService.getParametrosSimulacionActual();

    const parametrosSimulacion = parametrosGuardados || {
      semestres: Object.keys(this.resultadoSimulacion).length,
      tipoMatricula: 'No especificado',
      creditos: 0,
      materias: 0,
      priorizaciones: []
    };

    this.historialSimulacionesService.guardarSimulacion(
      this.nombreSimulacion,
      this.resultadoSimulacion,
      parametrosSimulacion,
      this.jobIdActual || undefined
    );

    this.simulacionGuardada = true;
    this.mostrarModalGuardar = true;
  }
}
