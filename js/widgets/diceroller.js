"use strict";

/* ============================================================
   DICE ROLLER — UI de lancer de dés (overlay d'animation,
   panneau de prise de risque Anarchy, bandeau rapide) et
   câblage des réserves [data-roll*] dans les cards.
   S'appuie sur le moteur Dice (dice.js) pour le calcul,
   et sur DiceLog (dicelog.js) pour le journal.
   ============================================================ */
const DiceRoller = {
  _animating: false,

  /** Dernier résultat brut affiché (res + opts), source des relances
      « Seconde chance » / « Relancer tous les dés ». Le journal (DiceLog)
      ne stocke qu'une entrée formatée, pas le res exploitable. */
  _lastRoll: null,

  /** Réserve de menace Anarchy 2.0 (p.138) : compteur MJ global de
      scénario, ressource de relance des PNJ. Persistée édition-scopée via
      Storage (jamais localStorage direct). SR5/SR6 n'y touchent pas (leur
      ressource est la Chance / l'Atout portée par chaque PNJ). */
  _threat: 0,
  _THREAT_DEFAULT: 4,

  /** Hooks injectés par App au démarrage (couche 6, seule à connaître
      tous les contrôleurs) : resolve, getPrefs, onPnjChanged, isRefOpen,
      isAnarchy. Voir init(). */
  _hooks: null,

  _prefs() {
    return this._hooks.getPrefs();
  },

  /** Applique les préférences (réserve par défaut du lanceur topbar). */
  applyPrefs() {
    const input = document.getElementById("dice-count");
    if (input) input.value = this._prefs().defaultCount;
  },

  /* ========================================================
     RÉSERVE DE MENACE (Anarchy 2.0, p.138)
     ======================================================== */

  /** Recharge la réserve depuis Storage (appelée à chaque changement
      d'édition par App.selectEdition) et rafraîchit le badge. */
  loadThreat() {
    this._threat = Storage.get("threat_reserve", this._THREAT_DEFAULT);
    this._renderThreat();
  },

  _setThreat(n) {
    this._threat = Utils.clamp(n | 0, 0, 99);
    Storage.set("threat_reserve", this._threat);
    this._renderThreat();
  },

  _renderThreat() {
    const el = document.getElementById("threat-reserve-val");
    if (el) el.textContent = this._threat;
    // K5 : miroir dans l'en-tête du cockpit — même source de vérité, écrite
    // une seule fois ici (topbar ET cockpit rafraîchis ensemble).
    const cockpit = document.getElementById("encounter-threat-val");
    if (cockpit) cockpit.textContent = this._threat;
  },

  /* ---- API publique de la Réserve de menace (K5) : le cockpit de combat
     mute la même valeur que le badge topbar, jamais une copie. ---- */
  threatValue() {
    return this._threat;
  },
  stepThreat(delta) {
    this._setThreat(this._threat + (delta | 0));
  },
  resetThreat() {
    this._setThreat(this._THREAT_DEFAULT);
  },

  /** hooks: { resolve(id), getPrefs(), onPnjChanged(pnj), isRefOpen(pnj), isAnarchy() }. */
  init(hooks) {
    const required = ["resolve", "getPrefs", "onPnjChanged", "isRefOpen", "isAnarchy"];
    const missing = required.filter((k) => typeof (hooks || {})[k] !== "function");
    if (missing.length) {
      throw new Error(`DiceRoller.init: hooks manquants: ${missing.join(", ")}`);
    }
    this._hooks = hooks;
    this.applyPrefs();
    document
      .getElementById("dice-roll-btn")
      .addEventListener("click", () => this.roll());
    document.getElementById("dice-count").addEventListener("keydown", (e) => {
      if (e.key === "Enter") this.roll();
    });

    // Stepper −/＋ du lanceur topbar
    document.querySelectorAll("[data-dice-topbar-step]").forEach((btn) => {
      const delta = parseInt(btn.getAttribute("data-dice-topbar-step"), 10) || 0;
      btn.addEventListener("click", () => this.stepCount(delta));
    });

    // Badge Réserve de menace (Anarchy) : −/＋/reset, délégation data-action.
    const threatEl = document.getElementById("threat-reserve");
    if (threatEl) {
      threatEl.addEventListener("click", (e) => {
        const b = e.target.closest("[data-threat]");
        if (!b) return;
        const act = b.getAttribute("data-threat");
        if (act === "reset") this._setThreat(this._THREAT_DEFAULT);
        else this._setThreat(this._threat + (parseInt(act, 10) || 0));
      });
    }

    // Clic sur n'importe quelle réserve marquée [data-roll] dans une carte
    document.addEventListener("click", (e) => {
      // Replier/déplier la zone Référence d'une carte
      const refEl = e.target.closest("[data-ref-toggle]");
      if (refEl) {
        const pnj = this._hooks.resolve(refEl.getAttribute("data-ref-toggle"));
        if (pnj) {
          const open = this._hooks.isRefOpen(pnj);
          pnj._refOpen = !open;
          this._hooks.onPnjChanged(pnj);
        }
        return;
      }

      // Effacer l'initiative affichée sur un PNJ
      const clearEl = e.target.closest("[data-init-clear]");
      if (clearEl) {
        e.stopPropagation();
        const pnj = this._hooks.resolve(clearEl.getAttribute("data-init-clear"));
        if (pnj) {
          delete pnj.lastInit;
          this._hooks.onPnjChanged(pnj);
        }
        return;
      }

      // Initiative : base + N D6 (somme, pas des succès)
      const initEl = e.target.closest("[data-roll-init]");
      if (initEl) {
        const base = parseInt(initEl.getAttribute("data-roll-init"), 10) || 0;
        const dice =
          parseInt(initEl.getAttribute("data-roll-init-dice"), 10) || 1;
        const pnjId = initEl.getAttribute("data-roll-pnj") || "";
        const detail = initEl.getAttribute("data-roll-init-detail") || "";
        this.rollInitiative(base, dice, pnjId, detail);
        return;
      }

      // Arme SR5/SR6 : on résout le pool depuis le PNJ et on lance
      const wEl = e.target.closest("[data-roll-weapon]");
      if (wEl) {
        const pnj = this._hooks.resolve(wEl.getAttribute("data-roll-pnj"));
        const edition = wEl.getAttribute("data-roll-edition") || "sr5";
        const weapon = wEl.getAttribute("data-roll-weapon");
        if (pnj) this.rollWeapon(pnj, weapon, edition);
        return;
      }

      // Arme Anarchy : passe par le panneau de risque (avec la RR de l'arme)
      const waEl = e.target.closest("[data-roll-weapon-anarchy]");
      if (waEl) {
        const pnj = this._hooks.resolve(waEl.getAttribute("data-roll-pnj"));
        const wName = waEl.getAttribute("data-roll-weapon-anarchy");
        if (pnj) {
          const weapon = (pnj.weapons || []).find((a) => a.name === wName);
          const r = weapon ? WeaponRoll.resolvePool(pnj, weapon, pnj.edition) : null;
          if (r) {
            this.openRiskPanel(r.pool, {
              label: `${r.weaponName} (${r.matchedSkill || r.skill})`,
              detail: `${Utils.attrFullName(r.attr)} ${r.attrVal} + ${r.matchedSkill || r.skill} ${r.skillVal}`,
              rr: r.rr,
              adv: pnj.drugAdv || 0,
              who: pnj.name || "",
            });
          }
        }
        return;
      }

      // Affordances internes d'une ligne de sort (ⓘ détails, ✕ effacer) :
      // gérées ailleurs (ContentModal / MagicAction), ne pas lancer.
      if (e.target.closest("[data-content-name], [data-spell-clear]")) return;

      const t = e.target.closest("[data-roll]");
      if (!t) return;
      const n = parseInt(t.getAttribute("data-roll"), 10);
      if (!n || n < 1) return;
      const label = t.getAttribute("data-roll-label") || "";
      const detail = t.getAttribute("data-roll-detail") || "";
      const edition = t.getAttribute("data-roll-edition") || "";
      const rr = parseInt(t.getAttribute("data-roll-rr"), 10) || 0;
      // Sort Anarchy 2 : nom porté par la ligne pour mémoriser le dernier jet.
      const spellName = t.getAttribute("data-roll-spell") || "";

      // PNJ à l'origine du jet : attribut explicite, sinon la carte
      // englobante (compétences SR5/SR6, réserves MJ…). Alimente le
      // journal des jets et la relance (débit d'Edge du bon PNJ).
      const holder = t.closest(".pnj-card");
      const pnjId = t.getAttribute("data-roll-pnj") || (holder && holder.dataset.id) || "";
      const rollPnj = this._hooks.resolve(pnjId);
      const who = (rollPnj && rollPnj.name) || "";

      // Anarchy 2.0 : on passe par le panneau de prise de risque
      const edMod = App.getEditionModule(edition);
      if (edMod?.usesRiskPanel) {
        // Jet magique (Sorcellerie/Conjuration) → sujet au Drain sur
        // complication (CH-M7d). Base du label = avant « · » (spécialité).
        const skillBase = label.split(" · ")[0];
        const isMagic = !!(edMod.magicSkills && edMod.magicSkills.includes(skillBase));
        this.openRiskPanel(n, { label, detail, rr, adv: (rollPnj && rollPnj.drugAdv) || 0, who, pnjId, isMagic, spellName });
      } else {
        this.rollPool(n, { label, detail, who, pnjId });
      }
    });

    this._ensureOverlay();
    this._ensureRiskPanel();
  },

  /** Lance l'attaque d'une arme SR5/SR6 (pool résolu, limite SR5). */
  rollWeapon(pnj, weapon, edition) {
    const r = WeaponRoll.resolvePool(pnj, weapon, edition);
    if (!r) return;
    const res = Dice.computeRoll(r.pool);
    // Plafonnement à la Précision (SR5) : la limite mord si hits > limite
    if (r.limit != null && res.hits > r.limit) {
      res.cappedFrom = res.hits;
      res.hits = r.limit;
      res.limited = true;
      res.limit = r.limit;
    }
    const approxTxt = r.approx ? " ~" : "";
    this.show(res, {
      label: `${r.weaponName} (${r.matchedSkill || r.skill}${approxTxt})`,
      detail: `${Utils.attrFullName(r.attr)} ${r.attrVal} + ${r.matchedSkill || r.skill} ${r.skillVal}`,
      who: pnj.name || "",
      pnjId: pnj.id || "",
    });
  },

  /** Stepper −/＋ du compteur de dés topbar. */
  stepCount(delta) {
    const input = document.getElementById("dice-count");
    if (!input) return;
    const n = Utils.clamp((parseInt(input.value, 10) || 0) + delta, 1, 40);
    input.value = n;
  },

  /** Rend le résultat dans la barre du haut : compte de succès mis en
      avant, état (bévue / échec critique) en pastille sémantique. Les
      couleurs viennent des classes CSS (palette sémantique), pas d'un
      style inline. */
  _renderTopbarResult(el, res) {
    el.classList.toggle("is-crit", !!res.critGlitch);
    el.classList.toggle("is-glitch", !res.critGlitch && !!res.glitch);
    const state = res.critGlitch
      ? "Échec critique"
      : res.glitch
        ? "Bévue"
        : "";
    el.innerHTML =
      `<span class="dice-result-hits">${res.hits}</span>` +
      `<span class="dice-result-label">succès</span>` +
      (state ? `<span class="dice-result-state">${state}</span>` : "");
  },

  /* ---- Bouton « Lancer » de la barre du haut ---- */
  roll() {
    const input = document.getElementById("dice-count");
    const n = Utils.clamp(parseInt(input.value) || 6, 1, 40);
    input.value = n;

    // Anarchy 2.0 : ce lanceur passe par le panneau de prise de risque
    if (this._hooks.isAnarchy()) {
      this.openRiskPanel(n, { label: "" });
      return;
    }

    const res = Dice.computeRoll(n);

    // Résultat textuel dans la barre (comportement d'origine conservé)
    this._renderTopbarResult(document.getElementById("dice-result"), res);

    // Animation plein écran
    this.show(res, { label: "" });
  },

  /* ---- Lancer d'une réserve depuis une carte ---- */
  rollPool(n, opts = {}) {
    const res = Dice.computeRoll(n);
    this.show(res, {
      label: opts.label || "",
      detail: opts.detail || "",
      who: opts.who || "",
      pnjId: opts.pnjId || "",
    });
  },

  /** opts.silent : calcule et mémorise l'initiative sans ouvrir l'overlay de
      tirage. Utilisé par le suivi de combat pour un lancer groupé (« Lancer
      l'initiative » / round suivant), où N overlays successifs s'écraseraient
      les uns les autres — les scores s'affichent directement dans la liste. */
  rollInitiative(base, dice, pnjId, detail = "", opts = {}) {
    const res = Dice.computeInitiative(base, dice);
    const pnjForLog = pnjId ? this._hooks.resolve(pnjId) : null;
    if (!opts.silent) {
      this.show(res, {
        label: "Initiative",
        detail,
        who: (pnjForLog && pnjForLog.name) || "",
      });
    }

    // Mémoriser le résultat sur le PNJ pour l'afficher sur sa carte
    if (pnjForLog) {
      pnjForLog.lastInit = {
        total: res.total,
        base: res.base,
        dice: res.dice,
        faces: res.faces.slice(),
      };
      this._hooks.onPnjChanged(pnjForLog);
    }
  },

  /* ========================================================
     PANNEAU DE PRISE DE RISQUE (Anarchy 2.0)
     ======================================================== */
  _risk: { pool: 0, riskDice: 0, rr: 0, adv: 0, level: "normal", label: "", detail: "" },

  RISK_LEVELS: [
    { key: "faible", label: "Faible", sub: "Précautionneuse" },
    { key: "normal", label: "Normal", sub: "Normale" },
    { key: "fort", label: "Fort", sub: "Risquée" },
    { key: "extreme", label: "Extrême", sub: "Suicidaire" },
  ],

  ADV_LEVELS: [
    { key: -1, label: "Désavantage", sub: "Seul 6 = succès" },
    { key: 0, label: "Normal", sub: "5-6 = succès" },
    { key: 1, label: "Avantage", sub: "4-6 = succès" },
  ],

  _ensureRiskPanel() {
    if (document.getElementById("risk-panel")) return;
    const p = document.createElement("div");
    p.id = "risk-panel";
    p.className = "risk-panel-overlay";
    p.setAttribute("hidden", "");
    p.innerHTML = `
      <div class="risk-panel" role="dialog" aria-label="Prise de risque">
        <div class="risk-panel-head">
          <span class="risk-panel-title" id="risk-panel-title">Prise de risque</span>
          <button class="risk-panel-close" id="risk-panel-close" aria-label="Fermer">✕</button>
        </div>
        <div class="risk-panel-pool" id="risk-panel-pool"></div>
        <div class="risk-levels" id="risk-levels"></div>
        <div class="risk-slider-row">
          <label class="risk-slider-label">Dés de risque
            <span class="risk-slider-val" id="risk-dice-val">0</span>
            <span class="risk-slider-sub">/ <span id="risk-pool-total">0</span></span>
          </label>
          <input type="range" id="risk-dice-slider" min="0" max="0" value="0">
        </div>
        <div class="risk-rr-row">
          <span class="risk-rr-label">Réduction de risque (RR)</span>
          <div class="risk-rr-steps" id="risk-rr-steps"></div>
        </div>
        <div class="risk-adv-row">
          <span class="risk-adv-label">Avantage / Désavantage</span>
          <div class="risk-adv-steps" id="risk-adv-steps"></div>
        </div>
        <div class="risk-forecast" id="risk-forecast"></div>
        <button class="risk-roll-btn" id="risk-roll-btn">Lancer</button>
      </div>`;
    document.body.appendChild(p);

    // Fermer en cliquant le fond ou la croix
    p.addEventListener("click", (e) => {
      if (e.target === p) this._closeRiskPanel();
    });
    document
      .getElementById("risk-panel-close")
      .addEventListener("click", () => this._closeRiskPanel());

    // Niveaux
    const lv = document.getElementById("risk-levels");
    lv.innerHTML = this.RISK_LEVELS.map(
      (l) =>
        `<button class="risk-level-btn" data-level="${l.key}">
           <span class="risk-level-name">${l.label}</span>
           <span class="risk-level-sub">${l.sub}</span>
         </button>`,
    ).join("");
    lv.addEventListener("click", (e) => {
      const b = e.target.closest(".risk-level-btn");
      if (!b) return;
      this._risk.level = b.dataset.level;
      const n = Dice.riskDiceFor(
        this._risk.level,
        this._risk.rr,
        this._risk.pool,
      );
      this._risk.riskDice = n;
      this._syncRiskPanel();
    });

    // RR steps 0-3
    const rr = document.getElementById("risk-rr-steps");
    rr.innerHTML = [0, 1, 2, 3]
      .map((v) => `<button class="risk-rr-btn" data-rr="${v}">${v}</button>`)
      .join("");
    rr.addEventListener("click", (e) => {
      const b = e.target.closest(".risk-rr-btn");
      if (!b) return;
      this._risk.rr = parseInt(b.dataset.rr, 10);
      // Recalcule les dés de risque pour le niveau courant
      this._risk.riskDice = Dice.riskDiceFor(
        this._risk.level,
        this._risk.rr,
        this._risk.pool,
      );
      this._syncRiskPanel();
    });

    // Slider
    const slider = document.getElementById("risk-dice-slider");
    slider.addEventListener("input", () => {
      this._risk.riskDice = parseInt(slider.value, 10) || 0;
      this._risk.level = null; // ajustement manuel : plus de niveau actif
      this._syncRiskPanel();
    });

    // Avantage / Désavantage (p.67 : net, un seul palier)
    const adv = document.getElementById("risk-adv-steps");
    adv.innerHTML = this.ADV_LEVELS.map(
      (l) =>
        `<button class="risk-adv-btn" data-adv="${l.key}">
           <span class="risk-adv-name">${l.label}</span>
           <span class="risk-adv-sub">${l.sub}</span>
         </button>`,
    ).join("");
    adv.addEventListener("click", (e) => {
      const b = e.target.closest(".risk-adv-btn");
      if (!b) return;
      this._risk.adv = parseInt(b.dataset.adv, 10);
      this._syncRiskPanel();
    });

    // Lancer
    document.getElementById("risk-roll-btn").addEventListener("click", () => {
      const { pool, riskDice, rr, adv, label, detail, who, pnjId, isMagic, spellName } = this._risk;
      this._closeRiskPanel();
      const res = Dice.computeAnarchyRoll(pool, riskDice, rr, adv);
      this.show(res, { label, detail, who, pnjId, isMagic, spellName });
    });

    // Échap ferme
    document.addEventListener("keydown", (e) => {
      if (
        e.key === "Escape" &&
        !document.getElementById("risk-panel").hasAttribute("hidden")
      ) {
        this._closeRiskPanel();
      }
    });
  },

  openRiskPanel(pool, opts = {}) {
    this._ensureRiskPanel();
    this._risk = {
      pool,
      rr: Utils.clamp(opts.rr || 0, 0, 3),
      adv: Utils.clamp(opts.adv || 0, -1, 1),
      level: "normal",
      label: opts.label || "",
      detail: opts.detail || "",
      who: opts.who || "",
      pnjId: opts.pnjId || "",
      isMagic: !!opts.isMagic,
      spellName: opts.spellName || "",
      riskDice: 0,
    };
    this._risk.riskDice = Dice.riskDiceFor("normal", this._risk.rr, pool);

    const title = opts.label || "Prise de risque";
    document.getElementById("risk-panel-title").textContent = opts.who
      ? `${opts.who} — ${title}`
      : title;
    document.getElementById("risk-panel-pool").innerHTML =
      `Réserve : <strong>${pool}</strong> dé${pool > 1 ? "s" : ""}`;

    const slider = document.getElementById("risk-dice-slider");
    slider.max = String(pool);

    const p = document.getElementById("risk-panel");
    p.removeAttribute("hidden");
    void p.offsetWidth;
    p.classList.add("show");
    this._syncRiskPanel();
  },

  _closeRiskPanel() {
    const p = document.getElementById("risk-panel");
    if (!p) return;
    p.classList.remove("show");
    clearTimeout(p._t);
    p._t = setTimeout(() => p.setAttribute("hidden", ""), 200);
  },

  _syncRiskPanel() {
    const { pool, riskDice, rr, adv, level } = this._risk;
    document.getElementById("risk-dice-val").textContent = riskDice;
    document.getElementById("risk-pool-total").textContent = pool;
    const slider = document.getElementById("risk-dice-slider");
    slider.value = String(riskDice);
    const fillPct = pool > 0 ? (riskDice / pool) * 100 : 0;
    slider.style.setProperty("--fill", `${fillPct}%`);

    document.querySelectorAll(".risk-level-btn").forEach((b) => {
      b.classList.toggle("active", b.dataset.level === level);
    });
    document.querySelectorAll(".risk-rr-btn").forEach((b) => {
      b.classList.toggle("active", parseInt(b.dataset.rr, 10) === rr);
    });
    document.querySelectorAll(".risk-adv-btn").forEach((b) => {
      b.classList.toggle("active", parseInt(b.dataset.adv, 10) === adv);
    });

    // Prévision lisible
    const normalDice = pool - riskDice;
    const threshold = adv === 1 ? 4 : adv === -1 ? 6 : 5;
    const fc = document.getElementById("risk-forecast");
    const rrTxt = rr > 0 ? ` · RR ${rr} annule ${rr} « 1 »` : "";
    const advTxt =
      adv === 1
        ? " · Avantage : 4-6 = succès"
        : adv === -1
          ? " · Désavantage : seul 6 = succès"
          : "";
    fc.innerHTML =
      `<span>${normalDice} norm${normalDice > 1 ? "aux" : "al"} + ${riskDice} de risque</span>` +
      `<span class="risk-forecast-note">Succès de risque ×2 (seuil ${threshold}+)${rrTxt}${advTxt}</span>`;
  },

  /* ========================================================
     ANIMATION
     ======================================================== */
  _ensureOverlay() {
    if (document.getElementById("dice-overlay")) return;
    const ov = document.createElement("div");
    ov.id = "dice-overlay";
    ov.className = "dice-overlay";
    ov.setAttribute("hidden", "");
    ov.innerHTML = `
      <div class="dice-overlay-inner">
        <div class="dice-tray" id="dice-tray"></div>
        <div class="dice-summary" id="dice-summary"></div>
        <div class="dice-hint">Cliquez pour fermer</div>
      </div>`;
    document.body.appendChild(ov);
    ov.addEventListener("click", (e) => {
      // Le bouton de relance ne doit pas fermer l'overlay.
      if (e.target.closest('[data-action="reroll"]')) {
        e.stopPropagation();
        this._doReroll();
        return;
      }
      // Secondes chances de sort (sort/Drain) : gérées par MagicAction — ne pas
      // fermer, et laisser l'événement remonter jusqu'à son écouteur document.
      if (e.target.closest('[data-action="reroll-cast"], [data-action="reroll-drain"]')) {
        return;
      }
      this._closeOverlay();
    });
  },

  _closeOverlay() {
    const ov = document.getElementById("dice-overlay");
    if (!ov) return;
    ov.classList.remove("show");
    ov._closeTimer = setTimeout(() => ov.setAttribute("hidden", ""), 220);
  },

  /** Pip layout (positions des points) pour chaque face de dé. */
  _pips(v) {
    // grille 3x3, positions remplies par face
    const map = {
      1: [4],
      2: [0, 8],
      3: [0, 4, 8],
      4: [0, 2, 6, 8],
      5: [0, 2, 4, 6, 8],
      6: [0, 2, 3, 5, 6, 8],
    };
    const on = new Set(map[v] || []);
    let cells = "";
    for (let i = 0; i < 9; i++) {
      cells += `<span class="pip ${on.has(i) ? "on" : ""}"></span>`;
    }
    return cells;
  },

  /** Petit dé STATIQUE (non animé), pour un jet secondaire présenté dans le
      résumé (ex. les dés de résistance au Drain d'un sort). */
  _miniDie(value) {
    const hit = value >= 5;
    const one = value === 1;
    return `<div class="die mini${hit ? " hit" : ""}${one ? " one" : ""}"><div class="die-face">${this._pips(value)}</div></div>`;
  },

  /** Bloc « Drain » du résumé (CH-M7e) : jet de résistance (ses dés + succès)
      et dégâts encaissés (ou résisté). Rassemble tout le résultat du lancer de
      sort dans l'affichage de dés standard. `drain` = { res, dv, damage, type }. */
  _drainBlockHtml(drain) {
    if (!drain) return "";
    const { res, dv, damage, type } = drain;
    const dice = (res.faces || []).map((v) => this._miniDie(v)).join("");
    const typeLabel = type === "physical" ? "Physique" : "Étourdissant";
    const outCls = damage > 0 ? "bad" : "safe";
    const outcome =
      damage > 0
        ? `${damage} case${damage > 1 ? "s" : ""} · ${typeLabel}`
        : "Résisté";
    return `<div class="dice-drain">
      <span class="dice-drain-title">Résistance au Drain — VD ${dv}</span>
      <div class="dice-drain-tray">${dice}</div>
      <span class="dice-drain-sub">${res.hits} succès → <strong class="${outCls}">${outcome}</strong></span>
    </div>`;
  },

  _dieEl(value, delay, isRisk = false, isInit = false, threshold = 5) {
    const hit = !isInit && value >= threshold;
    const one = !isInit && value === 1;
    const die = document.createElement("div");
    die.className =
      "die rolling" +
      (hit ? " hit" : "") +
      (one ? " one" : "") +
      (isRisk ? " risk" : "") +
      (isInit ? " init" : "");
    die.style.setProperty("--roll-delay", `${delay}ms`);
    // tumble aléatoire pour varier l'animation
    die.style.setProperty("--tumble", `${Utils.randInt(2, 4)}`);
    const badge = isRisk ? `<span class="die-risk-badge">!</span>` : "";
    die.innerHTML = `<div class="die-face">${this._pips(value)}</div>${badge}`;
    return die;
  },

  /** Normalise les faces d'un résultat en { v, risk } pour l'affichage. */
  _normalizeFaces(res) {
    const norm = (f) =>
      typeof f === "number"
        ? { v: f, risk: false }
        : { v: f.v, risk: !!f.risk };
    return {
      faces: (res.faces || []).map(norm),
      extra: (res.extra || []).map(norm),
    };
  },

  /* ---- Lancer rapide : bandeau discret au lieu de l'animation ---- */
  _quickResult(res, opts = {}) {
    let el = document.getElementById("dice-quick");
    if (!el) {
      el = document.createElement("div");
      el.id = "dice-quick";
      document.body.appendChild(el);
      el.addEventListener("click", (e) => {
        // Le bouton de relance ne doit pas masquer le bandeau.
        if (e.target.closest('[data-action="reroll"]')) {
          e.stopPropagation();
          this._doReroll();
          return;
        }
        // Secondes chances de sort : gérées par MagicAction — ne pas masquer.
        if (e.target.closest('[data-action="reroll-cast"], [data-action="reroll-drain"]')) {
          return;
        }
        el.classList.remove("show");
      });
    }
    const last = DiceLog.history[0];
    if (!last) return;
    const fullLabel = [last.who, last.label].filter(Boolean).join(" — ");
    const labelHtml = fullLabel
      ? `<span class="dice-quick-label">${Utils.escHtml(fullLabel)}</span>`
      : "";
    const tagHtml = last.tag
      ? `<span class="dice-quick-tag">${Utils.escHtml(last.tag)}</span>`
      : "";
    // Sort : deux Secondes chances (sort/Drain) ; sinon relance générique.
    const rerollHtml = opts.drain
      ? this._spellRerollButtons(res, opts)
      : this._rerollBtnHtml();
    // Drain d'un sort (CH-M7e) : résumé compact dans le bandeau rapide.
    let drainHtml = "";
    if (opts.drain) {
      const d = opts.drain;
      const t = d.type === "physical" ? "Physique" : "Étourdissant";
      const txt = d.damage > 0 ? `${d.damage} case${d.damage > 1 ? "s" : ""} (${t})` : "résisté";
      drainHtml = `<span class="dice-quick-drain">Drain ${d.res.hits}✓ → ${txt}</span>`;
    }
    el.className = `dice-quick-${last.cls}`;
    el.innerHTML = `${labelHtml}
      <span class="dice-quick-main">${last.main}</span>
      <span class="dice-quick-unit">${last.unit || ""}</span>
      ${tagHtml}
      <span class="dice-quick-sub">${Utils.escHtml(last.sub)}</span>
      ${drainHtml}
      ${rerollHtml}`;
    void el.offsetWidth;
    el.classList.add("show");
    clearTimeout(el._hideTimer);
    // Laisser le temps de cliquer « Relancer » : bandeau plus long si présent.
    el._hideTimer = setTimeout(
      () => el.classList.remove("show"),
      rerollHtml ? 6000 : 2800,
    );
  },

  show(res, opts = {}) {
    // opts.noLog : l'appelant a déjà journalisé dans le bon ordre (ex.
    // MagicAction sur une Seconde chance du Drain — le cast n'a pas changé).
    if (!opts.noLog) DiceLog.record(res, opts);
    // Source de la relance : dernier résultat brut + son contexte.
    this._lastRoll = { res, opts };

    // Drain par complication (Anarchy 2, CH-M7d) : appliqué ici pour couvrir
    // les deux rendus (overlay ET lancer rapide) et une seule fois (jamais
    // sur une relance — la complication d'origine est figée, déjà encaissée).
    this._applyAnarchyDrain(res, opts);
    // Sort lancé via jet de risque (Anarchy 2, CH-M7e) : mémorise les succès
    // sur le sort (présenté sur la carte, utile pour un sort maintenu).
    this._storeSpellCast(res, opts);

    // Lancer rapide : pas d'animation plein écran
    if (this._prefs().quickRoll) {
      this._quickResult(res, opts);
      return;
    }

    this._ensureOverlay();
    const ov = document.getElementById("dice-overlay");
    clearTimeout(ov._closeTimer);
    const tray = document.getElementById("dice-tray");
    const summary = document.getElementById("dice-summary");
    tray.innerHTML = "";
    summary.innerHTML = "";
    summary.className = "dice-summary";

    let shown;
    if (res.init) {
      // Dés d'initiative : neutres (somme, pas de succès)
      shown = res.faces.slice(0, 40).map((v) => ({ v, init: true }));
    } else {
      const { faces, extra } = this._normalizeFaces(res);
      shown = [...faces, ...extra].slice(0, 40);
    }

    const threshold = res.anarchy ? res.threshold || 5 : 5;
    const stagger = shown.length > 24 ? 14 : 26;
    shown.forEach((f, i) => {
      tray.appendChild(
        this._dieEl(f.v, i * stagger, f.risk, f.init, threshold),
      );
    });

    ov.removeAttribute("hidden");
    void ov.offsetWidth;
    ov.classList.add("show");

    const settleAt = shown.length * stagger + 760;
    clearTimeout(ov._settleTimer);
    ov._settleTimer = setTimeout(() => {
      tray
        .querySelectorAll(".die")
        .forEach((d) => d.classList.remove("rolling"));
      if (res.init) this._revealInitiative(res, summary, opts);
      else if (res.anarchy) this._revealAnarchy(res, summary, opts);
      else this._revealStandard(res, summary, opts);
    }, settleAt);
  },

  /** Ligne « qui lance » de l'overlay (nom du PNJ, si connu). */
  _whoHtml(opts) {
    return opts && opts.who
      ? `<span class="dice-summary-who">${Utils.escHtml(opts.who)}</span>`
      : "";
  },

  /* ========================================================
     RELANCE (« Seconde chance » / « Relancer tous les dés »)
     ======================================================== */

  /** Résout la ressource de relance pour le dernier jet, selon l'édition
      active (contrat rerollAction, jamais de branche d'édition ici).
      Renvoie null si la relance ne s'applique pas (jet déjà relancé,
      d'initiative, ou bloqué par bévue/échec critique). Sinon :
      { action, mode, label, available, hint, pnj }. */
  _rerollState() {
    const last = this._lastRoll;
    if (!last) return null;
    const { res, opts } = last;
    if (res.rerolled || res.init) return null;
    const mod = App.editionModule;
    const action = mod && mod.rerollAction;
    if (!action) return null;
    if (action.blockedBy && res[action.blockedBy]) return null;

    let available = true;
    let hint = "";
    let pnj = null;
    if (mod.usesThreatReserve) {
      available = this._threat > 0;
      hint = `Menace ${this._threat}`;
    } else if (action.costAttr) {
      pnj = opts.pnjId ? this._hooks.resolve(opts.pnjId) : null;
      const val = pnj && pnj.attrs ? pnj.attrs[action.costAttr] : null;
      if (val != null) {
        available = val > 0;
        hint = `${action.costAttr} ${val}`;
      } else {
        // Jet sans PNJ (lancer libre) : relance gratuite, jamais bloquée.
        hint = "gratuit";
      }
    }
    return { action, mode: action.mode, label: action.label, available, hint, pnj };
  },

  /** Bouton de relance pour l'overlay/bandeau (chaîne HTML ou ""). */
  _rerollBtnHtml() {
    const st = this._rerollState();
    if (!st) return "";
    const dis = st.available ? "" : " disabled";
    const hint = st.hint
      ? `<span class="dice-reroll-hint">${Utils.escHtml(st.hint)}</span>`
      : "";
    return `<button class="dice-reroll-btn" data-action="reroll"${dis}>↻ ${Utils.escHtml(st.label)}${hint}</button>`;
  },

  /** Exécute la relance du dernier jet : débite la ressource puis réaffiche
      via show() (qui relogue et repose _lastRoll). */
  _doReroll() {
    const st = this._rerollState();
    if (!st || !st.available) return;
    const { res, opts } = this._lastRoll;
    const mod = App.editionModule;

    if (mod.usesThreatReserve) {
      this._setThreat(this._threat - 1);
    } else if (st.pnj && st.action.costAttr) {
      st.pnj.attrs[st.action.costAttr] -= 1;
      this._hooks.onPnjChanged(st.pnj); // re-render la carte (Edge à jour)
    }
    // Jet sans PNJ en SR5/SR6 : relance gratuite, aucune ressource débitée.

    const newRes =
      st.mode === "all" ? Dice.rerollAnarchyAll(res) : Dice.rerollMisses(res);
    this.show(newRes, opts);
  },

  _revealInitiative(res, summary, opts) {
    summary.classList.add("reveal", "good", "init");
    const rollDetail = `${res.base} + [${res.faces.join(", ")}]`;
    const attrDetailHtml = opts.detail
      ? `<span class="dice-summary-breakdown">${Utils.escHtml(opts.detail)}</span>`
      : "";
    summary.innerHTML = `
      ${this._whoHtml(opts)}
      <span class="dice-summary-label">Initiative</span>
      <div class="dice-summary-main">
        <span class="dice-summary-hits">${res.total}</span>
      </div>
      ${attrDetailHtml}
      <span class="dice-summary-breakdown">${res.total} = ${rollDetail}</span>
      <span class="dice-summary-pool">${res.base} + ${res.dice}D6</span>`;
  },

  _revealStandard(res, summary, opts) {
    const cls = res.critGlitch
      ? "crit"
      : res.glitch
        ? "glitch"
        : res.hits > 0
          ? "good"
          : "zero";
    summary.classList.add("reveal", cls);

    const labelHtml = opts.label
      ? `<span class="dice-summary-label">${Utils.escHtml(opts.label)}</span>`
      : "";
    const breakdownHtml = opts.detail
      ? `<span class="dice-summary-breakdown">${Utils.escHtml(opts.detail)}</span>`
      : "";
    const poolHtml = `<span class="dice-summary-pool">${res.n} dé${res.n > 1 ? "s" : ""}</span>`;
    const big = `<span class="dice-summary-hits">${res.hits}</span><span class="dice-summary-hits-label">succès</span>`;
    let tag = "";
    if (res.critGlitch)
      tag = `<span class="dice-summary-tag crit">Échec critique</span>`;
    else if (res.glitch)
      tag = `<span class="dice-summary-tag glitch">Bévue</span>`;

    // Limite SR5 : signaler quand la Précision mord
    let limitTag = "";
    if (res.limited) {
      limitTag = `<span class="dice-summary-tag limit">Limité par la précision (${res.cappedFrom}→${res.limit})</span>`;
    }

    summary.innerHTML = `
      ${this._whoHtml(opts)}
      ${labelHtml}
      <div class="dice-summary-main">${big}</div>
      ${breakdownHtml}
      ${tag}
      ${limitTag}
      ${poolHtml}
      ${this._conjureInfoHtml(opts)}
      ${this._drainBlockHtml(opts.drain)}
      ${opts.drain ? this._spellRerollButtons(res, opts) : this._rerollBtnHtml()}`;
  },

  /** Ligne d'info d'une invocation (CH-M7e) : résistance de l'esprit et
      succès nets = services obtenus. */
  _conjureInfoHtml(opts) {
    if (!opts.conjure) return "";
    const c = opts.conjure;
    return `<span class="dice-summary-breakdown">Esprit résiste : ${c.spiritHits} · Services : <strong>${c.netHits}</strong></span>`;
  },

  /** Deux boutons de Seconde chance pour un lancer de sort (CH-M7e) : l'un
      relance le jet de sort, l'autre la résistance au Drain (au choix du MJ,
      comme dans les règles). Chacun débite 1 point d'Edge, se désactive si
      la ressource manque, si cette partie a déjà été relancée, ou sur échec
      critique. Gérés par MagicAction (data-action=reroll-cast/-drain). */
  _spellRerollButtons(mainRes, opts) {
    const d = opts.drain;
    const pnj = opts.pnjId ? this._hooks.resolve(opts.pnjId) : null;
    const action = App.editionModule && App.editionModule.rerollAction;
    if (!pnj || !action || !action.costAttr) return "";
    const attr = action.costAttr;
    const edge = (pnj.attrs && pnj.attrs[attr]) || 0;
    const hint = `<span class="dice-reroll-hint">${Utils.escHtml(attr)} ${edge}</span>`;
    // Libellé du jet principal selon le type d'action magique.
    const mainLabel = opts.kind === "conjuration" ? "Conjuration" : "sort";
    const mainDis = edge <= 0 || d.mainRerolled || mainRes.critGlitch;
    const drainDis = edge <= 0 || d.drainRerolled || d.res.critGlitch;
    return `<div class="dice-spell-rerolls">
      <button class="dice-reroll-btn" data-action="reroll-cast"${mainDis ? " disabled" : ""}>↻ ${Utils.escHtml(action.label)} — ${mainLabel}${hint}</button>
      <button class="dice-reroll-btn" data-action="reroll-drain"${drainDis ? " disabled" : ""}>↻ ${Utils.escHtml(action.label)} — Drain${hint}</button>
    </div>`;
  },

  _revealAnarchy(res, summary, opts) {
    const compMeta = {
      none: { cls: "good", label: "" },
      minor: { cls: "glitch", label: "Complication mineure" },
      critical: { cls: "crit", label: "Complication critique" },
      disaster: { cls: "crit", label: "Désastre" },
    }[res.complication];

    const cls =
      res.complication !== "none"
        ? compMeta.cls
        : res.hits > 0
          ? "good"
          : "zero";
    summary.classList.add("reveal", cls);

    const labelHtml = opts.label
      ? `<span class="dice-summary-label">${Utils.escHtml(opts.label)}</span>`
      : "";
    const poolDetailHtml = opts.detail
      ? `<span class="dice-summary-breakdown">${Utils.escHtml(opts.detail)}</span>`
      : "";
    const big = `<span class="dice-summary-hits">${res.hits}</span><span class="dice-summary-hits-label">succès</span>`;

    // Détail de la composition des succès
    const riskBonus = res.riskHits * 2;
    const breakdown =
      res.riskDice > 0
        ? `<span class="dice-summary-breakdown">${res.normalHits} norm${res.normalHits > 1 ? "aux" : "al"} + ${res.riskHits}×2 risque</span>`
        : "";

    // Tag de complication
    let tag = "";
    if (res.complication !== "none") {
      const tcls = res.complication === "minor" ? "glitch" : "crit";
      const onesTxt =
        res.rr > 0
          ? ` (${res.riskOnes} « 1 » − RR ${res.rr})`
          : ` (${res.riskOnes} « 1 »)`;
      tag = `<span class="dice-summary-tag ${tcls}">${compMeta.label}${onesTxt}</span>`;
    } else if (res.riskOnes > 0 && res.rr > 0) {
      // RR a tout absorbé : on le signale positivement
      tag = `<span class="dice-summary-tag safe">RR absorbe ${res.riskOnes} « 1 »</span>`;
    }

    // Avantage / désavantage : affichage clair (p.67)
    let advTag = "";
    if (res.adv === 1)
      advTag = `<span class="dice-summary-tag safe">Avantage — 4-6 = succès</span>`;
    else if (res.adv === -1)
      advTag = `<span class="dice-summary-tag glitch">Désavantage — seul 6 = succès</span>`;

    const poolHtml = `<span class="dice-summary-pool">${res.pool} dés · ${res.riskDice} de risque</span>`;

    summary.innerHTML = `
      ${this._whoHtml(opts)}
      ${labelHtml}
      <div class="dice-summary-main">${big}</div>
      ${poolDetailHtml}
      ${breakdown}
      ${advTag}
      ${tag}
      ${poolHtml}
      ${this._rerollBtnHtml()}`;
  },

  /** Drain par complication (Anarchy 2, CH-M7d) : un jet magique
      (Sorcellerie/Conjuration, opts.isMagic) qui produit une complication
      inflige au lanceur l'effet de Drain via le contrat d'édition
      (drainOnComplication). Blessure encaissée + persistée (onPnjChanged) ;
      complication mineure = simple rappel. Jamais sur une relance (la
      complication est figée, déjà appliquée au premier jet). */
  _applyAnarchyDrain(res, opts) {
    if (!opts.isMagic || res.rerolled) return;
    if (!res.anarchy || !res.complication || res.complication === "none") return;
    const pnj = opts.pnjId ? this._hooks.resolve(opts.pnjId) : null;
    if (!pnj) return;
    const mod = App.getEditionModule(pnj.edition);
    if (!mod || typeof mod.drainOnComplication !== "function") return;
    const drain = mod.drainOnComplication(pnj, res.complication);
    if (drain.wound) this._hooks.onPnjChanged(pnj);
    toast(drain.label);
  },

  /** Mémorise le dernier jet d'un sort lancé via jet de risque (Anarchy 2,
      CH-M7e) sur `sp._lastCast` — présenté sur la carte, effaçable, utile
      pour un sort maintenu. Même mémoire per-entité que `pnj.lastInit`. */
  _storeSpellCast(res, opts) {
    if (!opts.spellName || !opts.pnjId || res.init) return;
    const pnj = this._hooks.resolve(opts.pnjId);
    if (!pnj) return;
    const sp = (pnj.spells || []).find((s) => s && s.name === opts.spellName);
    if (!sp) return;
    sp._lastCast = { hits: res.hits };
    this._hooks.onPnjChanged(pnj);
  },
};
