"use strict";

/* ============================================================
   SERVEURS & CI — assistance aux intrusions matricielles
   (issue #14). Panneau « Matrice » : bibliothèque de serveurs
   avec groupes (socle Collection, comme Shadows/ContactsBook),
   génération dirigée ou aléatoire, et tracker d'intrusion en
   direct. Les catalogues de CI/profils/sculptures par édition
   vivent dans js/matrix.js (Matrix.use(edition)) ; ce fichier ne
   porte que le tracker d'intrusion, l'édition de carte et le rendu.
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
    renderCard: (srv) => Servers._renderCard(srv),
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
    },

    renderForm() {
      const host = document.getElementById("server-gen-form");
      if (!host) return;
      const ed = this._edition();
      const esc = CardRenderer._esc.bind(CardRenderer);
      const secPhysBonus =
        (typeof App !== "undefined" && App.getEditionModule
          ? App.getEditionModule(ed)
          : null
        )?.secPhysBonus;

      const profOpts = [
        `<option value="random">Aléatoire</option>`,
        ...this.profiles(ed).map(
          (p) =>
            `<option value="${p.id}">${esc(p.label)}${ed === "anarchy" ? ` (${p.indice})` : ` (${p.min}-${p.max})`}</option>`,
        ),
      ].join("");

      const range = Matrix.use(ed).indiceRange();
      const indOpts = [
        `<option value="auto">Selon profil</option>`,
        ...Array.from({ length: range[1] - range[0] + 1 }, (_, i) => range[0] + i).map(
          (n) => `<option value="${n}">${n}</option>`,
        ),
      ].join("");

      const icChips = Object.entries(this.icCatalog(ed))
        .filter(([k]) => k !== "patrouilleuse")
        .map(
          ([k, ic]) => `
        <label class="ic-choice"><input type="checkbox" value="${k}">${esc(ic.label.replace(/^CI /, ""))}</label>`,
        )
        .join("");

      host.innerHTML = `
      <div class="contact-form">
        <div class="contact-form-row">
          <label>Nom
            <input type="text" id="srv-name" placeholder="Aléatoire si vide">
          </label>
          <label>Profil
            <select id="srv-profile">${profOpts}</select>
          </label>
          <label>Indice
            <select id="srv-indice">${indOpts}</select>
          </label>
        </div>
        <div class="contact-form-row server-form-flags">
          ${secPhysBonus ? `<label class="ic-choice"><input type="checkbox" id="srv-secphys">Gère la sécurité physique (+${secPhysBonus} indice)</label>` : ""}
          <label class="ic-choice"><input type="checkbox" id="srv-spider">Spider (decker de sécurité lié)</label>
        </div>
        <details class="server-ic-details">
          <summary>CI présentes — sélection auto (Patrouilleuse toujours incluse), ou au choix :</summary>
          <div id="srv-ic-choices" class="server-ic-choices">${icChips}</div>
        </details>
      </div>`;
    },

    _renderCard(srv) {
      const esc = CardRenderer._esc.bind(CardRenderer);
      const card = document.createElement("div");
      card.className = "server-card";
      card.dataset.id = srv.id;

      const intr = srv.intrusion || this._newIntrusion();
      const catalog = this.icCatalog(srv.edition);

      /* -- header + stats -- */
      let statsHtml;
      if (srv.edition === "anarchy") {
        statsHtml = `
        <div class="server-attrs">
          <span class="server-attr"><b>${srv.indice}</b>Indice</span>
          <span class="server-attr"><b>${srv.indice}</b>Firewall</span>
        </div>
        <div class="server-thresholds">Seuils de Piratage : sans élévation <b>${srv.indice}</b> · élever à Utilisateur <b>${srv.indice + 1}</b> · à Administrateur <b>${srv.indice + 2}</b> · décryptage <b>${srv.indice}</b></div>`;
      } else {
        const a = srv.attrs || { ATQ: "?", COR: "?", TDD: "?", FW: "?" };
        statsHtml = `
        <div class="server-attrs">
          <span class="server-attr"><b>${srv.indice}</b>Indice</span>
          <span class="server-attr"><b>${a.ATQ}</b>ATQ</span>
          <span class="server-attr"><b>${a.COR}</b>COR</span>
          <span class="server-attr"><b>${a.TDD}</b>TdD</span>
          <span class="server-attr"><b>${a.FW}</b>FW</span>
        </div>
        <div class="server-thresholds">CI : ${Matrix.use(srv.edition).icThresholdsText(srv)}</div>`;
      }

      /* -- chips CI -- */
      const chips = (srv.icList || [])
        .map((k) => {
          const ic = catalog[k];
          if (!ic) return "";
          const label = ic.label.replace(/^CI /, "");
          const eff = typeof ic.effect === "function" ? ic.effect(srv) : "";
          const tip = `${ic.def ? `Défense : ${ic.def} — ` : ""}${eff}`;
          return `<span class="ic-chip ${ic.watch ? "watch" : ""}" title="${esc(tip)}">${esc(label)}</span>`;
        })
        .join("");

      const editing = !!this._editing[srv.id];
      const body = editing
        ? this._editHTML(srv)
        : `
        <div class="server-profile">${esc(srv.profile || "")}${srv.secPhys ? " · sécurité physique (+1)" : ""}</div>
        ${statsHtml}
        <div class="server-sculpture">${esc(srv.sculpture || "")}
          <button class="btn-icon-tiny" onclick="Servers.rerollSculpture('${srv.id}')"
            title="Relancer la sculpture (gamme du serveur)">🎲</button>
        </div>
        <div class="server-ic-row">${chips}</div>
        ${intr.open ? this._intrusionHTML(srv) : ""}`;

      card.innerHTML = `
      <div class="server-card-header">
        <span class="server-name" title="${esc(srv.profile || "")}">${esc(srv.name)}</span>
        <span class="server-badge">Indice ${srv.indice}</span>
      </div>
      <div class="server-card-body">
        ${body}
        <textarea class="server-notes" placeholder="Notes…"
          onchange="Servers.editNote('${srv.id}', this.value)">${esc(srv.notes || "")}</textarea>
      </div>
      <div class="server-card-footer">
        ${editing
          ? `<button class="btn-primary btn-small" onclick="Servers.toggleEdit('${srv.id}')">✓ Terminer</button>`
          : `<button class="btn-secondary btn-small ${intr.open ? "active" : ""}"
              onclick="Servers.toggleIntrusion('${srv.id}')">${intr.open ? "Fermer l'intrusion" : "⚡ Intrusion"}</button>
            <button class="btn-secondary btn-small" onclick="Servers.toggleEdit('${srv.id}')" title="Éditer le serveur">✎ Éditer</button>
            ${srv.spider
              ? `<button class="btn-secondary btn-small" onclick="Servers.removeSpider('${srv.id}')" title="Retirer le spider">Spider ✕</button>`
              : `<button class="btn-secondary btn-small" onclick="Servers.addSpider('${srv.id}')" title="Générer un decker de sécurité lié">+ Spider</button>`}`}
        <button class="btn-icon danger" onclick="Servers.remove('${srv.id}')" title="Supprimer">✕</button>
      </div>`;
      return card;
    },

    /* ---- Formulaire d'édition (dans la carte) ---- */
    _editHTML(srv) {
      const esc = CardRenderer._esc.bind(CardRenderer);
      const id = srv.id;
      const catalog = this.icCatalog(srv.edition);

      const profOpts = this.profiles(srv.edition)
        .map(
          (p) =>
            `<option value="${p.id}" ${p.label === srv.profile ? "selected" : ""}>${esc(p.label)}</option>`,
        )
        .join("");

      const range = Matrix.use(srv.edition).indiceRange();
      const indOpts = Array.from(
        { length: range[1] - range[0] + 1 },
        (_, i) => range[0] + i,
      )
        .map((n) => `<option value="${n}" ${n === srv.indice ? "selected" : ""}>${n}</option>`)
        .join("");

      const attrsHtml =
        srv.edition === "anarchy"
          ? ""
          : `<div class="server-edit-row">
            ${["ATQ", "COR", "TDD", "FW"]
              .map(
                (k) => `<label class="server-edit-attr">${k}
                  <input type="number" id="se-${id}-${k.toLowerCase()}" min="1" max="15"
                    value="${(srv.attrs || {})[k] || srv.indice}"></label>`,
              )
              .join("")}
            <button class="btn-secondary btn-small" onclick="Servers.redistributeAttrs('${id}')"
              title="Redistribuer indice à indice+3 au hasard">↻ ASDF</button>
          </div>`;

      /* Liste ordonnée (l'ordre = ordre de déploiement, Patrouilleuse en tête) */
      const icRows = srv.icList
        .map((k, i) => {
          const ic = catalog[k];
          const label = ic ? ic.label.replace(/^CI /, "") : k;
          if (k === "patrouilleuse") {
            return `<div class="ic-edit-row fixed"><span>1. ${esc(label)}</span><small>toujours présente</small></div>`;
          }
          return `<div class="ic-edit-row">
          <span>${i + 1}. ${esc(label)}</span>
          <span class="ic-edit-actions">
            <button class="btn-icon-tiny" onclick="Servers.moveIC('${id}', '${k}', -1)" title="Déployée plus tôt">↑</button>
            <button class="btn-icon-tiny" onclick="Servers.moveIC('${id}', '${k}', 1)" title="Déployée plus tard">↓</button>
            <button class="btn-icon-tiny danger" onclick="Servers.dropIC('${id}', '${k}')" title="Retirer">✕</button>
          </span>
        </div>`;
        })
        .join("");

      const addOpts = Object.entries(catalog)
        .filter(([k]) => k !== "patrouilleuse" && !srv.icList.includes(k))
        .map(([k, ic]) => `<option value="${k}">${esc(ic.label.replace(/^CI /, ""))}</option>`)
        .join("");

      return `
      <div class="server-edit">
        <label class="server-edit-label">Nom
          <input type="text" id="se-${id}-name" value="${esc(srv.name)}"></label>
        <div class="server-edit-row">
          <label class="server-edit-label">Profil
            <select id="se-${id}-profile">${profOpts}</select></label>
          <label class="server-edit-label narrow">Indice
            <select id="se-${id}-indice">${indOpts}</select></label>
        </div>
        ${(typeof App !== "undefined" && App.getEditionModule ? App.getEditionModule(srv.edition) : null)?.secPhysBonus
          ? `<label class="ic-choice"><input type="checkbox" id="se-${id}-secphys" ${srv.secPhys ? "checked" : ""}>Gère la sécurité physique</label>`
          : ""}
        ${attrsHtml}
        <label class="server-edit-label">Sculpture
          <textarea id="se-${id}-sculpture" rows="3">${esc(srv.sculpture || "")}</textarea></label>
        <button class="btn-secondary btn-small" onclick="Servers.rerollSculptureEdit('${id}')">🎲 Relancer la sculpture</button>
        <div class="server-edit-ics">
          <span class="monitor-label">CI — ordre de déploiement</span>
          ${icRows}
          ${addOpts
            ? `<div class="ic-edit-add">
                <select id="se-${id}-addic">${addOpts}</select>
                <button class="btn-secondary btn-small" onclick="Servers.addIC('${id}')">＋ Ajouter</button>
              </div>`
            : ""}
        </div>
      </div>`;
    },

    /* ---- Bloc intrusion (tracker) ---- */
    _intrusionHTML(srv) {
      const esc = CardRenderer._esc.bind(CardRenderer);
      const intr = srv.intrusion;
      const catalog = this.icCatalog(srv.edition);
      const size = this.icMonitorSize(srv);

      /* Lignes de CI */
      const rows = (srv.icList || [])
        .map((k) => {
          const ic = catalog[k];
          if (!ic) return "";
          const st = intr.ics[k] || { active: !!ic.watch, dmg: 0, down: false };
          const isActive = ic.watch || (st.active && !st.down);
          const label = ic.label.replace(/^CI /, "");
          const eff = typeof ic.effect === "function" ? ic.effect(srv) : "";

          const boxes = `<span class="monitor-boxes">${Array.from({ length: size }, (_, i) => {
            const n = i + 1;
            const sep =
              srv.edition === "anarchy" && (n === 3 || n === 4)
                ? ' style="margin-left:3px;"'
                : "";
            return `<span class="monitor-box ${st.dmg >= n ? "filled" : ""}"${sep}
              title="${srv.edition === "anarchy" ? ["Légère", "Légère", "Grave", "Incapacitante"][i] : `Case ${n}`}"
              onclick="Servers.icBox('${srv.id}', '${k}', ${n})"></span>`;
          }).join("")}</span>`;

          const status = ic.watch
            ? `<span class="ic-status watch">veille</span>`
            : st.down
              ? `<span class="ic-status down">détruite</span>
               <button class="btn-secondary btn-small" onclick="Servers.relaunchIC('${srv.id}', '${k}')" title="Le serveur relance une copie (dès le tour suivant)">↻ relancer</button>`
              : st.active
                ? `<span class="ic-status active">active${st.turn ? ` · t${st.turn}` : ""}</span>`
                : `<span class="ic-status idle">en réserve</span>`;

          /* Jets (SR5/SR6) — les glaces Anarchy ont des succès fixes */
          let rolls = "";
          if (srv.edition !== "anarchy" && (ic.watch || (st.active && !st.down))) {
            const M = Matrix.use(srv.edition);
            const btn = (kind, txt, tip) =>
              `<button class="btn-secondary btn-small ic-roll" title="${esc(tip)}"
              onclick="Servers.rollIC('${srv.id}', '${k}', '${kind}')">⚄ ${txt}</button>`;
            if (ic.watch) {
              const per = M.actionRoll("per", srv);
              rolls = btn("per", per.txt, per.tip);
            } else {
              const atk = M.actionRoll("atk", srv);
              const def = M.actionRoll("def", srv);
              const soak = M.actionRoll("soak", srv);
              rolls =
                btn("atk", atk.txt, atk.tip) +
                btn("def", def.txt, def.tip) +
                (soak ? btn("soak", soak.txt, soak.tip) : "");
            }
          }

          return `<div class="ic-row ${isActive ? "on" : ""} ${st.down ? "dead" : ""}">
          <div class="ic-row-head">
            <span class="ic-row-name">${esc(label)}</span>
            ${status}
          </div>
          <div class="ic-row-effect">${ic.def ? `<b>Défense :</b> ${esc(ic.def)} — ` : ""}${esc(eff)}</div>
          ${rolls ? `<div class="ic-row-rolls">${rolls}</div>` : ""}
          ${st.active || st.down || ic.watch ? `<div class="monitor-row"><span class="monitor-label">Moniteur${Matrix.use(srv.edition).firewallLabel()}</span>${boxes}</div>` : ""}
        </div>`;
        })
        .join("");

      /* Bloc surveillance selon édition */
      const surveillance =
        srv.edition === "anarchy" ? this._dieuHTML(srv) : this._ssHTML(srv);

      return `
      <div class="intrusion-panel">
        <div class="intrusion-toolbar">
          <span class="intrusion-turn">Tour <b>${intr.turn}</b></span>
          <button class="btn-secondary btn-small ${intr.alerted ? "alert-on" : ""}"
            onclick="Servers.setAlert('${srv.id}')"
            title="La Patrouilleuse a repéré l'intrus : le serveur déploie une CI par tour">
            ${intr.alerted ? "⚠ Alerte en cours" : "Donner l'alerte"}</button>
          <button class="btn-primary btn-small" onclick="Servers.nextTurn('${srv.id}')">Tour suivant ▸</button>
          <button class="btn-icon" onclick="Servers.resetIntrusion('${srv.id}')" title="Réinitialiser l'intrusion">↺</button>
        </div>
        <div class="ic-rows">${rows}</div>
        ${surveillance}
      </div>`;
    },

    /* ---- Jauge SS (SR5/SR6) ---- */
    _ssHTML(srv) {
      const esc = CardRenderer._esc.bind(CardRenderer);
      const intr = srv.intrusion;
      const ss = intr.ss;
      const pct = Utils.clamp((ss / 40) * 100, 0, 100);
      const zone = ss >= 40 ? "conv" : ss >= 30 ? "hot" : ss >= 20 ? "warm" : "cool";

      const fmt = (t) => {
        const d = new Date(t);
        return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
      };
      const log = intr.ssLog
        .slice(0, 6)
        .map(
          (e) =>
            `<div class="ss-log-item"><span>${fmt(e.t)}</span> <b>${e.d >= 0 ? "+" : ""}${e.d}</b> ${esc(e.label)}</div>`,
        )
        .join("");

      const sr5Extra =
        srv.edition === "sr5"
          ? `<button class="btn-secondary btn-small" onclick="Servers.addSS2D6('${srv.id}')"
            title="Le SS augmente de 2D6 toutes les 15 minutes après le premier point (p.233)">
            +2D6 ⏱${intr.lastRollT ? ` ${Math.round((Date.now() - intr.lastRollT) / 60000)} min` : ""}</button>
          <span class="ss-marks">Marks du serveur :
            <button class="btn-icon-tiny" onclick="Servers.addMarks('${srv.id}', -1)">−</button>
            <b>${intr.marks}</b>/3
            <button class="btn-icon-tiny" onclick="Servers.addMarks('${srv.id}', 1)">＋</button>
            <small>(+2 dommages CI/mark · Traqueuse à 2+ · convergence = 3 marks posées)</small>
          </span>`
          : `<button class="btn-secondary btn-small" onclick="Servers.addSS('${srv.id}', 1, 'programme de hacking')"
            title="+1 SS par action matricielle modifiée par un programme de hacking (p.178)">+1 prog.</button>
          <span class="ss-marks">Accès illégaux maintenus —
            Utilisateur <button class="btn-icon-tiny" onclick="Servers.setIllegal('${srv.id}', 'user', -1)">−</button><b>${intr.illUser}</b><button class="btn-icon-tiny" onclick="Servers.setIllegal('${srv.id}', 'user', 1)">＋</button>
            · Admin <button class="btn-icon-tiny" onclick="Servers.setIllegal('${srv.id}', 'admin', -1)">−</button><b>${intr.illAdmin}</b><button class="btn-icon-tiny" onclick="Servers.setIllegal('${srv.id}', 'admin', 1)">＋</button>
            <small>(+1/+3 SS par round, appliqués à « Tour suivant »)</small>
          </span>`;

      const convergence =
        ss >= 40
          ? `<div class="ss-convergence">☠ CONVERGENCE — ${Matrix.use(srv.edition).convergenceText()}</div>`
          : "";

      return `
      <div class="ss-block">
        <div class="ss-head">
          <span class="monitor-label">Score de Surveillance</span>
          <span class="ss-value ${zone}">${ss} / 40</span>
        </div>
        <div class="ss-gauge"><div class="ss-fill ${zone}" style="width:${pct}%"></div></div>
        <div class="ss-actions">
          <span class="ss-actions-label" title="Après chaque action illégale : +succès de la défense">Défense :</span>
          ${[1, 2, 3, 4, 5]
            .map(
              (n) =>
                `<button class="btn-secondary btn-small" onclick="Servers.addSS('${srv.id}', ${n})">+${n}</button>`,
            )
            .join("")}
          <button class="btn-icon-tiny" onclick="Servers.undoSS('${srv.id}')" title="Annuler le dernier ajout">⌫</button>
          <button class="btn-icon-tiny" onclick="Servers.resetSS('${srv.id}')" title="Reboot du decker : SS à zéro">↺</button>
        </div>
        <div class="ss-actions">${sr5Extra}</div>
        ${convergence}
        ${log ? `<div class="ss-log">${log}</div>` : ""}
      </div>`;
    },

    /* ---- Surveillance du DIEU (Anarchy) ---- */
    _dieuHTML(srv) {
      const intr = srv.intrusion;
      const riskMin = intr.minor * 2;
      const seuil = intr.critical;

      const stepper = (label, key, val, tip) => `
      <span class="ss-marks" title="${tip}">${label}
        <button class="btn-icon-tiny" onclick="Servers.dieu('${srv.id}', '${key}', -1)">−</button>
        <b>${val}</b>
        <button class="btn-icon-tiny" onclick="Servers.dieu('${srv.id}', '${key}', 1)">＋</button>
      </span>`;

      return `
      <div class="ss-block">
        <div class="ss-head">
          <span class="monitor-label">Surveillance du DIEU (complications de Piratage)</span>
        </div>
        <div class="ss-actions">
          ${stepper("Mineures", "minor", intr.minor, "Chaque complication mineure : +2 dés de risque minimum sur les tests de Piratage (hors cybercombat)")}
          ${stepper("Critiques", "critical", intr.critical, "Chaque complication critique : seuil de tous les tests de Piratage (hors cybercombat) +1")}
        </div>
        <div class="ss-effects ${riskMin || seuil ? "on" : ""}">
          Effets en cours : dés de risque minimum <b>${riskMin}</b> · seuil de Piratage <b>+${seuil}</b> (hors cybercombat)
        </div>
        <div class="ss-actions">
          <button class="btn-secondary btn-small ${intr.converged ? "alert-on" : ""}"
            onclick="Servers.disaster('${srv.id}')"
            title="Complication Désastre : le DIEU converge">${intr.converged ? "☠ Convergence !" : "Désastre…"}</button>
          <button class="btn-secondary btn-small" onclick="Servers.rebootDecker('${srv.id}')"
            title="Seule façon d'effacer les malus : reboot du deck + 1 h hors ligne (perte de tous les accès)">Reboot + 1 h hors ligne</button>
        </div>
        ${
          intr.converged
            ? `<div class="ss-convergence">☠ DÉSASTRE — le DIEU converge : cyberdeck brické, choc d'éjection, force d'intervention d'élite sur place en quelques minutes (p.218).</div>`
            : ""
        }
      </div>`;
    },
  },
);
