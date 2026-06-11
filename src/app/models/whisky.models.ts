/**
 * Core domain models for the Blind Whisky Tasting game.
 * These mirror the shape a future REST API would return, so the mock
 * service can be swapped for an HTTP-backed one without touching components.
 */

/** The five guessable attributes of a whisky. */
export interface WhiskyProfile {
  country: string;
  distillery: string;
  age: string;
  caskType: string;
  strength: string;
}

export type WhiskyField = keyof WhiskyProfile;

export const WHISKY_FIELDS: WhiskyField[] = [
  'country',
  'distillery',
  'age',
  'caskType',
  'strength',
];

export const WHISKY_FIELD_LABELS: Record<WhiskyField, string> = {
  country: 'Country',
  distillery: 'Distillery',
  age: 'Age',
  caskType: 'Cask Type',
  strength: 'Strength / ABV',
};

/** One tasting round, created by the admin for a single bottle. */
export interface TastingRound {
  id: string;
  /** Optional private label for the admin, e.g. "Bottle #3 — Friday tasting". */
  label: string;
  bottle: WhiskyProfile;
  createdAt: string; // ISO timestamp
  /**
   * Set when the admin reveals the bottle, which finishes the round and
   * closes it for new guesses. Empty string while the round is active.
   */
  finishedAt: string;
}

/** A participant identity, captured on the join page. */
export interface Participant {
  firstName: string;
  lastName: string;
}

/** A participant's submitted guess for a round. */
export interface Guess extends Participant {
  id: string;
  roundId: string;
  answers: WhiskyProfile;
  submittedAt: string; // ISO timestamp
}

/** A guess enriched with its score, as shown on the admin results page. */
export interface ScoredGuess extends Guess {
  /** 0–5: one point per correctly guessed field. */
  score: number;
  /** Per-field correctness, used to highlight table cells. */
  correctness: Record<WhiskyField, boolean>;
}

/** A distillery entry in the mock dataset. */
export interface DistilleryOption {
  name: string;
  country: string;
  /** Whisky region where meaningful (e.g. Speyside, Islay, Kentucky). */
  region?: string;
}
