import { Component, AfterViewInit } from '@angular/core';
import { ProgresoDTO } from '../dto/progreso-dto';
import { RouterModule } from '@angular/router';
import { LecturaService } from '../shared/lectura.service';
import { EventEmitter, Output } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
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
export class Historial implements AfterViewInit {
  public historial: ProgresoDTO = new ProgresoDTO();

  constructor(private lecturaService: LecturaService, private historialService: HistorialService) {}

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file && file.type === 'application/pdf') {
      this.historial.archivoSeleccionado = file;
    } else {
      this.historial.error = 'Debe seleccionar un archivo PDF válido.';
    }
  }


  onSubmit(): void {
    if (!this.historial.archivoSeleccionado) {
      this.historial.error = 'Primero seleccione un archivo PDF.';
      return;
    }
  
    this.lecturaService.subirArchivo(this.historial.archivoSeleccionado).subscribe({
      next: (respuesta) => {
        console.log('Respuesta del backend:', respuesta); 
        this.historial = {
          ...respuesta,
          archivoSeleccionado: this.historial.archivoSeleccionado,
          error: ''
        };
        this.historialService.setHistorial(respuesta);
        this.crearDonut();
      },      
      error: () => {
        this.historial.error = 'Error al procesar el archivo.';
      }
    });
  }
  
  

  ngAfterViewInit() {
    this.crearDonut();
  }

  crearDonut() {
    if (!this.historial) return;

    const data = [
      { label: 'Cursados', value: this.historial.materiasCursadas || 0 },
      { label: 'En curso', value: this.historial.materiasCursando || 0 },
      { label: 'Faltantes', value: this.historial.materiasFaltantes || 0 }
    ];

    d3.select('#donutChartContainer svg')?.remove(); // Elimina gráfico anterior si lo hay

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

}
