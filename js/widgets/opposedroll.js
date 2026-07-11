"use strict";

/* ============================================================
   JET OPPOSÉ + SEUIL (CH-M3) — outil MJ libre, indépendant de tout
   PNJ : deux réserves à comparer (test opposé, SR5 p.49 — pas de
   seuil sur un test opposé) ou une réserve seule face à un seuil
   fixé par le MJ. Panneau autonome (calqué sur Notepad/DiceLog),
   pas de persistance : c'est un scratch pad de jet, pas une donnée.

   openForDrain (CH-M7b) réutilise le même panneau en mode seuil verrouillé
   (Camp B désactivé) et rappelle `opts.onResult(hits)` après le jet — ce
   widget reste sans connaissance de PNJ, l'appelant (diceroller.js) décide
   quoi faire du résultat (ex. appliquer les dégâts de Drain).
   ============================================================ */
const OpposedRoll = {
  _open: false,

  /** Contexte du seul appel courant (CH-M7b) : { onResult } quand ouvert
      via openForDrain, sinon null. Jamais persisté — un panneau à la fois. */
  _current: null,

  _ensure() {
    if (document.getElementById("opposed-panel")) return;
    const p = document.createElement("div");
    p.id = "opposed-panel";
    p.className = "risk-panel-overlay";
    p.setAttribute("hidden", "");
    p.innerHTML = `
      <div class="risk-panel" role="dialog" aria-label="Jet opposé / seuil">
        <div class="risk-panel-head">
          <span class="risk-panel-title" id="opposed-title">Jet opposé / seuil</span>
          <button class="risk-panel-close" id="opposed-close" aria-label="Fermer">✕</button>
        </div>
        <div class="opposed-row">
          <label class="opposed-label" for="opposed-pool-a">Camp A</label>
          <input class="opposed-input" type="number" id="opposed-pool-a" min="1" max="40" value="6">
        </div>
        <div class="opposed-row">
          <label class="opposed-label" for="opposed-pool-b">Camp B <span class="opposed-hint" id="opposed-pool-b-hint">(0 = jet de seuil)</span></label>
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
    document.getElementById("opposed-title").textContent = "Jet opposé / seuil";
    const poolB = document.getElementById("opposed-pool-b");
    poolB.disabled = false;
    poolB.value = "0";
    document.getElementById("opposed-pool-b-hint").textContent = "(0 = jet de seuil)";
    this._current = null;
    const p = document.getElementById("opposed-panel");
    p.removeAttribute("hidden");
    void p.offsetWidth;
    p.classList.add("show");
    this._open = true;
    document.getElementById("opposed-result").innerHTML = "";
  },

  /** Ouverture dédiée au Drain (CH-M7b) : Camp A = réserve de résistance,
      Seuil = VD calculée (Magic.drainValue), Camp B verrouillé à 0 — un
      Drain n'est jamais un test opposé (cf. livre de règles). `opts.onResult`
      est rappelé avec les succès obtenus, pour que l'appelant (diceroller.js)
      applique les dégâts résultants — ce widget reste indépendant des PNJ. */
  openForDrain(poolResist, dv, opts = {}) {
    this._ensure();
    document.getElementById("opposed-title").textContent = opts.who
      ? `${opts.who} — ${opts.label || "Drain"}`
      : opts.label || "Drain";
    document.getElementById("opposed-pool-a").value = String(Utils.clamp(poolResist, 1, 40));
    const poolB = document.getElementById("opposed-pool-b");
    poolB.value = "0";
    poolB.disabled = true;
    document.getElementById("opposed-pool-b-hint").textContent = "(verrouillé — un Drain n'est jamais un test opposé)";
    document.getElementById("opposed-threshold").value = String(Utils.clamp(dv, 0, 40));
    this._current = { onResult: opts.onResult || null };

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
      if (this._current && this._current.onResult) this._current.onResult(res.hits);
    }
  },
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => OpposedRoll.init());
} else {
  OpposedRoll.init();
}
