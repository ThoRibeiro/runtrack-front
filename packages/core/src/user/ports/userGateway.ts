import type { Visibility } from '../../activity/domain/activity';
import type { MyProfile, Physiology, RunnerTotals, StatsPeriod } from '../domain/profile';
import type { PickedImage } from './imagePicker';

export interface UserGateway {
  me(): Promise<MyProfile>;
  updateProfile(update: {
    displayName?: string | undefined;
    bio?: string | undefined;
  }): Promise<MyProfile>;
  changeHandle(handle: string): Promise<MyProfile>;
  /** `undefined` retire la photo : le serveur distingue « vide » de « absente ». */
  changeAvatar(url: string | undefined): Promise<MyProfile>;
  /** Téléverse l'image choisie ; le serveur la stocke et rend son adresse. */
  uploadAvatar(image: PickedImage): Promise<MyProfile>;
  /** §11: santé, donc sa propre requête — jamais repliée dans le profil. */
  physiology(): Promise<Physiology>;
  updatePhysiology(physiology: Physiology): Promise<Physiology>;
  changeVisibility(visibility: Visibility): Promise<MyProfile>;
  /** §10: calendar periods, in the client's own time zone. */
  stats(period: StatsPeriod, zone: string): Promise<RunnerTotals>;
  deleteAccount(): Promise<void>;
}
