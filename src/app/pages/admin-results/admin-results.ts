import {
  Component,
  DestroyRef,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import {
  ScoredGuess,
  TastingRound,
  WHISKY_FIELD_LABELS,
  WHISKY_FIELDS,
} from '../../models/whisky.models';
import { TastingService } from '../../services/tasting.service';
import { describeError } from '../../utils/errors';
import { copyToClipboard, joinUrlFor } from '../../utils/share';

const REFRESH_INTERVAL_MS = 5000;

@Component({
  selector: 'app-admin-results',
  imports: [DatePipe, RouterLink],
  templateUrl: './admin-results.html',
  styleUrl: './admin-results.scss',
})
export class AdminResults {
  /** Route param, bound via withComponentInputBinding(). */
  readonly id = input.required<string>();

  private readonly tastingService = inject(TastingService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly round = signal<TastingRound | null | undefined>(undefined);
  protected readonly guesses = signal<ScoredGuess[]>([]);
  protected readonly copied = signal(false);
  protected readonly loadError = signal<string | null>(null);
  /** True while the "finish the round?" confirmation modal is open. */
  protected readonly confirmingReveal = signal(false);
  /** Revealing is permanent: it follows the round's finished state. */
  protected readonly revealed = computed(() => !!this.round()?.finishedAt);

  protected readonly fields = WHISKY_FIELDS;
  protected readonly fieldLabels = WHISKY_FIELD_LABELS;

  constructor() {
    queueMicrotask(() => {
      this.loadRound();
      this.refresh();
    });

    // Live-ish leaderboard: poll the store while guests submit.
    const timer = setInterval(() => this.refresh(), REFRESH_INTERVAL_MS);
    this.destroyRef.onDestroy(() => clearInterval(timer));
  }

  protected loadRound(): void {
    this.loadError.set(null);
    this.round.set(undefined);
    this.tastingService.getRound(this.id()).subscribe({
      next: (round) => this.round.set(round ?? null),
      error: (err) => this.loadError.set(describeError(err)),
    });
  }

  protected refresh(): void {
    this.tastingService
      .getScoredGuesses(this.id())
      .subscribe((guesses) => this.guesses.set(guesses));
  }

  protected confirmReveal(): void {
    const round = this.round();
    if (!round) {
      return;
    }
    this.tastingService.finishRound(round.id).subscribe({
      next: () => {
        this.confirmingReveal.set(false);
        // Re-fetch so the local round carries the new finished state.
        this.loadRound();
      },
      error: () => this.confirmingReveal.set(false),
    });
  }

  protected async copyJoinLink(): Promise<void> {
    await copyToClipboard(joinUrlFor(this.id()));
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 2000);
  }
}
