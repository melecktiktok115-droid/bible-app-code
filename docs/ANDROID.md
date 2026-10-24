# Préparation Android — état réel

Le projet Android a été généré avec Capacitor 8.5.3 et sa configuration native a été actualisée. Les dépendances Gradle et les fichiers natifs sont présents. Aucun APK n’a été compilé, signé, installé ou testé. Aucune publication Google Play n’a été effectuée.

L’identifiant `com.meleck.biblechretiennemoderne` est celui proposé par le propriétaire ; sa disponibilité et son attribution doivent être vérifiées avant diffusion. Le nom de l’application est « Bible Chrétienne Moderne — par Meleck ».

## Compatibilité

TanStack Start produit du HTML côté serveur, avec des ressources client dans `dist/client` mais sans `index.html` autonome. Le simple empaquetage de ce répertoire ne suffit pas. La configuration actuelle utilise donc `server.url=https://bible-app-code.netlify.app` : c’est une enveloppe du site hébergé, dépendante de la disponibilité du site. Ce choix ne garantit pas un démarrage hors ligne du WebView.

La Bible téléchargée et les données personnelles utilisent IndexedDB dans l’origine du site. Elles ne sont ni un cache temporaire ni une base SQLite. Leur conservation dépend du profil WebView et des politiques du système ; supprimer les données de l’application les efface. Une future variante web statique embarquée demanderait une adaptation des appels API, d’Identity, des liens de confirmation et des origines autorisées ; il ne faut pas ouvrir CORS sans contrôle. Pour cette variante, évaluer SQLite via un plugin Capacitor maintenu, avec migrations et chiffrement des données sensibles si nécessaire.

La permission INTERNET est la seule permission demandée. HTTP clair et contenus mixtes sont désactivés ; les sauvegardes Android sont désactivées. Le clavier demande `adjustResize`, le viewport web utilise `interactive-widget=resizes-content`. Le bouton Retour navigue dans l’historique du WebView, puis ferme l’activité à la racine. L’icône et le thème de démarrage utilisent le bleu nuit et la croix or. Ces comportements restent à contrôler sur appareils réels.

## Compilation dans un environnement Android

Préparer Android Studio, le SDK Android 36, les licences SDK et un JDK 21 compatible avec Capacitor 8 et la configuration Gradle fournie. Ne jamais inclure un fichier de signature, mot de passe ou `local.properties` dans le dépôt.

Après installation des dépendances, disponibilité du site déployé et revue de l’origine :

```sh
pnpm exec cap update android
pnpm exec cap open android
```

La variante hébergée peut utiliser `cap update android` sans ressources web locales parce que `server.url` est défini. Pour une future variante embarquée, compiler d’abord la sortie statique appropriée puis `pnpm exec cap sync android` ; la sortie SSR actuelle ne convient pas telle quelle.

Dans Android Studio, synchroniser Gradle puis compiler une version de débogage. En ligne de commande depuis le dossier `android` :

```sh
./gradlew assembleDebug
```

Le chemin **attendu après compilation réussie**, qui n’existe pas dans cette livraison, est `android/app/build/outputs/apk/debug/app-debug.apk`. Vérifier ensuite la signature avec `apksigner verify --verbose <fichier.apk>`, installer sur un appareil de test avec `adb install <fichier.apk>`, puis examiner les erreurs avec les outils Android. La version de débogage ne constitue pas une version de distribution signée avec la clé du propriétaire.

Pour une version finale, utiliser la procédure Android Studio de génération d’APK signé et une clé détenue par le propriétaire. Aucun identifiant de signature ni mot de passe ne doit être codé en dur.

## Recette obligatoire

Tester connexion, confirmation et récupération Identity dans le WebView ; Retour et navigation profonde ; clavier sur petits écrans ; téléchargement des 66 livres ; fermeture et redémarrage ; mode avion et recherche locale ; favoris et surlignages ; journal ; suppression des données ; reprise de connexion ; erreurs IA ; quota du onzième appel ; autorisations intercomptes et blocages. Tester également un premier démarrage sans réseau : l’enveloppe distante ne le garantit pas. Aucun de ces tests Android n’a été exécuté ici.
