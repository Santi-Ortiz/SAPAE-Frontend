import { Routes } from '@angular/router';
import { Registro } from './registro/registro';
import { Login } from './login/login';
import { PensumView } from './pensum/pensum-view/pensum-view';
import { PensumSimulacion } from './pensum/pensum-simulacion/pensum-simulacion';
import { Historial } from './historial/historial';
import { SimulacionComponent } from './simulacion/simulacion';
import { Main } from './main/main';
import { BusquedasComponent } from './busquedas/busquedas.component';
import { RecomendacionesComponent } from './recomendaciones/recomendaciones.component';
import { SimulacionResultado } from './simulacion-resultado/simulacion-resultado';
import { AuthGuard } from './interceptor/auth-guard';
import { HistorialSimulacionesComponent } from './historial-simulaciones/historial-simulaciones.component';

export const routes: Routes = [
    // Rutas públicas sin autenticación
    { path: 'registro', component: Registro},
    { path: 'login', component: Login },

    // Rutas protegidas que requieren autenticación
    { path: 'pensum/view', component: PensumView, canActivate: [AuthGuard] },
    { path: 'pensum/simulacion', component: PensumSimulacion, canActivate: [AuthGuard] },
    { path: 'historial', component: Historial, canActivate: [AuthGuard] },
    { path: 'simulaciones', component: SimulacionComponent, canActivate: [AuthGuard] },
    { path: 'simulaciones/mostrar', component: SimulacionResultado, canActivate: [AuthGuard] },
    { path: 'historial-simulaciones', component: HistorialSimulacionesComponent, canActivate: [AuthGuard] },
    { path: 'busquedas', component: BusquedasComponent, canActivate: [AuthGuard] },
    { path: 'recomendaciones', component: RecomendacionesComponent, canActivate: [AuthGuard] },
    { path: 'main', component: Main, canActivate: [AuthGuard] },

    // Redirección por defecto
    { path: '', redirectTo: '/login', pathMatch: 'full' },

];