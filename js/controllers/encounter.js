"use strict";

/* ============================================================
   ENCOUNTER — tracker de combat (initiative, tours, rounds)
   Une seule scène active par édition, persistée par EncounterStore
   (js/core/) — ce fichier ne connaît plus ni clé ni format.
   Ne stocke que des pnjId ; les PNJ résident dans leurs pools
   d'origine (Gen.pool / Shadows / Servers) et sont résolus via
   PnjLookup à chaque rendu. Le rendu (pur) est délégué à
   EncounterRenderer.
   ============================================================ */
import { Actions } from "../rules/actions.js";
import { Ammo } from "../rules/ammo.js";
import { AnarchyAtouts } from "../rules/anarchyatouts.js";
import { CardPeek } from "../widgets/card/cardpeek.js";
import { CardRenderer } from "../widgets/card/cardrenderer.js";
import { ChaseRenderer } from "../widgets/play/chaserenderer.js";
import { Characters } from "./characters.js";
import { Dialog } from "../widgets/kit/dialog.js";
import { Dice } from "../rules/dice.js";
import { EdgeActions } from "../rules/edgeactions.js";
import { EncounterStore } from "../core/encounterstore.js";
import { DiceRoller } from "../widgets/dice/diceroller.js";
import { EncounterRenderer } from "../widgets/play/encounterrenderer.js";
import { FocusTrap } from "../widgets/kit/focustrap.js";
import { Gen } from "./generator.js";
import { Intrusion } from "./intrusion.js";
import { ItemResolver } from "../rules/itemresolver.js";
import { Matrix } from "../rules/matrix.js";
import { Nudge } from "../widgets/tour/nudge.js";
import { DeckRun } from "./deckrun.js";
import { PnjLookup } from "./pnjlookup.js";
import { Pursuit } from "./pursuit.js";
import { Servers } from "./servers.js";
import { Shadows } from "./shadows.js";
import { Statuses } from "../rules/statuses.js";
import { UI } from "../widgets/kit/ui.js";
import { Utils } from "../core/utils.js";
import { WeaponRoll } from "../rules/weaponroll.js";

