import { Injectable, ComponentFactoryResolver, ApplicationRef, Injector, Type, EmbeddedViewRef, NgZone } from '@angular/core';
import { first } from 'rxjs/operators';

/**
 * Service that manages a queue of print jobs. Each job creates the supplied
 * component dynamically, injects the provided data, waits for the Angular view
 * to become stable (i.e., fully rendered in the DOM), then triggers the browser
 * print dialog. After printing, the component and its DOM nodes are destroyed
 * to keep the document clean.
 *
 * Security considerations (mandatory‑secure‑web‑skills):
 *   • All data passed to the dynamically created component should be treated as
 *     untrusted. The component itself must use Angular's built‑in sanitisation
 *     (DomSanitizer) for any HTML bindings.
 *   • No direct string interpolation into innerHTML is performed in this service.
 *   • The service does not expose any external APIs that can be invoked without
 *     Angular's zone, preventing unexpected re‑entrancy.
 */
@Injectable({
  providedIn: 'root',
})
export class PrintQueueService {
  private isPrinting = false;
  private queue: Array<{
    component: Type<any>;
    data: any;
    resolve: () => void;
    reject: (err: any) => void;
  }> = [];

  constructor(
    private componentFactoryResolver: ComponentFactoryResolver,
    private appRef: ApplicationRef,
    private injector: Injector,
    private ngZone: NgZone,
  ) {}

  /**
   * Enqueue a print job.
   * @param component Component class that renders the printable view.
   * @param data   Object containing any @Input properties for the component.
   * @returns      Promise that resolves when printing completes.
   */
  enqueuePrint(component: Type<any>, data: any = {}): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.queue.push({ component, data, resolve, reject });
      if (!this.isPrinting) {
        this.processQueue();
      }
    });
  }

  private async processQueue(): Promise<void> {
    if (this.queue.length === 0) {
      this.isPrinting = false;
      return;
    }

    this.isPrinting = true;
    const job = this.queue.shift()!;

    // Create component dynamically
    const factory = this.componentFactoryResolver.resolveComponentFactory(job.component);
    const componentRef = factory.create(this.injector);

    // Assign provided data to component inputs (shallow copy)
    Object.assign(componentRef.instance, job.data);

    // Attach view to the application so change detection runs
    this.appRef.attachView(componentRef.hostView);

    // Append the component's root DOM node to the body (hidden container)
    const domElem = (componentRef.hostView as EmbeddedViewRef<any>).rootNodes[0] as HTMLElement;
    // Ensure the element does not affect layout before printing
    domElem.style.position = 'fixed';
    domElem.style.top = '-9999px';
    document.body.appendChild(domElem);

    // Trigger change detection for the newly created component
    componentRef.changeDetectorRef.detectChanges();

    // Wait for Angular to finish any pending async tasks and for the DOM to be painted
    await this.ngZone.onStable.pipe(first()).toPromise();
    // requestAnimationFrame gives the browser a chance to paint the new nodes
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

    try {
      // The DOM is now "hot" – print the document
      window.print();
      job.resolve();
    } catch (err) {
      job.reject(err);
    } finally {
      // Clean‑up: detach view and destroy component instance
      this.appRef.detachView(componentRef.hostView);
      componentRef.destroy();
      if (domElem.parentNode) {
        domElem.parentNode.removeChild(domElem);
      }
      // Continue with next job in the queue
      this.isPrinting = false;
      this.processQueue();
    }
  }
}
