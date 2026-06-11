import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import {
  Guess,
  Participant,
  ScoredGuess,
  TastingRound,
  WHISKY_FIELDS,
  WhiskyField,
  WhiskyProfile,
} from '../models/whisky.models';

const ROUNDS_KEY = 'bwt.rounds';
const GUESSES_KEY = 'bwt.guesses';

/**
 * Mock persistence layer for tasting rounds and guesses, backed by
 * localStorage. Every method returns an Observable so the implementation
 * can be replaced with an HttpClient-based service without changing any
 * component code.
 */
@Injectable({ providedIn: 'root' })
export class TastingService {
  // ----- Rounds -------------------------------------------------------

  createRound(bottle: WhiskyProfile, label: string): Observable<TastingRound> {
    const round: TastingRound = {
      id: this.generateId(),
      label,
      bottle,
      createdAt: new Date().toISOString(),
    };
    this.write(ROUNDS_KEY, [...this.readRounds(), round]);
    return of(round);
  }

  getRound(id: string): Observable<TastingRound | undefined> {
    return of(this.readRounds().find((r) => r.id === id));
  }

  getRounds(): Observable<TastingRound[]> {
    return of(
      [...this.readRounds()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    );
  }

  /** Removes a round together with all guesses submitted for it. */
  deleteRound(id: string): Observable<void> {
    this.write(
      ROUNDS_KEY,
      this.readRounds().filter((r) => r.id !== id),
    );
    this.write(
      GUESSES_KEY,
      this.readGuesses().filter((g) => g.roundId !== id),
    );
    return of(undefined);
  }

  // ----- Guesses ------------------------------------------------------

  submitGuess(
    roundId: string,
    participant: Participant,
    answers: WhiskyProfile,
  ): Observable<Guess> {
    const guess: Guess = {
      id: this.generateId(),
      roundId,
      firstName: participant.firstName.trim(),
      lastName: participant.lastName.trim(),
      answers,
      submittedAt: new Date().toISOString(),
    };
    this.write(GUESSES_KEY, [...this.readGuesses(), guess]);
    return of(guess);
  }

  getGuess(guessId: string): Observable<Guess | undefined> {
    return of(this.readGuesses().find((g) => g.id === guessId));
  }

  /**
   * All guesses for a round, scored (1 point per correct field) and sorted
   * best score first; ties broken by earliest submission.
   */
  getScoredGuesses(roundId: string): Observable<ScoredGuess[]> {
    const round = this.readRounds().find((r) => r.id === roundId);
    if (!round) {
      return of([]);
    }
    const scored = this.readGuesses()
      .filter((g) => g.roundId === roundId)
      .map((g) => this.scoreGuess(round.bottle, g))
      .sort(
        (a, b) =>
          b.score - a.score || a.submittedAt.localeCompare(b.submittedAt),
      );
    return of(scored);
  }

  private scoreGuess(bottle: WhiskyProfile, guess: Guess): ScoredGuess {
    const correctness = {} as Record<WhiskyField, boolean>;
    let score = 0;
    for (const field of WHISKY_FIELDS) {
      const correct = guess.answers[field] === bottle[field];
      correctness[field] = correct;
      if (correct) {
        score++;
      }
    }
    return { ...guess, score, correctness };
  }

  // ----- Participant session (identity / submission state) -------------

  setParticipant(roundId: string, participant: Participant): void {
    sessionStorage.setItem(
      `bwt.participant.${roundId}`,
      JSON.stringify({
        firstName: participant.firstName.trim(),
        lastName: participant.lastName.trim(),
      }),
    );
  }

  getParticipant(roundId: string): Participant | null {
    const raw = sessionStorage.getItem(`bwt.participant.${roundId}`);
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as Participant;
    } catch {
      return null;
    }
  }

  markSubmitted(roundId: string, guessId: string): void {
    sessionStorage.setItem(`bwt.submitted.${roundId}`, guessId);
  }

  getSubmittedGuessId(roundId: string): string | null {
    return sessionStorage.getItem(`bwt.submitted.${roundId}`);
  }

  // ----- Storage helpers ------------------------------------------------

  private readRounds(): TastingRound[] {
    return this.read<TastingRound>(ROUNDS_KEY);
  }

  private readGuesses(): Guess[] {
    return this.read<Guess>(GUESSES_KEY);
  }

  private read<T>(key: string): T[] {
    try {
      return JSON.parse(localStorage.getItem(key) ?? '[]') as T[];
    } catch {
      return [];
    }
  }

  private write(key: string, value: unknown): void {
    localStorage.setItem(key, JSON.stringify(value));
  }

  private generateId(): string {
    return crypto.randomUUID().split('-')[0];
  }
}
