import { Component, OnInit, OnDestroy, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { Subscription, interval } from 'rxjs';
import { GlassPanelComponent } from '../glass-panel/glass-panel.component';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule, GlassPanelComponent],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit, OnDestroy {
  fechaHoraActual = '';
  private cronSubscription: Subscription | null = null;

  // 2. Definimos el "puente" (Output)
  @Output() menuToggle = new EventEmitter<void>();

  private router = inject(Router);
  private auth = inject(AuthService);

  ngOnInit(): void {
    this.actualizarHora();
    this.cronSubscription = interval(1000).subscribe(() => {
      this.actualizarHora();
    });
  }

  ngOnDestroy(): void {
    if (this.cronSubscription) {
      this.cronSubscription.unsubscribe();
    }
  }

  actualizarHora(): void {
    const ahora = new Date();
    this.fechaHoraActual = ahora.toLocaleTimeString('es-CO', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  }

  get esAdmin(): boolean {
    return this.auth.isAdmin();
  }

  toggleMenu(): void {
    if (this.esAdmin) {
      this.menuToggle.emit();
    }
  }

  cerrarSesion(): void {
    this.auth.cerrarSesion();
    this.router.navigate(['/login']);
  }
}