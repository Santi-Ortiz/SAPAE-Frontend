import { Component, OnInit } from '@angular/core';
import { SimulacionService } from '../services/simulacion.service';
import { CommonModule, KeyValuePipe, NgFor, NgIf, ViewportScroller } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Materia } from '../models/materia.model';
import { Router } from '@angular/router';
import * as d3 from 'd3';
import { HistorialService } from '../services/historial.service';

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

  public estadisticasGenerales = {
    promedioMaterias: 0,
    promedioCreditos: 0,
    creditosFaltantes: 0,
    semestreMayorCarga: ''
  };

  constructor(private router: Router, private simulacionService: SimulacionService, private historialService: HistorialService, private viewportScroller: ViewportScroller) { }

  ngOnInit(): void {
    this.viewportScroller.scrollToPosition([0, 0]);
    this.resultadoSimulacion = this.simulacionService.getSimulacion();
    this.creditosFaltantesTotales = this.historialService.getHistorial()?.creditosFaltantes || 0;
    this.calcularEstadisticasGenerales();
    setTimeout(() => {
      this.crearGraficos();
    }, 0);

  }

  public calcularCreditosFaltantesPorSemestre(semestreKey: string): number {
    let totalCursados = 0;
    // Suma los créditos de todos los semestres hasta el actual
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

      // Semestre con mayor carga
      if (sumaCreditos > maxCreditos) {
        maxCreditos = sumaCreditos;
        semestreMayorCarga = key;
      }
    });

    // Créditos faltantes hasta última simulación
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
    'electiva': 'Electiva'
  };

  public obtenerNombre(tipoMateria: string): string {
    return this.mapaNombresTipos[tipoMateria] || tipoMateria;
  }

  crearGraficos(): void {
    if (!this.resultadoSimulacion) return;

    for (const key in this.resultadoSimulacion) {
      if (this.resultadoSimulacion.hasOwnProperty(key)) {
        const semestreData = this.resultadoSimulacion[key];
        // Llama al método de dibujo para cada semestre
        this.dibujarPieChart(semestreData.materias, key);
      }
    }
  }

  private dibujarPieChart(materias: Materia[], semestreKey: string): void {
    // --- PASO 1: Procesar los datos ---
    const conteoPorTipo = materias.reduce((acc, materia) => {
      const tipo = this.obtenerNombre(materia.tipo!);
      acc[tipo] = (acc[tipo] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });

    const dataParaGrafico = Object.entries(conteoPorTipo).map(([key, value]) => {
      return { tipo: key, cantidad: value };
    });

    if (dataParaGrafico.length === 0) return;

    // Calcular el total para los porcentajes
    const totalMaterias = d3.sum(dataParaGrafico, d => d.cantidad);

    // --- PASO 2: Configurar el lienzo (SVG) ---
    const chartId = `#pie-chart-semestre-${semestreKey}`;
    d3.select(`${chartId} svg`).remove(); // Limpiar gráfico anterior

    const width = 700; // Más ancho para dar espacio a la leyenda
    const height = 280;
    const radius = Math.min(height, height) / 2;
    const chartCenterX = radius; // El gráfico se centrará en la mitad izquierda del SVG
    const chartCenterY = height / 2;

    const svg = d3.select(chartId)
      .append('svg')
      .attr('width', width)
      .attr('height', height);

    const chartGroup = svg.append('g')
      .attr('transform', `translate(${chartCenterX}, ${chartCenterY})`);

    // --- PASO 3: Definir colores y arcos ---
    const color = d3.scaleOrdinal<string>()
      .domain(dataParaGrafico.map(d => d.tipo))
      .range(["#0077b6", "#00b4d8", "#90e0ef", "#caf0f8", "#ade8f4"]); // Paleta de azules

    const pie = d3.pie<{ tipo: string, cantidad: number }>()
      .value(d => d.cantidad)
      .sort(null);

    const arc = d3.arc<d3.PieArcDatum<{ tipo: string, cantidad: number }>>()
      .innerRadius(radius * 0.5) // Gráfico de dona
      .outerRadius(radius * 0.9);

    // --- PASO 4: Dibujar las porciones del gráfico ---
    chartGroup.selectAll('path')
      .data(pie(dataParaGrafico))
      .enter()
      .append('path')
      .attr('d', arc)
      .attr('fill', d => color(d.data.tipo))
      .attr('stroke', 'white')
      .style('stroke-width', '3px');

    // --- PASO 5: Añadir etiquetas de porcentaje sobre las porciones ---
    chartGroup.selectAll('text.percentage')
      .data(pie(dataParaGrafico))
      .enter()
      .append('text')
      .attr('class', 'percentage')
      .text(d => {
        let percentage = (d.data.cantidad / totalMaterias);
        return d3.format(".0%")(percentage);
      })
      .attr('transform', d => `translate(${arc.centroid(d)})`)
      .style('text-anchor', 'middle')
      .style('font-size', '15px')
      .style('font-weight', 'bold')
      .style('fill', 'white'); // Color blanco para que contraste con los azules

    // --- PASO 6: Crear la leyenda al lado del gráfico ---
    const legendGroup = svg.append('g')
      .attr('class', 'legend-group')
      .attr('transform', `translate(${radius * 2 + 40}, 40)`); // Posicionar a la derecha

    const legendItems = legendGroup.selectAll('.legend-item')
      .data(dataParaGrafico)
      .enter()
      .append('g')
      .attr('class', 'legend-item')
      .attr('transform', (d, i) => `translate(0, ${i * 30})`); // Espaciado vertical

    // Cuadrado de color para la leyenda
    legendItems.append('rect')
      .attr('width', 20)
      .attr('height', 20)
      .attr('rx', 5) // Bordes redondeados
      .attr('fill', d => color(d.tipo));

    // Texto de la leyenda
    legendItems.append('text')
      .attr('x', 28) // Espacio desde el cuadrado
      .attr('y', 10)
      .attr('dy', '0.35em') // Alineación vertical
      .text(d => `${d.tipo} (${d.cantidad} materias)`)
      .style('font-size', '14px')
      .style('fill', '#333');
  }


  public volverFormSimulacion(): void {
    this.router.navigate(["/simulacion"]);
  }


public visualizarSimulacion(): void {
  // Usar setSimulacion directamente con el resultado completo
  // Esto asegura que se actualicen todos los subjects correctamente
  this.simulacionService.setSimulacion(this.resultadoSimulacion);
  
  // Si ya estamos en la ruta de simulación, forzar la recarga del componente
  const currentUrl = this.router.url;
  if (currentUrl === '/pensum/simulacion') {
    // Navegar a una ruta dummy y luego de vuelta para forzar la reinicialización
    this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
      this.router.navigate(['/pensum/simulacion']);
    });
  } else {
    this.router.navigate(['/pensum/simulacion']);
  }
}

  
}
