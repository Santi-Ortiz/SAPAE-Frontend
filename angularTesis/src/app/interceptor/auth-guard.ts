import { inject } from "@angular/core";
import { CanActivateFn, Router } from "@angular/router";
import { AuthService } from "../services/auth.service";
import { map } from "rxjs/operators";

export const AuthGuard: CanActivateFn = () => {
    const router = inject(Router);
    const authService = inject(AuthService);

    return authService.isAuthenticated().pipe(
        map(isAuth => {
            if (!isAuth) {
                router.navigate(['/login']);
            }
            return isAuth;
        })
    );
};