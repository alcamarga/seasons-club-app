import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from './components/header/header.component';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, HeaderComponent, SidebarComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class AppComponent {
  private auth = inject(AuthService);

  title = 'Seasons-Club-frontend';
  isSidebarOpen = false;

  get esAdmin(): boolean {
    return this.auth.isAdmin();
  }

  abrirSidebar(): void {
    if (this.esAdmin) {
      this.isSidebarOpen = true;
    }
  }
}
