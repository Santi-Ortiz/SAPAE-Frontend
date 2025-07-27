import { Component } from '@angular/core';
import { RouterOutlet, RouterModule, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { NgIf, NgFor, NgClass, AsyncPipe } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterModule, NgIf, NgFor, NgClass, AsyncPipe, RouterOutlet],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class App {
  protected title = 'angularTesis';

  hideMenu = false;

  constructor(private router: Router) {
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.hideMenu = event.urlAfterRedirects === '/main';
      });
  }

  logout(): void {
    localStorage.clear();
    this.router.navigate(['/main']);
  }
}
