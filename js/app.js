"use strict";

/* ============================================================
   APP — Bootstrap, routing, sélecteur d'édition
   ============================================================ */
const App = {
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
        <p><strong>Édition en cours d'intégration (WIP).</strong> Le squelette
        Anarchy 1re est câblé : sélection, génération, jets, Matrice et carte
        fonctionnent, mais les <strong>données affichées sont encore celles de
        l'Anarchy 2e</strong> (placeholder) en attendant la saisie des valeurs
        officielles de la 1re édition — livre de base
        (<em>sran_01</em>) et Anarchistes (<em>sran_03</em>).</p>`,
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

  /* ---- Sélection d'édition ---- */
  selectEdition(ed) {
    this.edition = ed;
    this.editionModule = this.getEditionModule(ed);

    Storage.init(ed);
    document.documentElement.setAttribute("data-edition", ed);
    document.getElementById("edition-screen").classList.add("hidden");
    document.getElementById("app").classList.add("visible");

    const badgeLabels = { sr5: "SR5", sr6: "SR6", anarchy2: "ANARCHY 2E", anarchy1: "ANARCHY 1RE" };
    document.getElementById("edition-badge").textContent =
      badgeLabels[ed] || ed;

    Shadows.load();
    Characters.load();
    ContactsBook.load();
    Servers.initPanel(); // charge + migre + câble la délégation serveur (#app)
    DossierBar.init(); // Dossiers chargés/synchronisés + destination courante
    Encounter.load();
    DiceRoller.loadThreat();
    Gen.buildForms();
    Settings.render();

    // Lire le panel depuis l'URL si disponible, sinon le hub
    const hashPanel = this._panelFromHash();
    this.showPanel(hashPanel || "shadows", { updateHash: !hashPanel });
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
        Characters.render();
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

  /* ---- Changer d'édition ---- */
  changeEdition() {
    Encounter.close();

    // Reset UI
    document.getElementById("app").classList.remove("visible");
    document.getElementById("edition-screen").classList.remove("hidden");
    document.documentElement.setAttribute("data-edition", "none");

    // Reset état
    this.edition = "none";
    this.editionModule = null;

    document.getElementById("gen-zone-single").innerHTML = "";
    document.getElementById("gen-zone-group").innerHTML = "";
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
  Storage.migrateAnarchyId();
  DiceRoller.init({
    resolve: (id) => PnjLookup.find(id),
    getPrefs: () => Settings.getDicePrefs(),
    onPnjChanged: (pnj) => {
      if (Shadows.data.all.some((p) => p.id === pnj.id)) Shadows.save();
      if (Servers.ownsPnj(pnj.id)) Servers.save();
      CardRenderer.refresh(pnj);
    },
    isRefOpen: (pnj) => CardRenderer._refIsOpen(pnj),
    isAnarchy: () => !!(App.editionModule && App.editionModule.usesRiskPanel),
  });
  ContentModal.bindDelegation();
  ContactRenderer.bindDelegation();
  CardRenderer.bindDelegation();
  SidebarToggle.bindDelegation();
  CharGen.bindDelegation();
  Portrait.bindDelegation();

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
      case "chargen-close":
        CharGen.close();
        break;
      case "sidebar-next-turn":
        Encounter.nextTurn();
        break;
      case "toggle-shortcuts":
        App.toggleCheatsheet();
        break;
      case "shortcuts-close":
        App.toggleCheatsheet(false);
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

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      EditModal.close();
      Encounter.close();
      CharGen.close();
      App.toggleCheatsheet(false);
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
