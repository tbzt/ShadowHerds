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
                                        (7 tiroirs de rangement : card, dice,
                                        journal, kit, collection, play, tour —
                                        sans hiérarchie entre eux, cf. §3)
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

Les 45 fichiers sont rangés en **sept tiroirs**. Attention à ce qu'ils sont :
des **tiroirs de rangement, pas des sous-couches**. Il n'y a aucune hiérarchie
entre eux, et le graphe interne comporte des cycles assumés
(`cardrenderer ↔ cardfooter`, `dicelog ↔ dicepanel`, `palette ↔ pinrow`,
`selectionmode ↔ bulkbar`), plus un `kit/ui.js` qui dépend de
`card/cardrenderer.js`. `widgets/` reste la couche 4 d'un seul tenant : la seule
règle de dépendance qui vaille est celle du §2, entre couches.

Pour placer un nouveau widget : le tiroir de son sujet ; à défaut, `kit/`.

**`card/` — rendu de carte** (10)
| Fichier | Objet | Responsabilité |
|---|---|---|
| `cardrenderer.js` | `CardRenderer` | Rend une carte PNJ et gère son rafraîchissement. Corps par édition greffés en `Object.assign` (fichiers ci-dessous). |
| `cardrenderer.sr5.js` / `.sr6.js` / `.anarchy.js` / `.anarchy1.js` | ↳ `CardRenderer` | Corps de carte spécifiques par édition. |
| `cardrenderer.linked.js` | ↳ `CardRenderer` | Rendu des entités liées (véhicules, esprits). |
| `cardfooter.js` | `CardFooter` | Mise en page **unique** du pied de toute carte (le domaine décrit ses actions, le socle les positionne). |
| `cardmenu.js` | `CardMenu` | Popover de débordement `⋯` d'un pied de carte. |
| `breakdown.js` | `Breakdown` | Popover d'explication décomposée d'une réserve (Défense, Encaissement…). |
| `cyberdeckrenderer.js` | `CyberdeckRenderer` | Bloc deck sur la carte PNJ (miroir de ServerRenderer). |

