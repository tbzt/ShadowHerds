"use strict";

/* ============================================================
   DICE PANEL — lanceur de dés mobile (FAB + bottom sheet)
   S'appuie sur DiceRoller (diceroller.js) : le résultat passe par
   l'animation plein écran existante (DiceRoller.rollPool → show),
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
      DiceRoller.openRiskPanel(this.count, { label: "" });
      return;
    }
    // L'animation plein écran existante affiche le résultat
    DiceRoller.rollPool(this.count);
  },
};

// Initialisation au chargement du DOM
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => DicePanel.init());
} else {
  DicePanel.init();
}
