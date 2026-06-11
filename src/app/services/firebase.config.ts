/**
 * Firebase project identifiers for the Firestore REST API.
 * The apiKey is a public project identifier, not a secret — access control
 * is enforced by Firestore security rules.
 */
export const FIREBASE_PROJECT_ID = 'blind-whisky-tasting';
export const FIREBASE_API_KEY = 'AIzaSyCOTCIJn1-qjwSayNc-aevX7Z3xByvYuAk';

export const FIRESTORE_BASE_URL =
  `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}` +
  `/databases/(default)/documents`;
