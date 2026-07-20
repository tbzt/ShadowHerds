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
      marks: 0,
      ss: 0,
      ssLog: [],
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

  /* ---- Marks (SR5) ---- */
  addMarks(id, delta) {
    const intr = this._state(id);
    if (!intr) return;
    intr.marks = Utils.clamp(intr.marks + delta, 0, 3);
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
    intr.marks = 0;
    intr.lastRollT = 0;
    this._persist();
    toast("SS remis à zéro (reboot : perte des marks, choc d'éjection en RV).");
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
