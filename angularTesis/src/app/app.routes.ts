import { provideRouter, Routes } from '@angular/router';
import { PensumView } from './pensum/pensum-view/pensum-view';
import { Main } from './main/main';
import { bootstrapApplication } from '@angular/platform-browser';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { authInterceptor } from './interceptor/auth-interceptor';

export const routes: Routes = [
  { path: '', redirectTo: 'pensum/view', pathMatch: 'full' },
  { path: 'pensum/view', component: PensumView },
  { path: 'main', component: Main },
];


bootstrapApplication(Main, {
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