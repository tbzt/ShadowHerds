"use strict";

/* ============================================================
   TRACKER D'INTRUSION — état de run en direct.
   Sépare l'état vivant d'une intrusion matricielle (tours, CI
   déployées, Score de Surveillance, marks, Surveillance du DIEU)
   de la génération/persistance des serveurs (js/controllers/servers.js).

   Cet état vivant est scène-scopée (`Encounter.state.matrix
   {serverId → intrusion}`) — plus `srv.intrusion`, qui
   ne redevient qu'une définition. Ce module ne possède toujours aucune
   donnée : il lit et mute l'état renvoyé par `Encounter.intrusionFor(id)`,
   puis délègue la persistance à `Encounter._commit()` (source unique de
   la scène) + un rendu du panneau Serveurs (qui affiche aussi cet état).
   Les catalogues/règles de CI restent délégués à Matrix, comme
   dans Servers.
   ============================================================ */
import { Debug } from "../core/debug.js";
import { Dice } from "../rules/dice.js";
import { DiceRoller } from "../widgets/dice/diceroller.js";
import { Encounter } from "./encounter.js";
import { Matrix } from "../rules/matrix.js";
import { Servers } from "./servers.js";
import { Utils } from "../core/utils.js";

export const Intrusion = {
  /** État neuf d'une intrusion (forme de l'objet `state.matrix[serverId]`). */
  newState() {
    return {
      open: false,
      alerted: false,
      turn: 0,
      ics: {},
      // Marks SR5, DEUX directions distinctes (les livres les séparent, max 3
      // par cible, p.233) :
      //  · marksOn {pnjId → 0..3} : marks du SERVEUR sur chaque persona PJ.
      //    Un seul compteur côté serveur, PARTAGÉ par toutes ses CI (et le spider,
      //    qui pose au nom du serveur) — SR5 p.247 : les CI utilisent les marks
      //    de leur serveur. Pas de compteur par CI : les livres les fusionnent.
      //  · marksHeld 0..3 : marks de l'ÉQUIPE sur le serveur (monnaie d'accès du
      //    decker ; 3 = accès propriétaire, miroir SR5 de l'échelle SR6).
      marksOn: {},
      marksHeld: 0,
      ss: 0,
      ssLog: [],
      // Variance des Fondations (lot B4) — décompte séparé du SS, même
      // portée scène-scopée (cf. FONDATIONS_SERVEUR_BT1.md § 1.c : décompte
      // « par intrus », pas par serveur en général, mais l'app n'a qu'un
      // infiltrateur courant par serveur, comme pour SS/marks).
      variance: 0,
      varianceLog: [],
      lastRollT: 0,
      illUser: 0,
      illAdmin: 0,
      access: 0,
      minor: 0,
      critical: 0,
      converged: false,
    };
  },

  /** Serveur (définition), pour les besoins (édition, icList, indice…) des
      mutateurs ci-dessous — jamais muté ici (plus d'`intrusion` sur
      l'objet serveur). */
  _get(id) {
    return Servers.find(id) || null;
  },

  /** État d'intrusion scène-scopé garanti (créé à la volée) — source unique
      lue/écrite par tous les mutateurs ci-dessous. `null` si aucune scène
      n'est chargée (garde défensive, ne devrait pas arriver une fois une
      édition sélectionnée). */
  _state(id) {
    if (typeof Encounter === "undefined") return null;
    return Encounter.intrusionFor(id);
  },

  /** Persiste la scène (source unique de l'état vivant) + rend le panneau
      Serveurs, qui affiche aussi cet état — factorisé pour ne pas dupliquer
      15 fois le même couple d'appels. `Encounter._commit()` recouvre déjà
      le rendu du tiroir/dock (plus besoin du pont `notifyServerChanged`,
      l'écriture a déjà eu lieu sur `state.matrix`). */
  _persist() {
    Servers.save();
    Servers.render();
    if (typeof Encounter !== "undefined") Encounter._commit();
  },

  toggleIntrusion(id) {
    const srv = this._get(id);
    const intr = this._state(id);
    if (!srv || !intr) return;
    intr.open = !intr.open;
    this._persist();
  },

  /** L'alerte est donnée (la Patrouilleuse a repéré l'intrus). */
  setAlert(id) {
    const srv = this._get(id);
    const intr = this._state(id);
    if (!srv || !intr) return;
    intr.alerted = !intr.alerted;
    if (intr.alerted && intr.turn === 0) intr.turn = 1;
    this._persist();
  },

  /** Tour suivant : déploie la prochaine CI (1/tour) + SS SR6. */
  nextTurn(id) {
    const srv = this._get(id);
    const intr = this._state(id);
    if (!srv || !intr) return;
    intr.turn += 1;

    // SR6 : accès illégaux maintenus (+1/round Utilisateur, +3/round Admin)
    if (intr.illUser > 0 || intr.illAdmin > 0) {
      const delta = Matrix.use(srv.edition).overwatchDelta(intr.illUser, intr.illAdmin);
      if (delta > 0) {
        this._pushSS(intr, srv, delta, `accès illégaux maintenus (${intr.illUser}U/${intr.illAdmin}A)`);
      }
    }

    // Déploiement : une CI par tour, si l'alerte est donnée
    if (intr.alerted) {
      const maxActive = Matrix.use(srv.edition).maxActiveIC(srv.indice);
      const active = srv.icList.filter((k) => {
        const st = intr.ics[k];
        return st && st.active && !st.down;
      }).length;
      if (active < maxActive) {
        const next = srv.icList.find((k) => {
          if (k === "patrouilleuse") return false;
          const st = intr.ics[k];
          return !st || !st.active;
        });
        if (next) {
          intr.ics[next] = { active: true, dmg: 0, down: false, turn: intr.turn };
          const label = Servers.icCatalog(srv.edition)[next]?.label || next;
          Debug.log("servers", "CI déployée", { server: srv.name, turn: intr.turn, ic: next });
          toast(`Le serveur déploie : ${label}.`);
          // La CI déployée rejoint l'ordre d'initiative sans second
          // geste (« zéro clic »), pour N'IMPORTE QUEL serveur de la scène —
          // plus de pont conditionnel `serverId === id` (plusieurs serveurs
          // actifs en parallèle). launchIC est idempotent (no-op si la
          // CI y est déjà) et toaste « rejoint l'init ».
          if (typeof Encounter !== "undefined" && Encounter.state) {
            Encounter.launchIC(id, next);
          }
        }
      }
    }
    this._persist();
  },

  resetIntrusion(id) {
    const srv = this._get(id);
    const intr = this._state(id);
    if (!srv || !intr) return;
    if (!confirm("Réinitialiser l'intrusion (tours, CI, surveillance) ?")) return;
    const open = intr.open;
    const fresh = this.newState();
    fresh.open = open;
    Object.assign(intr, fresh);
    this._persist();
  },

  /** Relance une CI détruite (dès le tour suivant, au choix du serveur). */
  relaunchIC(id, key) {
    const intr = this._state(id);
    if (!intr) return;
    intr.ics[key] = {
      active: true,
      dmg: 0,
      down: false,
      turn: intr.turn,
    };
    this._persist();
  },

  /** Clic sur une case du moniteur d'une CI. */
  icBox(id, key, n) {
    const srv = this._get(id);
    const intr = this._state(id);
    if (!srv || !intr) return;
    const st = (intr.ics[key] ||= { active: true, dmg: 0, down: false });
    st.dmg = st.dmg === n ? n - 1 : n;
    const size = Servers.icMonitorSize(srv);
    st.down = st.dmg >= size;
    this._persist();
  },

  /* ---- Jets d'une CI liée à un serveur ----
     Réserve/limite/suffixe délégués à `Matrix.icCombat` (source unique par
     édition, prohibition n°1). SR5/SR6 (dés ∝ indice) et Anarchy 1re (dés à
     statblock fixe) renvoient `roll:true` → on lance. Anarchy 2.0 (succès
     fixes, p.223) renvoie `roll:false` → rien à lancer (le cockpit affiche la
     valeur). Un geste inexistant (Anarchy n'a pas de jet d'encaissement,
     p.156) renvoie `null`. */
  rollIC(id, key, kind) {
    const srv = Servers.find(id);
    if (!srv) return;
    const M = Matrix.use(srv.edition);
    const ic = Servers.icCatalog(srv.edition)[key];
    const name = ic ? ic.label : key;
    const spec = M.icCombat(kind, srv, ic);
    if (!spec || !spec.roll) return;
    const res = Dice.computeRoll(spec.pool);
    if (spec.limit != null && res.hits > spec.limit) {
      res.cappedFrom = res.hits;
      res.hits = spec.limit;
    }
    DiceRoller.show(res, { label: `${name} — ${spec.suffix}`, who: srv.name });
  },

  /* ---- Marks (SR5) — deux directions séparées ---- */

  /** Marks du SERVEUR (⇒ toutes ses CI + son spider) sur un persona PJ donné.
      Compteur par cible (max 3, p.233) ; la clé disparaît à 0 pour garder
      `marksOn` propre (une scène sans mark = objet vide). */
  addMarkOn(id, pjId, delta) {
    const intr = this._state(id);
    if (!intr || !pjId) return;
    intr.marksOn ||= {};
    const next = Utils.clamp((intr.marksOn[pjId] || 0) + delta, 0, 3);
    if (next > 0) intr.marksOn[pjId] = next;
    else delete intr.marksOn[pjId];
    this._persist();
  },

  /** Marks de l'ÉQUIPE sur le serveur (monnaie d'accès du decker ; 3 = accès
      propriétaire). Scalaire d'équipe : un seul infiltrateur dans le cas
      courant, extensible si besoin. */
  addMarkHeld(id, delta) {
    const intr = this._state(id);
    if (!intr) return;
    intr.marksHeld = Utils.clamp((intr.marksHeld || 0) + delta, 0, 3);
    this._persist();
  },

  /* ---- Score de Surveillance (SR5/SR6) ---- */
  _pushSS(intr, srv, delta, label) {
    intr.ss = Math.max(0, intr.ss + delta);
    Debug.log("servers", "SS", { server: srv.name, delta, total: intr.ss, label });
    intr.ssLog.unshift({ t: Date.now(), d: delta, label });
    if (intr.ssLog.length > 30) intr.ssLog.length = 30;
  },

  addSS(id, delta, label) {
    const srv = this._get(id);
    const intr = this._state(id);
    if (!srv || !intr) return;
    this._pushSS(intr, srv, delta, label || "succès de la défense");
    this._persist();
  },

  /** SR5 : +2D6 toutes les 15 minutes (jet réel, loggé au journal). */
  addSS2D6(id) {
    const srv = this._get(id);
    const intr = this._state(id);
    if (!srv || !intr) return;
    const res = Dice.computeInitiative(0, 2);
    DiceRoller.show(res, { label: "Surveillance DIEU : +2D6 SS", who: srv.name });
    intr.lastRollT = Date.now();
    this._pushSS(intr, srv, res.total, `+2D6 (temps) : [${res.faces.join(", ")}]`);
    this._persist();
  },

  undoSS(id) {
    const intr = this._state(id);
    if (!intr || !intr.ssLog.length) return;
    const last = intr.ssLog.shift();
    intr.ss = Math.max(0, intr.ss - last.d);
    this._persist();
  },

  /** Reboot du decker : SS et marks repartent à zéro. */
  resetSS(id) {
    const intr = this._state(id);
    if (!intr) return;
    if (!confirm("Reboot du decker : SS et marks à zéro ?")) return;
    intr.ss = 0;
    intr.ssLog = [];
    // Reboot : le serveur perd ses marks sur les intrus ET l'équipe perd les
    // siennes sur le serveur (les accès sautent au reboot).
    intr.marksOn = {};
    intr.marksHeld = 0;
    intr.lastRollT = 0;
    this._persist();
    toast("SS remis à zéro (reboot : perte des marks, choc d'éjection en RV).");
  },

  /* ---- Variance des Fondations (lot B4, SR5+SR6 seulement) ----
     Deux mécaniques distinctes par édition (BT1 § 1.c), jamais aplaties :
     SR6 = stepper manuel (+1..+5, comme SS) ; SR5 = test de dés réel
     (réserve Firewall/Indice+Firewall vs seuil 4, 4 issues possibles).
     Le choix de mécanique se fait sur la PRÉSENCE de
     `Matrix.foundationVarianceTest()` (donnée), jamais sur `App.edition`. */
  _pushVariance(intr, srv, delta, label) {
    intr.variance = Math.max(0, intr.variance + delta);
    Debug.log("servers", "Variance", { server: srv.name, delta, total: intr.variance, label });
    intr.varianceLog.unshift({ t: Date.now(), d: delta, label });
    if (intr.varianceLog.length > 30) intr.varianceLog.length = 30;
  },

  /** SR6 : +1 à +5 par action hors-paradigme, manuel (BT1 § 1.c). */
  addVariance(id, delta, label) {
    const srv = this._get(id);
    const intr = this._state(id);
    if (!srv || !intr) return;
    this._pushVariance(intr, srv, delta, label || "action hors-paradigme");
    this._persist();
  },

  /** SR5 : test de variance (BT1 § 1.c, Data Trails p.123) — seuil TOUJOURS
      4, réserve Firewall (mineure) ou Indice + Firewall (extrême).
      Succès (hits ≥ 4) ⇒ alerte immédiate. Échec ⇒ les succès s'ajoutent au
      décompte. Complication (glitch) ⇒ −1. Échec critique (critGlitch) ⇒
      décompte divisé par 2. `mode` ∈ "mineure" | "extreme". */
  addVarianceTest(id, mode) {
    const srv = this._get(id);
    const intr = this._state(id);
    if (!srv || !intr) return;
    const test = Matrix.use(srv.edition).foundationVarianceTest();
    if (!test) return; // SR6 n'a pas cette mécanique
    const pool = mode === "extreme" ? test.poolExtreme(srv) : test.poolMineure(srv);
    const res = Dice.computeRoll(pool);
    DiceRoller.show(res, {
      label: `Test de variance (${mode === "extreme" ? "extrême" : "mineure"})`,
      who: srv.name,
    });
    if (res.critGlitch) {
      const before = intr.variance;
      intr.variance = Math.floor(before / 2);
      this._pushVariance(intr, srv, intr.variance - before, "échec critique (÷2)");
    } else if (res.glitch) {
      this._pushVariance(intr, srv, -1, "complication (−1)");
    } else if (res.hits >= test.threshold) {
      intr.alerted = true;
      this._pushVariance(intr, srv, 0, `test réussi (${res.hits} succès) — alerte immédiate`);
    } else {
      this._pushVariance(intr, srv, res.hits, `test raté (+${res.hits} succès)`);
    }
    this._persist();
  },

  undoVariance(id) {
    const intr = this._state(id);
    if (!intr || !intr.varianceLog.length) return;
    const last = intr.varianceLog.shift();
    intr.variance = Math.max(0, intr.variance - last.d);
    this._persist();
  },

  /** Nouvelle tentative : la Variance de CETTE plongée repart à zéro. */
  resetVariance(id) {
    const intr = this._state(id);
    if (!intr) return;
    if (!confirm("Remettre la Variance des Fondations à zéro ?")) return;
    intr.variance = 0;
    intr.varianceLog = [];
    this._persist();
  },

  /** SR6 : compteurs d'accès illégaux maintenus. */
  setIllegal(id, kind, delta) {
    const intr = this._state(id);
    if (!intr) return;
    const k = kind === "admin" ? "illAdmin" : "illUser";
    intr[k] = Utils.clamp(intr[k] + delta, 0, 9);
    this._persist();
  },

  /** SR6 : niveau d'accès obtenu sur ce serveur (0 Invité/1 Utilisateur/
      2 Administrateur, p.179) — miroir des marks SR5, gagné via Forcer
      l'accès / Sonder l'accès (côté decker). */
  setAccess(id, delta) {
    const intr = this._state(id);
    if (!intr) return;
    intr.access = Utils.clamp((intr.access || 0) + delta, 0, 2);
    this._persist();
  },

  /* ---- Surveillance du DIEU (Anarchy p.218) ---- */
  dieu(id, kind, delta) {
    const intr = this._state(id);
    if (!intr) return;
    const k = kind === "critical" ? "critical" : "minor";
    intr[k] = Utils.clamp(intr[k] + delta, 0, 9);
    this._persist();
  },

  disaster(id) {
    const intr = this._state(id);
    if (!intr) return;
    intr.converged = !intr.converged;
    this._persist();
  },

  /** Anarchy : reboot + 1 h hors ligne — les malus disparaissent. */
  rebootDecker(id) {
    const intr = this._state(id);
    if (!intr) return;
    intr.minor = 0;
    intr.critical = 0;
    intr.converged = false;
    this._persist();
    toast("Reboot + 1 h hors ligne : malus DIEU effacés, tous les accès sont perdus.");
  },
};

// Pont couche 5 (migration modules ES) — retiré en fin de migration.
window.Intrusion = Intrusion;
