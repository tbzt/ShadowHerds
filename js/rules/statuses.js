"use strict";

/* ============================================================
   ÉTATS DE COMBAT — le magasin, neutre par édition (lot E1).

   Un état est une condition temporaire posée sur un PNJ : Aveuglé, À terre,
   Enflammé… Le CATALOGUE vit dans le module d'édition (`statusModel`), jamais
   ici : SR6 en a 28, SR5 n'a pas d'états du tout mais une poignée de
   modificateurs de situation persistants (p.179), Anarchy n'en a pas encore.
   Ce module ne connaît que la FORME d'un état, pas son contenu.

   ── Où vivent les états, et pourquoi sur le PNJ ──────────────────────────
   `pnj.statuses = { aveugle: 2, aterre: 1 }` — même emplacement que
   `pnj.drugState`, pour la même raison : `js/core/utils.js` (qui calcule les
   malus de réserve) n'a AUCUN import et ne pourra jamais lire l'état de scène
   d'`Encounter`. Un état posé sur l'entrée de combattant serait invisible à la
   carte — c'est-à-dire à un tap du bouton qui vient de le poser (le ⛶ de la
   console ouvre précisément cette carte). Conséquence assumée : un état
   SURVIT à la scène. La sortie de masse est le ⛨ « Réinitialiser les
   moniteurs », qui purge aussi les statuts.

   ── Les niveaux ─────────────────────────────────────────────────────────
   Le livre SR6 emploie DEUX notations que l'app ne doit pas confondre (p.55) :
   - chiffres romains au titre = échelle PLAFONNÉE (Aveuglé I-III, Couvert I-IV)
     → `levels: 3` / `levels: 4` ;
   - `#` seul = niveau LIBRE, donné par la source — « Le nombre qui suit l'état
     est le malus à votre réserve de dés » (Confus). Un sort de Puissance 6
     donne Confus 6, qu'un plafond à 3 écrêterait à tort → `levels: null` ;
   - pas de notation = état binaire → `levels: 0`.

   ── Ce que ce module ne fait PAS ────────────────────────────────────────
   Il ne POSE jamais un état DE SA PROPRE INITIATIVE (garde-fou R4 « pas
   d'automatisation complète du combat » + (e) « informer, jamais décider ») :
   le MJ pose, l'app compte. Et au lot E1 il n'applique aucun effet — les états
   sont AFFICHÉS et SOURCÉS, comme `ActorEffects`. Les `apply`/`revert` du
   catalogue arrivent au lot E3, et passent par `Effects.transition` déjà
   branché ici.

   ⚠ AMENDEMENT AU LOT F4. Cette règle disait « jamais de lui-même », tout
   court. Elle a été précisée le jour où les ACTIONS ont eu un nom (F1), parce
   que le livre écrit noir sur blanc « Se coucher : il obtient alors l'état
   À terre » et « Se relever : se débarrasse de l'état À terre ».

   Poser À terre quand le MJ vient de taper « Se coucher » n'est pas une
   initiative de l'app : c'est la CONSÉQUENCE DIRECTE d'un geste que le MJ vient
   de faire, écrite dans la même phrase du livre que l'action elle-même. Le MJ
   pose toujours — simplement, il le fait maintenant par le nom de l'action
   plutôt que par le nom de l'état.

   La frontière n'a donc pas bougé, elle s'est explicitée : l'app ne DÉDUIT
   jamais un état d'une situation qu'elle observe (« il a pris 6 cases, il doit
   être Sonné » — jamais). Elle applique ce qu'un geste du MJ entraîne
   mécaniquement. Tout ce qui reste soumis à un jet ou à un choix (« Éviter :
   S'IL CHOISIT de se déplacer de plus de 2 mètres, il subit À terre ») est
   PROPOSÉ, pas appliqué — cf. `maySet` côté `actionModel`.
   ============================================================ */
import { Effects } from "./effects.js";

