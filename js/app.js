"use strict";

/* ============================================================
   APP — Bootstrap, routing, sélecteur d'édition
   ============================================================ */
const App = {
  /** Version applicative (semver) — axe distinct du `schemaVersion` de
      Storage (qui versionne les données) : celui-ci versionne la RELEASE.
      Lisible en console pour le support ; future base de la révision « Quoi
      de neuf » (chantier V9). Voir CONTRIBUTING.md § Versionner les schémas. */
  VERSION: "1.16.0",

  edition: "none",
  editionModule: null,

  /** Contenu des panels d'accueil par édition */
  welcomeContent: {
    sr5: {
      title: "Shadowrun 5e édition",
      body: `
        <h2>Shadow Herds — Shadowrun 5e</h2>
        <p>Gestionnaire de PNJ pour <strong>Shadowrun 5e édition</strong>, calibré sur le LdB SR5 (p.68–396).</p>
        <ul>
          <li><strong>Ombres portées</strong> — Bibliothèque de PNJ sauvegardés, organisés en groupes. Sidebar de navigation à gauche.</li>
          <li><strong>Générateur PNJ</strong> — 48 professions, 5 métatypes, 8 attributs, Limites (Physique / Mental / Social), compétences tirées dans un pool, équipement authentique du livre.</li>
          <li><strong>Contacts</strong> — 24 types de contacts avec Influence (1–12) et Loyauté (1–6), lieux, traits de personnalité, champ Notes et groupes.</li>
          <li><strong>Matrice</strong> — Serveurs (indice 1–12, attributs ASDF), 14 types de CI (p.248–251), tracker d'intrusion avec Score de Surveillance (+2D6/15 min, convergence à 40) et marks, spider lié.</li>
          <li><strong>Run</strong> — Ébauche de scénario : type de mission, client, lieu, complication, objectif secondaire, paiement.</li>
        </ul>
        <p>Les PNJ SR5 incluent les <strong>huit attributs</strong>, les <strong>trois Limites naturelles</strong>, l'Essence, deux moniteurs séparés (physique et étourdissement), initiative et résistance au Drain pour les Éveillés. Profils calibrés sur les six niveaux de Professionnalisme.</p>`,
    },
    sr6: {
      title: "Shadowrun 6e édition",
      body: `
        <h2>Shadow Herds — Shadowrun 6e</h2>
        <p>Gestionnaire de PNJ pour <strong>Shadowrun 6e édition</strong>, calibré sur le LdB SR6, Feu Nourri et le Compagnon du Sixième Monde (BBE).</p>
        <ul>
          <li><strong>Ombres portées</strong> — Bibliothèque de PNJ sauvegardés, organisés en groupes. Sidebar de navigation à gauche.</li>
          <li><strong>Générateur PNJ</strong> — 50+ professions, 5 métatypes + 19 métavariantes (Compagnon), Score Défensif, Potentiel d'Actions, Moniteur d'état unique, compétences SR6 regroupées, weapons avec Scores Offensifs (Feu Nourri).</li>
          <li><strong>Contacts</strong> — 24 types de contacts avec Influence et Loyauté, lieux, traits, champ Notes et groupes.</li>
          <li><strong>Matrice</strong> — Serveurs (indice 1–12, attributs ASDF), 13 types de CI (p.188–189), tracker d'intrusion avec Score de Surveillance (accès illégaux maintenus +1/+3 par round, convergence à 40), spider lié.</li>
          <li><strong>Run</strong> — Ébauche de scénario orientée SR6 : factions, lieux nommés de Seattle, complications.</li>
        </ul>
        <p>Les PNJ SR6 utilisent le <strong>Score Défensif (SD)</strong>, le <strong>Potentiel d'Actions (PA)</strong> et un <strong>Moniteur d'état unique</strong>. Professionnalisme 0–10 calé sur les 20 PNJ de référence du livre (p.212–220). Les métavariantes couvrent Hobgobelin, Oni, Ogre, Satyre, Cyclope, Fomori, Géant, Minotaure, Nocturna, Wakyambi, Dalakitnon, Dryade, Xapiri thëpë, Nartaki, Valkyrie, Duende, Gnome, Hanuman, Koborokuru et Menehune.</p>`,
    },
    anarchy2: {
      title: "Shadowrun Anarchy 2e édition",
      body: `
        <h2>Shadow Herds — Anarchy 2e</h2>
        <p>Gestionnaire de PNJ pour <strong>Shadowrun : Anarchy 2e édition</strong>, calibré sur le LdB SRA 2.0 (p.244–257).</p>
        <ul>
          <li><strong>Ombres portées</strong> — Bibliothèque de PNJ sauvegardés, organisés en groupes. Sidebar de navigation à gauche.</li>
          <li><strong>Générateur PNJ</strong> — 25 statBlocks officiels du livre : Ganger, Ganger d'élite, Ganger éveillé, Ganger adepte, Ganger decker, Go-ganger, Agent de sécurité, Officier de sécurité, Mage / Decker / Adepte / Rigger de sécurité, versions élite, Médecin de combat, Militaire, Commando, Johnson, Employé corpo, Enquêteur, Cadre corpo, Coyote. Cinq attributs (FOR / AGI / VOL / LOG / CHA), compétences avec réserve de dès et RR, armes avec VD par métatype, atouts fixes et au choix, seuils de blessures.</li>
          <li><strong>Contacts</strong> — 30 types de contacts, avec level (0–6), domaine de Réseau, coût en ¥, champ Notes et groupes.</li>
          <li><strong>Matrice</strong> — Serveurs (indice 2–7, +1 sécurité physique, p.222), 7 types de glaces à succès fixes (p.223), tracker d'intrusion (une glace par tour, moniteurs 2L/1G/1I), surveillance du DIEU (complications, p.218), spider lié.</li>
          <li><strong>Run</strong> — Ébauche de scénario : types de missions courts, clients, lieux.</li>
        </ul>
        <p>Les PNJ Anarchy incluent les <strong>variantes métatype</strong> sur chaque attribut, arme et threshold de blessure, les <strong>edges au choix</strong>, et la distinction <strong>Éveillé / Adepte</strong> et les spells.</p>`,
    },
    anarchy1: {
      title: "Shadowrun Anarchy 1re édition",
      body: `
        <h2>Shadow Herds — Anarchy 1re</h2>
        <p>Gestionnaire de PNJ pour <strong>Shadowrun : Anarchy (1re édition)</strong>, calibré sur le livre de base (<em>sran_01</em>) et Anarchistes (<em>sran_03</em>).</p>
        <ul>
          <li><strong>Ombres portées</strong> — Bibliothèque de PNJ sauvegardés, organisés en groupes. Sidebar de navigation à gauche.</li>
          <li><strong>Générateur PNJ</strong> — 21 archétypes officiels du livre (gangers typique / troll / éveillé / decker / rigger, go-ganger, employés et cadres corpo, agents et officiers de sécurité ou police, versions Forces d'élite, soldats, M. Johnson). Six attributs (FOR / AGI / VOL / LOG / CHA / Chance), deux moniteurs Physique/Étourdissement, score de Défense, compétences en pool indice + attribut, VD imprimées, Atouts fixes et au choix, sorts pour les Éveillés, esprits mentors, métavariantes (Anarchistes).</li>
          <li><strong>Contacts</strong> — Contacts avec Influence et Loyauté, métatype, lieux, traits, champ Notes et groupes.</li>
          <li><strong>Matrice</strong> — Serveurs à pool de défense (4–12 dés, +2 en sécurité physique), 9 types de GLACE à jets de dés (cybercombat Hacking + LOG vs LOG + Firewall, dégâts (LOG/2)E), tracker d'intrusion, spider lié.</li>
          <li><strong>Run</strong> — Ébauche de scénario : factions, lieux, complications.</li>
        </ul>
        <p>Les PNJ Anarchy 1re incluent les <strong>variantes métatype</strong>, la <strong>Chance</strong> (seconde chance sur les échecs), les <strong>esprits</strong> (6 types × 3 puissances) et les créatures du bestiaire (combat narratif, sans initiative chiffrée).</p>`,
    },
  },

  /** Registre des modules d'édition */
  _modules: {
    sr5: () => EditionSR5,
    sr6: () => EditionSR6,
    anarchy2: () => EditionAnarchy2,
    anarchy1: () => EditionAnarchy1,
  },

  getEditionModule(ed) {
    return this._modules[ed] ? this._modules[ed]() : null;
  },

  /* ---- Chargement conditionnel des assets d'édition (CH-P1b/P2) ----
     L'écran de choix n'a besoin d'aucun module d'édition ni du gros catalogue
     de créatures : on les charge à la sélection, avant selectEdition (qui
     appelle buildForms → Creatures). Retire ~280 Ko d'éditions + 238 Ko de
     créatures + 3 thèmes inutiles du chargement initial. */
  _loadedAssets: new Set(),
  _EDITION_CSS: {
    sr5: "css/theme-sr5.css?v=1024",
    sr6: "css/theme-sr6.css?v=1024",
    anarchy2: "css/theme-anarchy.css?v=1024",
    anarchy1: "css/theme-anarchy1.css?v=1024",
  },
  _EDITION_JS: {
    sr5: ["js/editions/sr5.js?v=1024", "js/editions/sr5.foundry.js?v=1024", "js/editions/sr5.print.js?v=1024"],
    sr6: ["js/editions/sr6.js?v=1024", "js/editions/sr6.foundry.js?v=1024", "js/editions/sr6.print.js?v=1024"],
    anarchy2: [
      "js/editions/anarchy2.js?v=1024",
      "js/editions/anarchy2.creation.js?v=1024",
      "js/editions/anarchy2.foundry.js?v=1024",
      "js/editions/anarchy2.print.js?v=1024",
    ],
    anarchy1: ["js/editions/anarchy1.js?v=1024", "js/editions/anarchy1.print.js?v=1024"],
  },
  // Commun à toutes les éditions (catalogue de créatures, lu dès buildForms).
  _COMMON_JS: ["js/catalogs/creatures.js?v=1024"],
  _loadCss(href) {
    if (!href || this._loadedAssets.has(href)) return;
    this._loadedAssets.add(href);
    const l = document.createElement("link");
    l.rel = "stylesheet";
    l.href = href;
    document.head.appendChild(l);
  },
  _loadScript(src) {
    return new Promise((resolve, reject) => {
      if (this._loadedAssets.has(src)) return resolve();
      const s = document.createElement("script");
      s.src = src;
      s.onload = () => {
        this._loadedAssets.add(src);
        resolve();
      };
      s.onerror = () => reject(new Error("Échec de chargement : " + src));
      document.head.appendChild(s);
    });
  },
  /** Charge (une seule fois) le thème + les scripts de l'édition. Séquentiel :
      le fichier principal avant ses compagnons .foundry/.creation, qui font des
      Object.assign sur le module et exigent qu'il existe déjà. */
  async _loadEditionAssets(ed) {
    this._loadCss(this._EDITION_CSS[ed]);
    for (const src of [...this._COMMON_JS, ...(this._EDITION_JS[ed] || [])]) {
      await this._loadScript(src);
    }
  },

  /* ---- Sélection d'édition ---- */
  async selectEdition(ed) {
    await this._loadEditionAssets(ed);
    this.edition = ed;
    this.editionModule = this.getEditionModule(ed);

    Storage.init(ed);
    document.documentElement.setAttribute("data-edition", ed);
    document.getElementById("edition-screen").classList.add("hidden");
    document.getElementById("app").classList.add("visible");

    const badgeLabels = { sr5: "SR5", sr6: "SR6", anarchy2: "ANARCHY 2E", anarchy1: "ANARCHY 1RE" };
    document.getElementById("edition-badge").textContent =
      badgeLabels[ed] || ed;
    this._renderHelpLegend();

    Shadows.load();
    Characters.load();
    ContactsBook.load();
    Servers.initPanel(); // charge + migre + câble la délégation serveur (#app)
    DossierBar.init(); // Dossiers chargés/synchronisés + destination courante
    Encounter.load();
    DiceRoller.loadThreat();
    Gen.buildForms();
    Settings.render();

    // Récupère une éventuelle sauvegarde en ligne plus récente (silencieux,
    // non bloquant). Paquet multi-éditions : appelé une fois suffit, mais
    // ré-appeler à chaque changement d'édition est sans effet si rien n'a bougé.
    Sync.pullOnLoad();

    // Lire le panel depuis l'URL si disponible, sinon le hub
    const hashPanel = this._panelFromHash();
    this.showPanel(hashPanel || "shadows", { updateHash: !hashPanel });

    // Première présentation de la barre du haut (CH-V6-T1.7, N1) : une
    // seule fois, jamais répétée (Onboarding.dismiss pose le flag global).
    // Premier lancement (V9/G2) : orientation guidée qui mène au générateur ;
    // « Passer » définitif via tour_seen. Sinon, le coachmark topbar habituel.
    if (Storage.getGlobal("tour_seen", false)) {
      Onboarding.maybeShow();
    } else {
      Tour.start("orientation", {
        onEnd: () => {
          Storage.setGlobal("tour_seen", true);
          Storage.setGlobal("tour_seen_version", App.VERSION); // base « Quoi de neuf »
          Tour.refreshBadge();
        },
      });
    }
    Tour.refreshBadge(); // badge « Quoi de neuf » (+ migration douce de la base)
  },

  /* ---- D1 : sheet mobile « Plus » (Contacts/Serveurs/Run/Paramètres) ---- */
  openMore() {
    const overlay = document.getElementById("more-sheet-overlay");
    if (!overlay) return;
    overlay.classList.add("open");
    requestAnimationFrame(() =>
      requestAnimationFrame(() => overlay.classList.add("show")),
    );
  },
  closeMore() {
    const overlay = document.getElementById("more-sheet-overlay");
    if (!overlay || !overlay.classList.contains("open")) return;
    overlay.classList.remove("show");
    setTimeout(() => overlay.classList.remove("open"), 220);
  },

  /* ---- Navigation entre panels ---- */
  showPanel(name, { updateHash = true } = {}) {
    // L'accueil a été retiré : compat des anciens hash.
    if (name === "welcome") name = "shadows";

    document
      .querySelectorAll(".panel")
      .forEach((p) => p.classList.remove("active"));
    document
      .querySelectorAll(".nav-btn, .bnav-btn")
      .forEach((b) => b.classList.remove("active"));
    this.closeMore();

    const panel = document.getElementById(`panel-${name}`);
    if (panel) panel.classList.add("active");
    document
      .querySelectorAll(
        `.nav-btn[data-panel="${name}"], .bnav-btn[data-panel="${name}"]`,
      )
      .forEach((b) => b.classList.add("active"));

    // Sur mobile, chaque panel repart du haut (un seul contexte de scroll)
    const content = document.getElementById("content");
    if (content) content.scrollTop = 0;

    // Mise à jour du hash URL
    if (updateHash && this.edition !== "none") {
      history.replaceState(null, "", `#${this.edition}/${name}`);
    }

    switch (name) {
      case "shadows":
        Hub.initPanel();
        break;
      case "characters":
        Characters.initPanel();
        break;
      case "generator":
        DossierBar.mount("gen-dossier-list");
        DossierBar.render();
        break;
      case "contacts":
        ContactsBook.initGenPanel();
        break;
      case "matrix":
        Servers.initGenPanel();
        break;
      case "run":
        DossierBar.mount("run-dossier-list");
        RunGen.initPanel();
        DossierBar.render();
        break;
      case "settings":
        Settings.render();
        break;
    }
  },

  /* ---- Lit le panel depuis le hash courant ---- */
  _panelFromHash() {
    const hash = window.location.hash.slice(1); // retire le #
    const panels = [
      "welcome",
      "shadows",
      "characters",
      "generator",
      "contacts",
      "matrix",
      "run",
      "settings",
    ];
    const parts = hash.split("/");
    if (parts.length === 2 && parts[1] && panels.includes(parts[1]))
      return parts[1];
    return null;
  },

  /* ---- Lit l'édition depuis le hash courant ---- */
  _editionFromHash() {
    const hash = window.location.hash.slice(1);
    const parts = hash.split("/");
    const editions = ["sr5", "sr6", "anarchy2", "anarchy1"];
    if (parts.length >= 1 && editions.includes(parts[0])) return parts[0];
    return null;
  },

  /* ---- Retour au hub (tap sur le logo, surtout mobile) ---- */
  goHome() {
    if (this.edition !== "none") this.showPanel("shadows");
  },

  /* ---- Aide raccourcis clavier ---- */
  toggleCheatsheet(force) {
    const el = document.getElementById("shortcuts-overlay");
    if (!el) return;
    const show = force !== undefined ? force : !el.classList.contains("open");
    el.classList.toggle("open", show);
  },

  /** Légende des symboles de l'Aide (?), sensible à l'édition (CH-V6-T1.4,
      FIELD_STUDY REC-6) : la légende était figée « (SR5) » quelle que soit
      l'édition active — trompeur, pas juste démodé (« PA » change de sens
      entre SR5 et SR6, cf. js/editions/sr6.js). Lit editionModule.helpLegend
      (données déclarées dans js/editions/*), aucune branche d'édition ici. */
  _renderHelpLegend() {
    const label = document.getElementById("help-legend-label");
    const list = document.getElementById("help-legend-list");
    if (!label || !list) return;
    const entries = (this.editionModule && this.editionModule.helpLegend) || [];
    label.textContent = `Légende des symboles${this.editionModule ? " — " + this.editionModule.label : ""}`;
    const row = (e) => `<div class="shortcut-row"><span class="shortcut-keys">${e.keys}</span><span>${e.html}</span></div>`;
    // K9 : section commune trans-édition des glyphes du cockpit de combat, à la
    // suite de la légende d'édition. Possédée par le cockpit (EncounterRenderer,
    // couche 4 — appel descendant direct), pas dupliquée dans les 4 helpLegend.
    const cockpit = EncounterRenderer.cockpitLegend();
    list.innerHTML =
      entries.map(row).join("") +
      (cockpit.length ? `<div class="shortcut-subhead">Cockpit de combat</div>` + cockpit.map(row).join("") : "");
  },

  /* ---- Changer d'édition ---- */
  changeEdition() {
    // Rassure au moment précis du changement (FIELD_STUDY REC-3) : le
    // cloisonnement des données par édition (storage.js) surprend sans
    // annonce — deux paniques et une perte de données réelles dans l'étude
    // terrain venaient de là, pas d'un bug.
    const badgeLabels = { sr5: "SR5", sr6: "SR6", anarchy2: "Anarchy 2", anarchy1: "Anarchy 1" };
    const label = badgeLabels[this.edition] || this.edition;
    toast(`Chaque édition a sa propre bibliothèque — vos fiches ${label} vous attendent séparément.`, "info");

    Encounter.close();

    // Reset UI
    document.getElementById("app").classList.remove("visible");
    document.getElementById("edition-screen").classList.remove("hidden");
    document.documentElement.setAttribute("data-edition", "none");

    // Reset état
    this.edition = "none";
    this.editionModule = null;

    document.getElementById("gen-zone-single").innerHTML = "";
    Gen.pool = [];
  },
};