export const Encounter = {
  /** J3 (journal des jets) : incrémenté à chaque scène fraîche (_empty),
      pour distinguer deux combats séparés qui repartiraient chacun au round
      1 — sinon leurs jets fusionneraient dans le même groupe « Tour 1 » du
      journal. Session only (pas persisté) : un F5 en plein combat ouvre un
      nouveau groupe visuel, effet de bord mineur accepté (pas de perte de
      données, juste un en-tête de plus). */
  _sceneSeq: 0,
  _empty() {
    this._sceneSeq++;
    return EncounterStore.emptyScene();
  },

  state: null,

  /* ---- Persistance : le FORMAT appartient à EncounterStore (couche 1) ;
     ce qui reste ici est l'orchestration — rendu, fiche active, focus. ---- */
  load() {
    this.state = EncounterStore.readScene() || this._empty();
    // La sidebar doit refléter la scène dès le chargement de l'édition, pas
    // seulement à l'ouverture du tracker — reset de la fiche active d'une
    // édition à l'autre (les pnjId ne collisionnent jamais entre éditions,
    // c'est une garde défensive plutôt qu'un cas réel).
    EncounterRenderer.resetActiveCard();
    // Focus narratif : re-synchronise l'état en mémoire d'EncounterRenderer
    // depuis la scène persistée (survit à un F5, et c'est aussi la valeur
    // que l'écran spectateur lit via Storage — cf. focus-active plus bas).
    EncounterRenderer._narrativeFocusId = this.state.focusId || null;
    // Le panneau d'ajout est un nœud statique : sans ce nettoyage, sa liste
    // de candidats (dont les serveurs) survivait au changement d'édition
    // (D3, CODIR 2026-09-03). On repart neutre, quelle que soit l'édition.
    this._pickerHadCandidates = false;
    EncounterRenderer.clearPicker();
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
    EncounterStore.writeScene(this.state);
  },

  _find(pnjId) {
    return this.state.combatants.find((c) => c.pnjId === pnjId) || null;
  },

  /** Initiative pré-remplie depuis le bloc « mécanique de table » d'un
      PJ léger (`pnj.initBase`, saisi une fois en début de campagne) — le MJ
      écrase à la volée, les joueurs annoncent, l'app propose. `null` pour
      toute entité sans ce champ (PNJ générés, PJ sans bloc renseigné). */
  _initFor(pnjId) {
    const pnj = PnjLookup.find(pnjId);
    return pnj && Number.isFinite(pnj.initBase) ? pnj.initBase : null;
  },

  /* ---- Composition de la scène ---- */
  /** `silent` : ajoute SANS toast, pour un appelant qui porte déjà son propre
      retour. Il n'y a qu'un seul élément `#toast` et chaque appel écrase le
      précédent (utils.js) — deux retours coup sur coup, c'est le premier perdu.
      Utilisé par l'invocation (B1.3), dont le toast annonce déjà les services. */
  add(pnjId, { silent = false } = {}) {
    if (!pnjId || this._find(pnjId)) return false;
    this.state.combatants.push({ pnjId, init: this._initFor(pnjId), hasActed: false, note: "" });
    this._commit();
    if (!silent) toast("Ajouté au suivi de combat.");
    return true;
  },

  /** Ajout groupé : dédup, UN seul commit + UN seul toast. */
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

  /** PJ : un PJ ajouté depuis le tracker persiste désormais dans
      `Characters` (PJ léger, `Characters.addLight`) au lieu de rester
      jetable — même id que la bibliothèque, résolu par `PnjLookup` comme
      n'importe quelle entité. `kind:"pj"` reste posé pour la rétro-compat
      des scènes déjà persistées avec un `pnjId` synthétique `pj-…` (ces
      combattants-là restent lus tels quels, cf. `_rows()`/`_isPJ()`) et
      pour distinguer visuellement la ligne sans dépendre de `Characters`.
      Saisie du nom via le Dialog interne (jamais de prompt() natif). */
  async addPJ() {
    const saisie = await Dialog.prompt({
      title: "Ajouter un ou plusieurs PJ",
      label: "Nom du PJ — séparez par une virgule pour en ajouter plusieurs",
      placeholder: "Kestrel, Rook, Vega…",
      confirmLabel: "Ajouter",
    });
    if (saisie === null) return;
    // B3.6 (C-005) — TOUTE LA TABLE EN UN GESTE. Mesuré par l'audit : 3 gestes
    // par PJ (ouvrir, saisir, valider), soit 22 pour les 7 PJ d'une scène dense,
    // contre UNE interaction pour mettre 12 PNJ générés en piste. Le raccourci
    // « ＋ Équipe » existait déjà mais suppose une équipe constituée ailleurs :
    // invisible pour une première scène, donc sans effet le jour où ça compte.
    //
    // Une virgule suffit — pas de second champ, pas de modale à étages. Un nom
    // vide (double virgule, virgule finale) est ignoré plutôt que de créer un PJ
    // sans nom ; les doublons ne sont pas dédupliqués, deux joueurs peuvent
    // légitimement annoncer le même surnom et c'est au MJ de trancher, pas à
    // l'app. UN seul commit pour toute la fournée (la liste ne se reconstruit
    // pas N fois), et le curseur atterrit sur le premier champ d'init vide.
    const noms = saisie
      .split(",")
      .map((n) => n.trim())
      .filter(Boolean);
    if (!noms.length) return;
    let ajoutes = 0;
    for (const nom of noms) {
      const pnj = Characters.addLight(nom);
      if (!pnj) continue;
      this.state.combatants.push({
        pnjId: pnj.id,
        kind: "pj",
        init: null,
        hasActed: false,
        note: "",
      });
      ajoutes++;
    }
    if (!ajoutes) return;
    this._commit();
    if (ajoutes > 1) toast(`${ajoutes} PJ ajoutés — annoncez vos initiatives.`);
    // B3.5 (C-002) — « l'initiative de table », sans nouvelle machinerie. Le
    // dossier demandait un second champ dans la modale d'ajout ; `Dialog.prompt`
    // n'en porte qu'un et son retour est une CHAÎNE, partagé par toutes les
    // modales de l'app — l'étendre pour ce lot aurait modifié un primitif commun
    // au lieu d'utiliser celui qui existe. Le dépôt a déjà le bon geste, écrit
    // pour la rafale de « ＋ Équipe » : on pose le curseur dans le champ d'init
    // du PJ qu'on vient de créer. Le joueur annonce, le MJ tape, rien à écraser.
    EncounterRenderer.focusNextPJInit();
  },

  /** #17 : combattant ad-hoc jetable — une ligne « nom + compteur libre »
      (garde-fou (b) : le combattant qui n'est pas un combattant, ex. « ALARME »,
      « la bombe », des renforts). Contrairement à `addPJ`, il ne persiste RIEN
      dans `Characters` : le `pnjId` synthétique `adhoc-…` ne résout jamais dans
      `PnjLookup`, donc `_rows()` (l.~1009) le synthétise en `{ name, _adhoc:true }`
      — ligne inerte sans fiche (`encounterrenderer._row`), champ d'init éditable
      servant de compteur libre. Le nom est un champ additif du combattant, lu
      défensivement au reload (aucun `SCHEMA_VERSION`). */
  async addAdhoc() {
    const name = await Dialog.prompt({
      title: "Ajouter une ligne libre",
      label: "Nom",
      placeholder: "ALARME, la bombe, renforts…",
      confirmLabel: "Ajouter",
    });
    if (name === null || !name.trim()) return;
    this.state.combatants.push({
      pnjId: "adhoc-" + Utils.uid(),
      name: name.trim(),
      init: null,
      hasActed: false,
      note: "",
    });
    this._commit();
  },

  /** VIS-10 — flux d'ajout d'une CI AUTONOME au suivi (deux dialogues :
      type de CI, puis indice). Rend natif le détournement quasi universel
      « PJ ad-hoc nommé CI NOIRE » : la CI devient une combattante de plein
      droit (init du livre, moniteur, jets) sans monter de serveur. La
      Patrouilleuse est écartée du choix — elle veille, n'attaque pas et ne
      rejoint pas l'ordre d'init (cf. `Intrusion.nextTurn`). */
  async promptAddIC() {
    const M = Matrix.use(App.edition);
    const opts = Object.entries(M.icCatalog())
      .filter(([, ic]) => !ic.watch)
      .map(([value, ic]) => ({ value, label: ic.label, danger: value === "noire" }));
    if (!opts.length) return;
    const icKey = await Dialog.choose({
      title: "Ajouter une CI",
      message: "Quelle contre-mesure rejoint le combat ?",
      options: opts,
    });
    if (!icKey) return;
    const [min, max] = M.indiceRange();
    const def = Math.round((min + max) / 2);
    const raw = await Dialog.prompt({
      title: "Indice de la CI",
      label: `Indice du serveur (${min}–${max})`,
      value: String(def),
      placeholder: String(def),
      confirmLabel: "Ajouter",
    });
    if (raw === null) return;
    const indice = Utils.clamp(parseInt(raw, 10) || def, min, max);
    this.addIC(icKey, indice);
  },

  /** Instancie une CI autonome dans le suivi. Contrairement à `launchIC`
      (CI liée à un serveur, état vivant dans `state.matrix[serverId]`), l'état
      vivant d'une CI autonome — indice + moniteur — vit sur `c.matrix`
      (`serverId: null`). Init du livre via `icCombatant` (module d'édition,
      prohibition n°1), serveur synthétisé par `Matrix.bareHost`. Doublons
      autorisés (deux CI Noires dans un même duel) : chaque ligne a son id. */
  addIC(icKey, indice) {
    const M = Matrix.use(App.edition);
    const ic = M.icCatalog()[icKey];
    if (!ic) return;
    const host = M.bareHost(indice);
    const spec = App.editionModule.icCombatant(ic, host);
    if (!spec) return;
    const c = {
      pnjId: "ic-" + Utils.uid(),
      name: spec.name,
      kind: "matrix",
      init: null,
      hasActed: false,
      note: "",
      matrix: {
        serverId: null,
        icKey,
        edition: App.edition,
        indice: host.indice,
        initBase: spec.initBase ?? null,
        initDice: spec.initDice ?? null,
        dmg: 0,
        down: false,
      },
    };
    if (!spec.narrative && spec.initBase != null) {
      c.init = Dice.computeInitiative(spec.initBase, spec.initDice).total;
    }
    this._insertByInit(c);
    this._commit();
    toast(`${spec.name} rejoint le suivi de combat.`);
  },

  /** « + Équipe » — l'équipe active (Characters.activeTeamMembers,
      tous les PJ par défaut) rejoint la scène en un geste ; les membres déjà
      présents sont ignorés (même règle que _candidates()). Un PJ one-shot
      inconnu de l'équipe passe par « Ajouter un PJ », juste à côté.
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

  /** B1.4 (C-007) — le retrait est ANNULABLE. Sans filet, un retrait par erreur
      obligeait à ré-ajouter le combattant, et le ré-ajout repart de `_initFor`
      (donc de `initBase`, ou de rien pour un PNJ généré) : **le score lancé était
      perdu** et devait être ressaisi en pleine scène. On remet donc l'entrée
      COMPLÈTE — `init`, `hasActed`, `note` — à sa place dans l'ordre, et on rend
      aussi le `turnIndex` d'avant : annuler doit rendre la scène telle quelle, pas
      un combattant approchant dont c'est le tour de quelqu'un d'autre.

      `silent` : retire sans toast ni annulation, pour un appelant dont le retrait
      n'est PAS réversible. C'est le cas du renvoi d'esprit
      (`SummonPanel._finishDismiss`), qui a déjà supprimé la fiche : proposer
      « Annuler » y remettrait en piste une entité sans carte. */
  remove(pnjId, { silent = false } = {}) {
    const idx = this.state.combatants.findIndex((c) => c.pnjId === pnjId);
    if (idx === -1) return;
    const [retire] = this.state.combatants.splice(idx, 1);
    const tourAvant = this.state.turnIndex;
    const max = Math.max(0, this.state.combatants.length - 1);
    if (this.state.turnIndex > idx) this.state.turnIndex--;
    this.state.turnIndex = Utils.clamp(this.state.turnIndex, 0, max);
    this._commit();
    if (silent) return;
    const nom = PnjLookup.find(pnjId)?.name || retire.name || "Combattant";
    toastUndo(`${nom} retiré du suivi.`, () => {
      // Ré-ajouté à la main entre-temps : ne pas le dédoubler.
      if (this._find(pnjId)) return;
      this.state.combatants.splice(Math.min(idx, this.state.combatants.length), 0, retire);
      this.state.turnIndex = Utils.clamp(tourAvant, 0, Math.max(0, this.state.combatants.length - 1));
      this._commit();
    });
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

  /* ---- Rencontre persistante (R1, PLAN_RANGER_LA_RUN.md) — le rangement
     lui-même vit dans EncounterStore ; ici seulement ce qui touche la scène
     vivante, le pointeur de session et le rendu. ---- */

  /** Rencontre actuellement ouverte (session, pas persisté) — pointeur léger
      lu par DiceLog.record (R3) pour taguer les jets. `null` hors rencontre :
      la scène « mono-active » reste utilisable sans jamais être rattachée à
      un dossier (usage historique, pas de régression). */
  activeDossierId: null,

  /** Fermer la rencontre : snapshot de la scène active dans le slot du
      dossier, puis remise à vide (sans confirmation — c'est un rangement,
      pas une suppression : le bundle reste récupérable via `restore`). */
  stash(dossierId) {
    if (!dossierId) return;
    EncounterStore.writeBundle(dossierId, this.state);
    this.state = this._empty();
    if (this.activeDossierId === dossierId) this.activeDossierId = null;
    // Miroir vers la scène vivante d'App.context (persistée).
    if (typeof App !== "undefined" && App.context) App.context.setScene(this.activeDossierId);
    this._commit();
  },

  /** Ouvrir la rencontre : restaure le bundle du dossier dans le tracker
      (round/pass/turnIndex/combatants/serverId à l'identique). Un dossier
      sans bundle restaure une scène vide plutôt que d'échouer. */
  restore(dossierId) {
    if (!dossierId) return;
    this.state = EncounterStore.readBundle(dossierId) || this._empty();
    this.activeDossierId = dossierId;
    // Miroir vers la scène vivante d'App.context (persistée) → survit au reload.
    if (typeof App !== "undefined" && App.context) App.context.setScene(dossierId);
    EncounterRenderer.resetActiveCard();
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
      saute pas (le tri reste explicite : ⚄ Lancer & classer). Départ à
      0 si aucune init posée. Jamais négatif. */
  adjustInit(pnjId, delta) {
    const c = this._find(pnjId);
    if (!c) return;
    const base = Number.isFinite(c.init) ? c.init : 0;
    c.init = Math.max(0, base + delta);
    this._commit();
  },

  /** Défense totale (SR5/SR6) déclarée pour le round courant. La règle vit dans
      le module (`fullDefenseFor` : +Volonté à la défense, coût d'init par
      édition) — jamais une branche ici. Le coût d'initiative est MOTORISÉ via
      adjustInit (le −10 SR5 rentre dans le score). Déclaration à sens unique et
      idempotente par round : re-cliquer ne re-décrémente pas l'init. Le drapeau
      `fullDefenseRound` sur le combattant est persistant (survit à un reload)
      et « s'éteint » seul au round suivant (round ≠ fullDefenseRound), sans
      migration : un état ancien sans le champ = simplement pas en défense totale. */
  fullDefense(pnjId) {
    const c = this._find(pnjId);
    if (!c || c.fullDefenseRound === this.state.round) return;
    const pnj = PnjLookup.find(pnjId);
    const mod = pnj && App.getEditionModule(pnj.edition);
    const fd = mod && mod.fullDefenseFor ? mod.fullDefenseFor(pnj) : null;
    if (!fd) return;
    // PORTE D'INITIATIVE (SR5 p.170, contrat `initGate`) : une action
    // d'interruption n'est permise QUE si le score d'initiative dépasse
    // STRICTEMENT son coût — à 10 pile, la Défense totale est refusée. On
    // refuse donc au lieu de laisser adjustInit ramener le score à 0 (le
    // clamp de adjustInit est juste pour le stepper ±1 à la main, il ne
    // devait pas servir à appliquer une règle). Le score comparé est celui
    // de la PASSE COURANTE, pas la base : c'est lui qui dit si le combattant
    // a encore de quoi payer.
    if (fd.initGate && fd.initCost > 0 && !this._porteInterruption(c, pnj, fd)) return;
    c.fullDefenseRound = this.state.round;
    // COÛT EN ACTION (SR6 p.45/48, contrat `actionCost`) : la Défense totale
    // y est une action MAJEURE. La note du module le disait déjà, le budget ne
    // le débitait pas. Miroir exact de SR5, qui la paie en initiative et pas
    // en phase d'action (p.170 : les interruptions « ne coûtent pas leur phase
    // d'action ») → actionCost null là-bas, aucun jeton touché.
    const over = fd.actionCost ? this._consumeAction(c, fd.actionCost, pnj) : false;
    // initCost > 0 (SR5) : adjustInit re-commit (save + rendu). initCost 0
    // (SR6) : pas de coût d'init, mais persister le drapeau + re-rendre le +Volonté.
    if (fd.initCost > 0) this.adjustInit(pnjId, -fd.initCost);
    else this._commit();
    const cout = fd.initCost
      ? ` (−${fd.initCost} init)`
      : fd.actionCost
        ? ` (${over ? "budget dépassé — " : ""}1 ${fd.actionCost.key === "major" ? "majeure" : fd.actionCost.key})`
        : "";
    toast(`${fd.label} — ${pnj.name}${cout}`);
  },

  /* ========================================================
     POSE D'ÉTAT DE GROUPE (lot E6) — un état, plusieurs PNJ.
     ======================================================== */

  /** Les combattants qui peuvent RECEVOIR un état, avec les clés que leur
      édition connaît. Écarte ce qui n'a pas de fiche (PJ ad-hoc) et les CI
      matricielles — garde-fou (b) : le « combattant qui n'est pas un
      combattant » reste un nom et un compteur libre. */
  groupStatusTargets() {
    return this.state.combatants
      .filter((c) => c.kind !== "matrix")
      .map((c) => ({ c, pnj: PnjLookup.find(c.pnjId) }))
      .filter((x) => x.pnj && !x.pnj._adhoc && Statuses.catalog(x.pnj).length)
      .map((x) => ({
        pnjId: x.pnj.id,
        name: x.pnj.name,
        keys: Statuses.catalog(x.pnj).map((s) => s.key),
      }));
  },

  /** Le bouton de scène n'existe que s'il a un sens : au moins DEUX cibles
      capables de porter un état. À une seule, la feuille de la fiche suffit et
      un second chemin ne ferait qu'ajouter une décision. */
  groupStatusAvailable() {
    return this.groupStatusTargets().length >= 2;
  },

  /** Ouvre la pose de groupe. Le catalogue proposé est l'UNION de ce que les
      cibles connaissent — une scène peut mêler des éditions, et le panneau
      désactive ensuite les cibles qui ignorent l'état choisi plutôt que de
      masquer l'état. */
  openGroupStatus() {
    const cibles = this.groupStatusTargets();
    if (!cibles.length) return;
    const vues = new Set();
    const catalogue = [];
    for (const t of cibles) {
      const pnj = PnjLookup.find(t.pnjId);
      for (const s of Statuses.catalog(pnj)) {
        if (vues.has(s.key)) continue;
        vues.add(s.key);
        catalogue.push(s);
      }
    }
    // Les états d'accès direct d'abord, le reste ensuite — même hiérarchie que
    // la feuille unitaire, pour que le MJ retrouve ses repères.
    catalogue.sort((a, b) => (b.quick ? 1 : 0) - (a.quick ? 1 : 0));
    // B3.3 — la présélection est calculée ICI et passée au rendu : le renderer
    // reste pur (il reçoit des données résolues, il ne lit jamais l'état de scène).
    // Une zone d'effet touche presque toujours ceux qu'on vient de faire encaisser.
    const frais = new Set(
      this.state.combatants.filter((c) => c.hurtRound === this.state.round).map((c) => c.pnjId),
    );
    EncounterRenderer.openGroupStatusPanel(
      cibles,
      catalogue,
      cibles.filter((t) => frais.has(t.pnjId)).map((t) => t.pnjId),
    );
  },

  /** Applique l'état choisi aux cibles cochées, au niveau I. Le niveau se
      monte ensuite PNJ par PNJ sur leur puce : une fumigène aveugle tout le
      monde pareil, mais la suite est individuelle. */
  applyGroupStatus(key, ids) {
    if (!key || !ids || !ids.length) return;
    const pnjs = ids.map((id) => PnjLookup.find(id)).filter(Boolean);
    const n = Statuses.setMany(pnjs, key, 1);
    if (!n) return;
    Shadows.save();
    for (const pnj of pnjs) CardRenderer.refresh(pnj);
    EncounterRenderer._activeCardId = null;
    this._render();
    const nom = (Statuses.find(pnjs[0], key) || {}).name || key;
    toast(`${nom} — posé sur ${n} PNJ.`);
  },

  /* ========================================================
     ACTIONS D'INTERRUPTION (lot E4) — SR5 p.169-170, la 4ᵉ catégorie.
     ======================================================== */

  /** LA PORTE, commune à toutes les interruptions. Deux verrous du livre,
      dans l'ordre où il les pose :
        1. « uniquement si son score d'initiative est SUPÉRIEUR au coût » —
           strictement, donc à 10 pile la Défense totale est refusée. Le score
           comparé est celui de la PASSE COURANTE (`_passInit`), pas la base :
           c'est lui qui dit ce que le combattant peut encore payer.
        2. « ne peut pas utiliser une action d'interruption avant sa première
           phase d'action que s'il n'est pas SURPRIS » — l'état, posé par le MJ
           au lot E1, ferme donc la porte ici. C'est le premier endroit où la
           table des états et la table des actions se parlent, et ce n'est pas
           un hasard : le livre les a écrites liées.
      Renvoie true si l'action est permise. Refuse EN LE DISANT — un bouton qui
      ne fait rien sans expliquer est pire qu'un bouton absent. */
  _porteInterruption(c, pnj, action) {
    const mod = App.getEditionModule(pnj.edition);
    const bloquant = mod && mod.interruptBlockedBy;
    if (bloquant && Statuses.level(pnj, bloquant) > 0 && !c.hasActed) {
      const nom = (Statuses.find(pnj, bloquant) || {}).name || bloquant;
      toast(`${action.label} impossible — ${pnj.name} est ${nom} et n'a pas encore joué (p.169).`);
      return false;
    }
    const score = this._passInit(c);
    if (score <= action.initCost) {
      toast(`${action.label} impossible — ${pnj.name} n'a que ${score} en initiative (coût ${action.initCost}).`);
      return false;
    }
    return true;
  },

  /** Interruptions DISPONIBLES pour un combattant, avec ce qui les bloque —
      lecture pure, faite pour que la feuille de choix affiche des options
      honnêtes plutôt qu'un catalogue dont la moitié échoue au clic. */
  interruptOptions(pnjId) {
    const c = this._find(pnjId);
    const pnj = PnjLookup.find(pnjId);
    const mod = pnj && App.getEditionModule(pnj.edition);
    if (!c || !mod || !mod.interruptActions) return [];
    const score = this._passInit(c);
    const bloquant = mod.interruptBlockedBy;
    const surpris = bloquant && Statuses.level(pnj, bloquant) > 0 && !c.hasActed;
    // F6b — `when` : l'interruption qui exige une CAPACITÉ ne se propose qu'à
    // qui l'a. « Défense contre sorts » s'affichait à tout le monde, dans une
    // feuille de neuf puces où chacune coûte à lire. Une entrée sans `when`
    // reste offerte à tous, comme avant — Bloquer et Esquiver n'exigent rien.
    // Le filtre passe AUSSI par ici et pas seulement à l'affichage : c'est le
    // point unique que `useInterrupt` doit partager, sinon la porte fermée à
    // l'écran resterait ouverte au clavier.
    return mod
      .interruptActions(pnj)
      .filter((a) => !a.when || a.when(pnj))
      .map((a) => ({
        ...a,
        score,
        abordable: !surpris && score > a.initCost,
        surpris: !!surpris,
      }));
  },

  /** Déclare une interruption AUTRE que la Défense totale (qui garde son
      bouton ⛨ dédié, cf. `ownControl`). Applique la porte, débite le score
      d'initiative — « la réduction se produit au moment où l'action a lieu »
      (p.169) — et ne touche AUCUN jeton de budget : une interruption « ne
      coûte pas sa phase d'action ». */
  useInterrupt(pnjId, key) {
    const c = this._find(pnjId);
    const pnj = PnjLookup.find(pnjId);
    const mod = pnj && App.getEditionModule(pnj.edition);
    if (!c || !mod || !mod.interruptActions) return;
    // F6b — LA MÊME LISTE QUE L'AFFICHAGE, `when` compris. Relire
    // `interruptActions` brut rouvrirait au clavier la porte que le rendu vient
    // de fermer : `interruptOptions` est le point unique, ici comme là-bas.
    const action = this.interruptOptions(pnjId).find((a) => a.key === key);
    if (!action) return;
    if (action.key === "fullDefense") return this.fullDefense(pnjId); // son propre chemin
    if (!this._porteInterruption(c, pnj, action)) return;
    this.adjustInit(pnjId, -action.initCost);
    toast(`${action.label} — ${pnj.name} (−${action.initCost} init)`);
  },

  /* ========================================================
     AJUSTER (lot F5p) — le seul bonus d'action que le livre chiffre.

     Le cumul vit dans la scène (`c.aim`), comme le chargeur et l'Atout : c'est
     un fait de rencontre, pas une propriété du personnage. Trois moments —
     il MONTE (`_trackAim`), il se CASSE (ici et `_resetActions`), il se
     CONSOMME (`resolveAttack`).
     ======================================================== */

  /** Suit le cumul d'Ajuster après CHAQUE action jouée. Trois branches, et
      chacune est une phrase du livre :

      · l'action EST Ajuster → un cran de plus, plafonné (`Actions.aimMax`),
        et SR6 la limite à un seul par round (`oncePerRound`) ;
      · l'édition casse le cumul sur toute autre action (SR5,
        `breaksOnOtherAction`) → remise à zéro ;
      · sinon on ne touche à rien : SR6 laisse le bonus traverser les rounds
        tant que le personnage vise ou attaque.

      ⚠ L'ATTAQUE ne casse pas le cumul ici — elle le CONSOMME dans
      `resolveAttack`, après que le jet en a bénéficié. L'ordre compte : casser
      d'abord reviendrait à annuler le bonus juste avant de s'en servir. */
  _trackAim(c, pnj, key) {
    const m = Actions.aimModel(pnj);
    if (!m) return;
    if (key === m.key) {
      const max = Actions.aimMax(pnj);
      const plafondTour = m.oncePerRound && c.aimRound === this.state.round;
      if (plafondTour) {
        toast(`Ajuster : déjà pris ce round (${m.page}).`, "warning");
        return;
      }
      if ((c.aim || 0) >= max) {
        toast(`Ajuster : plafond atteint (${max} — ${m.maxLabel}).`, "warning");
        return;
      }
      c.aim = (c.aim || 0) + 1;
      if (m.oncePerRound) c.aimRound = this.state.round;
      return;
    }
    // L'action hôte de l'attaque ne compte pas comme « autre action » : c'est
    // elle qui va dépenser le bonus. Les clés d'attaque sont celles que
    // l'édition marque `viaWeapon`.
    if (!m.breaksOnOtherAction || !c.aim) return;
    const attaque = Actions.viaWeapon(pnj).some((a) => a.key === key);
    if (attaque) return;
    delete c.aim;
  },

  /** Le bonus d'Ajuster ACCUMULÉ, prêt à être ajouté au jet : `{ n, dice,
      accuracy }`, ou null. Lu par les surfaces qui affichent une réserve
      d'attaque — donc une seule source pour la fiche, le cockpit et le jet. */
  aimBonus(pnjId) {
    const c = this._find(pnjId);
    const pnj = PnjLookup.find(pnjId);
    const m = pnj && Actions.aimModel(pnj);
    if (!c || !m || !c.aim) return null;
    return { n: c.aim, dice: c.aim * (m.dice || 0), accuracy: c.aim * (m.accuracy || 0) };
  },

  /** DÉFENSES MULTIPLES (SR5 p.189) — « −1 dé cumulatif pour chaque test de
      défense additionnel depuis sa dernière phase d'action ». Compteur de
      scène (`c.defenses`), incrémenté quand une défense part de la console, et
      remis à zéro par `_resetActions` — c'est-à-dire au début de la phase
      d'action du personnage, exactement la frontière que le livre nomme (et
      NON le round : un combattant à plusieurs passes remet à zéro à chacune). */
  countDefense(pnjId) {
    const c = this._find(pnjId);
    if (!c) return;
    const pnj = PnjLookup.find(pnjId);
    const mod = pnj && App.getEditionModule(pnj.edition);
    if (!mod || !mod.multiDefense) return; // édition sans la règle : rien à compter
    c.defenses = (c.defenses || 0) + 1;
    this._commit();
  },

  /** Malus de défenses multiples DÉJÀ accumulé (magnitude positive). Lu par
      CardRenderer.defensePool, donc par les trois surfaces d'un coup. Le
      compteur vaut le nombre de défenses passées : la PREMIÈRE est gratuite
      (« s'est déjà défendu au moins une fois » → le malus commence à la 2ᵉ). */
  multiDefenseMalus(pnjId) {
    const c = this._find(pnjId);
    const pnj = PnjLookup.find(pnjId);
    const mod = pnj && App.getEditionModule(pnj.edition);
    const spec = mod && mod.multiDefense;
    if (!c || !spec || !c.defenses) return 0;
    return c.defenses * (spec.perDefense || 1);
  },

  /** Ce combattant est-il en Défense totale MAINTENANT ? Lecture neutre et
      sans effet, faite pour que TOUTES les surfaces qui affichent une réserve
      de défense lisent le même drapeau (cf. CardRenderer.defensePool). Avant,
      seule la console de réaction connaissait `fullDefenseRound` : la carte du
      même PNJ — ouverte par le ⛶ d'à côté — affichait une Défense plus basse
      que le bouton qui venait de la déclarer. Faux hors scène vivante. */
  fullDefenseActive(pnjId) {
    const c = this._find(pnjId);
    return !!(c && c.fullDefenseRound === this.state.round);
  },

  /** Score d'initiative de la PASSE COURANTE (base − décrément × passes
      écoulées), miroir du calcul déjà fait à l'affichage
      (EncounterRenderer._effectiveInit / _outOfPass). Vit ici parce qu'une
      RÈGLE s'en sert désormais (la porte des interruptions SR5), pas seulement
      le rendu. `passDecrement: 0` (SR6/Anarchy) → le score de base. */
  _passInit(c) {
    const base = Number.isFinite(c.init) ? c.init : 0;
    const pnj = PnjLookup.find(c.pnjId);
    const mod = pnj && App.getEditionModule(pnj.edition);
    const dec = (mod && mod.combatModel && mod.combatModel.passDecrement) || 0;
    return base - (this.state.pass - 1) * dec;
  },

  /** Débite `n` actions du groupe `key` sur le budget du tour. Renvoie true si
      la dépense DÉPASSE le budget de l'édition — on débite quand même et on le
      DIT (garde-fou « informer, jamais décider » : le MJ a cliqué en connaissance
      de cause, l'app ne lui refuse pas son geste, elle lui montre l'ardoise).
      Seule la porte d'initiative SR5 refuse, parce que le livre l'écrit comme une
      interdiction et non comme un coût. */
  /** ⚠ `cost` accepte une PAIRE `{key, n}` (usage historique de `fullDefenseFor`)
      ou une LISTE de paires (lot F1) — c'est la liste qui règle le « ou » de
      SR5 : une action complexe déclare `[{complex:1},{simple:2}]` et débite les
      trois jetons d'un coup, parce que c'est son coût (p.164).

      Le budget lu est l'EFFECTIF (`effectiveBudget`), échanges compris : après
      un « 4 mineures → 1 majeure », la majeure gagnée est réelle et ne doit pas
      être signalée comme un dépassement. */
  _consumeAction(c, cost, pnj) {
    c.actionsUsed = c.actionsUsed || {};
    const budget = this.effectiveBudget(c.pnjId);
    let over = false;
    for (const part of Actions.cost({ cost })) {
      const cur = c.actionsUsed[part.key] || 0;
      const groupe = budget.find((g) => g.key === part.key);
      const total = groupe ? groupe.total : 0;
      c.actionsUsed[part.key] = cur + part.n;
      if (cur + part.n > total) over = true;
    }
    EncounterRenderer._activeCardId = null; // le budget a changé → re-rendre la fiche
    return over;
  },

  /* ========================================================
     ACTIONS NOMMÉES (lot F1) — le catalogue rejoint le compteur.

     Jusqu'ici `_consumeAction` n'avait qu'UN appelant dans tout le projet : la
     Défense totale. Attaquer, recharger, sprinter ne coûtaient rien — le MJ
     tapait les jetons à la main sans que l'app sache ce qu'il payait.

     Ce point d'entrée ne crée aucune machine : il donne un NOM à ce que le
     compteur débitait déjà. Et il ne refuse rien — `_consumeAction` débite
     au-delà du budget et le DIT (garde-fou (e) : informer, jamais décider).
     ======================================================== */

  /* ========================================================
     CONTRESORT (lot F6b) — livre SR5 p.297, SR6 p.146.

     Deux usages par édition, et ils ne se paient pas pareil :
     · SR6 — les deux passent par l'action majeure « Contrer un sort ». On
       débite, le jet part par `data-roll` sur le même bouton (DiceRoller lance,
       Encounter compte : le partage du ⛉ de défense, établi en E4).
     · SR5 — la déclaration est GRATUITE (`actionKey: null`), donc rien à
       débiter ; et sa « défense contre sorts » n'est PAS un jet mais une
       RÉSERVE de dés qui se dépense par portions au fil du tour de combat.

     La réserve vit dans la SCÈNE (`c.counterspell`), comme l'Atout, le chargeur
     et le cumul d'Ajuster : c'est un fait de rencontre, pas une propriété du
     personnage. Elle se rafraîchit au TOUR DE COMBAT — « la réserve de dés est
     rafraîchie au début de chaque tour de combat » —, donc dans `nextRound` et
     surtout pas dans `_resetActions`, qui travaille à la phase d'action.
     ======================================================== */

  /** Le contrat de Contresort de ce PNJ, ou null. Point unique : le rendu et
      le débit lisent le même. */
  counterspellFor(pnjId) {
    const pnj = PnjLookup.find(pnjId);
    const mod = pnj && App.getEditionModule(pnj.edition);
    return (mod && mod.counterspellFor && mod.counterspellFor(pnj)) || null;
  },

  /** Dés de défense contre sorts encore disponibles ce tour de combat. Sans
      entrée en scène, la réserve est pleine — on ne prive pas d'une capacité un
      PNJ que la rencontre ne suit pas encore. */
  counterspellLeft(pnjId, max) {
    const c = this._find(pnjId);
    if (!c || c.counterspell == null) return max;
    return Utils.clamp(c.counterspell, 0, max);
  },

  /** Alloue (−) ou rend (+) un dé de la réserve. Jamais un jet : ces dés
      s'ajoutent au test de défense d'un AUTRE, et l'app ne lance pas à la place
      du MJ un test qu'elle ne sait pas composer (elle ignore qui est protégé).
      Elle tient le compte, c'est tout — et c'est le compte qu'on oublie. */
  counterspellStep(pnjId, delta, max) {
    const c = this._find(pnjId);
    if (!c) return;
    const avant = c.counterspell == null ? max : c.counterspell;
    c.counterspell = Utils.clamp(avant + delta, 0, max);
    if (c.counterspell === avant) return;
    const pnj = PnjLookup.find(pnjId);
    const alloues = max - c.counterspell;
    toast(
      `Contresort — ${pnj ? pnj.name : ""} : ${c.counterspell}/${max} dés restants` +
        (alloues > 0 ? ` (${alloues} alloué${alloues > 1 ? "s" : ""} à la défense)` : ""),
    );
    this._commit();
  },

  /** Débite ce que l'édition facture pour un usage du Contresort. SR5 ne
      facture rien (action gratuite) : la méthode se tait plutôt que d'inventer
      un coût. Non silencieux — le MJ doit voir qu'une majeure vient de partir
      HORS du tour du magicien, c'est précisément ce qui s'oublie. */
  counterSpell(pnjId) {
    const spec = this.counterspellFor(pnjId);
    if (!spec || !spec.actionKey) return;
    this.useAction(pnjId, spec.actionKey, false);
  },

  /** LE DÉBIT DES AUTRES PORTES (lot F6) — le point unique par lequel une
      surface qui n'est pas la feuille paie l'action qu'elle vient de jouer.

      Trois portes lançaient les dés sans rien débiter : le bloc Sorts,
      les chips ✦ Esprit / ✦ Bannir, le râtelier Matrice. Le mage lançait donc
      son sort gratuitement depuis sa fiche et au prix d'une majeure depuis la
      feuille — deux portes, deux prix, dont un gratuit. C'est ce qui rendait
      la fermeture des doublons impossible : effacer la puce sans brancher le
      débit aurait supprimé le coût, pas déplacé la porte.

      SILENCIEUX par choix, comme le tir (`resolveAttack`) : la porte présente
      déjà son résultat (jet de sort, invocation, pic de données) et un second
      toast l'écraserait. Le débit se lit sur les jetons, qui sont à l'écran.

      Sans scène en cours, sans ce PNJ en piste, ou dans une édition qui ne
      déclare pas la porte (SR6 n'a pas d'action « tisser une forme complexe »,
      Anarchy n'a pas de catalogue), la méthode ne fait rien — c'est déjà le
      contrat de `useAction`, on ne le redouble pas ici. */
  useActionVia(pnj, door) {
    if (!pnj || pnj._adhoc) return;
    const entry = Actions.byDoor(pnj, door);
    if (entry) this.useAction(pnj.id, entry.key, true);
  },

  /** Joue une action du catalogue sur un combattant : débite son coût, le dit,
      et laisse le MJ juge du reste. Le geste manuel (taper les jetons un par
      un) reste intact à côté — l'action nommée s'ajoute, elle ne remplace pas. */
  useAction(pnjId, key, silent) {
    const c = this._find(pnjId);
    const pnj = PnjLookup.find(pnjId);
    const entry = pnj && Actions.find(pnj, key);
    if (!c || !entry) return;

    // F3b — le livre interdit, l'app refuse EN LE DISANT. Même geste que la
    // porte des interruptions (E4, `_porteInterruption`) : un bouton qui
    // échouerait en silence ne dit rien d'utile au MJ. N'entrent ici que les
    // interdictions que le livre écrit SANS CONDITION et sur une action NOMMÉE
    // (Électrocuté « il ne peut effectuer une action Sprinter ») ; les arrêts
    // larges (Pétrifié, Paniqué, Figé) sont annoncés, jamais bloqués.
    const interdits = Actions.forbidden(pnj, entry);
    if (interdits.length) {
      toast(`${entry.name} impossible — ${pnj.name} est ${interdits.map((i) => i.name).join(", ")} (${interdits[0].why}).`);
      return false;
    }

    // B3.4 (C-016) — INSTANTANÉ de reprise, pris avant toute mutation.
    //
    // Pourquoi un instantané et pas une inversion effet par effet : `_trackAim`
    // est PLAFONNÉ (`oncePerRound`, `aimMax`). Mesuré — deux « Ajuster » de suite
    // donnent `minor` 1 puis 2, mais `aim` reste à 1 : le second tap a coûté sans
    // rien donner. Un « annuler » qui retrancherait ce qu'il croit avoir ajouté
    // rendrait donc un ajustement de trop. On restitue l'état d'avant, on ne
    // recalcule pas — même raisonnement que le retrait annulable de B1.4.
    //
    // LIFO, et c'est assumé : on ne mémorise que la DERNIÈRE action. Restituer
    // un `actionsUsed` plus ancien effacerait au passage les actions jouées
    // depuis. C'est aussi le besoin décrit — « un MJ se reprend souvent en cours
    // d'annonce », donc sur le geste qu'il vient de faire.
    const reprise = {
      key,
      actionsUsed: JSON.parse(JSON.stringify(c.actionsUsed || {})),
      recoil: c.recoil,
      aim: c.aim,
      aimRound: c.aimRound,
      lastAction: c.lastAction,
      statuses: [],
    };

    // F3 — le coût débité est le coût RÉEL : celui du contrat, plus les
    // surtaxes d'état inconditionnelles (Couvert « Attaquer à couvert nécessite
    // une action mineure supplémentaire »). Les surtaxes conditionnelles
    // (`warnings`) sont DITES et jamais débitées.
    const res = Actions.costWith(pnj, entry, this.edgeCancels(pnjId));
    const over = Actions.costs(entry) ? this._consumeAction(c, res.cost, pnj) : false;

    // RECUL PROGRESSIF (F2) — « les modificateurs de recul s'accumulent […] à
    // moins que le personnage ne dépense une action simple ou complexe pour
    // AUTRE CHOSE que faire feu » (SR5 p.178). C'est le seul endroit du projet
    // qui sache si une action est un tir : sans le catalogue F1, cette remise à
    // zéro n'existait pas.
    if (c.recoil && Ammo.resetsRecoil(pnj, entry)) {
      delete c.recoil;
      if (!silent) toast(`Recul remis à zéro — ${entry.name}`);
    }

    // F4 — les états que l'action pose ou retire mécaniquement. Passe par
    // `Statuses.set`, donc par les mêmes gardes que la pastille : plafond du
    // contrat, exclusions du livre, `Effects.transition` ordonnée. Un état
    // inconnu de l'édition du PNJ est sauté sans bruit (une scène peut mêler
    // des éditions).
    const poses = [];
    for (const st of Actions.sets(entry)) {
      const nom = Actions.statusName(pnj, st.status);
      if (!nom) continue;
      const avant = Statuses.level(pnj, st.status);
      const apres = Statuses.set(pnj, st.status, st.level);
      if (apres === avant) continue;
      reprise.statuses.push({ status: st.status, avant }); // B3.4 : le niveau d'AVANT
      poses.push(st.level ? `${nom}${st.note ? ` (${st.note})` : ""}` : `retire ${nom}`);
    }
    // F6b — COMPTE DES ATTAQUES. Les deux éditions n'en autorisent qu'une, pour
    // des raisons différentes (SR5 l'interdit, p.178 ; SR6 n'a qu'une majeure,
    // p.42) — le contrat `attackLimit` porte laquelle, ce compteur porte le
    // fait. `useAction` est le seul entonnoir : le tir passe par lui
    // (`resolveAttack` → `fire` → `useAction`), la mêlée aussi.
    if (Actions.isAttack(entry)) c.attacks = (c.attacks || 0) + 1;
    // F5 — la dernière action jouée porte ses greffons d'Atout (rangée sous les
    // jetons). Mémorisée dans la scène : c'est un fait de tour, pas du PNJ.
    c.lastAction = key;
    this._trackAim(c, pnj, key);
    c.lastActionUndo = reprise; // B3.4 — le chemin de retour, désormais ouvert

    if (poses.length) {
      Shadows.save();
      CardRenderer.refresh(pnj); // la ligne d'états de la carte, tout de suite
    }

    if (!silent) {
      const cout = Actions.costLabel(pnj, entry, res.cost);
      // Un coût ne monte JAMAIS sans nom — même règle que le badge ⊘ des malus
      // de dés (`globalDiceSources`, lot E3). Et ce que le MJ doit trancher
      // lui-même est dit là aussi, plutôt que passé sous silence.
      const dus = res.sources.length ? ` · ${res.sources.map((s) => s.name).join(", ")}` : "";
      const avert = res.warnings.length
        ? ` ⚠ ${res.warnings.map((w) => `${w.name} : +${Actions.costLabel(pnj, entry, w.cost)} pour ${w.why}`).join(" · ")}`
        : "";
      // F4 — ce que l'action a posé, et ce qu'elle POURRAIT poser si le jet ou
      // le déplacement le veut. Le second n'est jamais appliqué.
      const etats = poses.length ? ` · ${poses.join(", ")}` : "";
      const peut = Actions.maySet(entry)
        .map((m) => {
          const nom = Actions.statusName(pnj, m.status);
          return nom ? `${m.level ? "pose" : "retire"} ${nom} ${m.when}` : null;
        })
        .filter(Boolean);
      const sous = peut.length ? ` ⚠ ${peut.join(" · ")} — à vous de trancher` : "";
      // B3.4 — le retour vit DANS le retour de l'action, pas dans une seconde
      // affordance. Le dossier proposait « un second tap sur l'action la
      // retire » : ç'aurait cassé la déclaration LÉGITIME d'une même action deux
      // fois dans un tour. Le défaut mesuré n'était pas que les actions
      // s'additionnent — c'est correct — mais qu'AUCUN chemin de retour
      // n'existe (cherché sur tout l'overlay, pas seulement la fiche active :
      // zéro affordance). Même primitive que le retrait de B1.4.
      toastUndo(
        `${entry.name} — ${pnj.name} (${over ? "budget dépassé — " : ""}${cout}${dus})${etats}${avert}${sous}`,
        () => this.undoAction(pnjId),
      );
    }
    this._commit();
    return over;
  },

  /** B3.4 (C-016) — reprend la dernière action déclarée : rend son coût, ses
      états, son recul et son ajustement. Restitue l'instantané pris par
      `useAction` au lieu de retrancher ce qu'elle croit avoir ajouté — la seule
      façon correcte, les effets plafonnés (`_trackAim`) n'étant pas inversibles.
      Sans effet si la dernière action a déjà été reprise, ou si le tour a changé
      d'acteur entre-temps (l'instantané meurt avec `lastAction`, cf. `nextTurn`). */
  undoAction(pnjId) {
    const c = this._find(pnjId);
    const pnj = PnjLookup.find(pnjId);
    const u = c && c.lastActionUndo;
    if (!u) return false;
    c.actionsUsed = u.actionsUsed;
    if (u.recoil === undefined) delete c.recoil;
    else c.recoil = u.recoil;
    if (u.aim === undefined) delete c.aim;
    else c.aim = u.aim;
    if (u.aimRound === undefined) delete c.aimRound;
    else c.aimRound = u.aimRound;
    if (u.lastAction === undefined) delete c.lastAction;
    else c.lastAction = u.lastAction;
    if (pnj && u.statuses.length) {
      for (const s of u.statuses) Statuses.set(pnj, s.status, s.avant);
      Shadows.save();
      CardRenderer.refresh(pnj);
    }
    delete c.lastActionUndo; // une reprise, pas un cliquet
    EncounterRenderer._activeCardId = null; // le budget a changé → re-rendre la fiche
    this._commit();
    return true;
  },

  /* ========================================================
     MUNITIONS, RECHARGEMENT ET RECUL (lot F2).

     Le compteur vit dans l'ENTRÉE DE SCÈNE (`c.ammo`), jamais sur le PNJ : un
     chargeur vidé appartient à la rencontre, comme `c.edge` ou `c.actionsUsed`.
     Le PNJ, lui, ressort de la scène avec son arme pleine — c'est la même
     frontière que celle posée pour l'Atout au lot E0, et l'inverse du choix
     fait pour les ÉTATS (qui survivent parce que la carte doit les voir).
     ======================================================== */

  /** Les armes d'un combattant qui comptent leurs balles, avec leur état.
      Vide si l'édition n'a pas de modes de tir (Anarchy) ou si aucune arme ne
      déclare de capacité (mêlée, jet, exotique) — la surface disparaît alors
      d'elle-même, sans un seul `if App.edition`. */
  ammoWeapons(pnjId) {
    const c = this._find(pnjId);
    const pnj = PnjLookup.find(pnjId);
    if (!c || !pnj || !Ammo.fireModes(pnj).length) return [];
    const out = [];
    const vus = new Map();
    (WeaponRoll._weaponsOf(pnj, pnj.edition) || []).forEach((w) => {
      const parsed = WeaponRoll.parse(w);
      const cap = Ammo.capacity(parsed);
      if (!cap) return;
      // La clé est le NOM de l'arme, pas sa position : un rang d'inventaire
      // change dès qu'on ajoute une ligne d'équipement, et le compteur suivrait
      // silencieusement la mauvaise arme. Un doublon exact (deux Predator) est
      // suffixé, pour qu'ils ne partagent pas un chargeur.
      const n = (vus.get(parsed.name) || 0) + 1;
      vus.set(parsed.name, n);
      const key = n > 1 ? `${parsed.name}#${n}` : parsed.name;
      out.push({
        key,
        str: ItemResolver.itemStr(w),
        parsed,
        cap,
        reste: this._ammoLeft(c, key, cap.n),
        modes: Ammo.modesFor(pnj, parsed),
        reload: Ammo.reloadPlan(pnj, parsed),
      });
    });
    return out;
  },

  /** Balles restantes — l'arme est PLEINE tant que personne n'a tiré (aucune
      clé écrite dans la scène : un compteur jamais touché ne pèse rien). */
  _ammoLeft(c, key, capN) {
    const v = c.ammo && c.ammo[key];
    return v === undefined ? capN : v;
  },

  /** TIRER : décrémente, cumule le recul, et débite l'action du mode.

      Le débit passe par `useAction` — donc par le catalogue F1, donc par les
      mêmes gardes.

      ⚠ APPELANT UNIQUE depuis F5c : `resolveAttack`, au sortir du panneau
      pré-jet. Le patron d'origine (le MÊME bouton portant `data-roll` pour le
      jet et `data-action="ammo-fire"` pour le compte, comme `count-defense` au
      lot E4) a disparu avec la rangée de munitions du cockpit ; le cas de
      dispatch qui restait a été retiré au lot F5h.

      Renvoie la résolution du tir, pour que l'appelant l'annonce. */
  fire(pnjId, key, modeKey) {
    const c = this._find(pnjId);
    const pnj = PnjLookup.find(pnjId);
    const arme = this.ammoWeapons(pnjId).find((a) => a.key === key);
    const mode = pnj && Ammo.find(pnj, modeKey);
    if (!c || !arme || !mode) return null;

    // F3b — l'interdiction se vérifie AVANT de brûler quoi que ce soit : sans
    // ce garde, un état qui interdirait l'action de tir laisserait quand même
    // partir les balles et monter le recul, et le refus arriverait après.
    // Aucun état ne le fait aujourd'hui ; l'ordre, lui, est déjà juste.
    // L'action FACTURÉE : celle que l'édition nomme pour cette arme si elle en
    // nomme une (arc, arbalète, arme montée — le livre leur donne leur propre
    // ligne), sinon celle du mode de tir. Un arc déclare « CC » comme un
    // pistolet : sans cette préférence, « Tirer à l'arc » n'était jamais
    // débitée et le MJ lisait « Faire feu » sur un tir de flèche.
    const nomme = Actions.viaWeaponNamed(pnj, arme.parsed.name);
    const cleAction = (nomme && nomme.key) || mode.actionKey;
    const tir = cleAction && Actions.find(pnj, cleAction);
    const interdits = tir ? Actions.forbidden(pnj, tir) : [];
    if (interdits.length) {
      toast(`${tir.name} impossible — ${pnj.name} est ${interdits.map((i) => i.name).join(", ")} (${interdits[0].why}).`);
      return null;
    }

    const res = Ammo.resolve(pnj, mode, arme.reste);
    c.ammo = c.ammo || {};
    c.ammo[key] = arme.reste - res.tires;

    // Le recul compte les balles RÉELLEMENT tirées : « le recul de Wombat sera
    // calculé en prenant en compte 7 balles », dit l'exemple du livre pour un
    // tir automatique qui en voulait 10.
    if (Ammo.hasRecoil(pnj)) c.recoil = (c.recoil || 0) + Ammo.recoilFrom(res);

    if (cleAction) this.useAction(pnjId, cleAction, true);
    EncounterRenderer._activeCardId = null;
    this._commit();

    const detail = Ammo.rollDetail(res);
    toast(`${arme.parsed.name} — ${detail}${res.court ? " ⚠ à court" : ""}`);
    return res;
  },

  /** L'état RÉEL du chargeur d'une arme, pour la ligne de stats de la fiche :
      `{ reste, n, mech }`, ou null si la scène ne le suit pas (PNJ hors
      combat, arme sans capacité, édition sans munitions).

      Sans ça, la ligne d'arme affichait la capacité NOMINALE — « 42(c) » —
      quelle que soit la réalité : le MJ lisait 42 sur la fiche et 30 dans le
      panneau, pour la même arme au même instant. Le compteur vit dans la
      rencontre (`c.ammo`), donc la fiche doit le lui demander. */
  ammoFor(pnjId, weaponStr) {
    const parsed = WeaponRoll.parse(weaponStr);
    const arme = this.ammoWeapons(pnjId).find((a) => a.parsed.name === parsed.name);
    return arme ? { reste: arme.reste, n: arme.cap.n, mech: arme.cap.mech } : null;
  },

  /** Le PRIX d'un rechargement, en clair — « 2 × Insérer un chargeur (simple) ».
      Lu par le panneau pré-jet pour libeller son bouton : une action de ce
      panneau annonce toujours ce qu'elle coûte avant d'être tapée. Même source
      que le toast de `reloadWeapon`, pour qu'ils ne divergent jamais. */
  reloadLabel(pnjId, arme) {
    const pnj = PnjLookup.find(pnjId);
    if (!pnj || !arme || !arme.reload.length) return "";
    const noms = arme.reload
      .map((k) => {
        const e = Actions.find(pnj, k);
        return e ? Actions.costLabel(pnj, e) : "";
      })
      .filter(Boolean);
    if (!noms.length) return "";
    // Deux fois la même action se dit « 2 × 1 simple », pas « 1 simple + 1 simple ».
    const uniques = [...new Set(noms)];
    return uniques.length === 1 && noms.length > 1 ? `${noms.length} × ${uniques[0]}` : noms.join(" + ");
  },

  /** RECHARGER : débite les actions du plan de l'édition, puis remplit.
      Le plan vient du contrat (`reloadPlan`) et les coûts du catalogue : SR5
      fait payer DEUX actions simples un chargeur amovible (« retire OU insère »,
      p.169), une seule si un smartgun éjecte gratuitement ; SR6 facture une
      mineure au smartgun et une majeure au reste. */
  reloadWeapon(pnjId, key) {
    const c = this._find(pnjId);
    const pnj = PnjLookup.find(pnjId);
    const arme = this.ammoWeapons(pnjId).find((a) => a.key === key);
    if (!c || !arme || !arme.reload.length) return;

    let over = false;
    const noms = [];
    for (const key of arme.reload) {
      over = this.useAction(pnjId, key, true) || over;
      const e = Actions.find(pnj, key);
      if (e) noms.push(`${e.name} (${Actions.costLabel(pnj, e)})`);
    }
    c.ammo = c.ammo || {};
    c.ammo[key] = arme.cap.n;
    EncounterRenderer._activeCardId = null;
    this._commit();
    toast(`${arme.parsed.name} rechargée — ${arme.cap.n} balles · ${noms.join(" + ")}${over ? " ⚠ budget dépassé" : ""}`);
  },

  /* ========================================================
     ACTIONS D'ATOUT (lot F5) — l'autre monnaie.

     Elles ne touchent pas le budget de jetons : le livre écrit « ces actions
     en elles-mêmes ne coûtent pas d'action mineure ni majeure ». Elles se
     paient en ATOUT, sur la rangée que le cockpit compte déjà. D'où un point
     d'entrée séparé de `useAction`, et non un `domain` de plus.

     82 entrées au catalogue : le filtre à trois axes d'`EdgeActions` est ce
     qui rend la feuille lisible — au bon moment, au bon endroit, au bon PNJ.

     ⚠ `edgeActionsFor(pnjId, host)` A ÉTÉ RETIRÉ ici. Il était le seul point
     d'entrée « général » du catalogue et n'a JAMAIS été appelé — l'audit
     d'attention l'a trouvé mort, un an de commentaires plus tard. Et il ne
     fallait pas le brancher tel quel : il passait `host` à `EdgeActions.resolve`,
     dont `matchesHost` laisse aussi passer les entrées **sans hôte**
     (« hôte non modélisé »). Or elles sont **45 sur 82** : la rangée de
     greffons les aurait affichées sous chaque action, ce qui est exactement le
     contraire du tri annoncé.

     Le bon primitif existait à côté : `Actions.grafts`, qui post-filtre sur
     l'hôte réel et que le panneau d'attaque utilisait déjà. C'est lui que la
     rangée de greffons appelle (`EncounterRenderer._activeGrafts`). Deux
     entrées pour une question, dont une fausse : on garde celle qui marche.
     ======================================================== */

  /** Les contextes d'Atout EFFECTIFS d'un combattant : ceux que le MJ a
      déclarés à la main, plus ceux que la SCÈNE rend évidents.

      Aujourd'hui un seul est dérivé ici : « poursuite », dès que le
      combattant est sur la piste (ou qu'il en est la cible). Il ne pouvait
      pas l'être dans le module d'édition — l'état d'une poursuite vit dans
      la scène, et une édition ne remonte jamais chercher la couche au-dessus
      d'elle. Résultat : les 14 actions d'Atout de course-poursuite, au
      catalogue depuis F5 et masquées depuis, s'allument sans que le MJ ait
      à cocher quoi que ce soit. La bascule manuelle reste, pour qui joue la
      poursuite sans ouvrir la piste. */
  edgeContextsFor(c) {
    const base = (c && c.edgeContexts) || [];
    const st = this.state && this.state.chase;
    if (!st || !c) return base;
    const dedans = c.pnjId === st.targetId || !!(st.lanes && st.lanes[this._chaseKey(c.pnjId)]);
    return dedans && !base.includes("poursuite") ? [...base, "poursuite"] : base;
  },

  /** La CLÉ DE PISTE d'un combattant : celle de sa monture quand il est monté
      (lot P6), la sienne sinon.

      ⚠ Sans ce détour, un PASSAGER n'est plus « sur la piste » du point de vue
      des deux lectures ci-dessous — sa bande appartient au véhicule — et les
      14 actions d'Atout de course-poursuite s'éteindraient pour tout
      l'équipage sauf le conducteur. C'est exactement l'inverse de ce que dit
      le livre : monter dans la voiture d'un poursuivant, c'est poursuivre. */
  _chaseKey(pnjId) {
    const st = this.state && this.state.chase;
    if (!st || !st.rides) return pnjId;
    for (const id of Object.keys(st.rides))
      if ((st.rides[id].crew || []).includes(pnjId)) return id;
    return pnjId;
  },

  /** Le camp du combattant dans la poursuite en cours — l'axe que le livre
      utilise pour réserver neuf actions d'Atout (« cible de la
      course-poursuite uniquement », « poursuivants uniquement »).
      `null` hors poursuite : rien n'est alors filtré. */
  chaseRoleFor(pnjId) {
    const st = this.state && this.state.chase;
    if (!st) return null;
    const cle = this._chaseKey(pnjId);
    if (cle === st.targetId || pnjId === st.targetId) return "cible";
    return st.lanes && st.lanes[cle] ? "poursuivant" : null;
  },

  /** Bascule un contexte de scène que l'app ne sait pas dériver (la
      course-poursuite aujourd'hui). Vit dans l'entrée de scène : c'est une
      circonstance de rencontre, pas une propriété du PNJ. */
  toggleEdgeContext(pnjId, key) {
    const c = this._find(pnjId);
    if (!c) return;
    const set = new Set(c.edgeContexts || []);
    set.has(key) ? set.delete(key) : set.add(key);
    c.edgeContexts = [...set];
    EncounterRenderer._activeCardId = null;
    this._commit();
  },

  /** Bascule l'affichage des règles OPTIONNELLES (Compagnon du Sixième Monde).
      Elles restent masquées par défaut : ce sont des variantes que toutes les
      tables n'emploient pas. */
  toggleEdgeOptional(pnjId) {
    const c = this._find(pnjId);
    if (!c) return;
    c.edgeOptional = !c.edgeOptional;
    EncounterRenderer._activeCardId = null;
    this._commit();
  },

  /** Déclare une action d'Atout : débite l'Atout, débite l'action quand elle en
      coûte une, et mémorise les surtaxes qu'elle annule.

      Ne refuse que ce que le livre refuse : Désorienté verrouille « ni gain ni
      dépense d'Atout » (E3). Le manque d'Atout, lui, ne refuse pas — le MJ voit
      la puce ternie et tranche, comme partout dans ce chantier. */
  useEdgeAction(pnjId, key) {
    const c = this._find(pnjId);
    const pnj = PnjLookup.find(pnjId);
    const e = pnj && EdgeActions.find(pnj, key);
    if (!c || !e) return;

    if (EdgeActions.locked(pnj)) {
      toast(`${e.name} impossible — ${pnj.name} ne peut ni gagner ni dépenser d'Atout.`);
      return;
    }
    const dispo = c.edge || 0;
    const court = dispo < e.cost;
    this.adjustEdge(pnjId, -Math.min(dispo, e.cost));

    // ⚠ Une poignée coûtent AUSSI une action (Saturation : « 2 points d'Atout,
    // action majeure »). La règle « pas d'action » ne vaut que pour la section
    // combat du livre de base.
    if (e.actionCost) this._consumeAction(c, e.actionCost, pnj);

    // Les surtaxes d'état qu'elle achète (F3) — trois entrées paient la mineure
    // « Attaquer depuis un couvert », qui ne doit alors plus être facturée.
    const annule = EdgeActions.cancels(e);
    if (annule.length) {
      c.edgeCancels = [...new Set([...(c.edgeCancels || []), ...annule])];
    }
    EncounterRenderer._activeCardId = null;
    this._commit();

    const cout = EdgeActions.costLabel(e);
    const sur = annule.length ? ` · annule la surtaxe ${annule.join(", ")}` : "";
    const act = e.actionCost ? " + 1 action majeure" : "";
    toast(`${e.name} — ${pnj.name} (${court ? "Atout insuffisant — " : ""}${cout}${act})${sur} · à déclarer AVANT le jet`);
  },

  /** Les surtaxes annulées ce tour — lues par `Actions.costWith`. Remises à
      zéro avec le budget, au début du tour du combattant. */
  edgeCancels(pnjId) {
    const c = this._find(pnjId);
    return (c && c.edgeCancels) || [];
  },

  /** Les actions d'Atout SANS HÔTE (45/82 au dépouillement F5) : aucun
      `host` du catalogue F1 à se greffer dessus, donc invisibles pour
      `Actions.grafts`. Leur place documentée (plan d'exécution) est le
      panneau pré-jet, lu par `DiceRoller` via le hook `edgeActionsFor`
      (app.js). Miroir exact de `Pursuit.edgeActionsFor` (pursuit.js) — même
      résolution 3 axes, poussée par un post-filtre différent.

      Exclut la Poursuite (`where: "poursuite"`, 14 entrées) : elle a déjà sa
      propre surface, la piste — les remonter ici doublonnerait. Exclut tout
      ce qui A un host : c'est le rôle d'`Actions.grafts`, sur la carte.

      Scène uniquement, comme les greffons hostés : hors scène `c` est nul et
      `useEdgeAction`/`adjustEdge` sont des no-op (pas de `c.edge`) — mieux
      vaut ne rien montrer qu'une puce qui ne ferait rien au tap. */
  edgeActionsWithoutHost(pnjId) {
    const c = this._find(pnjId);
    const pnj = PnjLookup.find(pnjId);
    if (!c || !pnj) return [];
    const res = EdgeActions.resolve(pnj, {
      declared: this.edgeContextsFor(c),
      withOptional: !!c.edgeOptional,
    });
    return res.visibles.filter((e) => !e.host && e.where !== "poursuite");
  },

  /* ========================================================
     LE PARCOURS D'ATTAQUE (lot F5c) — un geste, un écran, un débit.

     Avant : le mode de tir se choisissait sur une rangée de munitions sous les
     actions, le jet partait des blocs d'offense, l'Atout d'un troisième
     endroit, et l'action « Attaquer » existait en double dans la feuille.
     Quatre points d'entrée pour un seul geste de table.

     Maintenant : **taper l'arme EST l'action Attaquer**. Le tap ouvre le
     panneau pré-jet, qui montre d'un coup ce que le livre fait payer — le mode
     de tir et ses balles, le recul, l'Atout, les greffons — et le validant
     débite tout ensemble. Les deux rangées qui doublonnaient l'arme ont
     disparu ; l'action `attaquer` reste au catalogue (elle a un coût) mais
     porte `viaWeapon` et ne s'affiche plus.
     ======================================================== */

  /** F6 — la clé d'action qui facture un changement de mode de tir, selon
      l'édition et l'IND (interface neurale directe). Le livre exempte l'IND,
      pas le smartlink : SR5 p.435 distingue explicitement
      « équipement relié par IND » (gratuit) d'« interrupteur réel ou virtuel »
      (1 simple) ; SR6 range le cas IND dans `changerModeAppareil` (mineure) et
      le cas nu dans `utiliserAppareilSimple` (majeure, dont la ligne dit
      elle-même « connecté à une IND activée ne coûte qu'une mineure »).
      ⚠ Aucun champ de fiche ne porte l'IND aujourd'hui : ce lot réutilise
      `pnj.smartlink.implanted` (yeux cybernétiques, datajack) comme candidat
      le plus proche — à corriger si un champ IND dédié apparaît un jour. */
  _weaponModeActionKey(pnj) {
    const ind = !!(pnj.smartlink && pnj.smartlink.implanted);
    return pnj.edition === "sr6" ? (ind ? "changerModeAppareil" : "utiliserAppareilSimple") : ind ? "changerModeAppareilConnecte" : "changerModeAppareil";
  },

  /** Tout ce que le panneau pré-jet doit montrer pour une attaque. Renvoie null
      si l'arme ne compte rien (mêlée : le tap reste un jet nu). */
  attackContext(pnjId, weaponStr) {
    const c = this._find(pnjId);
    const pnj = PnjLookup.find(pnjId);
    if (!c || !pnj) return null;
    const parsed = WeaponRoll.parse(weaponStr);
    const famille = WeaponRoll.combatFamily(parsed.name, pnj.edition);
    const arme = this.ammoWeapons(pnjId).find((a) => a.parsed.name === parsed.name);
    const rec = this.recoilInfo(pnjId);

    // Les greffons d'Atout de CETTE attaque : la famille d'arme tranche entre
    // « Attaquer en mêlée » et « Attaquer à distance », que le livre distingue
    // alors que la table d'actions n'a qu'un « Attaquer ».
    const greffons = Actions.grafts(pnj, "attaquer", {
      family: famille,
      declared: this.edgeContextsFor(c),
      role: this.chaseRoleFor(c.pnjId),
      withOptional: !!c.edgeOptional,
    });

    const modes = arme
      ? arme.modes.map((m) => {
          const res = Ammo.resolve(pnj, m, arme.reste);
          const malus = rec ? Ammo.recoilMalus(rec.cumul + Ammo.recoilFrom(res), rec.comp) : 0;
          return { key: m.key, name: m.name, res, malus, detail: Ammo.rollDetail(res) };
        })
      : [];
    // `arbitrable` = y a-t-il quelque chose à TRANCHER ? C'est lui qui décide
    // si le panneau s'ouvre — pas le réglage d'Atout, et pas l'existence d'une
    // attaque. Un mode unique n'est pas un choix (les 29 armes concernées sont
    // toutes en Coup par coup : 1 balle, aucun recul, aucun malus à annoncer) ;
    // une mêlée nue non plus. Ces armes se débitent au tap, sans écran.
    //
    // Le greffon compte pour un arbitrage seulement s'il est ABORDABLE : à 0
    // Atout, les 19 greffons de mêlée sont tous morts, et ouvrir un écran où
    // rien n'est actionnable, c'est faire signer un reçu. Nuance à ne pas
    // confondre avec l'affichage : une fois le panneau ouvert pour une AUTRE
    // raison, un greffon trop cher s'y montre terni — il informe, il ne
    // disparaît pas.
    const edge = c.edge || 0;
    const arbitrable = modes.length > 1 || greffons.some((g) => g.cost <= edge);

    // F6 — le mode MÉMORISÉ (`c.weaponMode`) sert à annoncer, avant le tap, ce
    // qui facturerait un changement. Absent (première sélection de la scène :
    // on DÉCOUVRE l'état de l'arme, on ne le change pas), aucune puce ne coûte
    // rien — cf. `_billModeChange`.
    const weaponModeMemo = arme && c.weaponMode ? c.weaponMode[arme.key] : undefined;
    let weaponModeCost = null;
    if (arme && modes.length > 1) {
      const entry = Actions.find(pnj, this._weaponModeActionKey(pnj));
      if (entry) weaponModeCost = Actions.costLabel(pnj, entry, Actions.costWith(pnj, entry, this.edgeCancels(pnjId)).cost);
    }
    return { weapon: weaponStr, name: parsed.name, famille, arme, modes, recoil: rec, greffons, edge, arbitrable, weaponModeMemo, weaponModeCost };
  },

  /** F6 — facture le changement de mode de tir, à la SORTIE du panneau
      (même frontière que F5d : sélectionner puis se raviser dans le panneau
      ne coûte rien, seul le tir qui part paie). Mémorise le mode dans la
      SCÈNE (`c.weaponMode`), même patron que `c.ammo` : un mode choisi
      appartient à la rencontre, pas au PNJ.
      Le premier tir d'une scène ne facture jamais — sans mode mémorisé, on
      DÉCOUVRE l'état de l'arme dans lequel on l'a trouvée, on ne le change
      pas. */
  _billModeChange(pnjId, pnj, armeKey, modeKey) {
    const c = this._find(pnjId);
    if (!c) return;
    c.weaponMode = c.weaponMode || {};
    const avant = c.weaponMode[armeKey];
    c.weaponMode[armeKey] = modeKey;
    if (avant === undefined || avant === modeKey) return;
    const key = this._weaponModeActionKey(pnj);
    if (Actions.find(pnj, key)) this.useAction(pnjId, key, false);
  },

  /** Valide l'attaque : débite l'action, les balles et le recul, puis rend le
      détail à annoncer. L'Atout, lui, est débité par le panneau (il l'était
      déjà avant ce lot — un seul chemin, pas deux). */
  resolveAttack(pnjId, weaponStr, modeKey, graftKey) {
    const pnj = PnjLookup.find(pnjId);
    if (!pnj) return "";
    if (graftKey) this.useEdgeAction(pnjId, graftKey);
    // AJUSTER se CONSOMME ici — après le jet, qui en a déjà bénéficié
    // (`WeaponRoll.resolvePool` a lu `aimBonus` au moment de composer la
    // réserve). Le bonus vaut « lors du test d'attaque », une fois.
    const c0 = this._find(pnjId);
    if (c0 && c0.aim) {
      delete c0.aim;
      delete c0.aimRound;
    }

    // L'action Attaquer se débite MÊME sans mode de tir (arme de mêlée) : c'est
    // le geste que le livre facture, l'arme n'en est que l'instrument.
    const parsed = WeaponRoll.parse(weaponStr);
    const arme = this.ammoWeapons(pnjId).find((a) => a.parsed.name === parsed.name);
    if (modeKey && arme) {
      this._billModeChange(pnjId, pnj, arme.key, modeKey);
      const res = this.fire(pnjId, arme.key, modeKey);
      return res ? Ammo.rollDetail(res) : "";
    }
    // Sans mode de tir (mêlée, arme de jet, arc, ou arme dont la chaîne ne
    // déclare aucun mode lisible), c'est l'ARME qui désigne l'action — jamais
    // le premier venu du catalogue : SR5 en range six à deux prix différents.
    const famille = WeaponRoll.combatFamily(parsed.name, pnj.edition);
    const entry = Actions.viaWeaponFor(pnj, parsed.name, famille);
    if (entry) this.useAction(pnjId, entry.key, true);
    return "";
  },

  /** État de recul d'un combattant : cumul, compensation, malus, crosse.
      Lu par le rendu ET par la réserve d'attaque — une seule source. */
  recoilInfo(pnjId) {
    const c = this._find(pnjId);
    const pnj = PnjLookup.find(pnjId);
    if (!c || !pnj || !Ammo.hasRecoil(pnj)) return null;
    const armes = this.ammoWeapons(pnjId).map((a) => a.parsed);
    const comp = Ammo.compensation(pnj, armes, !!c.recoilStock);
    const cumul = c.recoil || 0;
    // `stockMatters` : déployer les accessoires internes change-t-il QUELQUE
    // CHOSE ? Seules les armes dont la colonne CR porte une parenthèse
    // (p.418 : un TOTAL, pas un supplément) y gagnent. Sans ça, la bascule
    // s'afficherait sur toutes les armes en ne faisant rien sur la plupart.
    const stockMatters = armes.some((p) => p && p.cr && p.cr.full > p.cr.base);
    return { cumul, comp, malus: Ammo.recoilMalus(cumul, comp), stock: !!c.recoilStock, stockMatters };
  },

  /** Bascule « accessoires internes déployés » (crosse pliable/détachable) :
      le nombre entre parenthèses de la colonne CR est une compensation TOTALE,
      pas un supplément (p.418). Geste manuel : l'app ne sait pas si la crosse
      est sortie, et deviner à la place du MJ serait décider. */
  toggleRecoilStock(pnjId) {
    const c = this._find(pnjId);
    if (!c) return;
    c.recoilStock = !c.recoilStock;
    EncounterRenderer._activeCardId = null;
    this._commit();
  },

  /** Remise à zéro manuelle — pour les cas que le livre laisse au MJ (« ou soit
      FORCÉ de dépenser » une action pour autre chose). */
  resetRecoil(pnjId) {
    const c = this._find(pnjId);
    if (!c || !c.recoil) return;
    delete c.recoil;
    EncounterRenderer._activeCardId = null;
    this._commit();
    toast("Recul remis à zéro.");
  },

  /** Ids des PNJ consultables de la console de réaction, dans l'ordre affiché —
      frères de feuilletage passés à CardPeek (mêmes filtres que
      EncounterRenderer._renderReactionConsole : PNJ chair, hors PJ/down/CI/adhoc). */
  _reactSiblings() {
    return this._rows()
      .filter((r) => r.pnj && !r.isPJ && !r.down && r.kind !== "matrix" && !r.pnj._adhoc)
      .map((r) => r.pnjId);
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
    // CI matricielle — init du livre (base+dés stockés à la création,
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
    // B3.5 (C-002) — UN SPEC VIDE N'EST PAS UN SPEC. Un PJ léger (`pcLight`, créé
    // par « ＋ Ajouter un PJ ») n'a pas d'attributs : `initiativeFor` lui renvoie
    // `{}`, qui passait ce `if` sans encombre. Deux lignes plus bas,
    // `spec.base - malus` valait donc `NaN` et `spec.dice` `undefined` — le jet
    // partait sur des entrées cassées et rendait un simple 1D6. C'est l'origine
    // exacte des « 4 scores inventés pour 4 PJ » : mesuré 6/3/2/1 ici, 6/6/4/2
    // dans l'audit — tous ≤ 6, aucun n'était autre chose qu'un dé nu.
    //
    // Le code disait déjà la règle deux cents lignes plus haut (`_initFor`) :
    // « les joueurs annoncent, l'app propose ». Elle n'était simplement pas
    // appliquée ici. On ne fabrique plus : la ligne reste en saisie manuelle,
    // et le champ d'init de la ligne EST le chemin (steppers compris).
    if (spec.base == null || spec.dice == null) {
      if (!silent) toast(`${pnj.name} — à la table, le joueur annonce son initiative : saisissez-la sur sa ligne.`);
      return false;
    }
    // DiceRoller pose pnj.lastInit (champ neutre, déjà utilisé par les
    // cartes) : on le relit après le lancer plutôt que de recalculer.
    // silent (lancer groupé) : pas d'overlay de tirage — les N overlays
    // s'écraseraient et seul le dernier resterait visible ; les scores
    // s'affichent directement dans la liste du suivi.
    // Le modificateur de blessure s'applique aussi au score
    // d'initiative (SR5 p.171, SR6 — initiative modifiée par tout ce qui
    // affecte l'initiative physique) — réutilise le calcul déjà générique
    // Utils.woundMalus, aucune règle nouvelle à écrire ici.
    // E3 — le malus d'initiative des ÉTATS entre ICI, au même endroit que
    // celui de blessure, et pas dans adjustInit : SR5 relance l'initiative à
    // chaque tour de combat, un −10 de Surpris appliqué au score aurait été
    // effacé au round suivant alors que l'état est toujours posé. Ici il se
    // réapplique tant que l'état est là, et disparaît dès qu'il est retiré.
    const malus = Utils.woundMalus(pnj, pnj.edition);
    const mod = App.getEditionModule(pnj.edition);
    const etats = mod && mod.statusInitMalus ? mod.statusInitMalus(pnj) : 0;
    DiceRoller.rollInitiative(spec.base - malus - etats, spec.dice, pnjId, "", { silent });
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
    this._initFeedback(rolled, false);
  },

  /** Retour d'un lancer groupé — UNE cause par message, et le geste qui
      suit (D7, CODIR 2026-09-03). L'ancien toast cumulait deux causes
      (« déjà posées OU saisie manuelle requise ») sans dire laquelle, et le
      PJ léger restait à « — » sans qu'on lui demande rien. Hors mode
      narratif, les PJ sans score sont nommés et le premier champ reçoit le
      focus (`focusNextPJInit`, déjà utilisé après « ＋ Équipe »). */
  _initFeedback(rolled, sorted) {
    const model = this._model();
    const pending = model.narrative
      ? []
      : this._rows().filter((r) => r.isPJ && r.init == null && !r.down && r.kind !== "matrix");
    const s = rolled > 1 ? "s" : "";
    if (pending.length) {
      const names = pending.map((r) => Utils.parseName(r.pnj.name).alias || r.pnj.name).join(", ");
      toast(
        `${rolled ? `Initiative lancée (${rolled} combattant${s}). ` : ""}À saisir pour ${names} — les joueurs annoncent.`,
      );
      EncounterRenderer.focusNextPJInit();
      return;
    }
    if (rolled) toast(`Initiative lancée${sorted ? " et classée" : ""} (${rolled} combattant${s}).`);
    else if (model.narrative) toast("Ordre narratif : pas d'initiative à lancer, glissez ⠿ pour réordonner.");
    else toast(`${sorted ? "Classé — " : ""}toutes les initiatives sont déjà posées.`);
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

  /** Lancer + classer en un geste (CH combat) : supprime la friction « lancer
      puis trier à la main » du round 1, qui contredisait le round 2+ où
      nextRound relance ET trie déjà tout seul. Un seul commit. Sans effet de
      tri en Anarchy (init null → fin de liste). R1c : c'était l'unique tri
      explicite restant après le retrait du bouton « ↓ Trier » (redondant). */
  rollAndSort() {
    let rolled = 0;
    for (const c of this.state.combatants) {
      if (c.init == null && this._rollInit(c.pnjId, true)) rolled++;
    }
    this._sortInPlace();
    this.state.turnIndex = this._firstEligibleIndex();
    this._commit();
    this._initFeedback(rolled, true);
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
      garde le tour sur lui — pilotage clavier ↑/↓. */
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

  /** Présence d'un participant (RA/RV/astral) — état de SCÈNE, vit sur l'entrée
      combattant (`c.presence`), jamais sur la fiche PJ (K8/Failsafe). Valeur
      libre ("ar" | "vr" | "astral") posée par le cockpit selon la capacité de
      l'entité (le contrôle n'affiche que le mode pertinent). Additif : une
      scène d'avant ce champ le lit `undefined` = RA implicite. */
  setPresence(pnjId, value) {
    const c = this._find(pnjId);
    if (!c) return;
    c.presence = value;
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
    // Une CI matricielle est « hors de combat » quand son moniteur
    // matriciel est plein (source unique state.matrix[serverId].ics[key].down,
    // gérée par Intrusion) — jamais via combatDisposition (ce n'est
    // pas une entité chair sans pnj de pool).
    if (c.kind === "matrix") {
      const st = this._matrixICState(c);
      return !!(st && st.down);
    }
    const mod = App.editionModule;
    if (!mod || !mod.combatDisposition) return false;
    const pnj = PnjLookup.find(c.pnjId);
    return pnj ? !!mod.combatDisposition(pnj).down : false;
  },

  /** État vivant d'une CI (moniteur, détruite) lu dans la scène — jamais
      copié dans le combattant. null si le combattant n'est pas matriciel ou
      si le serveur/la CI a disparu. */
  _matrixICState(c) {
    const m = c && c.matrix;
    if (!m) return null;
    // CI autonome (VIS-10) : l'état vivant (moniteur) vit sur le combattant
    // lui-même, pas dans une intrusion de serveur — on renvoie `m`, dont les
    // clés `dmg`/`down` sont mutées en place par `icBox`.
    if (!m.serverId) return m;
    const intr = this.state.matrix && this.state.matrix[m.serverId];
    return (intr && intr.ics[m.icKey]) || null;
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
    if (current) {
      current.hasActed = true;
      // B3.4 — la reprise se ferme avec le tour. `_resetActions` ne suffit pas :
      // il remet à neuf l'acteur ENTRANT (« budget frais au début du tour »),
      // jamais le sortant — mesuré, l'instantané survivait au passage de tour.
      delete current.lastActionUndo;
    }

    const next = this._nextEligibleIndex(this.state.turnIndex);
    if (next !== -1) {
      this.state.turnIndex = next;
      this._resetActions(next); // budget d'actions frais au début du tour
      // B2.3 — chemin rapide : patcher les deux lignes qui changent de statut
      // actif plutôt que reconstruire toute la file. `_render` retombe
      // lui-même sur le rendu complet dès qu'une hypothèse ne tient pas
      // (retardataire sauté, narratif...) — voir `renderTurnAdvance`.
      this._commit(current ? { prevId: current.pnjId, nextId: cs[next].pnjId } : null);
      return;
    }

    // Fin de la passe courante. Une passe suivante existe (SR5) si un
    // combattant garde un score effectif > 0 après un nouveau −décrément.
    const dec = this._model().passDecrement;
    if (dec && cs.some((c) => c.init != null && c.init - this.state.pass * dec > 0)) {
      this.state.pass++;
      cs.forEach((c) => (c.hasActed = false));
      this.state.turnIndex = this._firstEligibleIndex();
      // Nouvelle phase d'action SR5 → budget d'actions rechargé.
      this._resetActions(this.state.turnIndex);
      this._commit();
      toast("Passe d'initiative " + this.state.pass);
      return;
    }
    this.nextRound();
  },

  nextRound() {
    const model = this._model();
    // BALAYAGE DE FIN DE ROUND (lot E1) — il PROPOSE, il n'exécute jamais.
    // Registre du drapeau « devrait fuir » et de la doctrine (f) : l'app dit
    // ce qu'elle a vu, le MJ tranche. Compté AVANT l'incrément du round, sur
    // l'unité de durée de l'édition (round en SR5/SR6, narration en Anarchy).
    this._bilanDeRound();
    this.state.round++;
    this.state.pass = 1;
    // Nouveau round : tout le monde rejoue, les actions retardées (Vague C)
    // tombent (on ne tient pas son action d'un round sur l'autre).
    this.state.combatants.forEach((c) => {
      c.hasActed = false;
      c.delayed = false;
      // Compteur de gains d'Atout du tour remis à zéro à chaque round
      // (plafond +2/tour de personnage, SR6 p.50).
      c.edgeTurn = 0;
      // Budget d'actions rechargé pour tout le monde au nouveau round.
      c.actionsUsed = {};
      c.narrationBonus = false;
      // F6b — « La réserve de dés est rafraîchie au début de chaque TOUR DE
      // COMBAT » (SR5 p.297). Ici et pas dans `_resetActions`, qui travaille à
      // la phase d'action : un magicien à deux passes ne récupère pas sa
      // réserve entre ses deux phases.
      delete c.counterspell;
    });
    // SR5/SR6 : nouvelle initiative à chaque tour de combat. Anarchy
    // (rerollEachRound:false) conserve l'ordre rangé à la main.
    if (model.rerollEachRound) {
      for (const c of this.state.combatants) this._rollInit(c.pnjId, true);
      this._sortInPlace();
    }
    this.state.turnIndex = this._firstEligibleIndex();
    // Anarchy (narratif) : rien ne pilote le focus MJ comme `turnIndex` le
    // fait en ordonné — sans ce reset, `_narrativeFocus` (encounterrenderer.js)
    // le retrouve toujours en tête de sa recherche et il ne bouge plus JAMAIS
    // tout seul (« Round suivant » semblait boucler sur le même PNJ, fiche et
    // écran spectateur compris). Il retombe sur le premier « à jouer », comme
    // au tout premier rendu (state.focusId à null, cf. `_empty()`).
    if (model.narrative) {
      this.state.focusId = null;
      EncounterRenderer._narrativeFocusId = null;
    }
    this._commit();
    // VIS-10 B1 — le Round de combat EST l'horloge de l'intrusion liée :
    // avancer le Round déploie la CI du tour (SR5 p.249, SR6 p.188, A2 p.223)
    // et la fait rejoindre l'init, sans second geste dans le tiroir. Avant, on
    // ne posait qu'un rappel : les deux horloges étaient découplées.
    // `Intrusion.nextTurn` gère déjà déploiement + Score de Surveillance +
    // `launchIC` (et son propre `_commit`). Serveur affiché alerté, en scène
    // de combat uniquement ; en scène Matrice seule, l'horloge reste le tiroir
    // (son bouton d'avance est masqué en combat pour ne pas double-déployer).
    const srv = this._linkedServer();
    const intr = srv && this.state.matrix && this.state.matrix[srv.id];
    if (srv && intr && intr.alerted && this.state.motors.includes("combat")) {
      Intrusion.nextTurn(srv.id);
    }
    // …et le 3ᵉ moteur, qui n'avait jamais reçu ce traitement. Les livres qui
    // règlent la poursuite la font payer sur le tour du personnage (majeure en
    // SR6, complexe en SR5) : sa ronde EST celle-ci. Deux compteurs séparés
    // divergeaient en silence — `nextTurn` bascule tout seul en ronde suivante
    // quand l'ordre a fait le tour, pendant que la piste restait en arrière
    // avec ses tests, ses actions payées et ses tendances. `Pursuit` décide
    // s'il suit (la filature, elle, compte en minutes et garde son horloge).
    if (this.state.chase) Pursuit.followCombatRound();
  },

  setNote(pnjId, text) {
    const c = this._find(pnjId);
    if (!c) return;
    c.note = text;
    // Pas de _commit() ici : un re-rendu complet ferait perdre le focus/
    // curseur du champ en cours de saisie. Sauvegarde silencieuse.
    this.save();
  },

  /** LA RÉSERVE D'ATOUT DE SCÈNE d'un combattant, ou `null` si la scène ne la
      tient pas — PNJ hors scène, ou édition dont l'Atout n'est pas une
      ressource de rencontre (`combatModel.edgeTracker`, vrai pour SR6 seul :
      la Chance SR5 vit sur la fiche, pas dans le tour).

      Ce pont existe parce que le panneau pré-jet lisait et créditait
      `pnj.attrs.ATO` — l'ATTRIBUT — pendant que les actions d'Atout se
      payaient sur `c.edge`, la RÉSERVE. Deux registres pour une seule
      ressource, dans un seul écran : dépenser un greffon ne réduisait pas les
      options affichées, et gagner de l'Atout ne rendait pas un greffon
      abordable. `adjustEdge` dit déjà lequel fait foi — « l'Atout vit dans
      l'entrée de scène, c'est une ressource de la rencontre ».

      ⚠ Ne concerne que ce qui se DÉPENSE. Le RANG (`dice: "rating"`, « Ajouter
      son rang d'Atout ») reste lu sur l'attribut : c'est le calibre du
      personnage, pas ce qu'il lui reste en poche. */
  /** Points d'Anarchy de scène d'un combattant — jumelle EXACTE de sceneEdge,
      même forme et même garde : la ressource vit sur l'entrée de scène, et la
      lecture n'existe que si l'édition la déclare (combatModel.anarchyPoints).
      `null` = cette édition ne compte pas de points d'Anarchy ; `0` = elle en
      compte et ce combattant n'en a pas — c'est-à-dire un second rôle (p.77),
      distinction que l'appelant doit pouvoir faire. */
  sceneAnarchy(pnjId) {
    const c = this._find(pnjId);
    if (!c) return null;
    const pnj = PnjLookup.find(pnjId);
    const mod = pnj && App.getEditionModule(pnj.edition);
    if (!mod || !mod.combatModel || !mod.combatModel.anarchyPoints) return null;
    return c.anarchyPoints || 0;
  },

  sceneEdge(pnjId) {
    const c = this._find(pnjId);
    if (!c) return null;
    const pnj = PnjLookup.find(pnjId);
    const mod = pnj && App.getEditionModule(pnj.edition);
    if (!mod || !mod.combatModel || !mod.combatModel.edgeTracker) return null;
    return c.edge || 0;
  },

  /** Ajuste l'Atout de combat d'un combattant (SR6, 0-7). Le gain est
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
    // Audit « le feel détruit », lot 3/3 — un seul jeton pulse : celui qui
    // vient de traverser le seuil (gain ou dépense pulsent le même jeton, le
    // plus BAS des deux bornes, cf. EncounterRenderer._pulseToken).
    EncounterRenderer._pulseToken(`.edge-token[data-id="${pnjId}"][data-idx="${Math.min(before, next)}"]`);
  },

  /** Ajuste les Points d'Anarchy de scène d'un combattant (Anarchy 2.0,
      atouts p.77 / drogues p.159). Jumelle de adjustEdge : la ressource vit
      dans l'entrée de scène (c.anarchyPoints), jamais sur le PNJ — elle est
      propre à la scène et repart à zéro à la scène suivante (nouvel état).
      Borne basse 0, pas de plafond règle (le MJ a toujours raison). */
  adjustAnarchyPoints(pnjId, delta) {
    const c = this._find(pnjId);
    if (!c) return;
    const before = c.anarchyPoints || 0;
    const next = Math.max(0, before + delta);
    if (next === before) return;
    c.anarchyPoints = next;
    EncounterRenderer._activeCardId = null;
    this._commit();
  },

  /** Crédite en une fois les Points d'Anarchy octroyés par les atouts/drogues
      actives du combattant pour la scène en cours (montant = collecteur
      AnarchyAtouts). IDEMPOTENT : le drapeau c.anarchyCredited empêche qu'un
      re-rendu ou une réouverture de scène ne recrédite (garde-fou Failsafe).
      Le geste reste MANUEL (tap du MJ, qui seul sait quand la scène commence). */
  creditAnarchyScene(pnjId) {
    const c = this._find(pnjId);
    if (!c || !c.pnj || c.anarchyCredited) return;
    const amount = AnarchyAtouts.collect(c.pnj).anarchyPerScene || 0;
    if (amount <= 0) return;
    c.anarchyPoints = (c.anarchyPoints || 0) + amount;
    c.anarchyCredited = true;
    EncounterRenderer._activeCardId = null;
    this._commit();
  },

  /** Bascule le bonus « +1 action par narration » (p.77, atouts/drogues
      Anarchy 2.0) pour le tour en cours du combattant actif. Stocké dans
      l'entrée de scène (c.narrationBonus), jamais sur le PNJ — geste MANUEL
      du MJ (lui seul sait quand une narration mérite le bonus), remis à zéro
      au tour suivant comme le reste du budget d'actions (cf. _resetActions/
      nextRound). Lu par EncounterRenderer._activeActions pour ajouter un
      jeton d'action supplémentaire. */
  grantNarrationAction(pnjId) {
    const c = this._find(pnjId);
    if (!c) return;
    c.narrationBonus = !c.narrationBonus;
    EncounterRenderer._activeCardId = null;
    this._commit();
  },

  /** Consomme/rend les actions du tour actif (compteur par groupe :
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
    // Audit « le feel détruit », lot 3/3 — un seul jeton pulse : celui tapé
    // (data-idx porte déjà l'index cliqué, cf. EncounterRenderer._pulseToken).
    EncounterRenderer._pulseToken(`.action-token[data-id="${pnjId}"][data-key="${key}"][data-idx="${idx}"]`);
  },

  /** Annonce les états dont la durée est échue à ce changement de round, sans
      les retirer. Un seul toast pour toute la scène : autant de toasts que de
      combattants noierait le MJ, et le geste de retrait reste le ✕ du tag (ou
      le ⛨ pour tout un PNJ). Muet s'il n'y a rien à dire — l'écrasante
      majorité des rounds. */
  /** BILAN DE FRONTIÈRE DE ROUND (lot E3b) — ce que l'horloge permet de dire
      au bon moment, pour toute la scène d'un coup.

      Trois natures, collectées par `Statuses.roundReport` (pur) : les dégâts
      périodiques (Enflammé, Corrodé…), les tests de round (Nauséeux, A1
      Mourant) et les durées échues. Rien n'est appliqué ici — le panneau
      PROPOSE, le MJ tranche. Seule exception assumée : la décroissance et le
      vieillissement (`Statuses.advanceRound`), qui sont l'arithmétique que le
      livre écrit et que le MJ a déclenchée en posant l'état.

      Muet quand il n'y a rien à dire, c'est-à-dire l'écrasante majorité des
      rounds : le panneau ne doit jamais devenir un péage entre deux tours. */
  _bilanDeRound() {
    const lignes = [];
    const eteints = [];
    for (const c of this.state.combatants) {
      const pnj = PnjLookup.find(c.pnjId);
      if (!pnj) continue;
      // UN SEUL panneau pour les deux frontières : « fin du round N » et
      // « début du round N+1 » sont le même instant pour le MJ. Deux panneaux
      // qui s'enchaînent seraient deux péages au lieu d'un bilan.
      for (const when of ["endOfRound", "startOfRound"]) {
        const r = Statuses.roundReport(pnj, when);
        for (const d of r.degats) lignes.push({ kind: "degat", when, pnj, ...d });
        for (const t of r.tests) lignes.push({ kind: "test", when, pnj, ...t });
        for (const e of r.echus) lignes.push({ kind: "echu", when, pnj, key: e.key, name: e.name });
        // Second collecteur : les POUVOIRS permanents (Régénération…), qui ne
        // sont pas des états et que `roundReport` ne voit donc pas. La règle
        // vit dans le module d'édition — SR5/SR6 font lancer Magie +
        // Constitution, Anarchy compte des tours sans un seul dé.
        const mod = App.getEditionModule(pnj.edition);
        for (const p of mod?.creaturePowers?.roundLines?.(pnj, when) || [])
          lignes.push({ when, pnj, ...p });
      }
      // Décroissance + vieillissement : APRÈS la lecture, pour que le bilan
      // annonce la VD du round qui s'achève et non celle du suivant.
      eteints.push(...Statuses.advanceRound(pnj).map((n) => `${pnj.name} : ${n}`));
    }
    if (eteints.length) toast(`${eteints.length === 1 ? "État éteint" : "États éteints"} — ${eteints.join(" · ")}`);
    if (lignes.length) EncounterRenderer.openRoundPanel(lignes, this.state.round);
  },

  /** Retire d'un geste tous les états échus annoncés par le bilan. C'est le MJ
      qui appuie — l'app n'a jamais retiré un état toute seule (doctrine (f) :
      elle propose, comme le drapeau « devrait fuir »). Un seul geste au lieu
      d'un ✕ par état, c'était la demande. */
  purgeEtatsEchus(items) {
    const touches = new Map();
    for (const it of items || []) {
      const pnj = PnjLookup.find(it.pnjId);
      if (pnj && Statuses.set(pnj, it.key, 0) === 0) touches.set(pnj.id, pnj);
    }
    if (!touches.size) return;
    Shadows.save();
    // Même chemin de rafraîchissement que healCombatant : la carte de chaque
    // PNJ touché, puis le tracker (dont les badges de ligne sont calculés).
    for (const pnj of touches.values()) CardRenderer.refresh(pnj);
    EncounterRenderer._activeCardId = null;
    this._render();
    const n = items.length;
    toast(`${n} état${n > 1 ? "s" : ""} retiré${n > 1 ? "s" : ""}.`);
  },

  /* ========================================================
     ÉCHANGE D'ACTIONS (lot E5) — SR6 p.42.
     ======================================================== */

  /** Applique un échange du contrat (`actionExchange`) au budget du tour.
      L'échange est stocké comme un DELTA (`c.actionsTraded`), pas comme une
      réécriture du budget : `actionBudget` reste la vérité de l'édition, le
      delta dit ce que le MJ en a fait ce tour-ci. Remis à zéro au tour suivant
      comme `actionsUsed`, puisque le budget l'est aussi.

      Deux gardes, toutes deux tirées de la règle :
        · il faut avoir les actions à échanger ENCORE DISPONIBLES — on ne troque
          pas une majeure déjà dépensée ;
        · le résultat ne doit jamais passer sous ce qui est déjà consommé.
      Refuse en le disant, comme la porte des interruptions (E4). */
  tradeAction(pnjId, key) {
    const c = this._find(pnjId);
    const pnj = PnjLookup.find(pnjId);
    const mod = pnj && App.getEditionModule(pnj.edition);
    const ex = mod && mod.actionExchange && mod.actionExchange.find((e) => e.key === key);
    if (!c || !ex) return;
    const budget = this.effectiveBudget(pnjId);
    const used = c.actionsUsed || {};
    const dispo = (k) => {
      const g = budget.find((b) => b.key === k);
      return (g ? g.total : 0) - (used[k] || 0);
    };
    if (dispo(ex.from.key) < ex.from.n) {
      const g = budget.find((b) => b.key === ex.from.key);
      toast(`Échange impossible — il reste ${dispo(ex.from.key)} ${(g && g.label.toLowerCase()) || ex.from.key}, il en faut ${ex.from.n}.`);
      return;
    }
    c.actionsTraded = c.actionsTraded || {};
    c.actionsTraded[ex.from.key] = (c.actionsTraded[ex.from.key] || 0) - ex.from.n;
    c.actionsTraded[ex.to.key] = (c.actionsTraded[ex.to.key] || 0) + ex.to.n;
    EncounterRenderer._activeCardId = null;
    this._commit();
    toast(`${pnj.name} — ${ex.label}`);
  },

  /** Rend les jetons échangés ce tour-ci. L'échange du livre étant À PERTE
      (4 mineures pour 1 majeure), un « aller-retour » mangerait 3 mineures à
      chaque mé-tap : le geste de correction doit donc ANNULER, pas re-troquer.
      Refuse si des actions déjà consommées en dépendent. */
  resetTrades(pnjId) {
    const c = this._find(pnjId);
    if (!c || !c.actionsTraded) return;
    const pnj = PnjLookup.find(pnjId);
    const base = App.getEditionModule(pnj.edition).actionBudget(pnj);
    const used = c.actionsUsed || {};
    const manque = base.find((g) => (used[g.key] || 0) > g.total);
    if (manque) {
      toast(`Annulation impossible — ${used[manque.key]} ${manque.label.toLowerCase()} déjà consommée(s) pour ${manque.total} au budget de base.`);
      return;
    }
    delete c.actionsTraded;
    EncounterRenderer._activeCardId = null;
    this._commit();
    toast("Échanges annulés.");
  },

  /** Budget EFFECTIF du tour = celui de l'édition + les échanges du MJ + le
      bonus de narration. Lecture neutre, partagée par le contrôleur (gardes) et
      le rendu (jetons), pour qu'ils ne divergent jamais — la leçon d'E0.

      Le bonus de narration y entre au lot F1 : il ne vivait que dans le rendu,
      si bien qu'une action jouée avec le jeton supplémentaire actif se serait
      annoncée « budget dépassé » alors qu'elle était payée. Même correction que
      `fullDefenseActive` en son temps : une valeur affichée quelque part doit
      être calculée UNE fois. */
  effectiveBudget(pnjId) {
    const c = this._find(pnjId);
    const pnj = PnjLookup.find(pnjId);
    const mod = pnj && App.getEditionModule(pnj.edition);
    if (!c || !mod || !mod.actionBudget) return [];
    const traded = c.actionsTraded || {};
    const b = mod.actionBudget(pnj).map((g) => ({ ...g, total: Math.max(0, g.total + (traded[g.key] || 0)) }));
    // Atout/drogue Anarchy « +1 action par narration » : le dernier groupe du
    // budget gagne un jeton (cf. grantNarrationAction).
    if (c.narrationBonus && b.length) b[b.length - 1].total += 1;
    // F3 — MALUS DE BUDGET d'état : « le tour contient une action de moins »
    // (SR6 Nauséeux, « ils peuvent agir, mais perdent une action mineure »).
    // Distinct de la surtaxe, qui renchérit UNE action : ici c'est la rangée
    // entière qui rétrécit, et le jeton manquant se voit.
    for (const m of Statuses.budgetMalus(pnj)) {
      const g = b.find((x) => x.key === m.key);
      if (g) g.total = Math.max(0, g.total - m.n);
    }
    return b;
  },

  /** Remet à zéro le budget d'actions d'un combattant : appelé au début de son
      tour (nextTurn / nouvelle passe / nouveau round), jamais en cours de tour.
      Le bonus de narration ne se reporte jamais d'un tour à l'autre (le MJ
      l'accorde à nouveau si une narration le mérite encore). */
  _resetActions(i) {
    const c = this.state.combatants[i];
    if (c) {
      // Capturé AVANT le nettoyage : la règle SR6 d'Ajuster juge le tour qui
      // vient de s'écouler, et `lastAction` est effacé trois lignes plus bas.
      const joueAuTour = c.lastAction || "";
      c.actionsUsed = {};
      // F5 — une surtaxe achetée en Atout vaut pour LE tour où elle est
      // déclarée : elle s'efface avec le budget qu'elle a soulagé, comme la
      // rangée de greffons de la dernière action.
      delete c.edgeCancels;
      delete c.lastAction;
      // B3.4 — l'instantané de reprise meurt avec le tour qu'il décrit. Le
      // budget est remis à neuf trois lignes plus haut : le restituer après coup
      // rendrait un `actionsUsed` d'un tour révolu.
      delete c.lastActionUndo;
      c.narrationBonus = false;
      // Échanges du tour (E5) : le budget se recharge, les troc aussi.
      delete c.actionsTraded;
      // Défenses multiples (E4, SR5 p.189) : le livre compte « depuis sa
      // dernière PHASE D'ACTION », pas depuis le round — c'est donc ici, et
      // pas dans nextRound, que le compteur retombe. La nuance compte pour un
      // combattant à plusieurs passes d'initiative.
      c.defenses = 0;
      // F6b — le compte d'attaques retombe au MÊME endroit, et c'est juste dans
      // les deux éditions sans une ligne de branche : `_resetActions` s'appelle
      // à chaque phase d'action, or SR5 limite à la phase (p.178) et SR6 n'a
      // qu'un tour sans passes (p.44), donc chez lui phase = tour. Une seule
      // remise à zéro, deux règles satisfaites.
      delete c.attacks;
      // AJUSTER, règle SR6 (`breaksOnIdleTurn`) : « si un personnage utilise
      // son tour de jeu SANS CHOISIR les actions Ajuster ou Attaquer, tout
      // bonus issu de rounds précédents est perdu ». On regarde donc le tour
      // qui vient de s'écouler AVANT de remettre le budget à neuf — d'où la
      // lecture de `lastAction` juste au-dessus de sa suppression.
      // SR5 n'a pas besoin de ce filet : `breaksOnOtherAction` a déjà cassé le
      // cumul à la première action qui n'était ni Ajuster ni une attaque.
      const pnjR = PnjLookup.find(c.pnjId);
      const mAim = pnjR && Actions.aimModel(pnjR);
      if (mAim && mAim.breaksOnIdleTurn && c.aim) {
        const garde = mAim.keepOn || [];
        const attaque = Actions.viaWeapon(pnjR).some((a) => a.key === joueAuTour);
        if (!garde.includes(joueAuTour) && !attaque) {
          delete c.aim;
          delete c.aimRound;
        }
      }
    }
  },

  /** Ferme l'overlay, bascule sur le panel où vit réellement ce PNJ
      (Ombres / Générateur / Matrice) et le met en surbrillance — réutilise
      UI.focusOwner tel quel, aucune logique de moniteur dupliquée ici. */
  focusCombatant(pnjId) {
    // Une CI matricielle n'a pas de fiche de pool — tap = ouvrir le
    // tiroir Matrice (là où elle vit vraiment), sans fermer le tracker.
    const c = this._find(pnjId);
    if (c && c.kind === "matrix") {
      this.openMatrixDrawer();
      return;
    }
    // PJ ad-hoc / entité disparue : pas de fiche à afficher.
    if (!PnjLookup.find(pnjId)) return;
    // « Voir la fiche » = coup d'œil, JAMAIS navigation : fermer le tracker
    // pour aller à la bibliothèque en plein round renvoyait le MJ hors de la
    // scène (CODIR 2026-09-03, D5). Même geste que le ⛶ de Réagir
    // (react-expand) — frères = toute la file qui a une fiche, pour feuilleter.
    CardPeek.open(pnjId, { siblings: this._peekSiblings(), view: "combat" });
  },

  /** Ids feuilletables depuis la FILE (coup d'œil sur le nom) : tout
      combattant qui a une fiche — PJ et hors de combat compris, contrairement
      à `_reactSiblings` (console Réagir : PNJ debout seulement). */
  _peekSiblings() {
    return this._rows()
      .filter((r) => r.pnj && r.kind !== "matrix" && !r.pnj._adhoc && PnjLookup.find(r.pnjId))
      .map((r) => r.pnjId);
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
    // ⛨ est la SORTIE DE MASSE des états (lot E1) : les états vivent sur le
    // PNJ, donc ils survivent à la scène — sans purge ici, le MJ n'aurait que
    // le retrait un par un et finirait par ne plus rien poser. Remettre un PNJ
    // d'aplomb, c'est aussi lui retirer ses Aveuglé et ses Enflammé. Passe par
    // Statuses.clearAll (donc par les revert), jamais par un delete brutal.
    // ⚠ Les DEUX volets se calculent avant de décider de sortir : un PNJ aux
    // moniteurs déjà pleins mais couvert d'états doit pouvoir être nettoyé
    // (sinon le geste ne marche que sur un blessé, ce qui ne se devine pas).
    const moniteurs = this._resetMonitors(pnj);
    const etats = Statuses.clearAll(pnj);
    // F2 — le ⛨ remet aussi les chargeurs pleins et éteint le recul. Ces deux-là
    // vivent dans la scène (`c.ammo`, `c.recoil`) et non sur le PNJ, donc ils
    // ne SURVIVENT pas comme les états ; mais « remettre un combattant
    // d'aplomb » sans lui rendre ses balles serait un demi-geste.
    const c = this._find(pnjId);
    const munitions = !!(c && (c.ammo || c.recoil));
    if (c) {
      delete c.ammo;
      delete c.recoil;
      delete c.weaponMode; // F6 — mode de tir remis à « pas encore choisi »
    }
    if (!moniteurs && !etats && !munitions) return;
    EncounterRenderer._activeCardId = null;
    Shadows.save();
    CardRenderer.refresh(pnj);
    // Le badge de malus de la ligne (calculé depuis le moniteur)
    // resterait sinon périmé jusqu'au prochain rendu du tracker.
    this._render();
    toast(
      !moniteurs
        ? `${etats} état(s) retiré(s).`
        : etats
          ? `Moniteurs réinitialisés · ${etats} état(s) retiré(s).`
          : "Moniteurs réinitialisés.",
    );
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

  /** Ferme la boucle de réaction — 💥/✸ « Dégâts » applique un résultat
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
    // B3.3 (C-015) — on retient QUI vient d'encaisser, pour que la pose de groupe
    // puisse le proposer. Le constat affirmait que « Encounter garde déjà la trace
    // des mutations de moniteur » : c'était faux, l'entrée de scène ne portait que
    // `pnjId, init, hasActed, note`. Elle la garde maintenant.
    //
    // On stocke le NUMÉRO DE ROUND, pas un booléen : la marque se périme d'elle-même
    // au round suivant (comparaison `=== state.round`), donc aucun point de remise à
    // zéro à tenir — et aucun endroit où l'oublier. C'est de scène, jamais du PNJ.
    // Ici et pas plus haut : `damageCombatant` est le point de passage UNIQUE des
    // trois chemins de dégâts (chip Réagir, cran de gravité Anarchy, bilan de round).
    const c = this._find(pnjId);
    if (c && n > 0) c.hurtRound = this.state.round;
    Shadows.save();
    CardRenderer.refresh(pnj);
    this._render();
    return res;
  },

  /* ---- Bricker des armes (cibles matricielles) ----
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

  /** R2-D6 : état d'appareil d'un participant (bricked/indice), lu par la
      carte (CardRenderer) pour couper la pastille d'attaque d'une arme
      hors service — accesseur public plutôt qu'exposer `devices`/`_find`.
      `null` hors combat ou hors participant (aucune dépendance dure). */
  deviceState(pnjId, label) {
    const c = this._find(pnjId);
    return (c && c.devices && c.devices[label]) || null;
  },

  /** R1d : « Remettre en marche » un appareil brické (régime moniteur SR5/SR6)
      — remet le moniteur à zéro sans retirer le suivi (l'indice réglé reste),
      contrairement à untargetDevice qui efface tout le descripteur. */
  reenableDevice(pnjId, label) {
    const c = this._find(pnjId);
    const d = c && c.devices && c.devices[label];
    if (!d) return;
    d.bricked = false;
    d.filled = 0;
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

  /** Désigne/retire le decker qui protège cet appareil de son Firewall
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

  /** Bruit (SR5 p.232/SR6 équivalent) — modificateur de scène, réglé à la
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
      Utilisé par tout jet Matrice du decker (Piratage, duel, défense
      protégée) ; jamais par les jets côté serveur (Intrusion.rollIC,
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
      // F2 — fin de scène : chargeurs pleins, recul éteint. Ils vivent dans la
      // scène, ils s'en vont avec elle.
      delete c.ammo;
      delete c.recoil;
      delete c.weaponMode; // F6 — le mode de tir aussi
      if (this._resetMonitors(pnj)) {
        CardRenderer.refresh(pnj);
        n++;
      }
    }
    EncounterRenderer._activeCardId = null;
    if (n) {
      Shadows.save();
      this._render(); // badges de malus de toutes les lignes à jour
    } else {
      this._commit();
    }
    toast(
      n
        ? `Moniteurs réinitialisés (${n} combattant${n > 1 ? "s" : ""}).`
        : "Aucun moniteur à réinitialiser.",
    );
  },

  /* ---- Matrice, scène-scopée ----
     `state.matrix{serverId → intrusion}` porte l'état vivant (tours, CI
     déployées, surveillance) de TOUS les serveurs actifs dans la scène —
     Quitte `srv.intrusion` (qui ne redevient qu'une définition) et
     admet plusieurs serveurs possibles (pas un `serverId` unique).
     `state.serverId` garde un rôle plus étroit : le serveur actuellement
     AFFICHÉ dans le tiroir (porte 3 : quelle CI rejoint l'init par défaut),
     pas celui qui « possède » les données. */
  /** État d'intrusion d'un serveur dans CETTE scène — créé à la volée, lu et
      muté par `Intrusion` (jamais par ce module). Utilisable par la
      bibliothèque comme par le tiroir : source unique, quel que soit le
      point d'entrée. */
  intrusionFor(id) {
    if (!this.state || !id) return null;
    this.state.matrix ||= {};
    return (this.state.matrix[id] ||= Intrusion.newState());
  },

  /* ========================================================
     QUI EST DANS LE SERVEUR

     L'intrusion ne l'enregistrait nulle part : `state.matrix[srvId]` porte
     l'alerte, les CI, la surveillance, les marks — jamais « qui la mène ».
     Le contrat de `Intrusion.newState` le dit d'ailleurs en toutes lettres à
     propos de la Variance : le livre compte « par intrus », « mais l'app n'a
     qu'un infiltrateur courant par serveur ».

     Or le fait EXISTE, et depuis toujours : il vit sur la fiche du runner.
     `DeckRun.target(pnj)` lit `<cyberdeck|persona>.run.targetServerId`, et
     c'est déjà la source à laquelle le pont decker fait confiance pour
     proposer « 🔗 Lier ce serveur à la scène ». Il n'a simplement jamais été
     JOINT à l'effectif. Rien à stocker, rien à migrer : une jointure.

     Ce qu'on ne fait PAS : compter les marks comme une présence. `marksOn`
     dit que le serveur a tagué une persona, pas qu'elle est dedans — un
     runner déconnecté garde ses marks, et une cible traquée n'est pas une
     intruse. Une conséquence n'est pas une définition.
     ======================================================== */

  /** Les combattants de la scène qui font tourner leur persona contre CE
      serveur. → `[pnjId]`. */
  runnersIn(srvId) {
    if (!this.state || !srvId) return [];
    return this._rows()
      .filter((r) => r.pnj && !r.pnj._adhoc && DeckRun.target(r.pnj) === srvId)
      .map((r) => r.pnjId);
  },

  /** Le serveur DE LA SCÈNE contre lequel ce combattant tourne, ou `null` —
      la scène peut en suivre plusieurs en parallèle (`state.matrix`), et un
      runner visant un serveur qu'elle ne suit pas n'est engagé dans aucune de
      ses intrusions. */
  serverOfRunner(pnjId) {
    const pnj = PnjLookup.find(pnjId);
    const cible = pnj && !pnj._adhoc ? DeckRun.target(pnj) : null;
    if (!cible) return null;
    const suivis = new Set([this.state && this.state.serverId, ...this.activeMatrixServerIds()].filter(Boolean));
    return suivis.has(cible) ? cible : null;
  },

  /** Serveurs ayant une intrusion en cours dans cette scène (au moins un
      champ non pristine) — alimente le sélecteur multi-serveur du tiroir
      (plusieurs serveurs en parallèle). */
  activeMatrixServerIds() {
    if (!this.state || !this.state.matrix) return [];
    return Object.keys(this.state.matrix).filter((id) => Servers.find(id));
  },

  /** Résumé NEUTRE du moteur Matrice de la scène (cockpit V4-b, lecture seule) :
      un descripteur par serveur en jeu — `{ id, name, alerted, turn, activeIC }`.
      Volontairement limité aux champs dont le sens est le MÊME dans les quatre
      éditions ; le Score de Surveillance / les marks / la Surveillance du DIEU
      (dont le sens varie par édition) restent rendus par le tiroir, via l'API
      d'édition — jamais reprojetés à plat ici. `[]` hors intrusion. */
  matrixMotorSummary() {
    return this.activeMatrixServerIds()
      .map((id) => {
        const srv = Servers.find(id);
        const intr = this.state.matrix[id];
        if (!srv || !intr) return null;
        return {
          id,
          name: srv.name,
          alerted: !!intr.alerted,
          turn: intr.turn || 0,
          activeIC: Object.values(intr.ics || {}).filter((s) => s.active && !s.down).length,
        };
      })
      .filter(Boolean);
  },

  _linkedServer() {
    return this.state.serverId ? Servers.find(this.state.serverId) : null;
  },

  /** Un moteur allumé ou éteint, sans toucher aux autres — le point unique
      par lequel passent Matrice ET Poursuite. La doctrine R0 dit que le
      « type » de scène n'est qu'un préréglage de moteurs : `motors` est un
      ENSEMBLE, pas une énumération à une valeur.

      Deux invariants tenus ici :
      · une scène garde toujours au moins un moteur (couper le dernier
        rallume Combat — une scène sans moteur ne « joue » plus rien) ;
      · Combat et Poursuite COEXISTENT en SR5/SR6 (les deux livres font
        tourner l'initiative pendant la poursuite) mais pas en Anarchy, qui
        n'a pas d'initiative : `combatModel.narrative` tranche, jamais une
        branche `App.edition`. */
  setMotor(key, on) {
    if (!this.state) return;
    const set = new Set(this.state.motors || ["combat"]);
    if (on) {
      set.add(key);
      // ── LOT B : plus aucune exclusivité ──────────────────────────────
      // Trois règles vivaient ici et disaient toutes « un seul moteur mène » :
      // Matrice retirait Poursuite, Poursuite retirait Matrice (sa réciproque,
      // ajoutée pour réparer un symptôme d'affichage), et une poursuite en
      // Anarchy retirait Combat. Toutes les trois tombent, parce que la table
      // fait l'inverse : un combat devient une poursuite pour une partie de
      // l'équipe, reste un combat pour les autres, pendant qu'un decker est
      // dans un serveur. Les trois moteurs tournent alors ENSEMBLE.
      //
      // La règle Anarchy méritait un mot de plus, parce qu'elle s'appuyait sur
      // une vraie constatation de livre — « Anarchy n'a pas d'initiative ».
      // C'est exact, et ça ne conclut rien : pas d'initiative ne veut pas dire
      // pas de combat. Le tracker y montre déjà un effectif narratif (des
      // combattants qu'on éteint au tap, `combatModel.narrative`), et le retirer
      // parce que quelqu'un s'enfuit privait la table de la moitié de sa scène.
      //
      // Ce qui reste vrai et n'a pas besoin d'être écrit ici : les moteurs se
      // partagent UNE ronde (cf. `Chase.followsCombat` et `Intrusion.nextTurn`
      // pilotés par `nextRound`) et ne se partagent pas les participants — la
      // piste dit qui est dessus, l'intrusion dit qui est dedans.
    } else {
      set.delete(key);
    }
    if (!set.size) set.add("combat");
    this.state.motors = [...set];
  },

  hasMotor(key) {
    return ((this.state && this.state.motors) || ["combat"]).includes(key);
  },

  /** Allume ou éteint le moteur MATRICE, sans toucher aux autres.

      Ce geste s'appelait « basculer le type de scène » et il écrasait
      l'ensemble : `motors = ["matrix"]` ou `["combat"]`. Un bouton radio
      déguisé en ensemble — il suffisait de l'actionner pour perdre la
      poursuite en cours et le combat avec. Or `motors` est un ENSEMBLE depuis
      la doctrine R0, et une scène réelle en fait tourner plusieurs : le decker
      est dans le serveur pendant que la moitié de l'équipe fuit et que l'autre
      se bat.

      Il devient donc l'exact pendant de « ⇉ Scène Poursuite » — un moteur
      qu'on ouvre et qu'on ferme au même endroit (loi 3 de la grammaire : un
      verbe, un geste, au même endroit). `setMotor` garde l'invariant « au
      moins un moteur » : éteindre le dernier rallume Combat. */
  toggleSceneType() {
    const on = this.hasMotor("matrix");
    this.setMotor("matrix", !on);
    this._commit();
    if (!on) {
      // Le tiroir s'ouvre au moment où l'on allume le moteur, une seule fois —
      // plutôt que de laisser un MJ chercher où suivre l'intrusion. Il reste
      // libre de le refermer, on ne le lui réimpose pas au commit suivant.
      this.openMatrixDrawer();
      toast(
        this.hasMotor("combat")
          ? "Moteur Matrice allumé — il tourne avec le combat."
          : "Scène Matrice — pas d'initiative, suivez l'intrusion.",
      );
    } else {
      toast("Moteur Matrice éteint.");
    }
  },

  /** État Matrice dérivé du serveur affiché (0 absente · 1 liée · 2 en
      alerte · 3 CI en jeu), recalculé à chaque rendu — jamais persisté
      séparément. */
  matrixState() {
    const srv = this._linkedServer();
    if (!srv) return 0;
    const intr = this.state.matrix && this.state.matrix[srv.id];
    if (!intr) return 1;
    const activeIC = Object.values(intr.ics || {}).filter((s) => s.active && !s.down).length;
    if (activeIC > 0) return 3;
    if (intr.alerted) return 2;
    return 1;
  },

  /** Serveurs proposables à la liaison (porte 1, picker) : tous sauf celui
      déjà affiché (le retaper serait un no-op). Une intrusion déjà en cours
      sur un autre serveur (activeMatrixServerIds) N'EST PLUS bloquante —
      plusieurs serveurs peuvent tourner en parallèle dans la même scène. */
  _serverCandidates() {
    return Servers.data.all.filter((s) => s.id !== this.state.serverId);
  },

  /** Affiche un serveur dans le tiroir (picker, « ⚔ Envoyer au
      combat », sélecteur multi-serveur). Ne « remplace »
      plus rien au sens data (chaque serveur garde son état dans
      `state.matrix`) — seule la porte 3 (quelle CI rejoint l'init par
      défaut) suit le serveur affiché, d'où une confirmation si une CI de
      l'ANCIEN serveur affiché est en jeu (on ne la perd pas, on cesse
      seulement de la mettre en avant). */
  async linkServer(id) {
    if (!id || this.state.serverId === id) return;
    if (this.state.serverId && this.matrixState() === 3) {
      const ok = await Dialog.confirm({
        title: "Changer de serveur affiché",
        message: "Une CI est en jeu sur le serveur actuellement affiché. L'intrusion continue en arrière-plan — afficher ce nouveau serveur à la place ?",
        confirmLabel: "Afficher",
      });
      if (!ok) return;
    }
    this.state.serverId = id;
    // Garantit l'état d'intrusion scène-scopé pour le tiroir (mutation
    // légitime d'une action, pas d'un rendu) — même accesseur que le
    // panneau Serveurs, rien de dupliqué.
    this.intrusionFor(id);
    this._commit();
    toast("Serveur affiché dans le tiroir.");
    // C-020 — la scène vient d'acquérir un serveur, c'est le moment de le
    // montrer : plus de 4e geste pour rouvrir le tiroir Matrice à la main.
    this.openMatrixDrawer();
  },

  /** Cesse d'afficher le serveur courant dans le tiroir (l'intrusion, elle,
      continue d'exister dans `state.matrix` — rien n'est perdu).
      Confirmation informative seulement si une CI est en jeu, plus de
      `danger` : ce n'est plus une suppression de données. */
  async unlinkServer() {
    if (!this.state.serverId) return;
    if (this.matrixState() === 3) {
      const ok = await Dialog.confirm({
        title: "Masquer le serveur",
        message: "Une CI est en jeu sur ce serveur. L'intrusion continue en arrière-plan — cesser de l'afficher dans le tiroir ?",
        confirmLabel: "Masquer",
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
    // Quand la colonne Matrice dockée est À L'ÉCRAN, la Matrice y est déjà —
    // pas de tiroir par-dessus, on amène la colonne en vue.
    //
    // La visibilité se MESURE, elle ne se déduit pas. Le garde lisait
    // `!dock.hidden` (l'attribut, posé sur « un serveur est lié ») ET une
    // media query — deux indices dont la conjonction n'a jamais voulu dire
    // « le dock est visible ». Le jour où le CSS a retiré la colonne pendant
    // une poursuite, le garde a continué de croire qu'elle était là : il
    // refusait le tiroir et faisait défiler vers un élément en `display:none`.
    // Le bouton Matrice de la barre de tour ne répondait plus à rien.
    const dock = document.getElementById("encounter-matrix-dock");
    if (dock && dock.getClientRects().length) {
      dock.scrollIntoView({ block: "nearest" });
      return;
    }
    const overlay = document.getElementById("matrix-drawer-overlay");
    if (!overlay) return;
    if (overlay.classList.contains("open")) return; // déjà ouvert (ex. linkServer depuis la mini-carte du tiroir) — pas de second piège empilé par-dessus lui-même
    overlay.classList.add("open");
    // B1.8 (C-003), second volet — le tiroir vit sur <body>, DEHORS du piège
    // du cockpit. Sans le sien, piéger le cockpit le rendrait inatteignable
    // au clavier : Tab tournerait dans le cockpit pendant que le tiroir est
    // ouvert par-dessus. Le piège est empilable (cf. focustrap.js) et rend le
    // focus au déclencheur — ici le bouton « ⚡ Ouvrir la Matrice ».
    // Le trou existait déjà sous 640px, où le cockpit était seul piégé.
    overlay.setAttribute("aria-modal", "true");
    this._releaseMatrixTrap = FocusTrap.activate(overlay);
    overlay.querySelector(".modal-close").focus();
    requestAnimationFrame(() => requestAnimationFrame(() => overlay.classList.add("show")));
  },
  _releaseMatrixTrap: null,
  closeMatrixDrawer() {
    const overlay = document.getElementById("matrix-drawer-overlay");
    if (!overlay || !overlay.classList.contains("open")) return;
    if (this._releaseMatrixTrap) {
      this._releaseMatrixTrap();
      this._releaseMatrixTrap = null;
    }
    overlay.setAttribute("aria-modal", "false");
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

  /** Une CI rejoint l'ordre d'initiative — automatiquement au
      déploiement (Intrusion.nextTurn, sans second geste, résout #1) ou à la
      demande explicite depuis le tiroir. Fonctionne pour N'IMPORTE QUEL
      serveur de la scène, pas seulement celui affiché (plusieurs
      serveurs actifs en parallèle). Init du livre via icCombatant (module
      d'édition — prohibition n°1) ; l'état vivant (moniteur) reste dans
      `state.matrix[serverId]`, jamais copié. Insérée à sa place d'init sans
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

  /** Clic sur une case du moniteur d'une CI depuis le suivi (VIS-10). CI
      autonome : l'état vit sur le combattant (tap = pose/retire les dégâts,
      « hors de combat » quand le moniteur est plein). CI liée à un serveur :
      délègue au tiroir (`Intrusion.icBox`), source unique de l'état
      d'intrusion — le geste est le même partout. */
  icBox(pnjId, n) {
    const c = this._find(pnjId);
    const m = c && c.matrix;
    if (!m) return;
    if (m.serverId) {
      Intrusion.icBox(m.serverId, m.icKey, n);
      return;
    }
    const size = Matrix.use(m.edition).icMonitorSize(m.indice);
    m.dmg = m.dmg === n ? n - 1 : n;
    m.down = m.dmg >= size;
    this._commit();
  },

  /** Jet d'une CI AUTONOME (VIS-10) — pas de serveur à interroger. Réserve,
      limite et suffixe via `Matrix.icCombat` (source unique partagée avec
      `Intrusion.rollIC`), sur le serveur synthétique. `roll:false` (A2 succès fixes)
      ou `null` (geste absent, ex. encaissement Anarchy) → rien à lancer. */
  _rollBareIC(c, kind) {
    const m = c.matrix;
    const M = Matrix.use(m.edition);
    const ic = M.icCatalog()[m.icKey];
    const name = ic ? ic.label : c.name;
    const spec = M.icCombat(kind, M.bareHost(m.indice), ic);
    if (!spec || !spec.roll) return;
    const res = Dice.computeRoll(spec.pool);
    if (spec.limit != null && res.hits > spec.limit) {
      res.cappedFrom = res.hits;
      res.hits = spec.limit;
    }
    DiceRoller.show(res, { label: `${name} — ${spec.suffix}`, who: c.name });
  },

  /* ---- Rendu ---- */
  _rows() {
    const rows = this.state.combatants.map((c) => ({
      ...c,
      // Un PJ ad-hoc n'est résolu par aucun pool : on synthétise l'objet
      // d'affichage minimal (nom + drapeau _adhoc) pour ne jamais le filtrer.
      pnj: PnjLookup.find(c.pnjId) || (c.name ? { id: c.pnjId, name: c.name, _adhoc: true } : null),
    }));
    // Marque « PJ vs reste » une fois pour le rendu (console de réaction :
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
    // Les CI matricielles sont hors du groupe de moral (ni chair, ni
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
      // Descripteur de moniteur pour les jauges de la ligne (barre fine + cases
      // du spectateur). `conditionMonitor.gauge` porte la FORME (échelle/seuils)
      // remplie par l'édition ; le controller ne l'interprète pas, il la
      // transmet aux renderers qui dessinent aveuglément. `null` (PJ ad-hoc,
      // entité sans moniteur) = pas de jauge au rendu.
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
    // ⚠ LA RÉVISION MONTE ICI AUSSI. C'est le point d'entrée de tout ce qui
    // change un combattant DEPUIS L'EXTÉRIEUR de la scène — un état posé ou
    // retiré, une case de moniteur, une drogue — et c'est précisément le
    // chemin qui laissait le cockpit périmé : `_render()` seul retombait sur
    // le cache de la fiche active, qui ne voyait pas que le contenu avait
    // bougé. Le ✕ d'un état « ne faisait rien » pour cette raison, alors qu'il
    // avait déjà fait son travail dans le modèle.
    this._rev++;
    this._render();
  },

  /** Nombre de CI actives (non détruites) d'un serveur, dans CETTE scène —
      pour le badge du bouton Matrice (barre pouce). Résolu ici (pas dans
      EncounterRenderer, qui reste un rendu pur). */
  _activeICCount(srv) {
    const intr = srv && this.state.matrix && this.state.matrix[srv.id];
    return intr ? Object.values(intr.ics || {}).filter((s) => s.active && !s.down).length : 0;
  },

  /** Serveurs {id, name} avec une intrusion en cours
      dans cette scène — alimente le sélecteur multi-serveur du tiroir
      (affiché seulement s'il y en a plus d'un ; sinon le titre suffit). */
  _activeMatrixServers() {
    return this.activeMatrixServerIds()
      .map((id) => Servers.find(id))
      .filter(Boolean)
      // Badge par édition DU serveur (jamais aplati) + rôle de cible : de quoi
      // dessiner la mini-carte navigable du tiroir (A5) sans faire lire Servers
      // à EncounterRenderer (rendu pur).
      .map((s) => ({
        id: s.id,
        name: s.name,
        badge: Matrix.use(s.edition).topologyNodeBadge(s),
        isTarget: !!s.isTarget,
      }));
  },

  /** Rendu complet (liste, fiche du combattant actif, résumé sidebar) —
      factorisé pour être appelable aussi bien après un commit qu'au
      chargement initial de l'édition (sidebar à jour sans ouvrir le
      tracker).

      `turnAdvance` ({prevId, nextId}, optionnel) — B2.3 : passé par
      `nextTurn()` pour tenter le chemin rapide de la LISTE seule
      (`EncounterRenderer.renderTurnAdvance`, ne patche que les deux lignes
      dont le statut actif change) au lieu de la reconstruire en entier.
      Retombe silencieusement sur le rendu complet si l'hypothèse ne tient
      pas. Le reste (fiche active, sidebar, Matrice, poursuite) est de toute
      façon dépendant du combattant actif : ces rendus-là s'exécutent
      normalement, avec ou sans chemin rapide. */
  _render(turnAdvance) {
    const rows = this._rows();
    const model = this._model();
    // Auto-guérison si le serveur lié a été supprimé entre-temps (ex.
    // depuis le panneau Serveurs) — jamais de référence pendante.
    if (this.state.serverId && !Servers.find(this.state.serverId)) {
      this.state.serverId = null;
      this.save();
    }
    // Garantit l'état d'intrusion scène-scopé avant le rendu (Intrusion._get,
    // mutation idempotente) sans jamais faire lire/muter Servers à
    // EncounterRenderer (qui reste un rendu pur — reçoit le serveur déjà
    // résolu).
    const srv = this.state.serverId ? Intrusion._get(this.state.serverId) : null;
    const patched =
      turnAdvance &&
      EncounterRenderer.renderTurnAdvance(this.state, rows, model, turnAdvance.prevId, turnAdvance.nextId);
    if (!patched) EncounterRenderer.render(this.state, rows, model);
    EncounterRenderer.renderActiveCard(rows, this.state, model);
    EncounterRenderer.renderSidebar(this.state, rows, model);
    EncounterRenderer.renderMatrix(
      srv,
      this.matrixState(),
      this._launchedICKeys(),
      this._activeICCount(srv),
      this._activeMatrixServers(),
    );
    // ⇉ La piste. `viewModel()` renvoie null quand aucune poursuite n'est
    // ouverte : le rendu se masque alors tout seul, sans garde ici.
    ChaseRenderer.render(Pursuit.viewModel());
  },
  /** RÉVISION D'ÉTAT — incrémentée dès que quelque chose change dans la scène
      ou chez un de ses combattants. Sert de clé de cache à la fiche active du
      cockpit (`EncounterRenderer._renderActiveCard`), qui ne se contentait
      jusqu'ici de l'identité du combattant et laissait donc l'écran mentir
      quand seul son CONTENU changeait. Un entier, jamais persisté : c'est de
      l'état de vue, il repart à zéro au rechargement sans rien coûter. */
  _rev: 0,

  /** SECOND CIRCUIT — les cartes de la BIBLIOTHÈQUE.
      `_rev` remet à jour la fiche du cockpit ; ces cartes-là, elles, vivent
      dans les panneaux et ne se reconstruisent que par `CardRenderer.refresh`.
      Les mutations d'états y passaient déjà (`UI._afterStatusChange`), les
      mutations de SCÈNE non : après un tir, la carte annonçait encore le
      chargeur plein et l'ancienne réserve de défense.

      ⚠ SYSTÉMATIQUE, ET C'EST UN CHOIX MESURÉ. Une première version différait
      le travail à la fermeture du cockpit, au motif qu'une modale recouvre les
      cartes. Deux faits l'ont écartée : au-dessus de 641px le cockpit est un
      DOCK LATÉRAL non bloquant — « le Hub reste utilisable derrière » — donc
      les cartes sont visibles PENDANT le combat ; et le coût ne le justifiait
      pas. Mesuré sur une scène de 8 combattants avec 9 cartes rendues :
      `_refreshCards` ≈ 28-31 ms, sur un `_commit` qui en coûte déjà ~246.
      Différer, c'était compliquer le code pour 12 % d'un chemin déjà lent.

      ⚠ **Ce raisonnement est caduc depuis B2.1, et c'est le chemin rapide qui
      l'a périmé.** L'argument tenait par son dénominateur : 12 % de 246ms. Une
      fois le FLIP corrigé, le reste du `_commit` tombe sous 100ms et ces 52-118ms
      (re-mesurés à 10 combattants) deviennent la PART DOMINANTE. `_commit` le
      programme donc maintenant hors du chemin synchrone, coalescé, via
      `_scheduleRefreshCards`. La leçon vaut au-delà : un coût jugé négligeable
      contre un chemin lent redevient le sujet dès qu'on accélère le chemin.

      Le coût est d'ailleurs proportionnel à ce qui est VISIBLE : `refresh` ne
      fait rien quand aucune carte du PNJ n'est dans le DOM. */
  _refreshCards() {
    if (!this.state) return;
    this._refreshDue = false; // la dette est soldée par le travail lui-même
    for (const c of this.state.combatants) {
      const pnj = PnjLookup.find(c.pnjId);
      if (pnj) CardRenderer.refresh(pnj); // no-op si aucune carte n'est rendue
    }
  },

  /** Dette de rafraîchissement accumulée pendant que le cockpit éclipse la
      bibliothèque (cf. `_scheduleRefreshCards`), soldée à la fermeture. */
  _refreshDue: false,

  /** Le cockpit ÉCLIPSE-t-il les cartes de la bibliothèque ? Vrai quand il est
      ouvert — c'est une modale plein écran à toutes les largeurs (le dock
      latéral n'existe plus depuis D4, cf. B1.8/C-003), et `#main-body` est
      même sorti du rendu par `content-visibility` (foundation.css).

      EXCEPTION, et c'est la seule : le coup d'œil (`#card-peek-overlay`)
      s'ouvre PAR-DESSUS le cockpit (z-index 510 > 500) et montre une VRAIE
      carte — là une carte est bel et bien regardée, on la tient à jour. */
  _cockpitEclipsesCards() {
    if (!document.documentElement.classList.contains("is-cockpit-open")) return false;
    const peek = document.getElementById("card-peek-overlay");
    return !(peek && peek.classList.contains("visible"));
  },

  /** B2.1 — `_refreshCards` sort du chemin synchrone. Il est COALESCÉ : dix
      mutations d'affilée ne rafraîchissent qu'une fois, à la frame suivante.

      Vague 4.1 (suite de `f00fb59`) — ET IL NE PART PAS DU TOUT tant que le
      cockpit éclipse la bibliothèque. `f00fb59` a sorti `#main-body` du RENDU
      (`content-visibility`) : le navigateur ne peint plus la sous-couche. Mais
      le JS, lui, continuait de reconstruire les 12 cartes à chaque tour —
      `CardRenderer.refresh` rebâtit des chaînes HTML, ce qu'aucune propriété
      CSS ne peut empêcher. On refaisait donc, à chaque « Tour suivant », le
      HTML de cartes que personne ne regarde.

      MESURÉ (A/B alterné, 3 blocs de 12 clics chacun, échauffement écarté,
      12 PNJ SR6, PAR-DESSUS `f00fb59`) : médiane par clic **184,5 → 61,4 ms,
      −67 %**. C'est le franchissement du budget de l'audit (« mutation →
      rendu < 100 ms »), jamais atteint jusqu'ici : 375 ms avant `f00fb59`,
      184 après, 61 avec ce report.

      La dette est soldée à la fermeture (`close`), où les cartes redeviennent
      regardées — donc rien ne se voit périmé, jamais. */
  _scheduleRefreshCards() {
    if (this._cockpitEclipsesCards()) {
      this._refreshDue = true;
      return;
    }
    if (this._refreshHandle) return;
    this._refreshHandle = requestAnimationFrame(() => {
      this._refreshHandle = null;
      this._refreshCards();
    });
  },

  _commit(turnAdvance) {
    this._rev++;
    this.save();
    this._render(turnAdvance);
    this._renderPicker();
    // Le nudge « écran joueurs » attend le premier combattant (D2) — même
    // point de passage que le nudge pré-jet, même idempotence.
    if (this.activeDossierId && this.state.combatants.length && typeof App !== "undefined" && App.context)
      App.context.offerSpectatorNudge();
    this._maybeNudgePreRollEdge();
    this._scheduleRefreshCards();
  },

  /** VIS-1 (co-MJ) — Lot 1. Quand la scène vivante compte un participant capable
      de dépenser sa ressource AVANT un jet (Chance SR5 / Atout SR6 ; rien en
      Anarchy) ET que le pré-jet est actif (défaut « pill » depuis C-010,
      2026-07-31 — « panel » depuis V3 jusque-là), EXPLIQUE une fois cette
      affordance — texte adapté au MODE réel (panneau qui intercepte le tap, ou
      pastille distincte à côté du jet) — en rappelant qu'elle est réglable dans
      les Paramètres. Capacité lue par contrat neutre `DiceRoller.
      preRollEdgeOptions` (0 branche d'édition) : un combattant ad-hoc/sans
      attrs (minuteur « ALARME », ligne libre) renvoie `[]` → jamais candidat,
      garde-fou « combattant qui n'en est pas » préservé. Rien à expliquer si
      le MJ a déjà coupé le pré-jet (« off »). Gardes chères-en-dernier : pas de
      scan une fois vu (appelé à chaque `_commit`). Le throttle « 1 nudge/scène »
      (réarmé par `App.context.setScene`) fait passer open-spectator d'abord ;
      ce nudge suit à une scène ultérieure. */
  _maybeNudgePreRollEdge() {
    if (!this.activeDossierId) return; // pas de scène vivante
    if (Nudge.seen("preroll-edge")) return; // déjà expliqué une fois
    const mode = DiceRoller.preRollMode();
    if (mode === "off") return; // MJ a coupé → rien à expliquer
    let cand = null;
    for (const c of this.state.combatants) {
      const pnj = PnjLookup.find(c.pnjId);
      if (pnj && DiceRoller.preRollEdgeOptions(pnj).some((o) => o.affordable)) {
        cand = pnj;
        break;
      }
    }
    if (!cand) return;
    // Nom VF de la ressource, lu sur le contrat. Le repli était `"Edge"` — le
    // seul mot que la doctrine bannit de l'écran, parce qu'il n'existe dans
    // aucune VF. Il ne pouvait pas s'afficher (un candidat n'existe que si son
    // édition a des options pré-jet, donc un libellé), mais un terme interdit
    // qui dort dans le code finit toujours par se réveiller : sans nom, on
    // renonce au nudge plutôt que d'en inventer un.
    const res = EdgeActions.resourceLabel(cand);
    if (!res) return;
    const geste =
      mode === "panel"
        ? `un panneau s'ouvre au lancer depuis sa carte (repousser une limite, dés explosifs…)`
        : `un petit bouton « ${res} » apparaît à côté du jet — le tap nu, lui, lance directement`;
    Nudge.offer("preroll-edge", {
      anchor: "nav-combat",
      title: `${res} avant le jet`,
      body: `${cand.name} peut améliorer un jet avant de lancer (${res}) : ${geste}. Réglable dans Paramètres › Lanceur de dés.`,
      cta: { label: "Voir les réglages", run: () => App.showPanel("settings") },
    });
  },

  /** Le tiroir se souvient s'il avait quelque chose à offrir au rendu précédent :
      c'est ce qui distingue « ouvert alors qu'il était déjà vide » (le message
      explique pourquoi, il est utile) de « vidé par l'ajout qui vient de
      réussir » (le message ne dit plus rien, et il coûte la place de l'effectif). */
  _pickerHadCandidates: false,

  /** Ne (re)rend le panneau d'ajout que s'il est ouvert : évite de recalculer
      la liste des candidats à chaque commit inutilement.

      B1.2 — le tiroir se referme quand l'ajout vient de le VIDER. Mesuré sur une
      scène de 7 : l'état « Aucune entité disponible » occupait 266px, soit 43 %
      de la colonne, et il ne restait AUCUNE des 6 lignes d'effectif à l'écran.
      Cet état n'apparaissait là que PARCE QUE le geste avait réussi — un panneau
      qui reste ouvert pour annoncer qu'il n'a plus rien à offrir. Ouvrir un
      tiroir déjà vide reste légitime : c'est le seul cas où le message informe. */
  _renderPicker() {
    const panel = document.getElementById("encounter-add-panel");
    if (!panel) return;
    if (panel.hidden) {
      // Caché = rien à montrer : on vide plutôt que de laisser du HTML mort
      // qu'un chemin futur pourrait afficher sans re-rendre (D3).
      panel.innerHTML = "";
      return;
    }
    const candidates = this._candidates();
    const servers = this._serverCandidates();
    const vide = !candidates.length && !servers.length;
    if (vide && this._pickerHadCandidates) {
      this.toggleAddPicker(); // même primitive que le geste : libellé et aria-expanded suivent
      return;
    }
    EncounterRenderer.renderPicker(candidates, servers);
    this._pickerHadCandidates = !vide;
  },

  /** R1c : bouton-bascule libellée (aria-expanded), pas une icône nue — le
      tiroir ouvert/fermé doit être évident sans avoir à cliquer pour vérifier. */
  toggleAddPicker() {
    const panel = document.getElementById("encounter-add-panel");
    if (!panel) return;
    panel.hidden = !panel.hidden;
    if (!panel.hidden) {
      const candidates = this._candidates();
      const servers = this._serverCandidates();
      EncounterRenderer.renderPicker(candidates, servers);
      // Un tiroir ouvert VIDE doit rester ouvert (le message est le seul recours
      // du MJ) : on ne mémorise donc « il avait à offrir » que s'il avait à offrir.
      this._pickerHadCandidates = !!(candidates.length || servers.length);
    }
    const btn = document.getElementById("encounter-add-toggle");
    if (btn) {
      btn.setAttribute("aria-expanded", String(!panel.hidden));
      btn.textContent = panel.hidden ? "➕ Ajouter" : "✕ Fermer";
    }
  },

  /* ---- Overlay ---- */
  _releaseTrap: null,
  open() {
    const overlay = document.getElementById("encounter-overlay");
    overlay.classList.add("open");
    // B1.8 (C-003) — le cockpit est une MODALE à toutes les largeurs, donc
    // piégé à toutes les largeurs.
    //
    // Le code disait le contraire : `aria-modal` valait "false" au-dessus de
    // 640px et `FocusTrap` n'y était pas activé, au motif — écrit ici — que
    // « en dock latéral le Hub reste volontairement dans l'ordre de
    // tabulation ». Ce dock N'EXISTE PLUS : `css/base/combat-tracker.css` le
    // dit en toutes lettres depuis la décision D4 (« l'ancien dock non
    // bloquant est RETIRÉ », le voile sombre de .modal-overlay reprend le
    // dessus). La condition avait survécu à sa prémisse : au-dessus de 640px,
    // un écran qui couvre tout se déclarait non modal, et Tab sortait du
    // dialogue vers du contenu invisible derrière le voile.
    //
    // Il n'y a donc plus de régime à distinguer : DESIGN-SYSTEM.md § 6.3 range
    // cette surface dans « Modale » (bloque · rideau · --z-modal · max-height
    // 90vh) et lui applique ses deux lois — « le focus est piégé et restitué »
    // et « aria-modal="true" pour tout overlay bloquant ». `FocusTrap` est
    // empilable et son écouteur vit sur le conteneur : le tiroir Matrice et le
    // coup d'œil, qui s'ouvrent par-dessus avec leur propre piège, gardent le
    // leur (cf. l'ordre de z-index tracker 500 < coup d'œil 510 < édition 520).
    overlay.setAttribute("aria-modal", "true");
    // Vague 4.1 (suite) — NE PAS PEINDRE CE QUI EST DERRIÈRE. Le cockpit est
    // une modale plein écran à toutes les largeurs (cf. ci-dessus) : la sidebar
    // et les panneaux sous le voile ne sont plus visibles, mais le navigateur
    // continuait de les mettre en page et de les peindre à chaque tour. Le
    // profilage CDP de la vague 4.1 (traces/V4) le chiffre : sur une scène de
    // 12 PNJ, les retirer du rendu fait passer la médiane par clic de 263,6 à
    // 217,9 ms (−17,3 %), sans toucher au layout du cockpit lui-même — le gain
    // est en peinture/composition.
    //
    // Marqueur en JS et non `:has()` : la vague 4.1 vient précisément de
    // RETIRER un `:has()` du cockpit parce qu'il forçait une réévaluation à
    // chaque mutation du sous-arbre surveillé. On ne le réintroduit pas.
    //
    // `content-visibility` et non `display:none` : la sous-couche garde sa
    // boîte et ses positions de défilement, donc rouvrir ne la reconstruit pas
    // et ne perd pas où le MJ en était. Les écritures JS (sidebar, round)
    // continuent normalement — seul le RENDU est sauté.
    document.documentElement.classList.add("is-cockpit-open");
    this._releaseTrap = FocusTrap.activate(overlay.querySelector(".modal"));
    overlay.querySelector(".modal-close").focus();
    this._render();
    this._renderPicker();
  },
  close() {
    const el = document.getElementById("encounter-overlay");
    if (el) el.classList.remove("open");
    document.documentElement.classList.remove("is-cockpit-open");
    if (this._releaseTrap) {
      this._releaseTrap();
      this._releaseTrap = null;
    }
    // Vague 4.1 — la bibliothèque redevient regardée : on solde ici la dette
    // de rafraîchissement accumulée sous le voile (cf. `_scheduleRefreshCards`).
    //
    // Appel DIRECT, pas `_scheduleRefreshCards` : c'est le seul point où la
    // CORRECTION est en jeu (des cartes périmées redeviennent visibles), et on
    // ne la fait pas dépendre d'une frame — un `rAF` ne se déclenche pas si
    // l'onglet ne compose pas (arrière-plan, panneau navigateur intégré),
    // constaté à la vérification. La fermeture n'est pas un chemin chaud : on
    // paie une fois, au moment où le MJ quitte le combat.
    if (this._refreshDue) this._refreshCards();
  },
};

// Pont couche 5 (migration modules ES) — retiré en fin de migration.
window.Encounter = Encounter;
