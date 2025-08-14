import { Component, AfterViewInit, OnInit } from '@angular/core';
import { Progreso } from '../models/progreso.model';
import { RouterModule } from '@angular/router';
import { NgIf, NgFor, NgClass, } from '@angular/common';
import * as d3 from 'd3';
import { HistorialService } from '../services/historial.service';

@Component({
  selector: 'app-historial',
  standalone: true,
  imports: [RouterModule, NgIf, NgFor, NgClass,],
  templateUrl: './historial.html',
  styleUrl: './historial.css'
})
export class Historial implements OnInit, AfterViewInit {
  public historial: Progreso = new Progreso();
  public tablasExtra: { titulo: string; lista: any[] }[] = [];
  constructor(private historialService: HistorialService) { };
  mostrarTodasMaterias = false;

  ngOnInit() {
    const data = this.historialService.getHistorial();
    console.log('Datos recibidos del backend:', data);
    if (data) {
      this.historial = data;
      this.tablasExtra = [
        { titulo: 'Electivas Universidad', lista: this.historial.cursosElectivas },
        { titulo: 'Énfasis', lista: this.historial.cursosEnfasis },
        { titulo: 'Complementaria Lenguas', lista: this.historial.cursosComplementariaLenguas },
        { titulo: 'Complementaria Información', lista: this.historial.cursosComplementariaInformacion },
        { titulo: 'Énfasis validado como Complementaria (IA)', lista: this.historial.cursosIA },
        { titulo: 'Énfasis Computación', lista: this.historial.cursosDesarrolloComputacion },
        { titulo: 'Énfasis Gestión', lista: this.historial.cursosDesarrolloGestion },
        { titulo: 'Énfasis Visual', lista: this.historial.cursosComputacionVisual },
        { titulo: 'CV validado como IA', lista: this.historial.cursosCVtoIA },
        { titulo: 'SIG validado como IA', lista: this.historial.cursosSIGtoIA },
        { titulo: 'Electiva de Ciencias Básicas', lista: this.historial.cursosElectivaBasicas },
        { titulo: 'Seguridad', lista: this.historial.cursosSeguridad }
      ];
      this.crearDonut();
      setTimeout(() => this.crearDonut(), 0);
    }

  }

  ngAfterViewInit() {

  }

  crearDonut() {
    const data = [
      { label: 'Créditos cursados', value: this.historial.creditosCursando || 0 },
      { label: 'Créditos en curso', value: this.historial.creditosCursados || 0 },
      { label: 'Créditos faltantes', value: this.historial.creditosFaltantes || 0 }
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
      .innerRadius(50)
      .outerRadius(radius);

    const pie = d3.pie<typeof data[0]>()
      .value(d => d.value)
      .sort(null);

    // Texto central fijo (total)
    svg.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .style("font-size", "28px")
      .style("font-weight", "bold")
      .text(total);

    const arcs = svg.selectAll('path')
      .data(pie(data))
      .enter()
      .append('path')
      .attr('d', arc as any)
      .attr('fill', d => color(d.data.label));

    // Valores dentro de los arcos
    svg.selectAll("text.label")
      .data(pie(data))
      .enter()
      .append("text")
      .attr("class", "label")
      .attr("transform", d => `translate(${arc.centroid(d)})`)
      .attr("text-anchor", "middle")
      .attr("alignment-baseline", "middle")
      .style("font-size", "18px")
      .style("font-weight", "bold")
      .style("fill", "#fff")
      .text(d => d.data.value > 0 ? d.data.value : "");

    // Leyenda
    const leyenda = d3.select("#leyendaGrafico");
    leyenda.selectAll("*").remove();

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



  get requisitosProcesados() {
    return this.historial.lineasRequisitosGrado
      ?.filter(linea =>
        !linea.includes('Condición general no satisfecha: Requisitos de grado') &&
        !linea.includes('Condición general satisfecha: Requisitos de grado') &&
        !linea.includes('Satisfecho: Requisitos de grado')
      )
      .map(linea => {
        const partes = linea.split('/');
        const nombre = partes[0]?.trim() || '';
        const estado = partes[1]?.trim().toLowerCase() || '';
        const cumplido = estado.includes('satisfecho') && !estado.includes('no');

        return {
          nombre,
          cumplido
        };
      }) || [];
  }

  get materiasVisibles() {
    return this.mostrarTodasMaterias
      ? this.historial.materias
      : this.historial.materias.slice(0, 5);
  }


}
