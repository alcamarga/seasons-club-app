import { Component, Input, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Printable component used by PrintQueueService.
 * It exposes a `rendered` promise that resolves when the view has been fully
 * initialised (after Angular has performed change detection). This allows the
 * service to await the DOM being "hot" before calling `window.print()`.
 */
@Component({
  selector: 'app-factura-print',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './factura-print.component.html',
  styleUrls: ['./factura-print.component.css']
})
export class FacturaPrintComponent implements AfterViewInit {
  @Input() factura: any;

  private _renderedResolve!: () => void;
  /** Promise that resolves when the component view has been rendered. */
  public rendered: Promise<void> = new Promise<void>((resolve) => {
    this._renderedResolve = resolve;
  });

  constructor(private cd: ChangeDetectorRef) {}

  ngAfterViewInit(): void {
    // Ensure any pending bindings are applied before signalling readiness.
    this.cd.detectChanges();
    this._renderedResolve();
  }

  // Retained for backward compatibility – not used by the new service.
  imprimir(): void {
    window.print();
  }
}