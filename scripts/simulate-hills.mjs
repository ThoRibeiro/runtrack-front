/**
 * Records a hilly run **straight into the API**, to see the elevation gain move.
 *
 * `simulate-run.mjs` drives the iOS simulator, and `simctl location` carries no
 * altitude whatever the waypoints — so a simulated run always shows D+ 0 m, and
 * the smoothing on the server side is never exercised. This script skips the
 * phone: it signs in, starts a race, posts points that climb and descend, and
 * finishes it. What comes back is what the app will display.
 *
 * It is a check on `ElevationSmoother` and its 3 m hysteresis, which exists to
 * separate two things a naive sum confuses:
 *
 *  - **relief** — the altitude goes somewhere and stays there. It counts in
 *    full, however small the steps that got there;
 *  - **sensor noise** — the altitude wobbles around a value it keeps coming
 *    back to. It counts for nothing, and that is the whole point: a GPS drifts
 *    two to three metres standing still, and summing that drift over an hour
 *    invents hundreds of metres of climb.
 *
 * `--noise` builds the second: a flat course jittering ±2 m, which must record
 * a D+ of exactly zero. The default builds the first. Either way the script
 * prints what it expected next to what the server answered.
 *
 * `--at` places the loop — chamonix (default), ventoux, galibier, tourmalet,
 * paris, or a `lat,lon` pair. It changes the map, never the D+: the altitude
 * comes from the profile, which is the whole point of doing it this way.
 *
 *   node scripts/simulate-hills.mjs --email=vous@exemple.fr --password=…
 *   node scripts/simulate-hills.mjs --email=… --password=… --laps=3 --step=8
 *   node scripts/simulate-hills.mjs --email=… --password=… --at=ventoux
 *   node scripts/simulate-hills.mjs --email=… --password=… --noise
 */
const flags = new Map(
  process.argv
    .slice(2)
    .map((argument) => argument.replace(/^--/, '').split('='))
    .map(([key, value]) => [key, value ?? 'true']),
);

const baseUrl = flags.get('api') ?? 'http://localhost:8080';
const email = flags.get('email');
const password = flags.get('password');

/**
 * `--token` skips the sign-in. Two reasons to prefer it: the login endpoint is
 * rate-limited, and it keeps a password out of the shell history.
 */
const givenToken = flags.get('token');

if (givenToken === undefined && (email === undefined || password === undefined)) {
  console.error('Missing --email and --password (or --token) — the run is recorded on a real account.');
  process.exit(1);
}

/**
 * Where the loop is drawn. It changes nothing to the elevation — the altitude
 * comes from the profile below, never from the map — but a trace that sits on a
 * col reads as a mountain outing when you open it, and one on Châtelet does not.
 */
const PLACES = {
  chamonix: [45.9237, 6.8694],
  ventoux: [44.1741, 5.2786],
  galibier: [45.0642, 6.4078],
  tourmalet: [42.9089, 0.1447],
  paris: [48.8575, 2.347],
};

const at = flags.get('at') ?? 'chamonix';
const place = PLACES[at] ?? at.split(',').map(Number);
const [START_LATITUDE, START_LONGITUDE] = place;

if (!Number.isFinite(START_LATITUDE) || !Number.isFinite(START_LONGITUDE)) {
  console.error(`--at=${at} n'est ni un lieu connu (${Object.keys(PLACES).join(', ')}) ni un couple 'lat,lon'.`);
  process.exit(1);
}

const METRES_PER_DEGREE_LATITUDE = 111_320;

/** One hill = one climb then one descent, of `--step` metres per fix. */
const laps = Number(flags.get('laps') ?? 2);
const pointsPerSlope = Number(flags.get('slope') ?? 20);
const stepMetres = Number(flags.get('step') ?? 5);
/** `ElevationSmoother.THRESHOLD_METERS`, mirrored here so the arithmetic below matches. */
const THRESHOLD_METRES = 3;
/** The wobble of the negative control: under the threshold, and it comes back. */
const NOISE_AMPLITUDE_METRES = 2;

if (!flags.has('noise') && stepMetres < THRESHOLD_METRES) {
  // A climb in 1 m steps is still a climb, and the smoother counts it — in
  // 3 m chunks, so the total lands just under the real one. Expecting an exact
  // figure from it would test the rounding, not the rule.
  console.error(`--step=${stepMetres} is below the ${THRESHOLD_METRES} m threshold: use --noise for the negative control.`);
  process.exit(1);
}
/**
 * One fix per second, five metres apart: 18 km/h, under the 6,5 m/s that
 * `ActivityType.TRAIL` calls plausible. Faster and every point is rejected as a
 * GPS jump; the run would record nothing at all.
 */
const METRES_BETWEEN_FIXES = 5;
const SECONDS_BETWEEN_FIXES = 1;

/**
 * A closed wobbling ring rather than a straight line north: the same shape
 * `simulate-run.mjs` draws, so the trace reads as a route on the map instead of
 * a segment. Its perimeter is measured in its own units, then scaled to the
 * length the fixes add up to.
 */
function ring(fraction) {
  const angle = fraction * 2 * Math.PI;
  const radius = 1 + 0.28 * Math.sin(3 * angle) + 0.11 * Math.cos(5 * angle);
  return { x: radius * Math.cos(angle), y: radius * Math.sin(angle) };
}

async function call(path, { method = 'GET', body, token } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token === undefined ? {} : { Authorization: `Bearer ${token}` }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  if (!response.ok) {
    throw new Error(`${method} ${path} → ${response.status} ${await response.text()}`);
  }
  const text = await response.text();
  return text === '' ? undefined : JSON.parse(text);
}

