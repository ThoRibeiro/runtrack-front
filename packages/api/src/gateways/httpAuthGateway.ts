import type { AuthGateway, Clock, Credentials, Session, SignUpCommand } from '@runtrack/core';
import { subjectOf } from '../auth/jwt';
import type { components } from '../generated/schema';
import type { HttpClient } from '../http/httpClient';

type SessionResponse = components['schemas']['SessionResponse'];
type SignUpResponse = components['schemas']['SignUpResponse'];

/**
 * The server returns `expiresIn` in seconds; the domain wants an absolute
 * instant. Converting here rather than in the domain is deliberate: a relative
 * lifetime is only meaningful next to the clock that received it.
 */
export function toSession(dto: SessionResponse, clock: Clock): Session {
  const accessToken = dto.accessToken ?? '';
  return {
    // `SessionResponse` carries no user id; the token does. See `auth/jwt.ts`.
    userId: subjectOf(accessToken),
    accessToken,
    refreshToken: dto.refreshToken ?? '',
    accessTokenExpiresAt: clock.now() + (dto.expiresIn ?? 0) * 1000,
  };
}

export class HttpAuthGateway implements AuthGateway {
  constructor(
    private readonly http: HttpClient,
    private readonly clock: Clock,
  ) {}

  async signUp(command: SignUpCommand): Promise<void> {
    await this.http.request<SignUpResponse>('/auth/v1/signup', {
      method: 'POST',
      anonymous: true,
      body: {
        handle: command.handle,
        email: command.email,
        displayName: command.displayName,
        password: command.password,
      },
    });
  }

  async logIn(credentials: Credentials): Promise<Session> {
    const dto = await this.http.request<SessionResponse>('/auth/v1/login', {
      method: 'POST',
      anonymous: true,
      body: credentials,
    });
    return toSession(dto, this.clock);
  }

  /**
   * §11: single-use. Nothing here enforces that — `RefreshCoordinator` does,
   * and it is the only thing allowed to call this method.
   */
  async refresh(refreshToken: string): Promise<Session> {
    const dto = await this.http.request<SessionResponse>('/auth/v1/refresh', {
      method: 'POST',
      anonymous: true,
      body: { refreshToken },
    });
    return toSession(dto, this.clock);
  }

  async logOut(refreshToken: string): Promise<void> {
    await this.http.requestVoid('/auth/v1/logout', {
      method: 'POST',
      body: { refreshToken },
    });
  }

  async requestPasswordReset(email: string): Promise<void> {
    await this.http.requestVoid('/auth/v1/password/forgot', {
      method: 'POST',
      anonymous: true,
      body: { email },
    });
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    await this.http.requestVoid('/auth/v1/password/reset', {
      method: 'POST',
      anonymous: true,
      body: { token, newPassword },
    });
  }

  async verifyEmail(token: string): Promise<void> {
    await this.http.requestVoid('/auth/v1/verify-email', {
      anonymous: true,
      query: { token },
    });
  }
}
