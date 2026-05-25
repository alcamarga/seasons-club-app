import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService, PersonalPayload } from '../../services/user.service';
import { Usuario, RolUsuario } from '../../models/usuario.model';

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './usuarios.component.html',
  styleUrls: ['./usuarios.component.css'],
})
export class UsuariosComponent implements OnInit {
  private userService = inject(UserService);

  personal = signal<Usuario[]>([]);
  cargando = false;
  errorMensaje: string | null = null;
  mostrarFormulario = false;
  editandoId: number | null = null;

  rolesDisponibles: RolUsuario[] = ['admin', 'mesero'];

  formulario: PersonalPayload & { password: string } = {
    nombre: '',
    email: '',
    rol: 'mesero',
    password: '',
  };

  ngOnInit(): void {
    this.cargarPersonal();
  }

  cargarPersonal(): void {
    this.cargando = true;
    this.errorMensaje = null;
    this.userService.obtenerPersonal().subscribe({
      next: (lista) => {
        this.personal.set(lista);
        this.cargando = false;
      },
      error: () => {
        this.errorMensaje = 'No se pudo cargar el personal.';
        this.cargando = false;
      },
    });
  }

  abrirNuevo(): void {
    this.editandoId = null;
    this.formulario = { nombre: '', email: '', rol: 'mesero', password: '' };
    this.mostrarFormulario = true;
  }

  abrirEditar(u: Usuario): void {
    this.editandoId = u.id;
    this.formulario = {
      nombre: u.nombre,
      email: u.email,
      rol: u.rol as RolUsuario,
      password: '',
    };
    this.mostrarFormulario = true;
  }

  cerrarFormulario(): void {
    this.mostrarFormulario = false;
    this.editandoId = null;
  }

  guardar(): void {
    if (!this.formulario.nombre?.trim() || !this.formulario.email?.trim()) {
      this.errorMensaje = 'Nombre y email son obligatorios.';
      return;
    }

    this.cargando = true;
    this.errorMensaje = null;

    if (this.editandoId === null) {
      if (!this.formulario.password || this.formulario.password.length < 6) {
        this.errorMensaje = 'La contraseña debe tener al menos 6 caracteres.';
        this.cargando = false;
        return;
      }
      const payload: PersonalPayload = {
        nombre: this.formulario.nombre.trim(),
        email: this.formulario.email.trim().toLowerCase(),
        rol: this.formulario.rol,
        password: this.formulario.password,
      };
      this.userService.crearPersonal(payload).subscribe({
        next: () => {
          this.cerrarFormulario();
          this.cargarPersonal();
        },
        error: (err) => {
          this.errorMensaje = err?.error?.error || 'No se pudo crear el usuario.';
          this.cargando = false;
        },
      });
      return;
    }

    const payload: PersonalPayload = {
      nombre: this.formulario.nombre.trim(),
      email: this.formulario.email.trim().toLowerCase(),
      rol: this.formulario.rol,
    };
    this.userService.actualizarPersonal(this.editandoId, payload).subscribe({
      next: () => {
        if (this.formulario.password?.length >= 6) {
          this.userService.resetPassword(this.editandoId!, this.formulario.password).subscribe({
            next: () => {
              this.cerrarFormulario();
              this.cargarPersonal();
            },
            error: () => {
              this.errorMensaje = 'Usuario actualizado, pero falló el cambio de contraseña.';
              this.cargando = false;
            },
          });
        } else {
          this.cerrarFormulario();
          this.cargarPersonal();
        }
      },
      error: (err) => {
        this.errorMensaje = err?.error?.error || 'No se pudo actualizar el usuario.';
        this.cargando = false;
      },
    });
  }

  cambiarContrasena(u: Usuario): void {
    const nueva = prompt(`Nueva contraseña para ${u.nombre}:`);
    if (!nueva || nueva.length < 6) {
      if (nueva !== null) alert('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    this.userService.resetPassword(u.id, nueva).subscribe({
      next: () => alert('Contraseña actualizada.'),
      error: () => alert('No se pudo cambiar la contraseña.'),
    });
  }

  eliminar(u: Usuario): void {
    if (!confirm(`¿Eliminar a ${u.nombre} (${u.email})?`)) return;
    this.userService.eliminarPersonal(u.id).subscribe({
      next: () => this.cargarPersonal(),
      error: (err) => {
        this.errorMensaje = err?.error?.error || 'No se pudo eliminar el usuario.';
      },
    });
  }
}
