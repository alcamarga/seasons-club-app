// Componente de registro de nuevos usuarios.
// Autor: Camilo Martinez
// Fecha: 15/04/2026
// Estética: Crema/Dorado con transparencia y bordes redondeados

import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { RegistroCargaUtil } from '../../models/usuario.model';

@Component({
  selector: 'app-registro',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './registro.component.html',
  styleUrls: ['./registro.component.css']
})
export class RegistroComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  // Formulario con nombre, email y contraseña | Form with name, email and password
  formulario: FormGroup = this.fb.group({
    nombre: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    contrasena: ['', [Validators.required, Validators.minLength(6)]]
  });

  enviando = false;
  errorMensaje: string | null = null;

  // Accesos rápidos para el template | Quick access for template
  get nombre() { return this.formulario.get('nombre')!; }
  get email() { return this.formulario.get('email')!; }
  get contrasena() { return this.formulario.get('contrasena')!; }

  // Envía el formulario al AuthService y redirige al dashboard si es exitoso
  // Sends form to AuthService and redirects to dashboard on success
  registrar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    this.enviando = true;
    this.errorMensaje = null;

    const payload: RegistroCargaUtil = this.formulario.value as RegistroCargaUtil;

    this.auth.registrarUsuario(payload).subscribe({
      next: () => {
        this.enviando = false;
        // Redirigir al menú (página principal) | Redirect to menu (main page)
        this.router.navigate(['/menu']);
      },
      error: (err: { status: number }) => {
        this.enviando = false;
        this.errorMensaje = err.status === 409
          ? 'Este correo ya está registrado. Intenta iniciar sesión.'
          : 'Error al registrar. Intenta de nuevo más tarde.';
      }
    });
  }
}
