"use strict";

/* ============================================================
   SERVEURS & CI — bibliothèque et panneau « Matrice ».
   Bibliothèque de serveurs avec groupes (socle Collection, comme
   Shadows/ContactsBook), panneau de génération, édition de serveur,
   spider lié. La fabrication d'un objet serveur (données + règles de
   génération) est déléguée à ServerGen (js/controllers/servergen.js) ;
   ce fichier lit le formulaire, persiste et rend.
   Les catalogues de CI/profils/sculptures par édition vivent dans
   js/matrix.js (Matrix.use(edition)). L'état de run en direct
   (tours, CI déployées, surveillance) est porté par le tracker
   Intrusion (js/controllers/intrusion.js). Le rendu HTML
   (formulaire, cartes, panneaux) vit dans
   js/widgets/play/serverrenderer.js (ServerRenderer).
   ============================================================ */
import { CardRenderer } from "../widgets/card/cardrenderer.js";
import { Collection } from "../widgets/collection/collection.js";
import { Debug } from "../core/debug.js";
import { Dialog } from "../widgets/kit/dialog.js";
import { DossierBar } from "../widgets/journal/dossierbar.js";
import { Dossiers } from "../widgets/journal/dossiers.js";
import { Encounter } from "./encounter.js";
import { Intrusion } from "./intrusion.js";
import { Matrix } from "../rules/matrix.js";
import { Portrait } from "./portrait.js";
import { ServerGen } from "./servergen.js";
import { ServerRenderer } from "../widgets/play/serverrenderer.js";
import { SidebarToggle } from "../widgets/kit/sidebartoggle.js";
import { TopologyGen } from "../rules/topologygen.js";
import { Utils } from "../core/utils.js";

