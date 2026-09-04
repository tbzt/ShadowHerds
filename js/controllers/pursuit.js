"use strict";

/* ============================================================
   PURSUIT — l'état VIVANT d'une course-poursuite (moteur ⇉).

   Exactement le patron `Intrusion` : ce module ne possède aucune donnée.
   L'état vit dans la scène (`Encounter.state.chase`, scène-scopé comme
   `state.matrix`), les règles vivent dans `Chase` (moteur neutre) et dans
   le `chaseModel` de l'édition ; ce fichier ne fait que **muter** et
   déléguer la persistance à `Encounter._commit()` — source unique.

     js/rules/chase.js      → Chase    : les règles, sans état  (couche 2)
     js/controllers/pursuit → Pursuit  : l'état vivant, muté    (couche 5)

   Deux noms pour deux responsabilités, comme `Matrix` / `Intrusion`.

   ⚠ Ce que ce module ne fait PAS, et ne fera jamais : lancer les dés d'un
   PJ, ni appliquer un effet à quelqu'un d'autre. Un PJ annonce, le MJ tape
   ✓ ou ✗ (même doctrine que l'initiative, lot B3.5) ; un accident est
   PROPOSÉ, jamais appliqué (règle R4).
   ============================================================ */
import { Actions } from "../rules/actions.js";
import { Chase } from "../rules/chase.js";
import { Dice } from "../rules/dice.js";
import { DiceRoller } from "../widgets/dice/diceroller.js";
import { Dialog } from "../widgets/kit/dialog.js";
import { EdgeActions } from "../rules/edgeactions.js";
import { Encounter } from "./encounter.js";
import { Gen } from "./generator.js";
import { Movement } from "../rules/movement.js";
import { PnjLookup } from "./pnjlookup.js";
import { Shadows } from "./shadows.js";
import { Statuses } from "../rules/statuses.js";
import { Utils } from "../core/utils.js";
import { Vehicles } from "../catalogs/vehicles.js";

