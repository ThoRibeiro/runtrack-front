import type { PickedImage } from './imagePicker';

/**
 * Envoyer un fichier local au serveur.
 *
 * Un port pour ça, alors que `fetch` sait poster un `FormData` : sur React
 * Native, un formulaire multipart construit à la main autour d'une URI
 * `file://` échoue avec « Network request failed », sans code ni corps —
 * indiscernable d'une coupure réseau. Le module de fichiers d'Expo, lui, lit
 * l'URI côté natif et envoie la requête lui-même.
 *
 * Le web n'en a pas besoin : un `Blob` y suffit, et l'implémentation du
 * navigateur repasse par `fetch`.
 */
export interface UploadedFileResponse {
  status: number;
  /** Le corps, tel quel : c'est l'appelant qui sait le lire. */
  body: string;
}

export interface FileUploader {
  upload(request: {
    url: string;
    fieldName: string;
    file: PickedImage;
    headers: Record<string, string>;
  }): Promise<UploadedFileResponse>;
}