**`dice/` — dés & jets** (5)
| Fichier | Objet | Responsabilité |
|---|---|---|
| `diceroller.js` | `DiceRoller` | UI de lancer (overlay d'animation, panneau de risque Anarchy, câblage `[data-roll]`). |
| `dicepanel.js` | `DicePanel` | Lanceur de dés mobile (FAB + bottom sheet). |
| `dicelog.js` | `DiceLog` | Journal des jets de la session. |
| `opposedroll.js` | `OpposedRoll` | Jet opposé + seuil (outil MJ libre). |
| `magicaction.js` | `MagicAction` | Lance un sort / une invocation de bout en bout. |

**`journal/` — dossiers, contexte, notes** (8)
| Fichier | Objet | Responsabilité |
|---|---|---|
| `dossiers.js` | `Dossiers` | Registre transverse de regroupement narratif (arbre plat à `parentId`). |
| `dossierbar.js` | `DossierBar` | Barre de dossiers partagée : détient LA sélection courante (filtre du hub + des générateurs). |
| `contextselector.js` | `ContextSelector` | Sélecteur de contexte unique et réutilisable (Campagne › Run › Scène). |
| `pinrow.js` | `PinRow` | Rangée d'épingles d'accès rapide (100 % en mémoire, pas de Storage). |
| `palette.js` | `Palette` | Palette de commandes (Ctrl/Cmd+K), source unique `PnjLookup.search`. |
| `mentions.js` | `Mentions` | Autocomplétion `@`/`#` + rendu des puces (ancrage par ID). |
| `markdown.js` | `Markdown` | Mise en forme légère des notes (opère sur du texte déjà échappé). |
| `notepad.js` | `Notepad` | Bloc-notes de séance (scratchpad persistant, volontairement léger). |

**`kit/` — primitives d'interface** (8)
| Fichier | Objet | Responsabilité |
|---|---|---|
| `contentmodal.js` | `ContentModal` | **Le modèle de délégation d'événements** : un écouteur global sur `data-*`, aucun nom d'objet figé dans le HTML. |
| `dialog.js` | `Dialog` | Remplace `prompt()`/`confirm()` natifs par des modales thémées. |
| `grouppicker.js` | `GroupPicker` | Popover d'appartenance multi-groupes, partagé par toutes les collections. |
| `multiselect.js` | `MultiSelect` | Filtre « ajouter / enlever » (choix multiples en puces). Remplace un `<select>` natif. |
| `singleselect.js` | `SingleSelect` | Menu déroulant stylé à choix unique. |
| `profcategories.js` | `ProfCategories` | Regroupement des professions par archétype (filtre double niveau). |
| `sidebartoggle.js` | `SidebarToggle` | Repli/ouverture des sidebars de dossiers. |
| `ui.js` | `UI` | Interactions live restantes (moniteurs, drogues, liens). *Ex-fourre-tout en cours de dégraissage ; dépend de `card/`, d'où « pas de sous-couches ».* |

**`collection/` — collections & modes de masse** (5)
| Fichier | Objet | Responsabilité |
|---|---|---|
| `collection.js` | `Collection` | **Socle des collections persistées avec groupes.** `Collection.create(config)` sert Shadows, ContactsBook, Servers, Characters (voir §4). |
| `selectionmode.js` | `SelectionMode` | Mode sélection multiple (révèle cases + gouttière via classe `selecting` sur `<body>`). |
| `reordermode.js` | `ReorderMode` | Mode réorganiser (poignées de glisser-déposer, classe `reordering`). |
| `bulkbar.js` | `BulkBar` | Barre d'actions en masse (panneau flottant non bloquant). |
| `rosterview.js` | `RosterView` | Bascule Ombres cartes ↔ annuaire dense. |

**`play/` — écrans de jeu** (6)
| Fichier | Objet | Responsabilité |
|---|---|---|
| `encounterrenderer.js` | `EncounterRenderer` | Rendu **pur** du tracker de combat. |
| `serverrenderer.js` | `ServerRenderer` | HTML du panneau Matrice (serveurs). |
| `runrenderer.js` | `RunRenderer` | Rendu d'une amorce de run. |
| `summonpanel.js` | `SummonPanel` | Invocation d'esprits (domaine autonome extrait de `UI`). |
| `spectatorview.js` | `SpectatorView` | Écran joueur (rendu lecture seule de l'initiative, 2e onglet). |
| `contactcreate.js` | `ContactCreate` | Modale de création rapide d'un contact depuis une fiche PJ. |

**`tour/` — visite guidée & accueil** (3)
| Fichier | Objet | Responsabilité |
|---|---|---|
| `tour.js` | `Tour` | Moteur générique de visite guidée (zéro contenu, zéro édition). |
| `toursteps.js` | `TourSteps` | Manifeste déclaratif de la visite (données pures). |
| `onboarding.js` | `Onboarding` | Bulle de première présentation de la barre du haut (vue une fois). |

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

Attention au revers de cette règle : **« valeur neutre » ne doit jamais vouloir dire
« valeur qui efface une règle »**. Quand la forme commune ne peut exister qu'en
écrasant ce qui distingue les éditions, c'est le contrat qu'il faut élargir, pas
la règle qu'il faut aplatir. Contrevenant connu : `conditionMonitor.gauge()`
renvoie `{filled, total}` (« accesseur neutre — jamais de forme de moniteur ici »),
mais `anarchy2.gauge()` doit additionner des paliers hétérogènes (2 légères +
1 grave + 1 incapacitante → total 4) pour s'y conformer. La barre du tracker
(`js/widgets/play/encounterrenderer.js:297`) classe donc par nombre de blessures
là où le livre classe par gravité : une blessure grave y paraît moins alarmante
que deux légères. Le correctif n'est pas dans `gauge()`, il est dans le contrat —
un descripteur que chaque édition remplit (échelle, ou paliers nommés). Cf.
CONTRIBUTING.md, « Un accesseur neutre qui efface une règle est un bug de contrat ».

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

### Le paquet exporté (`Backup`) — contrat gelé

Le `.json` téléchargé par « Exporter » (lu par « Importer ») est un **contrat
implicite avec l'extérieur** : plusieurs meneurs le versionnent eux-mêmes
(git, NAS) ou en scriptent le tri — casser sa forme en silence casse leur
outillage (constat terrain, `AUDITS/COMITE_TERRAIN.md` § N3/DA5). Forme
figée par `Backup.build()` (`js/controllers/backup.js`) :

```json
{
  "format": "shadowherds-backup",
  "version": 1,
  "schemaVersion": 9,
  "exportedAt": "2026-07-19T12:00:00.000Z",
  "app": "ShadowHerds",
  "data": {
    "sr5": { "shadows_all": [ /* … */ ], "shadows_groups": { /* … */ } },
    "sr6": { "…": "…" }
  }
}
```

**Enveloppe** (à ne pas confondre avec les trois nombres du tableau
ci-dessus, qui versionnent le `localStorage` — ceux-ci versionnent le
*paquet exporté*) :
- `format` — littéral fixe `"shadowherds-backup"`. `validate()` refuse un
  fichier qui le porte avec une autre valeur ; un fichier qui ne le porte
  **pas du tout** est accepté (paquet antérieur à l'ajout du champ).
- `version` — version de l'**enveloppe** (les 6 clés de premier niveau
  elles-mêmes), `Backup.VERSION`. N'a jamais bougé depuis sa création et
  n'est **actuellement lu nulle part à l'import** (`validate()` ne le
  vérifie pas) — décoratif tant que la forme de l'enveloppe elle-même ne
  change pas. Ajouter une édition ou une clé dans `data` ne la fait **pas**
  bouger, seul un renommage/retrait de `format`/`schemaVersion`/
  `exportedAt`/`app`/`data` le justifierait.
- `schemaVersion` — copie de `Storage.SCHEMA_VERSION` au moment de l'export.
  Gouverne la migration de `data` à l'import (`Backup._migrate`, miroir
  volontairement partiel de `Storage._MIGRATIONS` : seules les migrations
  qui changent la forme d'une clé listée dans `Backup.KEYS` ont besoin d'une
  contrepartie ici). Un paquet plus récent que l'app qui importe est
  **refusé**, jamais ingéré à l'aveugle (`validate()`).
- `data` — objet clé par **édition** (`sr5`/`sr6`/`anarchy2`/`anarchy1`),
  éditions vides omises. Chaque bucket ne contient que les clés de
  `Backup.KEYS` (13 aujourd'hui) : `shadows_all`/`shadows_groups`/
  `characters_all`/`characters_groups`/`contacts_all`/`contacts_groups`/
  `servers_all`/`servers_groups`/`dossiers`/`encounter_by_dossier`/
  `notebooks`/`gen_runs`/`encounter_current`.

**Ce qui n'est jamais dans le paquet, vérifié par inventaire des clés
`Storage` par édition** :
- Réglages d'appareil (globaux, `sr_pnj_v2_global_*`) — `dicePrefs`, config
  synchro, `tour_seen*`, `schemaVersion` lui-même : par conception, l'export
  ne porte que des données de campagne, jamais des préférences locales.
- Scratch/éphémère par édition, exclusion volontaire : `gen_pool` (pool du
  générateur, PNJ pas encore rangés), `chargen_draft` (brouillon de création
  PJ en cours), `characters_team` (référence "mon équipe" au Hub),
  `threat_reserve` (réserve de Menace Anarchy), `context` (position de
  navigation Campagne/Run/Scène — redevient trivial à retrouver au premier
  clic, contrairement aux clés ci-dessus).

**`encounter_current` — cas particulier, ajoutée pour couvrir la reprise
d'une scène en cours sur un autre appareil** (ordinateur → téléphone,
demande utilisateur explicite) : c'est un **singleton** par édition (un
seul combat vivant à la fois), pas une collection — la fusion "ajoute ce
qui manque" des autres clés n'a pas de sens ici, un combat ne se
*fusionne* pas avec un autre. Règle retenue dans `_mergeEdition` : la scène
importée **remplace** la locale **seulement si la locale est vierge**
(aucun combattant engagé, y compris jamais initialisée) — protège le
combat en cours sur l'appareil qui importe ; **écraser un combat déjà
engagé exige le mode "Remplacer tout"**, en connaissance de cause (c'est le
seul mode qui l'a toujours fait, sans distinction). C'est la seule des 13
clés à ne pas suivre la politique additive générale ci-dessous.

**Règle de gel, pour toute évolution future** : ajouter une clé à
`Backup.KEYS` est **additif** — rétro-compatible, un vieil importeur ignore
simplement une clé qu'il ne connaît pas (`replace` comme `_mergeEdition`
itèrent sur `this.KEYS`, jamais sur les clés du paquet reçu). Changer la
**forme** d'une clé déjà publiée doit passer par un incrément de
`Storage.SCHEMA_VERSION` (chaîne de migrations, ci-dessus) **et**, si la
forme exportée en est affectée, une entrée miroir dans `Backup._migrate`.
Ne jamais muter silencieusement le contenu d'une clé déjà exportée.
`_mergeEdition` couvre maintenant les 13 clés sous 4 formes : listes par id
(dont `gen_runs`), groupes (unions), cartes id→valeur additives
(`encounter_by_dossier`, `notebooks.entries` — un dossier déjà présent
localement garde SA version, seul un dossier absent est ajouté), et le
singleton `encounter_current` ci-dessus. **Corrigé le 2026-07-19** : avant
cette date, `_mergeEdition` ne couvrait que 9 des 11 clés existantes —
`encounter_by_dossier` et `notebooks` importés en mode Fusionner étaient
silencieusement perdus (vérifié au navigateur avant correction :
`Backup.apply(pkg,"merge")` laissait ces deux clés inchangées).

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
| Structure (grilles, composants, transitions) | `css/base/*.css` — **un fichier = le nom du module JS qu'il habille** (voir ci-dessous) |
| Habillage par édition (couleurs, typo) | `css/theme-*.css` (tokens `:root` surchargés par `[data-edition]`) |
| Outils de build | **aucun** — pas de bundler, pas de script de version, rien à lancer avant un commit |
| Doctrine perso Claude↔utilisateur | `CLAUDE.md`, `CODIR.md` (gitignorés) |

