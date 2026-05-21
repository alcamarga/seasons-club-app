import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InventarioService } from '../../services/inventario.service';

@Component({
  selector: 'app-inventario',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './inventario.component.html',
  styleUrls: ['./inventario.component.css']
})
export class InventarioComponent implements OnInit {
  productos: any[] = [];
  abierto: boolean = false; // <--- ¡AQUÍ ESTÁ LA MAGIA! Agrega esta línea.

  constructor(private inventarioService: InventarioService) {}

  ngOnInit() {
    this.cargarProductos();
  }

  cargarProductos() {
    this.inventarioService.getProductos().subscribe(data => {
      this.productos = data;
    });
  }

  ajustarStock(producto: any, cantidad: number) {
    this.inventarioService.actualizarStock(producto.id, cantidad).subscribe(() => {
      this.cargarProductos();
    });
  }
}