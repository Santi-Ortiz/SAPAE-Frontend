import { Component, Input, OnInit } from '@angular/core';
import { SimulacionDTO } from '../dtos/simulacion-dto';
import { Simulacion } from '../models/simulacion.model'
import { SimulacionService } from '../services/simulacion.service';
import { Progreso } from '../models/progreso.model';
import { Proyeccion } from '../models/proyeccion.model';
import { HistorialService } from '../services/historial.service';
import { ProyeccionService } from '../services/proyeccion.service';
import { KeyValuePipe, NgFor, NgIf } from '@angular/common';
import { Materia } from '../models/materia.model';
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

  public progresoActual: Progreso = new Progreso();
  public simulacionDTO: SimulacionDTO = new SimulacionDTO();
  public resultadoSimulacion: { [semestre: string]: { materias: Materia[] } } = {};
  public semestreInput?: number;
  public tipoMatricula?: string;
  public creditosInput?: number;
  public materiasInput?: number;

  public priorizacionMaterias = {
    nucleoCienciasBasicas: false,
    nucleoIngenieriaAplicada: false,
    nucleoSocioHumanistica: false,
    electivas: false,
    complementarias: false,
    enfasis: false
  };

  public readonly maxSelecciones = 3;
  public mostrarMensajeError = false;

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

    const priorizacionesSeleccionadas = this.obtenerPriorizacionesSeleccionadas();

    this.simulacionDTO!.proyeccion = proyeccionDTO;
    this.simulacionDTO!.priorizaciones = priorizacionesSeleccionadas;

    console.log("SimulacionDTO FINAL: ", this.simulacionDTO);
    console.log("Priorizaciones seleccionadas: ", priorizacionesSeleccionadas);

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

  get seleccionesActuales(): number {
    return Object.values(this.priorizacionMaterias).filter(Boolean).length;
  }

  onCheckboxChange(campo: keyof typeof this.priorizacionMaterias, event: any) {
    const isChecked = event.target.checked;

    if (isChecked && this.seleccionesActuales >= this.maxSelecciones + 1) {
      event.target.checked = false;
      this.mostrarMensajeError = true;
      return;
    }

    this.priorizacionMaterias[campo] = isChecked;

    this.actualizarMensajeError();
  }

  private actualizarMensajeError() {
    this.mostrarMensajeError = this.seleccionesActuales >= this.maxSelecciones + 1;
  }

  private obtenerPriorizacionesSeleccionadas(): boolean[] {
    return [
      this.priorizacionMaterias.nucleoCienciasBasicas,
      this.priorizacionMaterias.nucleoIngenieriaAplicada,
      this.priorizacionMaterias.nucleoSocioHumanistica,
      this.priorizacionMaterias.electivas,
      this.priorizacionMaterias.complementarias,
      this.priorizacionMaterias.enfasis
    ];
  }

}