/* ---- P2 : registre d'actions clavier — 1 touche = 1 data-action déjà
   nommé, aucune logique métier dupliquée ici. ---- */
const SHORTCUT_PANELS = {
  1: "shadows",
  2: "characters",
  3: "generator",
  4: "contacts",
  5: "matrix",
  6: "run",
  7: "settings",
};

/* ============================================================
   INIT au chargement du DOM
   ============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  Storage.runMigrations();
  Sync.init(); // branche l'écoute des écritures (push auto si activé)
  // CH-A6 : Utils (couche 1) ne référence jamais App directement — c'est App
  // qui lui injecte le résolveur, une seule fois au démarrage.
  Utils.init({ resolveEditionModule: (ed) => App.getEditionModule(ed) });
  // Persiste + re-rend une fiche modifiée par un jet (dés, Drain…). Partagé
  // par DiceRoller et MagicAction pour ne pas diverger.
  const onPnjChanged = (pnj) => {
    if (Shadows.data.all.some((p) => p.id === pnj.id)) Shadows.save();
    if (Servers.ownsPnj(pnj.id)) Servers.save();
    CardRenderer.refresh(pnj);
    // Vague D : un jet/Drain qui remplit un moniteur peut mettre un combattant
    // hors de combat ou déclencher son moral — rafraîchir le tracker s'il y est.
    if (typeof Encounter !== "undefined") Encounter.notifyPnjChanged(pnj);
  };
  DiceRoller.init({
    resolve: (id) => PnjLookup.find(id),
    getPrefs: () => Settings.getDicePrefs(),
    onPnjChanged,
    isRefOpen: (pnj) => CardRenderer._refIsOpen(pnj),
    isAnarchy: () => !!(App.editionModule && App.editionModule.usesRiskPanel),
    // J3 (journal des jets) : round de la scène en cours, pour grouper le
    // journal par tour — seule App (couche 6) connaît Encounter (couche 5).
    currentTurn: () => (typeof Encounter !== "undefined" ? Encounter.currentTurn() : null),
  });
  MagicAction.init({ onPnjChanged });
  ContentModal.bindDelegation();
  ContactRenderer.bindDelegation();
  CardRenderer.bindDelegation();
  CardMenu.bindDelegation();
  ContactCreate.bindDelegation();
  SelectionMode.bindDelegation();
  ReorderMode.bindDelegation();
  SidebarToggle.bindDelegation();
  CharGen.bindDelegation();
  Portrait.bindDelegation();
  Tour.init({ navigate: (p) => App.showPanel(p), version: App.VERSION });
  Mentions.wireAuto();

  document.addEventListener("click", (e) => {
    const actionEl = e.target.closest("[data-action]");
    if (!actionEl) return;
    switch (actionEl.dataset.action) {
      case "select-edition":
        App.selectEdition(actionEl.dataset.ed);
        break;
      case "go-home":
        App.goHome();
        break;
      case "change-edition":
        App.changeEdition();
        break;
      case "show-panel":
        App.showPanel(actionEl.dataset.panel);
        break;
      case "backup-export":
        Backup.export();
        break;
      case "print-sheets":
        PrintSheet.print();
        break;
      case "foundry-dossier":
        FoundryExport.exportDossier();
        break;
      case "backup-import":
        Backup.openImportDialog();
        break;
      case "contact-generate":
        ContactsBook.generate();
        break;
      case "encounter-open":
        Encounter.open();
        break;
      case "chargen-open":
        CharGen.open();
        break;
      case "pj-quick-add":
        Characters.promptAddLight();
        break;
      case "set-active-team":
        Characters.toggleActiveTeam();
        break;
      case "chargen-close":
        CharGen.close();
        break;
      case "sidebar-next-turn":
        Encounter.nextTurn();
        break;
      case "toggle-shortcuts":
        App.toggleCheatsheet();
        break;
      case "open-palette":
        Palette.open();
        break;
      case "open-more":
        App.openMore();
        break;
      case "shortcuts-close":
        App.toggleCheatsheet(false);
        break;
      case "tour-full":
        App.toggleCheatsheet(false);
        Tour.start("full");
        break;
      case "tour-whatsnew":
        App.toggleCheatsheet(false);
        Tour.openWhatsNew();
        break;
      case "mention-open":
        Palette.reveal(actionEl.dataset.id);
        break;
      case "tag-open":
        Palette.openTag(actionEl.dataset.tag);
        break;
    }
  });

  document.getElementById("edit-modal").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) EditModal.close();
  });

  document.getElementById("encounter-overlay").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) Encounter.close();
  });

  document.getElementById("chargen-overlay").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) CharGen.close();
  });

  document.getElementById("shortcuts-overlay").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) App.toggleCheatsheet(false);
  });

  document.getElementById("more-sheet-overlay").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) App.closeMore();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      EditModal.close();
      Encounter.close();
      CharGen.close();
      Palette.close();
      App.toggleCheatsheet(false);
      App.closeMore();
      return;
    }

    // Palette de commandes (CH-Q7) : Ctrl/Cmd+K, capté AVANT les garde-fous
    // (doit fonctionner même depuis un champ de saisie).
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      if (App.edition !== "none") Palette.toggle();
      return;
    }

    // Garde-fou : jamais de raccourci pendant une saisie, ni avec un
    // modificateur (Ctrl/Cmd/Alt), ni avant d'avoir choisi une édition.
    const tag = (e.target.tagName || "").toLowerCase();
    if (tag === "input" || tag === "textarea" || tag === "select") return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (App.edition === "none") return;

    if (SHORTCUT_PANELS[e.key]) {
      App.showPanel(SHORTCUT_PANELS[e.key]);
      return;
    }
    switch (e.key.toLowerCase()) {
      case "g":
        Gen.generateActive();
        break;
      case "r":
        document.getElementById("dice-roll-btn")?.click();
        break;
      case "c":
        Encounter.open();
        break;
      case "j":
        DiceLog.toggle();
        break;
      case "/":
        e.preventDefault();
        document
          .querySelector(
            '.panel.active input[data-action="filter"], .panel.active input[data-hub-filter]',
          )
          ?.focus();
        break;
      case "?":
        App.toggleCheatsheet();
        break;
    }
  });

  // Restauration depuis le hash URL (F5 / partage de lien)
  const edFromHash = App._editionFromHash();
  if (edFromHash) {
    App.selectEdition(edFromHash);
  }
});
