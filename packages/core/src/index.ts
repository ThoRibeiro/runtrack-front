// Partagé — le temps, les identifiants, la pagination, les erreurs, l'aléa.
export { FixedClock } from './shared/time/clock';
export type { Clock, Instant } from './shared/time/clock';
export { ManualScheduler } from './shared/time/scheduler';
export type { Cancel, Scheduler } from './shared/time/scheduler';
export { HOUR, MINUTE, SECOND, secondsBetween, splitSeconds } from './shared/time/duration';
export type { ClockParts, Millis } from './shared/time/duration';
export {
  activityId,
  commentId,
  deviceToken,
  notificationId,
  shareLinkId,
  userId,
} from './shared/identity/ids';
export type {
  ActivityId,
  CommentId,
  DeviceToken,
  NotificationId,
  ShareLinkId,
  UserId,
} from './shared/identity/ids';
export { isLastPage, mergePages } from './shared/paging/page';
export type { Page, PageRequest } from './shared/paging/page';
export { ERROR_CODES, isKnownErrorCode } from './shared/errors/errorCode';
export type { ErrorCode } from './shared/errors/errorCode';
export type { ImagePicker, PickedImage } from './user/ports/imagePicker';
export type { FileUploader, UploadedFileResponse } from './user/ports/fileUploader';
export { RunTrackError, endsSession, isRunTrackError } from './shared/errors/runtrackError';
export { FixedRandom } from './shared/random/random';
export type { Random } from './shared/random/random';

// Mesures — géographie, allure, dénivelé, polyline.
export { boundingBoxOf, distanceBetween, isValidGeoPoint, pathLength } from './measure/geo';
export type { BoundingBox, GeoPoint } from './measure/geo';
export { paceFromSpeed, paceOver, paceParts, speedFromPace } from './measure/pace';
export type { MetresPerSecond, SecondsPerKm } from './measure/pace';
export { ELEVATION_NOISE_THRESHOLD_METRES, elevationChange } from './measure/elevation';
export type { ElevationChange } from './measure/elevation';
export { decodePolyline, decodePolylineChunk, encodePolyline } from './measure/polyline';
export type { PolylineChunk } from './measure/polyline';

// Courses.
export {
  ACTIVITY_TYPES,
  VISIBILITIES,
  acceptsPoints,
  canFinish,
  canPause,
  canRecordOn,
  canResume,
  isTerminal,
} from './activity/domain/activity';
export type {
  Activity,
  ActivityStats,
  ActivityStatus,
  ActivityType,
  Visibility,
} from './activity/domain/activity';
export type {
  LocationFix,
  LivePosition,
  RecordedPoint,
  Split,
  Track,
} from './activity/domain/track';
export type { ActivityGateway, StartActivityCommand } from './activity/ports/activityGateway';

// Enregistrement.
export {
  MAXIMUM_ACCEPTABLE_SKEW,
  MAXIMUM_FUTURE_DRIFT,
  correct,
  isSkewAcceptable,
  observeSkew,
  wouldBeRejectedAsFuture,
} from './recording/domain/clockSkew';
export type { ClockSkew } from './recording/domain/clockSkew';
export {
  MAXIMUM_POINTS_PER_BATCH,
  batchesFor,
  chunk,
  idempotencyKeyFor,
} from './recording/domain/batching';
export type { PointBatch } from './recording/domain/batching';
export {
  NO_FIX_REJECTION_THRESHOLD,
  POINT_REJECTIONS,
  trailingAccuracyRejections,
  warningsFrom,
} from './recording/domain/ingestion';
export type {
  IngestionOutcome,
  PointRejection,
  RecordingWarning,
  RejectedPoint,
} from './recording/domain/ingestion';
export type { InterruptedRecording, PointBuffer } from './recording/ports/pointBuffer';
export type { LocationPermission, LocationTracker } from './recording/ports/locationTracker';
export type { NetworkMonitor } from './recording/ports/networkMonitor';
export { Recorder } from './recording/usecases/recorder';
export type {
  RecorderDependencies,
  RecorderState,
  StartOutcome,
} from './recording/usecases/recorder';

// Direct.
export {
  HEARTBEAT_INTERVAL,
  HEARTBEAT_TIMEOUT,
  INITIAL_BACKOFF,
  MAXIMUM_BACKOFF,
  backoffDelay,
} from './live/domain/backoff';
export type { LiveEvent, LiveMessage } from './live/domain/liveEvent';
export type { LiveStream, LiveStreamRequest, LiveSubscription } from './live/ports/liveStream';
export { LiveSession } from './live/usecases/liveSession';
export type {
  LiveParser,
  LiveSessionDependencies,
  LiveSnapshot,
} from './live/usecases/liveSession';

// Authentification.
export { REFRESH_MARGIN, isAccessTokenUsable, needsRefresh } from './auth/domain/session';
export type { Session } from './auth/domain/session';
export type { SecureStore } from './auth/ports/secureStore';
export type { AuthGateway, Credentials, SignUpCommand } from './auth/ports/authGateway';

// Comptes.
export {
  ACCOUNT_STATUSES,
  BIOLOGICAL_SEXES,
  STATS_PERIODS,
  goalProgress,
} from './user/domain/profile';
export type {
  AccountStatus,
  Author,
  BiologicalSex,
  MyProfile,
  Physiology,
  PublicProfile,
  RunnerTotals,
  StatsPeriod,
  TotalsByType,
} from './user/domain/profile';
export type { UserGateway } from './user/ports/userGateway';

// Fil, social, engagement, partage.
export { isLive } from './feed/domain/feedItem';
export type { FeedItem } from './feed/domain/feedItem';
export type { FeedGateway } from './feed/ports/feedGateway';
export { FOLLOW_STATUSES } from './social/ports/socialGateway';
export type {
  FollowRequest,
  FollowStatus,
  SocialGateway,
  UserIdList,
} from './social/ports/socialGateway';
export type {
  CommentAuthor,
  Comment,
  EngagementGateway,
  Likes,
} from './engagement/ports/engagementGateway';
export type { ShareLink, SharingGateway } from './sharing/ports/sharingGateway';

// Notifications.
export {
  NOTIFICATION_TYPES,
  destinationOf,
  parseDeepLink,
  unreadCount,
} from './notification/domain/notification';
export type { DeepLink, Notification, NotificationType } from './notification/domain/notification';
export { covers, localMinutes, quietHours, shouldNotify } from './notification/domain/quietHours';
export type { NotificationPreferences, QuietHours } from './notification/domain/quietHours';
export { DEVICE_PLATFORMS } from './notification/ports/pushRegistry';
export type {
  DevicePlatform,
  PushRegistry,
  RegisteredDevice,
} from './notification/ports/pushRegistry';
export type {
  NotificationGateway,
  NotificationStream,
} from './notification/ports/notificationGateway';

// Carte.
export type { MapMarker, MapRenderer } from './map/ports/mapRenderer';
export { TrackDecodingCancelled, isTrackDecodingCancelled } from './map/ports/trackDecoder';
export type { TrackDecoder, TrackDecoding } from './map/ports/trackDecoder';
export {
  boundingBoxAround,
  kilometreMarks,
  pointAtDistance,
  splitEndDistances,
} from './map/domain/trackGeometry';
export type { PointOnTrack } from './map/domain/trackGeometry';
export { ActivityMapPresenter } from './map/usecases/activityMap';
export type { ActivityMapLabels } from './map/usecases/activityMap';