export const Pursuit = {
  /* ---- Accès à l'état (jamais créé ici : c'est la scène qui le porte) ---- */
  state() {
    return (Encounter.state && Encounter.state.chase) || null;
  },
  active() {
    return !!this.state();
  },
  edition() {
    return typeof App !== "undefined" ? App.edition : null;
  },
  model() {
    return Chase.use(this.edition());
  },

  /** Persiste + rend. Un seul point, comme `Intrusion._persist`. */
  _persist() {
    Encounter._commit();
  },

  /* ========================================================
     ÉQUIPAGES (lot P6) — qui est dans quoi

     Le moteur `Chase` tient la structure (`state.rides`) et la clé de piste ;
     ce contrôleur y ajoute la seule chose qu'une couche 2 n'a pas le droit
     d'aller chercher : les FICHES. D'où les trois accesseurs ci-dessous, et
     la règle qu'ils servent — sur la piste, ce qui a une position est
     l'ENGIN, mais ce qui lance les dés et dépense de l'Atout est une
     PERSONNE. Confondre les deux, c'est faire piloter une voiture par
     elle-même.
     ======================================================== */

  /** L'entité véhicule de cette clé de piste, ou `null` si la clé désigne
      quelqu'un qui court sur ses jambes. */
  vehicleOf(key) {
    const st = this.state();
    if (!st || !key || !Chase.ride(st, key)) return null;
    const v = PnjLookup.find(key);
    return v && v.type === "vehicle" ? v : null;
  },

  /** La monture d'un PARTICIPANT → `{ vehicle, ride }`, ou `null`. */
  rideOf(pnjId) {
    const st = this.state();
    const id = st && Chase.rideIdOf(st, pnjId);
    return id ? { vehicle: PnjLookup.find(id), ride: st.rides[id] } : null;
  },

  /** La fiche qui RÉPOND pour cette clé de piste : le conducteur quand c'est
      une monture, l'intéressé sinon. C'est elle qui porte la compétence du
      test, l'Atout, et le nom qu'un toast doit citer. */
  _actorFor(key) {
    const st = this.state();
    const r = st && Chase.ride(st, key);
    return PnjLookup.find(r ? r.driverId : key);
  },

  /** Monter dans une monture déjà sur la piste (« ils sautent tous dans le
      même taxi »). */
  board(pnjId, vehicleId) {
    const st = this.state();
    if (!st || !Chase.board(st, pnjId, vehicleId)) return;
    if (this._sheetFor === pnjId) this._sheetFor = vehicleId;
    this._persist();
    const qui = (PnjLookup.find(pnjId) || {}).name || "Le participant";
    const quoi = (PnjLookup.find(vehicleId) || {}).name || "la monture";
    toast(`${qui} monte — ${quoi}.`);
  },

  /** Descendre : on retombe sur la bande de la monture, jamais ailleurs.
      Sauter d'une voiture lancée coûte quelque chose au livre — l'app le
      laisse au MJ (règle R4), elle ne fait que replacer le jeton. */
  disembark(pnjId) {
    const st = this.state();
    if (!st) return;
    const veh = Chase.rideIdOf(st, pnjId);
    if (!veh) return;
    const bande = Chase.laneOf(st, veh);
    Chase.unboard(st, pnjId);
    if (bande) Chase.place(st, pnjId, bande);
    if (this._sheetFor === veh) this._sheetFor = pnjId;
    this._persist();
    const qui = (PnjLookup.find(pnjId) || {}).name || "Le participant";
    toast(`${qui} descend — même bande, à pied.`);
  },

  /** Prendre le volant. C'est le conducteur dont l'app lit la compétence
      pour le test du round : le geste sert dès que le pilote prend une balle. */
  takeWheel(pnjId) {
    const st = this.state();
    if (!st || !Chase.setDriver(st, pnjId)) return;
    this._persist();
    toast(`${(PnjLookup.find(pnjId) || {}).name || "Le participant"} prend le volant.`);
  },

  /** Sortir tout l'équipage de la course d'un geste — un van qui se plante
      emmène ses occupants avec lui. */
  dropRide(vehicleId, reason) {
    const st = this.state();
    if (!st || !Chase.ride(st, vehicleId)) return;
    this.drop(vehicleId, reason);
  },

  /* ---- Faire entrer un véhicule dans la scène ----
     Jusqu'ici un engin n'entrait que par l'ÉQUIPEMENT de quelqu'un. Une
     poursuite ne suppose pas la propriété : on vole une bagnole, on saute
     dans un taxi. La monture créée est une entité COMPLÈTE (fiche, moniteur
     de dégâts) — dans une poursuite on se fait tirer dessus, et un véhicule
     sans moniteur aurait été un demi-véhicule. */

  /** Le pool où pousser la nouvelle entité — celui que `UI.deployVehicle`
      utilise déjà : la bibliothèque sauvegardée si le propriétaire y vit,
      le pool de génération sinon. Un seul endroit décide. */
  _poolFor(owner) {
    return Shadows.data.all.some((p) => p.id === owner.id) ? Shadows.data.all : Gen.pool;
  },

  _adopt(owner, vehicle) {
    if (!vehicle) return null;
    const pool = this._poolFor(owner);
    pool.push(vehicle);
    if (pool === Shadows.data.all) Shadows.save();
    return vehicle;
  },

  /** Prendre un véhicule au catalogue de l'édition et y monter. */
  rideFromCatalog(pnjId, name) {
    const owner = PnjLookup.find(pnjId);
    if (!owner) return null;
    const v = this._adopt(owner, Vehicles.spawnFromCatalog(owner, name, this.edition()));
    if (v) this.board(pnjId, v.id);
    return v;
  },

  /** Le sélecteur de monture : les engins DÉJÀ en scène d'abord (c'est le cas
      fréquent — « ils montent tous dans le même »), puis le catalogue, puis
      la saisie libre.

      ⚠ `Dialog.choose` fabrique un BOUTON par option : la liste des montures
      en scène en compte deux ou trois, mais le catalogue SR6 en compte plus
      de cent. Le catalogue passe donc par une SAISIE filtrante (le geste de
      la palette), et seul le résultat resserré revient en boutons.

      En Anarchy la table est vide — cette édition lit ses véhicules dans le
      libellé d'équipement, qui est auto-descriptif. L'entrée « Catalogue »
      disparaît alors, et le message dit pourquoi. */
  async promptRide(pnjId) {
    const st = this.state();
    if (!st || !PnjLookup.find(pnjId)) return;
    const aCatalogue = !!Vehicles.catalogList(this.edition()).length;
    const enScene = Object.keys(st.rides || {}).filter((id) => id !== Chase.rideIdOf(st, pnjId));
    const options = [
      ...enScene.map((id) => ({
        value: `ride:${id}`,
        label: `▣ ${(PnjLookup.find(id) || {}).name || "Monture"}`,
      })),
      ...(aCatalogue ? [{ value: "cat", label: "＋ Catalogue", primary: !enScene.length }] : []),
      { value: "libre", label: "＋ À la volée" },
    ];
    const choix = await Dialog.choose({
      title: "Monter dans…",
      message: aCatalogue
        ? "Une monture déjà en scène, ou un engin pris au catalogue de l'édition."
        : "Cette édition n'a pas de table de véhicules — ses engins se lisent dans le libellé d'équipement. Saisissez le vôtre.",
      options,
    });
    if (!choix) return;
    if (choix.startsWith("ride:")) return this.board(pnjId, choix.slice(5));
    if (choix === "cat") return this.promptCatalogRide(pnjId);
    return this.promptCustomRide(pnjId);
  },

  /** Le catalogue par la saisie : on tape « americar », « roto », « bulldog ».
      Un seul résultat part directement ; une poignée revient en boutons ;
      au-delà, on demande de préciser plutôt que d'afficher un mur. */
  async promptCatalogRide(pnjId) {
    const cat = Vehicles.catalogList(this.edition());
    const brut = await Dialog.prompt({
      title: "Catalogue",
      label: `${cat.length} engins — tapez un nom (americar, bulldog, roto…)`,
      value: "",
    });
    if (brut === null || !brut.trim()) return;
    const q = Utils.searchNorm(brut);
    const hits = cat.filter((e) => Utils.searchNorm(e.name).includes(q));
    if (!hits.length) return void toast(`Aucun engin ne répond à « ${brut.trim()} ».`, "warning");
    if (hits.length === 1) return void this.rideFromCatalog(pnjId, hits[0].name);
    if (hits.length > 8)
      return void toast(`${hits.length} engins répondent à « ${brut.trim()} » — précisez.`, "warning");
    const choix = await Dialog.choose({
      title: "Lequel ?",
      options: hits.map((e) => ({ value: e.name, label: `${e.kind === "drone" ? "◇" : "▣"} ${e.name}` })),
    });
    if (choix) this.rideFromCatalog(pnjId, choix);
  },

  /** Monture saisie à la main. Ce que le MJ laisse vide RESTE vide : la piste
      écrira « — » avec sa saisie à un tap plutôt qu'un chiffre inventé. */
  async promptCustomRide(pnjId) {
    const st = this.state();
    const owner = PnjLookup.find(pnjId);
    if (!st || !owner) return;
    const nom = await Dialog.prompt({
      title: "Véhicule à la volée",
      message: "Le nom de l'engin — un taxi, une bagnole volée, le van du fixer.",
      value: "",
    });
    if (nom === null || !nom.trim()) return;
    const spec = this.model() || {};
    const attr = spec.attr ? spec.attr(st.env, "vehicule") : null;
    const brut = await Dialog.prompt({
      title: nom.trim(),
      message: attr
        ? `${attr.label} de l'engin — laissez vide si vous ne l'avez pas, la piste le demandera au bon moment.`
        : "Caractéristique de course de l'engin — laissez vide si vous ne l'avez pas.",
      value: "",
    });
    if (brut === null) return;
    // Le champ de stats visé dépend de l'édition (Intervalle de vitesse en
    // SR6, Vitesse en SR5/Anarchy 2, Mobilité en Anarchy 1) : on le déduit du
    // code court que l'édition affiche déjà sur la barre du round.
    const champ = { IdV: "intervalle", ACC: "accel", VIT: "vitesse", MAN: "mania", MOB: "mobilite" }[
      (attr && attr.short) || ""
    ];
    const n = parseInt(brut, 10);
    const stats = champ && Number.isFinite(n) && n >= 0 ? { [champ]: n } : {};
    const v = this._adopt(owner, Vehicles.spawnCustom(owner, { name: nom.trim(), stats }, this.edition()));
    if (v) this.board(pnjId, v.id);
  },

  /* ========================================================
     OUVRIR / FERMER — le type de scène n'est qu'un préréglage de moteurs
     (doctrine R0), donc « ouvrir une poursuite » ALLUME un moteur, ça ne
     remplace pas la scène. En SR5/SR6 la poursuite tourne AVEC
     l'initiative (le livre l'exige) ; en Anarchy, seule.
     ======================================================== */
  open(opts = {}) {
    if (!Encounter.state) return false;
    if (!Chase.supports(this.edition())) {
      toast("Cette édition n'a pas de règles de course-poursuite.", "warning");
      return false;
    }
    if (this.state()) return true; // idempotent : rouvrir n'écrase pas une piste en cours
    // La ronde de départ est celle du combat quand il tourne : une poursuite
    // qui s'ouvre au 3ᵉ round de combat est au 3ᵉ round, pas au 1ᵉʳ. Sans ça,
    // les deux compteurs naissaient décalés et le restaient pour toujours.
    const depart = Encounter.hasMotor("combat") ? Encounter.state.round : null;
    Encounter.state.chase = Chase.newState(this.edition(), depart ? { ...opts, round: depart } : opts);
    Encounter.setMotor("chase", true);
    this._persist();
    toast("Scène de poursuite — posez la cible, puis les positions.");
    return true;
  },

  async close() {
    const st = this.state();
    if (!st) return;
    const posees = Object.keys(st.lanes || {}).length;
    if (posees) {
      const ok = await Dialog.confirm({
        title: "Fermer la poursuite",
        message: `${posees} position${posees > 1 ? "s" : ""} sur la piste seront perdues. Les combattants restent en scène.`,
        confirmLabel: "Fermer",
      });
      if (!ok) return;
    }
    Encounter.state.chase = null;
    Encounter.setMotor("chase", false);
    this._persist();
    toast("Poursuite fermée — la scène continue.");
  },

  /* ---- Réglages de piste ---- */
  setTerrain(key) {
    const st = this.state();
    if (!st || !Chase.terrain(this.edition(), key)) return;
    st.terrain = key;
    this._persist();
  },
  setEnv(key) {
    const st = this.state();
    if (!st) return;
    st.env = key || null;
    this._persist();
  },
  /** Bascule de mode — poursuite · course · filature. Le composant ne
      change pas : ce sont ses libellés, son compteur et ses tests qui
      suivent le livre (cf. `chaseModel.modes`). Le nombre de tours ou de
      phases prévu est repris du mode quand il en propose un (« la moyenne
      s'élève à trois » pour une filature). */
  setMode(mode) {
    const st = this.state();
    if (!st) return;
    const spec = Chase.mode(this.edition(), mode);
    if (!spec) return;
    // Changer de mode peut changer d'UNITÉ : une ronde de combat dure trois
    // secondes, une phase de filature environ une minute. Reporter le compte
    // de l'une sur l'autre écrivait « Phase 4 / 3 » en passant à la filature
    // au 4ᵉ round — un décompte de minutes hérité d'un décompte de secondes.
    // Le compteur repart donc à 1 quand l'horloge change de maître ; il ne
    // bouge pas entre deux modes qui partagent la même (poursuite ↔ course).
    const avant = Chase.followsCombat(this.edition(), st);
    if (!!spec.combatRound !== avant) {
      st.round = spec.combatRound && Encounter.hasMotor("combat") ? Encounter.state.round : 1;
      st.log = [];
    }
    st.mode = mode;
    if (spec.hasTotal && !st.total) st.total = spec.defaultTotal || null;
    if (!spec.hasTotal) st.total = null;
    this._persist();
    toast(`${spec.label} — ${spec.note || "les libellés suivent le livre."}`);
  },
  setTotal(delta) {
    const st = this.state();
    if (!st) return;
    const n = (st.total || 0) + delta;
    st.total = n > 0 ? n : null;
    this._persist();
  },
  /** Désigner la cible n'applique RIEN à personne (cf. `no-target-selection`) :
      c'est l'origine du repère de distances, que le livre exige. */
  setTarget(pnjId) {
    const st = this.state();
    if (!st) return;
    st.targetId = st.targetId === pnjId ? null : pnjId || null;
    if (st.targetId) delete st.lanes[st.targetId];
    this._persist();
  },

  /* ---- Positions ---- */
  place(pnjId, laneKey) {
    const st = this.state();
    if (!st) return;
    Chase.place(st, pnjId, laneKey);
    this._persist();
  },
  /** ▲▼ — rapprocher ou éloigner d'une bande.

      En SR5 et SR6, un écart se franchit d'un coup : le jeton bouge, comme
      depuis toujours. En Anarchy, le livre chiffre l'écart en NARRATIONS
      (1 à 3 selon la marche) — et une Narration est le tour de jeu, pas une
      monnaie. Le déplacement y prend donc du TEMPS : le jeton reste où il
      est, un compteur tourne, et la fin de ronde le fait arriver. Un écart à
      1 Narration se franchit dans le tour courant, donc immédiatement.

      Le MJ garde la main de bout en bout : « arriver » (`arriveNow`) résout
      d'un tap — c'est là que se dépense le point d'Anarchy dont le livre dit
      qu'il accélère le franchissement, et c'est lui qui en décide, pas nous. */
  /** Le ▲▼ du MJ — et, depuis le lot A, le geste par lequel un JOUEUR prend
      le déplacement que sa réussite lui a donné. Les deux passent par le même
      `Chase.step` : le régime de l'édition (déplacer d'un coup, ou engager un
      franchissement qui dure) est une décision du moteur, pas du bouton. */
  move(pnjId, delta) {
    const st = this.state();
    if (!st) return;
    const fait = Chase.step(this.edition(), st, pnjId, delta);
    if (fait && fait.crossing) {
      const nom = (PnjLookup.find(pnjId) || {}).name || "Le participant";
      toast(`${nom} franchit vers ${fait.to} — ${fait.crossing} Narrations.`);
    }
    this._persist();
  },

  /** L'Accélération de l'engin de ce participant, ou `null` si l'app ne la
      tient pas du livre (catalogue partiel : lot P0 ne porte les stats que des
      livres de base). Même ordre de recherche que les modules d'édition — la
      monture DÉCLARÉE d'abord, le véhicule déployé de l'équipement ensuite. */
  _accelFor(key) {
    const veh = this.vehicleOf(key);
    if (veh) return (veh.stats || {}).accel ?? null;
    const pnj = this._actorFor(key);
    const liste = (typeof Vehicles !== "undefined" && pnj && Vehicles.linkedTo(pnj.id)) || [];
    const v = liste.find((x) => x.deployed) || liste[0];
    return (v && v.stats && v.stats.accel) ?? null;
  },

  /** Ce qu'une manœuvre du livre fait à la PISTE (lot B) — appelée par
      `Encounter.useAction`, après que l'action a été jouée et payée.

      Rien n'est appliqué de force. Rattraper OUVRE un déplacement, plafonné
      par l'Accélération quand l'app la tient (le livre dit « un niveau par
      succès excédentaire », et les succès, c'est la table qui les annonce) ;
      Cascade MARQUE les poursuivants qui doivent refaire le test. Le reste —
      collisions, accidents, issues — n'a jamais été à nous. */
  onActionPlayed(pnjId, actionKey) {
    const st = this.state();
    if (!st || !actionKey) return;
    // La clé de PISTE, pas le pnjId : c'est l'engin qui a une position, et
    // trois runners dans le même taxi ne déplacent pas trois jetons.
    const key = Chase.trackKey(st, pnjId);
    // Jouer Rattraper depuis la feuille de combat alors qu'on n'est pas sur la
    // piste ne doit rien faire : l'action existe, la poursuite ne la concerne
    // pas.
    if (!key || (!st.lanes[key] && key !== st.targetId)) return;
    const res = Chase.applyActionEffect(this.edition(), st, key, actionKey, {
      accel: this._accelFor(key),
    });
    if (!res) return;
    const nom = (PnjLookup.find(key) || PnjLookup.find(pnjId) || {}).name || "Le participant";
    if (res.kind === "grant")
      toast(
        res.max == null
          ? `${nom} peut changer de portée — un niveau par succès excédentaire (Accélération inconnue de l'app).`
          : `${nom} peut changer de portée — jusqu'à ${res.max} niveau${res.max > 1 ? "x" : ""} (Accélération).`,
      );
    else if (res.kind === "cascade")
      toast(
        res.n
          ? `Cascade — ${res.n} poursuivant${res.n > 1 ? "s doivent" : " doit"} refaire le même test, au même seuil.`
          : "Cascade — aucun poursuivant à faire tester.",
      );
    this._persist();
  },

  /** L'ancre prend le déplacement que sa réussite lui a donné. Elle n'a pas de
      bande : ce sont les autres qui reculent d'autant (`Chase.stepAnchor`).
      `delta` garde le sens de la piste — négatif = les poursuivants se
      rapprochent —, pour que le geste se lise comme les ▲▼ d'à côté. */
  moveAnchor(delta) {
    const st = this.state();
    if (!st || !st.targetId || !delta) return;
    const faits = Chase.stepAnchor(this.edition(), st, delta);
    if (!faits.length) return;
    const enCours = faits.filter((f) => f.crossing).length;
    if (enCours)
      toast(`${enCours} participant${enCours > 1 ? "s" : ""} en franchissement.`);
    this._persist();
  },

  /** Arriver tout de suite : le livre laisse un point d'Anarchy accélérer le
      franchissement, et c'est un arbitrage de MJ — l'app ne dépense rien
      d'elle-même, elle exécute. */
  arriveNow(pnjId) {
    const st = this.state();
    const c = st && Chase.crossing(st, pnjId);
    if (!c) return;
    Chase.place(st, pnjId, c.to);
    Chase.endCross(st, pnjId);
    this._persist();
  },
  /** Fait entrer tous les combattants de la scène qui n'y sont pas encore,
      sur la bande demandée — le geste « on y va tous » d'un début de
      poursuite, plutôt que N taps. La cible en est exclue (elle est l'ancre). */
  fill(laneKey) {
    const st = this.state();
    if (!st) return 0;
    const keys = Chase.laneKeys(this.edition(), st.terrain);
    const lane = keys.includes(laneKey) ? laneKey : keys[0];
    let n = 0;
    for (const c of Encounter.state.combatants) {
      // Un combattant monté entre par sa MONTURE : les trois occupants d'un
      // van posent un jeton, pas trois (le deuxième trouve la bande déjà
      // prise et passe son tour).
      const cle = Chase.trackKey(st, c.pnjId);
      if (cle === st.targetId || st.lanes[cle]) continue;
      Chase.place(st, cle, lane);
      n++;
    }
    if (n) this._persist();
    return n;
  },

  /* ========================================================
     LE TEST DU ROUND (lot P3)

     Le ⚄ lance partout ailleurs dans l'app : il lance ici aussi — mais
     seulement sur un PNJ dont l'app tient la réserve. Sur un PJ léger (pas
     de compétences sur sa fiche : son bloc de table n'en porte pas), le
     même geste POINTE ce que le joueur annonce. Aucune règle nouvelle :
     c'est la doctrine de l'initiative (lot B3.5) appliquée au round de
     poursuite.

     Et ce qui se passe sur un ÉCHEC n'est jamais appliqué : le test
     d'Accident (SR6 encombré) ou les 4E à pied sont PROPOSÉS, avec leur
     réserve prête à lancer. L'app ne remplit aucun moniteur (règle R4).
     ======================================================== */

  /** La réserve du test pour cette CLÉ DE PISTE, ou null si l'app ne la tient
      pas du livre → `{ pool, label, threshold }`.

      Sur une monture, c'est le CONDUCTEUR qui teste : la compétence est sur
      une fiche, pas sur une carrosserie — et le seuil, lui, vient de l'engin
      (Maniabilité). Les deux moitiés du test viennent donc de deux endroits,
      ce que le contexte passé à l'édition dit explicitement. */
  testSpec(key) {
    const st = this.state();
    const m = this.model();
    const pnj = this._actorFor(key);
    if (!st || !m || !pnj || !m.testPool) return null;
    const veh = this.vehicleOf(key);
    const ctx = { terrain: veh ? "vehicule" : st.terrain, env: st.env, ride: veh };
    const seuil = m.threshold ? m.threshold(pnj, ctx) : null;
    const avecSeuil = (s) => ({ ...s, threshold: Number.isFinite(seuil) ? seuil : null });
    const spec = m.testPool(pnj, ctx);
    if (spec && spec.pool) return avecSeuil(spec);
    // ── Lot E : la réserve ANNONCÉE ──────────────────────────────────
    // L'édition ne tient pas de réserve pour ce participant — pas de
    // compétence, et pas de défausse au livre. Plutôt qu'un ⚄ mort, on garde
    // ce que le meneur a annoncé une fois. Même patron qu'`attrOverride`, et
    // pour la même raison : l'app ne fabrique pas le chiffre, elle le retient.
    const annonce = Chase.poolOverride(st, key);
    return annonce ? avecSeuil({ pool: annonce, label: "réserve annoncée", announced: true }) : null;
  },

  /* ========================================================
     LOT 4 — LE TEST DU ROUND PAIE SON ACTION

     `chaseModel.round.test.cost` disait « 1 majeure » (SR6) et « 1 action »
     (Anarchy 2.0) depuis l'écriture du moteur, et ne débitait rien : le
     compteur d'actions du tracker vivait dans une colonne, la piste dans une
     autre, et c'est le MJ qui devait se rappeler que le pilote avait brûlé sa
     majeure pour rester en course. C'est le motif exact que le CONTRIBUTING
     appelle « l'endroit où le contrat aplatit » : la clé portait la règle,
     personne ne la lisait.

     Trois précautions, chacune tirée d'une règle déjà écrite ailleurs :

     · **C'est une PERSONNE qui paie.** Sur la piste, ce qui a une position est
       l'ENGIN, mais ce qui lance les dés est quelqu'un (`_actorFor` : le
       conducteur d'une monture, l'intéressé sinon). Débiter une voiture n'a
       pas de sens — même arbitrage que l'Atout, déjà tenu par `chase.js`.
     · **Une fois par round.** `state.paid` garde la trace ; corriger un ✓ en ✗
       ne repasse pas à la caisse, et la fin de round remet le compteur à zéro.
     · **On informe, on ne refuse pas.** `_consumeAction` débite au-delà du
       budget et le DIT — garde-fou (e) du tracker. Un MJ qui fait tester un
       pilote sans majeure disponible sait ce qu'il fait ; l'app lui montre
       l'ardoise, elle ne lui retire pas son dé.
     ======================================================== */
  _payRound(key) {
    const st = this.state();
    const cost = Chase.testCost(this.edition());
    if (!st || !cost) return; // SR5, Anarchy 1re : le livre n'impose pas de test
    st.paid = st.paid || {};
    if (st.paid[key]) return;
    const pnj = this._actorFor(key);
    // Un participant hors du suivi de combat n'a pas de budget à débiter :
    // la piste accepte des figurants que le tracker ne connaît pas.
    const c = pnj && Encounter._find(pnj.id);
    if (!c) return;
    // ── Le test de la ronde est une ACTION NOMMÉE quand le livre la nomme ──
    // SR6 à pied écrit « une action majeure Sprinter » : ce n'est pas un débit
    // anonyme d'une majeure, c'est Sprinter. Passer par `useAction` fait donc
    // trois choses de plus, toutes déjà motorisées : le prix vient du
    // catalogue (une seule source), les interdictions du livre s'appliquent
    // (Électrocuté « ne peut effectuer une action Sprinter » — le geste est
    // refusé EN LE DISANT, et rien n'est marqué payé), et l'action laisse sa
    // trace comme les autres. Sans nom déclaré, on retombe sur le débit brut.
    const veh = this.vehicleOf(key);
    const terrain = veh ? "vehicule" : st.terrain;
    const nomme = Chase.testActionKey(this.edition(), terrain);
    if (nomme && Actions.find(pnj, nomme)) {
      const ok = Encounter.useAction(pnj.id, nomme, true) !== false;
      if (ok) st.paid[key] = true;
      return;
    }
    st.paid[key] = true;
    const over = Encounter._consumeAction(c, cost, pnj);
    // Texte brut : un toast n'est pas du HTML (l'échapper afficherait les
    // entités). Le libellé vient du livre via `round.test.cost` — « majeure »
    // en SR6, « action » en Anarchy 2.0 — jamais un mot écrit ici.
    if (over)
      toast(
        `${pnj.name} teste sans ${(this.model().round.test.cost || "1 action").replace(/^1 /, "")} disponible — l'ardoise est notée.`,
        "warning",
      );
  },

  /** Le geste du ⚄ : lancer si on peut, pointer sinon. Un test DÉJÀ posé se
      corrige d'un tap (cycle) — se tromper doit coûter un geste, pas un
      détour. */
  async testOrRoll(key) {
    const st = this.state();
    if (!st) return;
    if (st.tested[key]) return this.cycleTest(key);
    let spec = this.testSpec(key);
    if (!spec) {
      const acteur = this._actorFor(key);
      // Un PJ annonce, l'app n'invente ni sa réserve ni son résultat : le ⚄
      // POINTE (doctrine B3.5). Inchangé.
      if (!acteur || Encounter.isPlayerCharacter(acteur.id)) return this.cycleTest(key);
      // Un PNJ, lui, l'app tient sa fiche — et pourtant elle ne trouvait rien à
      // lancer : ni compétence de conduite, ni défausse déclarée par ce livre.
      // Le ⚄ était mort, et le meneur n'avait plus qu'à poser un ✓ au jugé.
      // On demande la réserve UNE fois, on la retient pour la poursuite.
      if (!(await this.promptPool(key))) return;
      spec = this.testSpec(key);
      if (!spec) return;
    }
    const pnj = this._actorFor(key);
    // On paie au LANCER, pas au résultat : le livre fait dépenser l'action
    // pour tenter le test, réussi ou non.
    this._payRound(key);
    const res = Dice.computeRoll(spec.pool);
    const suffixe = spec.threshold != null ? ` (seuil ${spec.threshold})` : "";
    DiceRoller.show(res, { label: `${spec.label}${suffixe}`, who: (pnj && pnj.name) || "?" });
    if (spec.threshold == null) {
      // SR5, Anarchy : pas de seuil (test opposé, ou difficulté arbitrée).
      // On lance, le MJ tranche — l'app ne décide pas d'un résultat qu'aucun
      // livre ne lui donne.
      toast(`${res.hits} succès — comparez, puis posez ✓ ou ✗.`);
      return;
    }
    Chase.setTest(this.edition(), st, key, res.hits >= spec.threshold ? "ok" : "ko");
    this._persist();
  },

  /** LES MANŒUVRES DE COURSE-POURSUITE (lot C) — jouables, enfin.

      Le livre SR5 ne fait pas de test par ronde : « ce sont des ACTIONS,
      choisies », et ces quatre-là SONT la mécanique de poursuite. Le contrat
      les portait entièrement — clé, libellé, PORTÉE, règles — et le rendu en
      faisait `actions.map(a => a.label).join(" · ")` : une liste de noms en
      gris, en bas du panneau, sans prix, sans règle, et surtout sans la
      portée qui décide si la manœuvre est seulement possible.

      Elles existaient une SECONDE fois, dans le catalogue d'actions, avec
      leurs coûts réels et les mêmes clés. C'est cette copie-là qui fait foi
      ici : le coût vient du catalogue (une seule source), la poursuite
      n'ajoute que ce qu'elle seule sait — d'où on tire, et si c'est assez
      près.

      Le filtre INFORME, il n'interdit pas : une manœuvre hors de portée est
      rendue ternie avec sa raison, jamais retirée. Le livre écrit une
      condition, pas une interdiction, et c'est le MJ qui arbitre une
      situation que l'app ne voit pas. */
  chaseActions(key) {
    const st = this.state();
    const pnj = this._actorFor(key);
    // Le terrain de CETTE ligne, pas celui de la piste : sur une piste mixte,
    // celui qui a sauté dans une bagnole a droit aux manœuvres de véhicule
    // pendant que le coureur d'à côté n'a que les siennes (lot G).
    const decl = Chase.roundActions(this.edition(), this.vehicleOf(key) ? "vehicule" : st.terrain);
    if (!st || !pnj || !decl.length) return [];
    // Pas encore posé sur une bande = pas encore dans la course : aucune
    // manœuvre à proposer, et surtout aucune portée à comparer. (Trouvé en
    // vérification : `Pursuit.open` rend la fiche avant que `fill` n'ait posé
    // qui que ce soit, et la phrase de portée plantait sur une bande nulle —
    // le panneau entier ne se rendait plus.)
    const bande = Chase.laneOf(st, key);
    if (!bande) return [];
    const lanes = Chase.lanes(this.edition(), st.terrain);
    const nomDeBande = (k) => (lanes.find((l) => l.key === k) || {}).label || k || "";
    return decl
      .map((a) => {
        // Le catalogue fait foi pour le prix et les règles ; la déclaration de
        // poursuite ajoute la portée. Sans entrée au catalogue, on n'invente
        // pas de coût : la manœuvre reste un rappel, sans bouton.
        const entry = Actions.find(pnj, a.key);
        if (!entry) return null;
        const ok = Chase.rangeAllows(a.range, bande);
        return {
          key: a.key,
          name: entry.name || a.label,
          cost: Actions.costLabel(pnj, entry, entry.cost),
          lines: a.lines || entry.lines || [],
          allowed: ok,
          why: ok
            ? ""
            : `Portée ${nomDeBande(a.range).toLowerCase()} requise — ${pnj.name} est à ${nomDeBande(bande).toLowerCase() || "une autre portée"}`.trim(),
          pnjId: pnj.id,
        };
      })
      .filter(Boolean);
  },

  /** Ce que l'échec coûte ICI, prêt à lancer si c'est un jet (test
      d'Accident) — proposé, jamais appliqué. */
  rollFail(key) {
    const st = this.state();
    const spec = this.testSpec(key);
    const cost = Chase.failCost(this.edition(), st);
    if (!cost) return;
    if (!spec) {
      toast(`Échec — ${cost}. À résoudre à la table.`);
      return;
    }
    const pnj = this._actorFor(key);
    const res = Dice.computeRoll(spec.pool);
    DiceRoller.show(res, { label: `${cost} — ${spec.label}`, who: (pnj && pnj.name) || "?" });
  },

  /** Demande la réserve du test au meneur, et la retient (lot E). Le pendant
      exact de `promptAttr` : quand le livre ne donne rien à l'app, elle
      propose la saisie au lieu de fabriquer un chiffre — ou de rester muette,
      ce qui était pire. → true si une réserve est désormais connue. */
  async promptPool(key) {
    const st = this.state();
    if (!st) return false;
    const pnj = this._actorFor(key);
    const nom = (pnj && pnj.name) || "Ce participant";
    const terr = Chase.terrain(this.edition(), this.vehicleOf(key) ? "vehicule" : st.terrain) || {};
    // ⚠ `Dialog.prompt` ne connaît PAS de `message` : il masque cet élément et
    // n'affiche que `title` et `label`. Un texte passé en `message` disparaît
    // sans un mot — vu en vérification, la modale ne montrait que son titre.
    const raw = await Dialog.prompt({
      title: "Réserve du test de la ronde",
      label: `${nom} n'a pas la compétence sur sa fiche, et ce livre ne règle pas la défausse — annoncez la réserve.${
        terr.testLabel ? ` Le test est « ${terr.testLabel} ».` : ""
      } Elle est retenue pour toute la poursuite.`,
      value: String(Chase.poolOverride(st, key) ?? ""),
    });
    if (raw === null) return false;
    Chase.setPoolOverride(st, key, raw.trim());
    this._persist();
    return !!Chase.poolOverride(st, key);
  },

  setTest(pnjId, res) {
    const st = this.state();
    if (!st) return;
    Chase.setTest(this.edition(), st, pnjId, res);
    this._persist();
  },
  cycleTest(pnjId) {
    const st = this.state();
    if (!st) return;
    const cur = st.tested[pnjId] || null;
    // Poser un résultat à la main, c'est le chemin des PJ (l'app ne lance
    // jamais pour eux, doctrine B3.5) : leur action est dépensée en fiction
    // exactement comme celle d'un PNJ dont on a lancé le dé.
    if (cur === null) this._payRound(pnjId);
    Chase.setTest(this.edition(), st, pnjId, cur === null ? "ok" : cur === "ok" ? "ko" : null);
    this._persist();
  },
  toggleEdgeUp(pnjId) {
    const st = this.state();
    if (!st) return;
    if (st.edgeUp[pnjId]) delete st.edgeUp[pnjId];
    else st.edgeUp[pnjId] = true;
    this._persist();
  },

  /* ---- Sorties de course ---- */
  drop(pnjId, reason) {
    const st = this.state();
    if (!st) return;
    Chase.drop(st, pnjId, reason);
    this._persist();
    const nom = (PnjLookup.find(pnjId) || {}).name || "Le participant";
    toast(reason === "accident" ? `${nom} — accident, hors course.` : `${nom} est semé.`);
  },
  restore(pnjId) {
    const st = this.state();
    if (!st) return;
    Chase.restore(st, pnjId);
    this._persist();
  },

  /* ---- Valeur d'attribut saisie à la main ----
     Le PJ léger n'a ni Agilité ni Force, et un véhicule d'un autre ouvrage
     n'a pas encore son Intervalle de vitesse : l'app DEMANDE au lieu
     d'inventer (décision n°5 du chantier). */
  setAttr(pnjId, value) {
    const st = this.state();
    if (!st) return;
    const n = parseInt(value, 10);
    if (Number.isFinite(n) && n >= 0) st.attrOverride[pnjId] = n;
    else delete st.attrOverride[pnjId];
    this._persist();
  },
  async promptAttr(key) {
    const st = this.state();
    if (!st) return;
    // Le régime de CETTE ligne, pas celui de la piste : sur une piste mixte,
    // on demande l'Intervalle de vitesse à la bagnole et la Force au coureur.
    const spec = Chase.attrSpec(this.edition(), st.env, this.vehicleOf(key) ? "vehicule" : st.terrain);
    const nom = (PnjLookup.find(key) || {}).name || "Ce participant";
    // `label`, pas `message` : `Dialog.prompt` masque l'élément de message et
    // n'a jamais affiché cette phrase — la modale ne montrait que son titre.
    // Défaut d'origine, corrigé en même temps que son jumeau `promptPool`.
    const raw = await Dialog.prompt({
      title: spec ? spec.label : "Attribut du round",
      label: `${nom} — valeur à comparer ce round. L'app ne la trouve ni sur la fiche ni au catalogue : annoncez-la.`,
      value: String(st.attrOverride[key] ?? ""),
    });
    if (raw === null) return;
    this.setAttr(key, raw.trim());
  },

  /* ---- Réserve de course-poursuite (SR6) ---- */
  addPool(pnjId, delta) {
    const st = this.state();
    if (!st) return;
    Chase.addPool(this.edition(), st, pnjId, delta);
    this._persist();
  },
  /** Le gain d'Atout du round (SR6) : « le camp ayant l'indice le plus élevé
      gagne un point d'Atout. Seul un point est attribué. » L'app le PROPOSE
      au dominant en un tap — c'est un gain automatique que les tables
      oublient tous les rounds — mais ne l'applique jamais d'elle-même. */
  grantEdge(key) {
    const m = this.model();
    if (!m || !(m.edge && m.edge.compare)) return;
    // L'Atout va à une PERSONNE, jamais à une carrosserie : sur une monture,
    // c'est le conducteur qui l'encaisse (le livre parle du « camp », et le
    // camp d'un véhicule tient le volant).
    const pnj = this._actorFor(key);
    if (!pnj) return;
    Encounter.adjustEdge(pnj.id, 1);
    toast(`${pnj.name || "Le dominant"} — +1 point d'Atout (attribut le plus élevé du round).`);
  },

  setPoolMax(pnjId, value) {
    const st = this.state();
    if (!st) return;
    const n = parseInt(value, 10);
    if (Number.isFinite(n) && n > 0) st.poolMax[pnjId] = n;
    else delete st.poolMax[pnjId];
    this._persist();
  },

  /* ---- Fin de round ----
     Ne déplace personne : le MJ a posé les jetons pendant le round. Ce que
     la fin de round produit, c'est un RÉSUMÉ (qui a gagné ou perdu une
     bande, qui n'a pas testé), annulable. */
  /** `driven` : la fin de ronde vient du COMBAT, pas d'un tap sur la piste
      (cf. `Chase.followsCombat`). Deux différences, une seule raison — il n'y
      a qu'une ronde, donc il ne peut y avoir qu'un endroit où l'on avance et
      qu'un endroit où l'on revient en arrière :

      · pas de `toastUndo`. Annuler la seule ronde de la piste laisserait le
        combat à la ronde suivante : on recréerait la dérive qu'on vient de
        supprimer, avec le bouton d'à côté. Le récapitulatif reste affiché dans
        le panneau, en permanence — plus utile qu'un toast de trois secondes.
      · pas de toast du tout : `Encounter.nextRound` parle déjà, et il n'y a
        qu'un `#toast` (le second écrase le premier). */
  /** Le casting de la piste vu par le MOTEUR : pour chaque clé, est-ce
      quelqu'un qu'un joueur pilote, et de quel camp. `Chase` ne connaît ni le
      tracker ni la bibliothèque — c'est ici, couche 5, qu'on le lui dit.

      Le PJ se lit sur la PERSONNE, jamais sur la clé : une clé de piste peut
      être une carrosserie, et une carrosserie n'a pas de joueur. C'est le
      conducteur qui décide — le même arbitrage que pour l'Atout et pour le
      débit du test. */
  _actors() {
    const st = this.state();
    if (!st) return {};
    const map = {};
    // L'ANCRE en fait partie, et il fallait y penser : ancrer un participant le
    // retire des bandes (`lanes`), or c'est justement elle que SR6 empêche de
    // bouger. Sans sa ligne ici, son rôle arrivait indéfini au moteur et le
    // garde « la cible ne peut pas adapter sa position » ne se déclenchait
    // jamais — le seul jeton que le livre immobilise aurait été le seul à
    // bouger sans condition.
    for (const key of [...Object.keys(st.lanes || {}), st.targetId].filter(Boolean)) {
      const pnj = this._actorFor(key);
      map[key] = {
        isPJ: !!(pnj && Encounter.isPlayerCharacter(pnj.id)),
        role: Encounter.chaseRoleFor(pnj ? pnj.id : key),
      };
    }
    return map;
  },

  endRound({ driven = false } = {}) {
    const st = this.state();
    if (!st) return null;
    const recap = Chase.endRound(this.edition(), st, this._actors());
    this._persist();
    if (driven) return recap;
    const nom = (id) => (PnjLookup.find(id) || {}).name || "?";
    const bits = (recap.moves || []).map((m) => `${nom(m.pnjId)} ${m.delta > 0 ? "+" : ""}${m.delta}`);
    if (recap.untested.length)
      bits.push(`${recap.untested.length} sans test — le livre les fait perdre la course`);
    toastUndo(bits.length ? bits.join(" · ") : `Round ${st.round}.`, () => {
      Chase.undoRound(st);
      this._persist();
    });
    return recap;
  },

  /** Appelé par `Encounter.nextRound` — le pendant exact de
      `Intrusion.nextTurn` pour le 3ᵉ moteur. Ne fait rien si la piste tient sa
      propre horloge (filature). */
  followCombatRound() {
    const st = this.state();
    if (!st || !Chase.followsCombat(this.edition(), st)) return;
    this.endRound({ driven: true });
  },

  /** La ronde de la piste est-elle pilotée par le combat ? Vrai seulement si
      les DEUX moteurs tournent — une poursuite Anarchy, seule en scène, garde
      son bouton. */
  isCombatDriven() {
    const st = this.state();
    return !!(st && Encounter.hasMotor("combat") && Chase.followsCombat(this.edition(), st));
  },

  /** Annule la dernière fin de round. Le toast s'efface au bout de quelques
      secondes — le MJ, lui, s'aperçoit de son mé-tap deux minutes plus tard :
      le bandeau de résumé garde donc son propre ↩, sans limite de temps. */
  undoRound() {
    const st = this.state();
    if (!st || !Chase.undoRound(st)) return;
    this._persist();
    toast("Round annulé.");
  },

  /* ---- Lectures dérivées (pour le rendu du lot P2 et la console) ---- */

  /** Une ligne de piste, prête à rendre. `key` est la CLÉ DE PISTE — l'id de
      l'engin quand la ligne est une monture, l'id du participant sinon —, et
      c'est elle que le rendu renvoie dans `data-id` pour tout ce qui touche à
      la POSITION. Ce qui touche à une personne (Atout, feuille d'actions)
      passe par `driverId` / `crew`.

      ── Le régime de la LIGNE, pas de la piste (lot P6) ──
      Depuis qu'on peut sauter dans une bagnole en pleine poursuite à pied,
      les deux régimes cohabitent : le coureur garde le terrain de la piste,
      celui qui est monté passe en « véhicule ». Sans ça, le chiffre du jeton
      mentirait — c'est la première des deux règles d'affichage du composant. */
  _row(key, { crew = null, driverId = null, fallbackName = "" } = {}) {
    const st = this.state();
    const ed = this.edition();
    const monte = !!crew;
    const veh = monte ? PnjLookup.find(key) : null;
    const pilote = PnjLookup.find(monte ? driverId : key);
    const terrain = monte ? "vehicule" : st.terrain;
    return {
      key,
      name: monte ? (veh && veh.name) || "Véhicule" : (pilote && pilote.name) || fallbackName || "?",
      /** Non nul ⇒ la ligne est une monture. Le rendu s'en sert pour le
          libellé du jeton et pour la feuille d'équipage. */
      crew: monte
        ? crew.map((id) => ({
            pnjId: id,
            name: (PnjLookup.find(id) || {}).name || "?",
            driver: id === driverId,
          }))
        : null,
      driverId: monte ? driverId : key,
      kind: veh ? veh.kind : null,
      terrain,
      /** CE QUI VOUS PORTE (lot P7) : les vitesses à pied quand on court, les
          caractéristiques de l'engin quand on roule. Symétrie voulue — la
          fiche répond à la même question dans les deux cas. Le jeton, lui,
          n'en montre rien : le §6.10 du design system interdit un quatrième
          canal, alors le chiffre vit dans l'infobulle et dans la fiche. */
      move: monte ? null : Movement.rates(pilote, { edition: ed, statuses: Statuses.active(pilote).map((s) => s.key) }),
      attr: Chase.attrSpec(ed, st.env, terrain),
      lane: Chase.laneOf(st, key),
      value: Chase.attrValue(ed, pilote, st, { ride: veh, terrain }),
      trend: Chase.trend(ed, st, key),
      /** Franchissement en cours (Anarchy) : `{ to, left }`. Le jeton l'affiche
          au lieu d'une position qu'il n'a pas encore atteinte. */
      crossing: Chase.crossing(st, key),
      test: st.tested[key] || null,
      edgeUp: !!st.edgeUp[key],
      out: st.out[key] || null,
      pool: st.pool[key] || 0,
    };
  },

  /** Une ligne par ENTITÉ DE PISTE : une par monture (le livre donne une
      position à un véhicule, pas une par occupant — trois runners dans le
      même taxi, c'est un jeton, un test, un Intervalle de vitesse), une par
      combattant resté sur ses jambes. */
  rows() {
    const st = this.state();
    if (!st) return [];
    const montes = new Set();
    const out = [];
    for (const vehId of Object.keys(st.rides || {})) {
      const r = st.rides[vehId];
      (r.crew || []).forEach((id) => montes.add(id));
      if (vehId !== st.targetId) out.push(this._row(vehId, { crew: r.crew || [], driverId: r.driverId }));
    }
    for (const c of Encounter.state.combatants) {
      if (montes.has(c.pnjId) || c.pnjId === st.targetId) continue;
      out.push(this._row(c.pnjId, { fallbackName: c.name }));
    }
    return out;
  },

  /** L'entrée d'ancre (la cible), même forme qu'une ligne — elle peut être un
      véhicule depuis le lot P6 (c'est même le cas ordinaire : on poursuit une
      bagnole, pas son conducteur). */
  targetRow() {
    const st = this.state();
    if (!st || !st.targetId) return null;
    const r = Chase.ride(st, st.targetId);
    return this._row(st.targetId, r ? { crew: r.crew || [], driverId: r.driverId } : {});
  },

  /** Qui domine ce round (l'accent). `attr` accompagne chaque valeur : c'est
      lui qui fait taire la comparaison quand la piste est mixte — aucun livre
      ne met un Intervalle de vitesse en face d'une Force. */
  dominant() {
    const st = this.state();
    if (!st) return null;
    const all = this.rows().filter((r) => !r.out);
    const t = this.targetRow();
    if (t) all.push(t);
    return Chase.dominantId(
      all.map((r) => ({ pnjId: r.key, value: r.value, attr: r.attr && r.attr.short })),
    );
  },
  summary() {
    return Chase.summary(this.edition(), this.state());
  },

  /** Quelle feuille d'actions est dépliée — état de VUE éphémère (jamais
      persisté), comme `_activeCardId` du tracker. */
  _sheetFor: null,
  /** Réglages dépliés (mode/terrain/environnement) — état de vue éphémère.
      Repliés par défaut : on les touche une fois par scène. */
  _settingsOpen: false,
  toggleSettings() {
    this._settingsOpen = !this._settingsOpen;
    Encounter._render();
  },
  toggleSheet(pnjId) {
    this._sheetFor = this._sheetFor === pnjId ? null : pnjId;
    Encounter._render();
  },

  /* ========================================================
     LES ACTIONS D'ATOUT DE POURSUITE (lot P4)

     Elles étaient au catalogue depuis F5 — 14 entrées, coût, hôte, rôle — et
     n'avaient AUCUNE surface : `Actions.grafts` ne remonte que les entrées
     portant un `host` du catalogue F1, et **aucune des 14 n'en a**. C'est
     normal : leur hôte, le livre l'écrit en toutes lettres, c'est « l'action
     majeure nécessaire au test de Pilotage ou d'Athlétisme requis chaque
     round ». Autrement dit : la piste. Elles sont donc chez elles ici.
     ======================================================== */

  /** Les actions d'Atout jouables par ce participant, dans CETTE poursuite.
      → { visibles, ecartees, role, edge } ou null hors poursuite. */
  edgeActionsFor(pnjId) {
    const st = this.state();
    const pnj = PnjLookup.find(pnjId);
    if (!st || !pnj) return null;
    const c = Encounter._find(pnjId);
    const role = Encounter.chaseRoleFor(pnjId);
    const res = EdgeActions.resolve(pnj, {
      declared: Encounter.edgeContextsFor(c || { pnjId }),
      role,
      withOptional: !!(c && c.edgeOptional),
    });
    // Ne remonter QUE celles de la poursuite : le reste du catalogue a ses
    // propres surfaces (greffons d'action, panneau d'attaque) et n'a rien à
    // faire sur une piste.
    return {
      role,
      edge: (c && c.edge) || 0,
      visibles: res.visibles.filter((e) => e.where === "poursuite"),
      ecartees: res.ecartees.filter((x) => x.entry.where === "poursuite"),
    };
  },

  /** Dépense : déléguée telle quelle au débit déjà écrit (F5d) — il gère
      l'Atout, l'action quand l'entrée en coûte une, et les surtaxes
      annulées. Rien à réécrire ici. */
  useEdgeAction(pnjId, key) {
    Encounter.useEdgeAction(pnjId, key);
  },

  /** LA POURSUITE VUE DEPUIS LA CONSOLE DE COMBAT (lot C).

      La console répond à « que fait celui dont c'est le tour ? ». Tant qu'une
      poursuite tourne, la réponse comporte une moitié que la console ne
      montrait pas : où il en est sur la piste, s'il a fait le test que le
      livre lui impose, et quelles manœuvres sa portée lui ouvre. Le MJ devait
      regarder deux endroits pour un seul tour.

      Un paquet MINIMAL, volontairement : pas de second panneau de poursuite
      dans la console. Ce qui remonte est ce qui se décide au tour de
      quelqu'un — sa bande, son test, son déplacement acquis, ses manœuvres en
      portée. Le reste (ancrage, réserve, équipage, sortie de course) reste sur
      la piste, où il se lit à un mètre.

      → `null` hors poursuite, ou si ce participant n'y est pas. */
  consoleRow(pnjId) {
    const st = this.state();
    if (!st || !pnjId) return null;
    const key = Chase.trackKey(st, pnjId);
    const surLaPiste = !!st.lanes[key] || key === st.targetId;
    if (!surLaPiste) return null;
    const ed = this.edition();
    const ancre = key === st.targetId;
    const lanes = Chase.lanes(ed, st.terrain);
    const bande = Chase.laneOf(st, key);
    const role = Encounter.chaseRoleFor(pnjId);
    return {
      key,
      ancre,
      /** L'ancre n'a pas de bande : tout se mesure à elle, et le dire vaut
          mieux qu'afficher un vide. */
      laneLabel: ancre
        ? "cible de la poursuite"
        : (lanes.find((l) => l.key === bande) || {}).label || "hors piste",
      test: st.tested[key] || null,
      roll: this.testSpec(key),
      earned: Chase.earnedMove(ed, st, key, role),
      forward: Chase.forward(role),
      mustRetest: Chase.mustRetest(st, key),
      crossing: Chase.crossing(st, key),
      /** Les manœuvres du livre, portée déjà évaluée (SR5 seul en déclare). */
      actions: this.chaseActions(key),
      /** L'identité de la PERSONNE, distincte de la clé de piste : l'Atout et
          l'embarquement appartiennent à quelqu'un, pas à une carrosserie. */
      pnjId,
      /** Les 14 actions d'Atout de course-poursuite (SR6). Elles n'avaient de
          surface que dans la fiche de piste ; elles rejoignent la console au
          lot F, avec les manœuvres — c'est là qu'on joue. */
      edge: this.edgeActionsFor(pnjId),
      resourceLabel: (() => {
        const p = PnjLookup.find(pnjId);
        return p && p.type !== "vehicle" ? EdgeActions.resourceLabel(p) : "";
      })(),
      /** L'embarquement — monter, prendre le volant, descendre : trois gestes
          qui coûtent le tour de quelqu'un, donc trois gestes de console. */
      ride: this.rideOf(pnjId),
      glyph: (this.model() || {}).glyph || "⇉",
      earnedLabel: (() => {
        const r = Chase.moveRule(ed);
        if (!r || !Number.isFinite(r.onSuccess)) return "Déplacement";
        return r.via === "cross" ? "Bande à franchir" : "Catégorie de distance";
      })(),
    };
  },

  /** Le paquet complet que le rendu consomme — assemblé ICI (couche 5, seule
      à pouvoir lire les fiches) pour que `ChaseRenderer` reste PUR : il reçoit
      des données déjà résolues et rend du HTML, comme `EncounterRenderer`.
      → null si aucune poursuite n'est ouverte (le rendu se masque alors). */
  viewModel() {
    const st = this.state();
    if (!st) return null;
    const ed = this.edition();
    const m = this.model();
    if (!m) return null;
    const rows = this.rows();
    const target = this.targetRow();
    const dominantId = this.dominant();
    // La réserve du test rejoint chaque ligne : le rendu affiche « ⚄ 12 »
    // quand l'app la tient, et un ⚄ nu quand c'est au joueur d'annoncer.
    // Et depuis le lot A, le DÉPLACEMENT ACQUIS : le jeton l'annonce (▲▼
    // allumés) au lieu de le prendre. Un PNJ ne l'annonce pas longtemps — la
    // fin de round le lui fait prendre ; le rendu montre donc surtout ceux
    // dont quelqu'un, à la table, doit décider.
    const acteurs = this._actors();
    for (const r of [...rows, target].filter(Boolean)) {
      r.roll = this.testSpec(r.key);
      const a = acteurs[r.key] || {};
      r.isPJ = !!a.isPJ;
      r.earned = Chase.earnedMove(ed, st, r.key, a.role);
      /** Cascade (SR5) : ce poursuivant doit refaire le test. `"lost"` quand
          il est déjà à la dernière bande — rater lui ferait perdre la cible,
          et ça, c'est une issue que le MJ déclare. */
      r.mustRetest = Chase.mustRetest(st, r.key);
      /** Le sens « vers l'avant » de CE participant, pour que le rendu sache
          quel chevron mettre en avant quand le livre ne laisse pas le choix
          (Anarchy 2.0 : « le vainqueur progresse vers son objectif »). */
      r.forward = Chase.forward(a.role);
    }
    const byLane = {};
    for (const r of rows) if (!r.out && r.lane) (byLane[r.lane] ||= []).push(r);
    const terr = m.terrains[st.terrain] || {};
    // Piste MIXTE : deux familles d'attribut sur la même piste (un coureur et
    // une bagnole). La barre du round le dit, et plus aucun dominant n'est
    // proposé — cf. `Chase.dominantId`.
    const familles = new Set(
      [...rows, target].filter(Boolean).map((r) => r.attr && r.attr.short).filter(Boolean),
    );
    return {
      round: st.round,
      /** La ronde est-elle tenue par le combat ? Le rendu s'en sert pour
          remplacer son bouton d'avance par une mention et retirer son ↩ —
          on avance et on revient en arrière à UN seul endroit. */
      combatDriven: this.isCombatDriven(),
      total: st.total || null,
      mode: st.mode,
      modeSpec: Chase.mode(ed, st.mode) || { label: "Poursuite", counter: "Round" },
      modes: Object.entries(Chase.modes(ed)).map(([key, v]) => ({ key, label: v.label })),
      /** Filature : les deux tests de la phase, l'Atout que
          l'environnement donne à l'un ou l'autre camp, et le dé libre — qui
          suit la distance et change de camp. */
      trailing: (() => {
        const spec = Chase.mode(ed, st.mode);
        if (!spec || !spec.tests) return null;
        const parEnv = (spec.edgeByEnv || {})[st.env] || null;
        return { tests: spec.tests, edge: parEnv, freeDie: Chase.freeDie(ed, st) };
      })(),
      glyph: m.glyph || "⇉",
      terrain: st.terrain,
      terrains: Object.entries(m.terrains).map(([key, t]) => ({ key, label: t.label, unruled: !!t.unruled })),
      terrainNote: terr.note || "",
      unruled: !!terr.unruled,
      testLabel: terr.testLabel || "",
      /** Sur une piste MIXTE, le rappel du pied ne vaut que pour la moitié des
          jetons : celui qui roule ne fait pas de test d'Athlétisme. On nomme
          donc les DEUX tests, avec leur régime — un rappel à moitié vrai est
          plus trompeur qu'un rappel absent. */
      testAlt: (() => {
        if (familles.size < 2) return null;
        const autre = st.terrain === "pied" ? "vehicule" : "pied";
        const t = m.terrains[autre];
        return t && t.testLabel ? { label: t.testLabel, terrainLabel: t.label } : null;
      })(),
      testRequired: !!(m.round && m.round.test && m.round.test.required),
      testCost: (m.round && m.round.test && m.round.test.cost) || "",
      opposed: !!(m.round && m.round.test && m.round.test.opposed),
      actions: (m.round && m.round.actions) || [],
      env: st.env,
      envs: Chase.envs(ed).map((e) => ({ key: e.key, label: e.label, examples: e.examples || "" })),
      envLabel: (Chase.env(ed, st.env) || {}).label || "",
      attr: Chase.attrSpec(ed, st.env, st.terrain),
      /** La piste porte-t-elle deux régimes à la fois ? La barre du round le
          dit, et la comparaison d'Atout se tait (lot P6). */
      mixte: familles.size > 1,
      failCost: Chase.failCost(ed, st),
      lanes: Chase.lanes(ed, st.terrain).map((l) => ({ ...l, rows: byLane[l.key] || [] })),
      target,
      dominantId,
      outcomes: Chase.outcomes(ed, st) || { caught: null, lost: null },
      summary: this.summary(),
      dropped: rows.filter((r) => r.out),
      unplaced: rows.filter((r) => !r.out && !r.lane),
      /** Le résumé du round qui vient de se terminer — résolu en NOMS ici
          (le rendu ne connaît pas les fiches). Ce que Savage Worlds appelle
          « le round produit un événement » : un round qui passe sans rien
          dire est un round qu'on oublie. */
      /** La feuille d'actions d'Atout ouverte, s'il y en a une : un seul
          participant à la fois (la piste est consultée en saccades, pas
          parcourue). */
      sheetFor: this._sheetFor || null,
      /** Une monture n'a pas d'Atout — une carrosserie n'en dépense pas. Sa
          feuille montre son ÉQUIPAGE, et c'est en tapant un nom d'équipier
          qu'on ouvre les 14 actions, sur SA fiche à lui (lot P6). */
      sheet: this._sheetFor && !this.vehicleOf(this._sheetFor) ? this.edgeActionsFor(this._sheetFor) : null,
      /** Les manœuvres du livre pour CE participant, avec leur portée évaluée
          depuis sa bande (lot C). Vide là où le livre n'en donne pas — SR6 les
          remplace par le test de la ronde et ses actions d'Atout, Anarchy n'a
          pas de catalogue d'actions du tout. */
      sheetActions: this._sheetFor ? this.chaseActions(this._sheetFor) : [],
      /** L'état du participant dont la fiche est ouverte : la fiche porte
          désormais les GESTES que le jeton ne montre plus sur écran étroit
          (ancrer, avantage, réserve, sortie, saisie). Sans elle, masquer ces
          boutons les aurait supprimés — ils sont déplacés, pas retirés. */
      sheetRow: this._sheetFor
        ? [...rows, target].find((r) => r && r.key === this._sheetFor) || null
        : null,
      /** La monture DU PARTICIPANT dont la fiche est ouverte — non nul quand
          la fiche est celle d'un équipier (ouverte en tapant son nom dans la
          feuille de l'engin) : elle porte alors « Prendre le volant » et
          « Descendre » au lieu des gestes de position, qui appartiennent à la
          voiture. */
      sheetRide: this._sheetFor ? this.rideOf(this._sheetFor) : null,
      /** L'ENGIN dont la fiche est ouverte, avec la ligne de stats que le MJ
          veut voir sans quitter la piste. Non nul ⇒ la feuille est celle d'une
          monture, et elle montre son équipage. */
      sheetVehicle: (() => {
        const v = this._sheetFor && this.vehicleOf(this._sheetFor);
        if (!v) return null;
        const s = v.stats || {};
        const cell = (lbl, val) => (Number.isFinite(val) ? `${lbl} ${val}` : null);
        return {
          name: v.name,
          kind: v.kind,
          // Ce que le livre ne donne pas ne s'affiche pas : le catalogue ne
          // porte `intervalle`/`maniaHors` que pour les livres de base (lot P0).
          stats: [
            cell("Man", s.mania),
            cell("Man hr", s.maniaHors),
            cell("Accél", s.accel),
            cell("IdV", s.intervalle),
            cell("Vit", s.vitesse),
            cell("Mob", s.mobilite),
          ].filter(Boolean),
        };
      })(),
      sheetIsTarget: this._sheetFor && st.targetId === this._sheetFor,
      sheetName: this._sheetFor ? (PnjLookup.find(this._sheetFor) || {}).name || "?" : "",
      /** Nom VF de la ressource de la fiche affichée, "" si l'édition n'en a
          pas ou si la fiche est une carrosserie (une carrosserie ne dépense
          rien). Jamais de littéral : un `"Atout"` en dur ici faisait dire à
          Anarchy 2.0 le mot de SR6 — cf. EdgeActions.resourceLabel. */
      resourceLabel: (() => {
        const pnj = this._sheetFor ? PnjLookup.find(this._sheetFor) : null;
        return pnj && pnj.type !== "vehicle" ? EdgeActions.resourceLabel(pnj) : "";
      })(),
      /** Résolution de nom pour le rendu (qui ne connaît pas les fiches). */
      nameOf: (id) => (PnjLookup.find(id) || {}).name || "?",
      /** Mise en forme des vitesses — une seule, partagée par la piste, la
          fiche PNJ et le tracker, pour qu'ils disent le même chiffre au
          caractère près (`Movement.label` / `Movement.detail`). */
      moveLabel: (m) => Movement.label(m),
      moveDetail: (m) => Movement.detail(m),
      moveNum: (v) => Movement.num(v),
      /** Ce que l'édition dit quand elle ne compte PAS en mètres (Anarchy :
          des portées et des Narrations). Un vide assumé, pas un trou. */
      moveNote: Movement.narrativeNote(ed),
      /** Vierge = aucun déplacement, aucun test, aucun round joué : c'est le
          moment où l'amorce sert, et le seul. */
      /** ⚠ On itère sur `lanes`, pas sur `prev` : ancrer un participant le
          RETIRE des bandes, et comparer `prev` à un `lanes` devenu
          `undefined` faisait passer la piste pour « déjà jouée » dès le
          premier ancrage — l'amorce ne s'affichait donc jamais. */
      vierge:
        st.round === 1 &&
        !Object.keys(st.tested).length &&
        !Object.keys(st.lanes).some((k) => st.prev[k] && st.prev[k] !== st.lanes[k]),
      settingsOpen: !!this._settingsOpen,
      recap: (() => {
        const r = st.log && st.log[0];
        if (!r) return null;
        const nom = (id) => (PnjLookup.find(id) || {}).name || "?";
        return {
          round: r.round,
          moves: (r.moves || []).map((mv) => ({ name: nom(mv.pnjId), delta: mv.delta })),
          untested: (r.untested || []).map(nom),
        };
      })(),
      edgeCompare: !!(m.edge && m.edge.compare),
      /** L'édition a-t-elle des actions d'Atout de poursuite ? SR6 en a 14 ;
          les trois autres n'en ont aucune (Anarchy a ses points d'Anarchy,
          SR5 sa Chance sans catalogue nommé). Le bouton disparaît alors. */
      hasEdgeActions: !!(m.edge && m.edge.roles),
      failCostLabel: Chase.failCost(ed, st),
      poolOn: !!(m.edge && m.edge.chasePool) && !(Chase.mode(ed, st.mode) || {}).noPool,
      poolLabel: (m.edge && m.edge.poolLabel) || "Réserve",
      /** Ce que la réussite a gagné, dans la monnaie de CETTE piste : une
          catégorie de distance là où le livre déplace d'un coup (SR6), un
          franchissement là où il compte des Narrations (Anarchy). Le libellé
          se dérive du contrat, jamais d'un littéral — « catégorie » est le mot
          de SR6, il n'a rien à faire sur une piste Anarchy. */
      earnedLabel: (() => {
        const r = Chase.moveRule(ed);
        if (!r || !Number.isFinite(r.onSuccess)) return "";
        const n = r.onSuccess;
        return r.via === "cross"
          ? `Déplacement acquis — ${n} bande${n > 1 ? "s" : ""} à franchir`
          : `Déplacement acquis — ${n} catégorie${n > 1 ? "s" : ""} de distance`;
      })(),
      /** L'ancre a-t-elle un déplacement acquis à prendre ? Elle n'a pas de
          bande, donc pas de ▲▼ ordinaires : le rendu lui en pose une paire à
          part, qui écrit sur les autres (`Chase.stepAnchor`). Vaut toujours
          `null` en SR6, dont le livre l'immobilise. */
      anchorEarned: target ? target.earned : null,
    };
  },
};

// Pont couche 5 (migration modules ES) — retiré en fin de migration.
window.Pursuit = Pursuit;
