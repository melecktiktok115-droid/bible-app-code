# Architecture et conventions

Bible Chrétienne Moderne — par Meleck est un nouveau projet autorisé après audit d’un espace de travail sans sources. Ne pas prétendre avoir récupéré les fonctions de l’ancien site.

## Structure

- `src/routes/__root.tsx` : document français et métadonnées.
- `src/routes/index.tsx` : unique route TanStack, monte `BibleApp`.
- `src/components/bible-app.tsx` : navigation par paramètres `?page=`, accueil et contenus éditoriaux.
- `src/components/reader.tsx` : lecteur, téléchargements, favoris et journal.
- `src/components/online.tsx` : Identity, Conseiller, communauté, messagerie et modération.
- `src/lib/local.ts` : IndexedDB, magasins `personal` et `downloads`. L’IA locale est isolée par identifiant de compte. Le journal et les favoris appartiennent à l’appareil, pas au compte.
- `src/lib/books.ts`, `daily.ts` : index des livres et sélection de versets issus du jeu de données.
- `public/data` : Bible Martin 1744 et provenance. `scripts/import-bible.py` reproduit l’import.
- `public/fonts`, `src/fonts.css` : fontes locales et licences.
- `src/styles.css` : système bleu nuit, styles responsive et états.
- `public/sw.js` : cache du shell et des ressources uniquement ; ne jamais mettre les API, Identity ou messages privés en cache partagé. Le texte hors ligne reste dans IndexedDB.
- `db/schema.ts`, `db/index.ts`, `drizzle.config.ts` : schéma, client et génération de migrations.
- `netlify/functions/service.mts` : API POST, validation Zod, identité serveur, contrôle des participants et rôles, quotas atomiques SQL, réponses privées sans cache.
- `netlify/database/migrations` : migrations générées, application automatique par Netlify.
- `android`, `capacitor.config.ts` : enveloppe Android hébergée ; aucun bundle web autonome ni APK livré.
- `docs/LIVRAISON.md`, `docs/ANDROID.md` : état réel et limites.

## Règles

TypeScript strict ; composants en PascalCase, imports internes `@/`. Ne jamais lire le stockage navigateur pendant le rendu SSR. Les nouveaux écrans doivent préserver les six entrées principales. Couleurs de référence : #071426, #0B1F3A, #122B4A, #1D4268, or #D4AF37. Titres Cormorant Garamond et texte Manrope. Fournir labels, focus, erreurs et états vides ; éviter les actions fictives.

Ne jamais confondre IA et messagerie humaine. Ne jamais autoriser un accès depuis une identité ou un rôle fourni par le client. Les administrateurs ne disposent pas d’un accès général aux messages privés. Le compte créateur est invité et doté du rôle `admin` depuis Identity, sans attribution automatique par e-mail.

Les quotas restent côté serveur, atomiques et basés sur l’identifiant Identity ; les dates sont UTC. Un appel IA échoué consomme un essai, explicitement documenté. Aucun secret dans le code, les logs ou les ressources publiques. La suppression de compte nettoie les contenus avant de supprimer Identity ; les journaux de modération peuvent être conservés selon une politique à définir.

Le catalogue musical public est vide volontairement. Toute entrée future exige source officielle, titre/artiste/album exacts, catégorie chrétienne, statut vérifié, lien et droits. Les titres en attente restent invisibles. Aucune recherche musicale générale. David Okit reste « Catalogue en cours de vérification ».

Ne pas remplacer `server.url` de Capacitor par une copie de `dist/client` en affirmant un support natif autonome : TanStack Start nécessite un rendu serveur. Une variante statique et une stratégie d’authentification/API adaptées sont nécessaires pour cet objectif. SQLite est à évaluer pour cette variante, pas à ajouter à l’aveugle.

Dans cet environnement, les builds et tests locaux sont interdits : vérifier les fichiers et laisser la plateforme valider. Ne pas annoncer de test fonctionnel, de déploiement ou de compilation Android sans preuve réelle.
