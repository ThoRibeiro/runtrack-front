import type { Session } from '../domain/session';

export interface Credentials {
  email: string;
  password: string;
}

export interface SignUpCommand extends Credentials {
  handle: string;
  displayName: string;
}

export interface AuthGateway {
  signUp(command: SignUpCommand): Promise<void>;
  logIn(credentials: Credentials): Promise<Session>;
  /** Single-use: the caller must guarantee one call in flight (§11). */
  refresh(refreshToken: string): Promise<Session>;
  logOut(refreshToken: string): Promise<void>;
  requestPasswordReset(email: string): Promise<void>;
  resetPassword(token: string, newPassword: string): Promise<void>;
  verifyEmail(token: string): Promise<void>;
}
