import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';

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

  constructor(private http: HttpClient) {}

  consultarIA() {
    if (!this.pregunta.trim()) return;

    this.cargando = true;
    this.respuesta = '';

    const body = { question: this.pregunta };

    this.http.post('http://localhost:8080/api/rag', body, { responseType: 'text' }).subscribe(
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
