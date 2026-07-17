# Architecture de ShadowHerds — la carte du code

Ce document répond à une seule question : **« où est quoi, et qui appelle qui ? »**
Il complète [CONTRIBUTING.md](CONTRIBUTING.md), qui donne les *règles* ; ici on
donne la *carte*. À lire d'abord pour reprendre le code sans avoir à fouiller.

---

## 1. Le modèle mental en 30 secondes

- **Vanilla JavaScript, aucun build.** Pas de bundler, pas de `npm`, aucune
  étape de compilation. On ouvre `index.html`, ça marche. Déploiement GitHub
  Pages (site statique) : on édite un fichier, `git push`, terminé.
- **Chaque fichier est un module ES natif.** Il `export`e son objet et
  `import`e ses dépendances par URL relative explicite, en tête de fichier :
  ```js
  import { Utils } from "../core/utils.js";
  export const Dice = { … };
  ```
  **Pour savoir de quoi dépend un fichier, lisez ses `import` — c'est écrit.**
- **Un fichier = un domaine = un objet**, dont le nom correspond au nom du
  fichier : `storage.js` exporte `Storage`, `weaponroll.js` exporte
  `WeaponRoll`. Le nom du fichier vous dit le nom de l'objet, et inversement.
- **Les dépendances ne descendent que vers le bas.** Une couche basse (socle) ne
  connaît jamais une couche haute (interface). C'est le verrou qui garde le
  projet démontable.
