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
    if (typeof DiceRoller !== "undefined" && DiceRoller.applyPrefs)
      DiceRoller.applyPrefs();
    if (typeof DicePanel !== "undefined" && DicePanel.applyPrefs)
      DicePanel.applyPrefs();
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
    if (typeof Shadows !== "undefined" && Shadows.render) Shadows.render();
    if (typeof ContactsBook !== "undefined" && ContactsBook.render)
      ContactsBook.render();
  },
  _radioCD(key, val, label, checked) {
    return `<label class="radio-option">
      <input type="radio" name="cd_${key}" value="${val}" ${checked ? "checked" : ""}
        onchange="Settings.setCardLayout('${val}')">
      <span>${label}</span>
    </label>`;
  },
  _checkCD(key, label, checked) {
    return `<div class="display-pref-row">
      <label for="cd_${key}">${label}</label>
      <input type="checkbox" id="cd_${key}" ${checked ? "checked" : ""}
        onchange="Settings.toggleCardDisplay('${key}', this.checked)">
    </div>`;
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
              onchange="Settings.setDiceQuickRoll(this.checked)">
          </div>
          <div class="display-pref-row">
            <label for="dp_defaultCount">Réserve par défaut du lanceur</label>
            <input type="number" id="dp_defaultCount" min="1" max="40" value="${dp.defaultCount}"
              class="settings-number-input"
              onchange="Settings.setDiceDefaultCount(this.value)">
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
      <button class="danger-btn" onclick="Settings.atomize()">⚠ Atomiser</button>
    </div>`;

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

  _radio(name, value, label, checked) {
    return `<label class="radio-label">
      <input type="radio" name="${name}" value="${value}" ${checked ? "checked" : ""}>
      ${label}
    </label>`;
  },

  atomize() {
    if (
      !confirm(
        `Supprimer toutes les données Shadowrun ${App.edition.toUpperCase()} ?\nCette action est irréversible.`,
      )
    )
      return;
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
