// Componente de inicio de sesión con formularios reactivos.
// Autor: Camilo Martinez
// Fecha: 24/05/2026
// Estética: Seasons Club - Black & Neon

import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { LoginCargaUtil } from '../../models/usuario.model';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  formulario: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    contrasena: ['', [Validators.required, Validators.minLength(6)]]
  });

  enviando = false;
  errorMensaje: string | null = null;

  get email() { return this.formulario.get('email')!; }
  get contrasena() { return this.formulario.get('contrasena')!; }

  ngOnInit(): void {
    // Seguridad: Al entrar al login, limpiamos cualquier residuo anterior
    this.auth.limpiarSesion();
    localStorage.clear();
  }

  iniciarSesion(): void { 
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    this.enviando = true;
    this.errorMensaje = null;

    const payload: LoginCargaUtil = this.formulario.value as LoginCargaUtil;

    this.auth.iniciarSesion(payload).subscribe({
      next: (respuesta) => {
        const usuario = respuesta.usuario;
        
        const rol = (usuario.rol || '').toLowerCase();
        if (rol === 'admin' || rol === 'mesero') {
          this.router.navigate(['/mesas']);
        } else {
          this.router.navigate(['/mis-pedidos']);
        }
      },
      error: (err) => {
        this.enviando = false;
        this.errorMensaje = 'Credenciales incorrectas o error de conexión.';
      }
    });
  }
}