- **Deux globals assumés** : `App` (point d'entrée + namespace, lu partout) et
  `Debug` (confort de console). Le reste des `window.X = X` sont des **ponts de
  migration temporaires** (cf. §10).
- **100 % local.** Aucun serveur, aucun appel réseau (sauf portraits IA opt-in).
  Toute la persistance est dans le `localStorage`, derrière `Storage`.

---

## 2. Les couches

Les dossiers `js/` reflètent des couches de dépendance. Une flèche `→` se lit
« peut dépendre de » ; elle ne pointe **jamais** vers le haut. Depuis le passage
aux modules ES, l'ordre des `<script>` dans `index.html` **n'est plus
load-bearing** (le graphe de modules résout tout seul) — il reste rangé par
couche pour la lisibilité, rien de plus.

```
6. Orchestration     js/app.js          App : bootstrap, routing, sélecteur d'édition
        ↑
5. Contrôleurs       js/controllers/    lisent le formulaire, appellent un moteur,
                                        stockent, déclenchent le rendu
        ↑
4. Rendu / widgets   js/widgets/        reçoivent des données → produisent du HTML
                                        et des interactions ; ne persistent rien
        ↑
3b. Catalogues liés  js/catalogs/       drones, esprits, créatures, drogues
        ↑
3. Éditions          js/editions/       sr5, sr6, anarchy1, anarchy2 (+ compagnons)
        ↑
2. Données / règles  js/rules/          catalogues et moteurs neutres (dés, magie…)
        ↑
1. Socle             js/core/           utils, storage, debug — feuilles sans dépendance
```

**Règle de placement d'un nouveau fichier :** il va dans le dossier de sa couche,
et son `<script>` s'insère au bon rang dans `index.html`. Rien d'autre à faire
avant de committer : il n'y a plus de cache-bust à propager (voir §6).

---

## 3. Carte fichier → objet → responsabilité

### Couche 1 — Socle (`js/core/`)

| Fichier | Objet | Responsabilité |
|---|---|---|
| `utils.js` | `Utils` | Boîte à outils pure : aléa, normalisation de recherche, helpers DOM. Reçoit le résolveur d'édition par injection (`Utils.init`), ne nomme jamais `App`. |
| `storage.js` | `Storage` | **Unique** dépositaire du `localStorage`. Format de clé `sr_pnj_v2_<édition>_<clé>`, migrations de schéma, observateurs d'écriture. Rien d'autre ne touche `localStorage`. |
| `debug.js` | `Debug` (`window.Debug`) | Journalisation par canaux, filtrable au runtime. Feuille sans dépendance : tout le monde peut l'appeler. |

### Couche 2 — Données / règles (`js/rules/`)

Moteurs et catalogues **neutres vis-à-vis de l'édition** : ils reçoivent le régime
de l'édition en paramètre (`use(edition)` ou via `App.editionModule`), ils ne
branchent jamais `if (App.edition === …)`.

| Fichier | Objet | Responsabilité |
|---|---|---|
| `actor.js` | `Actor` | Accesseurs de valeurs d'acteur (attributs, compétences). Couture (`seam`) de la refonte du modèle d'acteur : forme cible `Trait {base, mods, total}`. |
| `dice.js` | `Dice` | Moteur de jets pur et testable (sans DOM) : jet standard, initiative, jet Anarchy à dés de risque. |
| `metavariants.js` | `Metavariants` | Métavariantes SR5 (souches, métaconsciences). Déclare aussi un petit helper interne `RULE` (texte de trait partagé), non exporté. |
| `infected.js` | `Infected` | Infectés (goules, vampires…) sélectionnables comme métavariante. |
| `matrix.js` | `Matrix` | Catalogues de CI, profils d'indice et sculptures, par édition (`Matrix.use(edition)`). Côté serveur. |
| `cyberdeck.js` | `Cyberdeck` | Miroir de `matrix.js` côté decker ; délègue tout à `cyberdeckModel` de l'édition. |
| `skillcatalog.js` | `SkillCatalog` | Listes de compétences et spécialités des livres, pour l'édition manuelle. |
| `weaponeffects.js` | `WeaponEffects` | Effets d'objet motorisés sur un **jet d'arme**, en contributions étiquetées par facette. |
| `actoreffects.js` | `ActorEffects` | Modificateurs situationnels d'objet au niveau du **personnage** (sans surface de jet). |
| `skilleffects.js` | `SkillEffects` | Bonus de pool d'objet sur un jet de **compétence** nommée. |
| `weaponroll.js` | `WeaponRoll` | Relie une arme à sa réserve d'attaque ; réconcilie arme ↔ compétence à la génération. |
| `itemresolver.js` | `ItemResolver` | Classement métier des objets (pas de HTML), consommé par `CardRenderer`. |
| `loadoutengine.js` | `LoadoutEngine` | Tirage d'équipement data-driven (rareté + affinité), neutre. |
| `bonusengine.js` | `BonusEngine` | Applique les bonus mécaniques d'équipement/traits aux PNJ générés (point d'entrée `apply(pnj, edition)`). |
| `anarchyatouts.js` | `AnarchyAtouts` | Overlay render-time des atouts d'équipement Anarchy (jamais baké dans le PNJ). |
| `flavor.js` | `Flavor` | Couche d'habillage narratif appliquée **après** génération, filtrée par contexte. Toute donnée d'ambiance vit ici. |
| `content.js` | `Content` | Base d'aléas cohérents pour les PNJ, indexée par édition. |
| `magic.js` | `Magic` | Traditions magiques & esprits mentors, par édition. |
| `coherence.js` | `Coherence` | Moteur générique de composition Rôle × Milieu × Puissance. Ne connaît aucune édition. |
| `campaign.js` | `Campaign` | Suivi de campagne d'un PJ : registre daté, soldes dérivés (jamais stockés en double). |
| `notebooks.js` | `Notebooks` | Carnets markdown keyés par dossier id (un document par dossier). |

### Couche 3 — Éditions (`js/editions/`)

**Le cœur de la lutte anti-branches.** Toute valeur qui dépend de l'édition vit
ici, exposée via `App.editionModule` (voir §4). Chaque édition a un fichier
principal + des **compagnons** qui s'y greffent par `Object.assign` :