/**
 * `laps` hills, each climbing then descending in equal steps above the
 * threshold: every step is relief, so the expected D+ is the sum of the climbs,
 * exactly.
 */
function hills() {
  const profile = [0];
  for (let lap = 0; lap < laps; lap += 1) {
    for (let step = 0; step < pointsPerSlope; step += 1) profile.push(profile.at(-1) + stepMetres);
    for (let step = 0; step < pointsPerSlope; step += 1) profile.push(profile.at(-1) - stepMetres);
  }
  return profile;
}

/**
 * A flat course that wobbles: the altitude never settles anywhere new, so every
 * reading stays within the threshold of the first and nothing may be counted.
 */
function jitter() {
  const wobble = [0, NOISE_AMPLITUDE_METRES, 0, -NOISE_AMPLITUDE_METRES];
  return Array.from(
    { length: laps * pointsPerSlope * 2 + 1 },
    (_, index) => wobble[index % wobble.length],
  );
}

const noisy = flags.has('noise');
const profile = noisy ? jitter() : hills();
const expectedGain = noisy ? 0 : laps * pointsPerSlope * stepMetres;

const shape = profile.map((_, index) => ring(index / profile.length));
/**
 * Scaled on the **longest** segment, not on the average.
 *
 * The ring wobbles, so its segments are not equal: sizing it by the perimeter
 * puts a handful of them above 6,5 m/s, and `TrackPointFilter` drops those as
 * GPS jumps — costing one step of climb each, silently. The run comes out a
 * little shorter this way, and every fix survives.
 */
let longestSegment = 0;
for (let index = 0; index + 1 < shape.length; index += 1) {
  const from = shape[index];
  const to = shape[index + 1];
  longestSegment = Math.max(longestSegment, Math.hypot(to.x - from.x, to.y - from.y));
}
const scale = METRES_BETWEEN_FIXES / longestSegment;
const metresPerDegreeLongitude =
  METRES_PER_DEGREE_LATITUDE * Math.cos((START_LATITUDE * Math.PI) / 180);

const startedAt = Date.now();
const points = profile.map((elevation, index) => ({
  sequenceNumber: index,
  // Translated so the first fix is the place that was asked for, rather than
  // the centre of the loop: a run starts where you say it starts.
  latitude:
    START_LATITUDE + ((shape[index].y - shape[0].y) * scale) / METRES_PER_DEGREE_LATITUDE,
  longitude:
    START_LONGITUDE + ((shape[index].x - shape[0].x) * scale) / metresPerDegreeLongitude,
  elevation,
  recordedAt: new Date(startedAt + index * SECONDS_BETWEEN_FIXES * 1000).toISOString(),
  accuracyMeters: 5,
}));

const token =
  givenToken ??
  (await call('/auth/v1/login', { method: 'POST', body: { email, password } })).accessToken;

const race = await call('/race/v1', {
  method: 'POST',
  token,
  body: {
    type: 'TRAIL',
    title: flags.get('title') ?? `Montagne ×${laps}`,
    visibility: 'PRIVATE',
    deviceTime: new Date(startedAt).toISOString(),
  },
});

/**
 * The run is posted **as it happens**, not all at once.
 *
 * `TrackPointFilter` drops anything recorded more than
 * `MAX_FUTURE_DRIFT` (60 s) ahead of the server clock — a phone whose clock
 * runs fast must not be able to invent a course. Back-dating the whole track to
 * dodge that does not work either: the run starts on the server's clock, and
 * everything before it is rejected as recorded before the start.
 *
 * So the script waits. A profile longer than the window costs real seconds, and
 * that is the honest price of exercising the same path the phone takes.
 */
const SAFETY_MARGIN_SECONDS = 45;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let sent = 0;
while (sent < points.length) {
  const reach = Math.floor((Date.now() - startedAt) / 1000) + SAFETY_MARGIN_SECONDS;
  const slice = points.filter(
    (_, index) => index >= sent && index * SECONDS_BETWEEN_FIXES <= reach,
  );

  if (slice.length === 0) {
    const waitSeconds = sent * SECONDS_BETWEEN_FIXES - reach + 1;
    console.log(`… ${waitSeconds} s d'attente : le serveur refuse ce qui est trop en avance`);
    await sleep(waitSeconds * 1000);
    continue;
  }

  // `maxItems: 1000` on the request.
  for (let from = 0; from < slice.length; from += 1000) {
    await call(`/race/v1/${race.id}/points`, {
      method: 'POST',
      token,
      body: { points: slice.slice(from, from + 1000) },
    });
  }
  sent += slice.length;
}

await call(`/race/v1/${race.id}/finish`, { method: 'POST', token });
const finished = await call(`/race/v1/${race.id}`, { token });
const gain = Math.round(finished.stats.elevationGain);

console.log(
  noisy
    ? `${points.length} points · terrain plat qui oscille de ±${NOISE_AMPLITUDE_METRES} m`
    : `${points.length} points · ${laps} bosse(s) de ${pointsPerSlope * stepMetres} m ` +
        `par pas de ${stepMetres} m`,
);
console.log(`D+ attendu ${expectedGain} m · D+ mesuré ${gain} m`);
console.log(
  noisy
    ? `Oscillation sous le seuil de ${THRESHOLD_METRES} m : le bruit ne doit rien cumuler.`
    : `Pas au-dessus du seuil de ${THRESHOLD_METRES} m : tout le dénivelé doit être compté.`,
);
console.log(`Course ${race.id} — ${at} — ouvre-la dans l’app pour la voir.`);

if (gain !== expectedGain) {
  console.error(`✗ écart de ${Math.abs(gain - expectedGain)} m`);
  process.exit(1);
}
console.log('✓ le D+ suit le profil');
