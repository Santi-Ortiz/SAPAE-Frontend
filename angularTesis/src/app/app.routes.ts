import { provideRouter, Routes } from '@angular/router';
import { PensumView } from './pensum/pensum-view/pensum-view';
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

export const routes: Routes = [
  { path: 'pensum/view', component: PensumView },
  { path: 'historial', component: Historial },
  { path: 'simulacion', component: SimulacionComponent },
  { path: 'simulacion/mostrar', component: SimulacionResultado },
  { path: 'busquedas', component: BusquedasComponent},
  { path: 'recomendaciones', component: RecomendacionesComponent},
  { path: 'main', component: Main },
  { path: '', redirectTo: 'main', pathMatch: 'full' },
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