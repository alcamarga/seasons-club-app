import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { GlassPanelComponent } from '../glass-panel/glass-panel.component';
import { Producto } from '../../models/producto.model';

@Component({
  selector: 'app-inventario-edit-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, GlassPanelComponent],
  templateUrl: './inventario-edit-modal.component.html',
  styleUrls: ['./inventario-edit-modal.component.css']
})
export class InventarioEditModalComponent implements OnInit {
  @Input() producto!: Producto;
  @Output() save = new EventEmitter<Producto>();
  @Output() close = new EventEmitter<void>();

  form!: FormGroup;
  imagenTemporal: string | null = null;

  // Lista de categorías que el sistema sugiere
  categorias: string[] = ['Licores', 'Cerveza', 'Coctel', 'Insumo', 'Bebidas', 'Snacks'];

  constructor(private fb: FormBuilder) { }

  ngOnInit(): void {
    // Si la categoría del producto no está en nuestra lista predeterminada, la agregamos
    if (this.producto.categoria && !this.categorias.includes(this.producto.categoria)) {
      this.categorias.push(this.producto.categoria);
    }

    this.form = this.fb.group({
      nombre: [this.producto.nombre, [Validators.required, Validators.maxLength(100)]],
      categoria: [this.producto.categoria || '', [Validators.required]],
      precioVenta: [this.producto.precioVenta, [Validators.required, Validators.min(0)]],
      stock: [this.producto.stock, [Validators.required, Validators.min(0)]]
    });
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.imagenTemporal = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  onSave(): void {
    if (this.form.valid) {
      const updated: Producto = {
        ...this.producto,
        ...this.form.value,
        imagenUrl: this.imagenTemporal || this.producto.imagenUrl
      };

      // Si el usuario escribió una categoría nueva, la agregamos a la lista global de sugerencias
      const nuevaCat = this.form.value.categoria;
      if (!this.categorias.includes(nuevaCat)) {
        this.categorias.push(nuevaCat);
      }

      this.save.emit(updated);
    }
  }

  onCancel(): void {
    this.close.emit();
  }
}