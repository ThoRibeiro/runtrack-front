import {
  activityId,
  userId,
  type Activity,
  type ActivityGateway,
  type ActivityStats,
  type FeedGateway,
  type FeedItem,
  type FollowRequest,
  type FollowStatus,
  type MyProfile,
  type Page,
  type PublicProfile,
  type PublicProfile as Profile,
  type RunnerTotals,
  type SocialGateway,
  type Split,
  type Track,
  type UserGateway,
  type UserId,
  type UserIdList,
} from '@runtrack/core';

/**
 * In-memory gateways the screen tests drive.
 *
 * Each one starts with something plausible and lets a test replace any answer,
 * including with a rejection — because half of what a screen decides is what to
 * do when the server says no.
 */
export const NO_STATS: ActivityStats = {
  distanceMetres: 0,
  elapsedSeconds: 0,
  movingTimeSeconds: 0,
  averagePaceSecondsPerKm: undefined,
  currentPaceSecondsPerKm: undefined,
  elevationGain: 0,
  elevationLoss: 0,
  averageHeartRate: undefined,
  maxHeartRate: undefined,
};

export function anActivity(overrides: Partial<Activity> = {}): Activity {
  return {
    id: activityId('a1'),
    ownerId: userId('u-42'),
    type: 'RUN',
    title: 'Sortie du matin',
    description: undefined,
    visibility: 'FOLLOWERS',
    status: { kind: 'finished', since: 1_700_003_862_000 },
    startedAt: 1_700_000_000_000,
    endedAt: 1_700_003_862_000,
    stats: {
      ...NO_STATS,
      distanceMetres: 12_400,
      elapsedSeconds: 3_862,
      movingTimeSeconds: 3_720,
      averagePaceSecondsPerKm: 300,
      elevationGain: 284,
      averageHeartRate: 152,
    },
    ...overrides,
  };
}

export function aFeedItem(overrides: Partial<FeedItem> = {}): FeedItem {
  return {
    activityId: activityId('a1'),
    author: {
      id: userId('u-7'),
      handle: 'camille',
      displayName: 'Camille',
      avatarUrl: undefined,
    },
    type: 'RUN',
    title: 'Sortie du matin',
    status: { kind: 'finished', since: 1_700_003_862_000 },
    distanceMetres: 12_400,
    movingTimeSeconds: 3_720,
    startedAt: 1_700_000_000_000,
    endedAt: 1_700_003_862_000,
    likeCount: 3,
    commentCount: 1,
    ...overrides,
  };
}

export function aProfile(overrides: Partial<Profile> = {}): PublicProfile {
  return {
    id: userId('u-7'),
    handle: 'camille',
    displayName: 'Camille',
    avatarUrl: undefined,
    bio: undefined,
    accountScope: 'PUBLIC',
    ...overrides,
  };
}

export function myProfile(overrides: Partial<MyProfile> = {}): MyProfile {
  return {
    ...aProfile({ id: userId('u-42'), handle: 'thomas', displayName: 'Thomas' }),
    email: 'thomas@exemple.fr',
    status: 'ACTIVE',
    registeredAt: 1_600_000_000_000,
    ...overrides,
  };
}

export function totals(overrides: Partial<RunnerTotals> = {}): RunnerTotals {
  return {
    period: 'WEEK',
    since: 1_699_500_000_000,
    activityCount: 3,
    distanceMetres: 27_200,
    movingTimeSeconds: 8_400,
    elevationGain: 412,
    byType: [],
    ...overrides,
  };
}

export class FakeFeedGateway implements FeedGateway {
  pages: Page<FeedItem>[] = [{ items: [aFeedItem()] }];
  reads: { cursor: string | undefined }[] = [];

  read({ cursor }: { cursor?: string | undefined }): Promise<Page<FeedItem>> {
    this.reads.push({ cursor });
    const index = cursor === undefined ? 0 : Number(cursor);
    const page = this.pages[index];
    return page === undefined ? Promise.resolve({ items: [] }) : Promise.resolve(page);
  }
}

export class FakeActivityGateway implements ActivityGateway {
  activity: Activity = anActivity();
  splitList: readonly Split[] = [];
  activities: Page<Activity> = { items: [anActivity()] };
  onById: (() => Promise<Activity>) | undefined;

  start(): Promise<Activity> {
    return Promise.resolve(this.activity);
  }

