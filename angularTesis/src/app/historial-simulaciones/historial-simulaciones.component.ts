import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HistorialSimulacionesService, SimulacionGuardada } from '../services/historial-simulaciones.service';
import { SimulacionService } from '../services/simulacion.service';

@Component({
  selector: 'app-historial-simulaciones',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './historial-simulaciones.component.html',
  styleUrl: './historial-simulaciones.component.css'
})
export class HistorialSimulacionesComponent implements OnInit {
  simulacionesGuardadas: SimulacionGuardada[] = [];
  
  // Variables para controlar los modales
  mostrarModalEliminar = false;
  mostrarModalLimpiar = false;
  simulacionAEliminar: SimulacionGuardada | null = null;

  constructor(
    private router: Router,
    private historialSimulacionesService: HistorialSimulacionesService,
    private simulacionService: SimulacionService
  ) { }

  ngOnInit(): void {
    this.cargarSimulacionesGuardadas();
  }

  cargarSimulacionesGuardadas(): void {
    this.simulacionesGuardadas = this.historialSimulacionesService.getSimulacionesGuardadas();
  }

  verSimulacion(simulacion: SimulacionGuardada): void {
    // Cargar la simulación en el servicio de simulación
    this.simulacionService.setSimulacion(simulacion.resultadoSimulacion);
    this.simulacionService.setNombreSimulacionActual(simulacion.nombre);
    
    // Guardar el jobId si existe
    if (simulacion.jobId) {
      this.simulacionService.setJobIdSimulacionActual(simulacion.jobId);
    } else {
      this.simulacionService.limpiarJobIdSimulacionActual();
    }
    
    // Navegar a la vista de resultado
    this.router.navigate(['/simulacion/mostrar']);
  }

  eliminarSimulacion(simulacion: SimulacionGuardada): void {
    this.simulacionAEliminar = simulacion;
    this.mostrarModalEliminar = true;
  }

  confirmarEliminacion(): void {
    if (this.simulacionAEliminar) {
      this.historialSimulacionesService.eliminarSimulacion(this.simulacionAEliminar.id);
      this.cargarSimulacionesGuardadas();
    }
    this.mostrarModalEliminar = false;
    this.simulacionAEliminar = null;
  }

  limpiarHistorial(): void {
    this.mostrarModalLimpiar = true;
  }

  confirmarLimpiarHistorial(): void {
    this.historialSimulacionesService.limpiarHistorial();
    this.cargarSimulacionesGuardadas();
    this.mostrarModalLimpiar = false;
  }

  volverSimulacion(): void {
    this.router.navigate(['/simulacion']);
  }

  formatearFecha(fecha: Date): string {
    return new Date(fecha).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatearPriorizaciones(priorizaciones: string[]): string {
    return priorizaciones.join(', ');
  }
}