| Fichier | Objet | Rôle |
|---|---|---|
| `sr5.js` | `EditionSR5` | Édition Shadowrun 5 (attributs, PNJ, génération, `recalc`). |
| `sr5.foundry.js` | ↳ `EditionSR5.foundryExport` | Export SR5 → Foundry VTT. |
| `sr5.print.js` | ↳ `EditionSR5.printSheet` | Feuille imprimable fidèle SR5. |
| `sr6.js` | `EditionSR6` | Édition Shadowrun 6. |
| `sr6.foundry.js` | ↳ `EditionSR6.foundryExport` | Export SR6 → Foundry. |
| `sr6.print.js` | ↳ `EditionSR6.printSheet` | Feuille imprimable SR6. |
| `anarchy2.js` | `EditionAnarchy2` | Anarchy 2e édition. |
| `anarchy2.creation.js` | ↳ `EditionAnarchy2.creation` | Barème de création de PJ Anarchy 2 (lu par `CharGen`). |
| `anarchy2.foundry.js` | `FoundryAnarchy2Export` → greffé | Export Anarchy 2 → Foundry. |
| `anarchy2.print.js` | ↳ `EditionAnarchy2.printSheet` | Feuille imprimable Anarchy 2. |
| `anarchy1.js` | `EditionAnarchy1` | Anarchy 1re édition (identité visuelle distincte, pas une variante). |
| `anarchy1.print.js` | ↳ `EditionAnarchy1.printSheet` | Feuille imprimable Anarchy 1. |

> **Quatre éditions, pas trois.** SR5, SR6, Anarchy 1 et Anarchy 2 sont **quatre
> identités et quatre jeux de règles distincts**. Anarchy 1 et 2 partagent le
> sélecteur CSS `[data-edition^="anarchy"]` mais ne sont pas une variante l'une
> de l'autre.

### Couche 3b — Catalogues liés (`js/catalogs/`)

Générateurs d'entités **indépendantes de l'édition active** (elles reprennent
la forme PNJ de leur édition), déployées à côté d'un PNJ « maître ».

| Fichier | Objet | Responsabilité |
|---|---|---|
| `drugs.js` | `Drugs` | Effet / contrecoup automatiques d'une drogue détectée dans l'équipement. |
| `vehicles.js` | `Vehicles` | Véhicules & drones déployables (carte sœur du propriétaire). |
| `spirits.js` | `Spirits` | Esprits invoqués depuis un PNJ conjurateur (carte liée). |
| `creatures.js` | `Creatures` | Paranimaux / Infectés autonomes. **Chargé en différé** (voir §7). |

### Couche 4 — Rendu / widgets (`js/widgets/`)

Un widget reçoit des données et produit du HTML + des interactions par
délégation (`data-*`). **Il ne persiste rien, ne modifie pas les données, ne lit
pas l'état des contrôleurs.**

**Socle de cartes & collections**
| Fichier | Objet | Responsabilité |
|---|---|---|
| `collection.js` | `Collection` | **Socle des collections persistées avec groupes.** `Collection.create(config)` sert Shadows, ContactsBook, Servers, Characters (voir §4). |
| `grouppicker.js` | `GroupPicker` | Popover d'appartenance multi-groupes, partagé par toutes les collections. |
| `cardrenderer.js` | `CardRenderer` | Rend une carte PNJ et gère son rafraîchissement. Corps par édition greffés en `Object.assign` (fichiers ci-dessous). |
| `cardrenderer.sr5.js` / `.sr6.js` / `.anarchy.js` / `.anarchy1.js` | ↳ `CardRenderer` | Corps de carte spécifiques par édition. |
| `cardrenderer.linked.js` | ↳ `CardRenderer` | Rendu des entités liées (véhicules, esprits). |
| `cardfooter.js` | `CardFooter` | Mise en page **unique** du pied de toute carte (le domaine décrit ses actions, le socle les positionne). |
| `cardmenu.js` | `CardMenu` | Popover de débordement `⋯` d'un pied de carte. |
| `serverrenderer.js` | `ServerRenderer` | HTML du panneau Matrice (serveurs). |
| `cyberdeckrenderer.js` | `CyberdeckRenderer` | Bloc deck sur la carte PNJ (miroir de ServerRenderer). |
| `encounterrenderer.js` | `EncounterRenderer` | Rendu **pur** du tracker de combat. |
| `runrenderer.js` | `RunRenderer` | Rendu d'une amorce de run. |
| `rosterview.js` | `RosterView` | Bascule Ombres cartes ↔ annuaire dense. |

