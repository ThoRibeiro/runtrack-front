export { HttpClient, queryString, toPage } from './http/httpClient';
export type { CursorPage, Fetch, HttpClientOptions, RequestOptions } from './http/httpClient';
export { isProblemDocument, toRunTrackError } from './http/problem';
export type { ProblemDocument } from './http/problem';
export { defaultCorrelationIdFactory } from './http/correlationId';
export type { CorrelationIdFactory } from './http/correlationId';

export { SessionHolder } from './auth/sessionHolder';
export { decodeBase64Url, subjectOf } from './auth/jwt';
export { RefreshCoordinator } from './auth/refreshCoordinator';
export { OidcTokens } from './auth/oidcTokens';
export type { OidcConfiguration } from './auth/oidcTokens';
export type { Refresher } from './auth/refreshCoordinator';

export { HttpAuthGateway, toSession } from './gateways/httpAuthGateway';
export { HttpActivityGateway } from './gateways/httpActivityGateway';
export { HttpUserGateway } from './gateways/httpUserGateway';
export { HttpFeedGateway } from './gateways/httpFeedGateway';
export { HttpSocialGateway } from './gateways/httpSocialGateway';
export { HttpNotificationGateway } from './gateways/httpNotificationGateway';
export { HttpDeviceGateway } from './gateways/httpDeviceGateway';
export { HttpEngagementGateway, toComment, toLikes } from './gateways/httpEngagementGateway';
export { HttpSharingGateway, toShareLink } from './gateways/httpSharingGateway';
export { SharedActivityGateway } from './gateways/sharedActivityGateway';

export {
  narrow,
  narrowOrThrow,
  required,
  toInstant,
  toOptionalInstant,
  toOptionalString,
} from './mappers/primitives';
export {
  toActivity,
  toIngestionOutcome,
  toSplit,
  toStats,
  toStatus,
  toTrack,
} from './mappers/activity';
export type { IngestionResponseDto } from './mappers/activity';
export {
  toAuthor,
  toMyProfile,
  toPhysiology,
  toPublicProfile,
  toRunnerTotals,
} from './mappers/user';
export { toFeedItem } from './mappers/feed';
export {
  toDevice,
  toLocalTime,
  toMinutes,
  toNotification,
  toPreferences,
  toQuietHours,
} from './mappers/notification';
export type { Device } from './mappers/notification';

export type { components, operations, paths } from './generated/schema';

// Direct — le SSE, ses deux transports, et la traduction des événements.
export { SseFrameParser } from './live/sseFrames';
export { SseLiveStream } from './live/sseLiveStream';
export { SseNotificationStream } from './live/sseNotificationStream';
export { SseSubscriber } from './live/sseSubscriber';
export type { SseLiveStreamOptions } from './live/sseLiveStream';
export type { SseNotificationStreamOptions } from './live/sseNotificationStream';
export type { SseSubscriberOptions, SseSubscriptionRequest } from './live/sseSubscriber';
export { parseLiveEvent } from './live/liveParser';
export {
  fetchSseTransport,
  sseTransportForRuntime,
  supportsStreamingFetch,
  xhrSseTransport,
} from './live/sseTransport';
export type {
  FetchLike,
  SseTransport,
  SseTransportRequest,
  SseTransportSubscription,
  XhrLike,
} from './live/sseTransport';