### La règle de nommage du CSS

**Un fichier de `css/base/` porte le nom du module JS qu'il habille.**
`intrusion.js` → `intrusion.css`. À défaut de propriétaire unique, le nom du
composant (`contact-form.css`, partagé par trois modules) ou de la zone
(`foundation.css`, `responsive.css`, `print.css`).

**Un nom composite est interdit** : `a-et-b.css` est l'aveu d'un fourre-tout.
Le dossier en a compté quatre (`backup-contactgen`, `journal-matrix`,
`topbar-dice-quick`, `settings-misc`) ; pour styler le tracker d'intrusion, rien
ne disait d'ouvrir `journal-matrix.css`. La taille, elle, n'est pas un défaut :
`combat-tracker.css` fait 1778 lignes et son nom dit vrai.

Deux pièges, appris en rangeant :

- **L'ordre des `<link>` est load-bearing.** À spécificité égale, le dernier
  déclaré gagne — et une cascade cassée ne produit *aucune* erreur console,
  contrairement à un import JS. En déplaçant des règles entre fichiers, vérifier
  qu'aucun sélecteur concurrent ne vit entre l'ancien et le nouveau rang. Deux
  ordres sont aujourd'hui délibérés et commentés dans `index.html` :
  `dicelog` avant `notepad` (en-tête partagé), `palette` avant `mentions`
  (`#mentions-box` réutilise `.palette-row`).
- **En dev local, le cache ment.** `python -m http.server` n'envoie aucun
  en-tête ; un fichier *modifié* est resservi périmé alors qu'un fichier *neuf*
  arrive frais — de quoi conclure à une régression qui n'existe pas, ou à un
  succès qui n'en est pas un. Ctrl+Shift+R, ou changer de port.

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
