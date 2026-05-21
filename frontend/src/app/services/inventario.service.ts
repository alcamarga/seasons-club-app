import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class InventarioService {
  private apiUrl = `${environment.apiUrl}/productos`;

  constructor(private http: HttpClient) {}

  getProductos() {
    return this.http.get<any[]>(this.apiUrl);
  }

  actualizarStock(id: number, cantidad: number) {
    return this.http.patch(`${this.apiUrl}/${id}/stock`, { cantidad });
  }
}