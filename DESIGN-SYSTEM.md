# Le système de design de ShadowHerds

*Rédigé par Estelle — direction design (UX, UI, psychologie cognitive).*
*Version 1 — 27 juillet 2026. Établi sur l'état du code au commit `c2cb013`.*
*Version 1.1 — 27 juillet 2026 : correction du § 7 et du lot 10 (`.monitor-box`
n'était pas à 20px — le doigt était déjà servi à 24px ; c'est la base souris à
16px qui reste ouverte, et elle s'arbitre). Les chiffres du § 1 restent ceux de
`c2cb013` : ils se recomptent avant et après chaque lot, jamais se recopient.*
*Version 1.2 — 27 juillet 2026 : lot 2 (élévation) livré ; § 9 gagne deux
protections re-arbitrées avec l'utilisateur (physicalité des dés, pulsations
décoratives) ; les lots 5/6/7/8/9 gagnent chacun un périmètre élargi issu du
reliquat du lot 2 (détail : `PLAN_EXECUTION.md`).*

*Version **2.1** — 31 juillet 2026 : le chantier ⇉ (scène de course-poursuite,
1.138.0) verse trois choses au référentiel, toutes issues de mesures et non
d'intentions. Un **composant neuf** — la piste, § 6.10, patron réutilisable pour
toute grandeur ordonnée à participants. Une **méthode d'ajout de glyphe** (§ 6.5)
née d'un audit qui a écarté trois candidats sur cinq : ◆ et ◎ étaient déjà pris,
⌖ n'est servi que par 3 polices système. Et deux entrées de **checklist de PR**
(§ 10) payées comptant : le `min-width: 0` des chaînes flex — dont le symptôme
est que l'ANCÊTRE déborde, pas l'élément fautif — et la mesure à 375px. Le § 7
gagne son corollaire : un contrôle absent du bloc « CIBLES TACTILES » n'a pas
été jugé trop petit, il n'a jamais été jugé.*

