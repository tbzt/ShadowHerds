"use strict";

/* ============================================================
   TRACKER D'INTRUSION — état de run en direct (issue #14).
   Sépare l'état vivant d'une intrusion matricielle (tours, CI
   déployées, Score de Surveillance, marks, Surveillance du DIEU)
   de la génération/persistance des serveurs (js/controllers/servers.js).

   Ce module ne possède aucune donnée : il lit et mute l'objet
   `srv.intrusion` porté par chaque serveur, puis délègue toute
   persistance et tout re-rendu à Servers (Servers.save/render).
   Les catalogues/règles de CI restent délégués à Matrix, comme
   dans Servers.
   ============================================================ */
const Intrusion = {
  /** État neuf d'une intrusion (forme de l'objet `srv.intrusion`). */
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
      minor: 0,
      critical: 0,
      converged: false,
    };
  },

  /** Serveur + intrusion garantie (créée à la volée si absente). */
  _get(id) {
    const srv = Servers.find(id);
    if (!srv) return null;
    if (!srv.intrusion) srv.intrusion = this.newState();
    return srv;
  },

  /** Persiste + rend le panneau Serveurs, comme chaque mutateur ci-dessous
      faisait individuellement — factorisé pour ajouter un seul point de
      rafraîchissement du tiroir Matrice (K3, Encounter) sans le dupliquer
      15 fois. Même garde `typeof Encounter !== "undefined"` que
      DiceRoller/UI.toggleMonitor (app.js, ui.js) pour notifier un module
      qui charge après celui-ci sans dépendance dure dans ce sens. */
  _persist(srv) {
    Servers.save();
    Servers.render();
    if (typeof Encounter !== "undefined") Encounter.notifyServerChanged(srv);
  },

  toggleIntrusion(id) {
    const srv = this._get(id);
    if (!srv) return;
    srv.intrusion.open = !srv.intrusion.open;
    this._persist(srv);
  },

  /** L'alerte est donnée (la Patrouilleuse a repéré l'intrus). */
  setAlert(id) {
    const srv = this._get(id);
    if (!srv) return;
    srv.intrusion.alerted = !srv.intrusion.alerted;
    if (srv.intrusion.alerted && srv.intrusion.turn === 0) srv.intrusion.turn = 1;
    this._persist(srv);
  },

  /** Tour suivant : déploie la prochaine CI (1/tour) + SS SR6. */
  nextTurn(id) {
    const srv = this._get(id);
    if (!srv) return;
    const intr = srv.intrusion;
    intr.turn += 1;

    // SR6 : accès illégaux maintenus (+1/round Utilisateur, +3/round Admin)
    if (intr.illUser > 0 || intr.illAdmin > 0) {
      const delta = Matrix.use(srv.edition).overwatchDelta(intr.illUser, intr.illAdmin);
      if (delta > 0) {
        this._pushSS(srv, delta, `accès illégaux maintenus (${intr.illUser}U/${intr.illAdmin}A)`);
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
          // K9 : la CI déployée rejoint l'ordre d'initiative sans second geste
          // (« zéro clic »), mais seulement si ce serveur est celui lié à la
          // scène en cours. Même garde descendante que _persist ; launchIC est
          // idempotent (no-op si la CI y est déjà) et toaste « rejoint l'init ».
          if (typeof Encounter !== "undefined" && Encounter.state && Encounter.state.serverId === id) {
            Encounter.launchIC(id, next);
          }
        }
      }
    }
    this._persist(srv);
  },

  resetIntrusion(id) {
    const srv = this._get(id);
    if (!srv) return;
    if (!confirm("Réinitialiser l'intrusion (tours, CI, surveillance) ?")) return;
    const open = srv.intrusion.open;
    srv.intrusion = this.newState();
    srv.intrusion.open = open;
    this._persist(srv);
  },

  /** Relance une CI détruite (dès le tour suivant, au choix du serveur). */
  relaunchIC(id, key) {
    const srv = this._get(id);
    if (!srv) return;
    srv.intrusion.ics[key] = {
      active: true,
      dmg: 0,
      down: false,
      turn: srv.intrusion.turn,
    };
    this._persist(srv);
  },

  /** Clic sur une case du moniteur d'une CI. */
  icBox(id, key, n) {
    const srv = this._get(id);
    if (!srv) return;
    const st = (srv.intrusion.ics[key] ||= { active: true, dmg: 0, down: false });
    st.dmg = st.dmg === n ? n - 1 : n;
    const size = Servers.icMonitorSize(srv);
    st.down = st.dmg >= size;
    this._persist(srv);
  },

  /* ---- Jets des CI (SR5/SR6 — les glaces Anarchy ont des succès
     fixes et ne lancent jamais les dés, p.223) ----
     SR5 p.249 : attaque = indice×2 [Attaque] ; encaissement =
     indice + Firewall (règle des appareils p.229, attributs du
     serveur). La VF ne détaille pas la réserve de défense : on
     applique l'usage indice×2. SR6 p.188 : toutes les CI utilisent
     indice×2 pour la majorité de leurs jets. */
  rollIC(id, key, kind) {
    const srv = Servers.find(id);
    if (!srv || !Matrix.use(srv.edition).hasAttrs()) return;
    const i = srv.indice;
    const a = srv.attrs || {};
    const ic = Servers.icCatalog(srv.edition)[key];
    const name = ic ? ic.label : key;

    let pool = i * 2;
    let limit = null;
    let label;
    const M = Matrix.use(srv.edition);
    if (kind === "atk") {
      label = `${name} — attaque`;
      limit = M.attrLimit("atk", srv);
    } else if (kind === "def") {
      label = `${name} — défense`;
    } else if (kind === "soak") {
      pool = i + (a.firewall || 0);
      label = `${name} — encaissement (indice + Firewall)`;
    } else {
      label = `${name} — perception matricielle`;
      limit = M.attrLimit("per", srv);
    }

    const res = Dice.computeRoll(pool);
    if (limit != null && res.hits > limit) {
      res.cappedFrom = res.hits;
      res.hits = limit;
    }
    DiceRoller.show(res, { label, who: srv.name });
  },

  /* ---- Marks (SR5) ---- */
  addMarks(id, delta) {
    const srv = this._get(id);
    if (!srv) return;
    srv.intrusion.marks = Utils.clamp(srv.intrusion.marks + delta, 0, 3);
    this._persist(srv);
  },

  /* ---- Score de Surveillance (SR5/SR6) ---- */
  _pushSS(srv, delta, label) {
    const intr = srv.intrusion;
    intr.ss = Math.max(0, intr.ss + delta);
    Debug.log("servers", "SS", { server: srv.name, delta, total: intr.ss, label });
    intr.ssLog.unshift({ t: Date.now(), d: delta, label });
    if (intr.ssLog.length > 30) intr.ssLog.length = 30;
  },

  addSS(id, delta, label) {
    const srv = this._get(id);
    if (!srv) return;
    this._pushSS(srv, delta, label || "succès de la défense");
    this._persist(srv);
  },

  /** SR5 : +2D6 toutes les 15 minutes (jet réel, loggé au journal). */
  addSS2D6(id) {
    const srv = this._get(id);
    if (!srv) return;
    const res = Dice.computeInitiative(0, 2);
    DiceRoller.show(res, { label: "Surveillance DIEU : +2D6 SS", who: srv.name });
    srv.intrusion.lastRollT = Date.now();
    this._pushSS(srv, res.total, `+2D6 (temps) : [${res.faces.join(", ")}]`);
    this._persist(srv);
  },

  undoSS(id) {
    const srv = this._get(id);
    if (!srv || !srv.intrusion.ssLog.length) return;
    const last = srv.intrusion.ssLog.shift();
    srv.intrusion.ss = Math.max(0, srv.intrusion.ss - last.d);
    this._persist(srv);
  },

  /** Reboot du decker : SS et marks repartent à zéro. */
  resetSS(id) {
    const srv = this._get(id);
    if (!srv) return;
    if (!confirm("Reboot du decker : SS et marks à zéro ?")) return;
    srv.intrusion.ss = 0;
    srv.intrusion.ssLog = [];
    srv.intrusion.marks = 0;
    srv.intrusion.lastRollT = 0;
    this._persist(srv);
    toast("SS remis à zéro (reboot : perte des marks, choc d'éjection en RV).");
  },

  /** SR6 : compteurs d'accès illégaux maintenus. */
  setIllegal(id, kind, delta) {
    const srv = this._get(id);
    if (!srv) return;
    const k = kind === "admin" ? "illAdmin" : "illUser";
    srv.intrusion[k] = Utils.clamp(srv.intrusion[k] + delta, 0, 9);
    this._persist(srv);
  },

  /* ---- Surveillance du DIEU (Anarchy p.218) ---- */
  dieu(id, kind, delta) {
    const srv = this._get(id);
    if (!srv) return;
    const k = kind === "critical" ? "critical" : "minor";
    srv.intrusion[k] = Utils.clamp(srv.intrusion[k] + delta, 0, 9);
    this._persist(srv);
  },

  disaster(id) {
    const srv = this._get(id);
    if (!srv) return;
    srv.intrusion.converged = !srv.intrusion.converged;
    this._persist(srv);
  },

  /** Anarchy : reboot + 1 h hors ligne — les malus disparaissent. */
  rebootDecker(id) {
    const srv = this._get(id);
    if (!srv) return;
    srv.intrusion.minor = 0;
    srv.intrusion.critical = 0;
    srv.intrusion.converged = false;
    this._persist(srv);
    toast("Reboot + 1 h hors ligne : malus DIEU effacés, tous les accès sont perdus.");
  },
};
