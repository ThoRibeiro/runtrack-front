import * as FileSystem from 'expo-file-system/legacy';
import type { FileUploader, UploadedFileResponse } from '@runtrack/core';

/**
 * Le téléversement natif d'Expo.
 *
 * `fetch` avec un `FormData` contenant `{ uri, name, type }` est la recette
 * courante en React Native, et elle échoue sur iOS avec « Network request
 * failed » — sans statut, sans corps, indiscernable d'une coupure. Ici, c'est
 * le module natif qui ouvre le fichier et compose la requête : il connaît les
 * URI `file://` et `ph://`, ce que la couche JavaScript ne sait pas faire.
 *
 * L'entrée `legacy` du module : l'API historique porte encore `uploadAsync`,
 * que la nouvelle n'expose pas.
 */
export class ExpoFileUploader implements FileUploader {
  async upload(request: {
    url: string;
    fieldName: string;
    file: { uri: string; name: string; mimeType: string };
    headers: Record<string, string>;
  }): Promise<UploadedFileResponse> {
    const result = await FileSystem.uploadAsync(request.url, request.file.uri, {
      httpMethod: 'POST',
      uploadType: FileSystem.FileSystemUploadType.MULTIPART,
      fieldName: request.fieldName,
      mimeType: request.file.mimeType,
      parameters: {},
      headers: request.headers,
    });

    return { status: result.status, body: result.body };
  }
}
