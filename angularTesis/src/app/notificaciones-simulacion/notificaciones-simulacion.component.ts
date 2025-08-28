import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SimulacionService } from '../services/simulacion.service';
import { SimulacionJobStatus } from '../dtos/simulacion-job-status.dto';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';

@Component({
  selector: 'app-notificaciones-simulacion',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notificaciones-simulacion.component.html',
  styleUrl: './notificaciones-simulacion.component.css'
})
export class NotificacionesSimulacionComponent implements OnInit, OnDestroy {
  jobsActivos: SimulacionJobStatus[] = [];
  notificaciones: string[] = [];
  private subscriptions: Subscription[] = [];

  constructor(
    private simulacionService: SimulacionService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Suscribirse a jobs activos
    this.subscriptions.push(
      this.simulacionService.jobsActivos$.subscribe(jobs => {
        this.jobsActivos = jobs;
      })
    );

    // Suscribirse a notificaciones
    this.subscriptions.push(
      this.simulacionService.notificaciones$.subscribe(notificaciones => {
        this.notificaciones = notificaciones;
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  getEstadoTexto(estado: string): string {
    switch (estado) {
      case 'PENDIENTE': return 'Pendiente';
      case 'EN_PROGRESO': return 'En Progreso';
      case 'COMPLETADA': return 'Completada';
      case 'ERROR': return 'Error';
      default: return estado;
    }
  }

  getEstadoClass(estado: string): string {
    return `estado-${estado.toLowerCase().replace('_', '-')}`;
  }

  verResultado(jobId: string): void {
    // Quitar la notificacion
    this.removerJob(jobId);
    // Obtener el resultado y navegar a la vista de resultados
    this.simulacionService.obtenerResultadoJob(jobId).subscribe(resultado => {
      this.simulacionService.setSimulacion(resultado);
      
      // Si ya estamos en la ruta de simulación, forzar la recarga del componente
      const currentUrl = this.router.url;
      if (currentUrl === '/simulacion/mostrar') {
        // Navegar a una ruta dummy y luego de vuelta para forzar la reinicialización
        this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
          this.router.navigate(['/simulacion/mostrar']);
        });
      } else {
        this.router.navigate(['/simulacion/mostrar']);
      }
    });
  }

  removerJob(jobId: string): void {
    this.simulacionService.removerJobDelMonitoreo(jobId);
  }

  limpiarNotificaciones(): void {
    this.simulacionService.limpiarNotificaciones();
  }
}
