import { Component, OnInit } from '@angular/core';
import { SimulacionService } from '../shared/simulacion.service';
import { CommonModule, KeyValuePipe, NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MateriajsonDTO } from '../dto/materiajson-dto';

@Component({
  selector: 'app-simulacion-resultado',
  standalone: true,
  imports: [NgIf, NgFor, KeyValuePipe, FormsModule, CommonModule],
  templateUrl: './simulacion-resultado.html',
  styleUrl: './simulacion-resultado.css'
})
export class SimulacionResultado implements OnInit {

  public resultadoSimulacion: { [semestre: string]: { materias: MateriajsonDTO[] } } = {};

  constructor(private simulacionService: SimulacionService) {}

  ngOnInit():void {
    
    this.resultadoSimulacion = this.simulacionService.getSimulacion();
  }

  public calcularResumen(materias: MateriajsonDTO[]): { totalCreditos: number, totalMaterias: number } {
    const totalCreditos = materias.reduce((sum, m) => sum + m.creditos, 0);
    return {
      totalCreditos,
      totalMaterias: materias.length
  };
}
}
