"use strict";

/* ============================================================
   DICE LOG — journal des jets de la session
   Alimenté par Dice._animate (dice.js) via DiceLog.record().
   ============================================================ */
const DiceLog = {
  _open: false,

  /* ---- Journal des jets (persistant, plus récent en premier) ---- */
  history: [],
  HISTORY_MAX: 100,

  /** Persistance globale (commune aux 3 éditions, comme les préférences de
      dés) : le journal survit au F5. Passe par Storage — jamais de
      localStorage direct. */
  _save() {
    Storage.setGlobal("diceLog", this.history);
  },

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
        <button class="btn-icon-tiny" data-action="export" title="Exporter le journal">⤓</button>
        <button class="btn-icon-tiny" data-action="clear" title="Vider le journal">⌫</button>
        <button class="btn-icon-tiny" data-action="close" title="Fermer" aria-label="Fermer">✕</button>
      </div>
      <div class="dice-log-list" id="dice-log-list"></div>`;
    document.body.appendChild(panel);

    panel.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-action]");
      if (!btn) return;
      if (btn.dataset.action === "clear") this.clear();
      else if (btn.dataset.action === "export") this.export();
      else if (btn.dataset.action === "close") this.close();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") this.close();
    });
  },

  /** Écoute du bouton d'ouverture dans la barre du haut (index.html) et
      restaure le journal persisté (survit au F5). */
  init() {
    this.history = Storage.getGlobal("diceLog", []);
    const btn = document.getElementById("dice-log-btn");
    if (btn) btn.addEventListener("click", () => this.toggle());
  },

  toggle() {
    this._open ? this.close() : this.open();
  },

  open() {
    this._ensure();
    // Sur mobile, le journal remplace la feuille de dés si elle est ouverte
    DicePanel.close();
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
    this.history.length = 0;
    this._save();
    this.refresh();
  },

  /** Exporte le journal en fichier texte lisible (patron Blob/download de
      backup.js). Une ligne par jet, plus récent en premier. */
  export() {
    if (!this.history.length) {
      toast("Journal vide — rien à exporter.");
      return;
    }
    const stamp = (t) => new Date(t).toLocaleString("fr-FR");
    const lines = this.history.map((e) => {
      const who = e.who ? `${e.who} · ` : "";
      const label = e.label || "Jet libre";
      const tag = e.tag ? ` [${e.tag}]` : "";
      return `${stamp(e.t)} — ${who}${label} : ${e.main} ${e.unit || ""} (${e.sub})${tag}`
        .replace(/\s+/g, " ")
        .trim();
    });
    const blob = new Blob([lines.join("\n") + "\n"], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const date = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `shadowherds-jets-${date}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast(`Journal exporté : ${this.history.length} jets.`);
  },

  /** Enregistre un jet dans le journal (appelé par Dice._animate après chaque jet). */
  record(res, opts = {}) {
    const e = { t: Date.now(), label: opts.label || "", who: opts.who || "" };
    if (res.init) {
      e.label = e.label || "Initiative";
      e.main = String(res.total);
      e.unit = "";
      const base = opts.detail ? `${opts.detail} (${res.base})` : res.base;
      e.sub = `${base} + ${res.dice}D6 [${res.faces.join(", ")}]`;
      e.cls = "good";
    } else if (res.anarchy) {
      e.main = String(res.hits);
      e.unit = `succès`;
      const advSuf = res.adv === 1 ? " · avantage" : res.adv === -1 ? " · désavantage" : "";
      const detailPfx = opts.detail ? `${opts.detail} = ` : "";
      e.sub = `${detailPfx}${res.pool} dés · ${res.riskDice} de risque${advSuf}`;
      const compLabel = {
        minor: "Complication mineure",
        critical: "Complication critique",
        disaster: "Désastre",
      }[res.complication];
      e.tag = compLabel || "";
      e.cls =
        res.complication === "none"
          ? res.hits > 0
            ? "good"
            : "zero"
          : res.complication === "minor"
            ? "glitch"
            : "crit";
    } else {
      e.main = String(res.hits);
      e.unit = `succès`;
      e.sub = opts.detail ? `${opts.detail} = ${res.n} dés` : `${res.n} dés`;
      e.tag = res.critGlitch
        ? "Échec critique"
        : res.glitch
          ? "Bévue"
          : res.limited
            ? `Limité (${res.cappedFrom}→${res.limit})`
            : "";
      e.cls = res.critGlitch
        ? "crit"
        : res.glitch
          ? "glitch"
          : res.hits > 0
            ? "good"
            : "zero";
    }
    this.history.unshift(e);
    if (this.history.length > this.HISTORY_MAX)
      this.history.length = this.HISTORY_MAX;
    this._save();
    this.refresh();
  },

  /** Re-rend la liste (appelé après chaque jet si le panneau existe). */
  refresh() {
    const list = document.getElementById("dice-log-list");
    if (!list) return;
    if (!this.history.length) {
      list.innerHTML = `<div class="dice-log-empty">Aucun jet pour l'instant.</div>`;
      return;
    }
    const fmt = (t) => {
      const d = new Date(t);
      return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    };
    list.innerHTML = this.history
      .map((e) => {
        const who = e.who
          ? `<span class="dice-log-who">${Utils.escHtml(e.who)}</span> `
          : "";
        const label = e.label
          ? `<span class="dice-log-label">${who}${Utils.escHtml(e.label)}</span>`
          : e.who
            ? `<span class="dice-log-label">${who}</span>`
            : `<span class="dice-log-label dim">Jet libre</span>`;
        const tag = e.tag
          ? `<span class="dice-log-tag ${e.cls}">${Utils.escHtml(e.tag)}</span>`
          : "";
        return `<div class="dice-log-item ${e.cls}">
          <span class="dice-log-time">${fmt(e.t)}</span>
          <div class="dice-log-body">
            ${label}
            <span class="dice-log-sub">${Utils.escHtml(e.sub)}</span>
            ${tag}
          </div>
          <span class="dice-log-main">${e.main}<small>${e.unit || ""}</small></span>
        </div>`;
      })
      .join("");
  },
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => DiceLog.init());
} else {
  DiceLog.init();
}
