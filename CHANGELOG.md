# Changelog

Toutes les évolutions notables de **Shadow Herds**.
Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/),
numérotation en [gestion sémantique de version](https://semver.org/lang/fr/).

Une entrée correspond à une **capacité visible par le meneur** (version *mineure*)
ou à une rupture (version *majeure*) ; les correctifs et le polish (*correctif*) ne
sont listés que s'ils sont notables. La propriété `App.VERSION` (`js/app.js`) suit
ce fichier : on ne l'incrémente qu'au moment où une capacité est livrée, pas à chaque
commit.

## [Non publié]

## [1.31.0] — 2026-07-14

### Table
- **Écran spectateur — on sait qui est qui** : chaque combattant y affiche
  désormais son **portrait** (s'il en a un) et un **badge de type** (PJ / PNJ /
  CI…) à côté de son nom, avant ses moniteurs. Fini l'alignement de cases
  anonymes côté joueurs.

## [1.30.0] — 2026-07-14

### Table
- **Recherche plein-texte** (#61) : la palette de commandes (Ctrl/Cmd+K)
  trouve désormais aussi ce qui est écrit dans le bloc-notes de séance et
  les carnets — plus besoin d'un `#mot-clé` exact. Activer un résultat
  ouvre directement le bon carnet, plus jamais celui du dossier courant.

## [1.29.0] — 2026-07-14

### Organiser
- **La carte contact converge sur la fiche PNJ** : Incarnation devient une
  zone repliable (même vocabulaire, même repli animé que le PNJ), onglets
  ☰ Fiche / ❝ Incarner en haut de carte, et un module **◈ Relation** (Influence/
  Loyauté ou Niveau/RR/Atout selon l'édition, + « Connu de ») remplace les
  anciennes stats figées.
- **Fini la carte imbriquée** : un contact déployé en PNJ affiche directement
  sa fiche complète (Combat, capacités, module Relation) — plus de carte
  dans la carte, plus de double pied de carte.

## [1.28.0] — 2026-07-14

### Table
- **Actions et réactions en combat narratif** (Anarchy) : touchez une ligne
  du tracker pour mettre ce combattant « en focus » — sa fiche et son budget
  d'actions s'affichent aussitôt, comme au tour actif des autres éditions ;
  si c'est un PJ qui agit, la console de réaction des PNJ (défense,
  encaissement) prend sa place. Marquer « joué » passe sur l'anneau ✓ et la
  pastille, séparés du focus. Fini l'écran vide où « rien ne s'affichait ».

## [1.27.0] — 2026-07-14

### Table
- **Résumé de séance** : en tête du Journal des jets, un bandeau repliable
  agrège toute la partie — nombre de jets, taux de réussite, alarmes
  (échecs critiques et bévues) et le personnage le plus « chanceux » (MVP).
  Un coup d'œil pour raconter la séance à la fin, sans rien à saisir.

## [1.26.0] — 2026-07-14

### Table
- **Écran spectateur** (#59) : dans Paramètres, « Ouvrir l'écran spectateur »
  lance un second onglet en lecture seule — ordre d'initiative et moniteurs
  de condition de la rencontre en cours, sans rien d'éditable ni de fiche
  secrète. À poser côté joueurs ; se met à jour en direct pendant le combat.

## [1.25.0] — 2026-07-14

### Table
- **Suivi de campagne repensé** : sur la fiche d'un PJ, chaque ressource
  (nuyens, Karma, réputation, compteurs libres) est maintenant une ligne
  cliquable avec son solde toujours visible — toucher la ligne déplie
  montant + motif + ✓ sur place. Fini la rangée de boutons-glyphes ambiguë.
  Onglet ❖ dédié pour ouvrir directement le Suivi.
- **Anarchy 2 — fiche PJ réorganisée** : mots-clés, comportements et
  répliques rejoignent l'Incarnation ; le budget de création rejoint
  Détails. Un seul solde de nuyens visible (le portefeuille vivant, dans le
  Suivi) au lieu de deux compteurs qui se répondaient mal.
- **Signature visuelle du PJ** (couleur + initiale) désormais visible sur
  toutes les cartes de personnage, pas seulement les fiches allégées.

## [1.24.0] — 2026-07-14

### Jouer
- **Vues de carte** : trois onglets glyphes (☰ Fiche, ❝ Incarner, ⚔ Combat)
  en haut de chaque carte PNJ/PJ changent en un tap ce qui est déplié —
  Incarner ne montre que l'habillage, Combat déplie Combat/Capacités/modules
  et replie le reste. Un pli individuel fait sur une carte garde toujours la
  main sur la vue.

## [1.23.0] — 2026-07-14

### Jouer
- **Module Matrice** : le bloc cyberdeck d'un decker (attributs, réallocation,
  moniteur, programmes, cible) vit désormais dans sa propre section « Matrice »
  ⚡, juste après Combat — sorti de Détails où il était noyé.
- **Module Magie** : tradition, esprit mentor et pouvoirs d'adepte se
  regroupent dans une section « Magie » ✦ après Combat, au lieu d'être
  éparpillés en bas de carte et dans Capacités. La Résistance au Drain reste
  en Combat (un jet actif de combat doit rester à 1 tap).
- Ces sections n'apparaissent que si le PNJ les concerne (un PNJ sans deck ni
  don magique n'a ni l'une ni l'autre).

## [1.22.0] — 2026-07-14

### Jouer
- **Incarnation en haut de carte** : âge, style, attitude, manie et motivation
  se lisent maintenant juste après l'identité, avant le combat — au lieu
  d'être relégués en bas de fiche.
- **Râtelier Attaques unifié** : l'arsenal matriciel d'un decker (pic de
  données…) rejoint les armes et sorts en zone Combat, au lieu de rester
  tapi dans Détails.
- **Inventaire consolidé** : équipement porté et augmentations tiennent
  désormais dans une seule section « Équipement » au lieu de deux blocs
  séparés.
- **« Jets de situation »** (SR5/SR6) : nouveau nom des réserves MJ
  (Sang-froid, Surprise, Intentions, Mémoire…), plus clair que « Réserves
  MJ ».

## [1.21.0] — 2026-07-14

### Jouer
- **Zones repliables sur les cartes** : Combat, Capacités et Incarnation se
  replient désormais comme Détails, chacune avec sa propre mémoire (un pli
  manuel sur une carte reste tel quel). Une zone repliée affiche un résumé
  (ex. « Init 11+3D6 », « 6 compétences ») pour ne rien perdre du coup d'œil.
  Repli animé, jamais de scrollbar imbriquée.

## [1.20.0] — 2026-07-14

### Organiser
- **La rencontre se range et se rouvre** : depuis le menu « ⋯ » d'un dossier
  Run (ou sa carte de prep), « Ouvrir la rencontre » restaure combattants,
  initiative et serveur lié tels qu'ils étaient ; « Fermer » range tout dans
  le dossier. Le journal des jets peut se filtrer sur la rencontre en cours.
  Chaque dossier a aussi son propre carnet de notes (fini le bloc-notes
  unique qui se mélange d'une campagne à l'autre).

## [1.19.0] — 2026-07-14

### Jouer
- **Attributs lançables** : sur une carte, chaque attribut (et Magie/Résonance/
  Atout selon l'édition) se clique désormais pour lancer un test à ce nombre de
  dés — comme les compétences et les réserves MJ. Les limites (SR5) et
  l'Essence restent de simples valeurs de référence, non lançables.
- **Affordance de lancer toujours visible** : le petit dé ⚄ qui signale
  qu'une pastille est cliquable ne dépend plus du survol (absent au tactile) —
  il est désormais visible en permanence sur les attributs, les Jets de
  situation et les pastilles combat sans glyphe dédié (ex. Résistance au
  Drain).

## [1.18.0] — 2026-07-14

### Jouer
- **Écriture directe dans les notes** : dans le bloc-notes de séance et les
  notes de fiche, cliquez n'importe où dans le texte affiché pour écrire —
  plus besoin de viser le crayon ✎.
- **Mise en forme légère** : `**gras**`, `_italique_` et `` `code` `` sont
  désormais rendus dans toutes les notes (bloc-notes, journal, fiches).

## [1.17.0] — 2026-07-14

### Jouer
- **Journal vivant** : dans les notes (bloc-notes, journal, fiches), tapez `@`
  pour mentionner n'importe quel PNJ/PJ/contact/serveur par son nom (lien
  ancré par son identifiant — renommer l'entité met à jour tous ses liens) et
  `#` pour un mot-clé libre retrouvable partout. Chaque fiche affiche désormais
  « Mentionné dans » : ses apparitions dans le reste des notes.

### Système
- **Visite guidée** : neuf étapes présentent l'outil au premier lancement, un
  parcours court « fait faire » mène au premier PNJ généré. Le bouton Aide
  (`?`) la relance à tout moment et ouvre un bandeau « Quoi de neuf » cumulé
  qui résume les capacités ajoutées depuis votre dernière visite.

## [1.16.0] — 2026-07-14

### Personnaliser
- **Couleur PJ libre** : la palette de 6 teintes préréglées d'un personnage
  garde une 7ᵉ pastille pour choisir n'importe quelle couleur (sélecteur
  natif du navigateur).

## [1.15.0] — 2026-07-14

### Organiser
- **Réorganiser à la main** : bouton « ⠿ Réorganiser » sur les personnages,
  contacts et serveurs — glisser une fiche à sa place (souris ou doigt) ou
  la déplacer au clavier (flèches ↑/↓). L'ordre choisi est sauvegardé. La
  réorganisation des PNJ (Ombres portées) n'est pas couverte — reportée,
  le Hub affichant une vue toujours reconstruite et potentiellement filtrée.

## [1.14.0] — 2026-07-14

### Jouer
- **Arsenal matriciel du decker** : le bouton unique « Piratage » devient un
  râtelier d'actions offensives nommées (Pic de données, Force brute/Sonder
  l'accès, Planter un programme, Effacer une mark selon l'édition), chacune
  avec son pool et — pour le pic de données — sa VD (SR5 p.242, SR6 p.184).
  Anarchy 2.0 : verbes narratifs (Cybercombat, Pirater la Matrice). Anarchy
  1re : pas de râtelier (Firewall seul, pas d'attribut Attaque). Loadout curé
  par decker (EditModal), prep hors scène — le MJ garde la main sur chaque jet.

## [1.13.0] — 2026-07-14

### Générer
- **DA du sélecteur « ＋ Catalogue »** : il utilise désormais le même composant que
  « ＋ Ajouter une compétence » (au lieu d'un `<select>` natif détonnant).
- **Catalogue de Sorts** (4 éditions) et **Pouvoirs d'adepte** (SR5/SR6) dans la fiche
  d'édition : plus besoin de taper un sort ou un pouvoir à la main.
- **Catalogue d'Atouts** (Anarchy 1re/2.0) : agrégé depuis tous les archétypes du livre.
  Comme il n'existe pas de liste unique et canonique des Atouts, un même Atout peut
  apparaître en plusieurs variantes proches selon l'archétype d'origine (ex. Essence
  différente) — ce n'est pas un bug, juste l'absence de liste maîtresse dans le livre.

## [1.12.0] — 2026-07-14

### Jouer
- **Bruit matriciel** : réglage ± de scène (SR5 p.232), retranché des jets
  Matrice du decker (Piratage, duel decker↔decker, défense protégée) — la
  distance/l'environnement restent à la main du MJ, pas trackés par l'app.
- Légende du cockpit (Aide « ? ») complétée avec `🔗` (lier à la scène) et
  `🛡️` (protection Firewall d'un allié).

## [1.11.0] — 2026-07-14

### Organiser
- **Campagnes et runs** : un dossier peut désormais être marqué « Campagne »
  ou « Run » (menu « ⋯ » de la barre de dossiers, ou automatiquement via
  « Ranger la run »). Une run affiche un raccourci vers sa prep générée ;
  une campagne, le nombre de runs qu'elle contient. Purement organisationnel
  — un dossier non marqué se comporte exactement comme avant.

## [1.10.0] — 2026-07-14

### Jouer
- **Duel decker↔decker** : en combat, un decker peut viser un autre decker
  présent dans la scène et lancer « ⚔ Piratage » contre lui — les dégâts se
  résolvent sur le moniteur de son propre cyberdeck (déjà affiché sur sa
  carte).
- **Protéger un allié avec son Firewall** : un appareil ciblé (M4) peut être
  désigné comme protégé par un decker présent — badge 🛡️ + jet de
  **Défense** dédié (SR5 p.236, Indice de l'appareil + Firewall du
  protecteur ; Anarchy 2.0 « Protection active », p.216-217, Firewall +
  Logique du protecteur). SR6 n'a pas cette règle au livre — approximée par
  la même formule que SR5.

## [1.9.0] — 2026-07-14

### Table
- **Suivi de campagne sur la fiche d'un PJ** : chaque personnage-joueur peut
  désormais tenir ses **nuyens** et son **Karma** dans le temps — un registre
  daté où chaque gain/dépense porte un motif (« Run Aztechnology +8 000 ¥ »),
  le solde étant recalculé à partir de l'historique. Réglage rapide sur la
  fiche (déplié « Progression ») ou dans l'édition. Entièrement **optionnel** :
  invisible tant qu'on ne s'en sert pas.
- **Réputation par édition** : **SR5** suit les trois scores canon (Crédibilité,
  Rumeur, Renommée), **SR6** la Réputation (négative possible) et la Pression ;
  **Anarchy** n'en a pas et n'affiche donc rien.
- **Compteurs personnalisés** : ajoutez vos propres lignes de suivi (mois de
  style de vie payés, faveurs dues…), avec le même historique daté.

## [1.8.0] — 2026-07-14

### Générer
- **Éditer un PNJ avant de le sauvegarder** : le bouton « Éditer » est
  disponible dès le générateur, sur un PNJ pas encore rangé en bibliothèque —
  plus besoin de sauvegarder d'abord pour corriger un détail.
- **Catalogue d'équipement** : la fiche d'édition propose désormais un
  sélecteur « ＋ Catalogue » (armes, armures, commlinks, cyberware…) au lieu
  de tout taper à la main. **Anarchy 2.0** : les armes ajoutées sont
  structurées (VD et portées calculées), donc jouables immédiatement au tour
  du PNJ.

## [1.7.0] — 2026-07-14

### Jouer
- **Bricker les armes adverses** : en combat, quand une scène Matrice est active
  (serveur lié ou decker présent), les armes d'un combattant deviennent des
  cibles matricielles. **SR5/SR6** : chaque arme a un moniteur matriciel
  (9 cases à l'Indice d'appareil 2 « Moyen », ajustable ±) qui se remplit sous
  les dégâts ; plein → **hors service** (la fonction électronique tombe, le
  mécanique reste — la lame coupe encore). **Anarchy 2.0** : le verbe canon
  (« rendre les Smartguns inopérants », p.210) est motorisé en une bascule
  « hors service » d'un tap dans le tracker narratif, sans moniteur ni chiffre.
  Anarchy 1re n'a pas ce système (rien affiché). L'état est propre à la scène
  (jamais écrit sur la fiche permanente).

## [1.6.0] — 2026-07-14

### Organiser
- **Ajouter un contact depuis un PJ, hors édition** : sur la fiche d'un
  personnage-joueur, la section « Contacts » gagne un bouton « ＋ » qui ouvre une
  liste — « ＋ Créer un contact » en tête, puis les contacts existants du carnet.
  Cliquer un contact le lie immédiatement ; « Créer » ouvre un mini-formulaire où
  seul le nom est requis (métatype, rôle, Influence/Loyauté ou Niveau/RR selon
  l'édition sont facultatifs) et fait vivre le contact dans le carnet, éditable
  ensuite sur sa fiche. Plus besoin de passer par « Éditer ».

## [1.5.0] — 2026-07-14

### Organiser
- **Lier un contact à toute l'équipe active** : les sélecteurs de PJ (menu
  « ＋ Lier un PJ » d'une fiche contact et « 🔗 Lier à un PJ » de la sélection
  multiple) offrent en tête une entrée « ★ L'équipe » qui rattache le ou les
  contacts à chaque membre de l'équipe active d'un seul geste — plus besoin de
  lier PJ par PJ. « L'équipe » vaut tous les PJ quand aucun dossier n'est
  désigné comme équipe.

## [1.4.0] — 2026-07-13

### Jouer
- **Le decker vise un serveur** : depuis la carte d'un PNJ (hub/biblio, en
  combat comme hors combat), le bloc Cyberdeck propose un serveur cible
  (picker) puis « ⚡ Ouvrir la Matrice » (ouvre le tracker d'intrusion de ce
  serveur) et, en SR5/SR6/Anarchy 2.0, « ⚔ Piratage » (jet du pool Attaque du
  deck). En combat, si le serveur ciblé diffère du serveur lié à la scène, un
  bouton « 🔗 Lier à la scène » l'y promeut en un tap.

## [1.3.0] — 2026-07-13

### Jouer
- **Cyberdeck en vie** : le deck a désormais son propre moniteur matriciel
  (rangées de 3 cases, malus en marge) et, en SR5/SR6, une **réallocation ASDF/
  ACTF en un tap** (échange de 2 attributs — action gratuite en SR5, mineure en
  SR6). Masqué en Anarchy 1/2, sans réallocation dans leur modèle ; le
  biofeedback d'Anarchy 2.0 continue d'encaisser sur la Volonté du decker, pas
  sur un moniteur de deck séparé.

## [1.2.0] — 2026-07-13

### Consulter & organiser
- **Cyberdeck structuré** : le cyberdeck d'un decker (SR5/SR6/Anarchy 1/2) n'est
  plus qu'une ligne de texte dans l'équipement — attributs matriciels lisibles et
  éditables sur la carte (ASDF/ACTF en SR5/SR6, Firewall + relance en Anarchy 1,
  Attaque + Firewall + filtre de biofeedback en Anarchy 2.0), programmes en liste.
  Migration automatique et sans perte depuis l'ancienne chaîne libre (le texte
  d'origine reste visible en note de secours).

## [1.1.0] — 2026-07-13

### Jouer
- **Suivi de combat — dégâts nets** : la console de réaction (tour d'un PJ) peut
  désormais appliquer un résultat *net* (déjà résisté) au moniteur d'un PNJ —
  bouton ✸ Dégâts par ligne, cases Physique/Étourdissant (SR5/SR6) ou cran de
  gravité (Anarchy 2), boucle Défense → Encaisser → Dégâts sans quitter l'écran.
- Légende du cockpit (Aide « ? ») complétée avec le glyphe ✸.

## [1.0.0] — 2026-07-13

Première version applicative étiquetée. Socle complet, 100 % local.

### Générer
- PNJ complets à l'unité ou en bande (attributs, compétences, armes, augmentations,
  réserves MJ, fiche d'ambiance), composition cohérente Rôle × Milieu ×
  Professionnalisme.
- Contacts, serveurs & CI (Matrice), ébauches de run.
- Entités liées : drones/véhicules, esprits invoqués (services), créatures et
  esprits libres.

### Créer & organiser
- Assistant de création de personnage-joueur (CharGen) pas à pas.
- Bibliothèque transverse « Ombres portées » : dossiers hiérarchiques, appartenance
  multi-groupes, recherche, moniteurs de blessures cliquables, portraits IA
  optionnels.

### Jouer
- Suivi de combat : initiative groupée, fiche du combattant actif, moniteurs,
  raccourcis clavier, tiroir Matrice contextuel.
- Intrusion Matrice (déploiement de CI, Score de Surveillance, marks / accès /
  DIEU selon l'édition).
- Lanceur de dés, journal des jets (filtres, épingles, regroupement par tour),
  réserve de menace (Anarchy).

### Système
- Quatre éditions à identité visuelle distincte : Shadowrun 5, Shadowrun 6,
  Anarchy 1, Anarchy 2.
- Export Foundry VTT, sauvegarde / import-export (fichier ou URL), synchronisation
  opt-in (Gist / WebDAV).
- Versionnage des schémas (migrations exécutées au démarrage), numéro de build
  unifié.

[Non publié]: https://github.com/tbzt/ShadowHerds/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/tbzt/ShadowHerds/releases/tag/v1.0.0
