import { PreferencesScreen } from '@runtrack/features';
import type { ReactNode } from 'react';

/**
 * Le fuseau vient de la coque : `Intl` est de l'ECMAScript, mais c'est le
 * téléphone qui sait où il est, et l'hexagone n'a pas à le deviner (§12).
 */
export default function PreferencesRoute(): ReactNode {
  return <PreferencesScreen timeZone={Intl.DateTimeFormat().resolvedOptions().timeZone} />;
}
