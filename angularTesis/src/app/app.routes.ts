import { Routes } from '@angular/router';
import { Registro } from './registro/registro';
import { Login } from './login/login';
import { PensumView } from './pensum/pensum-view/pensum-view';
import { Historial } from './historial/historial';
import { SimulacionComponent } from './simulacion/simulacion';
import { Main } from './main/main';
import { BusquedasComponent } from './busquedas/busquedas.component';
import { RecomendacionesComponent } from './recomendaciones/recomendaciones.component';
import { SimulacionResultado } from './simulacion-resultado/simulacion-resultado';
import { AuthGuard } from './interceptor/auth-guard';

export const routes: Routes = [
    { path: 'registro', component: Registro },
    { path: 'login', component: Login },
    { path: 'pensum/view', component: PensumView },
    { path: 'historial', component: Historial },
    { path: 'simulacion', component: SimulacionComponent },
    { path: 'simulacion/mostrar', component: SimulacionResultado },
    { path: 'busquedas', component: BusquedasComponent },
    { path: 'recomendaciones', component: RecomendacionesComponent },
    { path: 'main', component: Main, canActivate: [AuthGuard] },
    { path: '', redirectTo: '/login', pathMatch: 'full' },
];