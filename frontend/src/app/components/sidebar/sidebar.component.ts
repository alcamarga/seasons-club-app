import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent {
  private auth = inject(AuthService);

  @Input() isOpen = false;
  @Output() close = new EventEmitter<void>();

  get esAdmin(): boolean {
    return this.auth.isAdmin();
  }

  cerrar() {
    this.close.emit();
  }
}