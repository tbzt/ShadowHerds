"use strict";

/* ============================================================
   ENCOUNTER — tracker de combat (initiative, tours, rounds)
   Une seule scène active par édition, persistée via Storage.
   Ne stocke que des pnjId ; les PNJ résident dans leurs pools
   d'origine (Gen.pool / Shadows / Servers) et sont résolus via
   PnjLookup à chaque rendu. Le rendu (pur) est délégué à
   EncounterRenderer.
   ============================================================ */
const Encounter = {
  _KEY: "encounter_current",

  /** Version de la FORME de l'état persisté (round/pass/turnIndex/combatants/
      serverId/v) — distincte du `schemaVersion` de Storage, qui versionne la
      chaîne de migrations elle-même. Si la forme évolue encore, incrémenter
      ici et ajouter le backfill correspondant à la migration de Storage (le
      seul endroit qui migre — voir CONTRIBUTING.md § Versionner les
      schémas). Les scènes persistées avant l'ajout de ce champ sont
      tamponnées `v:1` par cette migration au boot : `load()` peut donc
      supposer l'état déjà à niveau, sans rétro-compat locale. */
  _V: 1,

  /** J3 (journal des jets) : incrémenté à chaque scène fraîche (_empty),
      pour distinguer deux combats séparés qui repartiraient chacun au round
      1 — sinon leurs jets fusionneraient dans le même groupe « Tour 1 » du
      journal. Session only (pas persisté) : un F5 en plein combat ouvre un
      nouveau groupe visuel, effet de bord mineur accepté (pas de perte de
      données, juste un en-tête de plus). */
  _sceneSeq: 0,
  _empty() {
    this._sceneSeq++;
    return { v: this._V, round: 1, pass: 1, turnIndex: 0, combatants: [], serverId: null, noise: 0 };
  },

  state: null,

  /* ---- Persistance (édition-scopée, comme Shadows/Servers) ---- */
  load() {
    this.state = Storage.get(this._KEY, null) || this._empty();
    // La sidebar doit refléter la scène dès le chargement de l'édition, pas
    // seulement à l'ouverture du tracker — reset de la fiche active d'une
    // édition à l'autre (les pnjId ne collisionnent jamais entre éditions,
    // c'est une garde défensive plutôt qu'un cas réel).
    EncounterRenderer.resetActiveCard();
    this._render();
  },

  /** Règles de round de l'édition active (relance, passes) lues via
      l'API neutre du module d'édition — jamais de branche `App.edition`
      ici (cf. CONTRIBUTING). Défaut prudent : relance chaque round, sans
      passes, pour une édition qui ne déclarerait pas de combatModel. */
  _model() {
    return (
      (App.editionModule && App.editionModule.combatModel) || {
        rerollEachRound: true,
        passDecrement: 0,
      }
    );
  },
  save() {
    Storage.set(this._KEY, this.state);
  },

  _find(pnjId) {
    return this.state.combatants.find((c) => c.pnjId === pnjId) || null;
  },

  /** E3 : initiative pré-remplie depuis le bloc « mécanique de table » d'un
      PJ léger (`pnj.initBase`, saisi une fois en début de campagne) — le MJ
      écrase à la volée, les joueurs annoncent, l'app propose. `null` pour
      toute entité sans ce champ (PNJ générés, PJ sans bloc renseigné). */
  _initFor(pnjId) {
    const pnj = PnjLookup.find(pnjId);
    return pnj && Number.isFinite(pnj.initBase) ? pnj.initBase : null;
  },

  /* ---- Composition de la scène ---- */
  add(pnjId) {
    if (!pnjId || this._find(pnjId)) return;
    this.state.combatants.push({ pnjId, init: this._initFor(pnjId), hasActed: false, note: "" });
    this._commit();
    toast("Ajouté au suivi de combat.");
  },

  /** Ajout groupé (CH-Q8) : dédup, UN seul commit + UN seul toast. */
  addMany(ids) {
    let n = 0;
    for (const id of ids) {
      if (id && !this._find(id)) {
        this.state.combatants.push({ pnjId: id, init: this._initFor(id), hasActed: false, note: "" });
        n++;
      }
    }
    if (n) this._commit();
    toast(
      n
        ? `${n} combattant${n > 1 ? "s" : ""} ajouté${n > 1 ? "s" : ""} au suivi de combat.`
        : "Déjà dans le suivi de combat.",
    );
    return n;
  },

  /** PJ (E1) : un PJ ajouté depuis le tracker persiste désormais dans
      `Characters` (PJ léger, `Characters.addLight`) au lieu de rester
      jetable — même id que la bibliothèque, résolu par `PnjLookup` comme
      n'importe quelle entité. `kind:"pj"` reste posé pour la rétro-compat
      des scènes déjà persistées avec un `pnjId` synthétique `pj-…` (ces
      combattants-là restent lus tels quels, cf. `_rows()`/`_isPJ()`) et
      pour distinguer visuellement la ligne sans dépendre de `Characters`.
      Saisie du nom via le Dialog interne (jamais de prompt() natif). */
  async addPJ() {
    const name = await Dialog.prompt({
      title: "Ajouter un PJ",
      label: "Nom du PJ",
      placeholder: "Nom du personnage joueur",
      confirmLabel: "Ajouter",
    });
    if (name === null) return;
    const pnj = Characters.addLight(name);
    if (!pnj) return;
    this.state.combatants.push({
      pnjId: pnj.id,
      kind: "pj",
      init: null,
      hasActed: false,
      note: "",
    });
    this._commit();
  },

  /** E2 : « + Équipe » — l'équipe active (Characters.activeTeamMembers,
      tous les PJ par défaut) rejoint la scène en un geste ; les membres déjà
      présents sont ignorés (même règle que _candidates()). Un PJ one-shot
      inconnu de l'équipe passe par « Ajouter un PJ » (E1), juste à côté.
      Après l'ajout, la rafale d'init prend le relais (EncounterRenderer,
      mode ordonné uniquement — narratif Anarchy : pas d'init, no-op). */
  addTeam() {
    const team = Characters.activeTeamMembers();
    if (!team.length) {
      toast("Aucun PJ dans la bibliothèque — créez-en un d'abord.", "warning");
      return;
    }
    const inScene = new Set(this.state.combatants.map((c) => c.pnjId));
    let n = 0;
    for (const pnj of team) {
      if (inScene.has(pnj.id)) continue;
      const init = Number.isFinite(pnj.initBase) ? pnj.initBase : null;
      this.state.combatants.push({ pnjId: pnj.id, kind: "pj", init, hasActed: false, note: "" });
      n++;
    }
    toast(
      n
        ? `${n} PJ ajouté${n > 1 ? "s" : ""} au suivi de combat.`
        : "Équipe déjà en scène.",
    );
    if (!n) return;
    this._commit();
    EncounterRenderer.focusNextPJInit();
  },

  /** Entités ajoutables depuis le tracker : exactement les pools que
      PnjLookup sait résoudre (générés, Ombres portées, personnages
      jouables, spiders Matrice), moins ceux déjà en scène. Esprits
      libres et créatures générés vivent aussi dans Gen.pool, donc
      listés ici. */
  _candidates() {
    const inScene = new Set(this.state.combatants.map((c) => c.pnjId));
    const all = [
      ...Gen.pool,
      ...Shadows.data.all,
      ...Characters.data.all,
      ...Servers.data.all.map((s) => s.spider).filter(Boolean),
    ];
    const seen = new Set();
    return all.filter((p) => {
      if (!p || inScene.has(p.id) || seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });
  },

  remove(pnjId) {
    const idx = this.state.combatants.findIndex((c) => c.pnjId === pnjId);
    if (idx === -1) return;
    this.state.combatants.splice(idx, 1);
    const max = Math.max(0, this.state.combatants.length - 1);
    if (this.state.turnIndex > idx) this.state.turnIndex--;
    this.state.turnIndex = Utils.clamp(this.state.turnIndex, 0, max);
    this._commit();
  },

  async clear() {
    const ok = await Dialog.confirm({
      title: "Vider la scène",
      message: "Retirer tous les combattants de la scène ?",
      confirmLabel: "Vider",
      danger: true,
    });
    if (!ok) return;
    this.state = this._empty();
    this._commit();
  },

  /* ---- Initiative ---- */
  setInit(pnjId, value) {
    const c = this._find(pnjId);
    if (!c) return;
    const n = parseInt(value, 10);
    c.init = Number.isFinite(n) ? n : null;
    this._commit();
  },

  /** Ajustement ±1 de l'initiative (Vague B) : corrige un score lancé sans
      convoquer le clavier (edge, bonus oublié). Ne re-trie pas — la ligne ne
      saute pas (le tri reste explicite : ↓ Trier / Lancer & classer). Départ à
      0 si aucune init posée. Jamais négatif. */
  adjustInit(pnjId, delta) {
    const c = this._find(pnjId);
    if (!c) return;
    const base = Number.isFinite(c.init) ? c.init : 0;
    c.init = Math.max(0, base + delta);
    this._commit();
  },

  /** Lance l'initiative via l'accesseur neutre du module d'édition
      (App.editionModule.initiativeFor) : jamais de lecture directe d'un
      champ pnj.init édition-spécifique ici (cf. CONTRIBUTING). */
  /** Cœur du lancer d'initiative, sans re-rendu : réutilisé en boucle par
      rollAllInit et nextRound (un seul _commit en fin). Retourne true si une
      initiative chiffrée a bien été posée. */
  _rollInit(pnjId, silent) {
    const c = this._find(pnjId);
    if (!c) return false;
    // K4 : CI matricielle — init du livre (base+dés stockés à la création,
    // cf. icCombatant), relancée comme tout le monde en SR5/SR6. Pas de pnj
    // de pool ni d'overlay : jet direct via Dice. Narrative (Anarchy) → pas
    // d'init (initBase null), classée à la main comme les PNJ Anarchy.
    if (c.kind === "matrix") {
      const m = c.matrix;
      if (!m || m.initBase == null) return false;
      c.init = Dice.computeInitiative(m.initBase, m.initDice).total;
      return true;
    }
    const pnj = PnjLookup.find(pnjId);
    if (!pnj) return false; // PJ ad-hoc / entité disparue : init manuelle conservée
    const spec = App.editionModule && App.editionModule.initiativeFor(pnj);
    if (!spec) {
      if (!silent) toast("Pas d'initiative chiffrée pour cette édition — classez ce PNJ manuellement (▲▼).");
      return false;
    }
    // DiceRoller pose pnj.lastInit (champ neutre, déjà utilisé par les
    // cartes) : on le relit après le lancer plutôt que de recalculer.
    // silent (lancer groupé) : pas d'overlay de tirage — les N overlays
    // s'écraseraient et seul le dernier resterait visible ; les scores
    // s'affichent directement dans la liste du suivi.
    // CH-M5 : le modificateur de blessure s'applique aussi au score
    // d'initiative (SR5 p.171, SR6 — initiative modifiée par tout ce qui
    // affecte l'initiative physique) — réutilise le calcul déjà générique
    // Utils.woundMalus, aucune règle nouvelle à écrire ici.
    const malus = Utils.woundMalus(pnj, pnj.edition);
    DiceRoller.rollInitiative(spec.base - malus, spec.dice, pnjId, "", { silent });
    c.init = pnj.lastInit ? pnj.lastInit.total : c.init;
    return true;
  },

  rollInit(pnjId) {
    this._rollInit(pnjId);
    this._commit();
  },

  /** Ne lance que les combattants sans initiative encore posée : ne
      recouvre jamais une valeur déjà lancée ou saisie à la main. Lancer
      groupé silencieux (pas d'overlay par combattant) : les scores
      apparaissent directement dans la liste, on confirme d'un toast. */
  rollAllInit() {
    let rolled = 0;
    for (const c of this.state.combatants) {
      if (c.init == null && this._rollInit(c.pnjId, true)) rolled++;
    }
    this._commit();
    toast(
      rolled
        ? `Initiative lancée (${rolled} combattant${rolled > 1 ? "s" : ""}).`
        : "Rien à lancer : initiatives déjà posées ou saisie manuelle requise.",
    );
  },

  /** Tri automatique décroissant par initiative (confort quand la valeur
      existe) ; les combattants sans init (null) restent en fin de liste.
      Reset du tour courant au premier de la nouvelle liste. Le tri manuel
      (▲▼) reste le mécanisme de base pour Anarchy, sans init chiffrée. */
  _sortInPlace() {
    this.state.combatants.sort((a, b) => {
      if (a.init == null && b.init == null) return 0;
      if (a.init == null) return 1;
      if (b.init == null) return -1;
      return b.init - a.init;
    });
  },

  sortByInit() {
    this._sortInPlace();
    this.state.turnIndex = this._firstEligibleIndex();
    this._commit();
  },

  /** Lancer + classer en un geste (CH combat) : supprime la friction « lancer
      puis trier à la main » du round 1, qui contredisait le round 2+ où
      nextRound relance ET trie déjà tout seul. Un seul commit. Sans effet de
      tri en Anarchy (init null → fin de liste), comme sortByInit. */
  rollAndSort() {
    let rolled = 0;
    for (const c of this.state.combatants) {
      if (c.init == null && this._rollInit(c.pnjId, true)) rolled++;
    }
    this._sortInPlace();
    this.state.turnIndex = this._firstEligibleIndex();
    this._commit();
    toast(
      rolled
        ? `Initiative lancée et classée (${rolled} combattant${rolled > 1 ? "s" : ""}).`
        : "Classé. Rien à lancer : initiatives déjà posées ou saisie manuelle requise.",
    );
  },

  /* ---- Tri manuel (nécessaire : Anarchy n'a pas d'initiative chiffrée) ---- */
  moveUp(pnjId) {
    const idx = this.state.combatants.findIndex((c) => c.pnjId === pnjId);
    if (idx > 0) this._swap(idx, idx - 1);
  },
  moveDown(pnjId) {
    const idx = this.state.combatants.findIndex((c) => c.pnjId === pnjId);
    if (idx !== -1 && idx < this.state.combatants.length - 1) this._swap(idx, idx + 1);
  },
  _swap(i, j) {
    const arr = this.state.combatants;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    this._commit();
  },

  /** Réordonne state.combatants selon une liste d'ids (ordre DOM après un
      glisser, Vague C1). Le tour actif est préservé par pnjId (pas par index,
      qui change). Tout id absent de la liste est conservé en fin (garde-fou). */
  reorderByIds(ids) {
    const activeId = (this.state.combatants[this.state.turnIndex] || {}).pnjId;
    const byId = new Map(this.state.combatants.map((c) => [c.pnjId, c]));
    const next = [];
    for (const id of ids) {
      const c = byId.get(id);
      if (c) {
        next.push(c);
        byId.delete(id);
      }
    }
    for (const c of byId.values()) next.push(c);
    this.state.combatants = next;
    const ai = next.findIndex((c) => c.pnjId === activeId);
    if (ai !== -1) this.state.turnIndex = ai;
    this._commit();
  },

  /** Déplace le combattant actif (celui dont c'est le tour) d'un cran et
      garde le tour sur lui — pilotage clavier ↑/↓ (CH-Q3). */
  moveActive(dir) {
    const cs = this.state.combatants;
    const i = this.state.turnIndex;
    const j = i + dir;
    if (j < 0 || j >= cs.length) return;
    [cs[i], cs[j]] = [cs[j], cs[i]];
    this.state.turnIndex = j;
    this._commit();
  },

  /* ---- Tours / rounds / passes d'initiative ---- */
  markActed(pnjId, acted) {
    const c = this._find(pnjId);
    if (!c) return;
    c.hasActed = !!acted;
    this._commit();
  },

  /** Action retardée (Vague C) : le combattant tient son action. Il devient
      inéligible (sauté par les tours) mais reste dans le round, à sa place. S'il
      tenait le tour courant, on avance au suivant sans le marquer « a joué »
      (il n'a pas encore agi). Se relève par « Agir maintenant » (actNow). */
  delayCombatant(pnjId) {
    const c = this._find(pnjId);
    if (!c) return;
    c.delayed = true;
    const idx = this.state.combatants.findIndex((x) => x.pnjId === pnjId);
    if (idx === this.state.turnIndex) {
      const next = this._nextEligibleIndex(this.state.turnIndex);
      if (next !== -1) this.state.turnIndex = next;
    }
    this._commit();
  },

  /** Reprise d'une action retardée (Vague C) : le combattant agit tout de
      suite — on lève le drapeau et on lui donne le tour courant. */
  actNow(pnjId) {
    const c = this._find(pnjId);
    if (!c) return;
    c.delayed = false;
    const idx = this.state.combatants.findIndex((x) => x.pnjId === pnjId);
    if (idx !== -1) this.state.turnIndex = idx;
    this._commit();
  },

  /** Hors de combat (Vague D) : moniteur plein, via l'accesseur neutre
      combatDisposition du module d'édition (jamais de branche d'édition ici).
      Un combattant hors de combat ne joue plus (inéligible) et sera rendu en
      fond de liste, sans initiative. */
  _isDown(c) {
    // K4 : une CI matricielle est « hors de combat » quand son moniteur
    // matriciel est plein (source unique srv.intrusion.ics[key].down, gérée
    // par Intrusion) — jamais via combatDisposition (ce n'est pas une entité
    // chair sans pnj de pool).
    if (c.kind === "matrix") {
      const st = this._matrixICState(c);
      return !!(st && st.down);
    }
    const mod = App.editionModule;
    if (!mod || !mod.combatDisposition) return false;
    const pnj = PnjLookup.find(c.pnjId);
    return pnj ? !!mod.combatDisposition(pnj).down : false;
  },

  /** État vivant d'une CI (moniteur, détruite) lu sur le serveur — jamais
      copié dans le combattant. null si le combattant n'est pas matriciel ou
      si le serveur/la CI a disparu. */
  _matrixICState(c) {
    const m = c && c.matrix;
    if (!m) return null;
    const srv = Servers.find(m.serverId);
    return (srv && srv.intrusion && srv.intrusion.ics[m.icKey]) || null;
  },

  /** Un combattant agit-il dans la passe courante ? Hors de combat → jamais.
      Sans passes (passDecrement falsy, ex. SR6/Anarchy) tout le monde est
      éligible. Avec passes (SR5) : score effectif = init − (passe−1)×décrément, > 0. */
  _eligible(c) {
    if (this._isDown(c)) return false;
    if (c.delayed) return false; // action retardée (Vague C) : tient son tour
    const dec = this._model().passDecrement;
    if (!dec) return true;
    return c.init != null && c.init - (this.state.pass - 1) * dec > 0;
  },

  _firstEligibleIndex() {
    return this._nextEligibleIndex(-1);
  },
  _nextEligibleIndex(after) {
    const cs = this.state.combatants;
    for (let i = after + 1; i < cs.length; i++) {
      if (this._eligible(cs[i])) return i;
    }
    return -1;
  },

  nextTurn() {
    const cs = this.state.combatants;
    if (!cs.length) return;
    const current = cs[this.state.turnIndex];
    if (current) current.hasActed = true;

    const next = this._nextEligibleIndex(this.state.turnIndex);
    if (next !== -1) {
      this.state.turnIndex = next;
      this._resetActions(next); // K7 : budget d'actions frais au début du tour
      this._commit();
      return;
    }

    // Fin de la passe courante. Une passe suivante existe (SR5) si un
    // combattant garde un score effectif > 0 après un nouveau −décrément.
    const dec = this._model().passDecrement;
    if (dec && cs.some((c) => c.init != null && c.init - this.state.pass * dec > 0)) {
      this.state.pass++;
      cs.forEach((c) => (c.hasActed = false));
      this.state.turnIndex = this._firstEligibleIndex();
      // K7 : nouvelle phase d'action SR5 → budget d'actions rechargé.
      this._resetActions(this.state.turnIndex);
      this._commit();
      toast("Passe d'initiative " + this.state.pass);
      return;
    }
    this.nextRound();
  },

  nextRound() {
    const model = this._model();
    this.state.round++;
    this.state.pass = 1;
    // Nouveau round : tout le monde rejoue, les actions retardées (Vague C)
    // tombent (on ne tient pas son action d'un round sur l'autre).
    this.state.combatants.forEach((c) => {
      c.hasActed = false;
      c.delayed = false;
      // K5 : compteur de gains d'Atout du tour remis à zéro à chaque round
      // (plafond +2/tour de personnage, SR6 p.50).
      c.edgeTurn = 0;
      // K7 : budget d'actions rechargé pour tout le monde au nouveau round.
      c.actionsUsed = {};
    });
    // SR5/SR6 : nouvelle initiative à chaque tour de combat. Anarchy
    // (rerollEachRound:false) conserve l'ordre rangé à la main.
    if (model.rerollEachRound) {
      for (const c of this.state.combatants) this._rollInit(c.pnjId, true);
      this._sortInPlace();
    }
    this.state.turnIndex = this._firstEligibleIndex();
    this._commit();
    // K4 : rappel de cadence — l'hôte peut déployer une CI par tour de combat
    // (SR5 p.249, SR6 p.188). Rappel seulement si un serveur alerté est lié et
    // que l'édition a des CI chiffrées (hasAttrs) ; Anarchy déploie à sa façon.
    const srv = this._linkedServer();
    if (srv && Matrix.use(srv.edition).hasAttrs() && srv.intrusion && srv.intrusion.alerted) {
      toast("Nouveau tour : le serveur peut déployer une CI.");
    }
  },

  setNote(pnjId, text) {
    const c = this._find(pnjId);
    if (!c) return;
    c.note = text;
    // Pas de _commit() ici : un re-rendu complet ferait perdre le focus/
    // curseur du champ en cours de saisie. Sauvegarde silencieuse.
    this.save();
  },

  /** K5 : ajuste l'Atout de combat d'un combattant (SR6, 0-7). Le gain est
      plafonné à +2 par tour de personnage (p.50) — avertissement NON bloquant
      (le MJ a toujours raison). Le compteur de gains (edgeTurn) est remis à
      zéro à chaque round (nextRound). L'Atout vit dans l'entrée de scène
      (c.edge), pas sur le PNJ — c'est une ressource de la rencontre. */
  adjustEdge(pnjId, delta) {
    const c = this._find(pnjId);
    if (!c) return;
    const before = c.edge || 0;
    const next = Utils.clamp(before + delta, 0, 7);
    if (next === before) return;
    c.edge = next;
    if (delta > 0) {
      c.edgeTurn = (c.edgeTurn || 0) + 1;
      if (c.edgeTurn > 2) toast("Atout : déjà 2 gagnés ce tour (SR6 p.50).", "warning");
    }
    // La rangée Atout vit dans la fiche active mise en cache par _activeCardId :
    // forcer sa reconstruction pour que les jetons reflètent la nouvelle valeur.
    EncounterRenderer._activeCardId = null;
    this._commit();
  },

  /** K7 : consomme/rend les actions du tour actif (compteur par groupe :
      majeure/mineure SR6, simple/complexe SR5, action Anarchy). Jeton tappable
      façon moniteur : taper le jeton d'index idx consomme jusqu'à idx+1 ; re-
      taper le dernier consommé le rend. Stocké c.actionsUsed[groupe] dans la
      scène (aucune clé Storage), remis à zéro au début de chaque tour. */
  setAction(pnjId, key, idx) {
    const c = this._find(pnjId);
    if (!c) return;
    c.actionsUsed = c.actionsUsed || {};
    const cur = c.actionsUsed[key] || 0;
    c.actionsUsed[key] = cur === idx + 1 ? idx : idx + 1;
    EncounterRenderer._activeCardId = null;
    this._commit();
  },

  /** Remet à zéro le budget d'actions d'un combattant : appelé au début de son
      tour (nextTurn / nouvelle passe / nouveau round), jamais en cours de tour. */
  _resetActions(i) {
    const c = this.state.combatants[i];
    if (c) c.actionsUsed = {};
  },

  /** Ferme l'overlay, bascule sur le panel où vit réellement ce PNJ
      (Ombres / Générateur / Matrice) et le met en surbrillance — réutilise
      UI.focusOwner tel quel, aucune logique de moniteur dupliquée ici. */
  focusCombatant(pnjId) {
    // K4 : une CI matricielle n'a pas de fiche de pool — tap = ouvrir le
    // tiroir Matrice (là où elle vit vraiment), sans fermer le tracker.
    const c = this._find(pnjId);
    if (c && c.kind === "matrix") {
      this.openMatrixDrawer();
      return;
    }
    // PJ ad-hoc / entité disparue : pas de fiche à afficher.
    if (!PnjLookup.find(pnjId)) return;
    this.close();
    const panel = Shadows.data.all.some((p) => p.id === pnjId)
      ? "shadows"
      : Servers.findSpider(pnjId)
        ? "matrix"
        : "generator";
    App.showPanel(panel);
    UI.focusOwner(pnjId);
  },

  /* ---- Moniteurs (réutiliser un PNJ « frais ») ---- */
  /** Remet à zéro tous les moniteurs d'un PNJ : générique et édition-
      agnostique (toute clé finissant par « Filled » — phys/stun/mon/ment/
      mat, léger/grave/incap Anarchy), donc aucune branche d'édition ici.
      C'est l'opération inverse d'UI.toggleMonitor et suit le même chemin de
      persistance. Retourne true si un moniteur a réellement été effacé. */
  _resetMonitors(pnj) {
    if (!pnj) return false;
    let changed = false;
    for (const k of Object.keys(pnj)) {
      if (k.endsWith("Filled") && pnj[k]) {
        pnj[k] = 0;
        changed = true;
      }
    }
    return changed;
  },

  /** Bouton « réinitialiser les moniteurs » d'une carte de combat. */
  healCombatant(pnjId) {
    const pnj = PnjLookup.find(pnjId);
    if (!this._resetMonitors(pnj)) return;
    Shadows.save();
    CardRenderer.refresh(pnj);
    // CH-M5 : le badge de malus de la ligne (calculé depuis le moniteur)
    // resterait sinon périmé jusqu'au prochain rendu du tracker.
    this._render();
    toast("Moniteurs réinitialisés.");
  },

  /** Mise hors de combat immédiate (Vague C) : remplit le moniteur via
      l'accesseur neutre conditionMonitor.knockOut (jamais de branche d'édition
      ici) → le combattant bascule « hors de combat » (fond de pile, init
      retirée, cf. Vague D). Réversible d'un tap par le bouton ✚ (soigner). */
  knockOut(pnjId) {
    const pnj = PnjLookup.find(pnjId);
    const cm = App.editionModule && App.editionModule.conditionMonitor;
    if (!pnj || !cm || !cm.knockOut || cm.isDestroyed(pnj)) return;
    cm.knockOut(pnj);
    Shadows.save();
    CardRenderer.refresh(pnj);
    this._render();
    toast("Mis hors de combat.");
  },

  /** K8 : ferme la boucle de réaction — 💥/✸ « Dégâts » applique un résultat
      NET (déjà résisté, le cockpit n'a pas la valeur d'attaque) au moniteur
      d'un combattant, via l'accesseur neutre conditionMonitor.applyDamage
      (jamais de branche d'édition ici, comme knockOut ci-dessus). `opts` porte
      `type` (SR5/SR6 : "phys"/"stun") ou `severity` (Anarchy 2 : cran de
      gravité) selon ce que damageUI() de l'édition annonce. */
  damageCombatant(pnjId, n, opts) {
    const pnj = PnjLookup.find(pnjId);
    const cm = App.editionModule && App.editionModule.conditionMonitor;
    if (!pnj || !cm || !cm.applyDamage) return null;
    const res = cm.applyDamage(pnj, n, opts || {});
    Shadows.save();
    CardRenderer.refresh(pnj);
    this._render();
    return res;
  },

  /* ---- M4 : bricker des armes (cibles matricielles) ----
     L'état de brickage est **de scène**, PAS sur le PNJ : il vit sur l'entrée
     combattant `c.devices` (comme `c.matrix` pour les CI), donc dans
     `Encounter.state.combatants`, sérialisé tel quel par Storage.set (interdit
     n°2 respecté — aucune écriture localStorage directe, aucune 5ᵉ collection).
     Scène-scopé : vidé à `clear()`, jamais copié sur la fiche permanente. Le
     régime par édition (moniteur SR5/SR6 vs bascule narrative A2 vs rien A1)
     est lu via Matrix.deviceBricking() — jamais un `if (App.edition)` ici. */

  /** Désigne une arme comme cible matricielle. Forme du descripteur selon le
      régime : "monitor" → {indice, filled, bricked} ; "narrative" → {indice:null,
      bricked}. Idempotent (re-taper la même arme ne recrée pas de moniteur). */
  targetDevice(pnjId, label) {
    const c = this._find(pnjId);
    if (!c || !label) return;
    const pnj = PnjLookup.find(pnjId);
    const mode = pnj && Matrix.use(pnj.edition).deviceBricking();
    if (!mode) return;
    c.devices ||= {};
    if (c.devices[label]) return;
    c.devices[label] =
      mode === "narrative"
        ? { indice: null, bricked: false }
        : { indice: Matrix.DEVICE_DEFAULT_RATING, filled: 0, bricked: false };
    this._commit();
  },

  untargetDevice(pnjId, label) {
    const c = this._find(pnjId);
    if (!c || !c.devices || !c.devices[label]) return;
    delete c.devices[label];
    this._commit();
  },

  /** Clic sur une case du moniteur d'un appareil (SR5/SR6). Même geste que le
      moniteur de deck (UI.toggleDeckMonitor) / le moniteur de CI (Intrusion.icBox)
      — taper une case remplit jusque-là, re-taper la dernière rend une case.
      Brické quand le moniteur est plein (8+Indice/2). */
  deviceBox(pnjId, label, idx) {
    const c = this._find(pnjId);
    const d = c && c.devices && c.devices[label];
    if (!d || d.indice == null) return;
    d.filled = idx < d.filled ? idx : idx + 1;
    const pnj = PnjLookup.find(pnjId);
    const size = Matrix.use(pnj.edition).icMonitorSize(d.indice);
    d.bricked = d.filled >= size;
    this._commit();
  },

  /** ±1 sur l'Indice d'appareil (défaut 2 « Moyen », plage 1-6, cf. table du
      livre) — pas de saisie clavier en combat (patron edge-step/threat-step).
      Le moniteur se redimensionne ; on reclampe le rempli et on recalcule le
      brickage. */
  deviceRatingStep(pnjId, label, delta) {
    const c = this._find(pnjId);
    const d = c && c.devices && c.devices[label];
    if (!d || d.indice == null) return;
    d.indice = Utils.clamp(d.indice + delta, 1, 6);
    const pnj = PnjLookup.find(pnjId);
    const size = Matrix.use(pnj.edition).icMonitorSize(d.indice);
    if (d.filled > size) d.filled = size;
    d.bricked = d.filled >= size;
    this._commit();
  },

  /** Anarchy 2.0 (régime narratif) : bascule « hors service » en un tap depuis
      la bande narrative. Pas de moniteur ni d'indice — le descripteur se réduit
      à { indice:null, bricked }. 1er tap sur une arme non ciblée = brické
      d'emblée (le geste du MJ EST « rends-la inopérante ») ; re-taper une arme
      brickée = réparée, on retire le descripteur (l'arme redevient une simple
      cible potentielle, pas d'état résiduel). */
  deviceNarrativeToggle(pnjId, label) {
    const c = this._find(pnjId);
    if (!c || !label) return;
    c.devices ||= {};
    const d = c.devices[label];
    if (!d) c.devices[label] = { indice: null, bricked: true };
    else if (d.bricked) delete c.devices[label];
    else d.bricked = true;
    this._commit();
  },

  /** M5 : désigne/retire le decker qui protège cet appareil de son Firewall
      (SR5 p.236 PAN/esclave ; A2 p.216-217 Protection active — SR6 approximé
      par analogie, arbitrage utilisateur). Ne crée PAS le descripteur si
      l'appareil n'est pas encore une cible (targetDevice d'abord) — protéger
      un appareil qui n'existe pas encore n'a pas de sens. */
  setDeviceProtector(pnjId, label, protectorId) {
    const c = this._find(pnjId);
    const d = c && c.devices && c.devices[label];
    if (!d) return;
    d.protectorId = protectorId || null;
    this._commit();
  },

  /** M6 : Bruit (SR5 p.232/SR6 équivalent) — modificateur de scène, réglé à la
      main par le MJ (distance/environnement ne sont pas des données trackées
      par l'app, cf. plan) et retranché des jets Matrice du decker (Piratage,
      duel, défense protégée). Scène-scopée comme `state.serverId` — pas sur
      le PNJ, pas sur le serveur (le bruit affecte la connexion, pas un côté
      en particulier). */
  stepNoise(delta) {
    this.state.noise = Utils.clamp((this.state.noise || 0) + delta, 0, 20);
    this._commit();
  },

  /** Pool après Bruit — plancher 0 (un pool négatif ne veut rien dire).
      Utilisé par tout jet Matrice du decker (Piratage M3, duel M5a, défense
      protégée M5b) ; jamais par les jets côté serveur (Intrusion.rollIC,
      hors périmètre de cette scène-ci). */
  _noisyPool(pool) {
    return Math.max(0, (pool || 0) - (this.state.noise || 0));
  },

  /** Fin de scène : soigne tous les combattants résolvables d'un coup. */
  async healAll() {
    const ok = await Dialog.confirm({
      title: "Fin de scène",
      message: "Réinitialiser les moniteurs de tous les combattants (les remettre « frais ») ?",
      confirmLabel: "Tout soigner",
    });
    if (!ok) return;
    let n = 0;
    for (const c of this.state.combatants) {
      const pnj = PnjLookup.find(c.pnjId);
      if (this._resetMonitors(pnj)) {
        CardRenderer.refresh(pnj);
        n++;
      }
    }
    if (n) {
      Shadows.save();
      this._render(); // CH-M5 : badges de malus de toutes les lignes à jour
    }
    toast(
      n
        ? `Moniteurs réinitialisés (${n} combattant${n > 1 ? "s" : ""}).`
        : "Aucun moniteur à réinitialiser.",
    );
  },

  /* ---- Matrice contextuelle (K3) : un seul serveur lié à la scène ----
     state.serverId vit dans la scène déjà persistée (encounter_current,
     prohibition n°2 — aucune nouvelle clé Storage). Le contenu du tiroir
     (CI, surveillance, jets) reste entièrement porté par Intrusion/
     ServerRenderer : ce module ne fait que lier/délier et dériver l'état
     0-3 affiché sur le bouton de la barre pouce. */
  _linkedServer() {
    return this.state.serverId ? Servers.find(this.state.serverId) : null;
  },

  /** État Matrice dérivé (0 absente · 1 liée · 2 en alerte · 3 CI en jeu),
      recalculé à chaque rendu — jamais persisté séparément. */
  matrixState() {
    const srv = this._linkedServer();
    if (!srv) return 0;
    const intr = srv.intrusion;
    if (!intr) return 1;
    const activeIC = Object.values(intr.ics || {}).filter((s) => s.active && !s.down).length;
    if (activeIC > 0) return 3;
    if (intr.alerted) return 2;
    return 1;
  },

  /** Serveurs proposables à la liaison (porte 1, picker) : tous sauf celui
      déjà lié (le retaper serait un no-op). */
  _serverCandidates() {
    return Servers.data.all.filter((s) => s.id !== this.state.serverId);
  },

  /** Lie un serveur à la scène (portes K3 : picker, « ⚔ Envoyer au combat »,
      implicite en K4). Confirmation seulement si un autre serveur est déjà
      lié avec une CI en jeu (remplacement, un seul serveur en V1). */
  async linkServer(id) {
    if (!id || this.state.serverId === id) return;
    if (this.state.serverId && this.matrixState() === 3) {
      const ok = await Dialog.confirm({
        title: "Remplacer le serveur lié",
        message: "Une CI est en jeu sur le serveur actuellement lié à la scène. Le remplacer par ce nouveau serveur ?",
        confirmLabel: "Remplacer",
        danger: true,
      });
      if (!ok) return;
    }
    this.state.serverId = id;
    // Garantit srv.intrusion pour le tiroir (mutation légitime d'une action,
    // pas d'un rendu) — même accesseur que le panneau Serveurs, rien de dupliqué.
    Intrusion._get(id);
    this._commit();
    toast("Serveur lié à la scène.");
  },

  /** Délie le serveur courant (tiroir uniquement, cf. plan) — confirmation
      si une CI est en jeu. */
  async unlinkServer() {
    if (!this.state.serverId) return;
    if (this.matrixState() === 3) {
      const ok = await Dialog.confirm({
        title: "Délier le serveur",
        message: "Une CI est en jeu sur ce serveur. Le délier de la scène quand même ?",
        confirmLabel: "Délier",
        danger: true,
      });
      if (!ok) return;
    }
    this.state.serverId = null;
    this._commit();
    this.closeMatrixDrawer();
  },

  toggleMatrixDrawer() {
    const overlay = document.getElementById("matrix-drawer-overlay");
    if (!overlay) return;
    if (overlay.classList.contains("open")) this.closeMatrixDrawer();
    else this.openMatrixDrawer();
  },
  /** Ouverture/fermeture en deux classes (comme #dice-sheet-overlay) : .open
      pose display:flex, .show (au rAF suivant) déclenche la transition —
      sans ce décalage, la feuille apparaîtrait déjà translatée à 0. */
  openMatrixDrawer() {
    // K6 : quand la colonne Matrice dockée est visible (≥1100px, serveur
    // lié), la Matrice est déjà à l'écran — pas de tiroir par-dessus, on
    // amène la colonne en vue (tap sur un jeton CI, « Ouvrir la Matrice »).
    const dock = document.getElementById("encounter-matrix-dock");
    if (dock && !dock.hidden && window.matchMedia("(min-width: 1100px)").matches) {
      dock.scrollIntoView({ block: "nearest" });
      return;
    }
    const overlay = document.getElementById("matrix-drawer-overlay");
    if (!overlay) return;
    overlay.classList.add("open");
    requestAnimationFrame(() => requestAnimationFrame(() => overlay.classList.add("show")));
  },
  closeMatrixDrawer() {
    const overlay = document.getElementById("matrix-drawer-overlay");
    if (!overlay || !overlay.classList.contains("open")) return;
    overlay.classList.remove("show");
    setTimeout(() => overlay.classList.remove("open"), 220);
  },

  /** Clés des CI déjà lancées dans l'init pour le serveur lié — passées au
      rendu du tiroir pour ne pas re-proposer « ⚔ Init » sur une CI en scène. */
  _launchedICKeys() {
    return this.state.combatants
      .filter((c) => c.kind === "matrix" && c.matrix && c.matrix.serverId === this.state.serverId)
      .map((c) => c.matrix.icKey);
  },

  /** K4 : une CI rejoint l'ordre d'initiative (demande explicite + entretien
      Sofia : plus jamais d'oubli de la CI). Lancée depuis le tiroir, donc le
      serveur est déjà lié (porte 3 implicite satisfaite). Init du livre via
      icCombatant (module d'édition — prohibition n°1) ; l'état vivant (moniteur)
      reste sur srv.intrusion, jamais copié. Insérée à sa place d'init sans
      voler le tour courant. No-op si déjà en scène. */
  launchIC(serverId, icKey) {
    const srv = Servers.find(serverId);
    if (!srv) return;
    const ic = Matrix.use(srv.edition).icCatalog()[icKey];
    if (!ic) return;
    if (this.state.combatants.some((c) => c.kind === "matrix" && c.matrix && c.matrix.serverId === serverId && c.matrix.icKey === icKey)) {
      toast("Cette CI est déjà dans l'initiative.");
      return;
    }
    const spec = App.editionModule.icCombatant(ic, srv);
    if (!spec) return;
    const c = {
      pnjId: "ic-" + Utils.uid(),
      name: spec.name,
      kind: "matrix",
      init: null,
      hasActed: false,
      note: "",
      matrix: { serverId, icKey, initBase: spec.initBase ?? null, initDice: spec.initDice ?? null },
    };
    if (!spec.narrative && spec.initBase != null) {
      c.init = Dice.computeInitiative(spec.initBase, spec.initDice).total;
    }
    this._insertByInit(c);
    this._commit();
    toast(`${spec.name} rejoint l'initiative.`);
  },

  /** Insère un combattant à sa place dans l'ordre d'init décroissant sans
      re-trier toute la liste (moins perturbant en plein round) et en gardant
      le tour sur le combattant courant (suivi par pnjId, pas par index).
      Init null (narrative) → placé en fin, comme au tri. */
  _insertByInit(c) {
    const cs = this.state.combatants;
    const activeId = (cs[this.state.turnIndex] || {}).pnjId;
    const cInit = c.init == null ? -Infinity : c.init;
    let idx = cs.findIndex((x) => (x.init == null ? -Infinity : x.init) < cInit);
    if (idx === -1) idx = cs.length;
    cs.splice(idx, 0, c);
    const ai = cs.findIndex((x) => x.pnjId === activeId);
    if (ai !== -1) this.state.turnIndex = ai;
  },

  /* ---- Rendu ---- */
  _rows() {
    const rows = this.state.combatants.map((c) => ({
      ...c,
      // Un PJ ad-hoc n'est résolu par aucun pool : on synthétise l'objet
      // d'affichage minimal (nom + drapeau _adhoc) pour ne jamais le filtrer.
      pnj: PnjLookup.find(c.pnjId) || (c.name ? { id: c.pnjId, name: c.name, _adhoc: true } : null),
    }));
    // K7-B : marque « PJ vs reste » une fois pour le rendu (console de réaction :
    // tour d'un PJ → faire réagir les PNJ). Déjà utilisé par le moral.
    rows.forEach((r) => (r.isPJ = this._isPJ(r)));
    return this._decorateDisposition(rows);
  },

  /** Un combattant est-il un PJ (piloté par un joueur) ? PJ ad-hoc (kind:'pj')
      ou personnage résolu depuis le pool des jouables. Sert au proxy « PJ vs
      le reste » : les PJ ne portent pas de drapeau de moral et ne comptent pas
      dans le groupe d'opposition. */
  _isPJ(r) {
    return (
      r.kind === "pj" ||
      (!!r.pnj && !r.pnj._adhoc && Characters.data.all.some((p) => p.id === r.pnjId))
    );
  },

  /** Décore chaque row de { down, morale } via l'accesseur d'édition
      combatDisposition. Le moral (proportion d'alliés hors combat) se calcule
      sur le GROUPE d'opposition (tout sauf les PJ — proxy) et n'est appliqué
      qu'à ce groupe. « down » vaut pour tout le monde. */
  _decorateDisposition(rows) {
    const mod = App.editionModule;
    if (!mod || !mod.combatDisposition) {
      rows.forEach((r) => {
        r.down = false;
        r.morale = null;
      });
      return rows;
    }
    // K4 : les CI matricielles sont hors du groupe de moral (ni chair, ni
    // PJ) — leur « down » vient du moniteur matriciel, pas de combatDisposition.
    const opp = rows.filter((r) => r.pnj && !this._isPJ(r) && r.kind !== "matrix");
    let oppDown = 0;
    for (const r of opp) if (mod.combatDisposition(r.pnj).down) oppDown++;
    const group = { down: oppDown, total: opp.length };
    for (const r of rows) {
      if (r.kind === "matrix") {
        const st = this._matrixICState(r);
        r.down = !!(st && st.down);
        r.morale = null;
        continue;
      }
      if (!r.pnj) {
        r.down = false;
        r.morale = null;
        continue;
      }
      const d = mod.combatDisposition(r.pnj, group);
      r.down = !!d.down;
      r.morale = this._isPJ(r) ? null : d.morale;
      // K6 : résumé du moniteur pour la mini-jauge de la ligne (accesseur
      // neutre conditionMonitor.gauge — jamais de forme de moniteur ici).
      // total 0 (PJ ad-hoc, entité sans moniteur) = pas de jauge au rendu.
      const cm = mod.conditionMonitor;
      r.gauge = cm && cm.gauge ? cm.gauge(r.pnj) : null;
    }
    return rows;
  },

  /** J3 (journal des jets) : { key, round } si une scène est active avec au
      moins un combattant, sinon null (« hors combat »). `key` inclut
      `_sceneSeq` pour que deux combats distincts démarrant chacun au round 1
      ne fusionnent pas dans le même groupe du journal ; `round` est le
      numéro affiché. Lu par App via le hook injecté à DiceRoller.init —
      DiceRoller/DiceLog (couche 4) ne connaissent jamais Encounter
      (couche 5) directement. */
  currentTurn() {
    if (!this.state || !this.state.combatants.length) return null;
    return { key: `${this._sceneSeq}:${this.state.round}`, round: this.state.round };
  },

  /** Re-rend le tracker quand le moniteur d'un combattant change hors du
      tracker (dégâts encaissés sur sa carte) — sinon « hors de combat » /
      « devrait fuir » resteraient périmés. Appelé par app.js (onPnjChanged) et
      UI.toggleMonitor. No-op si le PNJ n'est pas dans la scène. */
  notifyPnjChanged(pnj) {
    if (!pnj || !this.state) return;
    if (!this.state.combatants.some((c) => c.pnjId === pnj.id)) return;
    this._render();
  },

  /** K3 : re-rend le bouton/tiroir Matrice quand le serveur lié change
      hors du cycle de commit d'Encounter — les actions du tiroir
      (next-turn, ic-box, roll-ic…) passent par Intrusion._persist, pas par
      Encounter._commit. Même garde que notifyPnjChanged : no-op si ce
      n'est pas le serveur lié. Appelé par Intrusion._persist. */
  notifyServerChanged(srv) {
    if (!srv || !this.state || this.state.serverId !== srv.id) return;
    // K4 : si des CI de ce serveur sont dans l'init, leur état (moniteur,
    // détruite) a pu changer → re-rendre toute la scène (liste + jetons +
    // fiche active), pas seulement le bouton. _render rafraîchit aussi le
    // tiroir en fin de parcours.
    if (this.state.combatants.some((c) => c.kind === "matrix")) this._render();
    else EncounterRenderer.renderMatrix(srv, this.matrixState(), this._launchedICKeys());
  },
  /** Rendu complet (liste, fiche du combattant actif, résumé sidebar) —
      factorisé pour être appelable aussi bien après un commit qu'au
      chargement initial de l'édition (sidebar à jour sans ouvrir le
      tracker). */
  _render() {
    const rows = this._rows();
    const model = this._model();
    // K3 : auto-guérison si le serveur lié a été supprimé entre-temps (ex.
    // depuis le panneau Serveurs) — jamais de référence pendante.
    if (this.state.serverId && !Servers.find(this.state.serverId)) {
      this.state.serverId = null;
      this.save();
    }
    // Garantit srv.intrusion avant le rendu (Intrusion._get, mutation
    // idempotente) sans jamais faire lire/muter Servers à EncounterRenderer
    // (qui reste un rendu pur — reçoit le serveur déjà résolu).
    const srv = this.state.serverId ? Intrusion._get(this.state.serverId) : null;
    EncounterRenderer.render(this.state, rows, model);
    EncounterRenderer.renderActiveCard(rows, this.state, model);
    EncounterRenderer.renderSidebar(this.state, rows, model);
    EncounterRenderer.renderMatrix(srv, this.matrixState(), this._launchedICKeys());
  },
  _commit() {
    this.save();
    this._render();
    this._renderPicker();
  },

  /** Ne (re)rend le panneau d'ajout que s'il est ouvert : évite de recalculer
      la liste des candidats à chaque commit inutilement. */
  _renderPicker() {
    const panel = document.getElementById("encounter-add-panel");
    if (panel && !panel.hidden) EncounterRenderer.renderPicker(this._candidates(), this._serverCandidates());
  },

  toggleAddPicker() {
    const panel = document.getElementById("encounter-add-panel");
    if (!panel) return;
    panel.hidden = !panel.hidden;
    if (!panel.hidden) EncounterRenderer.renderPicker(this._candidates(), this._serverCandidates());
  },

  /* ---- Overlay ---- */
  open() {
    const overlay = document.getElementById("encounter-overlay");
    overlay.classList.add("open");
    // CH-M4 : dock latéral non bloquant ≥641px (le Hub reste utilisable
    // derrière, ex. suivre une intrusion en cours) ; plein écran réel en
    // dessous (pas de place pour cohabiter) — aria-modal reflète lequel.
    overlay.setAttribute(
      "aria-modal",
      window.matchMedia("(max-width: 640px)").matches ? "true" : "false",
    );
    this._render();
    this._renderPicker();
  },
  close() {
    const el = document.getElementById("encounter-overlay");
    if (el) el.classList.remove("open");
  },

  /* ---- Glisser-déposer pour réordonner (Vague C1, étendu au narratif T1.5) ----
     Pointer Events (souris + tactile), sans dépendance et sans drag HTML5
     natif (qui ne marche pas au doigt). Pendant le glisser on ne réordonne que
     le DOM (retour visuel immédiat) ; l'état n'est réécrit qu'au relâcher, via
     reorderByIds — un seul _commit. Les lignes hors de combat (épinglées en
     bas) ne sont ni saisissables ni des cibles d'insertion. Fonctionne aussi
     bien sur .encounter-row (ordonné) que .encounter-nrow (narratif Anarchy,
     cf. _narrativeNote côté renderer). */
  _drag: null,
  _initDrag(overlay) {
    overlay.addEventListener("pointerdown", (e) => {
      const handle = e.target.closest(".encounter-drag-handle");
      if (!handle) return;
      const row = handle.closest(".encounter-row, .encounter-nrow");
      const list = document.getElementById("encounter-list");
      if (!row || !list) return;
      e.preventDefault();
      this._drag = { row, list };
      row.classList.add("dragging");
      try {
        handle.setPointerCapture(e.pointerId);
      } catch (_) {}
      const move = (ev) => this._dragMove(ev);
      const up = (ev) => {
        try {
          handle.releasePointerCapture(ev.pointerId);
        } catch (_) {}
        document.removeEventListener("pointermove", move);
        document.removeEventListener("pointerup", up);
        document.removeEventListener("pointercancel", up);
        this._dragEnd();
      };
      document.addEventListener("pointermove", move);
      document.addEventListener("pointerup", up);
      document.addEventListener("pointercancel", up);
    });
  },
  /** Déplace la ligne saisie parmi les lignes vivantes selon la position Y du
      pointeur (comparée au milieu de chaque cible). Ne dépasse jamais le
      séparateur « hors de combat » / le pied de scène. */
  _dragMove(ev) {
    if (!this._drag) return;
    ev.preventDefault();
    const { row, list } = this._drag;
    const targets = [...list.querySelectorAll(".encounter-row:not(.down):not(.dragging), .encounter-nrow:not(.down):not(.dragging)")];
    let before = null;
    for (const t of targets) {
      const box = t.getBoundingClientRect();
      if (ev.clientY < box.top + box.height / 2) {
        before = t;
        break;
      }
    }
    if (before) {
      list.insertBefore(row, before);
    } else {
      // Après la dernière ligne vivante : juste avant le séparateur / le pied.
      const anchor =
        list.querySelector(".encounter-downsep") || list.querySelector(".encounter-scene-actions");
      if (anchor) list.insertBefore(row, anchor);
      else list.appendChild(row);
    }
  },
  _dragEnd() {
    if (!this._drag) return;
    const { list, row } = this._drag;
    row.classList.remove("dragging");
    this._drag = null;
    const ids = [...list.querySelectorAll(".encounter-row, .encounter-nrow")].map((r) => r.dataset.id);
    this.reorderByIds(ids);
  },

  /** Délégation globale, scopée au conteneur (jamais recréé — modèle
      EditModal.init() : seul le contenu de #encounter-list change). */
  init() {
    const overlay = document.getElementById("encounter-overlay");
    if (!overlay) return;

    this._initDrag(overlay);

    // K3 : le tiroir Matrice est hors de #encounter-overlay (overlay séparé,
    // cf. index.html) — Servers._wire() y pose sa propre délégation pour le
    // contenu réutilisé d'intrusionPanel ; ici seulement les actions
    // propres à Encounter (fermer, délier, lancer une CI). K6 : le même
    // contenu est aussi monté dans la colonne dockée (#encounter-matrix-dock,
    // ≥1100px) — même handler sur les deux montages, mais cette fois nichée
    // DANS #encounter-overlay (contrairement au tiroir, overlay séparé) : un
    // clic y bulle jusqu'au switch de combat plus bas (data-action homonymes,
    // ex. « next-turn » = tour d'INTRUSION ici, tour de combat là-bas). Un
    // garde-fou sur e.target ne suffit pas : Intrusion.nextTurn (via
    // Servers._wire, attaché sur ce même nœud) ré-écrit dockBody.innerHTML de
    // façon synchrone AVANT que la bulle n'atteigne #encounter-overlay,
    // détachant e.target — closest() y échouerait silencieusement. On coupe
    // donc la propagation ici, en premier (Encounter.init tourne avant
    // Servers._wire, donc ce listener est posé — et s'exécute — avant le
    // sien sur le même nœud).
    const drawerActions = (e) => {
      e.stopPropagation();
      const el = e.target.closest("[data-action]");
      if (!el) return;
      switch (el.dataset.action) {
        case "close-matrix-drawer":
          this.closeMatrixDrawer();
          break;
        case "unlink-server":
          this.unlinkServer();
          break;
        case "launch-ic":
          // K4 : « ⚔ Init » d'une CI du tiroir → elle rejoint l'ordre.
          // Les autres data-action du tiroir (next-turn, ic-box…) sont
          // gérées par la délégation de Servers._wire (contenu réutilisé).
          this.launchIC(el.dataset.id, el.dataset.k);
          break;
      }
    };
    const matrixDrawer = document.getElementById("matrix-drawer-overlay");
    if (matrixDrawer) matrixDrawer.addEventListener("click", drawerActions);
    const matrixDock = document.getElementById("encounter-matrix-dock");
    if (matrixDock) matrixDock.addEventListener("click", drawerActions);

    overlay.addEventListener("click", (e) => {
      // La poignée n'a pas de data-action propre : sans cette garde, un clic
      // dessus remonterait à .encounter-nrow (data-action="narrative-toggle")
      // et basculerait « a joué » à chaque glisser en mode narratif.
      if (e.target.closest(".encounter-drag-handle")) return;
      // K6 : les clics dans la colonne Matrice dockée n'atteignent jamais ce
      // switch — drawerActions (posé sur #encounter-matrix-dock) coupe la
      // propagation avant qu'elle ne bulle jusqu'ici (cf. son commentaire).
      const el = e.target.closest("[data-action]");
      if (!el) return;
      const id = el.dataset.id;
      switch (el.dataset.action) {
        case "encounter-close":
          this.close();
          break;
        case "roll-all-init":
          this.rollAllInit();
          break;
        case "sort-init":
          this.sortByInit();
          break;
        case "roll-and-sort":
          this.rollAndSort();
          break;
        case "toggle-add-picker":
          this.toggleAddPicker();
          break;
        case "toggle-rail": {
          // K1 : bascule réglette compacte / liste complète — état de vue
          // éphémère (comme le menu ⋯ .card-menu[hidden]), pas de nouvelle clé Storage.
          const modal = document.querySelector(".encounter-modal");
          if (modal) modal.classList.toggle("rail-expanded");
          break;
        }
        case "edge-step":
          // K5 : ±1 Atout du combattant actif (SR6).
          this.adjustEdge(id, parseInt(el.dataset.delta, 10) || 0);
          break;
        case "roll-ic":
          // K9 : jet d'une CI (attaque/défense/encaissement/perception) depuis
          // la fiche CI active ou la console de réaction — même moteur que le
          // tiroir (Intrusion.rollIC), aucun calcul de réserve dupliqué. Ces
          // boutons vivent dans #encounter-overlay (fiche active), hors de la
          // délégation #app de Servers._wire → câblés ici.
          Intrusion.rollIC(el.dataset.id, el.dataset.k, el.dataset.kind);
          break;
        case "react-expand":
          // K9 : déplie/replie la fiche complète d'un PNJ dans la console de
          // réaction (accordéon, vue éphémère). Le rendu vit au renderer ; ici,
          // aucune logique de combat.
          EncounterRenderer.toggleReactExpand(id);
          break;
        case "react-damage-toggle":
          // K8 : déplie/replie les chips de dégâts d'une ligne de réaction
          // (état de vue éphémère, comme react-expand ci-dessus).
          EncounterRenderer.toggleReactDamage(id);
          break;
        case "damage-type-toggle":
          // K8 : bascule Physique/Étourdissant (SR5/SR6 séparé) avant d'appliquer
          // un chip — vue seulement, aucune mutation du PNJ.
          EncounterRenderer.toggleDamageType(id);
          break;
        case "react-damage":
          // K8 : applique un résultat NET de dégâts (chip) au moniteur —
          // conditionMonitor.applyDamage lu via Encounter, jamais de calcul ici.
          this.damageCombatant(id, parseInt(el.dataset.n, 10) || 0, {
            type: EncounterRenderer.reactDamageType(id),
          });
          EncounterRenderer.toggleReactDamage(id, true);
          break;
        case "react-wound":
          // K8 : Anarchy 2 — un cran de gravité, pas un nombre de cases.
          this.damageCombatant(id, 1, { severity: el.dataset.sev });
          EncounterRenderer.toggleReactDamage(id, true);
          break;
        case "target-device":
          // M4 : désigne une arme comme cible matricielle (brickable).
          this.targetDevice(id, el.dataset.label);
          break;
        case "untarget-device":
          this.untargetDevice(id, el.dataset.label);
          break;
        case "device-box":
          // M4 : case du moniteur d'un appareil (SR5/SR6).
          this.deviceBox(id, el.dataset.label, parseInt(el.dataset.idx, 10) || 0);
          break;
        case "device-rating-step":
          // M4 : ±1 Indice d'appareil (patron edge-step, pas de saisie clavier).
          this.deviceRatingStep(id, el.dataset.label, parseInt(el.dataset.delta, 10) || 0);
          break;
        case "device-narrative-toggle":
          // M4 : Anarchy 2 — bascule « hors service » en un tap (régime narratif).
          this.deviceNarrativeToggle(id, el.dataset.label);
          break;
        case "device-protect": {
          // M5 : désigne le decker protecteur — lit le <select> voisin (même
          // rangée), jamais un data-* mutable au clic (valeur choisie à l'instant).
          // targetDevice d'abord (idempotent) : en narratif (A2), protéger une
          // arme peut être le tout premier geste sur elle, avant tout brickage —
          // pas de bouton "Bricker" séparé dans la bande narrative.
          const sel = el.closest(".encounter-device-protect")?.querySelector("select");
          this.targetDevice(id, el.dataset.label);
          this.setDeviceProtector(id, el.dataset.label, sel && sel.value);
          break;
        }
        case "device-unprotect":
          this.setDeviceProtector(id, el.dataset.label, null);
          break;
        case "device-defense": {
          // M5 : jet de défense protégée (SR5/SR6 : Indice + Firewall du
          // protecteur ; A2 : Protection active, Firewall+Logique). Le MJ
          // interprète/retranche avant de cliquer les cases — jamais résolu
          // ici, même philosophie que le reste du cockpit.
          const pnj = PnjLookup.find(id);
          const c = this._find(id);
          const d = c && c.devices && c.devices[el.dataset.label];
          const protector = d && d.protectorId && PnjLookup.find(d.protectorId);
          if (!pnj || !d || !protector) break;
          const mode = Matrix.use(pnj.edition).deviceBricking();
          const roll =
            mode === "narrative"
              ? Cyberdeck.rollProtectActive(protector)
              : Cyberdeck.rollDefense(d.indice, protector.cyberdeck);
          const res = Dice.computeRoll(this._noisyPool(roll.pool));
          DiceRoller.show(res, { label: `${roll.label} — ${protector.name} protège ${pnj.name}`, who: protector.name });
          break;
        }
        case "decker-attack": {
          // M5 : decker↔decker — attaquer un autre decker, c'est attaquer son
          // propre pnj.cyberdeck (déjà modélisé M2). Aucune donnée neuve : le
          // MJ encaisse en cliquant les cases du moniteur du decker CIBLÉ,
          // déjà affiché sur sa propre carte (toggle-deck-monitor, M2).
          const sel = el.closest(".encounter-duel")?.querySelector("select");
          const targetId = sel && sel.value;
          const pnj = PnjLookup.find(id);
          const target = targetId && PnjLookup.find(targetId);
          const atk = pnj && Cyberdeck.rollAttack(pnj.edition, pnj.cyberdeck);
          if (!target || !atk) break;
          const res = Dice.computeRoll(this._noisyPool(atk.pool));
          DiceRoller.show(res, { label: `${atk.label} — ${pnj.name} vs ${target.name} (decker)`, who: pnj.name });
          break;
        }
        case "noise-step":
          // M6 : ±1 Bruit (SR5 p.232) — modificateur de scène réglé à la
          // main (distance/environnement non trackés par l'app).
          this.stepNoise(parseInt(el.dataset.delta, 10) || 0);
          break;
        case "action-set":
          // K7 : consomme/rend une action du tour actif (jeton tappable).
          this.setAction(id, el.dataset.key, parseInt(el.dataset.idx, 10) || 0);
          break;
        case "threat-step":
          // K5 : ±1 Réserve de menace (Anarchy) — mute la source unique
          // DiceRoller (le badge topbar et le miroir cockpit se synchronisent).
          DiceRoller.stepThreat(parseInt(el.dataset.delta, 10) || 0);
          break;
        case "threat-reset":
          DiceRoller.resetThreat();
          break;
        case "add-candidate":
          this.add(id);
          this._renderPicker();
          break;
        case "add-pj":
          this.addPJ();
          break;
        case "add-team":
          this.addTeam();
          break;
        case "link-server":
          // K3, porte 1 (picker) : lie un serveur à la scène, remplace
          // aucun combattant — même panneau, destination différente.
          this.linkServer(id);
          this._renderPicker();
          break;
        case "toggle-matrix-drawer":
          this.toggleMatrixDrawer();
          break;
        case "next-turn":
          this.nextTurn();
          break;
        case "next-round":
          this.nextRound();
          break;
        case "clear-encounter":
          this.clear();
          break;
        case "narrative-toggle": {
          // Ligne narrative : tap = bascule « a joué » (grise / rallume).
          const c = this._find(id);
          if (c) this.markActed(id, !c.hasActed);
          break;
        }
        case "toggle-acted": {
          // Ordonné : bascule « a joué » depuis le menu ⋯ (jeton ✓/↩). La
          // case à cocher native a été retirée (elle sur-pondérait une action
          // rare, déjà automatisée par « Tour suivant ») ; le grisé de ligne
          // reste l'indicateur passif. Bouton → switch click (plus la branche
          // 'change' de l'ancienne checkbox).
          const c = this._find(id);
          if (c) this.markActed(id, !c.hasActed);
          break;
        }
        case "init-step":
          // Stepper ±1 de l'initiative (Vague B).
          this.adjustInit(id, parseInt(el.dataset.delta, 10) || 0);
          break;
        case "note-toggle": {
          // Révèle le champ de note (masqué quand vide) et y met le focus.
          const row = el.closest(".encounter-row");
          if (row) {
            row.classList.add("note-open");
            const inp = row.querySelector(".encounter-note");
            if (inp) inp.focus();
          }
          break;
        }
        case "roll-init":
          this.rollInit(id);
          break;
        case "move-up":
          this.moveUp(id);
          break;
        case "move-down":
          this.moveDown(id);
          break;
        case "remove-combatant":
          this.remove(id);
          break;
        case "flee-combatant":
          // Raccourci du drapeau « devrait fuir » : bascule hors de combat en
          // un tap (comme knockOut), réversible — pas un retrait définitif
          // (issue #60 : le combattant qui fuit sort de la mêlée, il n'est
          // pas rayé de la scène).
          this.knockOut(id);
          break;
        case "heal-combatant":
          this.healCombatant(id);
          break;
        case "knockout-combatant":
          this.knockOut(id);
          break;
        case "delay-combatant":
          this.delayCombatant(id);
          break;
        case "act-now-combatant":
          this.actNow(id);
          break;
        case "heal-all":
          this.healAll();
          break;
        case "focus-combatant":
          this.focusCombatant(id);
          break;
      }
    });

    overlay.addEventListener("change", (e) => {
      // Initiative saisie inline dans la ligne (remplace l'ancien prompt) :
      // 'change' plutôt que 'input' — la valeur n'est committée qu'au blur/
      // Entrée, donc le re-rendu de _commit ne casse pas la frappe en cours.
      // (« a joué » ne passe plus par ici : c'est un bouton du switch click,
      // plus une checkbox.)
      const init = e.target.closest('[data-action="set-init"]');
      if (init) this.setInit(init.dataset.id, init.value);
    });

    // E2 : rafale d'init après « + Équipe » — Entrée commit (blur → 'change'
    // ci-dessus, synchrone) puis enchaîne sur le prochain champ d'init PJ
    // vide (setTimeout 0 : laisse _commit()/_render() reconstruire le DOM
    // avant de chercher le prochain champ).
    overlay.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      const input = e.target.closest('.encounter-init-val[data-pj="1"]');
      if (!input) return;
      e.preventDefault();
      input.blur();
      setTimeout(() => EncounterRenderer.focusNextPJInit(), 0);
    });

    overlay.addEventListener("input", (e) => {
      const note = e.target.closest('[data-action="set-note"]');
      if (note) {
        this.setNote(note.dataset.id, note.value);
        // K2 : la même note existe en double (ligne dépliée + fiche active) —
        // on garde l'autre champ en phase sans re-rendu complet (qui casserait
        // le focus/curseur de la saisie en cours, cf. setNote).
        document
          .querySelectorAll(`[data-action="set-note"][data-id="${note.dataset.id}"]`)
          .forEach((el) => {
            if (el !== note) el.value = note.value;
          });
        return;
      }
      const filter = e.target.closest('[data-action="filter-candidates"]');
      if (filter) EncounterRenderer.filterCandidates(filter.value);
    });

    // Raccourcis clavier du tracker (CH-Q3), actifs seulement overlay ouvert.
    // En capture pour passer AVANT les raccourcis globaux d'app.js — sinon
    // « r » y déclenche le lanceur de dés au lieu de relancer l'init.
    // Garde-fous : jamais pendant une saisie (champ init/note) ni quand un
    // Dialog est ouvert par-dessus. Échap n'est pas capté ici : il retombe
    // sur le handler global d'app.js, qui ferme l'overlay.
    document.addEventListener(
      "keydown",
      (e) => {
        if (!overlay.classList.contains("open")) return;
        const tag = (e.target.tagName || "").toLowerCase();
        if (tag === "input" || tag === "textarea" || tag === "select") return;
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        const dlg = document.getElementById("dialog-overlay");
        if (dlg && dlg.classList.contains("open")) return;

        let handled = true;
        switch (e.key) {
          case " ":
          case "n":
          case "N":
            this.nextTurn();
            break;
          case "r":
          case "R":
            this.rollAndSort();
            break;
          case "ArrowUp":
            this.moveActive(-1);
            break;
          case "ArrowDown":
            this.moveActive(1);
            break;
          default:
            handled = false;
        }
        if (handled) {
          e.preventDefault();
          e.stopImmediatePropagation();
        }
      },
      true,
    );
  },
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => Encounter.init());
} else {
  Encounter.init();
}
