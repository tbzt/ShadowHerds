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
   Il ne POSE jamais un état de lui-même (garde-fou R4 « pas d'automatisation
   complète du combat » + (e) « informer, jamais décider ») : le MJ pose, l'app
   compte. Et au lot E1 il n'applique aucun effet — les états sont AFFICHÉS et
   SOURCÉS, comme `ActorEffects`. Les `apply`/`revert` du catalogue arriveront
   au lot E3, et passeront par `Effects.transition` déjà branché ici.
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

  /** Retire tout — sortie de masse du ⛨ « Réinitialiser les moniteurs ».
      Passe par `set` état par état pour que les `revert` du lot E3 soient
      appelés, jamais un `delete pnj.statuses` brutal qui laisserait les
      deltas appliqués. */
  clearAll(pnj) {
    if (!pnj || !pnj.statuses) return 0;
    const keys = Object.keys(pnj.statuses);
    for (const k of keys) this.set(pnj, k, 0);
    delete pnj.statuses;
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
