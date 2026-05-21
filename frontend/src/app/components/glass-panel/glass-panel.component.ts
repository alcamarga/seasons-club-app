import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-glass-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './glass-panel.component.html',
  styleUrls: ['./glass-panel.component.scss']
})
export class GlassPanelComponent {
  @Input() interactive: boolean = false;
  @Input() class: string = '';
}
