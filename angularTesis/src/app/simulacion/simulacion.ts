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
import { HistorialSimulacionesService } from '../services/historial-simulaciones.service';

@Component({
  selector: 'app-simulacion',
  standalone: true,
  imports: [NgIf, FormsModule],
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
  public nombreSimulacion?: string;

  public priorizacionMaterias = {
    nucleoCienciasBasicas: false,
    nucleoIngenieriaAplicada: false,
    nucleoSocioHumanistica: false,
    electivas: false,
    complementarias: false,
    enfasis: false
  };

  public practicaProfesional: boolean = false;

  public readonly maxSelecciones = 3;
  public readonly maxMaterias = 10;
  public camposIncompletos = false;
  public mostrarMensajeError = false;
  public nombreDuplicado = false;
  public nombreDuplicadoModal = false;
  public progresoCompletado = false;

  constructor(
    private router: Router, 
    private simulacionService: SimulacionService, 
    private historialService: HistorialService,
    private historialSimulacionesService: HistorialSimulacionesService
  ) { }

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
    if (!this.semestreInput || !this.creditosInput || !this.materiasInput || !this.nombreSimulacion) {
      this.camposIncompletos = true;
      return;
    }

    if (this.historialSimulacionesService.existeSimulacionConNombre(this.nombreSimulacion)) {
      this.nombreDuplicadoModal = true;
      return;
    }

    // Verificar si el progreso está completado (excepto si eligió práctica profesional)
    if (this.verificarProgresoCompletado() && !this.practicaProfesional) {
      this.progresoCompletado = true;
      return;
    }

    const proyeccionDTO = {
      id: 1,
      semestre: (this.semestreInput + this.progresoActual.semestre!),
      creditos: this.creditosInput,
      materias: this.materiasInput,
      nombreSimulacion: this.nombreSimulacion,
      tipoMatricula: this.tipoMatricula || 'No especificado',
      practicaProfesional: this.practicaProfesional,
      // fechaCreacion se creará en el backend
      priorizaciones: this.obtenerPriorizacionesSeleccionadas()
    }

    const priorizacionesSeleccionadas = this.obtenerPriorizacionesSeleccionadas();
    const nombresPriorizaciones = this.obtenerNombresPriorizacionesSeleccionadas();

    this.simulacionDTO!.proyeccion = proyeccionDTO;
    this.simulacionDTO!.priorizaciones = priorizacionesSeleccionadas;
    this.simulacionDTO!.practicaProfesional = this.practicaProfesional;

    // Guardar parámetros de la simulación
    const parametrosSimulacion = {
      semestres: this.semestreInput,
      tipoMatricula: this.tipoMatricula || 'No especificado',
      creditos: this.creditosInput,
      materias: this.materiasInput,
      priorizaciones: nombresPriorizaciones,
      practicaProfesional: this.practicaProfesional
    };

    this.simulacionService.setParametrosSimulacionActual(parametrosSimulacion);

    this.simulacionService.iniciarSimulacion(this.simulacionDTO!).subscribe({
      next: (respuesta) => {
        
        this.simulacionService.agregarJobAlMonitoreo(
          respuesta.jobId, 
          `Simulación para ${this.semestreInput} semestres con ${this.creditosInput} créditos`, 
          this.nombreSimulacion!
        );
        
        this.router.navigate(['/historial']);
      },
      error: (error) => {
        console.error('Error al iniciar la simulación:', error);
        alert('Error al iniciar la simulación. Por favor, intenta nuevamente.');
      }
    });
  }

  get maxCreditos(): any {
    switch (this.tipoMatricula) {
      case 'Media Matrícula':
        return 10;
      case 'Matrícula completa':
        return 20;
      case 'Matrícula completa + 1 crédito':
        return 21;
      case 'Matrícula completa + 2 créditos':
        return 22;
      case 'Matrícula completa + 3 créditos':
        return 23;
      case 'Matrícula completa + 4 créditos':
        return 24;
    }
  }

  get numSemestresSimulados(): number {
    return this.semestreInput || 0;
  }

  ajustarCreditos() {
    if (this.creditosInput && this.creditosInput > this.maxCreditos) {
      this.creditosInput = this.maxCreditos;
    }
  }

  ajustarMaterias() {
    if(this.materiasInput && this.materiasInput > this.maxMaterias) {
      this.materiasInput = this.maxMaterias;
    }
  }

  get seleccionesActuales(): number {
    return Object.values(this.priorizacionMaterias).filter(Boolean).length;
  }

  onCheckboxChange(campo: keyof typeof this.priorizacionMaterias, event: any) {
    const isChecked = event.target.checked;

    if (isChecked && this.seleccionesActuales >= this.maxSelecciones) {
      event.target.checked = false;
      this.mostrarMensajeError = true;
      return;
    }

    this.priorizacionMaterias[campo] = isChecked;

    this.actualizarMensajeError();
  }

  private actualizarMensajeError() {
    this.mostrarMensajeError = this.seleccionesActuales >= this.maxSelecciones;
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

  private obtenerNombresPriorizacionesSeleccionadas(): string[] {
    const nombres: string[] = [];
    
    if (this.priorizacionMaterias.nucleoCienciasBasicas) {
      nombres.push('Núcleo Ciencias Básicas');
    }
    if (this.priorizacionMaterias.nucleoIngenieriaAplicada) {
      nombres.push('Núcleo Ingeniería Aplicada');
    }
    if (this.priorizacionMaterias.nucleoSocioHumanistica) {
      nombres.push('Núcleo Socio-Humanística');
    }
    if (this.priorizacionMaterias.electivas) {
      nombres.push('Electivas');
    }
    if (this.priorizacionMaterias.complementarias) {
      nombres.push('Complementarias');
    }
    if (this.priorizacionMaterias.enfasis) {
      nombres.push('Énfasis');
    }
    
    return nombres;
  }

  verHistorialSimulaciones(): void {
    this.router.navigate(['/historial-simulaciones']);
  }

  validarNombreSimulacion(): void {
    if (this.nombreSimulacion && this.historialSimulacionesService.existeSimulacionConNombre(this.nombreSimulacion)) {
      this.nombreDuplicado = true;
    } else {
      this.nombreDuplicado = false;
    }
  }

  verificarProgresoCompletado(): boolean {
    const noHayMateriasFaltantes = !this.progresoActual.materiasFaltantes || this.progresoActual.materiasFaltantes === 0;
    const noHayListaMateriasFaltantes = !this.progresoActual.listaMateriasFaltantes || this.progresoActual.listaMateriasFaltantes.length === 0;
    const noFaltanElectivas = !this.progresoActual.faltanElectiva || this.progresoActual.faltanElectiva === 0;
    const noFaltanComplementarias = !this.progresoActual.faltanComplementaria || this.progresoActual.faltanComplementaria === 0;
    const noFaltanEnfasis = !this.progresoActual.faltanEnfasis || this.progresoActual.faltanEnfasis === 0;
    const noFaltanElectivasCB = !this.progresoActual.faltanElectivaBasicas || this.progresoActual.faltanElectivaBasicas === 0;

    return (noHayMateriasFaltantes || noHayListaMateriasFaltantes) && 
           noFaltanElectivas && 
           noFaltanComplementarias && 
           noFaltanEnfasis && 
           noFaltanElectivasCB;
  }
}
