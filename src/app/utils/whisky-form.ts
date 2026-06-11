import {
  FormControl,
  FormGroup,
  NonNullableFormBuilder,
  Validators,
} from '@angular/forms';

/** Typed reactive form group for the five guessable whisky attributes. */
export type WhiskyProfileForm = {
  country: FormControl<string>;
  distillery: FormControl<string>;
  age: FormControl<string>;
  caskType: FormControl<string>;
  strength: FormControl<string>;
};

export function createWhiskyProfileGroup(
  fb: NonNullableFormBuilder,
): FormGroup<WhiskyProfileForm> {
  return fb.group({
    country: ['', Validators.required],
    distillery: ['', Validators.required],
    age: ['', Validators.required],
    caskType: ['', Validators.required],
    strength: ['', Validators.required],
  });
}
