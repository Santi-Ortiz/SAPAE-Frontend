import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { RagApiService } from '../services/rag-api.service';

@Component({
  selector: 'app-busquedas',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './busquedas.component.html',
  styleUrls: ['./busquedas.component.css']
})
export class BusquedasComponent {
  pregunta: string = '';
  respuesta: string = '';
  cargando: boolean = false;

  constructor(private api: RagApiService) {}

  consultarIA() {
    if (!this.pregunta.trim()) return;

    this.cargando = true;
    this.respuesta = '';

    this.api.queryReglamento(this.pregunta).subscribe(
      (res) => {
        this.respuesta = res;
        this.cargando = false;
      },
      (error) => {
        this.respuesta = 'Error al consultar el servicio de IA.';
        this.cargando = false;
        console.error(error);
      }
    );
  }
}
