import { Component } from '@angular/core';
import { RouterOutlet, RouterModule } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterModule], 
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class App {
  protected title = 'angularTesis';
  constructor() {}
  logout() {
    localStorage.clear();
  }
}
