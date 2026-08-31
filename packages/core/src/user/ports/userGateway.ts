import type { Visibility } from '../../activity/domain/activity';
import type { MyProfile, Physiology, RunnerTotals, StatsPeriod } from '../domain/profile';

export interface UserGateway {
  me(): Promise<MyProfile>;
  updateProfile(update: {
    displayName?: string | undefined;
    bio?: string | undefined;
  }): Promise<MyProfile>;
  changeHandle(handle: string): Promise<MyProfile>;
  changeAvatar(url: string): Promise<MyProfile>;
  updatePhysiology(physiology: Physiology): Promise<Physiology>;
  changeVisibility(visibility: Visibility): Promise<MyProfile>;
  /** §10: calendar periods, in the client's own time zone. */
  stats(period: StatsPeriod, zone: string): Promise<RunnerTotals>;
  deleteAccount(): Promise<void>;
}
