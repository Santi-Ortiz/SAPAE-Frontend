import { Component, OnInit } from '@angular/core';
import { RouterOutlet, RouterModule, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { NgIf, NgFor, NgClass, } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { AuthService } from './services/auth.service';
import { NotificacionesSimulacionComponent } from './notificaciones-simulacion/notificaciones-simulacion.component';
import { CalendarioService } from './services/calendario.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterModule,
    NgIf,
    RouterOutlet,
    FormsModule,
    HttpClientModule,
    NotificacionesSimulacionComponent
  ],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class App implements OnInit {
  protected title = 'angularTesis';

  hideMenu = false;
  semanaActual: any = null;
  infoRetiro: any = null;

  constructor(private router: Router, private calendarioService: CalendarioService, private authService: AuthService) {
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        // Subir siempre en cada pantalla
        window.scrollTo(0, 0);

        const rutasOcultas = ['/main', '/login', '/registro'];
        this.hideMenu = rutasOcultas.includes(event.urlAfterRedirects);
      });
  }

  ngOnInit(): void {
    this.semanaActual = this.calendarioService.getSemanaActual();
    this.infoRetiro = this.calendarioService.getInfoRetiroActual();
  }

  logout(): void {
    this.authService.logout().subscribe();
    this.router.navigate(['/login']);
  }
}


