"use strict";

/* ============================================================
   JET OPPOSÉ + SEUIL — outil MJ libre, indépendant de tout
   PNJ : deux réserves à comparer (test opposé, SR5 p.49 — pas de
   seuil sur un test opposé) ou une réserve seule face à un seuil
   fixé par le MJ. Panneau autonome (calqué sur Notepad/DiceLog),
   pas de persistance : c'est un scratch pad de jet, pas une donnée.
   ============================================================ */
import { Dice } from "../../rules/dice.js";
import { DiceLog } from "./dicelog.js";
import { Utils } from "../../core/utils.js";

export const OpposedRoll = {
  _open: false,

  _ensure() {
    if (document.getElementById("opposed-panel")) return;
    const p = document.createElement("div");
    p.id = "opposed-panel";
    p.className = "risk-panel-overlay";
    p.setAttribute("hidden", "");
    p.innerHTML = `
      <div class="risk-panel" role="dialog" aria-label="Jet opposé / seuil">
        <div class="risk-panel-head">
          <span class="risk-panel-title">Jet opposé / seuil</span>
          <button class="risk-panel-close" id="opposed-close" aria-label="Fermer">✕</button>
        </div>
        <div class="opposed-row">
          <label class="opposed-label" for="opposed-pool-a">Camp A</label>
          <input class="opposed-input" type="number" id="opposed-pool-a" min="1" max="40" value="6">
        </div>
        <div class="opposed-row">
          <label class="opposed-label" for="opposed-pool-b">Camp B <span class="opposed-hint">(0 = jet de seuil)</span></label>
          <input class="opposed-input" type="number" id="opposed-pool-b" min="0" max="40" value="0">
        </div>
        <div class="opposed-row">
          <label class="opposed-label" for="opposed-threshold">Seuil <span class="opposed-hint">(ignoré si Camp B > 0)</span></label>
          <input class="opposed-input" type="number" id="opposed-threshold" min="0" max="40" value="0">
        </div>
        <div class="opposed-result" id="opposed-result"></div>
        <button class="risk-roll-btn" id="opposed-roll-btn">Lancer</button>
      </div>`;
    document.body.appendChild(p);

    p.addEventListener("click", (e) => {
      if (e.target === p) this.close();
    });
    document.getElementById("opposed-close").addEventListener("click", () => this.close());
    document.getElementById("opposed-roll-btn").addEventListener("click", () => this.roll());
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this._open) this.close();
    });
  },

  init() {
    const btn = document.getElementById("opposed-roll-open-btn");
    if (btn) btn.addEventListener("click", () => this.open());
  },

  open() {
    this._ensure();
    const p = document.getElementById("opposed-panel");
    p.removeAttribute("hidden");
    void p.offsetWidth;
    p.classList.add("show");
    this._open = true;
    document.getElementById("opposed-result").innerHTML = "";
  },

  close() {
    const p = document.getElementById("opposed-panel");
    if (!p) return;
    p.classList.remove("show");
    clearTimeout(p._t);
    p._t = setTimeout(() => p.setAttribute("hidden", ""), 200);
    this._open = false;
  },

  /** Camp B > 0 : test opposé (pas de seuil, cf. livre de règles).
      Sinon : test de seuil sur Camp A. */
  roll() {
    const poolA = Utils.clamp(parseInt(document.getElementById("opposed-pool-a").value, 10) || 0, 1, 40);
    const poolB = Utils.clamp(parseInt(document.getElementById("opposed-pool-b").value, 10) || 0, 0, 40);
    const threshold = Utils.clamp(parseInt(document.getElementById("opposed-threshold").value, 10) || 0, 0, 40);
    const out = document.getElementById("opposed-result");

    if (poolB > 0) {
      const res = Dice.computeOpposedRoll(poolA, poolB);
      DiceLog.record(res, { label: "Jet opposé" });
      const winner = res.net > 0 ? "Camp A" : res.net < 0 ? "Camp B" : "Égalité";
      out.className = `opposed-result ${res.net > 0 ? "good" : res.net < 0 ? "glitch" : "zero"}`;
      out.innerHTML = `
        <span class="opposed-result-main">A ${res.a.hits} — B ${res.b.hits}</span>
        <span class="opposed-result-sub">${winner}${res.net !== 0 ? ` (marge ${Math.abs(res.net)})` : ""}</span>`;
    } else {
      const res = Dice.computeRoll(poolA);
      res.threshold = threshold;
      DiceLog.record(res, { label: "Jet de seuil" });
      const success = res.hits >= threshold;
      out.className = `opposed-result ${success ? "good" : "zero"}`;
      out.innerHTML = `
        <span class="opposed-result-main">${res.hits} succès</span>
        <span class="opposed-result-sub">Seuil ${threshold} — ${success ? "atteint" : "manqué"}</span>`;
    }
  },
};

/* Auto-init APRÈS le reste des scripts : `init()` dépend de modules de
   couche haute (Settings…) chargés plus loin dans index.html. Ne pas
   tester `readyState === "loading"` — il vaut déjà "interactive" quand
   les scripts différés s'exécutent, l'init partait donc trop tôt.
   DOMContentLoaded, lui, ne se déclenche qu'une fois TOUS les scripts
   différés exécutés. */
if (document.readyState === "complete") {
  OpposedRoll.init();
} else {
  document.addEventListener("DOMContentLoaded", () => OpposedRoll.init(), { once: true });
}

// Pont couche 4 (migration modules ES) — retiré en fin de migration.
window.OpposedRoll = OpposedRoll;
