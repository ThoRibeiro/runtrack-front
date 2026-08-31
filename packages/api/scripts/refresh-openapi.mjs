// Refreshes the OpenAPI snapshot from the back-end.
//
// The snapshot is committed on purpose: `runtrack-app/target/` is a build
// artefact, and a type generation that depends on someone having run `mvn
// verify` five minutes ago is a generation that breaks in CI. The snapshot is
// the contract this client was built against; refreshing it is a deliberate act
// that shows up in a diff.
import { copyFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const source = resolve(here, '../../../../runtrack/runtrack-app/target/openapi/openapi.json');
const destination = resolve(here, '../openapi/openapi.json');

if (!existsSync(source)) {
  console.error(
    `Aucun openapi.json en ${source}.\n` +
      'Il est écrit par OpenApiIT : lance `JAVA_HOME=~/.sdkman/candidates/java/25-tem mvn -o verify` dans le dépôt back-end.',
  );
  process.exit(1);
}

copyFileSync(source, destination);
console.log(`OpenAPI rafraîchi depuis ${source}`);