*Version **2** — 27 juillet 2026. **Re-audit intégral contre le code.** Trois
lots vérifiés sur trois s'étant révélés bâtis sur une prémisse fausse ou
périmée, tout le § 1 a été recompté et chaque lot du § 8 confronté au code
avant réécriture. Corrections principales : les échelles (rayon, espacement,
typo) sont **bien plus mal adoptées** que la v1 ne le disait — d'où le **lot 11
neuf**, le plus grand écart mesuré du projet ; le trou d'accessibilité des
overlays est **pire** que décrit (aucun piège de focus n'existe) ; à l'inverse,
`graph.css` (§ 1), les cartes et les marqueurs étaient **sur-comptés**, et la
justification du lot 5 par l'accessibilité était **périmée** (§ 6.5). L'ordre
des lots ne suit plus l'intuition de la v1. La méthode de comptage est
désormais explicitée — la v1 comptait des caractères, pas des effets.*

---

## Comment lire ce document

Ce n'est pas une galerie. C'est un **contrat**. Chaque section dit trois choses :
ce qui **est** (l'état du code, mesuré), ce qui **doit être** (la règle), et
**pourquoi** (le raisonnement — sans quoi la règle sera contournée à la
première urgence).

Trois niveaux de force, marqués partout :

| Marque | Sens |
|---|---|
| **Loi** | Non négociable. Une PR qui la viole ne passe pas. |
| **Règle** | Le défaut. On s'en écarte en le disant et en le justifiant en commentaire. |
| **Conseil** | Ce qui marche le mieux. Jugement autorisé. |

Si vous ne lisez qu'une chose : le [§10 — Checklist](#10-la-checklist-de-pr).

### Où ce document s'insère

Trois doctrines coexistent, et elles ne se recouvrent pas. *(Les deux premières
vivent hors du dépôt, dans l'arborescence de documents du projet — elles sont
citées par leur nom, jamais par un lien qui casserait en clone ou en worktree.)*

| Document | Répond à |
|---|---|
| `PLANS/DOCTRINE_CAMPAGNE_RUN_SCENE.md` | **quoi** on touche — le modèle du produit |
| `PLANS/DOCTRINE_GRAMMAIRE_INTERACTION.md` | **comment** on touche — affordance, feel, cible |
| **Ce document** | **avec quoi** on le construit — tokens, primitives, composants |

En cas de contradiction sur l'interaction ou le feel, **la Grammaire
l'emporte** : elle est plus ancienne, elle est mesurée, et elle a déjà été
confrontée au terrain. Ce document a d'ailleurs été corrigé sur ce fondement
avant sa v1 (§7, taille de cible).

Il vit **dans le dépôt**, à côté d'`ARCHITECTURE.md`, et c'est délibéré :
`CLAUDE.md`, `CONTRIBUTING.md` et `CODIR.md` sont gitignorés, donc **invisibles
en worktree** — là où le code s'écrit. Un référentiel de design qui n'est pas
versionné n'est pas lu.

---

## 1. Le diagnostic

> 📌 **Section historique — les chiffres ci-dessous sont ceux du diagnostic
> d'origine, pas l'état actuel.** Ils sont conservés intacts : ce sont eux qui
> ont motivé les onze lots, tous livrés depuis (cf. § 8). Pour l'état à jour d'un
> axe donné, voir sa section propre (§ 4.x), qui porte ses re-mesures datées.
> *La méthode de comptage décrite ici, elle, reste valable — c'est le principal.*

J'ai lu les 17 500 lignes de CSS avant d'écrire une ligne de ce document. Le
constat est net et, je vous rassure d'emblée, **inhabituellement bon sur un
axe et défaillant sur un autre**.

### Ce qui est déjà excellent

Votre couche de **tokens** est meilleure que celle de la plupart des produits
que j'audite. Vous avez, dans `foundation.css` :

- une échelle typographique à 8 pas, plancher assumé à 10px, commentée ;
- une échelle d'espacement base 4 ;
- des tokens de mouvement (3 durées, 2 courbes) avec `prefers-reduced-motion`
  **centralisé au niveau des variables** — c'est la bonne façon de faire, et
  presque personne ne la trouve ;
- une échelle de z-index **sémantique**, 15 bandes nommées, ordonnées par
  intention et non par surenchère ;
- une palette sémantique séparée de l'accent d'édition (`--danger`,
  `--warning`, `--success`, `--info`, `--cold`) ;
- un token d'identité constant (`--aro`) distinct de l'accent variable ;
- et même un token de *feel* (`--drag-tilt`, `--drag-lift`) qui fait du
  glisser-déposer une signature d'édition. Ça, c'est du design d'auteur.

Les commentaires du CSS documentent les décisions **et leurs raisons**
(pourquoi `filter: drop-shadow` plutôt que `box-shadow` sur une carte
biseautée, pourquoi `column-count` plutôt que `grid`). C'est un patrimoine
rare. On ne touche pas à ça.

### Ce qui manque, et qui est la cause de votre demande

**Vous avez un vocabulaire de matière, pas un vocabulaire d'objets.**

Les tokens décrivent le *grain*. Rien ne décrit la *carte*, le *panneau*, la
*modale*. Chaque module a donc redécoré sa propre version. Mesuré :

| Mesure | v1 (`c2cb013`) | **Re-audit `72c7f58`** |
|---|---|---|
| Classes CSS distinctes dans `css/base/` | 1 427 | **1 418** |
| Classes contenant `btn` | 46 | **46** — dont **43 autonomes** |
| Classes de type pastille (`chip`/`pill`/`badge`/`tag`) | ~50 | **71 brutes → ~51 réelles** (8 conteneurs, 10 sous-parties, 2 déjà bien formées) |
| Classes contenant `card` | 49 | **48 brutes → 15 racines** (19 sous-parties légitimes, 13 divers) |
| **`border-radius` littéraux** | 13 valeurs | **17 valeurs / 310 occurrences** |
| Usages de `var(--radius*)` | 8 | **10** |
| **`gap` littéraux** | 20 valeurs | **35 valeurs / 260 occurrences** |
| **Tailles de police hors échelle** | ~80 occ. | **102 occ. / 41 valeurs** |
| Points de rupture distincts | 11 | **14** (420, 459, 460, 489, 560, 640, 641, 720, 721, 900, 1024, 1100, 1280, 1700) |
| Couleurs hex en dur dans `css/base/` | 192 | **204** |
| `box-shadow` | 71 en dur | **73 dont 28 tokenisés, 7 en dur** *(après lot 2)* |
| `var(--bg-card)` posé comme surface | 98 | **78** *(après lot 2)* |

> **Re-audit du 2026-07-27** (méthode : commentaires retirés avant comptage,
> décomposition racines / sous-parties / conteneurs). Il corrige la v1 sur
> quatre points, tous **dans le sens de la gravité pour les échelles** et
> **dans le sens de l'exagération pour les objets** :
> - **les échelles sont bien plus mal adoptées que je ne l'avais écrit** —
>   310 `border-radius` littéraux face à 10 usages de token, 260 `gap`
>   littéraux, 102 tailles hors échelle. C'est le plus grand écart mesuré du
>   projet, et **aucun lot de ma v1 ne le traitait** (voir le lot 11) ;
> - **les cartes et les marqueurs étaient sur-comptés** : « 49 variantes de
>   carte » sont en réalité **15 racines** plus des sous-parties parfaitement
>   légitimes (`-header`, `-body`, `-frame`…), qu'un design system **veut**
>   voir exister. Idem pour les marqueurs ;
> - **`graph.css` n'est pas « à moitié habillé »** : sur ses 141 hex, **134
>   sont des valeurs de repli** dans `var(--token, #hex)` dont le token *est*
>   défini — elles ne s'activent jamais. Voir le lot 9, dégradé de M à S ;
> - **le trou d'accessibilité des overlays est pire que décrit** : voir § 6.3.

Et le symptôme le plus parlant, celui qui m'a fait écrire ce document tel
quel :

> La refonte « ARO » a spécifié un système d'élévation complet —
> `--elev-1`, `--elev-2`, `--edge-hi`, `--bg-raised` — avec un raisonnement
> figure/fond juste et documenté.
> **`--bg-raised` est utilisé 2 fois. `--elev-*` est utilisé 2 fois.**
> En face : **98** poses brutes de `var(--bg-card)` comme surface, et
> **71 `box-shadow` en dur**.

Un token décidé mais non propagé est pire qu'un token absent : il fait croire
que la question est réglée. Vous n'avez pas un problème de *décision*, vous
avez un problème d'**adoption**. Ce document est autant un outil de
propagation qu'une spécification.

> **Suite (2026-07-27).** Le lot 2 a soldé ce symptôme précis : 28 usages de
> `--elev-*`, 20 de `--bg-overlay`, 7 `box-shadow` en dur résiduels. **Mais le
> re-audit montre que le même mal, en pire, frappe les échelles de rayon,
> d'espacement et de typographie** — 310 `border-radius` littéraux contre 10
> tokenisés. Ma v1 avait diagnostiqué l'adoption comme *le* problème, puis
> n'avait écrit de lot que pour l'élévation. C'est corrigé par le **lot 11**.

~~Deuxième symptôme du même mal : `graph.css` compte **96 usages de tokens de
thème et 131 couleurs en dur**. Le graphe est à moitié habillé. Changez
d'édition, il ne suit qu'à moitié.~~

> **⚠️ Rayé au re-audit du 2026-07-27 — ce diagnostic était faux.** Sur les 141
> hex de `graph.css`, **134 sont des valeurs de repli** de la forme
> `var(--token, #hex)`, et **11 des 13 tokens concernés sont bien définis** :
> ces replis ne s'activent jamais. Le graphe **suit déjà l'édition**. Ne
> restent que **7 hex réellement nus**, plus deux tokens jamais définis
> (`--surface-1`, `--surface-2`) dont les replis, eux, sont bien actifs. Le
> lot 9 passe donc de M à **S**. *Leçon : `grep '#[0-9a-f]'` compte des
> caractères, pas des couleurs appliquées.*

### Le verdict

Il faut ajouter **une couche manquante entre les tokens et les écrans** : les
primitives et les composants canoniques. Ce n'est pas une refonte visuelle —
je ne propose de changer presque aucun pixel. C'est une refonte du
**vocabulaire**, pour que la prochaine carte que vous coderez soit gratuite
au lieu de coûter 80 lignes.

---

## 2. Le socle : à qui, où, quand

Toute règle de ce document se déduit de trois faits sur l'usage. Ils ne sont
pas décoratifs — quand vous hésiterez, revenez ici, la réponse y est presque
toujours.

**1. L'utilisateur ne regarde pas l'écran.** Il regarde ses joueurs. L'écran
est consulté en **vision périphérique et par saccades d'une seconde**. Il ne
lit pas : il reconnaît une forme, une couleur, une position.

> Conséquence : la **position** et la **forme** portent plus d'information que
> le texte. Un état doit être lisible sans être lu. C'est pourquoi les motifs
> BPMN du graphe de trame (cercle = accroche, losange = décision) sont une
> excellente décision : vous avez encodé du sens dans la silhouette.

**2. Il fait deux choses à la fois.** Il arbitre *et* il joue. Sa mémoire de
travail est déjà saturée par la fiction. Toute charge cognitive que
l'interface ajoute est prise **directement sur la qualité de sa partie**.

> Conséquence : **reconnaissance, jamais rappel**. Aucun geste ne doit être à
> mémoriser. Aucun état ne doit être à retenir d'un écran à l'autre — c'est le
> rôle du fil d'Ariane, et il est bien vu.

**3. Il est interrompu en permanence.** Un joueur parle, un dé tombe, la
scène bifurque.

> Conséquence : **toute tâche doit être abandonnable et reprenable**. C'est
> pourquoi l'autosave est la bonne décision, et pourquoi les overlays
> bloquants sont un coût — chacun est un endroit où l'interruption fait perdre
> le fil.

### Les six lois qu'on applique, et où

| Loi | Ce qu'elle dit | Où elle mord ici |
|---|---|---|
| **Fitts** | Le temps d'atteinte dépend de la taille et de la distance | Cibles dimensionnées **à la fréquence du geste** (§7) ; actions fréquentes en bord d'écran ; le kebab d'une carte est petit **parce qu'il est rare** |
| **Hick** | Le temps de décision croît avec le nombre d'options | Une seule action primaire par surface ; les 9 filtres du générateur regroupés en 3 blocs |
| **Miller / chunking** | On tient ~4 groupes en mémoire de travail | Une carte a **au plus 4 zones déployées** ; au-delà, on replie (un tiroir fermé ne compte pas — §Carte) |
| **Doherty** | Sous 400ms, l'utilisateur reste « dans » la tâche | Pas d'indicateur de chargement sous 200ms ; feedback immédiat sur toute action |
| **Von Restorff** | Ce qui diffère est mémorisé | **Un accent = un sens.** L'accent d'édition signale l'interactif et l'actif. Rien d'autre. |
| **Jakob** | On attend d'un produit qu'il marche comme les autres | Échap ferme, le rideau ferme, le focus revient d'où il vient |

**Loi.** L'accent d'édition (`--accent`) signale **l'interactivité et
l'état actif**. Il n'est jamais décoratif. Si tout est accentué, rien ne
l'est — et l'utilisateur perd son seul repère périphérique.

---

## 3. L'architecture du système

Quatre niveaux. Chacun ne connaît que celui du dessous.

```
Niveau 3 — HABILLAGE D'ÉDITION      css/theme-*.css
           couleur, typo, rayon, clip, feel du drag
                    ▲  ne redéfinit QUE des tokens et des finitions
Niveau 2 — COMPOSANTS               carte, panneau, overlay, action,
           les objets nommés        marqueur, champ, état
                    ▲  composés de primitives
Niveau 1 — PRIMITIVES               surface, pile, grappe, rail
           les briques sans nom métier
                    ▲  ne lisent que des tokens
Niveau 0 — TOKENS                   css/base/foundation.css
           couleur, typo, espace, élévation, mouvement, empilement
```

**Loi — l'édition habille, elle ne restructure jamais.**
Un `theme-*.css` peut redéfinir : couleur, famille et casse typographique,
rayon, `clip-path`, grain, `--drag-tilt`.
Il ne peut **jamais** toucher : `padding`, `margin`, `gap`, `display`,
`grid-template`, ordre du DOM, taille de cible.

*Pourquoi* : la mémoire musculaire de l'utilisateur est construite sur la
**géométrie**, pas sur la couleur. Changer d'édition doit changer l'ambiance,
jamais l'endroit où il faut cliquer. Vous respectez ça à environ 90 %
aujourd'hui ; on le grave.

**Loi — pas de couleur littérale hors `theme-*.css` et hors la palette
sémantique de `foundation.css`.** Les 192 hex de `css/base/` sont une dette,
et `graph.css` en porte 131 à lui seul.

---

## 4. Les tokens — état et complétion

### 4.1 Couleur

**Ce qui existe et qu'on garde tel quel :**

| Token | Rôle |
|---|---|
| `--bg` | fond de page |
| `--bg-card` | chrome fixe (topbar, sidebar, barre du bas) |
| `--bg-mid` | encart discret dans le chrome |
| `--bg-raised` | **surface d'un objet manipulable** |
| `--bg-header` | en-tête teinté |
| `--accent` / `--accent2` | identité d'édition — interactif et actif |
| `--text` / `--text-dim` | encre principale / secondaire |
| `--border` | filet de séparation |
| `--border-ui` | bordure de **contrôle** (≥ 3:1) — distincte du filet |
| `--glow` | halo d'accent à faible opacité, fond des états actifs |
| `--danger` `--warning` `--success` `--info` `--cold` | palette sémantique |
| `--aro` | signature système, constante par édition |
| `--accent-matrix` / `--accent-magic` | canaux de calque transverses |

La distinction `--border` (filet, décoratif) / `--border-ui` (contour de
contrôle, contraste garanti) est juste et rare. **Elle est sous-employée** :
tout ce qui est un contrôle interactif doit porter `--border-ui`, pas
`--border`.

**Ce qu'on ajoutait — ✅ posé depuis (lot 1, `foundation.css`) :**

```css
--bg-overlay: var(--bg-raised);  /* surface d'une modale/popover/feuille */
--scrim: rgba(0, 0, 0, 0.72);    /* rideau — remplace les 3 valeurs qui coexistaient */
```

**Règle — sémantique des cinq couleurs d'état.** Une seule et même
signification partout, sans exception :

| Couleur | Sens | Jamais utilisée pour |
|---|---|---|
| `--danger` | perte irréversible, échec critique | « important », « rouge parce que ça claque » |
| `--warning` | dégradation, bévue, attention requise | une erreur bloquante |
| `--success` | confirmation d'un acte de l'utilisateur | un état permanent positif |
| `--info` | information neutre, aide | une action |
| `--cold` | le registre **subi/réactif** (console « Réagir ») | une alerte |

**Règle — contraste.** Texte ≥ **4.5:1**. Texte ≥ 20px ou gras ≥ 14px et
bordure de contrôle ≥ **3:1**. Vous avez déjà relevé plusieurs encres pour ça
(commentaires `CH-V9`) — c'est acquis, on le maintient.

**Loi — la couleur n'est jamais le seul porteur d'information.** Un état
critique porte aussi une forme, un mot ou une icône. Non pas seulement pour le
daltonisme (8 % des hommes) : à la table, l'écran est vu de biais, à contre-jour,
sur une dalle mal calibrée.

### 4.2 Typographie

L'échelle est bonne. Ce qui manque, ce sont les **rôles** — c'est là que
naissent les 80 tailles ad hoc, parce qu'aucune n'est nommée.

**On ajoute une couche de rôles.** Six, pas un de plus :

| Rôle | Composition | Emploi |
|---|---|---|
| **Étiquette** | `--fs-2xs` · mono · MAJ · `ls .15em` · `--text-dim` | label de section, eyebrow, en-tête de zone |
| **Méta** | `--fs-xs` · corps · `--text-dim` | pastilles, tags, notes, horodatage |
| **Corps secondaire** | `--fs-sm` · corps | descriptions, aide, contenu dense |
| **Corps** | `--fs-base` · corps · `line-height 1.5` | texte par défaut |
| **Titre d'objet** | `--fs-lg` · display · 600 (ou **700** en variante accent — voir note D11) | nom de carte, valeur chiffrée |
| **Titre de panneau** | `--fs-xl` · display · 700 · `--title-transform` · `--title-spacing` | titre d'écran, titre de modale |

```css
/* ✅ posées dans foundation.css (lot 1) — identiques propriété pour propriété */
.t-label   { font: 400 var(--fs-2xs)/1.2 var(--font-mono);
             letter-spacing: .15em; text-transform: uppercase; color: var(--text-dim); }
.t-meta    { font: 400 var(--fs-xs)/1.35 var(--font-body); color: var(--text-dim); }
.t-body-sm { font: 400 var(--fs-sm)/1.5 var(--font-body); }
.t-body    { font: 400 var(--fs-base)/1.5 var(--font-body); }
.t-title   { font: 600 var(--fs-lg)/1.25 var(--font-display); }
.t-panel   { font: 700 var(--fs-xl)/1.2 var(--font-display);
             letter-spacing: var(--title-spacing); text-transform: var(--title-transform); }
```

**Loi.** Aucun `font-size` littéral. Si aucun pas de l'échelle ne convient,
c'est le **design** qui est à revoir, pas l'échelle. (Les `clamp()` des titres
d'accueil sont l'exception admise : ils sont fluides par nature.)

**Ce que la loi ne dit pas — les 4 catégories HORS échelle, relevées en ouvrant
le front typo de D11 (2026-07-28).** Le relevé brut (« 102 tailles hors
échelle ») confondait quatre choses ; seule la dernière est de la dette :

1. **`pt` dans `print.css` (30 occurrences)** — autre *médium*. Le `pt` est
   l'unité du papier, `--fs-*` est une échelle écran en `rem`. Hors périmètre
   par nature, comme les `50%` de `border-radius` (cercles) le sont du rayon.
2. **Valeurs en `em` (~14)** — relatives au **parent**, pas à la racine. Un
   `0.82em` dit « un peu plus petit que ce qui m'entoure », ce qu'aucun pas
   absolu ne sait exprimer. Mécanisme différent, pas un pas manquant.
3. **`clamp()` (3)** — l'exception déjà admise ci-dessus.
4. **Le seuil iOS à `16px` (2 sites : `responsive.css`, `contact-form.css`) et
   la racine du `rem` (`html { font-size: 16px }`, `foundation.css`)** —
   **protégés, à ne jamais convertir.** Les trois portent déjà leur raison en
   commentaire : sous 16px iOS zoome au focus d'un champ (CH-V12), et
   `--fs-md` peut bouger pour des motifs de hiérarchie visuelle — l'y lier
   réintroduirait le zoom. La racine, elle, est le point zéro **à partir
   duquel** `--fs-md` est calculé : la lier créerait une référence circulaire.

**Méthode, en retour :** trier par médium et par mécanisme (`pt` / `em` /
fluide / absolu) **avant** de compter, et lire les commentaires des sites
restants avant tout arbitrage — les trois protections ci-dessus étaient
écrites noir sur blanc dans le code, invisibles au seul `grep`. Même leçon
qu'en §4.3 pour `--sp-*`.

**La grappe `1.1rem` (17,6px) — premier cas où AUCUN pas ne convenait,
arbitré le 2026-07-28.** 5 sites (`.run-type`, `.opposed-result-main`,
`.risk-slider-val`, `.modal-title`, `.empty-state-title`), tous
`font-family: var(--font-display)` + `font-weight: 700`, dans 5 fichiers
distincts — un consensus de conception jamais nommé, pas un doublon
accidentel. 17,6px ne matche aucun pas (entre `--fs-md` 16 et `--fs-lg` 20).
Loi ci-dessus : *dans ce cas, c'est le design qui est à revoir, pas
l'échelle* — décidé avec l'utilisateur plutôt que forcé unilatéralement,
vu le rayon d'action de `.modal-title` (tous les dialogues, 4 éditions).
Scindé en deux par les propriétés restantes, pas par le chiffre seul :
- **Groupe « valeur »** (`.run-type`, `.opposed-result-main`,
  `.risk-slider-val` — sans majuscules) → **`--fs-lg`**, poids **700**
  conservé. Delta réel +13,6 % (17,6→20px). C'est la variante accent du rôle
  « Titre d'objet » ajoutée à la table ci-dessus : le 600 documenté reste le
  défaut (noms de carte, labels statiques), le 700 marque une **valeur mise
  en avant** (résultat de jet, valeur de curseur).
- **Groupe « titre »** (`.modal-title`, `.empty-state-title` — majuscules +
  `letter-spacing: 0.1em`) → **`--fs-xl`**. Ces deux sites portaient déjà
  MOT POUR MOT les autres propriétés de `.t-panel` (700, display, transform,
  spacing) — seule la taille manquait à l'appel. Delta réel +36 %
  (17,6→24px), le plus grand delta assumé par D11 à ce jour, sur le
  composant le plus vu du produit (l'en-tête de TOUTE modale). Accepté :
  aucune contrainte de hauteur fixe ne le bloque (`.modal-header` est en
  flex, pas en hauteur figée), et le rôle « Titre de panneau » couvre
  maintenant explicitement « titre de modale » en plus de « titre d'écran ».
`.play-front-coach-i` (aussi à `1.1rem`) exclu de la grappe : c'est un
glyphe d'icône (`ⓘ`, `aria-hidden`), sans `font-family`/`font-weight` —
famille différente, reste hors périmètre pour l'instant.

**Règle — le rôle de la mono.** `--font-mono` est la voix du **système** :
étiquettes, chiffres, identifiants, tout ce que la machine dit. Le corps est
la voix de la **fiction**. Ne jamais mélanger : c'est votre meilleur repère de
lecture périphérique, et il est aujourd'hui appliqué avec justesse.

**Règle — longueur de ligne.** 45–75 caractères pour tout texte de lecture
(`max-width: 68ch`). Au-delà, l'œil perd la ligne au retour.

### 4.3 Espacement

L'échelle base 4 existe. **Au diagnostic, 20 valeurs de `gap` littérales
cohabitaient avec** ; le lot 11 les a soldées. *Re-mesuré le 2026-07-30 : il
reste 26 sites littéraux sur ~13 valeurs, tous des replis protégés et commentés
(densité tactile, liserés de 1-3px, replis d'enroulement quasi nuls, `6%` des
pips de dé, `10mm` de `print.css`) — voir la loi ci-dessous, qui les autorise
explicitement.*

**On fixe la correspondance densité — un pas, une intention :**

| Pas | Valeur | Intention |
|---|---|---|
| `--sp-1` | 4px | à l'intérieur d'un marqueur (pastille, badge) |
| `--sp-2` | 8px | entre éléments d'une même grappe (icône + libellé) |
| `--sp-3` | 12px | padding intérieur d'un objet (carte, champ, ligne) |
| `--sp-4` | 16px | entre objets frères (deux cartes, deux champs) |
| `--sp-5` | 24px | entre sections d'un écran |
| `--sp-6` | 32px | entre blocs de page |
| `--sp-8` | 48px | respiration d'exception (état vide, accueil) |

**Loi.** Aucun `gap`, `padding` ou `margin` littéral en dehors de valeurs
optiques assumées et commentées (alignement d'un liseré, correction d'un
demi-pixel).

> **Tranché (2026-07-27) — pas de `--sp-0` sous 4px.** Le lot 11 a mesuré 58
> `gap` sous `--sp-1` (1px×8, 2px×14, 3px×18, plus leurs équivalents `rem`).
> Une lecture complète, pas un comptage, montre que ce n'est pas UN manque de
> pas à l'échelle mais DEUX phénomènes distincts, confondus par le grep :
>
> 1. **Des paires densité desktop/tactile déjà mesurées et volontaires.**
>    `.monitor-boxes` (3px au repos) et `.group-item-actions` (2px) portent
>    chacune une surcharge `gap: var(--sp-1)` dans le bloc tactile
>    `responsive.css`. Le resserrement au repos n'est pas une imprécision :
>    c'est le pendant exact du geste D10 (le doigt a besoin de plus d'air que
>    la souris). **Les fondre en une seule valeur --sp-1 effacerait la
>    distinction qu'elles existent pour porter.**
> 2. **Des gaps structurels, pas rythmiques**, sur des listes où chaque
>    élément porte déjà son propre `padding` — `.card-menu`/`.bulk-move-menu`/
>    `.contact-pjlink-menu`/`.scenario-menu-pop` (menus popover, 1-2px) et
>    `.cg-stepper` (bouton +/- accolé). Un menu de système ne respire pas
>    entre ses lignes ; c'est la Loi 2.5.8 de tout OS de bureau. Ce sont des
>    valeurs **optiques**, au sens exact de la loi ci-dessus — elles restent
>    littérales, commentées site par site, jamais dans l'échelle.
>
> **Verdict : l'échelle reste à 7 pas.** Ajouter un `--sp-0` généraliserait
> une distinction qui n'est vraie que pour une poignée de sites mesurés, et
> contredirait le principe même du chantier (réduire le nombre de valeurs
> distinctes, pas en ajouter une pour absorber le désordre existant). Le
> reste des 58 sites (dominante 3px sur rangées de jetons/pastilles/points —
> `.edge-tokens`, `.niveau-dots`, `.nav-btn`…) n'a **pas** ce statut protégé :
> ce sont des candidats normaux à `--sp-1`, à vérifier un par un comme les
> vagues précédentes — la loi 1 (« à l'intérieur d'un marqueur ») les couvre
> déjà. **Avant toute conversion, vérifier si le site a une paire tactile
> déjà posée** (`grep` la classe dans le bloc `@media (pointer: coarse)`) —
> si oui, c'est protégé comme `.monitor-boxes`, pas un candidat.

*Pourquoi c'est plus qu'une coquetterie* : un rythme irrégulier n'est jamais
perçu consciemment, mais il augmente mesurablement le temps de balayage
visuel. À la table, c'est exactement la ressource qui manque.

### 4.4 Élévation et surfaces — **la section à appliquer en priorité**

C'est ici que le système décidé n'a pas été propagé. Voici le modèle, complet
et final.

**Quatre niveaux, pas un de plus :**

| Niveau | Ce que c'est | Fond | Détachement |
|---|---|---|---|
| **0 — Fond** | la page | `--bg` | — |
| **1 — Chrome** | topbar, sidebar, barre du bas, fil d'Ariane | `--bg-card` | un filet `--border` |
| **2 — Objet** | carte, ligne de tracker, encart, champ | `--bg-raised` | `box-shadow: inset 0 1px 0 var(--edge-hi)` — **aucune ombre portée** |
| **3 — Overlay** | modale, popover, feuille, dropdown, dialogue | `--bg-overlay` | `--elev-2` + rideau `--scrim` si bloquant |

**Loi — l'ombre porte le mouvement, jamais le repos.**

| État | Traitement |
|---|---|
| Objet au repos | pas d'ombre. Il se détache par sa **valeur** (`--bg-raised` plus clair que `--bg`) + le liseré `--edge-hi` |
| Objet survolé | **`--elev-2`** (voir la note ci-dessous — corrigé sur mesure le 2026-07-30) |
| Objet saisi (drag) | `--elev-2` + `--drag-tilt` / `--drag-lift` de l'édition |
| Overlay | `--elev-2`, en permanence |

> **Correction du 2026-07-30 — le doc disait `--elev-1`, le code fait `--elev-2`,
> et c'est le CODE qui a raison.** Le survol de fiche
> ([`pnj-card.css:82`](css/base/pnj-card.css)) est le geste le plus vu du produit
> et il est monté à `--elev-2` en pratique. Arbitré : **on garde `--elev-2`** — le
> survol d'une carte n'est pas un frémissement, c'est la carte qui se saisit du
> regard, et la nuance `--elev-1` ne se voyait pas sur fond sombre à travers un
> `drop-shadow`. `--elev-1` reste disponible pour un survol discret (ligne dense,
> item de liste) ; il n'est simplement pas le défaut des cartes.

*Pourquoi le repos est plat* : sur fond sombre, une ombre noire ne détache
rien — elle salit. Le figure/fond se fait par la **luminance**. Votre
`foundation.css` le dit déjà, en toutes lettres, ligne 58.

> **Le « 71 `box-shadow` en dur » de la v1 était un mauvais compteur — et le
> corriger en « 66 » l'était tout autant** *(les deux erreurs sont de moi ;
> recompté par nature le 2026-07-30)*. Sur les **52** `box-shadow` sans
> `--elev-*` : **12 sont des `inset`** (les liserés d'accent — un patron que ce
> document recommande, § 6.1), **14 des `none`/`transparent`** (des remises à
> zéro), **15 des lueurs** (`--glow`, `--accent`, anneaux de focus) — **rien de
> tout cela n'est de l'élévation.** Restent 11 vraies ombres portées, dont
> **6 appartiennent aux dés** (physicalité protégée, § 9), 2 combinent déjà
> `var(--elev-2)` avec une lueur sur plusieurs lignes, et 1 est le fondu du
> footer collant (assumé, § 9).
>
> **Reliquat réel : UN site.** `.shadows-sidebar` en tiroir mobile
> ([`responsive.css`](css/base/responsive.css)) porte `4px 0 16px rgba(0,0,0,.5)`
> — un cast **latéral**, quand `--elev-1/2` sont des casts **verticaux**. Ce
> n'est pas un oubli de migration : il manque un **token directionnel**, que
> personne n'a encore jugé utile de créer pour un seul appelant.
>
> *C'est exactement le piège que le § 8 dénonce — compter des **caractères**
> plutôt que des **effets**. Il a fallu deux passages pour ne plus y tomber.*

**Piège connu, déjà documenté par vous — à répéter ici pour qu'il ne se
reperde pas :** sur une surface biseautée (`clip-path: var(--card-clip)`) ou
en `overflow: hidden`, un `box-shadow` est **rogné et invisible**. Utiliser
`filter: drop-shadow(...)`, qui suit la silhouette réelle.

```css
/* Le geste canonique du survol d'une CARTE (cf. correction ci-dessus) */
.card:hover .card-frame {
  filter: drop-shadow(var(--elev-2)) drop-shadow(0 0 7px var(--glow));
}
```

### 4.5 Rayons

**État (lot 11 SOLDÉ, re-mesuré le 2026-07-30) : 291 occurrences sur 356 portent
un token ; il ne reste que 8 valeurs littérales distinctes sur 13 sites**, hors
`0` (×25, les « coins droits » d'édition) et `50%` (×26, les cercles — hors
échelle à dessein). Au diagnostic v1 c'était **17 valeurs littérales sur 310
occurrences face à 10 usages de token** : le désordre le plus visible du projet
est résorbé. *Le paragraphe ci-dessous garde le raisonnement du chantier, qui
reste la doctrine à appliquer pour tout nouveau site.*

**Échelle finale — quatre pas :**

```css
--radius-sm:   3px;   /* marqueurs, pastilles, micro-contrôles, BOUTONS, CHAMPS */
--radius:      8px;   /* encarts (petits blocs de mise en avant) */
--radius-lg:  12px;   /* cartes, overlays, feuilles */
--radius-pill: 999px; /* pastilles pilulaires, jauges */
```

> **`--radius` vaut 8px, pas 6px.** Ma v1 proposait 6 ; le code portait déjà 8,
> et le lot 1 étant à delta visuel nul, c'est 8 qui a été gravé. La valeur
> exacte importe moins que le fait qu'il n'y en ait **qu'une**.
>
> **« Boutons » PUIS « champs » ont migré de `--radius` vers `--radius-sm`
> (2026-07-27, vagues 3 et 4 du lot 11) — le même diagnostic, deux fois de
> suite.** Ma v1 rangeait les deux avec les encarts sous `--radius`. Faux dans
> les deux cas : `.btn-primary`/`.btn-secondary` étaient déjà à 3px avant ce
> document, et **`forms.css` — les champs les plus vus du produit (générateur,
> filtres) — l'était tout autant**, confirmé par les 15 champs secondaires
> arbitrés ensuite (formulaires de contact, éditeur de fiche, entrées inline
> du journal/graphe). Le code établi l'emporte sur l'annotation. **Ce que
> `--radius` (8px) sert vraiment** : des **encarts**, de petits blocs de mise en
> avant (`.spell-block`, `.breakdown-pop`, `.scenario-lenses`, `.tour-ring`,
> `.pch-cell`, `.contact-form`, `.weapon-line`…), **jamais des contrôles qu'on
> touche**. La ligne du § est corrigée en conséquence : **la quasi-totalité des
> contrôles interactifs de ce projet — marqueur, bouton, champ — vit à
> `--radius-sm`. `--radius` est la valeur la plus rare, pas la plus commune.**
>
> *Mise à jour 2026-07-30 : les usages de `--radius` sont passés de 6 à **19** au
> fil du lot (les familles `6px` et `2px` ont versé leurs encarts dedans) — la
> règle « encarts, pas contrôles » n'a pas bougé, seul le compte a grossi.
> **Un contre-exemple trouvé à l'audit de clôture et corrigé** : `.nudge-close`,
> un vrai `<button>`, était resté à `--radius` ; c'était le dernier bouton du
> projet à l'ancien canon (`5f33531`). Le commentaire de `foundation.css` qui
> annonçait encore « champs, boutons, encarts » a été corrigé au passage — il
> décrivait l'inverse de ce que le code faisait.*
>
> **Conséquence, et leçon qui survit au lot : la migration n'est PAS
> mécanique.** Les 17 valeurs littérales ne se mappaient pas toutes sur un des
> quatre pas (10px, 5px, 14px, `5px 5px 0 0`…). Chaque site demandait un
> arbitrage — *ce rayon dit-il « marqueur », « contrôle » ou « carte » ?* — et
> certains ont changé visiblement. **Le lot s'est fait par famille d'objets, pas
> par chercher-remplacer**, chaque famille vérifiée aux 4 éditions. La plus
> grosse (`4px`, 44 sites, +200 % sur `.modal` et `.pnj-card-frame`) a été
> tranchée **avec l'utilisateur**, pas décidée seule.

**Règle.** Une édition peut mettre les quatre à `0` (SR5 le fait déjà, à
raison : « coins droits, dossier administratif » — mais **site par site**, en
réécrivant `border-radius: 0` sur une trentaine de sélecteurs, faute de token
à surcharger ; **c'est précisément ce que le lot 11 rend inutile**). Elle ne
peut pas en
inventer un cinquième.

**Conseil — le rayon dit la taille.** Petit objet, petit rayon. Un rayon de
12px sur une pastille de 18px la fait lire comme une gélule ; un rayon de 3px
sur une carte de 400px la fait lire comme un tableau. La cohérence perçue,
c'est la **proportionnalité**, pas l'égalité.

**Les rayons DIRECTIONNELS (2026-07-28) — pas de 5ᵉ token.** 14 sites posent
un rayon à 2 ou 4 valeurs (`12px 12px 0 0`, `4px 0 0 4px`…) — un angle
arrondi, l'autre droit, pour un objet accolé à un bord (feuille mobile
ancrée en bas d'écran, panneau collé au bord d'un tiroir). La question posée
par le lot 11 dès son ouverture (« faut-il un `--radius-top`/`--radius-*`
directionnel ? ») se répond **non** dans la quasi-totalité des cas : le
raccourci CSS `border-radius` accepte nativement 1 à 4 valeurs
espace-séparées, et `var(--radius-lg) var(--radius-lg) 0 0` est une syntaxe
CSS valide — **aucun token composite n'est nécessaire**, les 4 tokens
uniformes suffisent, simplement posés deux fois dans le raccourci. Vérifié
sur 12 des 14 sites : le chiffre littéral égalait déjà exactement un pas
existant, ou son propre parent utilisait déjà ce pas ailleurs dans la même
règle (incohérence à corriger, pas un choix à trancher).
**2 sites restent une dette assumée, pas un pas manquant** : `.shadows-
sidebar`/`.sidebar-reopen` (`4px 0 0 4px`, la sidebar des groupes de
contacts) n'ont pas de correspondance propre à un pas existant, ni
numérique ni sémantique (ni marqueur, ni encart, ni carte). Même verdict que
leur `box-shadow` directionnel, déjà laissé en dette assumée en D7 (§9) pour
la même raison : substituer aurait été un choix esthétique nouveau, pas une
convergence. Laissés littéraux plutôt que forcés dans un pas qui ne
correspond pas.

Rien à corriger. Les tokens existent, `prefers-reduced-motion` est centralisé
au niveau des variables. On grave les intentions :

| Durée | Emploi |
|---|---|
| `--dur-fast` (120ms) | retour tactile — `:active`, bascule d'état |
| `--dur-base` (200ms) | transition standard — couleur, bordure, opacité |
| `--dur-slow` (300ms) | apparition/disparition d'un objet ou d'un overlay |

**Loi.** Aucune durée littérale. Aucune animation en boucle infinie **hors
signal d'état vivant** (la pastille de scène en cours est l'exception
légitime, et bien vue : elle dit « ici, ça tourne encore »).

