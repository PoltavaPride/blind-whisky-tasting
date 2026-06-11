import { Component, DestroyRef, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import {
  ScoredGuess,
  TastingRound,
  WHISKY_FIELD_LABELS,
  WHISKY_FIELDS,
} from '../../models/whisky.models';
import { TastingService } from '../../services/tasting.service';
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
  protected readonly bottleRevealed = signal(false);
  protected readonly copied = signal(false);

  protected readonly fields = WHISKY_FIELDS;
  protected readonly fieldLabels = WHISKY_FIELD_LABELS;

  constructor() {
    queueMicrotask(() => {
      this.tastingService
        .getRound(this.id())
        .subscribe((round) => this.round.set(round ?? null));
      this.refresh();
    });

    // Live-ish leaderboard: poll the mock store while guests submit.
    const timer = setInterval(() => this.refresh(), REFRESH_INTERVAL_MS);
    this.destroyRef.onDestroy(() => clearInterval(timer));
  }

  protected refresh(): void {
    this.tastingService
      .getScoredGuesses(this.id())
      .subscribe((guesses) => this.guesses.set(guesses));
  }

  protected async copyJoinLink(): Promise<void> {
    await copyToClipboard(joinUrlFor(this.id()));
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 2000);
  }
}