export const Statuses = {
  /** Spéc d'états de l'édition d'un PNJ, ou null si elle n'en a pas
      (Anarchy 1 et 2 aujourd'hui — la surface disparaît d'elle-même, comme
      `preRollEdge: null` fait disparaître le panneau pré-jet). */
  model(pnj) {
    const mod = pnj ? App.getEditionModule(pnj.edition) : null;
    return (mod && mod.statusModel) || null;
  },

  /** Catalogue complet de l'édition, dans l'ordre du contrat. L'ordre est
      FIXE et ne se réordonne jamais selon l'usage : une cible qui se déplace
      sous le doigt entre deux ouvertures produit un mis-tap silencieux. */
  catalog(pnj) {
    const m = this.model(pnj);
    return (m && m.catalog) || [];
  },

  /** Entrée de catalogue par clé, ou null. */
  find(pnj, key) {
    return this.catalog(pnj).find((s) => s.key === key) || null;
  },

  /** Niveau courant d'un état sur un PNJ : 0 = absent. Un état binaire posé
      vaut 1 — le niveau est aussi le drapeau, il n'y a pas deux notions. */
  level(pnj, key) {
    return (pnj && pnj.statuses && pnj.statuses[key]) || 0;
  },

  /** Les états ACTIFS d'un PNJ, résolus contre le catalogue et rendus dans
      l'ordre du catalogue (pas dans l'ordre de pose — cf. `catalog`).
      → [{ key, name, level, levels, page, desc, effects, until, entry }]
      Un état stocké mais inconnu du catalogue est ignoré, pas affiché : ça
      arrive quand un PNJ change d'édition, et un nom orphelin serait pire
      qu'une absence. */
  active(pnj) {
    if (!pnj || !pnj.statuses) return [];
    return this.catalog(pnj)
      .filter((s) => this.level(pnj, s.key) > 0)
      .map((s) => ({ ...s, level: this.level(pnj, s.key) }));
  },

  /** Y a-t-il au moins un état posé ? (raccourci de rendu — la ligne d'état
      ne s'émet que si elle a quelque chose à dire). */
  any(pnj) {
    return this.active(pnj).length > 0;
  },

  /** Niveau maximum d'un état : le plafond du contrat, 1 pour un binaire.
      `levels: null` = libre → pas de plafond (Infinity), c'est la source qui
      décide (un sort de Puissance 6 pose Confus 6). */
  max(entry) {
    if (!entry) return 1;
    if (entry.levels === null) return Infinity;
    return entry.levels > 0 ? entry.levels : 1;
  },

  /** Pose un état au niveau `level` (0 = retire). Passe par
      `Effects.transition` pour que le retrait défasse EXACTEMENT ce que la
      pose a fait, avec le niveau qui l'avait posé — au lot E1 le catalogue n'a
      pas encore d'`apply`/`revert`, la transition est donc un no-op, mais le
      chemin est celui qui servira au lot E3 sans seconde machine.
      Renvoie le niveau réellement posé (borné par le plafond du contrat). */
  set(pnj, key, level) {
    const entry = this.find(pnj, key);
    if (!pnj || !entry) return 0;
    const before = this.level(pnj, key);
    const cap = this.max(entry);
    const next = Math.max(0, Math.min(cap === Infinity ? level : cap, level | 0));
    if (next === before) return before;

    const phase = entry.effects && entry.effects.apply ? entry.effects : null;
    Effects.transition(pnj, pnj.edition, before ? phase : null, next ? phase : null, before, next);

    pnj.statuses = pnj.statuses || {};
    if (next) pnj.statuses[key] = next;
    else delete pnj.statuses[key];
    if (pnj.statuses && !Object.keys(pnj.statuses).length) delete pnj.statuses;

    // L'âge (lot E3b) meurt avec l'état — sinon un Mourant retiré puis reposé
    // repartirait à la difficulté où il s'était arrêté, alors que le livre le
    // fait repartir « au premier Tour ».
    if (!next && pnj.statusAge) {
      delete pnj.statusAge[key];
      if (!Object.keys(pnj.statusAge).length) delete pnj.statusAge;
    }

    // Exclusions du livre (Enflammé annule et est annulé par Trempé et
    // Frigorifié ; Pétrifié annule tout état à dommages). Déclarées par le
    // catalogue, appliquées ici — et seulement à la POSE, jamais au retrait :
    // retirer Enflammé ne rallume pas Trempé.
    if (next && entry.cancels) for (const k of entry.cancels) this.set(pnj, k, 0);
    return next;
  },

  /** Pose l'état au niveau I (ou l'incrémente d'un cran s'il est déjà là,
      jusqu'au plafond puis retour à 0). C'est le geste unique de la pastille :
      un tap pose, les taps suivants montent, le dernier retire — le patron
      `edge-step` du cockpit, pas trois cibles collées dans une puce. */
  step(pnj, key) {
    const entry = this.find(pnj, key);
    if (!entry) return 0;
    const cur = this.level(pnj, key);
    const cap = this.max(entry);
    // Binaire : un tap pose, un tap retire.
    if (cap === 1) return this.set(pnj, key, cur ? 0 : 1);
    // À niveaux : I → II → … → plafond → retiré. Un niveau LIBRE n'a pas de
    // plafond : le stepper s'arrête à III, au-delà le MJ saisit la valeur que
    // la source impose (le catalogue ne la connaît pas).
    const haut = cap === Infinity ? 3 : cap;
    return this.set(pnj, key, cur >= haut ? 0 : cur + 1);
  },

  /* ============================================================
     AUTO-APPLICATION (lot E3) — trois lectures, et trois seulement.

     Règle permanente du chantier : **l'app ne pose jamais un état d'elle-même**
     (R4 « pas d'automatisation complète du combat » + garde-fou (e) « informer,
     jamais décider »). Une fois l'état posé PAR LE MJ, elle peut en tirer une
     arithmétique **pure, réversible et tracée au point de consommation**.

     Ne passent donc en automatique que les effets qui ont DÉJÀ une valeur à
     corriger dans l'app, et que le livre écrit comme non conditionnels :
       · `globalDice` — le malus de dés, mais UNIQUEMENT pour les états qui
         disent « à toutes les actions ». Sur les 28 états SR6, ils sont
         QUATRE. « Aveuglé −3 aux tests liés à la vision » n'en est pas : l'app
         ne tague pas ses compétences par sens, un −3 global serait faux sur la
         plupart des jets. Ces états-là restent affichés et sourcés.
       · `initMalus` — le score d'initiative, que le tracker calcule déjà.
       · `edge` — l'accès à la ressource pré-jet, que le panneau sait fermer.
     Tout le reste (déplacement, SO/SD, coûts d'action, seuils de Perception,
     interdictions d'agir) reste du texte : griser un bouton retirerait au MJ
     un arbitrage que le livre lui rend explicitement.
     ============================================================ */

  /** Malus de dés GLOBAL cumulé, en magnitude positive (à soustraire), comme
      `woundMalus` et `sustainMalus`. `flat` = valeur fixe, `perLevel` = valeur
      × niveau (Confus « −(niveau) dés à toutes les actions »). */
  globalDiceMalus(pnj) {
    let n = 0;
    for (const s of this.active(pnj)) {
      const g = s.globalDice;
      if (!g) continue;
      n += (g.flat || 0) + (g.perLevel || 0) * s.level;
    }
    return n;
  },

  /** Malus d'initiative cumulé, en magnitude positive. Lu par `_rollInit` au
      moment où le score se calcule — et surtout PAS par `adjustInit`, qui est
      le stepper ±1 à la main : un malus posé là serait effacé au relancement
      d'initiative du round suivant, alors que l'état, lui, est toujours posé. */
  initMalus(pnj) {
    let n = 0;
    for (const s of this.active(pnj)) n += s.initMalus || 0;
    return n;
  },

  /** Verrou de ressource pré-jet : { spend, gain } — `false` = interdit.
      N'entrent ici que les interdictions INCONDITIONNELLES du livre. SR6
      Désorienté (« ni gain ni dépense d'Atout ») en est une ; Déséquilibré
      (« pas de dépense pour une action liée à un attribut physique ou un test
      de défense ») et Couvert (« impossible de gagner de l'Atout EN
      ATTAQUANT ») n'en sont pas — le panneau ne sait pas quelle action va être
      tentée, et deviner à la place du MJ serait décider. Ceux-là restent
      affichés sur leur puce. */
  edgeLock(pnj) {
    const out = { spend: true, gain: true };
    for (const s of this.active(pnj)) {
      if (!s.edge) continue;
      if (s.edge.spend === false) out.spend = false;
      if (s.edge.gain === false) out.gain = false;
    }
    return out;
  },

  /** Les états qui EXPLIQUENT le malus global courant, pour que le chiffre ne
      baisse jamais sans nom — « tracé au point de consommation ». */
  globalDiceSources(pnj) {
    return this.active(pnj)
      .filter((s) => s.globalDice)
      .map((s) => ({
        name: s.name,
        level: s.level,
        malus: (s.globalDice.flat || 0) + (s.globalDice.perLevel || 0) * s.level,
      }));
  },

  /* ============================================================
     AU FIL DU ROUND (lot E3b) — ce que l'horloge débloque.

     E3 ne savait appliquer que ce qui était VRAI EN PERMANENCE (un malus de
     dés, un score d'initiative). Les états qui disent « chaque round » n'ont
     pas de valeur permanente à corriger : ils ont un RENDEZ-VOUS. Il manquait
     l'horloge, pas la permission.

     Ce que le round change est donc le MOMENT, jamais le POUVOIR. L'app pose
     la bonne VD au bon instant et tend le bouton de jet ; elle ne lance pas la
     résistance à la place du MJ, ne remplit aucun moniteur (qui n'accepte que
     du NET, déjà encaissé) et ne tue personne. R4 et le garde-fou (e) tiennent
     mot pour mot.
     ============================================================ */

  /** Nombre de tours écoulés depuis la pose, pour les états qui déclarent
      `ages: true` (Anarchy 1 Mourant, dont la difficulté monte d'un cran par
      Tour). 0 = posé ce tour-ci. Stocké à côté du niveau, même cycle de vie. */
  age(pnj, key) {
    return (pnj && pnj.statusAge && pnj.statusAge[key]) || 0;
  },

  /** Seuil COURANT d'un test de round, escalade comprise. Le livre A1 écrit
      « très facile (4 dés) pour le premier Tour, et augmente d'un niveau de
      difficulté à chaque Tour » : le seuil de base plus `escalates` par tour
      d'ancienneté. Sans `escalates`, le seuil est fixe (SR6 Nauséeux). */
  testThreshold(pnj, entry) {
    const t = entry && entry.roundTest;
    if (!t) return 0;
    return t.threshold + (t.escalates || 0) * this.age(pnj, entry.key);
  },

  /** Le BILAN d'un PNJ à une frontière de round donnée ("startOfRound" ou
      "endOfRound") : ce que le MJ doit se rappeler et que personne ne se
      rappelle. Trois natures, jamais mélangées :
        · `degats`  — une VD à résister (ou déjà nette, `resisted:false`)
        · `tests`   — un jet à faire, avec son seuil du moment
        · `echus`   — une durée arrivée à terme
      Fonction PURE : elle ne mute rien, elle décrit. C'est l'appelant
      (Encounter) qui applique la décroissance et incrémente les âges, et le MJ
      qui tranche le reste. */
  roundReport(pnj, when = "endOfRound") {
    const out = { degats: [], tests: [], echus: [] };
    if (!pnj) return out;
    for (const s of this.active(pnj)) {
      const p = s.periodic;
      if (p && p.when === when) {
        out.degats.push({
          key: s.key,
          name: s.name,
          level: s.level,
          vd: p.vd === "level" ? s.level : p.vd || 0,
          type: p.type || "phys",
          resisted: p.resisted !== false,
        });
      }
      const t = s.roundTest;
      if (t && t.when === when) {
        out.tests.push({
          key: s.key,
          name: s.name,
          pool: t.pool || [],
          threshold: this.testThreshold(pnj, s),
          age: this.age(pnj, s.key),
          escalates: !!t.escalates,
        });
      }
    }
    if (when === "endOfRound")
      out.echus = this.expiring(pnj, this.unit(pnj) === "narration" ? "narration" : "round");
    return out;
  },

  /** Fait vieillir les états qui comptent leurs tours, et décroître ceux qui
      s'éteignent seuls (« VD réduite de 1 par round »). C'est la SEULE mutation
      automatique du lot : elle ne fait qu'appliquer une arithmétique que le
      livre écrit et que le MJ a déclenchée en posant l'état. Renvoie les états
      éteints par décroissance, pour que le round puisse le dire.
      Passe par `set()` — donc par `Effects.transition` — pour qu'un état qui
      s'éteint défasse proprement ses effets, jamais un `delete` brutal. */
  advanceRound(pnj) {
    if (!pnj || !pnj.statuses) return [];
    const eteints = [];
    for (const s of this.active(pnj)) {
      if (s.ages) {
        pnj.statusAge = pnj.statusAge || {};
        pnj.statusAge[s.key] = this.age(pnj, s.key) + 1;
      }
      if (s.decay) {
        const next = s.level - s.decay;
        this.set(pnj, s.key, Math.max(0, next));
        if (next <= 0) eteints.push(s.name);
      }
    }
    return eteints;
  },

  /* ============================================================
     SURTAXES D'ACTION (lot F3) — ce que le catalogue portait en texte mort.

     Les états qui renchérissent une action étaient dans le catalogue depuis E1,
     mais en `lines` : « Attaquer à couvert coûte 1 action mineure
     supplémentaire », « les actions mineures impliquant le membre en coûtent
     deux ». Une surtaxe ne peut pas s'appliquer à un JETON ANONYME — il
     fallait d'abord que les actions aient un nom (F1). C'est fait.

     DEUX RÉGIMES, et la frontière est celle d'E3 :
       · `auto: true`  — le livre l'écrit SANS condition (Couvert : l'état est
         posé, l'action est nommée, il n'y a rien à arbitrer) → l'app l'ajoute
         au coût et NOMME sa source, comme `globalDiceSources`.
       · `auto: false` — le livre subordonne la surtaxe à un jugement que l'app
         ne peut pas rendre (Estropié : « les actions IMPLIQUANT LE MEMBRE » —
         l'app ne sait pas quel membre une action mobilise) → elle SIGNALE, le
         MJ tape le jeton. Même arbitrage qu'« Aveuglé −3 aux tests liés à la
         vision », qu'E3 a refusé de rendre global.

     Ce module ne connaît que la FORME de la surtaxe. C'est `Actions` qui la
     résout contre une action donnée — lui seul sait ce qu'est une action.
     ============================================================ */

  /** Les états actifs qui déclarent une surtaxe d'action, résolus au niveau
      posé : → [{ key, name, level, auto, why, rules }]. Les règles dont le
      `minLevel` n'est pas atteint sont écartées ici, pas chez l'appelant. */
  surcharges(pnj) {
    const out = [];
    for (const s of this.active(pnj)) {
      const sc = s.surcharge;
      if (!sc || !sc.rules) continue;
      const rules = sc.rules.filter((r) => !r.minLevel || s.level >= r.minLevel);
      if (!rules.length) continue;
      out.push({ key: s.key, name: s.name, level: s.level, auto: !!sc.auto, why: sc.why || "", rules });
    }
    return out;
  },

  /** Les états actifs qui INTERDISENT des actions nommées.
      → [{ key, name, actions, why }] — une entrée par règle. */
  forbids(pnj) {
    const out = [];
    for (const s of this.active(pnj)) {
      for (const f of s.forbids || []) {
        out.push({ key: s.key, name: s.name, actions: f.actions || [], why: f.why || "" });
      }
    }
    return out;
  },

  /** Les états actifs qui ARRÊTENT tout — « aucune action possible », avec ou
      sans liste blanche. Distincts de `forbids` : ils ne visent aucune action
      en particulier, donc ils se DISENT au lieu de refuser (cf. `Actions`).
      → [{ key, name, why, except }] */
  halts(pnj) {
    return this.active(pnj)
      .filter((s) => s.halts)
      .map((s) => ({ key: s.key, name: s.name, why: s.halts.why || "", except: s.halts.except || "" }));
  },

  /** Malus de BUDGET cumulé : « le tour contient une action de moins », par
      opposition à la surtaxe (« cette action coûte plus »). Deux mécaniques
      distinctes, que le livre distingue lui aussi — d'où deux champs.
      → [{ key, n }], agrégé par groupe. */
  budgetMalus(pnj) {
    const agg = new Map();
    for (const s of this.active(pnj)) {
      for (const b of s.budgetMalus || []) {
        agg.set(b.key, (agg.get(b.key) || 0) + (b.n || 0));
      }
    }
    return [...agg].map(([key, n]) => ({ key, n }));
  },

  /** Contribution d'AVANTAGE de l'acteur — Anarchy uniquement (lot E2).
      Anarchy 2 p.65 : un avantage fait des 4-5-6 des succès, un désavantage
      ne garde que les 6. Et surtout : « Les avantages et désavantages se
      cumulent, sans que le total puisse dépasser un avantage ou un
      désavantage » — d'où le bornage à ±1, qui est la règle et pas une
      précaution défensive. Trois désavantages valent un désavantage.

      Agrège les deux sources : `pnj.drugAdv` (posé par le contrecoup d'une
      drogue, antérieur à ce lot) et les états qui déclarent un `adv`. C'est le
      sens de « `drugAdv` devient une contribution neutre » : le champ reste,
      il cesse d'être la SEULE voie. Les jets lisent cette fonction, plus le
      champ brut. */
  adv(pnj) {
    if (!pnj) return 0;
    let n = pnj.drugAdv || 0;
    for (const s of this.active(pnj)) if (s.adv) n += s.adv;
    return Math.max(-1, Math.min(1, n));
  },

  /** Pose (ou retire) le MÊME état sur plusieurs PNJ d'un coup — lot E6.

      La signature que la décision CODIR n°17 réclamait dès le premier jour :
      « une fumigène tombe, TROIS gardes deviennent Aveuglés » était le besoin
      nommé au panel MJ, et il valait qu'on ne ferme pas la porte. Le moteur
      était déjà prêt — rien dans `set` ne suppose un PNJ unique — il ne
      manquait que ce point d'entrée.

      Chaque PNJ passe par `set`, donc par les mêmes gardes : plafond du
      contrat, exclusions du livre, transition ordonnée. Un PNJ dont l'édition
      ignore la clé est simplement sauté (une scène peut mêler des éditions).
      Renvoie le nombre de PNJ réellement touchés. */
  setMany(pnjs, key, level) {
    let n = 0;
    for (const pnj of pnjs || []) {
      if (!this.find(pnj, key)) continue; // édition sans cet état → ignoré
      if (this.set(pnj, key, level) === level) n++;
    }
    return n;
  },

  /** Retire tout — sortie de masse du ⛨ « Réinitialiser les moniteurs ».
      Passe par `set` état par état pour que les `revert` du lot E3 soient
      appelés, jamais un `delete pnj.statuses` brutal qui laisserait les
      deltas appliqués. */
  clearAll(pnj) {
    if (!pnj || !pnj.statuses) return 0;
    const keys = Object.keys(pnj.statuses);
    for (const k of keys) this.set(pnj, k, 0);
    delete pnj.statuses;
    delete pnj.statusAge; // l'âge (E3b) ne survit jamais à son état
    return keys.length;
  },

  /** Unité de durée de l'édition du PNJ : "round" en SR5/SR6, "narration" en
      Anarchy le jour où elle aura des états. Lue sur le contrat, jamais
      supposée — c'est elle qui dit ce que « fin de tour » veut dire ici. */
  unit(pnj) {
    const m = this.model(pnj);
    return (m && m.unit) || "round";
  },

  /** Échelle des portées de durée, de la plus courte à la plus longue. Elle
      existe parce que les durées du livre ne sont PAS toutes exprimées dans
      l'unité de l'édition : SR5 fait durer Surpris « jusqu'au début de la
      prochaine PASSE d'initiative » (p.193-194) alors que l'unité de tour de
      SR5 est le round. Comparer `until` à l'unité de l'édition ne verrait donc
      jamais expirer Surpris — il faut une échelle, pas une égalité.
      "narration" partage le rang du round : c'est le tour de jeu d'Anarchy. */
  _PORTEES: { pass: 1, round: 2, narration: 2, scene: 3 },

  /** États dont la durée est ÉCHUE au passage de la frontière donnée
      ("pass" ou "round") — la liste que le balayage PROPOSE de retirer. Il ne
      retire rien lui-même : registre du drapeau « devrait fuir », l'app
      informe et le MJ tranche. Franchir un round fait aussi expirer ce qui
      durait une passe (un nouveau round ouvre une nouvelle passe), d'où la
      comparaison « portée ≤ frontière » et non l'égalité.
      `until: null` (le défaut) = persistant, jamais proposé. */
  expiring(pnj, boundary = "round") {
    const seuil = this._PORTEES[boundary] || 2;
    return this.active(pnj).filter(
      (s) => s.until && (this._PORTEES[s.until] || 2) <= seuil,
    );
  },
};