  byId(): Promise<Activity> {
    return this.onById === undefined ? Promise.resolve(this.activity) : this.onById();
  }

  ingest(): never {
    throw new Error('non utilisé à ce lot');
  }

  pause(): Promise<Activity> {
    return Promise.resolve(this.activity);
  }

  resume(): Promise<Activity> {
    return Promise.resolve(this.activity);
  }

  finish(): Promise<Activity> {
    return Promise.resolve(this.activity);
  }

  discard(): Promise<Activity> {
    return Promise.resolve(this.activity);
  }

  changeVisibility(): Promise<Activity> {
    return Promise.resolve(this.activity);
  }

  trackData: Track = { polyline: '', pointCount: 0, pointsPurgedAt: undefined };
  onTrack: (() => Promise<Track>) | undefined;

  track(): Promise<Track> {
    return this.onTrack === undefined ? Promise.resolve(this.trackData) : this.onTrack();
  }

  splits(): Promise<readonly Split[]> {
    return Promise.resolve(this.splitList);
  }

  ofUser(): Promise<Page<Activity>> {
    return Promise.resolve(this.activities);
  }

  live(): Promise<readonly Activity[]> {
    return Promise.resolve([]);
  }
}

export class FakeUserGateway implements UserGateway {
  profile: MyProfile = myProfile();
  stat: RunnerTotals = totals();
  onMe: (() => Promise<MyProfile>) | undefined;
  onStats: (() => Promise<RunnerTotals>) | undefined;

  me(): Promise<MyProfile> {
    return this.onMe === undefined ? Promise.resolve(this.profile) : this.onMe();
  }

  updateProfile(): Promise<MyProfile> {
    return Promise.resolve(this.profile);
  }

  changeHandle(): Promise<MyProfile> {
    return Promise.resolve(this.profile);
  }

  changeAvatar(): Promise<MyProfile> {
    return Promise.resolve(this.profile);
  }

  updatePhysiology(): never {
    throw new Error('non utilisé à ce lot');
  }

  changeVisibility(): Promise<MyProfile> {
    return Promise.resolve(this.profile);
  }

  stats(): Promise<RunnerTotals> {
    return this.onStats === undefined ? Promise.resolve(this.stat) : this.onStats();
  }

  deleteAccount(): Promise<void> {
    return Promise.resolve();
  }
}

export class FakeSocialGateway implements SocialGateway {
  profile: PublicProfile = aProfile();
  results: readonly PublicProfile[] = [];
  followerList: UserIdList = { userIds: [], count: 0 };
  followingList: UserIdList = { userIds: [], count: 0 };
  requests: readonly FollowRequest[] = [];

  followed: UserId[] = [];
  unfollowed: UserId[] = [];
  blocked: UserId[] = [];
  answered: { id: UserId; accept: boolean }[] = [];
  searches: string[] = [];
  onProfile: (() => Promise<PublicProfile>) | undefined;
  nextFollowStatus: FollowStatus = 'ACCEPTED';

  profileOf(): Promise<PublicProfile> {
    return this.onProfile === undefined ? Promise.resolve(this.profile) : this.onProfile();
  }

  search(query: string): Promise<readonly PublicProfile[]> {
    this.searches.push(query);
    return Promise.resolve(this.results);
  }

  followers(): Promise<UserIdList> {
    return Promise.resolve(this.followerList);
  }

  following(): Promise<UserIdList> {
    return Promise.resolve(this.followingList);
  }

  follow(id: UserId): Promise<FollowStatus> {
    this.followed.push(id);
    return Promise.resolve(this.nextFollowStatus);
  }

  unfollow(id: UserId): Promise<void> {
    this.unfollowed.push(id);
    return Promise.resolve();
  }

  block(id: UserId): Promise<void> {
    this.blocked.push(id);
    return Promise.resolve();
  }

  unblock(): Promise<void> {
    return Promise.resolve();
  }

  pendingRequests(): Promise<readonly FollowRequest[]> {
    return Promise.resolve(this.requests);
  }

  acceptRequest(id: UserId): Promise<void> {
    this.answered.push({ id, accept: true });
    return Promise.resolve();
  }

  rejectRequest(id: UserId): Promise<void> {
    this.answered.push({ id, accept: false });
    return Promise.resolve();
  }
}
