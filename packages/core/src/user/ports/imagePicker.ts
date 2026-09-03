/**
 * Choisir une image sur l'appareil.
 *
 * Le coeur ne sait pas ouvrir une galerie — c'est une permission, une interface
 * système et trois comportements différents selon la plateforme. Il sait en
 * revanche ce qu'il en attend : une image, décrite assez pour être envoyée.
 */
export interface PickedImage {
  /** L'adresse locale telle que la plateforme la donne : `file://`, `blob:`… */
  uri: string;
  name: string;
  mimeType: string;
}

export interface ImagePicker {
  /** `undefined` quand la personne referme la galerie sans choisir. */
  pick(): Promise<PickedImage | undefined>;
}
