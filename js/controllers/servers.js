"use strict";

/* ============================================================
   SERVEURS & CI — assistance aux intrusions matricielles
   (issue #14). Panneau « Matrice » : bibliothèque de serveurs
   avec groupes (socle Collection, comme Shadows/ContactsBook),
   génération dirigée ou aléatoire, et tracker d'intrusion en
   direct. Les catalogues de CI/profils/sculptures par édition
   vivent dans js/matrix.js (Matrix.use(edition)) ; ce fichier porte
   la génération, l'édition de serveur et le tracker d'intrusion.
   Le rendu HTML (formulaire, cartes, panneaux) vit dans
   js/widgets/serverrenderer.js (ServerRenderer).
   ============================================================ */
const Servers = Object.assign(
  Collection.create({
    key: "servers",
    storageKeys: { all: "servers_all", groups: "servers_groups" },
    dom: { grid: "servers-grid", sidebar: "servers-group-list", label: "servers-group-label" },
    footerSelector: ".server-card-footer",
    labels: {
      allSummary: (n) => `Tous les serveurs (${n})`,
      emptyTitle: "Aucun serveur ici",
      emptyBody: "Créez un serveur avec le formulaire ci-dessus, ou lancez la génération aléatoire.",
      noMatch: (q) => `Aucun serveur ne correspond à « ${q} ».`,
    },
    searchFields: (s) => [s.name, s.profile, `indice ${s.indice}`],
    // Le spider est imbriqué dans le serveur (srv.spider), pas une
    // entité sœur dans data.all : rendu via renderTrailing, pas linked.
    renderTrailing: (srv) => {
      if (!srv.spider) return null;
      const sub = CardRenderer.render(srv.spider, []);
      sub.classList.add("vehicle-card");
      return sub;
    },
    renderCard: (srv) =>
      ServerRenderer.card(srv, {
        editing: !!Servers._editing[srv.id],
        icMonitorSize: Servers.icMonitorSize(srv),
      }),
  }),
  {
    /* Cartes en cours d'édition (état d'interface, non persisté) */
    _editing: {},

    /* ========================================================
       ACCESSEURS — catalogues délégués à Matrix (js/matrix.js)
       ======================================================== */
    _edition() {
      return typeof App !== "undefined" ? App.edition : "anarchy";
    },

    icCatalog(edition) {
      return Matrix.use(edition).icCatalog();
    },

    profiles(edition) {
      return Matrix.use(edition).profiles();
    },

    find(id) {
      return this.data.all.find((s) => s.id === id);
    },

    /** Gamme (0/1/2) d'un serveur — stockée à la création, sinon
        retrouvée depuis son profil (serveurs créés avant ce champ). */
    sevOf(srv) {
      if (Number.isFinite(srv.sev)) return Utils.clamp(srv.sev, 0, 2);
      const p = this.profiles(srv.edition).find((x) => x.label === srv.profile);
      return p ? p.sev : 1;
    },

    rerollSculpture(id) {
      const srv = this.find(id);
      if (!srv) return;
      srv.sculpture = Matrix.pickSculpture(this.sevOf(srv));
      this.save();
      this.render();
    },

    /** Taille du moniteur matriciel d'une CI. */
    icMonitorSize(srv) {
      return Matrix.use(srv.edition).icMonitorSize(srv.indice);
    },

    /* ========================================================
       GÉNÉRATION
       ======================================================== */
    _newIntrusion() {
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

    /** Crée un serveur depuis le formulaire du panneau. */
    createFromForm() {
      const ed = this._edition();
      const profiles = this.profiles(ed);

      const profSel = (document.getElementById("srv-profile") || {}).value || "random";
      const profile =
        profSel === "random"
          ? Utils.rand(profiles)
          : profiles.find((p) => p.id === profSel) || Utils.rand(profiles);

      let indice;
      const indSel = (document.getElementById("srv-indice") || {}).value || "auto";
      if (indSel === "auto") {
        indice =
          ed === "anarchy" ? profile.indice : Utils.randInt(profile.min, profile.max);
      } else {
        indice = parseInt(indSel, 10);
      }
      const Mod =
        typeof App !== "undefined" && App.getEditionModule
          ? App.getEditionModule(ed)
          : null;
      const secPhys =
        !!(Mod && Mod.secPhysBonus) &&
        !!(document.getElementById("srv-secphys") || {}).checked;
      if (secPhys) indice += Mod.secPhysBonus;

      // Attributs ASDF (SR5/SR6) : indice à indice+3 répartis au hasard
      let attrs = null;
      if (ed !== "anarchy") {
        const vals = [indice, indice + 1, indice + 2, indice + 3].sort(
          () => Math.random() - 0.5,
        );
        attrs = { ATQ: vals[0], COR: vals[1], TDD: vals[2], FW: vals[3] };
      }

      // Liste des CI : sélection manuelle si des cases sont cochées, sinon auto
      const checked = Array.from(
        document.querySelectorAll("#srv-ic-choices input:checked"),
      ).map((el) => el.value);
      const icList = checked.length
        ? ["patrouilleuse", ...checked.filter((k) => k !== "patrouilleuse")]
        : Matrix.use(ed).pickICs(indice, profile.sev);

      const nameInput = (document.getElementById("srv-name") || {}).value || "";
      const name = nameInput.trim() || Matrix.makeName(profile.sev);

      const srv = {
        id: Utils.uid(),
        edition: ed,
        name,
        profile: profile.label,
        indice,
        sev: profile.sev,
        secPhys,
        attrs,
        icList,
        sculpture: Matrix.pickSculpture(profile.sev),
        spider: null,
        notes: "",
        intrusion: this._newIntrusion(),
      };

      if ((document.getElementById("srv-spider") || {}).checked) {
        srv.spider = this._makeSpider(srv);
      }

      this.data.all.push(srv);
      if (this.currentGroup !== "all" && this.data.groups[this.currentGroup]) {
        this.data.groups[this.currentGroup].push(srv.id);
      }
      this.save();
      this.render();
      toast(`✓ ${srv.name} (indice ${srv.indice}) créé.`);
    },

    /* ---- Spider (decker de sécurité lié) ---- */
    _spiderOpts(srv) {
      const Mod =
        typeof App !== "undefined" && App.getEditionModule
          ? App.getEditionModule(srv.edition)
          : null;
      const archetype = Mod ? Mod.spiderArchetype(srv.indice) : "";

      if (srv.edition === "anarchy") {
        return {
          meta: "Aléatoire",
          gender: "Aléatoire",
          archetype,
          tier: "Aléatoire",
          special: "Aucun",
        };
      }
      const proRating = String(Utils.clamp(Math.ceil(srv.indice / 2), 2, 6));
      return {
        meta: "Aléatoire",
        gender: "Aléatoire",
        archetype,
        proRating,
        tier: "Aléatoire",
        special: "Decker",
      };
    },

    _makeSpider(srv) {
      const Mod =
        typeof App !== "undefined" && App.getEditionModule
          ? App.getEditionModule(srv.edition)
          : null;
      if (!Mod || !Mod.generate) return null;
      const pnj = Mod.generate(this._spiderOpts(srv));
      pnj.archetype = `Spider — ${pnj.archetype}`;
      pnj.ownerName = srv.name;
      return pnj;
    },

    addSpider(id) {
      const srv = this.find(id);
      if (!srv) return;
      srv.spider = this._makeSpider(srv);
      this.save();
      this.render();
      if (srv.spider) toast(`Spider ${srv.spider.name} en poste sur ${srv.name}.`);
    },

    removeSpider(id) {
      const srv = this.find(id);
      if (!srv || !srv.spider) return;
      const name = srv.spider.name;
      srv.spider = null;
      this.save();
      this.render();
      toast(`${name} relevé de son poste.`);
    },

    /** Recherche d'un spider par id de PNJ (intégration lancer de dés). */
    findSpider(pnjId) {
      for (const s of this.data.all) {
        if (s.spider && s.spider.id === pnjId) return s.spider;
      }
      return null;
    },

    ownsPnj(pnjId) {
      return !!this.findSpider(pnjId);
    },

    /* ========================================================
       TRACKER D'INTRUSION
       ======================================================== */
    _intr(id) {
      const srv = this.find(id);
      if (!srv) return null;
      if (!srv.intrusion) srv.intrusion = this._newIntrusion();
      return srv;
    },

    toggleIntrusion(id) {
      const srv = this._intr(id);
      if (!srv) return;
      srv.intrusion.open = !srv.intrusion.open;
      this.save();
      this.render();
    },

    /** L'alerte est donnée (la Patrouilleuse a repéré l'intrus). */
    setAlert(id) {
      const srv = this._intr(id);
      if (!srv) return;
      srv.intrusion.alerted = !srv.intrusion.alerted;
      if (srv.intrusion.alerted && srv.intrusion.turn === 0) srv.intrusion.turn = 1;
      this.save();
      this.render();
    },

    /** Tour suivant : déploie la prochaine CI (1/tour) + SS SR6. */
    nextTurn(id) {
      const srv = this._intr(id);
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
            const label = this.icCatalog(srv.edition)[next]?.label || next;
            toast(`Le serveur déploie : ${label}.`);
          }
        }
      }
      this.save();
      this.render();
    },

    resetIntrusion(id) {
      const srv = this._intr(id);
      if (!srv) return;
      if (!confirm("Réinitialiser l'intrusion (tours, CI, surveillance) ?")) return;
      const open = srv.intrusion.open;
      srv.intrusion = this._newIntrusion();
      srv.intrusion.open = open;
      this.save();
      this.render();
    },

    /** Relance une CI détruite (dès le tour suivant, au choix du serveur). */
    relaunchIC(id, key) {
      const srv = this._intr(id);
      if (!srv) return;
      srv.intrusion.ics[key] = {
        active: true,
        dmg: 0,
        down: false,
        turn: srv.intrusion.turn,
      };
      this.save();
      this.render();
    },

    /** Clic sur une case du moniteur d'une CI. */
    icBox(id, key, n) {
      const srv = this._intr(id);
      if (!srv) return;
      const st = (srv.intrusion.ics[key] ||= { active: true, dmg: 0, down: false });
      st.dmg = st.dmg === n ? n - 1 : n;
      const size = this.icMonitorSize(srv);
      st.down = st.dmg >= size;
      this.save();
      this.render();
    },

    /* ---- Jets des CI (SR5/SR6 — les glaces Anarchy ont des succès
       fixes et ne lancent jamais les dés, p.223) ----
       SR5 p.249 : attaque = indice×2 [Attaque] ; encaissement =
       indice + Firewall (règle des appareils p.229, attributs du
       serveur). La VF ne détaille pas la réserve de défense : on
       applique l'usage indice×2. SR6 p.188 : toutes les CI utilisent
       indice×2 pour la majorité de leurs jets. */
    rollIC(id, key, kind) {
      const srv = this.find(id);
      if (!srv || srv.edition === "anarchy" || typeof Dice === "undefined") return;
      const i = srv.indice;
      const a = srv.attrs || {};
      const ic = this.icCatalog(srv.edition)[key];
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
        pool = i + (a.FW || 0);
        label = `${name} — encaissement (indice + FW)`;
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
      const srv = this._intr(id);
      if (!srv) return;
      srv.intrusion.marks = Utils.clamp(srv.intrusion.marks + delta, 0, 3);
      this.save();
      this.render();
    },

    /* ---- Score de Surveillance (SR5/SR6) ---- */
    _pushSS(srv, delta, label) {
      const intr = srv.intrusion;
      intr.ss = Math.max(0, intr.ss + delta);
      intr.ssLog.unshift({ t: Date.now(), d: delta, label });
      if (intr.ssLog.length > 30) intr.ssLog.length = 30;
    },

    addSS(id, delta, label) {
      const srv = this._intr(id);
      if (!srv) return;
      this._pushSS(srv, delta, label || "succès de la défense");
      this.save();
      this.render();
    },

    /** SR5 : +2D6 toutes les 15 minutes (jet réel, loggé au journal). */
    addSS2D6(id) {
      const srv = this._intr(id);
      if (!srv) return;
      const res = Dice.computeInitiative(0, 2);
      DiceRoller.show(res, { label: "Surveillance DIEU : +2D6 SS", who: srv.name });
      srv.intrusion.lastRollT = Date.now();
      this._pushSS(srv, res.total, `+2D6 (temps) : [${res.faces.join(", ")}]`);
      this.save();
      this.render();
    },

    undoSS(id) {
      const srv = this._intr(id);
      if (!srv || !srv.intrusion.ssLog.length) return;
      const last = srv.intrusion.ssLog.shift();
      srv.intrusion.ss = Math.max(0, srv.intrusion.ss - last.d);
      this.save();
      this.render();
    },

    /** Reboot du decker : SS et marks repartent à zéro. */
    resetSS(id) {
      const srv = this._intr(id);
      if (!srv) return;
      if (!confirm("Reboot du decker : SS et marks à zéro ?")) return;
      srv.intrusion.ss = 0;
      srv.intrusion.ssLog = [];
      srv.intrusion.marks = 0;
      srv.intrusion.lastRollT = 0;
      this.save();
      this.render();
      toast("SS remis à zéro (reboot : perte des marks, choc d'éjection en RV).");
    },

    /** SR6 : compteurs d'accès illégaux maintenus. */
    setIllegal(id, kind, delta) {
      const srv = this._intr(id);
      if (!srv) return;
      const k = kind === "admin" ? "illAdmin" : "illUser";
      srv.intrusion[k] = Utils.clamp(srv.intrusion[k] + delta, 0, 9);
      this.save();
      this.render();
    },

    /* ---- Surveillance du DIEU (Anarchy p.218) ---- */
    dieu(id, kind, delta) {
      const srv = this._intr(id);
      if (!srv) return;
      const k = kind === "critical" ? "critical" : "minor";
      srv.intrusion[k] = Utils.clamp(srv.intrusion[k] + delta, 0, 9);
      this.save();
      this.render();
    },

    disaster(id) {
      const srv = this._intr(id);
      if (!srv) return;
      srv.intrusion.converged = !srv.intrusion.converged;
      this.save();
      this.render();
    },

    /** Anarchy : reboot + 1 h hors ligne — les malus disparaissent. */
    rebootDecker(id) {
      const srv = this._intr(id);
      if (!srv) return;
      srv.intrusion.minor = 0;
      srv.intrusion.critical = 0;
      srv.intrusion.converged = false;
      this.save();
      this.render();
      toast("Reboot + 1 h hors ligne : malus DIEU effacés, tous les accès sont perdus.");
    },

    editNote(id, value) {
      const srv = this.find(id);
      if (srv) {
        srv.notes = value;
        this.save();
      }
    },

    /* ========================================================
       ÉDITION D'UN SERVEUR
       Chaque opération sur la liste des CI valide d'abord les
       champs saisis (_commitEdit) pour ne rien perdre au re-rendu.
       ======================================================== */
    toggleEdit(id) {
      if (this._editing[id]) {
        this._commitEdit(id);
        delete this._editing[id];
      } else {
        this._editing[id] = true;
      }
      this.render();
    },

    /** Applique les champs du formulaire d'édition au serveur. */
    _commitEdit(id) {
      const srv = this.find(id);
      if (!srv) return;
      const val = (suffix) => document.getElementById(`se-${id}-${suffix}`);

      const nameEl = val("name");
      if (nameEl && nameEl.value.trim()) srv.name = nameEl.value.trim();
      if (srv.spider) srv.spider.ownerName = srv.name;

      const profEl = val("profile");
      if (profEl) {
        const p = this.profiles(srv.edition).find((x) => x.id === profEl.value);
        if (p) {
          srv.profile = p.label;
          srv.sev = p.sev;
        }
      }

      const indEl = val("indice");
      if (indEl) {
        const [, max] = Matrix.use(srv.edition).indiceRange();
        srv.indice = Utils.clamp(parseInt(indEl.value, 10) || srv.indice, 1, max);
      }

      const spEl = val("secphys");
      if (spEl) srv.secPhys = spEl.checked;

      if (srv.edition !== "anarchy") {
        srv.attrs = srv.attrs || {};
        for (const k of ["ATQ", "COR", "TDD", "FW"]) {
          const el = val(k.toLowerCase());
          if (el) srv.attrs[k] = Utils.clamp(parseInt(el.value, 10) || 1, 1, 15);
        }
      }

      const scEl = val("sculpture");
      if (scEl) srv.sculpture = scEl.value.trim();

      this.save();
    },

    /** Redistribue les attributs ASDF depuis l'indice (indice à indice+3). */
    redistributeAttrs(id) {
      this._commitEdit(id);
      const srv = this.find(id);
      if (!srv || srv.edition === "anarchy") return;
      const vals = [srv.indice, srv.indice + 1, srv.indice + 2, srv.indice + 3].sort(
        () => Math.random() - 0.5,
      );
      srv.attrs = { ATQ: vals[0], COR: vals[1], TDD: vals[2], FW: vals[3] };
      this.save();
      this.render();
    },

    /** Relance la sculpture depuis le mode édition (gamme du serveur). */
    rerollSculptureEdit(id) {
      this._commitEdit(id);
      const srv = this.find(id);
      if (!srv) return;
      srv.sculpture = Matrix.pickSculpture(this.sevOf(srv));
      this.save();
      this.render();
    },

    /* ---- Liste ordonnée des CI (l'ordre = ordre de déploiement) ---- */
    moveIC(id, key, dir) {
      this._commitEdit(id);
      const srv = this.find(id);
      if (!srv) return;
      const list = srv.icList;
      const i = list.indexOf(key);
      const j = i + dir;
      // La Patrouilleuse (index 0) reste en tête
      if (i < 1 || j < 1 || j >= list.length) return;
      [list[i], list[j]] = [list[j], list[i]];
      this.save();
      this.render();
    },

    dropIC(id, key) {
      this._commitEdit(id);
      const srv = this.find(id);
      if (!srv || key === "patrouilleuse") return;
      srv.icList = srv.icList.filter((k) => k !== key);
      if (srv.intrusion && srv.intrusion.ics) delete srv.intrusion.ics[key];
      this.save();
      this.render();
    },

    addIC(id) {
      this._commitEdit(id);
      const srv = this.find(id);
      const sel = document.getElementById(`se-${id}-addic`);
      if (!srv || !sel || !sel.value) return;
      if (!srv.icList.includes(sel.value)) srv.icList.push(sel.value);
      this.save();
      this.render();
    },

    /* ========================================================
       RENDU — panneau, formulaire, cartes
       ======================================================== */
    initPanel() {
      this.load();
      this.renderForm();
      this.render();
      this._wire();
    },

    /* ---- Délégation d'événements (modèle ContentModal/Collection) ----
       Un seul écouteur, posé une fois sur le conteneur persistant du
       panneau (jamais recréé — seuls le formulaire et la grille sont
       reconstruits à chaque render). */
    _wire() {
      if (this._wired) return;
      this._wired = true;
      const panel = document.getElementById("panel-matrix");
      if (!panel) return;

      panel.addEventListener("click", (e) => {
        const el = e.target.closest("[data-action]");
        if (!el) return;
        const id = el.dataset.id;
        const n = () => parseInt(el.dataset.n, 10);
        switch (el.dataset.action) {
          case "sidebar-close":
            SidebarToggle.close("matrix");
            break;
          case "sidebar-open":
            SidebarToggle.open("matrix");
            break;
          case "create-server":
            this.createFromForm();
            break;
          case "reroll-sculpture":
            this.rerollSculpture(id);
            break;
          case "toggle-edit":
            this.toggleEdit(id);
            break;
          case "toggle-intrusion":
            this.toggleIntrusion(id);
            break;
          case "remove-spider":
            this.removeSpider(id);
            break;
          case "add-spider":
            this.addSpider(id);
            break;
          case "remove":
            this.remove(id);
            break;
          case "redistribute-attrs":
            this.redistributeAttrs(id);
            break;
          case "move-ic":
            this.moveIC(id, el.dataset.k, n());
            break;
          case "drop-ic":
            this.dropIC(id, el.dataset.k);
            break;
          case "reroll-sculpture-edit":
            this.rerollSculptureEdit(id);
            break;
          case "add-ic":
            this.addIC(id);
            break;
          case "ic-box":
            this.icBox(id, el.dataset.k, n());
            break;
          case "relaunch-ic":
            this.relaunchIC(id, el.dataset.k);
            break;
          case "roll-ic":
            this.rollIC(id, el.dataset.k, el.dataset.kind);
            break;
          case "set-alert":
            this.setAlert(id);
            break;
          case "next-turn":
            this.nextTurn(id);
            break;
          case "reset-intrusion":
            this.resetIntrusion(id);
            break;
          case "add-ss-2d6":
            this.addSS2D6(id);
            break;
          case "add-marks":
            this.addMarks(id, n());
            break;
          case "add-ss":
            this.addSS(id, n(), el.dataset.label);
            break;
          case "set-illegal":
            this.setIllegal(id, el.dataset.kind, n());
            break;
          case "undo-ss":
            this.undoSS(id);
            break;
          case "reset-ss":
            this.resetSS(id);
            break;
          case "dieu":
            this.dieu(id, el.dataset.k, n());
            break;
          case "disaster":
            this.disaster(id);
            break;
          case "reboot-decker":
            this.rebootDecker(id);
            break;
        }
      });

      panel.addEventListener("change", (e) => {
        const el = e.target.closest('[data-action="edit-note"]');
        if (el) this.editNote(el.dataset.id, el.value);
      });
    },

    renderForm() {
      const host = document.getElementById("server-gen-form");
      if (!host) return;
      host.innerHTML = ServerRenderer.renderForm(this._edition());
    },
  },
);
