import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Subscription, interval } from 'rxjs';
import { map } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';
import { GlassPanelComponent } from '../glass-panel/glass-panel.component';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule, GlassPanelComponent],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit, OnDestroy {
  public authSrv = inject(AuthService);
  private router = inject(Router);

  usuarioActual$ = this.authSrv.sesionActiva$.pipe(
    map(sesion => sesion?.usuario ?? null)
  );

  fechaHoraActual = '';
  private cronSubscription: Subscription | null = null;

  ngOnInit(): void {
    this.actualizarHora();
    // Actualizar cada segundo para mantener la hora exacta del turno
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

  cerrarSesion(): void {
    this.authSrv.cerrarSesion();
  }

  irALogin(): void {
    this.router.navigate(['/login']);
  }
}
