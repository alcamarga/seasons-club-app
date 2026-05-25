import { Routes } from '@angular/router';
import { MesasComponent } from './components/mesas/mesas.component';
import { LoginComponent } from './components/login/login.component';
import { RegistroComponent } from './components/registro/registro.component';
import { MisPedidosComponent } from './components/mis-pedidos/mis-pedidos.component';
import { ResumenPedidoComponent } from './components/resumen-pedido/resumen-pedido.component';
import { InventarioComponent } from './components/inventario/inventario.component';
import { HistorialVentasComponent } from './components/historial-ventas/historial-ventas.component';
import { CierreCajaComponent } from './components/cierre-caja/cierre-caja.component';
import { UsuariosComponent } from './components/usuarios/usuarios.component';
import { adminGuard } from './guards/admin.guard';
import { authGuard } from './guards/auth.guard';

const rutasSoloAdmin = [authGuard, adminGuard];

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'registro', component: RegistroComponent },
  { path: 'mesas', component: MesasComponent, canActivate: [authGuard] },
  { path: 'inventario', component: InventarioComponent, canActivate: rutasSoloAdmin },
  { path: 'historial-ventas', component: HistorialVentasComponent, canActivate: rutasSoloAdmin },
  { path: 'cierre-caja', component: CierreCajaComponent, canActivate: rutasSoloAdmin },
  { path: 'usuarios', component: UsuariosComponent, canActivate: rutasSoloAdmin },
  { path: 'resumen', component: ResumenPedidoComponent, canActivate: [authGuard] },
  { path: 'mis-pedidos', component: MisPedidosComponent, canActivate: [authGuard] },
  { path: '**', redirectTo: '/login' },
];
