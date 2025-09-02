import { inject } from "@angular/core";
import { CanActivateFn, Router } from "@angular/router";
import { AuthService } from "../services/auth.service";
import { map, catchError } from "rxjs/operators";
import { of } from "rxjs";

export const AuthGuard: CanActivateFn = (route, state) => {
    const router = inject(Router);
    const authService = inject(AuthService);

    return authService.isAuthenticated().pipe(
        map(isAuth => {

            if (!isAuth) {
                router.navigate(['/login']);
                return false;
            }

            return true;
        }),
        catchError(error => {
            router.navigate(['/login']);
            return of(false);
        })
    );
};