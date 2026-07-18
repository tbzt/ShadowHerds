"use strict";

/* ============================================================
   SETTINGS — paramètres par édition, stockés via Storage
   ============================================================ */
import { ContactsBook } from "./contactsbook.js";
import { Dialog } from "../widgets/kit/dialog.js";
import { DicePanel } from "../widgets/dice/dicepanel.js";
import { DiceRoller } from "../widgets/dice/diceroller.js";
import { Gen } from "./generator.js";
import { Shadows } from "./shadows.js";
import { Storage } from "../core/storage.js";
import { Sync } from "./sync.js";
import { Utils } from "../core/utils.js";

export const Settings = {
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
    // Surface de l'Edge PRÉ-jet (SR5/SR6) : "off" (aucun), "panel" (panneau
    // avant le jet) ou "pill" (mini-menu ancré à la pastille roulable). Par
    // appareil, non synchronisé. Défaut "off" — le tap reste un lancer
    // immédiat tant que le MJ n'active pas l'option.
    preRollEdge: "off",
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
  setDicePreRollEdge(mode) {
    const m = mode === "panel" ? "panel" : mode === "pill" ? "pill" : "off";
    this.setDicePrefs({ preRollEdge: m });
    // "pill" change l'affordance dessinée sur les cartes (mini-menu) — les
    // autres modes n'affectent que l'interception au clic, rien à re-rendre.
    this._refreshVisibleCards();
    toast(
      m === "panel"
        ? "Edge avant le jet : panneau activé."
        : m === "pill"
          ? "Edge avant le jet : pastille activée."
          : "Edge avant le jet désactivé.",
    );
  },

  /* ---- La section « Affichage des cartes » (radio layout + cases
     attributs/réserves MJ/équipement) a été retirée — remplacée par les vues
     de carte (lentilles) + le pli par zone, ajustables carte par carte
     (cardrenderer.js). L'ancien blob `cardDisplay` éventuellement présent
     chez un utilisateur reste en Storage mais n'est plus lu nulle part
     (présentation pure, aucune migration nécessaire). */

  /** Re-rend les cartes actuellement affichées (Ombres/contacts) pour
      refléter le changement de préférence. */
  _refreshVisibleCards() {
    if (Shadows.render) Shadows.render();
    if (ContactsBook.render) ContactsBook.render();
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
     conflits, providers) vit dans sync.js. Le rappel de sauvegarde
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
    return `<label class="radio-label">
      <input type="radio" name="sync_provider" value="${val}" ${checked ? "checked" : ""}
        data-action="set-sync-provider">
      <span>${label}</span>
    </label>`;
  },
  _syncGistFields(sc) {
    return `<div class="form-group sync-fields" style="margin-top:0.6rem;">
      <label for="sync_gist_token">Token GitHub (périmètre « gist »)</label>
      <input type="password" id="sync_gist_token" value="${CardRenderer._esc(sc.gist.token)}"
        placeholder="ghp_… ou github_pat_… (pas l'URL du gist)"
        data-action="set-sync-field" data-prov="gist" data-field="token">
      <label for="sync_gist_id" style="margin-top:0.5rem;">URL ou identifiant du gist (facultatif)</label>
      <input type="text" id="sync_gist_id" value="${CardRenderer._esc(sc.gist.gistId)}"
        placeholder="vide = créé ou retrouvé automatiquement"
        data-action="set-sync-field" data-prov="gist" data-field="gistId">
      <label for="sync_gist_device" style="margin-top:0.5rem;">Nom de cet appareil (facultatif)</label>
      <input type="text" id="sync_gist_device" value="${CardRenderer._esc(sc.gist.deviceLabel || "")}"
        placeholder="${CardRenderer._esc(Sync._deviceLabel())}"
        data-action="set-sync-field" data-prov="gist" data-field="deviceLabel">
      <details class="settings-detail">
        <summary>Comment obtenir un token</summary>
        <p class="settings-note">
          Le <strong>token</strong> n'est pas l'adresse du gist : c'est un jeton
          d'authentification. Créez-en un sur
          <a href="https://github.com/settings/tokens?type=beta" target="_blank" class="settings-link">github.com/settings/tokens</a>
          avec la permission <strong>Gist</strong> (lecture + écriture), puis collez-le
          ci-dessus. L'URL de votre gist, elle, va dans le champ « identifiant » (facultatif).
          Un gist secret est créé automatiquement au premier envoi si vous laissez ce champ vide.
          Collez le même token sur vos autres appareils. Stocké uniquement dans ce navigateur,
          visible dans les outils de développement : usage personnel, ne le partagez pas dans
          une copie publique de l'outil.
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
      <p class="settings-note">
        Le serveur doit autoriser l'accès distant (CORS) et exposer l'en-tête ETag.
        Préférez des identifiants dédiés, pas le mot de passe principal du NAS.
      </p>
    </div>`;
  },
  _syncReminderHTML(st) {
    const saveLine = !st.lastAt
      ? `<span>Aucune sauvegarde effectuée pour l'instant.</span>`
      : (() => {
          const days = Sync.daysSinceSave();
          const txt = days <= 0 ? "aujourd'hui" : days === 1 ? "hier" : `il y a ${days} jours`;
          return `<span>Dernière sauvegarde : ${txt}.</span>`;
        })();
    return saveLine + this._exportReminderHTML();
  },
  /** 2e ligne du rappel (#47) : l'archive TÉLÉCHARGÉE (rituel NAS/drive),
      distincte de la sauvegarde ci-dessus qui inclut aussi la synchro
      cloud — une synchro ne doit pas faire taire ce rappel. */
  _exportReminderHTML() {
    const days = Sync.daysSinceExport();
    const stale = days === null || days >= 30;
    const txt =
      days === null
        ? "Aucune archive téléchargée pour l'instant."
        : days <= 0
          ? "Dernière archive téléchargée : aujourd'hui."
          : days === 1
            ? "Dernière archive téléchargée : hier."
            : `Dernière archive téléchargée : il y a ${days} jours.`;
    return `<br><span class="${stale ? "settings-note" : ""}">${txt}</span>`;
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
    // Rend visible le gist réellement utilisé : après une création ou une
    // découverte automatique, l'identifiant apparaît dans le champ (et se
    // trouve dès lors épinglé). Ne touche pas le champ pendant la saisie.
    const idInput = document.getElementById("sync_gist_id");
    if (idInput && document.activeElement !== idInput) {
      const cur = Sync.cfg().gist.gistId || "";
      if (idInput.value !== cur) idInput.value = cur;
    }
  },
  setSyncProvider(v) {
    Sync._saveCfg({ provider: v });
    this.render(); // réaffiche pour montrer/masquer les champs du provider
    if (v !== "none")
      toast("Renseignez le stockage, puis « Synchroniser maintenant ».");
  },
  setSyncField(prov, field, value) {
    let v = (value || "").trim();
    // Tolérance : une URL de gist collée dans le champ identifiant est réduite
    // à l'ID (dernier segment hexadécimal), pour éviter la confusion token/URL.
    if (prov === "gist" && field === "gistId" && v) {
      const m = v.match(/[0-9a-f]{20,}/i);
      if (m) v = m[0];
    }
    const c = Sync.cfg();
    Sync._saveCfg({ [prov]: { ...c[prov], [field]: v } });
  },
  toggleSyncAuto(on) {
    Sync._saveCfg({ auto: !!on });
    toast(on ? "Synchro automatique activée." : "Synchro automatique désactivée.");
  },
  async syncNow() {
    await Sync.syncNow();
    this.renderSyncStatus();
  },

  /* ---- Panneaux du maître-détail ---- */
  _catGeneral() {
    const dp = this.getDicePrefs();
    const pg = this.getPortraitSettings();
    return `<div class="settings-section">
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
          <div class="display-pref-row">
            <label for="dp_preRollEdge">Edge avant le jet (SR5/SR6)</label>
            <select id="dp_preRollEdge" data-action="set-preroll-edge">
              <option value="off" ${dp.preRollEdge !== "panel" && dp.preRollEdge !== "pill" ? "selected" : ""}>Désactivé</option>
              <option value="panel" ${dp.preRollEdge === "panel" ? "selected" : ""}>Panneau avant le jet</option>
              <option value="pill" ${dp.preRollEdge === "pill" ? "selected" : ""}>Pastille sur la carte</option>
            </select>
          </div>
        </div>
        <p class="settings-note">Quand c'est activé, un jet lancé depuis une carte SR5/SR6 dont le personnage a de l'Edge dépensable ouvre un panneau (« Panneau ») ou affiche un petit menu à côté de la pastille lançable (« Pastille ») : « Repousser les limites » (SR5) ou « Prendre un risque » / « Ajouter son rang d'Atout » (SR6), sinon lancer sans Edge. Le tap nu reste un lancer immédiat dès qu'il n'y a pas d'Edge à dépenser.</p>
      </div>
      <div class="settings-section">
        <h3>Portrait IA</h3>
        <div class="display-pref-row">
          <label for="pg_enabled">Portrait IA (Pollinations) sur les cartes</label>
          <input type="checkbox" id="pg_enabled" ${pg.enabled ? "checked" : ""}
            data-action="toggle-portrait-gen">
        </div>
        <p class="settings-note">Génère un portrait au clic sur une carte PNJ, esprit, créature ou contact. Nécessite une connexion internet ; le prompt part vers un service tiers.</p>
        <div class="form-group" style="margin-top:0.6rem;">
          <label for="pg_token">Token personnel Pollinations (optionnel)</label>
          <input type="password" id="pg_token" value="${CardRenderer._esc(pg.token)}"
            placeholder="Laisser vide pour rester en anonyme"
            data-action="set-portrait-token">
          <details class="settings-detail">
            <summary>À propos du token personnel</summary>
            <p class="settings-note">
              Lève la limite d'1 requête à la fois de l'API anonyme. À obtenir sur
              <a href="https://auth.pollinations.ai" target="_blank" class="settings-link">auth.pollinations.ai</a>.
              Stocké uniquement dans ce navigateur, jamais envoyé ailleurs qu'à Pollinations —
              mais reste visible dans les outils de développement du navigateur : à réserver
              à un usage personnel, ne le partagez pas dans une copie publique de cet outil.
            </p>
          </details>
        </div>
      </div>
      <div class="settings-section">
        <h3>Écran spectateur</h3>
        <p>Ouvre un second onglet en lecture seule (rien d'éditable, aucune fiche secrète) : ordre d'initiative et moniteurs de condition des combattants de la rencontre en cours. À poser côté joueurs.</p>
        <div class="display-prefs">
          <button class="btn-secondary" data-action="open-spectator">Ouvrir l'écran spectateur ↗</button>
        </div>
      </div>`;
  },
  _catBackup() {
    return this._syncSectionHTML();
  },
  _catEdition() {
    const edHTML = App.editionModule?.settingsHTML?.(this);
    return (
      (edHTML && edHTML.trim()
        ? edHTML
        : `<div class="settings-section"><p class="settings-note">Aucun réglage spécifique à cette édition — la table suit le livre.</p></div>`) +
      `<div class="settings-section is-danger">
        <h3>Remise à zéro</h3>
        <p>Efface tous les PNJ sauvegardés et paramètres pour cette édition. Action irréversible.</p>
        <button class="danger-btn" data-action="atomize">⚠ Atomiser</button>
      </div>`
    );
  },
  _catAbout() {
    const intro = App.welcomeContent[App.edition];
    let html = "";
    if (intro) {
      html += `<details class="settings-section settings-prose">
        <summary>${CardRenderer._esc(intro.title)}</summary>
        ${intro.body}
      </details>`;
    }
    html += `<div class="settings-section">
      <h3>À propos</h3>
      <p>
        <strong>Shadow Herds — Shadowrun PNJ Generator</strong><br>
        Basé sur le GM Mob Master de <strong>Toktic</strong>,
        traduit par <strong>Michel_Platinium</strong>,
        adapté et refondu par <strong>tbzt</strong>.
      </p>
      <p class="settings-note">
        Shadowrun est une marque de The Topps Company, Inc.
        Black Book Editions détient les droits de la version française.
        Cet outil est non-commercial, distribué sous licence
        <a href="https://creativecommons.org/licenses/by-nc/4.0/" target="_blank"
           class="settings-link">CC BY-NC 4.0</a>.
      </p>
    </div>`;
    return html;
  },

  /* ---- Rendu du panel paramètres (maître-détail) ---- */
  render() {
    const zone = document.getElementById("settings-panel-content");
    if (!this._cat) this._cat = "general";

    const cats = [
      { key: "general", label: "Général" },
      { key: "backup", label: "Sauvegarde" },
      {
        key: "edition",
        label: `Cette édition — ${CardRenderer._esc(App.editionModule?.label || App.edition.toUpperCase())}`,
      },
      { key: "about", label: "À propos" },
    ];
    const panes = {
      general: () => this._catGeneral(),
      backup: () => this._catBackup(),
      edition: () => this._catEdition(),
      about: () => this._catAbout(),
    };
    if (!panes[this._cat]) this._cat = "general";

    const navItems = cats
      .map(
        (c) =>
          `<button class="settings-nav-item${this._cat === c.key ? " is-active" : ""}"
            data-action="settings-cat" data-cat="${c.key}">${c.label}</button>`
      )
      .join("");

    zone.innerHTML = `<div class="settings-layout">
      <nav class="settings-nav">
        ${navItems}
        <hr class="settings-nav-sep">
        <button class="settings-nav-item is-action" data-action="toggle-shortcuts">Aide et raccourcis ↗</button>
      </nav>
      <div class="settings-pane">${panes[this._cat]()}</div>
    </div>`;
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
      if (el.dataset.action === "set-dice-quick-roll")
        this.setDiceQuickRoll(el.checked);
      else if (el.dataset.action === "set-dice-default-count")
        this.setDiceDefaultCount(el.value);
      else if (el.dataset.action === "set-preroll-edge")
        this.setDicePreRollEdge(el.value);
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
      else if (el.dataset.action === "open-spectator") this.openSpectator();
      else if (el.dataset.action === "settings-cat") {
        this._cat = el.dataset.cat;
        this.render();
      }
    });
  },

  _radio(name, value, label, checked) {
    return `<label class="radio-label">
      <input type="radio" name="${name}" value="${value}" ${checked ? "checked" : ""}>
      ${label}
    </label>`;
  },

  /** #59 : ouvre l'écran spectateur (lecture seule) de l'édition courante
      dans un nouvel onglet — même origine, même localStorage, donc
      synchronisé en direct via l'évènement "storage" (cf. spectatorview.js). */
  openSpectator() {
    window.open(`${location.pathname}#${App.edition}/spectateur`, "_blank");
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
    Shadows.render();
    toast("Atomisé. Table rase.");
  },
};

// Pont couche 5 (migration modules ES) — retiré en fin de migration.
window.Settings = Settings;