**Modes & interactions transverses**
| Fichier | Objet | Responsabilité |
|---|---|---|
| `contentmodal.js` | `ContentModal` | **Le modèle de délégation d'événements** : un écouteur global sur `data-*`, aucun nom d'objet figé dans le HTML. |
| `dialog.js` | `Dialog` | Remplace `prompt()`/`confirm()` natifs par des modales thémées. |
| `selectionmode.js` | `SelectionMode` | Mode sélection multiple (révèle cases + gouttière via classe `selecting` sur `<body>`). |
| `reordermode.js` | `ReorderMode` | Mode réorganiser (poignées de glisser-déposer, classe `reordering`). |
| `bulkbar.js` | `BulkBar` | Barre d'actions en masse (panneau flottant non bloquant). |
| `multiselect.js` | `MultiSelect` | Filtre « ajouter / enlever » (choix multiples en puces). Remplace un `<select>` natif. |
| `singleselect.js` | `SingleSelect` | Menu déroulant stylé à choix unique. |
| `profcategories.js` | `ProfCategories` | Regroupement des professions par archétype (filtre double niveau). |
| `sidebartoggle.js` | `SidebarToggle` | Repli/ouverture des sidebars de dossiers. |

**Dés & outils MJ**
| Fichier | Objet | Responsabilité |
|---|---|---|
| `diceroller.js` | `DiceRoller` | UI de lancer (overlay d'animation, panneau de risque Anarchy, câblage `[data-roll]`). |
| `dicepanel.js` | `DicePanel` | Lanceur de dés mobile (FAB + bottom sheet). |
| `dicelog.js` | `DiceLog` | Journal des jets de la session. |
| `opposedroll.js` | `OpposedRoll` | Jet opposé + seuil (outil MJ libre). |
| `magicaction.js` | `MagicAction` | Lance un sort / une invocation de bout en bout. |
| `summonpanel.js` | `SummonPanel` | Invocation d'esprits (domaine autonome extrait de `UI`). |
| `breakdown.js` | `Breakdown` | Popover d'explication décomposée d'une réserve (Défense, Encaissement…). |
| `notepad.js` | `Notepad` | Bloc-notes de séance (scratchpad persistant, volontairement léger). |

**Dossiers, contexte & journal**
| Fichier | Objet | Responsabilité |
|---|---|---|
| `dossiers.js` | `Dossiers` | Registre transverse de regroupement narratif (arbre plat à `parentId`). |
| `dossierbar.js` | `DossierBar` | Barre de dossiers partagée : détient LA sélection courante (filtre du hub + des générateurs). |
| `contextselector.js` | `ContextSelector` | Sélecteur de contexte unique et réutilisable (Campagne › Run › Scène). |
| `pinrow.js` | `PinRow` | Rangée d'épingles d'accès rapide (100 % en mémoire, pas de Storage). |
| `palette.js` | `Palette` | Palette de commandes (Ctrl/Cmd+K), source unique `PnjLookup.search`. |
| `mentions.js` | `Mentions` | Autocomplétion `@`/`#` + rendu des puces (ancrage par ID). |
| `markdown.js` | `Markdown` | Mise en forme légère des notes (opère sur du texte déjà échappé). |

**Divers UI**
| Fichier | Objet | Responsabilité |
|---|---|---|
| `ui.js` | `UI` | Interactions live restantes (moniteurs, drogues, liens). *Ex-fourre-tout en cours de dégraissage.* |
| `contactcreate.js` | `ContactCreate` | Modale de création rapide d'un contact depuis une fiche PJ. |
| `spectatorview.js` | `SpectatorView` | Écran joueur (rendu lecture seule de l'initiative, 2e onglet). |
| `onboarding.js` | `Onboarding` | Bulle de première présentation de la barre du haut (vue une fois). |
| `tour.js` | `Tour` | Moteur générique de visite guidée (zéro contenu, zéro édition). |
| `toursteps.js` | `TourSteps` | Manifeste déclaratif de la visite (données pures). |

### Couche 5 — Contrôleurs (`js/controllers/`)

Un contrôleur **lit le formulaire, appelle un moteur, stocke, déclenche le
rendu**. Il ne génère rien lui-même et ne dessine pas de HTML directement.

| Fichier | Objet | Responsabilité |
|---|---|---|
| `generator.js` | `Gen` | Formulaire + génération PNJ individuel / bande (filtres multi-sélection). |
| `rungen.js` | `RunGen` | Générateur de **runs** (missions). N'appartient **pas** au domaine contact. |
| `shadows.js` | `Shadows` | Ombres portées : bibliothèque de PNJ (socle `Collection`). |
| `servers.js` | `Servers` | Serveurs & CI (Matrice) : bibliothèque + génération (socle `Collection`). |
| `characters.js` | `Characters` | Bibliothèque de PJ (socle `Collection`, sidebar = arbre de dossiers). |
| `chargen.js` | `CharGen` | Assistant de création de PJ (agnostique, lit `editionModule.creation`). |
| `contactgen.js` | `ContactGen` | Domaine contact — brique **données** (catalogues + fabrication). |
| `contacts.js` | `Contacts` | Domaine contact — brique **panneau** (formulaire + affichage). |
| `contactsbook.js` | `ContactsBook` | Domaine contact — brique **bibliothèque** persistante (socle `Collection`). |
| `hub.js` | `Hub` | « Ombres portées » : vue transverse par dossier des trois collections. Consultation seule. |
| `play.js` | `Play` | Panneau « Jouer » : projette la colonne Campagne › Run › Scène. Ne crée aucune donnée. |
| `encounter.js` | `Encounter` | Tracker de combat (initiative, tours, rounds). Ne stocke que des `pnjId`, résolus via `PnjLookup`. |
| `intrusion.js` | `Intrusion` | État vivant d'une intrusion matricielle (scène-scopée dans `Encounter.state.matrix`). |
| `deckrun.js` | `DeckRun` | Ciblage vivant du decker (miroir d'Intrusion, état sur `pnj.cyberdeck.run`). |
| `pnjlookup.js` | `PnjLookup` | **Résolution publique unique** d'une entité à travers tous les pools. Sans dépendance remontante. |
| `editmodal.js` | `EditModal` | Édition avancée d'un PNJ sauvegardé (modale). |
| `portrait.js` | `Portrait` | Génération de portraits IA à la demande (Pollinations, opt-in, agnostique). |
| `settings.js` | `Settings` | Paramètres par édition, via `Storage`. |
| `backup.js` | `Backup` | Export / import global (toutes éditions) dans un JSON. |
| `sync.js` | `Sync` | Sauvegarde synchronisée sur stockage utilisateur (Gist / WebDAV). Réutilise `Backup`. |
| `printsheet.js` | `PrintSheet` | Contrôleur **neutre** d'impression (le savoir « à quoi ressemble une fiche » vit dans l'édition). |
| `foundryexport.js` | `FoundryExport` | Contrôleur **neutre** d'export Foundry (délègue à `editionModule.foundryExport`). |
| `foundryimport.js` | `FoundryImport` | Contrôleur **neutre** d'import Foundry (miroir de l'export). |

### Couche 6 — Orchestration (`js/app.js`)

| Fichier | Objet | Responsabilité |
|---|---|---|
| `app.js` | `App` | Bootstrap, routing, sélecteur d'édition, chargement conditionnel des assets d'édition (§7), et **`App.context`** = vérité unique « où suis-je ? » (Campagne › Run › Scène, persistée). |

---

## 4. Les patrons transverses (à connaître avant de toucher au code)

Cinq mécanismes reviennent partout. Les comprendre évite 90 % des surprises.

### a. `App.editionModule` — le contrat d'édition
Aucun consommateur ne branche `if (App.edition === "sr5")`. Il lit une propriété
ou appelle une méthode sur `App.editionModule` (le module de l'édition active).
Contrat commun : `id`, `label`, `badgeLabel`, `formOptions`, `generate(opts)`,
`recalc(pnj)`, plus des propriétés lues au besoin (`conditionMonitor`,
`combatModel`, `matrixModel`, `actionBudget`, `creation`, `foundryExport`,
`printSheet`…). **Toute propriété qu'un consommateur lit doit exister dans les
quatre modules** (valeur neutre si l'édition n'est pas concernée).

### b. `Collection.create(config)` — les collections persistées
`Shadows` (PNJ), `ContactsBook` (contacts), `Servers` (serveurs) et `Characters`
(PJ) sont **une instance de `Collection`** chacun. Le socle gère persistance,
groupes, filtre, rendu sidebar + grille, délégation. Le contrôleur ne porte que
ce qui est propre au domaine, passé en config (clés Storage, ids DOM, libellés,
rendu de carte).
> ⚠️ **Dette connue :** `Shadows`, `ContactsBook` et `Servers` ont trois copies
> historiques *divergentes* du patron « collection avec groupes » en cours de
> convergence sur `Collection`. Ne pas créer une quatrième copie ; toute
> correction du patron se porte sur les trois.

### c. `Object.assign` — les fichiers compagnons
Un domaine trop gros pour un fichier se découpe **par couche fonctionnelle**, et
les morceaux se greffent sur l'objet principal par `Object.assign`, en se
chargeant *après* lui : `CardRenderer` + ses corps par édition, `EditionSR5` +
`.foundry`/`.print`. C'est pour ça que l'ordre de chargement est séquentiel
(§7) : le compagnon exige que la base existe déjà.

### d. `ContentModal` / délégation d'événements — zéro `onclick`
Les interactions ne sont **jamais** câblées par `onclick=` dans le HTML. Un
écouteur global lit des attributs `data-action` / `data-*`. Aucun nom d'objet
n'est figé dans le HTML, donc renommer un objet ne casse pas les gabarits.

### e. `App.context` — orientation Campagne › Run › Scène
Une **seule vérité** du contexte courant (`{ dossier, scene }`), persistée et lue
par toutes les surfaces (fil d'Ariane, sélecteur, perche « Reprendre »). Les
trois échelles se *dérivent* de la chaîne de parents `Dossiers`, jamais stockées
séparément.

---

## 5. Deux flux typiques, de bout en bout

**Générer un PNJ**
```
Gen (controller)  lit le formulaire (MultiSelect, ProfCategories)
   → App.editionModule.generate(opts)      [couche 3, produit l'objet PNJ]
       ↳ Coherence, LoadoutEngine, Content, Flavor, BonusEngine  [couche 2]
   → Gen.pool (mémoire)
   → CardRenderer.render(pnj)               [couche 4, HTML + data-*]
   → « Sauvegarder » → Shadows → Collection → Storage   [persistance]
```

**Lancer une réserve depuis une carte**
```
clic sur [data-roll] dans la carte
   → DiceRoller (délégation globale)        [couche 4]
   → Dice.computeRoll(...)                  [couche 2, calcul pur]
   → overlay d'animation + DiceLog.record()
```

---

## 6. Persistance & versionnage — les trois nombres à ne pas confondre

| Nom | Détenu par | Ce qu'il versionne | Quand il bouge |
|---|---|---|---|
| **Époque de stockage** (`v2` du préfixe) | `storage.js` | Le *namespace* des clés | Quasi jamais (reset total incompatible). |
| **`schemaVersion`** | `storage.js` | La *forme* des valeurs JSON | À chaque évolution de contenu persisté ; migrations en chaîne ordonnée. |
| **`App.VERSION`** (semver) | `app.js` | La *release* visible utilisateur | MINOR = capacité neuve (+ CHANGELOG + visite) ; PATCH = correctif ; MAJOR = rupture. |

Il n'y a **pas de quatrième nombre** : le cache-bust `?v=NN` et son outillage
(`tools/bump_version.py`) ont été retirés en juillet 2026. Le cache est géré par
les en-têtes HTTP de GitHub Pages (`max-age=600` + `ETag`) : un fichier modifié
se propage seul en ≤ 10 min, aucun geste avant de committer. En dev local,
`python -m http.server` n'envoie aucun en-tête de cache → **Ctrl+Shift+R** après
édition.

Détail complet dans [CONTRIBUTING.md](CONTRIBUTING.md) §§ « Versionner les
schémas » et « Cache (plus de `?v=`) ».

---

## 7. Chargement : initial vs différé

Tout n'est pas chargé au démarrage. L'écran de choix d'édition n'a besoin ni des
modules d'édition ni du gros catalogue de créatures (~280 Ko + 238 Ko) :

- **Chargé par `index.html`** au boot : tout le socle, les règles, les widgets,
  les contrôleurs.
- **Chargé à la sélection d'édition** (`App._loadEditionAssets`, qui injecte des
  `<script type="module">`) : le thème CSS de l'édition, son module principal +
  compagnons (`_EDITION_JS`/`_EDITION_CSS`), et `creatures.js` (`_COMMON_JS`).

> ⚠️ **`creatures.js` n'est pas dans `index.html`** : le chercher là échoue. Il
> est listé dans `App._COMMON_JS`.
>
> ⚠️ **Ne JAMAIS `import`er statiquement `Creatures` ni un `EditionX`** depuis un
> fichier chargé au boot : l'import statique ramènerait ces ~518 Ko dans le
> chargement initial et annulerait tout le bénéfice du différé. Ces deux-là se
> lisent en global (`window.Creatures` / `window.EditionX`, posés par le module
> à son arrivée), toujours depuis une méthode appelée *après* la sélection
> d'édition — jamais à l'évaluation d'un module. C'est la seule entorse assumée
> à la règle « importe ce que tu utilises », et elle est intentionnelle.

---

## 8. Pièges de navigation (les exceptions à connaître)

- **`creatures.js` absent d'`index.html`** (chargé en différé, §7).
- **Trois copies divergentes** du patron collection (`Shadows` /
  `ContactsBook` / `Servers`) : voir §4b.
- **`ui.js` (`UI`) est un ancien fourre-tout** en cours de dégraissage
  (l'invocation d'esprits en a déjà été extraite vers `SummonPanel`). N'y rien
  rajouter ; extraire vers un domaine nommé.
- **Fichiers logiques les plus lourds** (hors data pure) :
  `cardrenderer.js`, `encounter.js`, `editmodal.js` — candidats à un découpage
  par couche si on les rouvre en profondeur.
- **Fichiers volumineux = data, pas logique** : `anarchy2.js`, `content.js`,
  `creatures.js`, `sr5.js`, `sr6.js` sont surtout des tables de jeu ; leur
  taille est normale.

---

## 9. Où vivent les autres artefacts

| Quoi | Où |
|---|---|
| Règles d'architecture (doctrine) | [CONTRIBUTING.md](CONTRIBUTING.md) |
| Changelog public (capacités livrées) | [CHANGELOG.md](CHANGELOG.md) |
| Présentation utilisateur | [README.md](README.md) |
| Structure (grilles, composants, transitions) | `css/base/*.css` |
| Habillage par édition (couleurs, typo) | `css/theme-*.css` (tokens `:root` surchargés par `[data-edition]`) |
| Outils de build | **aucun** — pas de bundler, pas de script de version, rien à lancer avant un commit |
| Doctrine perso Claude↔utilisateur | `CLAUDE.md`, `CODIR.md` (gitignorés) |

---

## 10. Les ponts `window.X` — dette résiduelle assumée

Chaque module se termine encore par une ligne du type :

```js
// Pont couche 4 (migration modules ES) — retiré en fin de migration.
window.CardRenderer = CardRenderer;
```

Ces **96 ponts** datent de la migration : ils rendaient un module visible depuis
les scripts classiques pas encore convertis. **Il n'y a plus aucun script
classique** — ils ne servent donc plus qu'à deux choses :

1. les rares références en global nu que les `import` n'ont pas remplacées ;
2. le confort de console (taper `CardRenderer.` dans les devtools).

Les retirer est possible mais demande de vérifier, module par module, que chaque
référence croisée passe bien par un `import` — un travail de fourmi à faire
tranquillement, pas un préalable. **Deux ponts restent de toute façon
volontaires** : `App` (§1) et `Debug`. Ne pas en ajouter de nouveau : un
nouveau fichier `import`e ce dont il a besoin.

---

*Cette carte décrit l'état du code au moment de sa rédaction. Quand un fichier
change de domaine, se scinde ou fusionne, mettre à jour la table de la couche
concernée (§3) — c'est la seule section qui périme.*
