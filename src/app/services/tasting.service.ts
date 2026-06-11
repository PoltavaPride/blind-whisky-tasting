import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import {
  FIREBASE_API_KEY,
  FIRESTORE_BASE_URL,
} from './firebase.config';
import {
  Guess,
  Participant,
  ScoredGuess,
  TastingRound,
  WHISKY_FIELDS,
  WhiskyField,
  WhiskyProfile,
} from '../models/whisky.models';

/** Minimal slice of Firestore's REST document representation. */
interface FirestoreFields {
  [key: string]: {
    stringValue?: string;
    mapValue?: { fields?: FirestoreFields };
  };
}

interface FirestoreDocument {
  name: string;
  fields?: FirestoreFields;
}

interface RunQueryResult {
  document?: FirestoreDocument;
}

/**
 * Persistence layer for tasting rounds and guesses, backed by Cloud
 * Firestore via its REST API so rounds and guesses are shared across all
 * devices. Participant session state (who am I, did I submit) stays local
 * in sessionStorage.
 */
@Injectable({ providedIn: 'root' })
export class TastingService {
  private readonly http = inject(HttpClient);

  // ----- Rounds -------------------------------------------------------

  createRound(bottle: WhiskyProfile, label: string): Observable<TastingRound> {
    const round: TastingRound = {
      id: this.generateId(),
      label,
      bottle,
      createdAt: new Date().toISOString(),
    };
    return this.http
      .post(this.collectionUrl('rounds', round.id), {
        fields: this.roundFields(round),
      })
      .pipe(map(() => round));
  }

  getRound(id: string): Observable<TastingRound | undefined> {
    return this.http.get<FirestoreDocument>(this.docUrl(`rounds/${id}`)).pipe(
      map((doc) => this.decodeRound(doc)),
      catchError(() => of(undefined)),
    );
  }

  getRounds(): Observable<TastingRound[]> {
    return this.http
      .get<{ documents?: FirestoreDocument[] }>(
        `${this.docUrl('rounds')}&pageSize=300`,
      )
      .pipe(
        map((res) =>
          (res.documents ?? [])
            .map((doc) => this.decodeRound(doc))
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
        ),
        catchError(() => of([])),
      );
  }

  /** Removes a round together with all guesses submitted for it. */
  deleteRound(id: string): Observable<void> {
    return this.queryGuesses(id).pipe(
      switchMap((guesses) => {
        const deletions = [
          this.http.delete(this.docUrl(`rounds/${id}`)),
          ...guesses.map((g) => this.http.delete(this.docUrl(`guesses/${g.id}`))),
        ];
        return forkJoin(deletions);
      }),
      map(() => undefined),
    );
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
    return this.http
      .post(this.collectionUrl('guesses', guess.id), {
        fields: this.guessFields(guess),
      })
      .pipe(map(() => guess));
  }

  getGuess(guessId: string): Observable<Guess | undefined> {
    return this.http
      .get<FirestoreDocument>(this.docUrl(`guesses/${guessId}`))
      .pipe(
        map((doc) => this.decodeGuess(doc)),
        catchError(() => of(undefined)),
      );
  }

  /**
   * All guesses for a round, scored (1 point per correct field) and sorted
   * best score first; ties broken by earliest submission.
   */
  getScoredGuesses(roundId: string): Observable<ScoredGuess[]> {
    return forkJoin({
      round: this.getRound(roundId),
      guesses: this.queryGuesses(roundId),
    }).pipe(
      map(({ round, guesses }) => {
        if (!round) {
          return [];
        }
        return guesses
          .map((g) => this.scoreGuess(round.bottle, g))
          .sort(
            (a, b) =>
              b.score - a.score || a.submittedAt.localeCompare(b.submittedAt),
          );
      }),
    );
  }

  private queryGuesses(roundId: string): Observable<Guess[]> {
    const body = {
      structuredQuery: {
        from: [{ collectionId: 'guesses' }],
        where: {
          fieldFilter: {
            field: { fieldPath: 'roundId' },
            op: 'EQUAL',
            value: { stringValue: roundId },
          },
        },
      },
    };
    return this.http
      .post<RunQueryResult[]>(
        `${FIRESTORE_BASE_URL}:runQuery?key=${FIREBASE_API_KEY}`,
        body,
      )
      .pipe(
        map((results) =>
          results
            .filter((r) => r.document)
            .map((r) => this.decodeGuess(r.document!)),
        ),
        catchError(() => of([])),
      );
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

  // ----- Firestore encoding/decoding -----------------------------------

  private docUrl(path: string): string {
    return `${FIRESTORE_BASE_URL}/${path}?key=${FIREBASE_API_KEY}`;
  }

  private collectionUrl(collection: string, documentId: string): string {
    return `${FIRESTORE_BASE_URL}/${collection}?documentId=${documentId}&key=${FIREBASE_API_KEY}`;
  }

  private roundFields(round: TastingRound): FirestoreFields {
    return {
      label: { stringValue: round.label },
      createdAt: { stringValue: round.createdAt },
      bottle: { mapValue: { fields: this.profileFields(round.bottle) } },
    };
  }

  private guessFields(guess: Guess): FirestoreFields {
    return {
      roundId: { stringValue: guess.roundId },
      firstName: { stringValue: guess.firstName },
      lastName: { stringValue: guess.lastName },
      submittedAt: { stringValue: guess.submittedAt },
      answers: { mapValue: { fields: this.profileFields(guess.answers) } },
    };
  }

  private profileFields(profile: WhiskyProfile): FirestoreFields {
    return Object.fromEntries(
      WHISKY_FIELDS.map((field) => [field, { stringValue: profile[field] }]),
    );
  }

  private decodeRound(doc: FirestoreDocument): TastingRound {
    return {
      id: this.idFromName(doc.name),
      label: this.str(doc.fields, 'label'),
      createdAt: this.str(doc.fields, 'createdAt'),
      bottle: this.decodeProfile(doc.fields?.['bottle']?.mapValue?.fields),
    };
  }

  private decodeGuess(doc: FirestoreDocument): Guess {
    return {
      id: this.idFromName(doc.name),
      roundId: this.str(doc.fields, 'roundId'),
      firstName: this.str(doc.fields, 'firstName'),
      lastName: this.str(doc.fields, 'lastName'),
      submittedAt: this.str(doc.fields, 'submittedAt'),
      answers: this.decodeProfile(doc.fields?.['answers']?.mapValue?.fields),
    };
  }

  private decodeProfile(fields?: FirestoreFields): WhiskyProfile {
    return Object.fromEntries(
      WHISKY_FIELDS.map((field) => [field, this.str(fields, field)]),
    ) as unknown as WhiskyProfile;
  }

  private str(fields: FirestoreFields | undefined, key: string): string {
    return fields?.[key]?.stringValue ?? '';
  }

  private idFromName(name: string): string {
    return name.split('/').pop() ?? '';
  }

  private generateId(): string {
    return crypto.randomUUID().split('-')[0];
  }
}
