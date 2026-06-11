import { Injectable, signal } from '@angular/core';

const SESSION_KEY = 'bwt.admin.session';
const SALT = 'bwt::auth::v1::';

/**
 * Admin credentials, stored only as salted SHA-256 digests. The plaintext
 * never appears in the source or the compiled bundle — login input is
 * hashed with the same salt and compared against these digests, so the
 * values cannot be read back out of the code.
 */
const USERNAME_HASH =
  'c6a9fc9fe6d6e863e657796ba4e242f631db777634c82e50183f96b64daa5103';
const PASSWORD_HASH =
  '3d7b5a8e27c2e3165da4d4e70ec99b48820b6a76b39fd1a8465b997627af2c91';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly authed = signal(
    sessionStorage.getItem(SESSION_KEY) === 'granted',
  );

  /** Reactive auth state, e.g. for showing the sign-out button. */
  readonly isAuthenticated = this.authed.asReadonly();

  async login(username: string, password: string): Promise<boolean> {
    const [usernameHash, passwordHash] = await Promise.all([
      this.sha256(SALT + username),
      this.sha256(SALT + password),
    ]);
    const granted =
      usernameHash === USERNAME_HASH && passwordHash === PASSWORD_HASH;
    if (granted) {
      sessionStorage.setItem(SESSION_KEY, 'granted');
      this.authed.set(true);
    }
    return granted;
  }

  logout(): void {
    sessionStorage.removeItem(SESSION_KEY);
    this.authed.set(false);
  }

  private async sha256(value: string): Promise<string> {
    const bytes = new TextEncoder().encode(value);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
}
