import { Routes } from '@angular/router';
import { MesasComponent } from './components/mesas/mesas.component';
import { LoginComponent } from './components/login/login.component';
import { RegistroComponent } from './components/registro/registro.component';
import { MisPedidosComponent } from './components/mis-pedidos/mis-pedidos.component';
import { ResumenPedidoComponent } from './components/resumen-pedido/resumen-pedido.component';
import { AdminGuard } from './guards/admin.guard';

export const routes: Routes = [
  // 1. La entrada principal del bar ahora es el mapa de mesas táctil
  { path: '', component: MesasComponent, pathMatch: 'full' },

  // 2. Otras rutas públicas del bar
  { path: 'login', component: LoginComponent },
  { path: 'registro', component: RegistroComponent },

  // 3. Rutas de pedidos que adaptaremos para las botellas y cócteles
  { path: 'resumen', component: ResumenPedidoComponent },
  { path: 'mis-pedidos', component: MisPedidosComponent },

  // 5. Comodín: si escriben cualquier cosa loca en la URL, los manda a las mesas
  { path: '**', redirectTo: '' }
];