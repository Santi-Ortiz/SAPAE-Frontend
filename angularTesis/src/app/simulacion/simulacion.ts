import { Component, Input, OnInit } from '@angular/core';
import { SimulacionDTO } from '../dto/simulacion-dto';
import { Simulacion } from '../dto/simulacion';
import { SimulacionService } from '../shared/simulacion.service';
import { ProgresoDTO } from '../dto/progreso-dto';
import { ProyeccionDTO } from '../dto/proyeccion-dto';
import { HistorialService } from '../shared/historial.service';
import { ProyeccionService } from '../shared/proyeccion.service';
import { KeyValuePipe, NgFor, NgIf } from '@angular/common';
import { MateriajsonDTO } from '../dto/materiajson-dto';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-simulacion',
  standalone: true,
  imports: [NgIf, NgFor, KeyValuePipe, FormsModule],
  templateUrl: './simulacion.html',
  styleUrl: './simulacion.css'
})
export class SimulacionComponent implements OnInit {

  public progresoActual: ProgresoDTO = new ProgresoDTO();
  public simulacionDTO: SimulacionDTO = new SimulacionDTO();
  public resultadoSimulacion: { [semestre: string]: { materias: MateriajsonDTO[] } } = {};
  public semestreInput?: number;
  public matriculaInput?: number;
  public creditosInput?: number;
  public materiasInput?: number;

  constructor(private simulacionService: SimulacionService, private historialService: HistorialService, private proyeccionService: ProyeccionService) {}

  ngOnInit(): void {

    // Se asigna historial (progreso) a partir de la carga del informe de avance 
    this.historialService.historial$.subscribe(historial => {
      if (historial) {
          this.progresoActual = this.historialService.getHistorial()!;
          if (this.progresoActual) {
            this.simulacionDTO!.progreso = this.progresoActual;
            console.log('Simulacion DTO con progreso: ', this.simulacionDTO!.progreso);
          }
      }
    });
  }

  generarSimulacion() {
    if (!this.semestreInput || !this.creditosInput || !this.materiasInput) {
      alert('Completa todos los campos antes de generar la simulación.');
      return;
    }
    const proyeccionDTO = {
      id: 1,
      semestre: this.semestreInput,
      creditos: this.creditosInput,
      materias: this.materiasInput
    }

    this.simulacionDTO!.proyeccion = proyeccionDTO;

    this.simulacionService.generarSimulacion(this.simulacionDTO!).subscribe({
      next: (resultado: any) => {
        this.resultadoSimulacion = resultado;
        console.log('Simulacion generada: ', this.resultadoSimulacion);
      },
      error: (error) => {
        console.error('Error al generar la simulación:', error);
      }
    });
  }

}
