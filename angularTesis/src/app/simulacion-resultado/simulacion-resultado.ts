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
import { Materia } from '../models/materia.model';
import { Router } from '@angular/router';
import * as d3 from 'd3';
import { HistorialService } from '../services/historial.service';
import { HistorialSimulacionesService } from '../services/historial-simulaciones.service';
import { MateriaService } from '../services/materia.service';
import { Simulacion } from '../models/simulacion.model';

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

  constructor(
    private router: Router,
    private simulacionService: SimulacionService,
    private historialService: HistorialService,
    private viewportScroller: ViewportScroller,
    private historialSimulacionesService: HistorialSimulacionesService,
    private materiaService: MateriaService
  ) {}

  ngOnInit(): void {
    this.viewportScroller.scrollToPosition([0, 0]);
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

    if (this.jobIdActual) {
      this.historialSimulacionesService
        .existeSimulacionConJobId(this.jobIdActual)
        .subscribe((existe: boolean) => {
          this.simulacionGuardada = existe;
        });
    } else {
      this.historialSimulacionesService
        .existeSimulacionConNombre(this.nombreSimulacion)
        .subscribe((existe: boolean) => {
          this.simulacionGuardada = existe;
        });
    }
    
    this.calcularEstadisticasGenerales();
    setTimeout(() => this.crearGraficos(), 0);
  }


  obtenerMaterias(value: any): Materia[] {
    if (!value) return [];
    if (Array.isArray(value.materias)) return value.materias;
    if (Array.isArray(value.materiasAsociadas)) {
      return value.materiasAsociadas.map((sm: any) => sm.materia).filter(Boolean);
    }
    return [];
  }

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
    for (const key in this.resultadoSimulacion) {
      const materias = this.obtenerMaterias(this.resultadoSimulacion[key]);
      this.dibujarPieChart(materias, key);
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

  public volverFormSimulacion(): void { 
    this.router.navigate(["/simulaciones"]); 
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
    ).subscribe({
      next: () => {
        this.simulacionGuardada = true; 
        this.mostrarModalGuardar = true;
        console.log("Simulación guardada en la BD");
      },
      error: (err) => {
        console.error("Error guardando simulación en BD", err);
      }
    });
  }

}
