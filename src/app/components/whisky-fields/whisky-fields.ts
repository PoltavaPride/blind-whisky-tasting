import { Component, computed, effect, input, signal } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import {
  AGES,
  CASK_TYPES,
  COUNTRIES,
  DISTILLERIES,
  STRENGTHS,
} from '../../data/whisky-data';
import { WhiskyProfileForm } from '../../utils/whisky-form';

/**
 * The five whisky attribute selects, shared between the admin's
 * "create bottle" form and the participant's guessing form.
 * The distillery list narrows to the selected country.
 */
@Component({
  selector: 'app-whisky-fields',
  imports: [ReactiveFormsModule],
  templateUrl: './whisky-fields.html',
})
export class WhiskyFields {
  readonly group = input.required<FormGroup<WhiskyProfileForm>>();

  protected readonly countries = COUNTRIES;
  protected readonly ages = AGES;
  protected readonly caskTypes = CASK_TYPES;
  protected readonly strengths = STRENGTHS;

  private readonly selectedCountry = signal('');

  protected readonly distilleries = computed(() => {
    const country = this.selectedCountry();
    return country
      ? DISTILLERIES.filter((d) => d.country === country)
      : DISTILLERIES;
  });

  constructor() {
    effect((onCleanup) => {
      const group = this.group();
      this.selectedCountry.set(group.controls.country.value);
      const sub = group.controls.country.valueChanges.subscribe((country) => {
        this.selectedCountry.set(country);
        // A country change invalidates the previous distillery pick.
        group.controls.distillery.reset('');
      });
      onCleanup(() => sub.unsubscribe());
    });
  }

  protected showError(field: keyof WhiskyProfileForm): boolean {
    const control = this.group().controls[field];
    return control.invalid && (control.touched || control.dirty);
  }
}
