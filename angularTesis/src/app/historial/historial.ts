import { Component, AfterViewInit, OnInit } from '@angular/core';
import { ProgresoDTO } from '../dto/progreso-dto';
import { RouterModule } from '@angular/router';
import { NgIf, NgFor, NgClass, AsyncPipe } from '@angular/common';
import * as d3 from 'd3';
import { HistorialService } from '../shared/historial.service';

@Component({
  selector: 'app-historial',
  standalone: true,
  imports: [RouterModule, NgIf, NgFor, NgClass, AsyncPipe],
  templateUrl: './historial.html',
  styleUrl: './historial.css'
})
export class Historial implements OnInit, AfterViewInit {
  public historial: ProgresoDTO = new ProgresoDTO();
  public tablasExtra: { titulo: string; lista: any[] }[] = [];
  constructor(private historialService: HistorialService) {}

  ngOnInit() {
    const data = this.historialService.getHistorial();
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
        { titulo: 'Electiva de Ciencias Básicas', lista: this.historial.cursosElectivaBasicas }
      ];
    }
    
  }

  ngAfterViewInit() {
    setTimeout(() => this.crearDonut()); // Espera que el DOM esté listo
  }

  crearDonut() {
    if (!this.historial) return;

    const data = [
      { label: 'Cursados', value: this.historial.materiasCursadas || 0 },
      { label: 'En curso', value: this.historial.materiasCursando || 0 },
      { label: 'Faltantes', value: this.historial.materiasFaltantes || 0 }
    ];

    d3.select('#donutChartContainer svg')?.remove();

    const width = 300, height = 300, radius = Math.min(width, height) / 2;

    const color = d3.scaleOrdinal<string>()
      .domain(data.map(d => d.label))
      .range(["#0077B6", "#90e0ef", "#caf0f8"]);

    const svg = d3.select('#donutChartContainer')
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${width / 2}, ${height / 2})`);

    const arc = d3.arc<d3.PieArcDatum<{ label: string, value: number }>>()
      .innerRadius(70)
      .outerRadius(radius);

    const pie = d3.pie<{ label: string, value: number }>()
      .value(d => d.value);

    svg.selectAll('path')
      .data(pie(data))
      .enter()
      .append('path')
      .attr('d', d => arc(d)!)
      .attr('fill', d => color(d.data.label));
  }

  get requisitosProcesados() {
    return this.historial.lineasRequisitosGrado
      ?.filter(linea =>
        !linea.includes('Condición general no satisfecha: Requisitos de grado') &&
        !linea.includes('Condición general satisfecha: Requisitos de grado')&&
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
  
  
}
