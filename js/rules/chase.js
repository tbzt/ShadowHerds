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

  /* ========================================================
     LE FRANCHISSEMENT (Anarchy) — un écart se traverse en TEMPS

     Anarchy ne compte pas en mètres mais en portées, et changer de portée
     « coûte 1 à 3 Narrations ». Le mot piège : une Narration n'est pas une
     ressource, c'est le TOUR DE JEU d'Anarchy — `Statuses._PORTEES` la range
     au même rang que le round. Il n'y a donc rien à retrancher d'un budget ;
     il y a une durée à tenir, et c'est la ronde de la scène qui la décompte
     (celle-là même que la piste partage avec le combat).

     Les éditions qui ne chiffrent pas l'écart renvoient `null` partout : SR5
     et SR6 déplacent d'une bande par test réussi, sans durée intermédiaire.
     ======================================================== */

  /** Narrations pour franchir l'écart entre deux bandes ADJACENTES, ou `null`
      quand l'édition ne le chiffre pas. Porté par l'écart, donc identique
      dans les deux sens. */
  crossCost(edition, terrain, fromKey, toKey) {
    const lanes = this.lanes(edition, terrain);
    const keys = lanes.map((l) => l.key);
    const i = keys.indexOf(fromKey);
    const j = keys.indexOf(toKey);
    if (i < 0 || j < 0 || Math.abs(i - j) !== 1) return null;
    // L'écart appartient à la bande la plus PROCHE de l'ancre des deux.
    const spec = this.use(edition);
    const brut = ((spec && spec.lanes) || [])[Math.min(i, j)];
    const n = brut && brut.cross;
    return Number.isFinite(n) ? n : null;
  },

  /** Le franchissement en cours d'un participant, ou `null`.
      `{ to, left }` — la bande visée et les Narrations restantes. */
  crossing(state, key) {
    return (state && state.crossing && state.crossing[key]) || null;
  },

  /** Engage un franchissement. Renvoie `true` s'il PREND DU TEMPS (le
      participant reste où il est et le compteur tourne), `false` si l'écart
      n'est pas chiffré — l'appelant déplace alors immédiatement, comme
      toujours en SR5/SR6. */
  startCross(edition, state, key, toKey) {
    if (!state) return false;
    const n = this.crossCost(edition, state.terrain, this.laneOf(state, key), toKey);
    if (!Number.isFinite(n) || n <= 1) return false; // 1 Narration = le tour courant : on arrive
    state.crossing = state.crossing || {};
    state.crossing[key] = { to: toKey, left: n };
    return true;
  },

  /** Abandonne ou résout d'un coup (le livre laisse un point d'Anarchy
      accélérer le franchissement — c'est le MJ qui en décide). */
  endCross(state, key) {
    if (state && state.crossing) delete state.crossing[key];
  },

  /** Décompte d'une Narration tous les franchissements en cours et POSE ceux
      qui arrivent. Appelé par la fin de ronde, seule horloge de la scène.

      → `{ arrivés, ticked }`. `ticked` liste les clés décomptées et, pour
      celles qui sont arrivées, la bande QUITTÉE : c'est le strict nécessaire
      pour que `undoRound` remette la piste où elle était. Un ↩ qui ne
      défaisait pas les arrivées laissait des jetons une bande trop loin —
      silencieusement, ce qui est la pire des façons. */
  tickCrossings(state) {
    const arrivés = [];
    const ticked = [];
    for (const key of Object.keys((state && state.crossing) || {})) {
      const c = state.crossing[key];
      c.left -= 1;
      if (c.left <= 0) {
        const from = this.laneOf(state, key);
        this.place(state, key, c.to);
        delete state.crossing[key];
        arrivés.push({ key, lane: c.to });
        ticked.push({ key, to: c.to, from, landed: true });
      } else {
        ticked.push({ key, to: c.to, landed: false });
      }
    }
    return { arrivés, ticked };
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
      /** Franchissements en cours (Anarchy) : `clé → { to, left }`. Champ
          ADDITIF de plus — une poursuite d'avant le lot n'en a pas et se
          comporte à l'identique, d'où un `V` qui ne bouge pas. */
      crossing: {},
      /** Crans DÉJÀ posés depuis le test de ce round, par clé de piste (lot A).
          Signé, remis à zéro par `setTest` et par la fin de ronde. Il sert à
          une seule question : le déplacement que la réussite a fait gagner
          a-t-il déjà été pris ? Sans lui, le MJ qui avance un jeton à la main
          le verrait avancer une seconde fois tout seul à la fin du round.
          Champ ADDITIF — une poursuite d'avant le lot n'en a pas et se
          comporte à l'identique, d'où un `V` qui ne bouge pas. */
      adjusted: {},
      /** Déplacements OCTROYÉS par une action jouée (lot B), par clé de piste :
          `{ max, dir, why }`. `max` nul = l'app ne plafonne pas (elle ne tient
          pas l'Accélération de cet engin) ; `dir` nul = les deux sens.
          Vidés à la fin de la ronde, comme le reste. Champ ADDITIF. */
      granted: {},
      /** Poursuivants sommés de refaire le test (SR5, Cascade réussie) :
          `clé → true`, ou `"lost"` quand l'échec leur ferait perdre la cible
          (déjà à la dernière bande). Champ ADDITIF. */
      mustRetest: {},
      edgeUp: {},
      pool: {},
      poolMax: {},
      out: {},
      attrOverride: {},
      /** Réserve du test ANNONCÉE par le meneur, par clé de piste (lot E).
          Le pendant exact d'`attrOverride`, et pour la même raison : quand
          l'app ne tient pas la valeur du livre, elle écrit « — » et propose la
          saisie plutôt que de fabriquer un chiffre. Ici, c'est le cas d'un PNJ
          sans la compétence dans une édition qui ne règle pas la défausse
          (SR6, les deux Anarchy — SR5, lui, se défausse, p. 132). Retenue pour
          toute la poursuite : on l'annonce une fois, on relance d'un tap.
          Champ ADDITIF — d'où un `V` qui ne bouge pas. */
      poolOverride: {},
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

  /* `move()` vivait ici : un déplacement qui ignorait les franchissements, que
     le contrôleur devait donc doubler d'un chemin parallèle. Le lot A a
     fusionné les deux en `Chase.step` (plus bas), seul mouvoir de la piste. */

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
     LE DÉPLACEMENT DU ROUND (lot A) — la clé que personne ne lisait

     `chaseModel.round.move` était déclarée par les QUATRE modules et lue par
     zéro consommateur. La piste enregistrait donc un ✓, calculait une
     tendance… à partir de positions que seul le ▲▼ manuel avait bougées.
     Motif exact que le CONTRIBUTING nomme : le contrat portait la règle,
     personne ne la lisait. Même réparation que le lot 4 sur `test.cost`.

     ── Ce que les livres disent, et pourquoi les quatre diffèrent ──
     · SR6 (À Tombeau Ouvert p. 176) : « Quiconque réussit son test […] PEUT
       CHOISIR d'ajuster sa position d'une catégorie de distance, que ce soit
       en s'éloignant ou en se rapprochant. » C'est un CHOIX, et la direction
       est LIBRE — le fuyard qui réussit peut décider de revenir. « La cible
       ne peut normalement pas adapter sa position » → `targetMoves: false`.
     · Anarchy 2.0 (p. 230) : test OPPOSÉ, « le vainqueur parvenant à
       progresser vers son objectif (s'enfuir, rattraper l'autre) » — ici la
       direction est celle du RÔLE, pas un choix. Et p. 66 : « se déplacer
       n'est pas une action » ⇒ rien à débiter, on compte des Narrations.
     · SR5 (p. 204) et Anarchy 1re (p. 166) : aucun test de ronde, donc
       aucune réussite à convertir — `onSuccess: null`, un VIDE ASSUMÉ de
       plus. Leur déplacement vient des ACTIONS (Cascade, Rattraper) et des
       Déplacements ; il n'a rien à faire dans une fin de ronde.

     ── Qui déplace qui (arbitrage de conception, 2026-09-04) ──
     Un PNJ prend son déplacement TOUT SEUL, et toujours vers l'avant : vers
     l'ancre s'il poursuit, à l'opposé s'il fuit. Un PJ, jamais : l'app pose
     l'offre et le joueur tranche. C'est la doctrine B3.5 d'un cran plus
     loin — l'app ne lance pas les dés d'un joueur, elle ne choisit pas non
     plus à sa place. Le MJ n'a donc à s'occuper que des jetons dont
     quelqu'un, à la table, a une opinion.
     ======================================================== */

  /** La règle de déplacement déclarée par l'édition, ou `null`. */
  moveRule(edition) {
    const m = this.use(edition);
    return (m && m.round && m.round.move) || null;
  },

  /** Crans déjà posés depuis le test de ce round (signé). */
  adjusted(state, key) {
    return (state && state.adjusted && state.adjusted[key]) || 0;
  },

  /** Le déplacement ACQUIS et pas encore pris par ce participant, ou `null`.
      → `{ max, free }` — combien de crans restent, et si la direction est un
      choix (SR6) ou celle du rôle (Anarchy 2.0).

      `role` est PASSÉ par le contrôleur : ce module ne connaît pas le
      tracker, et il ne va pas commencer ici. */
  earnedMove(edition, state, key, role) {
    if (!state || state.out[key]) return null;
    const pris = Math.abs(this.adjusted(state, key));
    // ── (1) Ce qu'une ACTION a octroyé (lot B) ───────────────────────
    // SR5 n'a pas de test de ronde : chez lui TOUT le déplacement vient d'ici
    // (Rattraper, ou l'éloignement forcé d'une Cascade ratée). Il passe donc
    // par le même canal que le gain de ronde — un seul mécanisme, deux
    // sources, et le jeton ne connaît qu'une seule façon de dire « tu peux
    // bouger ».
    const g = (state.granted && state.granted[key]) || null;
    if (g) {
      if (g.max == null) return { max: null, free: g.dir == null, dir: g.dir || 0, why: g.why || "" };
      const reste = g.max - pris;
      if (reste > 0) return { max: reste, free: g.dir == null, dir: g.dir || 0, why: g.why || "" };
      return null;
    }
    // ── (2) Ce que le TEST de la ronde a donné ───────────────────────
    const r = this.moveRule(edition);
    if (!r || !Number.isFinite(r.onSuccess)) return null;
    if (state.tested[key] !== "ok") return null;
    // « La cible ne peut normalement pas adapter sa position » (SR6).
    if (role === "cible" && !r.targetMoves) return null;
    const reste = r.onSuccess - pris;
    return reste > 0 ? { max: reste, free: !!r.freeDirection, dir: 0, why: "" } : null;
  },

  /* ---- Les effets de piste d'une ACTION (lot B) ----
     SR5 est le seul livre à ranger la course-poursuite dans des ACTIONS
     plutôt que dans un test de ronde ; ses quatre manœuvres étaient jouables
     depuis le lot C mais ne touchaient pas la piste. Deux d'entre elles la
     touchent pourtant, et le livre les chiffre. */

  /** L'effet de piste déclaré pour cette action, ou `null` (Percuter et
      Couper la route n'en ont pas : elles font des dégâts, pas des mètres). */
  actionEffect(edition, key) {
    return (this.roundActions(edition).find((a) => a.key === key) || {}).effect || null;
  },

  /** Octroie un déplacement. `max` nul = non plafonné par l'app (elle ne tient
      pas la valeur du livre pour cet engin) ; `dir` nul = les deux sens. */
  grant(state, key, { max = null, dir = null, why = "" } = {}) {
    if (!state || !key) return;
    state.granted = state.granted || {};
    state.granted[key] = { max, dir, why };
    // L'octroi rouvre le compteur : c'est un déplacement NEUF, pas la suite de
    // celui que le round avait donné.
    if (state.adjusted) delete state.adjusted[key];
  },

  /** Applique l'effet d'une action jouée. `ctx` porte ce que seul le
      contrôleur sait lire sur les fiches — aujourd'hui l'Accélération de
      l'engin. Renvoie ce qui a été posé, pour que l'appelant puisse le DIRE.

      Rien n'est appliqué de force : on ouvre des déplacements et on marque des
      tests à refaire. Les dégâts, les accidents et les issues restent à la
      table — l'app ne remplit aucun moniteur (règle R4). */
  applyActionEffect(edition, state, key, actionKey, ctx = {}) {
    const eff = this.actionEffect(edition, actionKey);
    if (!eff || !state) return null;
    if (eff.kind === "grant") {
      const cap = eff.cap === "accel" ? ctx.accel : null;
      const max = Number.isFinite(cap) ? cap : null;
      this.grant(state, key, { max, dir: eff.free ? null : 1, why: eff.why || "" });
      return { kind: "grant", max };
    }
    if (eff.kind === "cascade") {
      // « Tous les véhicules poursuivants doivent immédiatement faire un test
      // identique, avec le même seuil. » On les MARQUE ; c'est le ✗ posé
      // ensuite qui déclenchera l'éloignement (cf. `setTest`).
      const keys = this.laneKeys(edition, state.terrain);
      const derniere = keys[keys.length - 1];
      state.mustRetest = {};
      let n = 0;
      for (const k of Object.keys(state.lanes || {})) {
        if (k === key || state.out[k]) continue;
        // « Si le poursuivant était déjà à portée extrême, le véhicule
        // poursuivi parvient à s'échapper » — ce n'est plus un déplacement,
        // c'est une ISSUE, et une issue se déclare.
        state.mustRetest[k] = this.laneOf(state, k) === derniere ? "lost" : true;
        n++;
      }
      return { kind: "cascade", n };
    }
    return null;
  },

  /** La réserve du test annoncée par le meneur pour cette clé, ou `null`. */
  poolOverride(state, key) {
    const n = state && state.poolOverride && state.poolOverride[key];
    return Number.isFinite(n) && n > 0 ? n : null;
  },
  setPoolOverride(state, key, value) {
    if (!state || !key) return;
    state.poolOverride = state.poolOverride || {};
    const n = parseInt(value, 10);
    if (Number.isFinite(n) && n > 0) state.poolOverride[key] = n;
    else delete state.poolOverride[key];
  },

  /** Ce poursuivant doit-il refaire le test (Cascade) ? → true | "lost" | null */
  mustRetest(state, key) {
    return (state && state.mustRetest && state.mustRetest[key]) || null;
  },

  /** « Vers l'avant » pour ce rôle : l'axe de la piste met l'ancre à
      l'index 0, donc se rapprocher est négatif. */
  forward(role) {
    return role === "cible" ? 1 : -1;
  },

  /** Un pas, DANS LE RÉGIME de l'édition : d'un coup là où le livre déplace
      (SR5, SR6), en engageant un franchissement là où il compte des
      Narrations (les deux Anarchy). `delta` négatif = vers l'ancre, donc vers
      « rattrapé ». Renvoie ce qui s'est passé, ou `null` si rien n'a bougé.

      Sature aux deux bouts : franchir un bout n'est pas un déplacement mais
      une ISSUE, et une issue se déclare (`drop`), elle ne se glisse pas par
      accident.

      Un seul mouvoir pour le geste du MJ et pour l'automatisme : deux
      implémentations divergeraient au premier cas tordu, et le cas tordu
      ici — repartir dans l'autre sens en plein franchissement — existe déjà. */
  step(edition, state, key, delta, { credit = key } = {}) {
    if (!state || !delta) return null;
    const keys = this.laneKeys(edition, state.terrain);
    const from = this.laneOf(state, key);
    const i = from ? keys.indexOf(from) : 0;
    const to = keys[Utils.clamp((i < 0 ? 0 : i) + delta, 0, keys.length - 1)];
    if (!to || to === from) return null;
    // On ne traverse pas un écart et son contraire à la fois : faire demi-tour
    // abandonne le franchissement engagé.
    const enCours = this.crossing(state, key);
    if (enCours && enCours.to !== to) this.endCross(state, key);
    // `credit` : à QUI ce pas est décompté. Presque toujours celui qui bouge —
    // sauf quand c'est l'ancre qui avance et que les autres reculent pour elle
    // (`stepAnchor`) : leur propre déplacement acquis ne doit pas être mangé
    // par le sien. `null` ⇒ on ne décompte à personne.
    if (credit) {
      state.adjusted = state.adjusted || {};
      state.adjusted[credit] = this.adjusted(state, credit) + Math.sign(delta);
    }
    if (this.startCross(edition, state, key, to))
      return { key, from, to, crossing: this.crossing(state, key).left };
    this.place(state, key, to);
    return { key, from, to, crossing: 0 };
  },

  /** L'ANCRE gagne du terrain. Elle n'a pas de bande — « toutes les autres
      positions sont définies selon la sienne » —, donc son déplacement
      s'écrit sur les AUTRES, en sens inverse. Ce n'est pas une astuce
      d'implémentation : c'est la même phrase du livre lue depuis l'autre
      bout, et c'est la seule façon d'honorer `targetMoves: true` (SR5,
      Anarchy) sur une piste qui mesure tout à partir d'un point fixe.

      → la liste des pas effectués, du même galbe que `step`, pour que la fin
      de round les résume et que le ↩ les défasse sans rien savoir de plus. */
  stepAnchor(edition, state, delta) {
    if (!state || !delta || !state.targetId) return [];
    const faits = [];
    for (const key of Object.keys(state.lanes || {})) {
      if (state.out[key]) continue;
      // ⚠ MÊME signe, pas l'opposé. La bande d'un poursuivant MESURE sa
      // distance à l'ancre : si l'ancre prend du terrain (delta positif, vers
      // « semé »), cette distance CROÎT, donc l'indice du poursuivant croît
      // aussi. Négocier ce signe à l'envers — ce que faisait la première
      // version — faisait fuir la cible en rapprochant ses poursuivants.
      //
      // `credit: null` — reculer parce que la cible accélère ne consomme pas
      // le déplacement qu'un poursuivant a gagné de son côté. Les deux se
      // cumulent, et le livre les donne bien séparément : chaque participant
      // qui réussit ajuste sa position d'une catégorie.
      const f = this.step(edition, state, key, delta, { credit: null });
      if (f) faits.push(f);
    }
    if (faits.length) {
      state.adjusted = state.adjusted || {};
      state.adjusted[state.targetId] =
        this.adjusted(state, state.targetId) + Math.sign(delta);
    }
    return faits;
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
    // Poser le résultat, c'est ouvrir le déplacement du round : le compteur de
    // crans repart de zéro. Sans ça, un jeton avancé à la main AVANT le jet
    // (pour une raison qui n'a rien à voir) mangeait en silence le
    // déplacement que la réussite venait de donner.
    if (state.adjusted) delete state.adjusted[pnjId];
    // ── Cascade (SR5, lot B) : le test imposé se résout ICI ───────────
    // « Si le véhicule poursuivant échoue, il n'a pas pris de risques et
    // s'éloigne d'une catégorie de portée d'engagement » — un sens FORCÉ,
    // contrairement au gain de ronde de SR6. Se reprendre (corriger le ✗)
    // reprend aussi l'éloignement : rien ne reste posé sur une erreur.
    const retest = this.mustRetest(state, pnjId);
    if (retest) {
      const dejaPose = state.granted && state.granted[pnjId];
      if (res === "ko" && retest !== "lost")
        this.grant(state, pnjId, {
          max: 1, dir: 1,
          why: "Cascade ratée — s'éloigne d'une catégorie de portée",
        });
      else if (dejaPose && dejaPose.why && /^Cascade/.test(dejaPose.why))
        delete state.granted[pnjId];
    }
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
  /** L'action NOMMÉE que le test de la ronde dépense, pour ce terrain — ou
      `null`. Seul SR6 à pied en déclare une (« Sprinter »). Ailleurs le livre
      demande une action sans la nommer, ou n'impose pas de test. */
  testActionKey(edition, terrain) {
    const m = this.use(edition);
    const t = m && m.round && m.round.test;
    const map = t && t.actionKey;
    return (map && map[terrain]) || null;
  },

  /** Les manœuvres de course-poursuite déclarées par le livre, avec leur
      PORTÉE — la condition que le rendu jetait. Seul SR5 en donne : son
      `round.test` est nul parce que « ce sont des ACTIONS, choisies ». */
  roundActions(edition, terrain) {
    const m = this.use(edition);
    const list = (m && m.round && m.round.actions) || [];
    // ── LOT G : une manœuvre appartient à un TERRAIN ──────────────────
    // Les quatre actions de SR5 sont écrites pour des véhicules — « un PILOTE
    // peut effectuer n'importe laquelle de ces actions » (p. 204). Sans ce
    // filtre, un coureur se voyait proposer Percuter et Cascade, et le
    // « Sprinter » que le catalogue porte pourtant n'apparaissait nulle part.
    // Une entrée sans `terrain` reste universelle : on ne force pas les
    // éditions à déclarer ce qu'elles ne distinguent pas.
    if (!terrain) return list;
    return list.filter((a) => !a.terrain || a.terrain === terrain);
  },

  /** Cette manœuvre est-elle possible depuis cette bande ? `"toutes"` passe
      partout ; sinon la bande doit être exactement celle que le livre nomme
      (Percuter et Couper la route : portée courte). */
  rangeAllows(range, laneKey) {
    return !range || range === "toutes" || range === laneKey;
  },

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
     C'est ICI que le livre fait bouger les positions : « généralement, les
     déplacements ont lieu à la fin du round de combat, lorsque tous les
     participants ont réalisé leurs actions » (SR6, À Tombeau Ouvert p. 176).

     Ce qui bouge tout seul : les PNJ qui ont réussi, vers l'avant. Ce qui ne
     bouge pas : les PJ — leur déplacement acquis reste OFFERT, et c'est le
     joueur qui tranche (cf. `earnedMove`). Ce que la fin de round produit en
     plus, c'est un RÉSUMÉ — qui a gagné ou perdu une bande, qui n'a pas
     testé — parce qu'un round qui passe sans rien dire est un round qu'on
     oublie.

     `actors` : `clé de piste → { isPJ, role }`, fourni par le contrôleur.
     Sans lui (appel d'avant le lot A), personne n'est PJ et personne n'a de
     rôle — le déplacement automatique ne se déclenche simplement pas. */
  endRound(edition, state, actors = {}) {
    if (!state) return null;
    // ── Le déplacement acquis, pris par ceux qui n'ont personne pour le
    // décider à leur place. AVANT le décompte des franchissements : un pas
    // engagé ce round-ci doit commencer à courir maintenant, pas au suivant.
    const auto = [];
    // L'ancre d'abord : son gain s'écrit sur tous les autres, et il ne doit pas
    // se mélanger aux leurs (cf. `stepAnchor`).
    /** Le pas qu'un PNJ prend tout seul. « Vers l'avant » veut dire vers son
        objectif — SAUF quand le livre a déjà imposé un sens : une Cascade
        ratée « s'éloigne », et s'éloigner est le contraire de l'objectif d'un
        poursuivant. `dir` l'emporte donc sur le rôle. (Trouvé au test : le
        poursuivant qui ratait sa Cascade se rapprochait.)

        Et un gain NON CHIFFRÉ (Rattraper sans Accélération connue) ne se prend
        pas tout seul : personne ne sait de combien. Il reste offert. */
    const pasAuto = (gain, role) => {
      if (!Number.isFinite(gain.max)) return 0;
      return (gain.dir || this.forward(role)) * gain.max;
    };
    const cible = state.targetId;
    const aCible = (cible && actors[cible]) || null;
    if (cible && aCible && !aCible.isPJ) {
      const gain = this.earnedMove(edition, state, cible, aCible.role);
      const d = gain ? pasAuto(gain, "cible") : 0;
      if (d) auto.push(...this.stepAnchor(edition, state, d));
    }
    for (const key of Object.keys(state.lanes)) {
      const a = actors[key] || {};
      if (a.isPJ) continue;
      const gain = this.earnedMove(edition, state, key, a.role);
      if (!gain) continue;
      const d = pasAuto(gain, a.role);
      const fait = d && this.step(edition, state, key, d);
      if (fait) auto.push(fait);
    }
    // Les franchissements avancent AVANT le relevé des tendances : celui qui
    // arrive ce round-ci doit apparaître dans le récapitulatif comme un
    // déplacement, pas comme un immobile.
    const { arrivés, ticked } = this.tickCrossings(state);
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
    const recap = {
      round: state.round,
      moves,
      untested,
      dropped: Object.keys(state.out),
      arrivés,
      /** Ce que CETTE fin de round a appliqué, et rien d'autre — de quoi la
          défaire sans toucher aux gestes que le MJ a faits pendant le round.
          C'est la différence entre « annuler la fin de round » (le libellé du
          bouton) et « annuler le round », qu'on ne lui a jamais promis. */
      auto,
      ticked,
      /** L'ancre des tendances d'AVANT cette fin de round : sans elle, un ↩
          rendait les positions mais laissait les ▲▼ comparer à un repère
          déjà avancé — des flèches qui mentent sur un écran qu'on lit à un
          mètre. */
      prevBefore: { ...state.prev },
    };
    state.prev = { ...state.lanes };
    state.tested = {};
    state.paid = {};
    state.adjusted = {};
    state.granted = {};
    state.mustRetest = {};
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
    const recap = state.log.shift();
    // ── Défaire, dans l'ordre inverse de l'application ──────────────────
    // Le bouton dit « annuler la fin de round » : il défait ce que la fin de
    // round a fait — les arrivées, les décomptes, les déplacements
    // automatiques — et RIEN de ce que le MJ a posé pendant le round. Depuis
    // que la fin de round déplace pour de bon (lot A), un ↩ qui ne rendait
    // que le compteur laissait les jetons une bande trop loin.
    for (const t of [...((recap && recap.ticked) || [])].reverse()) {
      if (t.landed) {
        this.place(state, t.key, t.from);
        state.crossing = state.crossing || {};
        state.crossing[t.key] = { to: t.to, left: 1 };
      } else if (state.crossing && state.crossing[t.key]) {
        state.crossing[t.key].left += 1;
      }
    }
    for (const a of [...((recap && recap.auto) || [])].reverse()) {
      if (a.crossing) this.endCross(state, a.key);
      this.place(state, a.key, a.from);
    }
    if (recap && recap.prevBefore) state.prev = { ...recap.prevBefore };
    state.round -= 1;
    state.tested = {};
    state.paid = {};
    state.adjusted = {};
    state.granted = {};
    state.mustRetest = {};
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
