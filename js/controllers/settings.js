"use strict";

/* ============================================================
   SETTINGS — paramètres par édition, stockés via Storage
   ============================================================ */
const Settings = {
  get(key, fallback = null) {
    return Storage.get(`settings_${key}`, fallback);
  },

  set(key, value) {
    Storage.set(`settings_${key}`, value);
  },

  /* ---- Préférences du lanceur de dés (GLOBALES, hors édition) ---- */
  _DICE_KEY: "dicePrefs",
  _diceDefaults: {
    quickRoll: false,
    defaultCount: 6,
  },
  getDicePrefs() {
    return { ...this._diceDefaults, ...Storage.getGlobal(this._DICE_KEY, {}) };
  },
  setDicePrefs(patch) {
    const next = { ...this.getDicePrefs(), ...patch };
    Storage.setGlobal(this._DICE_KEY, next);
    // Propager aux lanceurs (topbar + bottom sheet mobile)
    if (DiceRoller.applyPrefs) DiceRoller.applyPrefs();
    if (DicePanel.applyPrefs) DicePanel.applyPrefs();
    return next;
  },
  setDiceQuickRoll(on) {
    this.setDicePrefs({ quickRoll: !!on });
    toast(on ? "Lancer rapide activé." : "Lancer rapide désactivé.");
  },
  setDiceDefaultCount(v) {
    const n = Utils.clamp(parseInt(v, 10) || 6, 1, 40);
    this.setDicePrefs({ defaultCount: n });
    toast(`Réserve par défaut : ${n} dés.`);
  },

  /* ---- Préférences d'affichage des cartes (GLOBALES, hors édition) ---- */
  _CARD_KEY: "cardDisplay",
  _cardDefaults: {
    layout: "expanded",
    showAttributes: true,
    showGmPools: true,
    showEquipment: true,
  },
  getCardDisplay() {
    return { ...this._cardDefaults, ...Storage.getGlobal(this._CARD_KEY, {}) };
  },
  setCardDisplay(patch) {
    const next = { ...this.getCardDisplay(), ...patch };
    Storage.setGlobal(this._CARD_KEY, next);
    return next;
  },
  /** Bascule un booléen d'affichage et rafraîchit les cartes visibles. */
  toggleCardDisplay(key, value) {
    const patch = {};
    patch[key] = value;
    this.setCardDisplay(patch);
    this._refreshVisibleCards();
  },
  setCardLayout(layout) {
    this.setCardDisplay({ layout });
    this._refreshVisibleCards();
  },
  /** Re-rend les cartes actuellement affichées (Ombres/contacts) pour
      refléter le changement de préférence. */
  _refreshVisibleCards() {
    if (Shadows.render) Shadows.render();
    if (ContactsBook.render) ContactsBook.render();
  },
  _radioCD(key, val, label, checked) {
    return `<label class="radio-option">
      <input type="radio" name="cd_${key}" value="${val}" ${checked ? "checked" : ""}
        data-action="set-card-layout">
      <span>${label}</span>
    </label>`;
  },
  _checkCD(key, label, checked) {
    return `<div class="display-pref-row">
      <label for="cd_${key}">${label}</label>
      <input type="checkbox" id="cd_${key}" ${checked ? "checked" : ""}
        data-action="toggle-card-display" data-key="${key}">
    </div>`;
  },

  /* ---- Portraits IA (GLOBAL, hors édition) — opt-in, désactivé par
     défaut. Aucune clé Pollinations committée : endpoint anonyme par
     défaut (le repo est public, on n'expose aucun secret) ; un token
     personnel Pollinations (auth.pollinations.ai) est optionnel, saisi
     et stocké localement par chacun pour lever la limite anonyme. */
  _PORTRAIT_KEY: "portraitGen",
  _portraitDefaults: { enabled: false, token: "" },
  getPortraitSettings() {
    return { ...this._portraitDefaults, ...Storage.getGlobal(this._PORTRAIT_KEY, {}) };
  },
  setPortraitEnabled(on) {
    Storage.setGlobal(this._PORTRAIT_KEY, { ...this.getPortraitSettings(), enabled: !!on });
    this._refreshVisibleCards();
    toast(on ? "Portraits IA activés." : "Portraits IA désactivés.");
  },
  setPortraitToken(token) {
    Storage.setGlobal(this._PORTRAIT_KEY, { ...this.getPortraitSettings(), token: token.trim() });
    toast(token.trim() ? "Token Pollinations enregistré." : "Token Pollinations retiré.");
  },

  /* ---- Rendu du panel paramètres ---- */
  render() {
    const zone = document.getElementById("settings-panel-content");
    const ed = App.edition;

    let html = "";

    // --- Lanceur de dés (global) ---
    {
      const dp = this.getDicePrefs();
      html += `<div class="settings-section">
        <h3>Lanceur de dés</h3>
        <p>Le lancer rapide affiche le résultat en bandeau discret, sans l'animation plein écran. Tous les jets restent consultables dans le journal des jets.</p>
        <div class="display-prefs">
          <div class="display-pref-row">
            <label for="dp_quickRoll">Lancer rapide (sans animation)</label>
            <input type="checkbox" id="dp_quickRoll" ${dp.quickRoll ? "checked" : ""}
              data-action="set-dice-quick-roll">
          </div>
          <div class="display-pref-row">
            <label for="dp_defaultCount">Réserve par défaut du lanceur</label>
            <input type="number" id="dp_defaultCount" min="1" max="40" value="${dp.defaultCount}"
              class="settings-number-input"
              data-action="set-dice-default-count">
          </div>
        </div>
      </div>`;
    }

    // --- Affichage des cartes (global) ---
    {
      const cd = this.getCardDisplay();
      html += `<div class="settings-section">
        <h3>Affichage des cartes</h3>
        <p>Disposition par défaut des cartes de PNJ. La zone Combat est toujours en avant ; la Référence (attributs, réserves MJ, équipement) peut être dépliée ou repliée par défaut, et reste ajustable carte par carte.</p>
        <div class="radio-group">
          ${this._radioCD("layout", "expanded", "Tout afficher (référence dépliée)", cd.layout === "expanded")}
          ${this._radioCD("layout", "compact", "Compact (référence repliée)", cd.layout === "compact")}
        </div>
        <div class="display-prefs">
          ${this._checkCD("showAttributes", "Afficher les attributs", cd.showAttributes)}
          ${this._checkCD("showGmPools", "Afficher les réserves MJ", cd.showGmPools)}
          ${this._checkCD("showEquipment", "Afficher l'équipement", cd.showEquipment)}
        </div>
      </div>`;
    }

    // --- Portraits IA (global) ---
    {
      const pg = this.getPortraitSettings();
      html += `<div class="settings-section">
        <h3>Portraits IA</h3>
        <p>Génère un portrait via Pollinations (gratuit, sans clé) au clic sur une carte PNJ, esprit, créature ou contact. Nécessite une connexion internet ; le prompt part vers un service tiers.</p>
        <div class="display-prefs">
          <div class="display-pref-row">
            <label for="pg_enabled">Activer le bouton « Portrait IA » sur les cartes</label>
            <input type="checkbox" id="pg_enabled" ${pg.enabled ? "checked" : ""}
              data-action="toggle-portrait-gen">
          </div>
        </div>
        <div class="form-group" style="margin-top:0.8rem;">
          <label for="pg_token">Token personnel Pollinations (optionnel)</label>
          <input type="password" id="pg_token" value="${CardRenderer._esc(pg.token)}"
            placeholder="Laisser vide pour rester en anonyme"
            data-action="set-portrait-token">
          <p style="font-size:0.72rem;margin-top:0.3rem;">
            Lève la limite d'1 requête à la fois de l'API anonyme. À obtenir sur
            <a href="https://auth.pollinations.ai" target="_blank" style="color:var(--accent)">auth.pollinations.ai</a>.
            Stocké uniquement dans ce navigateur, jamais envoyé ailleurs qu'à Pollinations —
            mais reste visible dans les outils de développement du navigateur : à réserver
            à un usage personnel, ne le partagez pas dans une copie publique de cet outil.
          </p>
        </div>
      </div>`;
    }

    // --- Moniteurs (SR5 uniquement) ---
    if (ed === "sr5") {
      const woundMod = this.get("woundMod", 3);
      html += `<div class="settings-section">
        <h3>Malus de blessure</h3>
        <p>Les PNJ subissent normalement −1D par tranche de cases sur leur moniteur. Choisissez la fréquence.</p>
        <div class="radio-group">
          ${this._radio("woundMod", "3", "−1D pour 3 cases (standard)", woundMod == 3)}
          ${this._radio("woundMod", "2", "−1D pour 2 cases", woundMod == 2)}
          ${this._radio("woundMod", "1", "−1D par case", woundMod == 1)}
          ${this._radio("woundMod", "0", "Pas de malus de blessure", woundMod == 0)}
        </div>
      </div>`;
    }

    // --- Moniteurs séparés (SR6) ---
    if (ed === "sr6") {
      const sep = this.get("separateMonitors", false);
      html += `<div class="settings-section">
        <h3>Moniteur de condition</h3>
        <p>Par défaut, les PNJ SR6 ont un moniteur unique. Vous pouvez activer les moniteurs séparés (physique + étourdissement).</p>
        <div class="radio-group">
          ${this._radio("separateMonitors", "false", "Moniteur unique (standard SR6)", !sep)}
          ${this._radio("separateMonitors", "true", "Moniteurs séparés (Physique + Étourd.)", sep)}
        </div>
        <p style="font-size:0.75rem;margin-top:0.6rem;">Ce réglage s'applique aux PNJ générés après ce point.</p>
      </div>`;
    }

    // --- Atomiser ---
    html += `<div class="settings-section">
      <h3>Remise à zéro</h3>
      <p>Efface tous les PNJ sauvegardés et paramètres pour cette édition. Action irréversible.</p>
      <button class="danger-btn" data-action="atomize">⚠ Atomiser</button>
    </div>`;

    // --- Présentation de l'édition (rapatriée de l'ancien écran d'accueil) ---
    const intro = App.welcomeContent[App.edition];
    if (intro) {
      html += `<div class="settings-section">
        <h3>${CardRenderer._esc(intro.title)}</h3>
        ${intro.body}
      </div>`;
    }

    // --- À propos ---
    html += `<div class="settings-section">
      <h3>À propos</h3>
      <p>
        <strong>Shadow Herds — Shadowrun PNJ Generator</strong><br>
        Basé sur le GM Mob Master de <strong>Toktic</strong>,
        traduit par <strong>Michel_Platinium</strong>,
        adapté et refondu par <strong>tbzt</strong>.
      </p>
      <p style="font-size:0.75rem;">
        Shadowrun est une marque de The Topps Company, Inc.
        Black Book Editions détient les droits de la version française.
        Cet outil est non-commercial, distribué sous licence
        <a href="https://creativecommons.org/licenses/by-nc/4.0/" target="_blank"
           style="color:var(--accent)">CC BY-NC 4.0</a>.
      </p>
    </div>`;

    zone.innerHTML = html;
    this._bindDelegation(zone);

    // Bind les radios
    zone.querySelectorAll("input[type=radio]").forEach((r) => {
      r.addEventListener("change", () => {
        const k = r.name;
        let v = r.value;
        if (v === "true") v = true;
        if (v === "false") v = false;
        if (!isNaN(+v) && v !== "") v = +v;
        this.set(k, v);
        toast("Paramètre enregistré.");
      });
    });
  },

  /* Délégation globale du panel (branchée une seule fois sur le conteneur
     persistant, qui n'est jamais recréé — seul son contenu est reconstruit
     à chaque render()). */
  _bindDelegation(zone) {
    if (this._delegated) return;
    this._delegated = true;
    zone.addEventListener("change", (e) => {
      const el = e.target.closest("[data-action]");
      if (!el) return;
      if (el.dataset.action === "set-card-layout") this.setCardLayout(el.value);
      else if (el.dataset.action === "toggle-card-display")
        this.toggleCardDisplay(el.dataset.key, el.checked);
      else if (el.dataset.action === "set-dice-quick-roll")
        this.setDiceQuickRoll(el.checked);
      else if (el.dataset.action === "set-dice-default-count")
        this.setDiceDefaultCount(el.value);
      else if (el.dataset.action === "toggle-portrait-gen")
        this.setPortraitEnabled(el.checked);
      else if (el.dataset.action === "set-portrait-token")
        this.setPortraitToken(el.value);
    });
    zone.addEventListener("click", (e) => {
      const el = e.target.closest("[data-action]");
      if (el && el.dataset.action === "atomize") this.atomize();
    });
  },

  _radio(name, value, label, checked) {
    return `<label class="radio-label">
      <input type="radio" name="${name}" value="${value}" ${checked ? "checked" : ""}>
      ${label}
    </label>`;
  },

  async atomize() {
    const ok = await Dialog.confirm({
      title: "Atomiser cette édition",
      message: `Supprimer toutes les données Shadowrun ${App.edition.toUpperCase()} ? Cette action est irréversible.`,
      confirmLabel: "Atomiser",
      danger: true,
    });
    if (!ok) return;
    Storage.clearEdition();
    Shadows.data = { all: [], groups: {} };
    Shadows.currentGroup = "all";
    Gen.pool = [];
    document.getElementById("gen-zone-single").innerHTML = "";
    document.getElementById("gen-zone-group").innerHTML = "";
    Shadows.render();
    toast("Atomisé. Table rase.");
  },
};