*Pourquoi la boucle infinie est un poison ici* : le mouvement périphérique
capte l'attention de façon **pré-attentionnelle** — on ne peut pas ne pas le
voir. Sur un outil consulté en coin d'œil pendant trois heures, c'est de la
fatigue pure. Votre décision de passer les lueurs d'accueil de « boucle » à
« une pulsation puis repos » était exactement la bonne ; elle vaut partout.

**Règle.** Ce qui bouge, bouge dans le sens de la causalité : un panneau qui
s'ouvre depuis la droite se referme vers la droite. Une feuille qui monte
redescend.

### 4.7 Empilement (z-index)

L'échelle est **bonne et complète**. Aucune modification. Deux règles pour
qu'elle le reste :

**Loi.** Aucun `z-index` littéral. Si aucune bande ne convient, c'est qu'il
manque une bande : on l'ajoute dans `foundation.css`, nommée et commentée.
> ✅ **Dette soldée (lot 7) — et la prescription de ce document était fausse.**
> `.ctx-selector` ne porte plus de littéral, mais il lit **`--z-command`**, pas
> `--z-popover` comme ce § l'annonçait. Vérifié dans le code : ce popover
> s'ouvre **depuis** `#notepad-panel`, lui-même déjà à `--z-popover` — les mettre
> au même palier aurait fait reposer l'empilement sur le seul ordre du DOM,
> fragile. Même famille que `.palette-box`/`.mentions-box` (popover-sur-panneau,
> ouvert de l'intérieur). *Leçon : prescrire une bande sans regarder d'où
> l'élément est ouvert, c'est prescrire au hasard.*

**Loi — deux couches bloquantes au maximum.** Si un troisième overlay
bloquant doit s'empiler, le flux est mal découpé. `--z-dialog` existe pour
l'exception unique : la question courte posée **depuis** un overlay.

### 4.8 Points de rupture

**État :** 11 valeurs. Trois d'entre elles (640/641, 720/721) sont des paires
de bordure — le reste est de l'accumulation.

**Trois seuils, deux capacités :**

```css
--bp-sm:  640px;   /* téléphone, tablette portrait */
--bp-md: 1024px;   /* tablette paysage */
--bp-lg: 1440px;   /* bureau large */
```

> ⚠️ **Ces trois tokens sont une CONVENTION, pas un mécanisme — et ça ne se
> corrige pas.** `var()` est **invalide dans une media query** (CSS standard) :
> `@media (max-width: var(--bp-sm))` ne fonctionne dans aucun navigateur. Les
> `@media` du projet portent donc les pixels en dur, et c'est **structurel**, pas
> un oubli de propagation. Les `--bp-*` servent de **référence écrite** : ils
> disent quel nombre écrire à la main. Vérifié le 2026-07-30 — zéro `var(--bp-*)`
> consommé dans tout `css/`, comme attendu. *(Un préprocesseur lèverait la
> limite ; ce projet n'en a pas, par choix — cf. § 2.)*

```css
@media (pointer: coarse) { /* densité tactile — cibles 44px */ }
@media (hover: hover)    { /* effets de survol uniquement */ }
```

**Loi — la densité suit le pointeur, pas la largeur.** Une tablette de
1024px au doigt a besoin de plus d'air entre les cibles ; un portable de 1024px
à la souris, non. C'est `(pointer: coarse)` qui décide de la **densité**, jamais
`max-width`. Et c'est **un seul endroit** : le bloc `@media (pointer: coarse)`
intitulé « CIBLES TACTILES » de
[`responsive.css`](css/base/responsive.css) — un réglage de densité qui lui
échappe est un oubli, pas un choix (doctrine *Grammaire d'interaction*, loi 4).

> **Nuance posée le 2026-07-30 (lot 10) : la TAILLE de cible, elle, n'est pas
> conditionnelle.** Le plancher de 24px vit à la **base**, pas dans le bloc
> tactile : une cible trop petite l'est aussi à la souris (WCAG 2.5.8 parle du
> pointeur, pas du doigt). Le bloc `(pointer: coarse)` ne garde donc que ce qui
> est *vraiment* propre au doigt — l'**espacement** entre cibles voisines. Voir
> § 7 pour le raisonnement complet.

*Exception admise et à conserver :* les seuils de `column-count` de
`.cards-zone` (900 / 1280 / 1700) sont des seuils **de contenu**, calés sur la
largeur minimale lisible d'une carte, pas sur des classes d'appareil. Ils
restent, commentés comme tels.

**Conseil.** Pour tout ce qui est interne à un composant, préférer
`@container` aux media queries. `.pnj-card` le fait déjà pour sa bascule
paysage : c'est la bonne pratique, et elle rend le composant réellement
portable d'un panneau à l'autre.

---

## 5. Les primitives

Trois briques, aucun sens métier. Elles absorbent 80 % du CSS répétitif.

### 5.1 Surface

```css
.surface {
  background: var(--bg-raised);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: inset 0 1px 0 var(--edge-hi);
}
.surface--chrome  { background: var(--bg-card); border-radius: 0; }
.surface--overlay { background: var(--bg-overlay); box-shadow: var(--elev-2); }
.surface--quiet   { background: var(--bg-mid); border-color: transparent; }
```

### 5.2 Pile et grappe

Deux mises en page couvrent la quasi-totalité des besoins. Les nommer évite
de réécrire un `flex` par composant.

```css
/* Empilement vertical à rythme régulier */
.stack        { display: flex; flex-direction: column; gap: var(--sp-3); }
.stack--tight { gap: var(--sp-2); }
.stack--loose { gap: var(--sp-5); }

/* Groupe horizontal qui se replie proprement */
.cluster {
  display: flex; flex-wrap: wrap;
  align-items: center; gap: var(--sp-2);
}
.cluster--end     { justify-content: flex-end; }
.cluster--between { justify-content: space-between; flex-wrap: nowrap; }
```

**Conseil.** `.cluster` par défaut **passe à la ligne**. Un groupe d'actions
qui déborde doit se replier, jamais déclencher un défilement horizontal : sur
un écran incliné à la table, une barre de défilement horizontale est
invisible et donc inexistante.

---

## 6. Les composants

### 6.1 La carte

> **Une carte est une chose qu'on prend en main.** Elle a une identité, un
> état, et un ou plusieurs gestes. Si l'objet n'a ni identité ni geste, ce
> n'est pas une carte : c'est une ligne de liste — et une ligne coûte dix fois
> moins cher à l'œil.

Votre `.pnj-card` a déjà la bonne architecture — coquille à deux couches,
footprint distinct de la surface visible, rail hors-cadre. **On la
généralise** ; elle devient le patron de toutes les cartes.

#### Anatomie canonique

```
.card                        footprint : position, container-type, réserve du rail
│                            AUCUN chrome visuel ici
├── .card-frame              LA surface visible (fond, bordure, clip, liseré)
│   ├── ::before             liseré d'accent 2px — signature d'édition
│   ├── .card-head           titre + marqueurs + kebab
│   │   ├── .card-title
│   │   ├── .card-badges     .cluster de marqueurs
│   │   └── .card-kebab      menu (⋮) — 32px de cible
│   ├── .card-zone           zones, séparées par un filet (≤ 4 DÉPLOYÉES ;
│   │                        les tiroirs repliés ne comptent pas)
│   │   ├── .card-zone-label  étiquette mono (rôle « Étiquette »)
│   │   └── …contenu
│   └── .card-foot           .cluster--end d'actions
└── .card-rail               optionnel, hors-cadre, dans la bande réservée
```

#### Spécification

| Propriété | Valeur |
|---|---|
| Surface | `.surface` — niveau 2 |
| Rayon | `--radius-lg` (l'édition peut passer à 0 / au biseau) |
| Padding de zone | `--sp-3` |
| Écart entre cartes | `--sp-4` |
| Liseré d'accent | 2px, haut, `--accent` |
| Repos | aucune ombre portée |
| Survol | `filter: drop-shadow(var(--elev-1)) drop-shadow(0 0 7px var(--glow))` |
| Saisie | `--elev-2` + `--drag-tilt` / `--drag-lift` |
| Entrée | `cardIn`, `--dur-slow`, `--ease-standard` |
| Hauteur | **libre**, jamais fixée |

#### Règles

**Loi — au plus 4 zones DÉPLOYÉES.** Au-delà, on replie ou on scinde. C'est la
limite de la mémoire de travail : une carte à 7 zones ouvertes n'est pas lue,
elle est survolée puis abandonnée.

Un **tiroir replié ne compte pas** — c'est un titre, pas une zone : il coûte une
ligne de 31px et zéro charge de lecture. La carte PNJ en fait la démonstration
(audit D6, mesuré à l'écran) : 4 blocs pour un PNJ, 5 pour un PJ (tiroir
« Suivi »), 6 pour un PJ issu d'un contact (+ « Relation ») — mais les 2 tiroirs
surnuméraires sont fermés au repos, et la charge réelle reste celle de 4 zones.
Ce qu'il faut compter, c'est ce qui est **ouvert en même temps**, pas le nombre
de bandeaux empilés.

*Formulation antérieure — « au plus 4 zones », sans le mot « déployées ». Elle
comptait les nœuds DOM au lieu de la charge cognitive, et déclarait donc en
faute une carte que sa propre parenthèse (« mémoire de travail ») déclarait
saine. Amendée après mesure, arbitrage utilisateur 2026-07-29.*

**Loi — un seul geste primaire par carte.** Soit la carte entière est
cliquable (elle ouvre son détail), soit elle ne l'est pas et ses actions
vivent dans le pied ou le kebab. **Jamais les deux** : une carte cliquable
avec des boutons dedans produit un clic sur deux au mauvais endroit.

**Règle — l'ordre de lecture est fixe** : identité → fiction → état → contenu →
actions. Toujours. C'est ce qui permet le coup d'œil : on sait *où regarder*
avant de savoir *quoi lire*.

La **fiction** (incarnation, identités d'emprunt) vient juste après l'identité,
**avant l'état** : on regarde *qui est ce personnage* avant de regarder *combien
il lui reste de cases*. C'est la convention **I2 « fiction en tête »** du lot
paysage (VIS-15/L1), et c'est aussi ce que fait le code
(`cardrenderer.js` `_body` : « l'incarnation se regarde avant le combat »).
Le besoin inverse — l'état d'abord — existe, mais il est **situationnel** : il
est servi par la lentille **Combat**, qui déplie le bon bloc au bon moment, pas
par un réordonnancement permanent de toutes les cartes.

*Formulation antérieure — « identité → état → contenu → actions », sans la
fiction. Elle contredisait frontalement I2, déjà implémentée et documentée dans
le code : deux règles du projet en conflit, l'une des deux forcément violée en
permanence. Conflit relevé par l'audit D6 (2026-07-29) et tranché en faveur
d'I2 par arbitrage utilisateur.*

**Règle — les actions destructrices ne sont jamais dans le pied.** Elles
vivent dans le kebab, derrière une confirmation. Le pied est réservé aux
gestes fréquents et réversibles. (Fitts en négatif : ce qui est dangereux doit
être *difficile* à atteindre.)

**Conseil — le rail hors-cadre est une bonne trouvaille.** Il donne à la carte
des « onglets de dossier » sans consommer sa largeur. Le réserver aux
**changements de vue** sur le même objet — jamais à des actions.

#### Migration

Les 49 classes `*card*` se ramènent à **une** structure. `.pnj-card`,
`.contact-card`, `.run-card`, `.server-card`, `.spirit-card`, `.vehicle-card`
deviennent des **modificateurs** (`.card--pnj`, `.card--run`…) portant
uniquement leurs différences réelles — qui, à la lecture, se comptent sur les
doigts d'une main.

### 6.2 Le panneau

> **Un panneau répond à une question.** Si vous ne pouvez pas écrire cette
> question en une phrase, le panneau n'est pas prêt.

#### Anatomie

```
.panel
├── .panel-head
│   ├── .panel-title        rôle « Titre de panneau » + puce d'accent
│   ├── .panel-subtitle     la question à laquelle le panneau répond
│   └── .panel-tools        .cluster--end
├── .panel-toolbar          filtres, recherche, tri — STICKY
└── .panel-body             le contenu, seule zone défilante
```

#### Règles

**Loi — quatre états, toujours.** Tout panneau qui affiche une collection
implémente : **plein**, **vide primo**, **vide filtré**, **erreur**. Vous avez
`.empty-state` ; les trois autres sont à systématiser. Voir [§6.7](#67-les-états).

**Règle — la barre d'outils colle, le titre non.** Sur un écran de 1024px de
haut, un en-tête collant mange 15 % de la surface utile. Les filtres, eux,
doivent rester à portée : c'est le contrôle qu'on manipule en boucle.

**Règle — une seule zone défilante par panneau** (`.panel-body`). Deux zones
de défilement imbriquées produisent le « scroll capturé », dont on ne sort pas
au trackpad ni au doigt.

**Conseil — le sous-titre est un investissement rentable.** `.panel-subtitle`
dit *ce que contient* le panneau en une ligne, sans alourdir le titre
d'ambiance. C'est une décision de wayfinding juste : sur un outil à 10+
panneaux, le titre porte l'identité, le sous-titre porte le sens. À généraliser
aux panneaux qui n'en ont pas.

### 6.3 La famille des overlays

**Cinq formes.** L'erreur systémique, dans tous les produits, est d'utiliser
la modale par défaut. Une modale est le geste le plus coûteux de l'interface :
elle interrompt, elle bloque, elle exige une sortie. Sur un outil utilisé au
milieu d'une conversation, chaque modale est un endroit où l'utilisateur perd
le fil de sa partie.

#### L'arbre de décision — à parcourir dans l'ordre

```
L'utilisateur doit-il RÉPONDRE avant de continuer ?
├─ OUI, et c'est une question courte (confirmer, nommer, choisir)
│  └─────────────────────────────────────────────► DIALOGUE
└─ NON
   │
   Est-ce une TÂCHE (saisir, éditer, composer) ?
   ├─ OUI, et sur tactile / une main ──────────────► FEUILLE
   ├─ OUI, au clavier/souris ──────────────────────► MODALE
   └─ NON — il veut juste VOIR
      │
      Le contenu est-il ANCRÉ à un déclencheur ?
      ├─ OUI, court (< 10 entrées) ────────────────► POPOVER
      └─ NON, ou contenu riche ────────────────────► COUP D'ŒIL
```

#### La table de référence

| Forme | Bloque | Rideau | z-index | Fermeture | Largeur |
|---|---|---|---|---|---|
| **Popover** | non | non | `--z-popover` | Échap · clic dehors · sélection | ancrée, `min 220px / max 340px` |
| **Coup d'œil** | non | léger | `--z-peek` | Échap · clic dehors | `min(560px, 94vw)` |
| **Feuille** | oui | oui | `--z-modal` | glisser vers le bas · Échap · rideau | `100vw`, hauteur ≤ `88vh` |
| **Modale** | oui | oui | `--z-modal` | Échap · rideau · bouton explicite | `min(680px, 94vw)`, `max-height 90vh` |
| **Dialogue** | oui, coiffe tout | oui | `--z-dialog` | **bouton uniquement** | `min(420px, 94vw)` |

#### Règles communes à toute la famille

**Loi — le focus est piégé et restitué.** À l'ouverture, le focus entre dans
l'overlay (premier élément interactif, ou le titre si aucun). Tab tourne en
boucle à l'intérieur. À la fermeture, le focus **revient sur le déclencheur**.
Sans ça, un utilisateur au clavier est perdu, et un lecteur d'écran est muet.

**Loi — `aria-modal="true"` + `role="dialog"` + `aria-labelledby` sur le
titre**, pour tout overlay bloquant.

**Loi — Échap ferme.** Sans exception, sauf le Dialogue, qui exige un choix
explicite parce que c'est sa raison d'être.

> **⚠️ État réel, mesuré au re-audit du 2026-07-27 — c'est pire que ce que je
> laissais entendre en écrivant « il manque le traitement partagé ».**
>
> | Ce que la loi exige | Ce que le code fait |
> |---|---|
> | Focus **piégé** | **aucun piège n'existe** — 0 occurrence de `focusTrap`/`trapFocus` dans tout `js/` |
> | Focus **restitué** | partiel : 5 occurrences de `returnFocus` |
> | `role="dialog"` | 10 |
> | `aria-modal` | 13 |
> | `aria-labelledby` | **1 seule occurrence dans tout le projet** |
> | Échap ferme | oui, mais **réimplémenté dans 34 fichiers séparés** |
>
> Autrement dit : la touche Échap a été recodée trente-quatre fois, et le
> piège de focus — la seule de ces règles qui rend une modale *utilisable* au
> clavier — **n'a jamais été écrit**. Ce n'est pas de la dette cosmétique :
> aujourd'hui, un MJ au clavier qui ouvre une modale ne peut pas en sortir
> autrement qu'à la souris ou par Échap.
>
> **Conséquence : le lot 7 n'est pas « un des deux gros, à faire en dernier ».
> C'est le seul lot de ce chantier qui corrige un défaut d'accessibilité réel**,
> et le seul dont le gain se mesure autrement qu'en nombre de classes.

**Règle — le rideau ferme aussi**, sauf si la saisie en cours est perdue. Dans
ce cas, le clic sur le rideau déclenche une secousse courte sur l'overlay
(120ms) plutôt que rien : un contrôle qui ne répond pas est lu comme cassé.

**Règle — le pied d'un overlay n'est collant que s'il tient.** Vous avez déjà
rencontré et documenté ce piège dans `.dialog-modal` : un pied `sticky bottom`
plus haut que l'écran cache ses propres boutons. Un pied à 3 boutons ou plus,
ou sur mobile, coule dans le défilement.

**Règle — ordre des boutons.** Action primaire **à droite**, annulation à sa
gauche, action destructrice **à l'extrême gauche**, séparée. Le pied se lit de
droite à gauche par ordre de probabilité.

**Conseil — préférez toujours la forme la plus légère qui marche.** Si vous
hésitez entre popover et modale, prenez le popover : le coût d'une modale
inutile est payé à chaque ouverture, celui d'un popover trop léger une seule
fois, en refactor.

#### La modale, en détail

`modal-core.css` est déjà propre. Les corrections :

| Point | Aujourd'hui | Cible |
|---|---|---|
| Surface | `--bg-card` | `--bg-overlay` |
| Rayon | `4px` | `--radius-lg` |
| Rideau | `rgba(0,0,0,.8)` | `--scrim` |
| Élévation | aucune | `--elev-2` |
| Titre | `1.1rem` | `--fs-lg` |
| Padding | `1.25rem` | `--sp-4` |
| Focus | non piégé | piégé + restitué |

**Règle — l'indicateur d'autosave reste.** `.modal-autosave-hint` occupe la
place de l'ancien bouton « Sauvegarder ». C'est la bonne réponse au problème
de fond : l'utilisateur interrompu ne doit **jamais** se demander s'il a
perdu quelque chose. Ce motif est à généraliser à toute surface d'édition.

### 6.4 Les actions

**46 classes de bouton.** Il en faut **une**, avec deux axes.

```css
.btn { /* socle : géométrie, transition, focus, état actif */ }

/* Intention — ce que l'action FAIT */
.btn--primary    /* l'action de l'écran. UNE SEULE visible à la fois. */
.btn--secondary  /* alternatives légitimes */
.btn--quiet      /* tertiaire : outils, bascules, actions de chrome */
.btn--danger     /* destructeur, toujours confirmé */

/* Taille — où l'action VIT */
.btn--sm   /* 24px — dans une carte, une ligne dense */
.btn--md   /* 32px — défaut */
.btn--lg   /* 44px — CTA, tactile */
```

| Intention | Fond | Bordure | Encre |
|---|---|---|---|
| primary | `--accent` | — | `--bg` |
| secondary | transparent | `--border-ui` | `--text-dim` → `--accent` au survol |
| quiet | transparent | — | `--text-dim` → `--text` au survol |
| danger | transparent | `--danger` à 45 % | `--danger` |

#### Règles

**Loi — cible tactile : 24px plancher, 44px pour l'action primaire.** Voir
[§7](#7-accessibilité-et-conditions-réelles) : la taille se dimensionne à la
**fréquence du geste**, pas uniformément. La zone cliquable peut dépasser le
visuel (`::after` en position absolue) : ce qui compte est ce que le doigt
atteint, pas ce que l'œil voit.

**Loi — une seule action primaire par surface visible.** Deux boutons pleins
côte à côte, c'est zéro hiérarchie et une décision de plus (Hick). Si vous en
avez deux, l'une des deux est secondaire — décidez laquelle.

**Loi — tout bouton a ses cinq états** : repos, survol, focus visible,
pressé, désactivé. Le focus visible ne se désactive **jamais** ; `focus.css`
le pose déjà bien, on ne le contourne pas.

**Règle — désactivé se justifie.** Un bouton grisé sans explication est une
impasse. Soit on affiche pourquoi (infobulle, texte adjacent), soit on le
laisse actif et on explique à la tentative. Le second est presque toujours
meilleur.

**Règle — retour tactile immédiat.** `transform: scale(.97)` sur `:active`,
`--dur-fast`. Vous le faites déjà sur `.btn-primary`, `.btn-secondary`,
`.nav-btn`, `.tab-btn` : c'est ce qui donne le sentiment que l'outil
**répond**, et c'est particulièrement important au doigt, où rien d'autre ne
confirme le contact.

**Conseil — les libellés sont des verbes à la première personne du
système** : « Générer la trame », « Atomiser », « Reprendre ». Vos libellés
actuels sont bons — spécifiques, incarnés, jamais « OK / Valider ». Un
libellé spécifique supprime le besoin de relire la question.

### 6.5 Les marqueurs

**~50 classes** pour trois objets réels. La confusion coûte cher : rien ne
distingue aujourd'hui, au coup d'œil, ce qui se clique de ce qui informe.

| Type | Ce que c'est | Cliquable | Couleur |
|---|---|---|---|
| **`.tag`** | une étiquette. Informe, catégorise. | non | `--text-dim` sur `--bg` |
| **`.status`** | un état. Change avec la donnée. | non | palette sémantique |
| **`.chip`** | une puce actionnable. Filtre, ouvre, retire. | **oui** | bordure neutre au repos, `--accent` au survol |

**Recette réelle** (`pnj-card.css`) — pas un exemple illustratif : c'est le code
en place, vérifié.

```css
.tag {                                    /* la base : une boîte mono, sobre */
  display: inline-block;                  /* pas inline-flex : pas d'enfants à aligner */
  background: var(--bg); border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 1px 7px; margin: 2px 2px 2px 0;
  font-family: var(--font-mono);          /* mono : c'est de la donnée, pas de la prose */
  font-size: var(--fs-xs); color: var(--text-dim); line-height: 1.6;
}
.status { /* posé SUR .tag — bordure+couleur pleines, jamais de fond */ }
.status.is-danger|is-warning|is-info|is-accent|is-on { /* 4 canaux + l'état actif */ }
.status.is-filled { background: color-mix(in srgb, currentColor 15%, transparent); }

.chip {                                   /* actionnable : l'affordance est la BORDURE */
  border: 1px solid var(--border); color: var(--text); cursor: pointer;
}
.chip:hover, .chip:focus-visible { border-color: var(--accent); color: var(--accent); }
.chip.is-active { color: var(--bg); background: var(--accent); border-color: var(--accent); }
@media (pointer: coarse) { .chip { min-height: var(--hit-cozy); padding-inline: var(--sp-3); } }
```

> **⚠️ Ce bloc était faux sur deux points, corrigé le 2026-07-29 (lot 5).**
> — La recette de base annonçait `inline-flex`+`gap`+`font-body`+`padding 2px`,
> quand `.tag` est en place depuis toujours en `inline-block`+`margin`+
> `font-mono`+`padding 1px 7px`. C'était un exemple *illustratif* jamais
> confronté au code, et ~20 fichiers consomment la vraie recette : **le code
> établi l'emporte**, on corrige l'annotation (même principe que `--radius` au
> lot 11).
> — `.chip` était encore décrit « bordure `--accent` + fond `--glow` permanents »,
> soit le canon **d'avant** son arbitrage. Le canon a été retourné avec
> l'utilisateur (`2008a03`) : l'affordance est une **bordure neutre visible au
> repos**, l'accent n'arrive qu'au survol/focus — parce que 4 sites réellement
> cliquables le faisaient déjà ainsi, contre 1 seul (`.ms-chip`, jamais cliquable
> lui-même) pour l'accent permanent.

**Loi — si c'est cliquable, ça se voit sans survol.** Le survol n'existe pas
au doigt.

> **⚠️ Corrigé au re-audit du 2026-07-27.** La v1 illustrait cette loi en
> écrivant que *« `.combat-pill` ne se distingue que par une bordure à 40 %
> d'opacité, donc invisible sur tablette »*. **C'est faux, et ça l'était déjà
> en v1.** Un chantier antérieur (« CH-M1 », commenté dans
> [`dice-overlay.css`](css/base/dice-overlay.css)) a posé un **glyphe ⚄
> permanent, visible au repos**, sur tout `.rollable` — avec en commentaire
> l'énoncé exact de cette loi : *« le survol n'existe pas sur
> tablette/téléphone, appareil cible du MJ »*. La loi était donc **déjà
> appliquée**, et bien.
>
> **⚠️ Le re-audit s'était trompé à son tour — vérifié à l'écran le 2026-07-29
> (lot 5), il n'y a AUCUN trou d'affordance.** Il annonçait « un dernier trou :
> `.stat-pill.rollable` et `.gm-pool.rollable` portent le glyphe mais pas la
> bordure teintée, ça se solde en quatre sélecteurs ». Les quatre sélecteurs
> n'ont pas lieu d'être :
> — `.gm-pool` **a** une bordure teintée (`accent 18%`, `pnj-card.css`) ;
> — `.stat-pill.rollable` **n'existe jamais seule** dans le produit : les 4 sites
> qui la génèrent la composent toujours avec `combat-pill`, `gm-pool` ou
> `init-pill` (`cardrenderer.js` 861/1291/1455/1609), qui apportent chacun
> bordure teintée **et** glyphe.
> Mesuré sur les 4 combinaisons réelles (Drain · Dévier · Jets · Init) :
> `cursor:pointer`, bordure teintée accent et signal permanent — **conformes
> toutes les quatre**.
>
> La faute de méthode est instructive et se répète : le re-audit avait lu
> `.stat-pill` **isolément** dans le CSS (`border: 1px solid var(--border)`, donc
> « pas de bordure teintée ») sans vérifier avec quoi elle est réellement
> composée — exactement l'erreur qu'il reprochait à la v1. **Lire une classe
> seule ne dit rien de ce que l'utilisateur voit : il faut mesurer la
> combinaison rendue.**
>
> **Conséquence sur le lot 5 : sa justification n'est ni l'accessibilité ni un
> correctif d'affordance — c'est la réduction du désordre, point.** Un lot qu'on
> vend sur une urgence qui n'existe pas se fait mal.

**Règle — un marqueur ne dépasse pas 24 caractères.** Au-delà, ce n'est plus
un marqueur : c'est du texte, et il va casser toutes vos grappes.

> **4ᵉ patron identifié au recensement du lot 5 (2026-07-28) — le composite
> retirable.** `.tag`/`.status`/`.chip` couvrent un marqueur À UN SEUL rôle.
> Mais `.ms-chip`, `.faction-chip`, `.pjlink-chip`, `.play-cast-chip`,
> `.scenario-cast-chip` sont des ENVELOPPES contenant elles-mêmes 1-2 enfants
> cliquables (un nom qui ouvre quelque chose, un ✕ qui retire) — jamais
> cliquables *elles-mêmes*. Ce n'est pas une incohérence à corriger, c'est un
> 4ᵉ objet à part entière, avec sa propre loi :
>
> **Loi — l'enveloppe ne porte JAMAIS `cursor:pointer` ni les couleurs
> actionnables de `.chip`. Seuls ses enfants les portent.** Composer `.chip`
> sur l'enveloppe casse cette loi et produit un faux signal : la puce entière
> semble cliquable alors que son centre ne fait rien. **Bug réel déjà trouvé
> deux fois de cette façon** — la collision `.tag-chip` (`8b64216`, l'enveloppe
> de fiche héritait du `cursor:pointer` de la puce `#hashtag` du chat) et la
> tentation évitée de migrer `.ms-chip` vers `.chip` (`4249855` : `.ms-chip`
> lui-même n'a pas `cursor:pointer`, seul son `-x` l'a).
>
> **La mise en forme PROPRE de l'enveloppe (bordure neutre, fond teinté en
> pilule, ou rien du tout) reste bespoke, au cas par cas** — les 5 sites
> recensés ont chacun une silhouette différente (bordure neutre pour
> `.play-cast-chip`, fond accent en pilule pour `.scenario-cast-chip`, la
> recette complète de `.chip` mais sans le curseur pour `.ms-chip`, rien du
> tout pour `.faction-chip`/`.pjlink-chip`) — rien ne dit qu'ils doivent
> converger vers UNE silhouette commune, seulement vers la même LOI
> d'affordance sur leurs enfants.

> **5ᵉ patron identifié au recensement du lot 5, documenté le 2026-07-29 — le
> marqueur HYBRIDE, qui bascule TAG → CHIP.** `.stat-pill`, `.init-pill`,
> `.combat-pill`, `.skill-tag` et `.attr-cell` ne sont **ni** des tags **ni** des
> chips : ils sont l'un **ou** l'autre selon qu'ils portent `.rollable`.
>
> | | Sans `.rollable` | Avec `.rollable` |
> |---|---|---|
> | Rôle | TAG — informe (une réserve, un score) | CHIP — lance le jet |
> | Bordure | neutre | teintée accent |
> | Signal permanent | aucun | glyphe ⚄ (ou ⛉/⛊ sémantique) |
> | Curseur | défaut | `pointer` |
>
> **Loi — la bascule se fait par `.rollable`, jamais par un composant séparé.**
> C'est la même donnée (« Perception 8 ») qui devient actionnable quand le
> contexte le permet : dupliquer en `.skill-tag` + `.skill-tag-clickable`
> forcerait le renderer à choisir une classe au lieu d'ajouter un état.
>
> **Ne pas aplatir ces 5 classes en `.chip`.** Elles seraient alors *toujours*
> actionnables, ce qui est faux : sur une carte en lecture seule, une réserve
> reste une réserve. C'est précisément ce que le lot 5 a failli faire avant de
> mesurer (voir l'encadré « aucun trou d'affordance » plus haut : les 4
> combinaisons réelles sont déjà conformes, il n'y avait rien à corriger).

> **Deux glyphes entrés au vocabulaire en 1.138.0, et la méthode qui les a
> choisis.** **⇉** (le moteur de course-poursuite) et **⊙** (l'avantage
> positionnel). Avant de les retenir, trois candidats ont été écartés **par
> mesure, pas par goût** :
>
> | Candidat | Verdict | Raison |
> |---|---|---|
> | ◆ | écarté | **déjà pris** — c'est le glyphe de *Run* dans le fil d'Ariane |
> | ◎ | écarté | **déjà pris** — « Matrice publique » dans les quatre éditions |
> | ⌖ | écarté | **3 polices système** le couvrent, contre 153 pour ⊙ |
> | ⇉ | retenu | 19 polices — mieux couvert que **tout** ce qui est déjà en service (⛨ 4, ⛉ 5, ⠿ 7) |
> | ⊙ | retenu | 153 polices, libre dans le dépôt |
>
> **Deux vérifications à faire avant d'ajouter un glyphe**, dans cet ordre :
> `grep -r` sur le dépôt (une collision sémantique coûte plus cher qu'un
> tofu), puis `fc-list ":charset=<codepoint>"` (les polices auto-hébergées du
> projet ont un `unicode-range` qui **exclut les blocs de symboles** : tous
> nos glyphes passent déjà par le fallback système — un glyphe neuf n'ajoute
> pas un risque d'un genre nouveau, mais il faut le choisir dans un bloc
> largement couvert). ⚠ Ces comptages valent pour la machine de dev ; un
> contrôle à l'œil sur l'appareil de table reste nécessaire.

### 6.6 Les champs

`forms.css` est sain. Les corrections :

| Point | Aujourd'hui | Cible |
|---|---|---|
| Fond | `--bg-card` | `--bg-raised` (le champ est un objet, niveau 2) |
| Bordure | `--border` | `--border-ui` (c'est un contrôle, ≥ 3:1) |
| ~~Rayon~~ | ~~`3px`~~ | ✅ **cible atteinte : `--radius-sm`** (= 3px) — voir ci-dessous |
| Padding | `.4rem .6rem` | `--sp-2 --sp-3` |
| Hauteur tactile | variable | `min-height: var(--hit)` sous `(pointer: coarse)` |

> **La ligne « Rayon » de cette table était fausse, et le code avait raison
> (corrigé le 2026-07-30).** Elle visait `--radius` (8px) ; or `forms.css` était
> déjà à 3px avant même ce document, et le lot 11 (vague 4) a acté que **les
> champs vivent à `--radius-sm`**, comme les boutons — cf. § 4.5. La « cible »
> demandait donc de faire régresser un code déjà juste. Elle est barrée, pas
> réécrite : le chemin compte autant que la valeur.

**Loi — tout champ a un label visible.** Le placeholder n'est pas un label :
il disparaît à la saisie, exactement au moment où l'utilisateur interrompu en
a besoin. Vos labels mono en majuscules sont excellents pour ça — ils tiennent
sur une ligne et se distinguent de la valeur d'un coup d'œil.

**Règle — l'erreur vit sous le champ**, en `--danger`, avec l'action de
sortie. Jamais dans un toast : un toast disparaît, un champ en erreur reste.

**Règle — validation à la sortie du champ, pas à la frappe.** Signaler une
erreur pendant que l'utilisateur écrit est perçu comme un reproche et
détériore mesurablement la saisie. Exception : la disponibilité d'un nom, où
l'information immédiate est utile.

**Conseil — `MultiSelect` / `SingleSelect` : bonne décision maintenue.**
Remplacer un `<select>` natif se justifie ici parce que la liste ouverte d'un
`<select>` échappe totalement au thème selon l'OS — et l'identité d'édition
est le cœur du produit. Le `position: fixed` + coordonnées posées en JS est la
bonne parade au clipping par un ancêtre. À conserver tel quel.

### 6.7 Les états

Le trou le plus large du système actuel. Un composant qui affiche des données
en a **quatre**, et vous n'en spécifiez qu'un.

#### Vide primo — l'utilisateur n'a jamais rien créé

C'est votre **meilleure occasion d'enseigner**. Un utilisateur devant un
écran vide est disponible, ce qui n'arrive presque jamais ailleurs.

```
[glyphe discret, --text-dim]
Titre — ce que cet écran contiendra
Une phrase — pourquoi c'est utile
[ Action primaire — le geste qui remplit l'écran ]
```

**Règle.** L'action de l'état vide est **identique** à l'action primaire du
panneau plein. Deux chemins pour le même geste, c'est un chemin de trop à
apprendre.

#### Vide filtré — il y a des données, le filtre n'en montre aucune

**Loi — c'est un état différent du vide primo, et il ne doit jamais afficher
le même message.** Dire « Aucun PNJ » à quelqu'un qui en a 40 et vient de
taper trois lettres est un mensonge, et il lira l'outil comme cassé.

```
Aucun résultat pour « <terme> »
[ Effacer les filtres ]   ← toujours présent, toujours la sortie
```

#### Chargement

**Loi — pas d'indicateur sous 200ms.** Un spinner qui clignote fait paraître
l'interface **plus lente** que pas d'indicateur du tout. Au-delà de 200ms :
squelette à la forme du contenu attendu, jamais un spinner plein écran —
le squelette prépare l'œil à la mise en page qui arrive.

> **Zéro squelette dans `css/`, et c'est le bon résultat — ne pas le lire comme
> une dette** *(tranché au lot 8)*. Les collections se peignent depuis
> `localStorage`, **synchrone** : il n'y a pas de 200ms à couvrir, un squelette y
> serait un mensonge décoratif. Le seul chemin réellement asynchrone du produit
> est **Sync** (`sync.js`, appels réseau) — et c'est là que le manque était réel :
> le libellé « Synchronisation en cours… » existait **mais n'était jamais
> peint**, faute de rafraîchissement entre le changement d'état et la fin de
> l'appel. Corrigé là, pas ailleurs. *Leçon : « 0 squelette » ne se lit pas comme
> un trou tant qu'on n'a pas vérifié ce qui est réellement asynchrone.*

#### Erreur

Trois éléments, dans cet ordre, sans exception :

1. **Ce qui a échoué**, en langage humain (jamais un code seul) ;
2. **Ce que ça implique** pour les données de l'utilisateur — c'est la seule
   chose qui l'intéresse vraiment ;
3. **La sortie** : réessayer, annuler, ou contourner.

**Règle — ne jamais accuser l'utilisateur.** « Le format n'a pas été
reconnu », pas « Vous avez entré un format invalide ». Ce n'est pas de la
politesse : la formulation accusatrice déclenche une réaction défensive qui
retarde mesurablement la compréhension du problème.

### 6.8 Le retour d'action (toast)

**Règle — le toast confirme, il n'informe jamais.** Il vit 4 secondes.
Tout ce qui doit être lu ou décidé n'y a pas sa place.

| Ce qui s'est passé | Où ça se dit |
|---|---|
| Action réussie, réversible | toast + **Annuler** |
| Action réussie, banale | rien, ou un changement d'état visible sur l'objet |
| Erreur sur un champ | sous le champ |
| Erreur bloquante | dialogue |
| Information à lire | dans le contenu |

**Loi — toute action destructrice offre soit une confirmation, soit une
annulation. Jamais ni l'une ni l'autre, jamais les deux.**

Une annulation vaut mieux qu'une confirmation quand c'est techniquement
possible : la confirmation ralentit **tous** les cas, l'annulation ne coûte
qu'aux erreurs — qui sont rares. Réservez la confirmation à ce qui est
vraiment irrattrapable (« Atomiser », qui pousse la suppression en ligne, en
est le cas d'école).

### 6.9 La navigation

Rien à refondre. Ce qui est en place est juste et mérite d'être protégé :

- **Sidebar** : sections libellées, actif marqué par accent + liseré gauche +
  fond `--glow`. Trois signaux redondants pour un état lu en périphérie — c'est
  volontaire et c'est bien.
- **Fil d'Ariane** : Campagne › Run › Scène. Répond à « où suis-je » sans
  charger la mémoire. Le repli des maillons intermédiaires derrière un `…`
  visible, plutôt qu'un débordement silencieux, est la bonne décision : un fil
  d'Ariane qui se coupe en silence ment sur sa seule fonction.
- **Pastille de vie** sur la scène en cours : la seule animation en boucle
  justifiée du produit.
- **Sous-libellé de wayfinding** (« PNJ / générer ») : distingue l'atelier de
  la bibliothèque. Excellente trouvaille, à étendre.

**Règle — la position dans la sidebar est mémoire musculaire.** L'ordre des
entrées ne change pas d'une session à l'autre, ni d'une édition à l'autre.
Ajouter une entrée en fin de section, jamais au milieu.

---

### 6.10 La piste (rail gradué)

> **Un rail gradué répond à une question d'ÉCART** : qui est devant, qui est
> derrière, et de combien. S'il faut lire pour le savoir, il a échoué.

Introduit par la scène de course-poursuite (1.138.0), mais le patron n'a rien
de spécifique à elle : il vaut pour **toute grandeur ordonnée à participants**
— une échelle de distance, une progression, un classement.

#### Anatomie

```
.chase-track                le ruban, une COLONNE
├── .chase-outcome.is-caught   issue haute — nommée, avec sa condition
├── .chase-anchor              l'ANCRE : l'origine du repère, collante
├── .chase-band ×N             une bande = une ligne pleine largeur
│   ├── .chase-band-key          libellé + échelle (la distance en clair)
│   └── .chase-band-slots        les jetons, en grappe
└── .chase-outcome.is-lost     issue basse
```

#### Les cinq règles

**Loi — l'ancre est au début de la lecture, l'écart croît dans le sens de la
lecture, et les deux bouts sont des ISSUES NOMMÉES.** Un rail sans ses deux
fins n'a pas d'enjeu lisible : c'est une réglette. L'issue porte un mot
(« Rattrapé », « Semé », « 1ᵉʳ ») **et** sa condition.

**Loi — une seule orientation.** La piste est **verticale** à toutes les
tailles. Le tracker est fait de colonnes : une piste horizontale y était un
corps étranger, et le vertical rend les noms lisibles en entier là où
l'horizontal les tronquait à cinq caractères. *L'invariant sémantique n'a
qu'une incarnation — rien à réapprendre d'un écran à l'autre.*

**Loi — trois canaux par jeton, jamais quatre.** Position (sa bande) ·
la valeur qui décide · l'état de son test. Tout le reste descend d'un étage
(l'initiative reste dans la file, les mètres dans l'infobulle).

**Loi — la dominance se signale par l'ACCENT, pas par un glyphe de plus.**
Le § 2 dit déjà que l'accent signale l'état actif ; un marqueur dédié aurait
fait doublon. *Vérifié au passage : ◆ était déjà pris (le glyphe de Run) et ◎
aussi (Matrice publique) — un audit de collision avant d'ajouter un signe
coûte cinq minutes et évite un fil d'Ariane cassé.*

**Loi — une valeur que l'app ne tient pas s'affiche `—` et se saisit d'un
tap.** Jamais de dérivation inventée pour boucher un trou de données. C'est
un principe de contenu autant que de design : un chiffre faux ne se détecte
pas, un « — » se corrige.

#### Densité : ce qui tombe, et ce qui ne tombe jamais

| | Ce qui disparaît sous 640px | Ce qui reste, toujours |
|---|---|---|
| Bandes | l'échelle en mètres | le libellé, la bande elle-même |
| Issues | la condition | le mot |
| Jeton | rien — ses contrôles passent **à la ligne** | nom, valeur, cible ≥ 44px |

**La densité dégrade, la forme non.** Un contrôle qu'on retire est un geste
qu'on perd ; un contrôle qui passe à la ligne coûte 18px de hauteur.

---

## 7. Accessibilité et conditions réelles

Sur cet outil, l'accessibilité et l'ergonomie de table sont **le même
sujet** : un écran vu de biais, à contre-jour, en lumière tamisée, par
quelqu'un qui parle en même temps, c'est une situation de déficience
temporaire.

| Exigence | Cible | Force |
|---|---|---|
| Contraste texte | ≥ 4.5:1 | Loi |
| Contraste contrôle / bordure | ≥ 3:1 | Loi |
| Cible tactile | ≥ 24px **plancher absolu** ; 44px pour l'action primaire | Loi (voir ci-dessous) |
| Focus visible | jamais désactivé | Loi |
| Focus piégé et restitué dans les overlays | — | Loi |
| Couleur seule porteuse de sens | interdit | Loi |
| `prefers-reduced-motion` | respecté | Loi (déjà acquis) |
| Zoom navigateur 200 % | pas de perte de contenu | Règle |
| Ordre de tabulation = ordre visuel | — | Règle |
| Libellé accessible sur tout bouton-icône | `aria-label` | Loi |

**Loi — tout bouton sans texte porte un `aria-label`.** Vous avez beaucoup de
boutons-icônes (kebab, rail, zoom du graphe, steppers). Sans libellé, ils sont
muets au lecteur d'écran **et** ambigus à la souris.

### La taille de cible se dimensionne à la fréquence, pas uniformément

> *Correction apportée après lecture de `PLANS/DOCTRINE_GRAMMAIRE_INTERACTION.md`
> § loi 4. Ma première rédaction posait 44px partout ; c'était faux ici, et la
> doctrine avait raison — avec les mesures à l'appui.*

Un plancher uniforme à 44px est **matériellement impossible** sur ce produit :
le moniteur de condition SR5 compte 11 cases. À 44px + gouttières, la rangée
ne tient dans aucun téléphone. La doctrine a fait le calcul : **24px + 4px de
gouttière = 304px, ça tient dans 360px.**

D'où la règle réelle, en trois pas :

| Pas | Valeur | Pour quoi |
|---|---|---|
| **Plancher** | **24px** (WCAG 2.5.8 AA) | tout contrôle, sans exception. En dessous, c'est un bug. |
| **Confort** | **32px** | contrôle courant dans une carte ou une ligne dense |
| **Primaire** | **44px** (WCAG 2.5.5 AAA) | CTA, action reine, geste répété en séance |

**Loi — plus un geste se répète en séance, plus sa cible est grande.** C'est
le principe, pas le nombre.

> **Corollaire découvert en 1.138.0 : un contrôle absent du bloc « CIBLES
> TACTILES » n'a pas été *jugé* trop petit — il n'a jamais été jugé du tout.**
> `.encounter-token`, le jeton du suivi de combat, n'y figurait pas. Ce n'était
> pas un arbitrage de place (le même piège que `.monitor-box` avant lui), juste
> un oubli que rien ne signalait : le bloc ne liste que ce qu'on y a pensé.
> **Vérification à faire quand un composant devient fréquent** : `grep` sa
> classe dans le bloc `@media (pointer: coarse)` de `responsive.css`. Absente
> = à régler, pas à supposer conforme.

*Correction du 2026-07-27 — la v1 de ce document se trompait ici.* Elle
annonçait `.monitor-box` « à 20px, sous le plancher ». **C'est faux** :
`.monitor-box[data-action]` est déjà à **24px** au doigt
([`responsive.css:682`](css/base/responsive.css), bloc « CIBLES TACTILES »
`@media (pointer: coarse)`), avec le calcul en commentaire — *11 cases SR5 × 24
+ 10 espacements × 4 = 304px, tiennent dans une carte mobile*. La loi 4 de la
Grammaire a donc **déjà été appliquée**, et bien. Le scope `[data-action]` est
lui aussi juste : il évite de grossir le moniteur de CI en lecture seule, qui
n'est pas une cible.

*Suite — et clôture, 2026-07-30 (lot 10).* Le point resté ouvert était la base
**hors bloc tactile**, à **16px**. WCAG 2.5.8 ne parle pas du doigt, il parle du
**pointeur** : à la souris aussi, la cible la plus fréquente du MJ était la plus
petite de son bloc. Défaut plus discutable que l'autre (la souris est précise, et
la densité du moniteur porte de l'information), donc **arbitré** plutôt que
corrigé mécaniquement — **arbitrage rendu : on agrandit.**
`.monitor-box[data-action]` est désormais à **24px à la base**
([`pnj-card.css`](css/base/pnj-card.css)), même scope `[data-action]` que la
règle tactile pour ne pas grossir le moniteur en lecture seule
(`CardRenderer.gaugeBoxes`, écran spectateur). **Souris et doigt partagent
maintenant la même cible.**

**Loi — la taille de cible ne dépend pas du pointeur, la DENSITÉ oui.** Le
plancher de 24px vit à la **base**, pas dans un bloc conditionnel : une cible
trop petite l'est pour tout le monde, WCAG 2.5.8 ne connaît pas le `hover`. Ce
qui reste légitimement dans le bloc `@media (pointer: coarse)` « CIBLES
TACTILES » de `responsive.css`, c'est ce qui est **vraiment** propre au doigt —
l'espacement entre cibles voisines (le doigt a besoin d'air, le curseur non).
*Corollaire pratique* : poser une règle à la base sur une classe qui a des
variantes contextuelles oblige à re-vérifier la **spécificité de chaque
variante** — `.curated-monitor .monitor-box` (13px, vue compacte assumée) avait
la même spécificité (0,2,0) que la nouvelle règle et ne gagnait que par l'ordre
des fichiers ; il a fallu lui ajouter `[data-action]` pour trancher franchement.

**Règle — avant de plaider le manque de place, mesurer.** Les conséquences de
layout s'assument (à 24px la rangée SR5 prend toute la largeur, donc le libellé
et le malus montent en bandeau au-dessus — où le malus est d'ailleurs plus
lisible).

**Conseil — testez à un mètre.** Reculez d'un mètre de l'écran, plissez les
yeux. Ce qui reste lisible est ce que votre utilisateur perçoit en périphérie.
Si l'état d'un PNJ blessé n'est pas visible à ce test, il n'est pas visible à
la table. C'est le test le plus rentable que je connaisse, et il coûte trois
secondes.

---

## 8. Le plan de refonte

Onze lots. Chacun est livrable seul, sans dépendre du suivant.

> ## ✅ **LES ONZE LOTS SONT LIVRÉS (2026-07-30).**
> Le tableau et l'ordre ci-dessous sont conservés **tels qu'ils ont été écrits au
> diagnostic** : ils disent ce qu'on a mesuré et pourquoi on l'a ordonné ainsi,
> pas où on en est. Ce sont des **archives de raisonnement**, plus une feuille de
> route. L'état d'avancement vit dans `PLAN_EXECUTION.md` (§ « 🎛️ CHANTIER —
> Système de design ») ; les corrections que le chantier a rendues au présent
> document sont datées et signées dans leurs sections respectives (§ 4.4 survol,
> § 4.5 rayons, § 4.7 bande d'empilement, § 4.8 points de rupture, § 6.6 champs,
> § 7 taille de cible).
>
> **Ce que le chantier a appris, et qui vaut pour le prochain :** sur les onze
> lots, **cinq ont vu leur prémisse invalidée par le code** avant d'être livrés —
> D10 décrivait un défaut déjà corrigé, D5 s'appuyait sur une urgence
> d'accessibilité inexistante, D9 était surévalué, D6 sur-comptait ses variantes,
> et D4 confondait « réinventer » avec « avoir 46 classes ». *Le document avait
> tort plus souvent que le code.* D'où la règle qui a fini par s'imposer :
> **relire le code AVANT de rouvrir un lot, et accepter que le lot change de
> forme** — trois d'entre eux se sont soldés en corrigeant ce référentiel-ci
> plutôt qu'en touchant une ligne de CSS.

> **Tableau reconstruit au re-audit du 2026-07-27**, après que trois lots
> vérifiés sur trois se sont révélés bâtis sur une prémisse fausse ou périmée.
> Chaque ligne ci-dessous a été **confrontée au code** avant d'être réécrite.
> Les colonnes Effort/Risque sont révisées en conséquence, et l'ordre ne suit
> plus l'intuition de ma v1.

| # | Lot | Effort | Risque | Gain | Vérifié |
|---|---|---|---|---|---|
| 1 | **Achever les tokens** — rayons, points de rupture, rôles typo, `--scrim`, `--bg-overlay`, cibles, mesure | S | Nul | Débloque le reste | ✅ **LIVRÉ** |
| 2 | **Adopter l'élévation** — `box-shadow` en dur → `--elev-1/2` ; overlays → `--bg-overlay` | M | Faible | Profondeur cohérente | ✅ **LIVRÉ** |
| 11 | **Propager les échelles** — **310** `border-radius` littéraux → 4 pas · **260** `gap` littéraux → 7 pas · **102** tailles hors échelle → 8 pas. *Lot neuf : le plus grand écart mesuré du projet, absent de ma v1* | L | Moyen | L'adoption que le § 1 réclamait | ⚠️ **prémisse la plus solide** |
| 7 | **Overlays** — 5 formes, **focus trap qui n'existe pas du tout**, `aria-labelledby` (1 occurrence dans tout le projet), Échap recodé **34 fois**, + un token d'élévation **directionnel** pour la feuille | L | Moyen | **Le seul vrai défaut d'a11y du chantier** | ⚠️ **pire que décrit** |
| 8 | **États systématiques** — vide primo ≠ vide filtré (« Effacer les filtres » : **0 occurrence**), chargement (**0 squelette**), erreur (**0 `error-state`**) + l'état « sélectionné » | M | Faible | Le trou le plus large côté MJ | ✅ confirmé |
| 3 | **Primitives** — `.surface`/`.stack`/`.cluster` (**aucune n'existe**) ; **223** candidats `.cluster`, **97** candidats `.stack` | L | Faible | Le plus gros gisement de lignes | ✅ confirmé, sous-estimé |
| 4 | **`.btn`** — **46 classes, 43 autonomes**. Mais `.btn-primary`/`.btn-secondary` **existent déjà et sont corrects** : le problème n'est pas « 46 → 1 », c'est que 43 composants **réinventent au lieu de composer** | M | Moyen | Hiérarchie d'action lisible | ⚠️ recadré |
| 5 | **Marqueurs** — **71 brutes → ~51 réelles** (8 conteneurs partent au lot 3, 10 sont des sous-parties). Justification = **désordre, pas accessibilité** (cf. § 6.5) | M | Faible | Moins de désordre | ⚠️ recadré |
| 6 | **Carte canonique** — **48 brutes → 15 racines** ; les 19 sous-parties (`-header`, `-frame`…) sont **légitimes et se gardent** + le ruban d'accent | L | Moyen | Le cœur du produit | ⚠️ sur-compté en v1 |
| 9 | **Solder `graph.css`** — **7 hex réellement nus** (les 134 autres sont des replis inertes) + définir `--surface-1`/`--surface-2` | **S** | Faible | Quasi gratuit | ⚠️ **dégradé de M à S** |
| 10 | **Arbitrer `.monitor-box` à 16px** hors bloc tactile — le doigt est déjà servi. **À trancher, pas à corriger** | S | Faible | Solde ou acte | ⚠️ requalifié → ✅ **tranché : agrandi à 24px** (§ 7) |

> Ces lots sont suivis sous les identifiants **D1 → D11** dans `PLAN_EXECUTION.md`
> § « 🎛️ CHANTIER — Système de design », avec leur statut d'avancement. Le présent
> document dit **quoi faire** ; le plan dit **où on en est**.

#### L'ordre, révisé — et pourquoi il a changé

*(Ordre effectivement suivi, et tenu jusqu'au bout — conservé comme trace du
raisonnement.)* Ma v1 ordonnait par « gain / risque » estimé. Le re-audit montre
que j'estimais mal. Le nouvel ordre :

1. **D9** — devenu S, quasi gratuit, delta visuel ~nul. On commence par ce qui
   ne coûte rien.
2. **D7** — parce que c'est le seul lot qui répare quelque chose de **cassé**
   pour un utilisateur réel (le MJ au clavier), et non un désordre interne.
   Un chantier de design system qui fait passer l'esthétique du code avant
   une modale dont on ne peut pas sortir au clavier a ses priorités inversées.
3. **D8** — deuxième plus grande valeur pour le MJ : lui dire « Aucun PNJ »
   quand il en a 40 et vient de taper trois lettres, c'est lui faire croire
   que l'outil est cassé.
4. **D11** — le plus grand écart mesuré. Placé après D7/D8 parce qu'il est
   mécanique : il gagne à être fait quand rien d'autre ne bouge.
5. **D5** → **D4** → **D3** → **D6** — la consolidation structurelle, par
   alias transitoire, de la plus petite surface à la plus grande.
6. **D10** — arbitrage produit, quand vous y penserez.

**⚠️ Le coût dominant n'est pas le code, c'est la vérification.** La doctrine du
projet impose **4 éditions × 3 tailles d'écran avant chaque commit**. Un lot CSS
transverse coûte donc bien plus en vérification qu'en frappe. C'est ce qui
justifie de commencer par les lots à **delta visuel nul**.

**⚠️ Le piège du comptage, appris à mes dépens.** Trois de mes chiffres de v1
étaient faux dans le même sens : j'avais compté des **caractères**, pas des
**effets**. `grep '#[0-9a-f]'` compte des replis inertes comme des couleurs
appliquées ; `grep 'card'` compte `.pnj-card-header` comme une variante de
carte. **Avant de rouvrir un lot, recomptez avec la méthode du § 1** —
commentaires retirés, racines séparées des sous-parties, replis séparés des
valeurs actives.

**⚠️ Ce chantier ne se parallélise avec aucun autre chantier CSS.** Il touche
presque tout `css/base/` ; le principe « un fichier = un propriétaire à un
instant donné » s'applique intégralement.

**Conseil sur la méthode.** Les lots 4, 5 et 6 se font par **alias
transitoire** : la nouvelle classe naît, l'ancienne devient `@extend` (ou une
règle miroir d'une ligne), les appelants migrent au fil de l'eau, l'ancienne
disparaît quand plus personne ne l'appelle. Aucun *big bang*. Sur un produit
sans bundler ni tests visuels, c'est la seule méthode sûre.

**Conseil sur la mesure.** Reprenez les chiffres du §1 avant et après chaque
lot. Un système de design qui ne réduit pas le nombre de classes distinctes
n'a rien systématisé — il a juste ajouté une couche.

---

## 9. Ce qu'on ne change pas

Aussi important que le reste. Ces décisions sont bonnes, et je les vois
souvent démolies par un designer de passage qui n'a pas compris pourquoi elles
existaient :

- **Les quatre éditions comme identités visuelles distinctes.** C'est le
  produit, pas une préférence. Un système de design ne l'aplatit pas — il
  garantit que les quatre restent **structurellement identiques** sous des
  peaux différentes.
- **`--aro` constant par édition** face à `--accent` variable. Une signature
  système qui tient à travers les habillages : rare et juste.
- **Le feel du drag tokenisé** (`--drag-tilt`, `--drag-lift`). Du design
  d'auteur. On ne l'uniformise pas.
- **La physicalité des dés** (`die-face` : liseré + ombre portée, y compris à
  l'état « hit »). *Ajouté 2026-07-27, re-arbitré avec l'utilisateur après D2.*
  Un dé est un objet 3D simulé, pas une carte plate — la loi « l'ombre porte le
  mouvement, jamais le repos » (§ 4.4) ne s'y applique pas : l'aplatir
  perdrait le grain physique délibéré, comme le ferait uniformiser le drag.
- **Les pulsations décoratives** (`.tour-ring`, `.vehicle-pulse`,
  `.tb-crumb-live`). *Confirmé 2026-07-27.* Chacune sert un contexte différent
  (onboarding, alerte véhicule, navigation) ; les tokens de mouvement
  (`--dur-*`/`--ease-*`) existent déjà et s'y appliquent — rien de plus à
  unifier entre elles.
- **`column-count` sur `.cards-zone`.** Le raisonnement (des hauteurs inégales
  créent des trous d'alignement en grille) est correct et documenté.
- **La coquille à deux couches de la carte** (footprint / frame / rail
  hors-cadre). C'est déjà une architecture de design system ; on la
  généralise, on ne la remplace pas.
- **Les commentaires du CSS.** Ils documentent les décisions **et les pièges
  rencontrés**. C'est du savoir qui ne se retrouve nulle part ailleurs. Toute
  migration les déplace ; aucune ne les supprime.
- **Le vocabulaire français, incarné.** « Atomiser », « Ombres portées »,
  « Générer la trame », « Reprendre ». Un libellé qui parle la langue de la
  fiction supprime une traduction mentale à chaque lecture.

---

## 10. La checklist de PR

À coller dans le gabarit de PR. C'est la partie de ce document que vous
relirez le plus souvent.

**Tokens**
- [ ] Aucune couleur en dur (hors `theme-*.css`)
- [ ] Aucun `font-size` littéral — un des 8 pas de l'échelle
- [ ] Aucun `padding` / `margin` / `gap` littéral — un des 7 pas
- [ ] Aucun `z-index` littéral — une bande nommée
- [ ] Aucune durée littérale — `--dur-fast` / `--dur-base` / `--dur-slow`
- [ ] Rayon pris dans les 4 pas

**Structure**
- [ ] `min-width: 0` sur **chaque** conteneur flex d'une chaîne qui doit se
      compresser — un enfant flex garde `min-width: auto` et refuse de
      descendre sous la largeur de son contenu. Symptôme : ce n'est pas
      l'élément fautif qui déborde, c'est son ANCÊTRE (mesuré en 1.138.0 :
      un ruban exigeait 367px là où la colonne mobile en offrait 342, et
      c'est la modale qui débordait de 23px)
- [ ] Aucune classe neuve si un composant existant convient
- [ ] Le thème n'a touché que couleur / typo / rayon / clip — jamais la géométrie
- [ ] La surface est au bon niveau d'élévation (0 fond · 1 chrome · 2 objet · 3 overlay)
- [ ] Pas d'ombre portée sur un objet au repos

**Interaction**
- [ ] Une seule action primaire visible
- [ ] Cinq états sur chaque contrôle : repos · survol · focus · pressé · désactivé
- [ ] Cible ≥ 24px partout ; 44px si c'est l'action primaire ou un geste répété
- [ ] La densité tactile est réglée dans le bloc « CIBLES TACTILES », nulle part ailleurs
- [ ] Le feel demandé est **jouable** : le rendu ne remplace pas `innerHTML` sous la transition
- [ ] Échap ferme tout overlay ; le focus revient sur le déclencheur
- [ ] Toute action destructrice offre une confirmation **ou** une annulation

**États**
- [ ] Vide primo **et** vide filtré traités séparément
- [ ] Chargement : rien sous 200ms, squelette au-delà
- [ ] Erreur : ce qui a échoué · ce que ça implique · la sortie

**Le test de la table**
- [ ] Mesuré à **375px** : ni la page ni la modale ne défilent
      horizontalement (`scrollWidth > clientWidth` sur les deux)
- [ ] À un mètre, les yeux plissés : l'état de l'objet est-il lisible ?
- [ ] Si on m'interrompt maintenant, ai-je perdu quelque chose ?
- [ ] Ce geste demande-t-il de se souvenir de quoi que ce soit ?

---

## Annexe — les tokens à ajouter

Bloc prêt à coller dans `foundation.css`, à la suite de l'existant.

```css
:root {
  /* ---- Surfaces d'overlay ---- */
  --bg-overlay: var(--bg-raised);
  --scrim: rgba(0, 0, 0, 0.72);

  /* ---- Rayons : 4 pas (remplace 13 valeurs littérales) ---- */
  --radius-sm: 3px;    /* marqueurs, micro-contrôles */
  --radius: 6px;       /* champs, boutons, encarts */
  --radius-lg: 12px;   /* cartes, overlays */
  --radius-pill: 999px;

  /* ---- Points de rupture (documentaires : à recopier dans les @media,
         CSS ne les résout pas dans une media query) ---- */
  --bp-sm: 640px;
  --bp-md: 1024px;
  --bp-lg: 1440px;

  /* ---- Cibles tactiles : 3 pas, dimensionnés à la FRÉQUENCE du geste (§7).
         Jamais un plancher uniforme : le moniteur SR5 (11 cases) ne tient
         pas à 44px sur un téléphone — mesuré, cf. doctrine Grammaire. ---- */
  --hit-min: 24px;   /* plancher WCAG 2.5.8 — en dessous, c'est un bug */
  --hit-cozy: 32px;  /* contrôle courant en ligne dense */
  --hit: 44px;       /* action primaire, geste répété en séance */

  /* ---- Longueur de ligne de lecture ---- */
  --measure: 68ch;
}
```

---

*Ce document est vivant. Une règle qu'on contourne trois fois est une règle
fausse : elle se corrige ici, elle ne se contourne pas une quatrième.*

*— Estelle*
