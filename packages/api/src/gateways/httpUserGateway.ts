import type {
  MyProfile,
  Physiology,
  RunnerTotals,
  StatsPeriod,
  UserGateway,
  Visibility,
} from '@runtrack/core';
import type { components } from '../generated/schema';
import type { HttpClient } from '../http/httpClient';
import { toMyProfile, toPhysiology, toRunnerTotals } from '../mappers/user';

type MyProfileDto = components['schemas']['MyProfile'];
type PhysiologyDto = components['schemas']['PhysiologyPayload'];
type TotalsDto = components['schemas']['RunnerTotalsResponse'];

export class HttpUserGateway implements UserGateway {
  constructor(private readonly http: HttpClient) {}

  async me(): Promise<MyProfile> {
    return toMyProfile(await this.http.request<MyProfileDto>('/user/v1/me'));
  }

  async updateProfile(update: {
    displayName?: string | undefined;
    bio?: string | undefined;
  }): Promise<MyProfile> {
    return toMyProfile(
      await this.http.request<MyProfileDto>('/user/v1/me', { method: 'PATCH', body: update }),
    );
  }

  async changeHandle(handle: string): Promise<MyProfile> {
    await this.http.requestVoid('/user/v1/me/handle', { method: 'PUT', body: { handle } });
    return this.me();
  }

  async changeAvatar(url: string): Promise<MyProfile> {
    await this.http.requestVoid('/user/v1/me/avatar', {
      method: 'PUT',
      body: { avatarUrl: url },
    });
    return this.me();
  }

  async updatePhysiology(physiology: Physiology): Promise<Physiology> {
    const dto = await this.http.request<PhysiologyDto>('/user/v1/me/physiology', {
      method: 'PUT',
      body: {
        birthDate: physiology.birthDate,
        biologicalSex: physiology.biologicalSex,
        weightKilograms: physiology.weightKilograms,
        heightCentimeters: physiology.heightCentimetres,
      },
    });
    return toPhysiology(dto);
  }

  async changeVisibility(visibility: Visibility): Promise<MyProfile> {
    await this.http.requestVoid('/user/v1/me/visibility', {
      method: 'PUT',
      body: { accountScope: visibility },
    });
    return this.me();
  }

  /** §10: calendar periods, resolved in the client's own time zone. */
  async stats(period: StatsPeriod, zone: string): Promise<RunnerTotals> {
    return toRunnerTotals(
      await this.http.request<TotalsDto>('/user/v1/me/stats', { query: { period, zone } }),
    );
  }

  async deleteAccount(): Promise<void> {
    await this.http.requestVoid('/user/v1/me', { method: 'DELETE' });
  }
}
