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

  /* ---- Rendu du panel paramètres ---- */
  render() {
    const zone = document.getElementById("settings-panel-content");
    const ed = App.edition;

    let html = "";

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
