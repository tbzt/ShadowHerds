"use strict";

/* ============================================================
   SERVEURS & CI — bibliothèque et génération (issue #14).
   Panneau « Matrice » : bibliothèque de serveurs avec groupes
   (socle Collection, comme Shadows/ContactsBook), génération
   dirigée ou aléatoire, édition de serveur, spider lié. Deux
   responsabilités : génération et persistance (via Collection).
   Les catalogues de CI/profils/sculptures par édition vivent dans
   js/matrix.js (Matrix.use(edition)). L'état de run en direct
   (tours, CI déployées, surveillance) est porté par le tracker
   Intrusion (js/controllers/intrusion.js). Le rendu HTML
   (formulaire, cartes, panneaux) vit dans
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
      return App.edition;
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
          profile.indice != null ? profile.indice : Utils.randInt(profile.min, profile.max);
      } else {
        indice = parseInt(indSel, 10);
      }
      const Mod = App.getEditionModule(ed);
      const secPhys =
        !!(Mod && Mod.secPhysBonus) &&
        !!(document.getElementById("srv-secphys") || {}).checked;
      if (secPhys) indice += Mod.secPhysBonus;

      // Attributs ASDF (SR5/SR6) : indice à indice+3 répartis au hasard
      let attrs = null;
      if (Mod?.matrixModel?.hasAttrs) {
        const vals = [indice, indice + 1, indice + 2, indice + 3].sort(
          () => Math.random() - 0.5,
        );
        attrs = Object.fromEntries(Matrix.ATTR_KEYS.map((ak, i) => [ak.key, vals[i]]));
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
        intrusion: Intrusion.newState(),
      };

      if ((document.getElementById("srv-spider") || {}).checked) {
        srv.spider = this._makeSpider(srv);
      }

      Debug.log("servers", "serveur créé", {
        name: srv.name,
        edition: srv.edition,
        profile: srv.profile,
        indice: srv.indice,
        sev: srv.sev,
        secPhys,
        ics: srv.icList,
        spider: !!srv.spider,
      });

      this.data.all.push(srv);
      // Classe dans le dossier de destination courant (piloté par DossierBar).
      if (this.currentGroup && this.currentGroup !== "all") {
        (this.data.groups[this.currentGroup] ||= []).push(srv.id);
      }
      this.save();
      this.render();
      toast(`✓ ${srv.name} (indice ${srv.indice}) créé.`);
    },

    /* ---- Spider (decker de sécurité lié) ---- */
    _spiderOpts(srv) {
      const Mod = App.getEditionModule(srv.edition);
      const opts = {
        meta: "Aléatoire",
        gender: "Aléatoire",
        archetype: Mod.spiderArchetype(srv.indice),
        tier: "Aléatoire",
        special: Mod.spiderSpecial,
      };
      // Rating du spider dérivé de l'indice serveur (SR5/SR6 uniquement :
      // Anarchy n'a pas de champ de rating numérique, cf. ratingBadge).
      if (Mod.ratingBadge.field !== "tier") {
        opts[Mod.ratingBadge.field] = String(Utils.clamp(Math.ceil(srv.indice / 2), 2, 6));
      }
      return opts;
    },

    _makeSpider(srv) {
      const Mod = App.getEditionModule(srv.edition);
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

      if (App.getEditionModule(srv.edition)?.matrixModel?.hasAttrs) {
        srv.attrs = srv.attrs || {};
        for (const ak of Matrix.ATTR_KEYS) {
          const el = val(ak.key);
          if (el) srv.attrs[ak.key] = Utils.clamp(parseInt(el.value, 10) || 1, 1, 15);
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
      if (!srv || !Matrix.use(srv.edition).hasAttrs()) return;
      const vals = [srv.indice, srv.indice + 1, srv.indice + 2, srv.indice + 3].sort(
        () => Math.random() - 0.5,
      );
      srv.attrs = Object.fromEntries(Matrix.ATTR_KEYS.map((ak, i) => [ak.key, vals[i]]));
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
      this._migrateAttrs();
      this.renderForm();
      this.render();
      this._wire();
    },

    /* ---- Écran de génération dédié (barre de dossiers + formulaire +
       grille des serveurs du dossier courant) ---- */
    _genWired: false,
    initGenPanel() {
      this.renderForm();
      if (!this._genWired) {
        this._genWired = true;
        DossierBar.mount("servers-dossier-list");
        DossierBar.subscribe(() => this._renderGenGrid());
      }
      this._renderGenGrid();
      DossierBar.render();
    },
    _renderGenGrid() {
      const grid = document.getElementById("servers-gen-grid");
      if (!grid) return;
      grid.innerHTML = "";
      this.renderMembers(grid, DossierBar.memberIds(this));
    },

    /** Migre les serveurs sauvegardés avant le renommage des attributs
        matriciels (ATQ/COR/TDD/FW → attack/sleaze/dataProcessing/firewall). */
    _migrateAttrs() {
      const legacy = { ATQ: "attack", COR: "sleaze", TDD: "dataProcessing", FW: "firewall" };
      let migrated = false;
      for (const srv of this.data.all) {
        if (!srv.attrs || !("ATQ" in srv.attrs)) continue;
        srv.attrs = Object.fromEntries(
          Object.entries(legacy).map(([oldKey, newKey]) => [newKey, srv.attrs[oldKey]]),
        );
        migrated = true;
      }
      if (migrated) this.save();
    },

    /* ---- Délégation d'événements (modèle ContentModal/Collection) ----
       Un seul écouteur, posé une fois sur le conteneur persistant du
       panneau (jamais recréé — seuls le formulaire et la grille sont
       reconstruits à chaque render). */
    _wire() {
      if (this._wired) return;
      this._wired = true;
      // Cartes serveur rendues à la fois dans le hub et dans l'écran de
      // génération Serveurs : la délégation est posée sur le conteneur
      // applicatif qui couvre tous les panneaux.
      const panel = document.getElementById("app");
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
            Intrusion.toggleIntrusion(id);
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
            Intrusion.icBox(id, el.dataset.k, n());
            break;
          case "relaunch-ic":
            Intrusion.relaunchIC(id, el.dataset.k);
            break;
          case "roll-ic":
            Intrusion.rollIC(id, el.dataset.k, el.dataset.kind);
            break;
          case "set-alert":
            Intrusion.setAlert(id);
            break;
          case "next-turn":
            Intrusion.nextTurn(id);
            break;
          case "reset-intrusion":
            Intrusion.resetIntrusion(id);
            break;
          case "add-ss-2d6":
            Intrusion.addSS2D6(id);
            break;
          case "add-marks":
            Intrusion.addMarks(id, n());
            break;
          case "add-ss":
            Intrusion.addSS(id, n(), el.dataset.label);
            break;
          case "set-illegal":
            Intrusion.setIllegal(id, el.dataset.kind, n());
            break;
          case "undo-ss":
            Intrusion.undoSS(id);
            break;
          case "reset-ss":
            Intrusion.resetSS(id);
            break;
          case "dieu":
            Intrusion.dieu(id, el.dataset.k, n());
            break;
          case "disaster":
            Intrusion.disaster(id);
            break;
          case "reboot-decker":
            Intrusion.rebootDecker(id);
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
