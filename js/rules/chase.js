"use strict";

/* ============================================================
   COURSE-POURSUITE — le moteur neutre du 3ᵉ moteur de scène (⇉).

   Miroir de `matrix.js` : ce fichier ne connaît AUCUNE édition. Il
   reçoit le régime par `Chase.use(edition)` → `chaseModel` du module
   d'édition (prohibition n°1 : la règle vit dans l'édition). Il ne
   touche ni au DOM, ni au Storage, ni à `Encounter` : il calcule sur
   un état qu'on lui passe. L'état vit dans la scène
   (`Encounter.state.chase`) et ses mutations passent par le
   contrôleur `js/controllers/chase.js`, sur le patron d'`Intrusion`.

   ── Ce que le modèle décrit, et pourquoi il est si peu symétrique ──
   Un seul livre du corpus règle vraiment la course-poursuite :
   SR6 *À tombeau ouvert* (p. 173-180), qui couvre explicitement les
   poursuites À PIED autant qu'en véhicule. SR5 (core p. 204-205) ne
   règle que les véhicules et n'impose aucun test par round : il offre
   quatre actions complexes. Anarchy 1re n'a rien de dédié (portées de
   combat + manœuvre à difficulté libre) et Anarchy 2.0 tient en deux
   paragraphes (test opposé de Pilotage). Le contrat porte donc des
   VIDES ASSUMÉS — `round.test = null`, `envs: []` — et le rendu doit
   les montrer plutôt que les combler avec la règle du voisin.

   ── La ligne rouge ──
   Quand une valeur n'est ni dans le livre ni dans nos données (l'Agilité
   d'un PJ léger, l'Intervalle de vitesse d'un véhicule venu d'un autre
   ouvrage), `attrValue` renvoie `null` : l'app écrit « — » et propose la
   saisie. Elle ne dérive jamais un chiffre que le livre n'a pas donné.
   ============================================================ */
import { Utils } from "../core/utils.js";

