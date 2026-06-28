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
        <p>Bienvenue sur le gestionnaire de PNJ pour <strong>Shadowrun 5e édition</strong>.</p>
        <ul>
          <li><strong>Ombres portées</strong> — Votre casting de figurants, organisés par groupes.</li>
          <li><strong>Générateur PNJ</strong> — PNJ à la volée : attributs, Limites, compétences, équipement.</li>
          <li><strong>Contacts</strong> — Contacts avec Loyauté et Connexion.</li>
          <li><strong>Run</strong> — Ébauche de scénario en un clic.</li>
        </ul>
        <p>Les PNJ SR5 incluent les <strong>huit attributs</strong>, les <strong>Limites</strong>
        (Physique, Mental, Social), l'Essence, et des moniteurs séparés
        (dégâts physiques et étourdissement).</p>
        <p>Les PNJ magiques (Mage hermétique, Chaman, Adepte) disposent de l'attribut
        <strong>MAG</strong>, de sorts ou de pouvoirs d'adepte, et d'une
        résistance au Drain calculée.</p>`,
    },
    sr6: {
      title: "Shadowrun 6e édition",
      body: `
        <h2>Shadow Herds — Shadowrun 6e</h2>
        <p>Bienvenue sur le gestionnaire de PNJ pour <strong>Shadowrun 6e édition</strong>.</p>
        <ul>
          <li><strong>Ombres portées</strong> — Votre casting de figurants, organisés par groupes.</li>
          <li><strong>Générateur PNJ</strong> — PNJ avec Défenses d'Attribut, compétences fusionnées.</li>
          <li><strong>Contacts</strong> — Contacts avec Loyauté et Connexion.</li>
          <li><strong>Run</strong> — Ébauche de scénario en un clic.</li>
        </ul>
        <p>Les PNJ SR6 utilisent les <strong>Défenses d'Attribut</strong> en lieu et place
        des Limites, et un <strong>moniteur de condition unique</strong> par défaut
        (configurable en séparé dans les Paramètres).</p>
        <p>Le <strong>Professionnalisme (0–6)</strong> guide la puissance globale et
        détermine l'équipement disponible.</p>`,
    },
    anarchy: {
      title: "Shadowrun Anarchy 2e édition",
      body: `
        <h2>Shadow Herds — Anarchy 2e</h2>
        <p>Bienvenue sur le gestionnaire de PNJ pour <strong>Shadowrun Anarchy 2e édition</strong>.</p>
        <ul>
          <li><strong>Ombres portées</strong> — Votre casting de figurants, organisés par groupes.</li>
          <li><strong>Générateur PNJ</strong> — PNJ avec Rang, Clichés et Narcos.</li>
          <li><strong>Contacts</strong> — Contacts avec Loyauté et Connexion.</li>
          <li><strong>Run</strong> — Ébauche de scénario en un clic.</li>
        </ul>
        <p>Les PNJ Anarchy ont un <strong>Rang</strong> (Figurant / Lieutenant / Boss),
        des <strong>Clichés</strong> en lieu des compétences, un <strong>moniteur unique</strong>
        et des <strong>Narcos</strong> (points de narration) attribués selon le rang.</p>
        <p style="color:var(--accent2);font-size:0.82rem;">
          ⚠ Certaines fonctionnalités Anarchy sont en cours de développement.
        </p>`,
    },
  },

  /** Registre des modules d'édition */
  _modules: {
    sr5: () => EditionSR5,
    sr6: () => EditionSR6,
    anarchy: () => EditionAnarchy,
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

    const badgeLabels = { sr5: "SR5", sr6: "SR6", anarchy: "ANARCHY 2E" };
    document.getElementById("edition-badge").textContent =
      badgeLabels[ed] || ed;

    Shadows.load();
    Gen.buildForms();
    Settings.render();

    // Lire le panel depuis l'URL si disponible, sinon welcome
    const hashPanel = this._panelFromHash();
    this.showPanel(hashPanel || "welcome", { updateHash: !hashPanel });
  },

  /* ---- Navigation entre panels ---- */
  showPanel(name, { updateHash = true } = {}) {
    document
      .querySelectorAll(".panel")
      .forEach((p) => p.classList.remove("active"));
    document
      .querySelectorAll(".nav-btn")
      .forEach((b) => b.classList.remove("active"));

    const panel = document.getElementById(`panel-${name}`);
    if (panel) panel.classList.add("active");
    const navBtn = document.querySelector(`.nav-btn[data-panel="${name}"]`);
    if (navBtn) navBtn.classList.add("active");

    // Mise à jour du hash URL
    if (updateHash && this.edition !== "none") {
      history.replaceState(null, "", `#${this.edition}/${name}`);
    }

    switch (name) {
      case "welcome":
        this._renderWelcome();
        break;
      case "shadows":
        Shadows.render();
        break;
      case "contacts":
        Contacts.initPanel();
        break;
      case "run":
        RunGen.initPanel();
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
      "generator",
      "contacts",
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
    const editions = ["sr5", "sr6", "anarchy"];
    if (parts.length >= 1 && editions.includes(parts[0])) return parts[0];
    return null;
  },

  _renderWelcome() {
    const w = this.welcomeContent[this.edition];
    if (!w) return;
    document.getElementById("welcome-title").textContent = w.title;
    document.getElementById("welcome-body").innerHTML =
      w.body +
      `
      <div class="legal-notice">
        La Topps Company, Inc. détient les droits exclusifs sur Shadowrun.
        Black Book Editions détient les droits de la version française.
        Cet outil est non-commercial, sous licence CC BY-NC 4.0.
        Les données sont stockées localement dans votre navigateur (localStorage),
        jamais transmises.
      </div>`;
  },

  /* ---- Changer d'édition ---- */
  changeEdition() {
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

/* ============================================================
   INIT au chargement du DOM
   ============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  Dice.init();

  document.getElementById("edit-modal").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) EditModal.close();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") EditModal.close();
  });

  // Restauration depuis le hash URL (F5 / partage de lien)
  const edFromHash = App._editionFromHash();
  if (edFromHash) {
    App.selectEdition(edFromHash);
  }
});
