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

  /* ---- Sauvegarde & synchronisation (GLOBAL, hors édition) ----
     L'UI se contente de piloter Sync ; toute la logique (pull/push,
     conflits, providers) vit dans sync.js. Le rappel de sauvegarde (F3)
     et la synchro partagent le même horodatage `lastAt`. */
  _syncSectionHTML() {
    const sc = Sync.cfg();
    const st = Sync.status();
    let h = `<div class="settings-section" id="sync-section">
      <h3>Sauvegarde &amp; synchronisation</h3>
      <p>Vos fiches sont enregistrées dans ce navigateur. Sauvegardez-les, ou synchronisez-les automatiquement entre vos appareils via un stockage qui vous appartient — rien ne transite par un serveur ShadowHerds.</p>
      <div class="sync-reminder" id="sync-reminder">${this._syncReminderHTML(st)}</div>
      <div class="display-prefs" style="margin-top:0.6rem;">
        <button class="btn-primary" data-action="backup-export">Sauvegarder mes fiches</button>
        <button class="btn-secondary" data-action="backup-import">Importer une sauvegarde…</button>
      </div>
      <div class="form-group" style="margin-top:1rem;">
        <label>Synchronisation automatique entre appareils</label>
        <div class="radio-group">
          ${this._radioSync("none", "Aucune (sauvegarde manuelle)", sc.provider === "none")}
          ${this._radioSync("gist", "GitHub Gist secret (tous appareils)", sc.provider === "gist")}
          ${this._radioSync("webdav", "WebDAV / NAS", sc.provider === "webdav")}
        </div>
      </div>`;

    if (sc.provider === "gist") h += this._syncGistFields(sc);
    else if (sc.provider === "webdav") h += this._syncWebdavFields(sc);

    if (sc.provider !== "none") {
      h += `<div class="display-pref-row" style="margin-top:0.6rem;">
          <label for="sync_auto">Synchroniser à chaque modification</label>
          <input type="checkbox" id="sync_auto" ${sc.auto ? "checked" : ""} data-action="toggle-sync-auto">
        </div>
        <div class="display-prefs" style="margin-top:0.6rem;">
          <button class="btn-secondary" data-action="sync-now">Synchroniser maintenant</button>
        </div>
        <p class="sync-state" id="sync-state">${this._syncStateHTML(st)}</p>`;
    }

    return h + `</div>`;
  },
  _radioSync(val, label, checked) {
    return `<label class="radio-option">
      <input type="radio" name="sync_provider" value="${val}" ${checked ? "checked" : ""}
        data-action="set-sync-provider">
      <span>${label}</span>
    </label>`;
  },
  _syncGistFields(sc) {
    return `<div class="form-group sync-fields" style="margin-top:0.6rem;">
      <label for="sync_gist_token">Token GitHub (périmètre « gist »)</label>
      <input type="password" id="sync_gist_token" value="${CardRenderer._esc(sc.gist.token)}"
        placeholder="ghp_… ou github_pat_…"
        data-action="set-sync-field" data-prov="gist" data-field="token">
      <label for="sync_gist_id" style="margin-top:0.5rem;">Identifiant du gist (facultatif)</label>
      <input type="text" id="sync_gist_id" value="${CardRenderer._esc(sc.gist.gistId)}"
        placeholder="vide = créé ou retrouvé automatiquement"
        data-action="set-sync-field" data-prov="gist" data-field="gistId">
      <details class="settings-detail">
        <summary>Comment obtenir un token</summary>
        <p style="font-size:0.72rem;margin-top:0.3rem;">
          Sur <a href="https://github.com/settings/tokens?type=beta" target="_blank" style="color:var(--accent)">github.com/settings/tokens</a>,
          créez un token limité au périmètre <strong>Gist</strong>. Un gist secret est créé
          automatiquement au premier envoi. Collez le même token sur vos autres appareils.
          Stocké uniquement dans ce navigateur, visible dans les outils de développement :
          usage personnel, ne le partagez pas dans une copie publique de l'outil.
        </p>
      </details>
    </div>`;
  },
  _syncWebdavFields(sc) {
    return `<div class="form-group sync-fields" style="margin-top:0.6rem;">
      <label for="sync_webdav_url">URL du fichier de sauvegarde</label>
      <input type="text" id="sync_webdav_url" value="${CardRenderer._esc(sc.webdav.url)}"
        placeholder="https://mon-nas.local/dav/shadowherds.json"
        data-action="set-sync-field" data-prov="webdav" data-field="url">
      <div class="backup-url-row" style="margin-top:0.5rem;">
        <input type="text" placeholder="utilisateur" value="${CardRenderer._esc(sc.webdav.user)}"
          data-action="set-sync-field" data-prov="webdav" data-field="user">
        <input type="password" placeholder="mot de passe" value="${CardRenderer._esc(sc.webdav.pass)}"
          data-action="set-sync-field" data-prov="webdav" data-field="pass">
      </div>
      <p style="font-size:0.72rem;margin-top:0.3rem;">
        Le serveur doit autoriser l'accès distant (CORS) et exposer l'en-tête ETag.
        Préférez des identifiants dédiés, pas le mot de passe principal du NAS.
      </p>
    </div>`;
  },
  _syncReminderHTML(st) {
    if (!st.lastAt) return `<span>Aucune sauvegarde effectuée pour l'instant.</span>`;
    const days = Math.floor((Date.now() - new Date(st.lastAt).getTime()) / 86400000);
    const txt =
      days <= 0 ? "aujourd'hui" : days === 1 ? "hier" : `il y a ${days} jours`;
    return `<span>Dernière sauvegarde : ${txt}.</span>`;
  },
  _syncStateHTML(st) {
    const map = {
      pulling: "Synchronisation en cours…",
      pushing: "Envoi en cours…",
      conflict: "Conflit à résoudre.",
      error: "La dernière synchronisation a échoué.",
    };
    const label = map[st.state] || "";
    return label ? `<em>${label}</em>` : "";
  },
  /** Rafraîchit uniquement les lignes d'état (appelé par Sync après une
      opération) sans reconstruire tout le panneau. */
  renderSyncStatus() {
    const st = Sync.status();
    const rem = document.getElementById("sync-reminder");
    if (rem) rem.innerHTML = this._syncReminderHTML(st);
    const stt = document.getElementById("sync-state");
    if (stt) stt.innerHTML = this._syncStateHTML(st);
  },
  setSyncProvider(v) {
    Sync._saveCfg({ provider: v });
    this.render(); // réaffiche pour montrer/masquer les champs du provider
    if (v !== "none")
      toast("Renseignez le stockage, puis « Synchroniser maintenant ».");
  },
  setSyncField(prov, field, value) {
    const c = Sync.cfg();
    Sync._saveCfg({ [prov]: { ...c[prov], [field]: (value || "").trim() } });
  },
  toggleSyncAuto(on) {
    Sync._saveCfg({ auto: !!on });
    toast(on ? "Synchro automatique activée." : "Synchro automatique désactivée.");
  },
  async syncNow() {
    await Sync.syncNow();
    this.renderSyncStatus();
  },

  /* ---- Rendu du panel paramètres ---- */
  render() {
    const zone = document.getElementById("settings-panel-content");
    let html = `<div class="settings-group-label">Global</div>`;

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
          <details class="settings-detail">
          <summary>À propos du token personnel</summary>
          <p style="font-size:0.72rem;margin-top:0.3rem;">
            Lève la limite d'1 requête à la fois de l'API anonyme. À obtenir sur
            <a href="https://auth.pollinations.ai" target="_blank" style="color:var(--accent)">auth.pollinations.ai</a>.
            Stocké uniquement dans ce navigateur, jamais envoyé ailleurs qu'à Pollinations —
            mais reste visible dans les outils de développement du navigateur : à réserver
            à un usage personnel, ne le partagez pas dans une copie publique de cet outil.
          </p>
          </details>
        </div>
      </div>`;
    }

    // --- Sauvegarde & synchronisation (global) ---
    html += this._syncSectionHTML();

    // --- Réglages propres à l'édition active (remontés dans le module — A5,
    //     plus de branche `if (ed===…)` ici : prohibition n°1) ---
    html += `<div class="settings-group-label">Cette édition — ${CardRenderer._esc(App.editionModule?.label || App.edition.toUpperCase())}</div>`;
    html += App.editionModule?.settingsHTML?.(this) ?? "";

    // --- Atomiser ---
    html += `<div class="settings-section">
      <h3>Remise à zéro</h3>
      <p>Efface tous les PNJ sauvegardés et paramètres pour cette édition. Action irréversible.</p>
      <button class="danger-btn" data-action="atomize">⚠ Atomiser</button>
    </div>`;

    // --- Informations (hors réglages fonctionnels) : présentation + à propos ---
    html += `<div class="settings-group-label">Informations</div>`;

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

    // Bind les radios propres à l'édition (ceux pilotés par data-action —
    // affichage des cartes, synchro — ont leur propre gestion en délégation).
    zone.querySelectorAll("input[type=radio]:not([data-action])").forEach((r) => {
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
      else if (el.dataset.action === "set-sync-provider")
        this.setSyncProvider(el.value);
      else if (el.dataset.action === "set-sync-field")
        this.setSyncField(el.dataset.prov, el.dataset.field, el.value);
      else if (el.dataset.action === "toggle-sync-auto")
        this.toggleSyncAuto(el.checked);
    });
    zone.addEventListener("click", (e) => {
      const el = e.target.closest("[data-action]");
      if (!el) return;
      if (el.dataset.action === "atomize") this.atomize();
      else if (el.dataset.action === "sync-now") this.syncNow();
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