export const Chase = {
  /** Version de la FORME de l'état de poursuite (`state.chase`), distincte
      du `_V` de la scène : `chase` est ADDITIF (absent = pas de poursuite),
      donc son arrivée n'a demandé aucune migration. */
  V: 1,

  /* ---- Le régime de l'édition ---- */
  use(edition) {
    const mod = typeof App !== "undefined" ? App.getEditionModule(edition) : null;
    return (mod && mod.chaseModel) || null;
  },
  supports(edition) {
    return !!this.use(edition);
  },

  /** Terrain par défaut : celui que le livre de l'édition règle le mieux.
      SR6 règle les deux, les autres partent du véhicule (le seul qu'ils
      décrivent). Déclaré par l'édition, jamais deviné ici. */
  terrains(edition) {
    const m = this.use(edition);
    return (m && m.terrains) || {};
  },
  terrain(edition, key) {
    return this.terrains(edition)[key] || null;
  },

  /** Bandes de distance, du plus PRÈS de la cible au plus loin.
      L'ordre du tableau EST l'axe : l'index 0 est collé à l'ancre. */
  lanes(edition, terrain) {
    const m = this.use(edition);
    if (!m) return [];
    return (m.lanes || []).map((l) => ({
      key: l.key,
      label: l.label,
      hint: (l.hint && (l.hint[terrain] || l.hint.all)) || "",
    }));
  },
  laneKeys(edition, terrain) {
    return this.lanes(edition, terrain).map((l) => l.key);
  },

  envs(edition) {
    const m = this.use(edition);
    return (m && m.envs) || [];
  },
  env(edition, key) {
    return this.envs(edition).find((e) => e.key === key) || null;
  },

  /* ========================================================
     L'ATTRIBUT DÉCISIF — le cœur de la piste

     Le livre SR6 fait dépendre le gain d'Atout du round d'un attribut
     CHOISI PAR L'ENVIRONNEMENT (Intervalle de vitesse en dégagé et
     étroit, Accélération en encombré ; Force ou Agilité à pied). SR5
     s'en sert autrement — c'est une LIMITE, pas un gain — et Anarchy 2
     en fait un avantage. D'où `meaning`, que le rendu affiche à côté du
     chiffre : le même nombre ne dit pas la même chose d'un livre à
     l'autre, et un chiffre nu serait un piège.
     ======================================================== */

  /** → { short, label, meaning, optional? } ou null si l'édition n'a pas
      d'attribut décisif (Anarchy 1re sans la règle optionnelle). */
  attrSpec(edition, envKey, terrain) {
    const m = this.use(edition);
    if (!m || !m.attr) return null;
    return m.attr(envKey, terrain) || null;
  },

  /** Valeur de l'attribut décisif pour ce participant, ou `null` quand
      l'app ne la tient pas du livre (à saisir). Une saisie du MJ
      (`state.attrOverride`) l'emporte toujours : c'est lui qui a la fiche
      sous les yeux.

      `ride` (lot P6) est l'ENGIN dans lequel ce participant se trouve : il
      donne l'attribut à sa place, et le `terrain` de sa LIGNE — celui d'un
      coureur reste « pied » sur une piste où les autres sont motorisés.
      Sans monture, on retombe sur le régime global de la piste et sur le
      repli de l'édition (le véhicule déployé depuis l'équipement). */
  attrValue(edition, pnj, state, { ride, terrain } = {}) {
    if (!pnj) return null;
    const cle = ride ? ride.id : this.trackKey(state, pnj.id);
    const over = state && state.attrOverride && state.attrOverride[cle];
    if (Number.isFinite(over)) return over;
    const m = this.use(edition);
    if (!m || !m.attrValue) return null;
    const v = m.attrValue(pnj, {
      terrain: terrain || (state && state.terrain),
      env: state && state.env,
      ride: ride || null,
    });
    return Number.isFinite(v) ? v : null;
  },

  /** Qui domine ce round. `entries` = [{ pnjId, value, attr? }] fourni par
      l'appelant (le moteur ne va pas chercher les fiches : couche).
      Renvoie l'id du plus haut, ou `null` en cas d'égalité ou de valeurs
      manquantes — le livre dit « un seul point », et une égalité est
      arbitrée par le MJ, pas par nous.

      ── Et `null` aussi quand la piste est MIXTE (lot P6) ──
      Depuis qu'on peut faire monter un participant dans un véhicule en cours
      de route, la même piste porte des coureurs (Force, Agilité) et des
      engins (Intervalle de vitesse, Accélération). Aucun livre du corpus ne
      compare ces deux grandeurs : `20` d'Intervalle de vitesse n'est pas
      « plus » que `5` de Force, c'est autre chose. Quand `attr` révèle deux
      familles, on se tait — même arbitrage que l'égalité. */
  dominantId(entries) {
    const known = (entries || []).filter((e) => Number.isFinite(e.value));
    if (known.length < 2) return null;
    if (new Set(known.map((e) => e.attr).filter(Boolean)).size > 1) return null;
    const max = Math.max(...known.map((e) => e.value));
    const top = known.filter((e) => e.value === max);
    return top.length === 1 ? top[0].pnjId : null;
  },

  /** Le raccourci du livre SR6 : « tout véhicule avec un Intervalle de
      vitesse trois fois plus élevé qu'un autre obtient automatiquement un
      avantage positionnel et choisit sa position ». Renvoie la liste des
      paires écrasantes, pour que l'app le PROPOSE au lieu de faire lancer
      des dés pour rien. Vide si l'édition ne porte pas la règle. */
  outclassed(edition, entries) {
    const m = this.use(edition);
    const factor = m && m.edge && m.edge.outclassFactor;
    if (!factor) return [];
    const known = (entries || []).filter((e) => Number.isFinite(e.value) && e.value > 0);
    const out = [];
    for (const a of known)
      for (const b of known)
        if (a.pnjId !== b.pnjId && a.value >= b.value * factor) out.push({ over: a.pnjId, under: b.pnjId });
    return out;
  },

  /* ========================================================
     L'ÉTAT — additif, absent = pas de poursuite
     ======================================================== */
  newState(edition, opts = {}) {
    const m = this.use(edition);
    const terrains = Object.keys((m && m.terrains) || {});
    const envs = (m && m.envs) || [];
    return {
      v: this.V,
      terrain: opts.terrain || (m && m.defaultTerrain) || terrains[0] || "pied",
      mode: opts.mode || "poursuite",
      // Nombre de tours (course) ou de phases (filature) PRÉVU par le MJ —
      // le livre lui laisse ce choix (« la moyenne s'élève à trois »).
      total: opts.total || null,
      // `null` est une valeur LÉGITIME : Anarchy laisse l'environnement au MJ
      // (aucune liste dans le livre), la barre le dira au lieu d'inventer.
      env: opts.env || (envs[0] && envs[0].key) || null,
      targetId: opts.targetId || null,
      /** La ronde de DÉPART. Une poursuite qui s'ouvre au milieu d'un combat
          commence à la ronde de ce combat, pas à 1 : il n'y a qu'une ronde
          dans la scène, et un compteur qui repart de zéro annoncerait une
          seconde horloge là où le livre n'en connaît qu'une. */
      round: opts.round || 1,
      /** Les équipages (lot P6) : `vehicleId → { driverId, crew: [pnjId…] }`.
          La clé est l'id d'une entité `type:"vehicle"` RÉELLE (fiche +
          moniteur), résoluble par `PnjLookup` comme n'importe quel
          participant. Champ ADDITIF de plus : une poursuite d'avant le lot
          n'en a pas, ses clés de piste sont des `pnjId`, et tout se comporte
          à l'identique — d'où un `V` qui ne bouge pas. */
      rides: {},
      lanes: {},
      prev: {},
      tested: {},
      /** Le test du round déjà PAYÉ, par clé de piste — pour ne débiter
          l'action qu'une fois quand le MJ corrige un ✓ en ✗. Remis à zéro à
          chaque fin de round, comme `tested`. Champ ADDITIF : une poursuite
          d'avant le lot n'en a pas, d'où un `V` qui ne bouge pas. */
      paid: {},
      edgeUp: {},
      pool: {},
      poolMax: {},
      out: {},
      attrOverride: {},
      log: [],
    };
  },

  /* ---- Positions ---- */
  laneOf(state, pnjId) {
    return (state && state.lanes && state.lanes[pnjId]) || null;
  },
  indexOf(edition, state, laneKey) {
    return this.laneKeys(edition, state && state.terrain).indexOf(laneKey);
  },

  /** Pose un participant sur une bande. Le poser, c'est le faire entrer en
      poursuite : il quitte du même geste la zone « hors course ». */
  place(state, pnjId, laneKey) {
    if (!state || !pnjId) return;
    state.lanes[pnjId] = laneKey;
    if (state.prev[pnjId] == null) state.prev[pnjId] = laneKey;
    delete state.out[pnjId];
  },

  /** Déplace de `delta` bandes (négatif = vers l'ancre, donc vers
      « rattrapé »). Sature aux deux bouts : franchir un bout n'est pas un
      déplacement mais une ISSUE, et une issue se déclare (`drop`), elle ne
      se glisse pas par accident. → la nouvelle clé de bande, ou null. */
  move(edition, state, pnjId, delta) {
    const keys = this.laneKeys(edition, state && state.terrain);
    if (!keys.length || !state) return null;
    const cur = this.laneOf(state, pnjId);
    const i = cur ? keys.indexOf(cur) : 0;
    const next = keys[Utils.clamp((i < 0 ? 0 : i) + delta, 0, keys.length - 1)];
    state.lanes[pnjId] = next;
    delete state.out[pnjId];
    return next;
  },

  /** Tendance depuis le round précédent : −1 s'est rapproché de la cible,
      +1 s'en est éloigné, 0 n'a pas bougé, null si on ne sait pas encore.
      Le SIGNE suit l'axe de la piste (bas = loin), pas le drame : le rendu
      décide de la couleur, pas nous. */
  trend(edition, state, pnjId) {
    const keys = this.laneKeys(edition, state && state.terrain);
    const now = this.laneOf(state, pnjId);
    const before = state && state.prev && state.prev[pnjId];
    if (!now || !before) return null;
    const d = keys.indexOf(now) - keys.indexOf(before);
    return Number.isFinite(d) ? d : null;
  },

  /* ========================================================
     LES ÉQUIPAGES (lot P6) — pourquoi la piste ne s'indexe plus par PNJ

     Le livre donne UNE position à un véhicule, pas une par occupant : trois
     runners dans le même taxi partagent une bande, un test et un Intervalle
     de vitesse. Jusqu'ici la piste n'indexait que des `pnjId` — trois
     jetons, trois tests, trois fois la même bagnole.

     La généralisation est minuscule parce que `place`, `move`, `laneOf`,
     `trend`, `drop` et `setTest` opèrent déjà sur une CHAÎNE quelconque :
     elles n'ont jamais su que c'était un `pnjId`. On leur passe désormais
     une **clé de piste** — l'id de la monture quand le participant est
     monté, le sien sinon. Toutes les cartes d'état (`lanes`, `prev`,
     `tested`, `edgeUp`, `pool`, `out`, `attrOverride`) suivent cette clé.

     Ce qui reste attaché à la PERSONNE, et pas à l'engin : l'Atout et ses
     14 actions. On ne dépense pas de l'Atout au nom d'un véhicule.
     ======================================================== */

  /** La monture de ce participant, ou `null`. */
  rideIdOf(state, pnjId) {
    const rides = (state && state.rides) || {};
    for (const id of Object.keys(rides))
      if ((rides[id].crew || []).includes(pnjId)) return id;
    return null;
  },
  ride(state, vehicleId) {
    return (state && state.rides && state.rides[vehicleId]) || null;
  },

  /** LA clé de piste de ce participant. Point unique : tout ce qui indexe
      l'état de la piste passe par ici, sinon un seul oubli suffit à faire
      diverger la position d'un passager de celle de sa voiture. */
  trackKey(state, pnjId) {
    return this.rideIdOf(state, pnjId) || pnjId;
  },

  /** Monter. Le premier à bord prend le volant — personne ne monte dans une
      bagnole vide pour s'asseoir derrière. Et si le participant tenait une
      bande à lui, elle DÉMÉNAGE sur la monture quand celle-ci n'en a pas
      encore : on saute dans une voiture là où on est, pas ailleurs. */
  board(state, pnjId, vehicleId) {
    if (!state || !pnjId || !vehicleId || pnjId === vehicleId) return false;
    state.rides = state.rides || {};
    this.unboard(state, pnjId);
    const r = (state.rides[vehicleId] ||= { driverId: null, crew: [] });
    if (!r.crew.includes(pnjId)) r.crew.push(pnjId);
    if (!r.driverId) r.driverId = pnjId;
    const sienne = state.lanes[pnjId];
    if (sienne && !state.lanes[vehicleId]) this.place(state, vehicleId, sienne);
    this._forget(state, pnjId);
    return true;
  },

  /** Retire du seul équipage, sans rien poser : c'est l'appelant qui décide
      où le participant retombe (`Pursuit.disembark` le pose sur la bande de
      la monture — on ne se téléporte pas en descendant).
      → l'id de la monture quittée, ou `null`. Une monture vidée disparaît de
      la piste ; l'ENGIN, lui, reste : sa fiche et son moniteur vivent dans
      le pool, une carcasse ne s'efface pas parce qu'on en est sorti. */
  unboard(state, pnjId) {
    const id = this.rideIdOf(state, pnjId);
    if (!id) return null;
    const r = state.rides[id];
    r.crew = (r.crew || []).filter((x) => x !== pnjId);
    if (r.driverId === pnjId) r.driverId = r.crew[0] || null;
    if (!r.crew.length) delete state.rides[id];
    return id;
  },

  /** Prendre le volant de sa propre monture. Le conducteur est celui dont
      l'app lit la compétence pour le test du round — le changer en cours de
      poursuite est un geste courant (le rigger se réveille, le conducteur
      prend une balle). */
  setDriver(state, pnjId) {
    const id = this.rideIdOf(state, pnjId);
    if (!id) return false;
    state.rides[id].driverId = pnjId;
    return true;
  },

  /** L'état de piste d'un participant qui vient de monter n'a plus de sens :
      sa position est celle de l'engin. On efface donc ce qui est POSITIONNEL
      et le test du round ; on garde ce que le MJ a saisi de sa main
      (`attrOverride`, `poolMax`) — une valeur annoncée à la table ne doit pas
      disparaître parce qu'on est monté dans une voiture. */
  _forget(state, pnjId) {
    for (const map of ["lanes", "prev", "tested", "edgeUp", "out"])
      if (state[map]) delete state[map][pnjId];
  },

  /* ---- Sorties de course ----
     `reason` ∈ "seme" | "accident" | "rattrape". Sortir n'efface RIEN :
     la position est conservée, exactement comme un hors-combat garde son
     initiative — SR5 laisse d'ailleurs le MJ décider si un poursuivant
     retrouve la trace de sa cible. */
  drop(state, pnjId, reason) {
    if (!state || !pnjId) return;
    state.out[pnjId] = reason || "seme";
  },
  restore(state, pnjId) {
    if (state && state.out) delete state.out[pnjId];
  },
  isOut(state, pnjId) {
    return !!(state && state.out && state.out[pnjId]);
  },

  /* ---- Le test du round ----
     `res` ∈ "ok" | "ko" | null. L'app ne lance JAMAIS pour un PJ : elle
     enregistre ce que le joueur annonce (même doctrine que l'initiative,
     lot B3.5). Sur une réussite, le livre SR6 donne l'avantage positionnel
     « sur ceux qui ont échoué » — modélisé en booléen par participant, pas
     en matrice N×N : aucun MJ ne tient six relations à la table, et
     l'infobulle dit contre qui il vaut. */
  setTest(edition, state, pnjId, res) {
    if (!state || !pnjId) return;
    if (res == null) delete state.tested[pnjId];
    else state.tested[pnjId] = res === "ok" ? "ok" : "ko";
    const m = this.use(edition);
    if (m && m.round && m.round.onSuccess === "positional") {
      if (res === "ok") state.edgeUp[pnjId] = true;
      else delete state.edgeUp[pnjId];
    }
  },

  /** Le coût EN ACTIONS du test du round, dans la monnaie que le tracker
      débite déjà (`{key, n}` ou liste de paires, cf. `Encounter._consumeAction`)
      — ou `null` quand le livre n'en met pas.

      Le contrat portait ce coût depuis toujours, mais en TEXTE : « 1 majeure »
      s'affichait au pied de la piste et ne débitait rien. Le compteur
      d'actions du tracker et le moteur de poursuite se lisaient donc à un
      mètre l'un de l'autre sans jamais se parler, et c'est au MJ qu'il
      revenait de se souvenir que le pilote avait déjà brûlé sa majeure.

      Deux éditions seulement le déclarent, et c'est voulu : SR6 (« une action
      majeure Pilotage est requise ») et Anarchy 2.0 (test opposé, 1 action).
      SR5 et Anarchy 1re portent `round.test = null` — un VIDE ASSUMÉ que ce
      module documente déjà — et n'ont donc rien à débiter. */
  testCost(edition) {
    const m = this.use(edition);
    const t = m && m.round && m.round.test;
    return (t && t.costAction) || null;
  },

  /** Ce que l'échec coûte, DANS CETTE ÉDITION ET CET ENVIRONNEMENT — ou
      null quand il ne coûte rien (SR6 : en dégagé et étroit, rater ne fait
      perdre que l'avantage). Le rendu l'ANNONCE, il ne l'applique pas :
      l'app ne remplit aucun moniteur (règle R4). */
  failCost(edition, state) {
    const e = this.env(edition, state && state.env);
    if (!e || !e.onFail) return null;
    const c = e.onFail[state && state.terrain] || e.onFail.all;
    return c || null;
  },

  /* ---- Fin de round ----
     N'applique aucun déplacement : le MJ a déjà posé les jetons pendant le
     round (les livres font bouger les positions à la fin, mais c'est LUI
     qui décide qui bouge, pas nous). Ce que la fin de round produit, c'est
     un RÉSUMÉ — qui a gagné ou perdu une bande, qui n'a pas testé — parce
     qu'un round qui passe sans rien dire est un round qu'on oublie. */
  endRound(edition, state) {
    if (!state) return null;
    const moves = [];
    for (const id of Object.keys(state.lanes)) {
      const d = this.trend(edition, state, id);
      if (d) moves.push({ pnjId: id, delta: d });
    }
    // Le livre SR6 est explicite : ne pas faire le test de la ronde, c'est
    // perdre la course-poursuite. L'app le SIGNALE (le MJ tranche), elle ne
    // sort personne toute seule.
    const untested = Object.keys(state.lanes).filter(
      (id) => !state.out[id] && !state.tested[id]
    );
    const recap = { round: state.round, moves, untested, dropped: Object.keys(state.out) };
    state.prev = { ...state.lanes };
    state.tested = {};
    state.paid = {};
    state.edgeUp = {};
    state.round += 1;
    state.log.unshift(recap);
    if (state.log.length > 20) state.log.length = 20;
    return recap;
  },

  /** Annule la dernière fin de round (le geste de correction, pas cher —
      un MJ tape « suivant » de travers dix fois par séance). */
  undoRound(state) {
    if (!state || !state.log.length || state.round <= 1) return false;
    state.log.shift();
    state.round -= 1;
    state.tested = {};
    state.paid = {};
    state.edgeUp = {};
    return true;
  },

  /* ========================================================
     LE BANDEAU D'ÉTAT — une phrase CALCULÉE, jamais rédigée

     Ce que le MJ doit lire à un mètre : qui est le plus près, qui est le
     plus loin, combien sont sortis. Rien d'autre. Tout est dérivé des
     positions ; aucune narration n'est fabriquée (l'app ne raconte pas).
     ======================================================== */
  summary(edition, state) {
    if (!state) return null;
    const keys = this.laneKeys(edition, state.terrain);
    const inRace = Object.keys(state.lanes).filter((id) => !state.out[id]);
    const idx = inRace
      .map((id) => ({ id, i: keys.indexOf(this.laneOf(state, id)) }))
      .filter((x) => x.i >= 0);
    if (!idx.length) return { empty: true, dropped: Object.keys(state.out).length };
    const nearest = idx.reduce((a, b) => (b.i < a.i ? b : a));
    const farthest = idx.reduce((a, b) => (b.i > a.i ? b : a));
    const lanes = this.lanes(edition, state.terrain);
    const at = (i) => (lanes[i] || {}).label || "";
    return {
      empty: false,
      count: idx.length,
      nearest: { pnjId: nearest.id, lane: at(nearest.i), atAnchor: nearest.i === 0 },
      farthest: { pnjId: farthest.id, lane: at(farthest.i), atEdge: farthest.i === keys.length - 1 },
      untested: inRace.filter((id) => !state.tested[id]).length,
      dropped: Object.keys(state.out).length,
    };
  },

  /** Les deux issues, telles que l'édition les nomme — le libellé ET sa
      condition, parce qu'une piste sans ses deux fins n'a pas d'enjeu
      lisible. `{ caught: {label, cond}, lost: {label, cond} }`. */
  outcomes(edition, state) {
    const m = this.use(edition);
    if (!m || !m.outcomes) return null;
    const t = (state && state.terrain) || m.defaultTerrain;
    const pick = (o) => (o ? { label: o.label, cond: (o.cond && (o.cond[t] || o.cond.all)) || "" } : null);
    const mode = (state && state.mode) || "poursuite";
    const set = (m.outcomes[mode] || m.outcomes.poursuite) || {};
    return { caught: pick(set.caught), lost: pick(set.lost) };
  },

  /* ========================================================
     LES MODES (lot P5) — poursuite · course · filature

     Le mode ne change pas le composant, il change ce que le composant DIT :
     le nom de l'ancre, l'unité du compteur, les deux issues, et — pour la
     filature — le rythme et les tests. Tout est déclaré par l'édition ;
     ce module ne fait que lire.
     ======================================================== */
  modes(edition) {
    const m = this.use(edition);
    return (m && m.modes) || { poursuite: { label: "Poursuite", counter: "Round", combatRound: true } };
  },

  /** La ronde de ce mode EST-ELLE la ronde de combat ?

      Les trois livres qui règlent la poursuite la font payer sur le tour du
      personnage — action majeure en SR6, action complexe en SR5, action en
      Anarchy 2.0. Il n'y a donc qu'une ronde, et deux compteurs qui avancent
      séparément ne peuvent que diverger : c'est ce qui arrivait, en silence,
      parce que `Encounter.nextTurn` bascule tout seul en ronde suivante quand
      l'ordre a fait le tour. La piste restait à la ronde 1 pendant que le
      combat passait à la 2, et avec elle `tested`, `paid`, `edgeUp` et les
      tendances ▲▼ — trois affichages faux.

      L'unique exception du corpus est la FILATURE (SR6), dont les phases font
      une minute. Elle ne déclare pas la clé, elle garde son compteur.

      Le patron n'est pas neuf : `Encounter.nextRound` pilote déjà l'horloge de
      l'intrusion Matrice, et `ServerRenderer._combatDriven` y remplace le
      bouton du moteur par une mention. La poursuite était le seul moteur à ne
      pas l'avoir reçu. */
  followsCombat(edition, state) {
    return !!(this.mode(edition, state && state.mode) || {}).combatRound;
  },
  mode(edition, key) {
    return this.modes(edition)[key] || null;
  },

  /** Qui tient le dé libre, en filature — il suit la DISTANCE et change de
      camp : les traqueurs proches le donnent à la cible, les traqueurs
      lointains le prennent. → "cible" | "traqueurs" | null. */
  freeDie(edition, state) {
    const spec = (this.mode(edition, state && state.mode) || {}).freeDie;
    if (!spec || !state) return null;
    const keys = this.laneKeys(edition, state.terrain);
    const dedans = Object.keys(state.lanes || {}).filter((id) => !state.out[id]);
    if (!dedans.length) return null;
    const plusProche = dedans
      .map((id) => keys.indexOf(this.laneOf(state, id)))
      .filter((i) => i >= 0)
      .sort((a, b) => a - b)[0];
    if (plusProche == null) return null;
    const proche = (spec.near || []).includes(keys[plusProche]);
    return proche ? (spec.toTarget ? "cible" : "traqueurs") : spec.toTarget ? "traqueurs" : "cible";
  },

  /** Réserve de course-poursuite (SR6). Compteur libre à plafond SAISI :
      son indice dépend du câblage de contrôle OU d'une augmentation de
      Réaction (adepte, sort, cyberware) que l'app ne sait pas lire de
      façon fiable — le MJ le pose une fois, l'app compte. */
  addPool(edition, state, pnjId, delta) {
    const m = this.use(edition);
    if (!state || !pnjId || !(m && m.edge && m.edge.chasePool)) return;
    // « La réserve de course-poursuite n'est généralement pas accessible
    // lorsque l'on file une cible. »
    if ((this.mode(edition, state.mode) || {}).noPool) return;
    const max = state.poolMax[pnjId];
    const hi = Number.isFinite(max) ? max : 99;
    state.pool[pnjId] = Utils.clamp((state.pool[pnjId] || 0) + delta, 0, hi);
    if (!state.pool[pnjId]) delete state.pool[pnjId];
  },
};

// Pont couche 2 (migration modules ES) — retiré en fin de migration.
window.Chase = Chase;
