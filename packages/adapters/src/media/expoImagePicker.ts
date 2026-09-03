import * as ImagePickerModule from 'expo-image-picker';
import type { ImagePicker, PickedImage } from '@runtrack/core';

/**
 * La galerie de l'appareil (§12 : la coque connaît Expo, le coeur non).
 *
 * Ce que ce fichier possède, c'est la paperasse plateforme :
 *
 *  - **le recadrage carré est imposé.** Une photo de profil est un disque ; sans
 *    `allowsEditing`, un cliché en 4:3 arrive rogné n'importe comment côté
 *    affichage, et c'est le serveur qui garde l'original inutilement large ;
 *  - **la qualité est baissée à 0,7 et la largeur bornée.** La limite du serveur
 *    est de deux mégaoctets, et un cliché d'iPhone en fait cinq. Réduire ici
 *    évite un refus que la personne ne pourrait pas corriger ;
 *  - **une permission refusée n'est pas une erreur.** On rend `undefined`,
 *    comme lorsque la galerie est fermée sans choisir : dans les deux cas, il
 *    n'y a simplement pas de photo.
 */
const MAXIMUM_DIMENSION = 1024;
const QUALITY = 0.7;

function nameOf(uri: string, mimeType: string): string {
  const extension = mimeType.split('/')[1] ?? 'jpg';
  const last = uri.split('/').pop();
  return last === undefined || last === '' ? `avatar.${extension}` : last;
}

export class ExpoImagePicker implements ImagePicker {
  async pick(): Promise<PickedImage | undefined> {
    const permission = await ImagePickerModule.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return undefined;

    const result = await ImagePickerModule.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: QUALITY,
      exif: false,
    });

    if (result.canceled) return undefined;

    const asset = result.assets[0];
    if (asset === undefined) return undefined;

    const mimeType = asset.mimeType ?? 'image/jpeg';
    return {
      uri: asset.uri,
      name: asset.fileName ?? nameOf(asset.uri, mimeType),
      mimeType,
    };
  }
}

/** Ce que la coque limite quand elle redimensionne elle-même, un jour. */
export const AVATAR_MAXIMUM_DIMENSION = MAXIMUM_DIMENSION;
