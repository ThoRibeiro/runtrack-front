import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Ce que le lot 3 avait promis : le garde-fou qui remplace la recopie de types
 * que le §15 interdit.
 *
 * La description OpenAPI est produite par springdoc avec ses réglages par
 * défaut. Elle est **sous-spécifiée** : toutes les énumérations y sont des
 * `string` nus, et la réponse de l'ingestion y est déclarée `string` alors
 * qu'elle rend un objet. Générer les types depuis elle donne donc `string`
 * partout, et les unions du domaine ont dû être écrites à côté.
 *
 * Ce test est ce qui les empêche de mentir. Il ne recopie rien : il vérifie que
 * **les chemins appelés existent** et que **les champs lus existent**. Un
 * endpoint renommé ou un champ disparu casse le build, au lieu de casser un
 * écran.
 */
interface OpenApiDocument {
  paths: Record<string, Record<string, unknown>>;
  components: { schemas: Record<string, { properties?: Record<string, unknown> }> };
}

const here = dirname(fileURLToPath(import.meta.url));
const document = JSON.parse(
  readFileSync(resolve(here, '../../openapi/openapi.json'), 'utf8'),
) as OpenApiDocument;

/** Chaque appel que les gateways de ce paquet savent faire. */
const CALLED: [method: string, path: string][] = [
  ['post', '/auth/v1/signup'],
  ['post', '/auth/v1/login'],
  ['post', '/auth/v1/refresh'],
  ['post', '/auth/v1/logout'],
  ['post', '/auth/v1/password/forgot'],
  ['post', '/auth/v1/password/reset'],
  ['get', '/auth/v1/verify-email'],
  ['post', '/race/v1'],
  ['get', '/race/v1/{id}'],
  ['post', '/race/v1/{id}/points'],
  ['post', '/race/v1/{id}/pause'],
  ['post', '/race/v1/{id}/resume'],
  ['post', '/race/v1/{id}/finish'],
  ['post', '/race/v1/{id}/discard'],
  ['put', '/race/v1/{id}/visibility'],
  ['get', '/race/v1/{id}/track'],
  ['get', '/race/v1/{id}/splits'],
  ['get', '/race/v1/live'],
  ['get', '/user/v1/{id}/races'],
  ['get', '/user/v1/me'],
  ['patch', '/user/v1/me'],
  ['delete', '/user/v1/me'],
  ['put', '/user/v1/me/handle'],
  ['put', '/user/v1/me/avatar'],
  ['put', '/user/v1/me/physiology'],
  ['put', '/user/v1/me/visibility'],
  ['get', '/user/v1/me/stats'],
  ['get', '/feed/v1'],
  ['get', '/user/v1'],
  ['get', '/user/v1/{handle}'],
  ['get', '/user/v1/{id}/followers'],
  ['get', '/user/v1/{id}/following'],
  ['post', '/user/v1/{id}/follow'],
  ['delete', '/user/v1/{id}/follow'],
  ['post', '/user/v1/{id}/block'],
  ['delete', '/user/v1/{id}/block'],
  ['get', '/user/v1/me/follow-requests'],
  ['post', '/user/v1/me/follow-requests/{id}/accept'],
  ['post', '/user/v1/me/follow-requests/{id}/reject'],
];

/** Chaque champ que les mappeurs lisent. */
const READ: [schema: string, field: string][] = [
  ['ActivityResponse', 'id'],
  ['ActivityResponse', 'ownerId'],
  ['ActivityResponse', 'type'],
  ['ActivityResponse', 'title'],
  ['ActivityResponse', 'visibility'],
  ['ActivityResponse', 'status'],
  ['ActivityResponse', 'startedAt'],
  ['ActivityResponse', 'endedAt'],
  ['ActivityResponse', 'stats'],
  ['StatsResponse', 'distanceMeters'],
  ['StatsResponse', 'movingTimeSeconds'],
  ['StatsResponse', 'averagePaceSecondsPerKm'],
  ['StatsResponse', 'elevationGain'],
  ['SplitResponse', 'kilometerIndex'],
  ['SplitResponse', 'paceSecondsPerKm'],
  ['SplitResponse', 'complete'],
  ['TrackResponse', 'polyline'],
  ['TrackResponse', 'pointsPurgedAt'],
  ['SessionResponse', 'accessToken'],
  ['SessionResponse', 'refreshToken'],
  ['SessionResponse', 'expiresIn'],
  ['MyProfile', 'accountScope'],
  ['MyProfile', 'registeredAt'],
  ['PublicProfile', 'accountScope'],
  ['PhysiologyPayload', 'heightCentimeters'],
  ['PhysiologyPayload', 'biologicalSex'],
  ['RunnerTotalsResponse', 'period'],
  ['RunnerTotalsResponse', 'byType'],
  ['FeedItem', 'activityId'],
  ['FeedItem', 'author'],
  ['FeedItem', 'status'],
  ['FeedItem', 'distanceMeters'],
  ['FeedPage', 'nextCursor'],
  ['NotificationResponse', 'deepLink'],
  ['NotificationResponse', 'unread'],
  ['UserIdList', 'userIds'],
  ['UserIdList', 'count'],
  ['PendingRequest', 'requestId'],
  ['PendingRequest', 'followerId'],
  ['FollowResponse', 'status'],
  ['FollowResponse', 'pending'],
];

describe('le contrat n’a pas bougé', () => {
  it.each(CALLED)('%s %s existe côté serveur', (method, path) => {
    expect(document.paths[path], `chemin absent : ${path}`).toBeDefined();
    expect(document.paths[path]?.[method], `verbe absent : ${method} ${path}`).toBeDefined();
  });

  it.each(READ)('%s porte bien %s', (schema, field) => {
    const properties = document.components.schemas[schema]?.properties;
    expect(properties, `schéma absent : ${schema}`).toBeDefined();
    expect(properties?.[field], `champ absent : ${schema}.${field}`).toBeDefined();
  });

  it('la réponse d’ingestion reste sous-spécifiée — c’est pourquoi elle est écrite à la main', () => {
    // Le jour où springdoc décrit enfin cet objet, ce test tombe : ce sera le
    // signal de supprimer `IngestionResponseDto` et de générer le type.
    const ingest = document.paths['/race/v1/{id}/points']?.['post'] as {
      responses?: Record<string, { content?: Record<string, { schema?: { type?: string } }> }>;
    };
    const schema = ingest.responses?.['200']?.content?.['application/json']?.schema;

    expect(schema?.type).toBe('string');
  });

  it('les 63 endpoints du serveur sont bien là', () => {
    const count = Object.values(document.paths).reduce(
      (total, verbs) =>
        total +
        Object.keys(verbs).filter((verb) =>
          ['get', 'post', 'put', 'patch', 'delete'].includes(verb),
        ).length,
      0,
    );

    expect(count).toBe(63);
  });
});
