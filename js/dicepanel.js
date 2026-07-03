"use strict";

/* ============================================================
   DICE PANEL — lanceur de dés mobile (FAB + bottom sheet)
   S'appuie sur le moteur Dice (utils.js) : le résultat passe par
   l'animation plein écran existante (Dice.rollPool → _animate),
   ou par le panneau de prise de risque en Anarchy 2.0.
   ============================================================ */
const DicePanel = {
  count: 6,
  _holdTimer: null,
  _holdInterval: null,

  /** Applique la réserve par défaut des préférences. */
  applyPrefs() {
    if (
      typeof Settings !== "undefined" &&
      Settings.getDicePrefs
    ) {
      this.count = Settings.getDicePrefs().defaultCount;
      this._renderCount();
    }
  },

  init() {
    this.applyPrefs();
    const overlay = document.getElementById("dice-sheet-overlay");
    if (!overlay) return;

    // Tap sur le fond → fermeture
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) this.close();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") this.close();
    });

    // Steppers : tap simple + maintien pour répétition
    overlay.querySelectorAll("[data-dice-step]").forEach((btn) => {
      const delta = parseInt(btn.getAttribute("data-dice-step"), 10) || 0;
      btn.addEventListener("click", () => {
        // Un maintien a déjà incrémenté : on ignore le click de relâchement
        if (this._held) {
          this._held = false;
          return;
        }
        this.step(delta);
      });
      btn.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        this._startHold(delta);
      });
      ["pointerup", "pointerleave", "pointercancel"].forEach((ev) =>
        btn.addEventListener(ev, () => this._stopHold()),
      );
      // Le click initial suffit : on évite le double pas au relâchement
      btn.addEventListener("contextmenu", (e) => e.preventDefault());
    });

    this._renderCount();
  },

  /* ---- Maintien appuyé : répétition accélérée après un délai ---- */
  _startHold(delta) {
    this._stopHold();
    this._held = false;
    this._holdTimer = setTimeout(() => {
      this._holdInterval = setInterval(() => {
        this._held = true;
        this.step(delta);
      }, 90);
    }, 450);
  },
  _stopHold() {
    clearTimeout(this._holdTimer);
    clearInterval(this._holdInterval);
    this._holdTimer = null;
    this._holdInterval = null;
  },

  open() {
    const overlay = document.getElementById("dice-sheet-overlay");
    if (!overlay) return;
    this._renderCount();
    overlay.classList.add("open");
    // double rAF pour laisser display:flex s'appliquer avant la transition
    requestAnimationFrame(() =>
      requestAnimationFrame(() => overlay.classList.add("show")),
    );
  },

  close() {
    const overlay = document.getElementById("dice-sheet-overlay");
    if (!overlay || !overlay.classList.contains("open")) return;
    this._stopHold();
    overlay.classList.remove("show");
    setTimeout(() => overlay.classList.remove("open"), 220);
  },

  step(delta) {
    this.count = Utils.clamp(this.count + delta, 1, 40);
    this._renderCount();
  },

  _renderCount() {
    const el = document.getElementById("dice-sheet-count");
    if (el) el.textContent = this.count;
  },

  roll() {
    this.close();
    // Anarchy 2.0 : ce lanceur passe par le panneau de prise de risque
    if (typeof App !== "undefined" && App.edition === "anarchy") {
      Dice.openRiskPanel(this.count, { label: "" });
      return;
    }
    // L'animation plein écran existante affiche le résultat
    Dice.rollPool(this.count);
  },
};

/* ============================================================
   DICE LOG — journal des jets de la session
   Alimenté par Dice._logRoll (utils.js). Un seul panneau,
   ancré sous la topbar sur desktop, en feuille basse sur mobile.
   ============================================================ */
const DiceLog = {
  _open: false,

  _ensure() {
    if (document.getElementById("dice-log-panel")) return;
    const backdrop = document.createElement("div");
    backdrop.id = "dice-log-backdrop";
    backdrop.addEventListener("click", () => this.close());
    document.body.appendChild(backdrop);

    const panel = document.createElement("div");
    panel.id = "dice-log-panel";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", "Journal des jets");
    panel.innerHTML = `
      <div class="dice-log-head">
        <span class="dice-log-title">Journal des jets</span>
        <button class="btn-icon-tiny" onclick="DiceLog.clear()" title="Vider le journal">⌫</button>
        <button class="btn-icon-tiny" onclick="DiceLog.close()" title="Fermer" aria-label="Fermer">✕</button>
      </div>
      <div class="dice-log-list" id="dice-log-list"></div>`;
    document.body.appendChild(panel);

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") this.close();
    });
  },

  toggle() {
    this._open ? this.close() : this.open();
  },

  open() {
    this._ensure();
    // Sur mobile, le journal remplace la feuille de dés si elle est ouverte
    if (typeof DicePanel !== "undefined") DicePanel.close();
    this.refresh();
    document.getElementById("dice-log-backdrop").classList.add("open");
    document.getElementById("dice-log-panel").classList.add("open");
    this._open = true;
  },

  close() {
    if (!this._open) return;
    const p = document.getElementById("dice-log-panel");
    const b = document.getElementById("dice-log-backdrop");
    if (p) p.classList.remove("open");
    if (b) b.classList.remove("open");
    this._open = false;
  },

  clear() {
    Dice.history.length = 0;
    this.refresh();
  },

  /** Re-rend la liste (appelé après chaque jet si le panneau existe). */
  refresh() {
    const list = document.getElementById("dice-log-list");
    if (!list) return;
    if (!Dice.history.length) {
      list.innerHTML = `<div class="dice-log-empty">Aucun jet pour l'instant.</div>`;
      return;
    }
    const fmt = (t) => {
      const d = new Date(t);
      return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    };
    list.innerHTML = Dice.history
      .map((e) => {
        const who = e.who
          ? `<span class="dice-log-who">${Dice._escSummary(e.who)}</span> `
          : "";
        const label = e.label
          ? `<span class="dice-log-label">${who}${Dice._escSummary(e.label)}</span>`
          : e.who
            ? `<span class="dice-log-label">${who}</span>`
            : `<span class="dice-log-label dim">Jet libre</span>`;
        const tag = e.tag
          ? `<span class="dice-log-tag ${e.cls}">${Dice._escSummary(e.tag)}</span>`
          : "";
        return `<div class="dice-log-item ${e.cls}">
          <span class="dice-log-time">${fmt(e.t)}</span>
          <div class="dice-log-body">
            ${label}
            <span class="dice-log-sub">${Dice._escSummary(e.sub)}</span>
            ${tag}
          </div>
          <span class="dice-log-main">${e.main}<small>${e.unit || ""}</small></span>
        </div>`;
      })
      .join("");
  },
};

// Initialisation au chargement du DOM
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => DicePanel.init());
} else {
  DicePanel.init();
}
