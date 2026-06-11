import { Component, computed, inject, input, signal } from '@angular/core';
import {
  FormControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { TastingRound } from '../../models/whisky.models';
import { TastingService } from '../../services/tasting.service';

@Component({
  selector: 'app-join',
  imports: [ReactiveFormsModule],
  templateUrl: './join.html',
  styleUrl: './join.scss',
})
export class Join {
  /** Route param, bound via withComponentInputBinding(). */
  readonly id = input.required<string>();

  private readonly fb = inject(NonNullableFormBuilder);
  private readonly router = inject(Router);
  private readonly tastingService = inject(TastingService);

  protected readonly joinForm = this.fb.group({
    firstName: [
      '',
      [Validators.required, Validators.minLength(2), Validators.maxLength(30)],
    ],
    lastName: [
      '',
      [Validators.required, Validators.minLength(2), Validators.maxLength(30)],
    ],
  });

  protected readonly round = signal<TastingRound | null | undefined>(undefined);
  protected readonly loading = computed(() => this.round() === undefined);

  constructor() {
    // input() values are available once the component is created by the router.
    queueMicrotask(() =>
      this.tastingService
        .getRound(this.id())
        .subscribe((round) => this.round.set(round ?? null)),
    );
  }

  protected join(): void {
    if (this.joinForm.invalid) {
      this.joinForm.markAllAsTouched();
      return;
    }
    this.tastingService.setParticipant(this.id(), this.joinForm.getRawValue());
    this.router.navigate(['/tasting', this.id(), 'guess']);
  }

  protected nameError(field: 'firstName' | 'lastName'): string | null {
    const control: FormControl<string> = this.joinForm.controls[field];
    if (control.valid || (!control.touched && !control.dirty)) {
      return null;
    }
    const label = field === 'firstName' ? 'First name' : 'Last name';
    if (control.hasError('required')) {
      return `${label} is required.`;
    }
    if (control.hasError('minlength')) {
      return `${label} needs at least 2 characters.`;
    }
    return `${label} must stay under 30 characters.`;
  }
}
