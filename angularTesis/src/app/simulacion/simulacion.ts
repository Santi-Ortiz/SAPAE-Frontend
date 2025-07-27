import { Component, OnInit } from '@angular/core';
import { SimulacionDTO } from '../dto/simulacion-dto';
import { Simulacion } from '../dto/simulacion';
import { SimulacionService } from '../shared/simulacion.service';
import { ProgresoDTO } from '../dto/progreso-dto';
import { ProyeccionDTO } from '../dto/proyeccion-dto';
import { HistorialService } from '../shared/historial.service';
import { ProyeccionService } from '../shared/proyeccion.service';
import { KeyValuePipe, NgFor, NgIf } from '@angular/common';
import { MateriajsonDTO } from '../dto/materiajson-dto';

@Component({
  selector: 'app-simulacion',
  standalone: true,
  imports: [NgIf, NgFor, KeyValuePipe],
  templateUrl: './simulacion.html',
  styleUrl: './simulacion.css'
})
export class SimulacionComponent implements OnInit {

  public simulacionDTO: SimulacionDTO = new SimulacionDTO();
  public resultadoSimulacion: { [semestre: string]: { materias: MateriajsonDTO[] } } = {};

  constructor(private simulacionService: SimulacionService, private historialService: HistorialService, private proyeccionService: ProyeccionService) {}

  ngOnInit(): void {

    // Se asigna historial (progreso) a partir de la carga del informe de avance 
    this.historialService.historial$.subscribe(historial => {
      if (historial) {
        if (this.simulacionDTO) {
          const historial = this.historialService.getHistorial();
          if (historial) {
            this.simulacionDTO.progreso = historial;
            console.log('Historial DTO: ', this.historialService.getHistorial());
          }
        }
      }
    });

    console.log('Historial DTO: ', this.historialService.getHistorial());

    // Se asigna proyección quemada mientras se realiza la interfaz de formulario para la simulación
    const proyeccionDTO = {
      id: 1,
      semestre: 8,
      creditos: 20,
      materias: 10
    }
    this.proyeccionService.setProyeccion(proyeccionDTO);

    console.log('Proyección DTO: ', this.proyeccionService.getProyeccion());

    if(this.simulacionDTO){
      this.simulacionDTO.proyeccion = this.proyeccionService.getProyeccion();
    }

    console.log('Simulacion DTO: ', this.simulacionDTO);

  }

  generarSimulacion() {
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
