import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { GlassPanelComponent } from '../glass-panel/glass-panel.component';
import { Producto } from '../../models/producto.model';

export interface GuardarProductoEvento {
  producto: Producto;
  archivo?: File;
}

@Component({
  selector: 'app-inventario-edit-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, GlassPanelComponent],
  templateUrl: './inventario-edit-modal.component.html',
  styleUrls: ['./inventario-edit-modal.component.css']
})
export class InventarioEditModalComponent implements OnInit, OnDestroy {
  @Input() producto!: Producto;
  @Output() save = new EventEmitter<GuardarProductoEvento>();
  @Output() close = new EventEmitter<void>();

  form!: FormGroup;
  imagenTemporal: string | null = null;
  archivoPendiente: File | null = null;
  categorias: string[] = ['Licores', 'Cerveza', 'Coctel', 'Insumo', 'Bebidas', 'Snacks'];

  constructor(private fb: FormBuilder) { }

  ngOnInit(): void {
    if (this.producto.categoria && !this.categorias.includes(this.producto.categoria)) {
      this.categorias.push(this.producto.categoria);
    }

    this.form = this.fb.group({
      nombre: [this.producto.nombre, [Validators.required, Validators.maxLength(100)]],
      categoria: [this.producto.categoria || '', [Validators.required]],
      precioCompra: [this.producto.precioCompra ?? 0, [Validators.required, Validators.min(0)]],
      precioVenta: [this.producto.precioVenta, [Validators.required, Validators.min(0)]],
      stock: [this.producto.stock, [Validators.required, Validators.min(0)]]
    });
  }

  ngOnDestroy(): void {
    if (this.imagenTemporal?.startsWith('blob:')) {
      URL.revokeObjectURL(this.imagenTemporal);
    }
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.archivoPendiente = file;
      if (this.imagenTemporal?.startsWith('blob:')) {
        URL.revokeObjectURL(this.imagenTemporal);
      }
      this.imagenTemporal = URL.createObjectURL(file);
    }
  }

  onSave(): void {
    if (this.form.valid) {
      const precioCompra = Number(this.form.value.precioCompra ?? 0);
      const precioVenta = Number(this.form.value.precioVenta ?? 0);

      const updated: Producto = {
        ...this.producto,
        nombre: String(this.form.value.nombre ?? '').trim(),
        categoria: String(this.form.value.categoria ?? '').trim(),
        precioCompra,
        precioVenta,
        costoUnitario: precioCompra,
        stock: Number(this.form.value.stock ?? 0),
        imagenUrl: this.producto.imagenUrl || '',
      };

      const nuevaCat = this.form.value.categoria;
      if (!this.categorias.includes(nuevaCat)) {
        this.categorias.push(nuevaCat);
      }

      this.save.emit({
        producto: updated,
        archivo: this.archivoPendiente || undefined,
      });
    }
  }

  onCancel(): void {
    this.close.emit();
  }
}
