import type {
  MyProfile,
  Physiology,
  PickedImage,
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

  async changeAvatar(url: string | undefined): Promise<MyProfile> {
    await this.http.requestVoid('/user/v1/me/avatar', {
      method: 'PUT',
      // `null` et non la chaîne vide : c'est `null` que le serveur lit comme
      // « retire la photo », une chaîne vide serait une URL vide enregistrée.
      body: { avatarUrl: url ?? null },
    });
    return this.me();
  }

  async physiology(): Promise<Physiology> {
    return toPhysiology(await this.http.request<PhysiologyDto>('/user/v1/me/physiology'));
  }

  /**
   * La photo, en multipart.
   *
   * Deux mondes derrière une même signature : React Native envoie un
   * descripteur `{ uri, name, type }` que le pont natif sait lire — `fetch` sur
   * une URI `file://` n'y est pas fiable — tandis qu'un navigateur veut un vrai
   * `Blob`, que `fetch` sur une URI `blob:` lui donne.
   */
  async uploadAvatar(image: PickedImage): Promise<MyProfile> {
    // Deux mondes, deux chemins. Un navigateur poste un `Blob` par la voie
    // normale ; React Native passe par le module natif de fichiers, parce
    // qu'un `FormData` autour d'une URI `file://` y échoue avec « Network
    // request failed » — sans statut ni corps, indiscernable d'une coupure.
    if (this.http.canUploadFiles) {
      return toMyProfile(
        await this.http.upload<MyProfileDto>('/user/v1/me/avatar/file', 'file', image),
      );
    }

    const form = new FormData();
    const response = await fetch(image.uri);
    form.append('file', await response.blob(), image.name);

    return toMyProfile(
      await this.http.request<MyProfileDto>('/user/v1/me/avatar/file', {
        method: 'POST',
        form,
      }),
    );
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
