import { provideRouter, Routes } from '@angular/router';
import { Registro } from './registro/registro';
import { Login } from './login/login';
import { PensumView } from './pensum/pensum-view/pensum-view';
import { PensumSimulacion } from './pensum/pensum-simulacion/pensum-simulacion';
import { Historial } from './historial/historial';
import { SimulacionComponent } from './simulacion/simulacion';
import { Main } from './main/main';
import { BusquedasComponent } from './busquedas/busquedas.component';
import { RecomendacionesComponent } from './recomendaciones/recomendaciones.component';
import { bootstrapApplication } from '@angular/platform-browser';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { authInterceptor } from './interceptor/auth-interceptor';
import { App } from './app';
import { SimulacionResultado } from './simulacion-resultado/simulacion-resultado';
import { HistorialSimulacionesComponent } from './historial-simulaciones/historial-simulaciones.component';

export const routes: Routes = [
  { path: 'registro', component: Registro },
  { path: 'login', component: Login },
  { path: 'pensum/view', component: PensumView },
  { path: 'pensum/simulacion', component: PensumSimulacion },
  { path: 'historial', component: Historial },
  { path: 'simulacion', component: SimulacionComponent },
  { path: 'simulacion/mostrar', component: SimulacionResultado },
  { path: 'historial-simulaciones', component: HistorialSimulacionesComponent },
  { path: 'busquedas', component: BusquedasComponent},
  { path: 'recomendaciones', component: RecomendacionesComponent},
  { path: 'main', component: Main },
  { path: '', redirectTo: '/login', pathMatch: 'full' },
];


bootstrapApplication(App, {
    providers: [
        provideRouter(routes),
        provideHttpClient(withInterceptorsFromDi()),
        { 
            provide: HTTP_INTERCEPTORS, 
            useClass: authInterceptor, 
            multi: true 
        }
    ]
}).catch(err => console.error(err));