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
import { Router } from '@angular/router';

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
  public tipoMatricula?: string;
  public creditosInput?: number;
  public materiasInput?: number;

  constructor(private router: Router, private simulacionService: SimulacionService, private historialService: HistorialService) { }

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
      semestre: (this.semestreInput + this.progresoActual.semestre!),
      creditos: this.creditosInput,
      materias: this.materiasInput
    }

    this.simulacionDTO!.proyeccion = proyeccionDTO;
    console.log("SimulacionDTO FINAL: ", this.simulacionDTO);

    this.simulacionService.generarSimulacion(this.simulacionDTO!).subscribe({
      next: (resultado: any) => {
        this.resultadoSimulacion = resultado;
        this.simulacionService.setSimulacion(resultado);

        console.log('Simulacion generada: ', this.resultadoSimulacion);
        this.router.navigate(['/simulacion/mostrar'])
      },
      error: (error) => {
        console.error('Error al generar la simulación:', error);
      }
    });

  }

  get maxCreditos(): number {
    switch (this.tipoMatricula) {
      case 'Media Matrícula':
        return 10;
      case 'Matrícula completa':
        return 20;
      case 'Matrícula completa + 1 créditos':
        return 21;
      case 'Matrícula completa + 2 créditos':
        return 22;
      case 'Matrícula completa + 3 créditos':
        return 23;
      case 'Matrícula completa + 4 créditos':
        return 24;
      default:
        return 20;
    }
  }

  ajustarCreditos() {
    if (this.creditosInput && this.creditosInput > this.maxCreditos) {
      this.creditosInput = this.maxCreditos;
    }
  }

}
