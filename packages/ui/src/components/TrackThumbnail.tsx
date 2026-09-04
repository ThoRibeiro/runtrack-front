import { useMemo, type ReactNode } from 'react';
import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '../theme';
import { radius, stroke } from '../tokens';
import { Text } from './Text';

/**
 * La forme d'un parcours, en vignette.
 *
 * Un dessin et non une carte : une liste de vingt courses ne peut pas monter
 * vingt cartes — vingt contextes WebGL sur le web, vingt vues natives sur
 * mobile, et le défilement meurt. Ici, un tracé SVG à partir de la polyline que
 * la page a déjà reçue : aucun réseau, aucun cycle de vie, un chemin.
 *
 * Les coordonnées sont normalisées dans la boîte, avec le rapport d'aspect
 * corrigé : sans cela, un aller-retour de dix kilomètres sur deux cents mètres
 * de large remplirait le cadre et ressemblerait à un parcours carré.
 */
export interface TrackThumbnailProps {
  /** Les positions décodées, dans l'ordre. Vide ou absente : rien à dessiner. */
  points?: readonly { latitude: number; longitude: number }[] | undefined;
  height?: number | undefined;
  /** Ce que dit le lecteur d'écran, ou rien : la vignette est alors décorative. */
  accessibilityLabel?: string | undefined;
  /** Affiché à la place du tracé quand il n'y en a pas. */
  emptyLabel?: string | undefined;
  testID?: string | undefined;
}

const DEFAULT_HEIGHT = 132;
const PADDING = 6;
/** Sous ce nombre de points, il n'y a pas de forme — un aller simple de deux positions. */
const MINIMUM_POINTS = 2;

interface Projected {
  path: string;
}

/**
 * Projette les positions dans une boîte de 100 × 100, en gardant les
 * proportions : la latitude et la longitude n'ont pas la même longueur au sol,
 * et la seconde rétrécit avec le cosinus de la première.
 */
function project(
  points: readonly { latitude: number; longitude: number }[],
): Projected | undefined {
  const first = points[0];
  if (first === undefined || points.length < MINIMUM_POINTS) return undefined;

  let south = first.latitude;
  let north = south;
  let west = first.longitude;
  let east = west;
  for (const point of points) {
    south = Math.min(south, point.latitude);
    north = Math.max(north, point.latitude);
    west = Math.min(west, point.longitude);
    east = Math.max(east, point.longitude);
  }

  const middle = ((south + north) / 2) * (Math.PI / 180);
  const width = (east - west) * Math.cos(middle);
  const height = north - south;
  const span = Math.max(width, height);
  if (span === 0) return undefined;

  // Centré dans le cadre : une boucle plus large que haute garde sa forme et se
  // pose au milieu, plutôt que de s'étirer jusqu'aux bords.
  const scale = (100 - PADDING * 2) / span;
  const offsetX = (100 - width * scale) / 2;
  const offsetY = (100 - height * scale) / 2;

  const path = points
    .map((point, index) => {
      const x = offsetX + (point.longitude - west) * Math.cos(middle) * scale;
      // L'écran compte vers le bas, la latitude vers le haut.
      const y = offsetY + (north - point.latitude) * scale;
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');

  return { path };
}

export function TrackThumbnail({
  points,
  height = DEFAULT_HEIGHT,
  accessibilityLabel,
  emptyLabel,
  testID,
}: TrackThumbnailProps): ReactNode {
  const theme = useTheme();
  const projected = useMemo(() => (points === undefined ? undefined : project(points)), [points]);

  const decorative = accessibilityLabel === undefined;

  return (
    <View
      style={{
        height,
        borderRadius: radius.md,
        backgroundColor: theme.colours.surfaceAlt,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
      testID={testID}
      // Sans label, la vignette est décorative : c'est le texte de la carte qui
      // dit la course. `aria-hidden` va sur le tracé, jamais sur le cadre —
      // sinon la phrase de repli qu'il contient disparaît elle aussi.
      {...(decorative
        ? {}
        : { accessible: true, accessibilityRole: 'image' as const, accessibilityLabel })}
    >
      {projected === undefined ? (
        emptyLabel === undefined ? null : (
          <Text variant="caption" tone="muted">
            {emptyLabel}
          </Text>
        )
      ) : (
        <Svg width="100%" height="100%" viewBox="0 0 100 100" aria-hidden>
          <Path
            d={projected.path}
            stroke={theme.colours.brand.fill}
            strokeWidth={stroke.thick * 1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </Svg>
      )}
    </View>
  );
}
