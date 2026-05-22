import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subscription, interval } from 'rxjs';
import { GlassPanelComponent } from '../glass-panel/glass-panel.component';

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

  ngOnInit(): void {
    this.actualizarHora();
    // Actualizar cada segundo para mantener la hora exacta en pantalla
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
}