export const Servers = Object.assign(
  Collection.create({
    key: "servers",
    storageKeys: { all: "servers_all", groups: "servers_groups" },
    // dom.grid n'est jamais monté (mêmes raisons que ContactsBook) : le
    // glisser-déposer B1, délégué sur `document`, dérive sa grille du parent
    // réel de la carte et n'a pas besoin d'un id de conteneur.
    dom: {
      grid: "servers-grid",
      sidebar: "servers-group-list",
      label: "servers-group-label",
    },
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
    /** Crée un serveur depuis le formulaire du panneau : lit les champs,
        délègue la fabrication à ServerGen, puis persiste (addServer). */
    createFromForm() {
      const ed = this._edition();
      const srv = ServerGen.generate(ed, {
        profileId: (document.getElementById("srv-profile") || {}).value || "random",
        indiceSel: (document.getElementById("srv-indice") || {}).value || "auto",
        secPhys: !!(document.getElementById("srv-secphys") || {}).checked,
        icChoices: Array.from(
          document.querySelectorAll("#srv-ic-choices input:checked"),
        ).map((el) => el.value),
        name: (document.getElementById("srv-name") || {}).value || "",
        withSpider: !!(document.getElementById("srv-spider") || {}).checked,
      });
      this.addServer(srv);
    },

    /** Range un serveur fabriqué dans la bibliothèque (dossier courant),
        persiste et rafraîchit. */
    addServer(srv) {
      Debug.log("servers", "serveur créé", {
        name: srv.name,
        edition: srv.edition,
        profile: srv.profile,
        indice: srv.indice,
        sev: srv.sev,
        secPhys: srv.secPhys,
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

    /* ========================================================
       PLAN DE SERVEUR (lot A4) — schéma d'architecture du dossier
       ========================================================
       Miroir de RunGen.showMap (« Plan tactique ») pour la Matrice :
       les serveurs du dossier courant deviennent les nœuds d'un graphe
       (ordre = ordre du dossier), rendu par le leaf TopologyGen et
       affiché dans la lightbox Portrait. Rien de lourd persisté — le
       SVG se régénère de la graine (id du dossier). Le régime par
       édition (archétypes, mode d'entrée, badge, cible) est lu via
       Matrix.topology* — aucune branche `if (App.edition === …)`. */
    async showTopology() {
      const servers = DossierBar.memberIds(this)
        .map((id) => this.find(id))
        .filter(Boolean);
      if (!servers.length) {
        toast("Aucun serveur dans ce dossier à mettre en plan.");
        return;
      }
      const ed = this._edition();
      const archetypes = Matrix.use(ed).topologyArchetypes();
      let archetype = archetypes[0].id;
      // Laisser le MJ choisir la forme quand l'édition en propose plusieurs
      // (A2 chaîne/arbo ; SR5/6 chaîne/WAN/imbriqués) — un seul tap, sinon rien.
      if (archetypes.length > 1) {
        const choice = await Dialog.choose({
          title: "Forme du site",
          message: "Comment ce site est-il agencé ?",
          options: archetypes.map((a, i) => ({ value: a.id, label: a.label, primary: i === 0 })),
        });
        if (!choice) return; // annulé
        archetype = choice;
      }
      const modes = Matrix.use(ed).topologyEntryModes();
      const entryServer = servers.find((s) => s.entry);
      const entryMode = entryServer
        ? modes.find((m) => m.id === entryServer.entry) || modes[0]
        : modes[0];
      // Badge par ÉDITION DU SERVEUR (un dossier peut en mélanger) —
      // jamais un badge neutre unique (Indice+ASDF / Indice+FW / pool).
      const nodes = servers.map((s) => ({
        name: s.name,
        badge: Matrix.use(s.edition).topologyNodeBadge(s),
        isTarget: !!s.isTarget,
      }));
      const accent = (App.editionModule && App.editionModule.mapAccent) || "#35e0e6";
      const dossId = DossierBar.current;
      const label = dossId === "all" ? "Tous les serveurs" : Dossiers.nameOf(dossId) || "Site";
      const archLabel = (archetypes.find((a) => a.id === archetype) || {}).label || "";
      const svg = TopologyGen.build({
        archetype,
        nodes,
        seed: `${dossId}:${ed}`,
        accent,
        entryMode,
        title: `Plan — ${label}`,
        subtitle: `${servers.length} serveur${servers.length > 1 ? "s" : ""} · ${archLabel}`,
      });
      Portrait.showPreview(TopologyGen.dataUrl(svg), `Plan de serveur — ${label}`);
    },

    /* ---- Spider (decker de sécurité lié) — fabrication déléguée à ServerGen ---- */
    addSpider(id) {
      const srv = this.find(id);
      if (!srv) return;
      srv.spider = ServerGen.makeSpider(srv);
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

      // Topologie (lot A) : point d'entrée + nœud-cible. Absents = défauts
      // (aucune migration) — on retire le champ plutôt que d'y poser "".
      const entryEl = val("entry");
      if (entryEl) {
        if (entryEl.value) srv.entry = entryEl.value;
        else delete srv.entry;
      }
      const targetEl = val("target");
      if (targetEl) srv.isTarget = targetEl.checked;

      this.save();
    },

    /** Redistribue les attributs ASDF depuis l'indice (indice à indice+3). */
    redistributeAttrs(id) {
      this._commitEdit(id);
      const srv = this.find(id);
      if (!srv || !Matrix.use(srv.edition).hasAttrs()) return;
      srv.attrs = ServerGen.rollAttrs(srv.indice);
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
      // L'état vivant de ce serveur (s'il y en a un) vit scène-scopé,
      // pas sur srv — nettoyé là où il se trouve réellement.
      const intr =
        typeof Encounter !== "undefined" && Encounter.state && Encounter.state.matrix
          ? Encounter.state.matrix[id]
          : null;
      if (intr && intr.ics) delete intr.ics[key];
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

    /** Rafraîchit la grille de serveurs affichée, sans reconstruire le
        formulaire ni les dossiers. Miroir de ContactsBook.refreshGrid —
        point d'entrée public utilisé par Collection._afterReorder (B1). */
    refreshGrid() {
      this._renderGenGrid();
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

      // Le tiroir Matrice du tracker de combat (cf. Encounter) est hors
      // de #app (overlay au même niveau qu'#encounter-overlay) mais réutilise
      // verbatim ServerRenderer.intrusionPanel — même délégation posée sur
      // les deux conteneurs plutôt qu'une 2ᵉ copie du switch (audit
      // intrusion.js : la logique existait déjà, on ne la duplique pas).
      const onClick = (e) => {
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
          case "show-topology":
            this.showTopology();
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
          case "mark-on":
            Intrusion.addMarkOn(id, el.dataset.pj, n());
            break;
          case "mark-held":
            Intrusion.addMarkHeld(id, n());
            break;
          case "add-ss":
            Intrusion.addSS(id, n(), el.dataset.label);
            break;
          case "set-illegal":
            Intrusion.setIllegal(id, el.dataset.kind, n());
            break;
          case "set-access":
            Intrusion.setAccess(id, n());
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
          case "send-to-encounter":
            Encounter.linkServer(id);
            Encounter.open();
            break;
        }
      };
      panel.addEventListener("click", onClick);
      const matrixDrawer = document.getElementById("matrix-drawer-overlay");
      if (matrixDrawer) matrixDrawer.addEventListener("click", onClick);
      // Colonne Matrice dockée (≥1100px) — 3ᵉ montage du même contenu
      // (intrusionPanel), même délégation que le tiroir mobile plutôt qu'une
      // 3ᵉ copie du switch.
      const matrixDock = document.getElementById("encounter-matrix-dock");
      if (matrixDock) matrixDock.addEventListener("click", onClick);

      const onChange = (e) => {
        const noteEl = e.target.closest('[data-action="edit-note"]');
        if (noteEl) return this.editNote(noteEl.dataset.id, noteEl.value);
        // Sélecteur multi-serveur du tiroir Matrice.
        const switchEl = e.target.closest('[data-action="switch-matrix-server"]');
        if (switchEl) Encounter.linkServer(switchEl.value);
      };
      panel.addEventListener("change", onChange);
      if (matrixDrawer) matrixDrawer.addEventListener("change", onChange);
      if (matrixDock) matrixDock.addEventListener("change", onChange);
    },

    renderForm() {
      const host = document.getElementById("server-gen-form");
      if (!host) return;
      host.innerHTML = ServerRenderer.renderForm(this._edition());
    },
  },
);

// Pont couche 5 (migration modules ES) — retiré en fin de migration.
window.Servers = Servers;
