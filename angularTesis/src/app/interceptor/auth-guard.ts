import { inject } from "@angular/core";
import { CanActivateFn, Router } from "@angular/router";
import { AuthService } from "../services/auth.service";
import { map, catchError } from "rxjs/operators";
import { of } from "rxjs";

export const AuthGuard: CanActivateFn = (route, state) => {
    const router = inject(Router);
    const authService = inject(AuthService);

    console.log('🛡️ AuthGuard: Verificando acceso a:', state.url);

    return authService.isAuthenticated().pipe(
        map(isAuth => {
            console.log('🛡️ AuthGuard: Usuario autenticado:', isAuth);

            if (!isAuth) {
                console.log('🛡️ AuthGuard: Redirigiendo a login sin returnUrl');
                router.navigate(['/login']);
                return false;
            }

            console.log('🛡️ AuthGuard: Acceso permitido');
            return true;
        }),
        catchError(error => {
            console.error('🛡️ AuthGuard: Error verificando autenticación:', error);
            router.navigate(['/login']);
            return of(false);
        })
    );
};