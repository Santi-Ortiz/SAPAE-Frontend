import { Component, OnInit } from '@angular/core';
import { SimulacionService } from '../services/simulacion.service';
import { CommonModule, KeyValuePipe, NgFor, NgIf, ViewportScroller } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Materia } from '../models/materia.model';
import { Router } from '@angular/router';
import * as d3 from 'd3';

@Component({
  selector: 'app-simulacion-resultado',
  standalone: true,
  imports: [NgIf, NgFor, KeyValuePipe, FormsModule, CommonModule],
  templateUrl: './simulacion-resultado.html',
  styleUrl: './simulacion-resultado.css'
})
export class SimulacionResultado implements OnInit {

  public resultadoSimulacion: { [semestre: string]: { materias: Materia[] } } = {};

  constructor(private router: Router, private simulacionService: SimulacionService, private viewportScroller: ViewportScroller) { }

  ngOnInit(): void {
    this.viewportScroller.scrollToPosition([0, 0]);
    this.resultadoSimulacion = this.simulacionService.getSimulacion();
    //this.crearDonut();
    //setTimeout(() => this.crearDonut(), 0);
  }

  public calcularResumen(materias: Materia[]): { totalCreditos: number, totalMaterias: number } {
    const totalCreditos = materias.reduce((sum, m) => sum + m.creditos, 0);
    return {
      totalCreditos,
      totalMaterias: materias.length
    };
  }

  crearDonut() {
    const data = [
      { label: 'Créditos cursados', value: 50 },
      { label: 'Créditos en curso', value: 25 },
      { label: 'Créditos faltantes', value: 25 }
    ];

    const total = data.reduce((sum, d) => sum + d.value, 0);

    d3.select('#graficoSVG').selectAll("*").remove();

    const width = 200, height = 300, radius = Math.min(width, height) / 2;

    const color = d3.scaleOrdinal<string>()
      .domain(data.map(d => d.label))
      .range(["#0077B6", "#00b4d8", "#90e0ef"]);

    const svg = d3.select('#graficoSVG')
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${width / 2}, ${height / 2})`);

    const arc = d3.arc<d3.PieArcDatum<typeof data[0]>>()
      .innerRadius(80)
      .outerRadius(radius);

    const pie = d3.pie<typeof data[0]>()
      .value(d => d.value)
      .sort(null);

    // Texto central (total)
    const centerText = svg.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .style("font-size", "28px")
      .style("font-weight", "bold")
      .text(total);

    // Arcos
    const arcs = svg.selectAll('path')
      .data(pie(data))
      .enter()
      .append('path')
      .attr('d', arc as any)
      .attr('fill', d => color(d.data.label))
      .on("mouseover", function (event, d) {
        centerText.text(d.data.value);
      })
      .on("mouseout", function () {
        centerText.text(total);
      });

    // Leyenda
    const leyenda = d3.select("#leyendaGrafico");
    leyenda.selectAll("*").remove(); // Limpia la leyenda

    data.forEach(d => {
      const item = leyenda.append("div").style("display", "flex").style("align-items", "center");
      item.append("div")
        .style("width", "12px")
        .style("height", "12px")
        .style("background-color", color(d.label))
        .style("margin-right", "8px");
      item.append("span").text(d.label);
    });
  }

  public volverFormSimulacion(): void {
    this.router.navigate(["/simulacion"]);
  }
}
