import { Component, OnInit } from '@angular/core';
import { SimulacionDTO } from '../dto/simulacion-dto';
import { Simulacion } from '../dto/simulacion';
import { SimulacionService } from '../shared/simulacion.service';
import { ProgresoDTO } from '../dto/progreso-dto';
import { ProyeccionDTO } from '../dto/proyeccion-dto';
import { HistorialService } from '../shared/historial.service';

@Component({
  selector: 'app-simulacion',
  imports: [],
  templateUrl: './simulacion.html',
  styleUrl: './simulacion.css'
})
export class SimulacionComponent implements OnInit {

  //public historial: ProgresoDTO = new ProgresoDTO();
  public simulacionDTO: SimulacionDTO | null = null;
  public resultadoSimulacion: Simulacion = new Simulacion();

  constructor(private simulacionService: SimulacionService, private historialService: HistorialService) {}

  ngOnInit(): void {

    // Se asigna historial (progreso) a partir de la carga del informe de avance 
    this.historialService.historial$.subscribe(historial => {
      if (historial) {
        if (this.simulacionDTO) {
          const historial = this.historialService.getHistorial();
          if (historial) {
            this.simulacionDTO.progreso = historial;
          }
        }
      }
    });

    


  }

  generarSimulacion() {
      this.simulacionService.generarSimulacion(this.simulacionDTO!).subscribe({
        next: (resultado) => {
          this.resultadoSimulacion = resultado;
        },
        error: (error) => {
          console.error('Error al generar la simulación:', error);
        }
      });
  }

}
