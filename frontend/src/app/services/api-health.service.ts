import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { EstadoApiSalud } from '../models/estado-api-salud.model';

// Comunicación HTTP con el backend Flask (salud del API) | HTTP calls to Flask backend (API health)
@Injectable({
  providedIn: 'root',
})
export class ApiHealthService {
  private readonly http = inject(HttpClient);
  private readonly urlSalud = `${environment.apiUrl}/health`;

  obtenerSalud(): Observable<EstadoApiSalud> {
    return this.http.get<EstadoApiSalud>(this.urlSalud);
  }
}
