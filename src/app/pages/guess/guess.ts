import {
  Component,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { WhiskyFields } from '../../components/whisky-fields/whisky-fields';
import {
  Guess as GuessModel,
  Participant,
  TastingRound,
  WHISKY_FIELD_LABELS,
  WHISKY_FIELDS,
} from '../../models/whisky.models';
import { TastingService } from '../../services/tasting.service';
import { describeError } from '../../utils/errors';
import { createWhiskyProfileGroup } from '../../utils/whisky-form';

@Component({
  selector: 'app-guess',
  imports: [ReactiveFormsModule, WhiskyFields],
  templateUrl: './guess.html',
  styleUrl: './guess.scss',
})
export class Guess {
  /** Route param, bound via withComponentInputBinding(). */
  readonly id = input.required<string>();

  private readonly fb = inject(NonNullableFormBuilder);
  private readonly router = inject(Router);
  private readonly tastingService = inject(TastingService);

  protected readonly guessForm = createWhiskyProfileGroup(this.fb);

  protected readonly round = signal<TastingRound | null | undefined>(undefined);
  protected readonly participant = signal<Participant | null>(null);
  protected readonly submittedGuess = signal<GuessModel | null>(null);
  protected readonly loadError = signal<string | null>(null);

  protected readonly fields = WHISKY_FIELDS;
  protected readonly fieldLabels = WHISKY_FIELD_LABELS;

  constructor() {
    effect(() => {
      const id = this.id();
      untracked(() => this.init(id));
    });
  }

  private init(roundId: string): void {
    const participant = this.tastingService.getParticipant(roundId);
    if (!participant) {
      // Not introduced yet — send the participant through the join flow first.
      this.router.navigate(['/tasting', roundId, 'join']);
      return;
    }
    this.participant.set(participant);
    this.loadRound(roundId);

    // If this device already submitted, show the confirmation right away.
    const guessId = this.tastingService.getSubmittedGuessId(roundId);
    if (guessId) {
      this.tastingService
        .getGuess(guessId)
        .subscribe((guess) => this.submittedGuess.set(guess ?? null));
    }
  }

  protected retry(): void {
    this.loadRound(this.id());
  }

  private loadRound(roundId: string): void {
    this.loadError.set(null);
    this.round.set(undefined);
    this.tastingService.getRound(roundId).subscribe({
      next: (round) => this.round.set(round ?? null),
      error: (err) => this.loadError.set(describeError(err)),
    });
  }

  protected submit(): void {
    const participant = this.participant();
    if (!participant) {
      return;
    }
    if (this.guessForm.invalid) {
      this.guessForm.markAllAsTouched();
      return;
    }
    // Re-check the round right before submitting: the host may have
    // finished it while this form was open.
    this.tastingService.getRound(this.id()).subscribe({
      next: (round) => {
        this.round.set(round ?? null);
        if (!round || round.finishedAt) {
          return; // template switches to the "round finished" state
        }
        this.tastingService
          .submitGuess(this.id(), participant, this.guessForm.getRawValue())
          .subscribe({
            next: (guess) => {
              this.tastingService.markSubmitted(this.id(), guess.id);
              this.submittedGuess.set(guess);
            },
            error: (err) => this.loadError.set(describeError(err)),
          });
      },
      error: (err) => this.loadError.set(describeError(err)),
    });
  }
}
