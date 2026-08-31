# `@runtrack/adapters` — implémentations des ports

**Livré au fil des lots 5 à 12**, un adaptateur à la fois, quand le port qu'il branche est
utilisé pour de bon.

Un sous-dossier par port, un fichier par cible quand les cibles n'ont rien en commun —
c'est le cas de `MapRenderer` (`react-native-maps` contre MapLibre GL) et de `PointBuffer`
(SQLite contre IndexedDB). Partout ailleurs, une implémentation unique.

C'est le seul paquet autorisé à connaître `expo-*`, le DOM et le réseau.
