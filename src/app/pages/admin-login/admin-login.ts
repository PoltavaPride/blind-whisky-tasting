import { Component, inject, signal } from '@angular/core';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-admin-login',
  imports: [ReactiveFormsModule],
  templateUrl: './admin-login.html',
  styleUrl: './admin-login.scss',
})
export class AdminLogin {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);

  protected readonly loginForm = this.fb.group({
    username: ['', Validators.required],
    password: ['', Validators.required],
  });

  protected readonly rejected = signal(false);
  protected readonly checking = signal(false);

  protected async signIn(): Promise<void> {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }
    this.checking.set(true);
    this.rejected.set(false);
    const { username, password } = this.loginForm.getRawValue();
    const granted = await this.auth.login(username, password);
    this.checking.set(false);

    if (!granted) {
      this.rejected.set(true);
      this.loginForm.controls.password.reset();
      return;
    }
    const returnUrl =
      this.route.snapshot.queryParamMap.get('returnUrl') ?? '/admin';
    this.router.navigateByUrl(returnUrl);
  }

  protected showError(field: 'username' | 'password'): boolean {
    const control = this.loginForm.controls[field];
    return control.invalid && (control.touched || control.dirty);
  }
}
