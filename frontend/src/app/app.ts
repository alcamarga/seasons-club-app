import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { MesasComponent } from './components/mesas/mesas.component';
import { HeaderComponent } from './components/header/header.component';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, HttpClientModule, RouterOutlet, MesasComponent, HeaderComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class AppComponent {
  title = 'pizzeria-frontend';
}
