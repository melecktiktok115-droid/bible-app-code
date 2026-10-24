# Bible Chrétienne Moderne — par Meleck

Application chrétienne francophone, avec lecteur biblique, journal personnel, Conseiller IA et échanges entre membres. Le projet a été créé avec autorisation après constat de l’absence de sources existantes. Ce dépôt ne représente pas une récupération de l’ancienne application.

React 19, TypeScript, TanStack Start, Vite, CSS et icônes Lucide composent l’interface. IndexedDB (`idb`) conserve les données personnelles locales et la Bible téléchargée. Netlify Identity gère les comptes ; Netlify Functions, Netlify Database et Drizzle gèrent les échanges, les signalements et les quotas. Le Conseiller utilise OpenAI via Netlify AI Gateway, exclusivement côté serveur. Capacitor 8 fournit un projet Android initial ouvrant le site hébergé.

## Développement local

Utiliser Node 24 et pnpm :

```sh
pnpm install
netlify dev --port 8889
```

Le CLI Netlify permet l’émulation des services. Un serveur Vite seul ne reproduit pas Identity, Database ou AI Gateway. Le pipeline Netlify compile avec `vite build` et publie `dist/client` ; TanStack Start fournit le rendu serveur. Il n’y a pas de redirection SPA globale qui intercepterait les API.

Les écrans utilisent `/?page=bible`, `/?page=prieres`, etc. Les références peuvent être ouvertes avec `/?page=bible&ref=Jean%203%3A16`. Le navigateur gère les retours via l’historique.

## Configuration des services

Identity a été activé pendant la préparation. Confirmer la délivrabilité des e-mails, la confirmation des comptes et les URL de retour. Inviter `tablechaisse926@gmail.com`, puis attribuer manuellement le rôle `admin` dans Identity après vérification de l’identité du titulaire. Ne jamais attribuer un rôle à partir de l’adresse dans le navigateur. Le deuxième créateur reste à identifier.

Les migrations dans `netlify/database/migrations` sont appliquées par la plateforme au déploiement. Ne pas les appliquer manuellement. Pour une évolution : modifier `db/schema.ts`, puis `pnpm exec drizzle-kit generate --name nom_descriptif`. La ligne beta de Drizzle est conservée pour l’adaptateur Netlify demandé ; le registre la marque dépréciée au profit de RC, ce qui reste à suivre lors d’une migration compatible.

AI Gateway demande un déploiement de production et des crédits disponibles. Aucune clé fournisseur ne doit être ajoutée au frontend. L’accès administrateur Identity côté fonction doit être disponible pour vérifier les destinataires et supprimer les comptes.

## Lecture et droits

Les 66 livres de David Martin 1744 sont distribués comme texte historique du domaine public, avec provenance et licence dans `public/data/SOURCES.md`. Le nom « Moderne » décrit l’application, pas une modernisation de la traduction. Les données proviennent de Scrollmapper ; CrossWire indique « Public Domain » pour ce module. `scripts/import-bible.py` permet de reproduire l’import. Les fontes locales Manrope et Cormorant Garamond sont accompagnées de leurs licences OFL.

## État réel

Consulter [docs/LIVRAISON.md](docs/LIVRAISON.md) pour les fonctionnalités, limites et vérifications restantes, et [docs/ANDROID.md](docs/ANDROID.md) pour la préparation Android. Aucun APK n’est livré, aucun paiement n’est activé et aucun catalogue audio/vidéo non vérifié n’est publié. Les flux serveur et le mode avion restent à tester sur un déploiement réel.
