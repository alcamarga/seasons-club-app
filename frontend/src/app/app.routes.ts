import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { RegistroComponent } from './components/registro/registro.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { MenuComponent } from './components/menu/menu.component';
import { AdminDashboardComponent } from './components/admin-dashboard/admin-dashboard.component';
import { ResumenPedidoComponent } from './components/resumen-pedido/resumen-pedido.component';
import { MisPedidosComponent } from './components/mis-pedidos/mis-pedidos.component';
import { GestionPedidosComponent } from './components/admin-dashboard/gestion-pedidos/gestion-pedidos.component';
import { AdminGuard } from './guards/admin.guard';

export const routes: Routes = [
  // 1. Esta es la entrada principal ahora (Pública)
  { path: '', component: MenuComponent, pathMatch: 'full' }, 
  
  // 2. Otras rutas públicas
  { path: 'menu', component: MenuComponent },
  { path: 'login', component: LoginComponent },
  { path: 'registro', component: RegistroComponent },
  
  // 3. Ruta protegida de dashboard de admin
  { path: 'admin/dashboard', component: AdminDashboardComponent, canActivate: [AdminGuard] },
  
  // 4. Ruta protegida (requiere login) - dashboard de usuario
  { path: 'dashboard', component: DashboardComponent },
  { path: 'resumen', component: ResumenPedidoComponent },
  { path: 'mis-pedidos', component: MisPedidosComponent },
  { path: 'admin/pedidos', component: GestionPedidosComponent, canActivate: [AdminGuard] },

  
  // 5. Comodín por si escriben cualquier cosa
  { path: '**', redirectTo: '' }
];
