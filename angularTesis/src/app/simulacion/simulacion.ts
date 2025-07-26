import { Component } from '@angular/core';
import { SimulacionDTO } from '../dto/simulacion-dto';
import { Simulacion } from '../dto/simulacion';
import { SimulacionService } from '../shared/simulacion.service';
import { ProgresoDTO } from '../dto/progreso-dto';

@Component({
  selector: 'app-simulacion',
  imports: [],
  templateUrl: './simulacion.html',
  styleUrl: './simulacion.css'
})
export class SimulacionComponent {

  public simulacion: Simulacion = new Simulacion();
  public progreso: ProgresoDTO = new ProgresoDTO();

  constructor(private simulacionService: SimulacionService) {}

  ngOnInit(): void {

    //this.generarSimulacion(new SimulacionDTO());
  }

  generarSimulacion(simulacionDTO: SimulacionDTO): void {
    try {
      this.simulacionService.generarSimulacion().subscribe({
        next: (simulacion: Simulacion) => {
          this.simulacion = simulacion;
        },
        error: (error) => {
          console.error('Error al generar la simulación:', error);
        }
      });
    } catch (error) {
      console.error('Error al generar la simulación:', error);
    }
  }

}
