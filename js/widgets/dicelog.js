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

  /** J1 : détail (sub) replié par défaut, déplié au tap — état de session
      uniquement (pas de Storage), clé = e.t (timestamp, déjà unique). */
  _expanded: new Set(),

  /** J2 : filtre actif — "all" | "alarm" | un nom de who. Session only
      (comme les facettes du Hub F1), reset à chaque ouverture du panneau. */
  _filter: "all",

  /** J3 : compteur d'alarmes (crit/glitch) ajoutées pendant que le panneau
      est fermé — session only, remis à zéro à l'ouverture. Alimente la
      pastille sur #dice-log-btn (≥641, seule largeur où il est visible) et
      le toast <641 (pas de slot topbar visible à cette largeur). */
  _unseen: 0,

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
      <div class="dice-log-filters" id="dice-log-filters"></div>
      <div class="dice-log-list" id="dice-log-list"></div>`;
    document.body.appendChild(panel);

    panel.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-action]");
      if (!btn) return;
      if (btn.dataset.action === "clear") this.clear();
      else if (btn.dataset.action === "export") this.export();
      else if (btn.dataset.action === "close") this.close();
      else if (btn.dataset.action === "log-expand") {
        const t = btn.dataset.t;
        if (this._expanded.has(t)) this._expanded.delete(t);
        else this._expanded.add(t);
        this.refresh();
      } else if (btn.dataset.action === "log-filter") {
        this._filter = btn.dataset.filter;
        this.refresh();
      }
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
    this._filter = "all";
    this._unseen = 0;
    this._renderBadge();
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
    // J3 : turn = clé de groupement (scène+round, opaque), turnLabel = numéro
    // affiché — injectés par DiceRoller.show, null/null hors combat.
    const e = {
      t: Date.now(),
      label: opts.label || "",
      who: opts.who || "",
      turn: opts.turn ?? null,
      turnLabel: opts.turnLabel ?? null,
    };
    if (res.init) {
      e.label = e.label || "Initiative";
      e.main = String(res.total);
      e.unit = "";
      const base = opts.detail ? `${opts.detail} (${res.base})` : res.base;
      e.sub = `${base} + ${res.dice}D6 [${res.faces.join(", ")}]`;
      e.cls = "good";
    } else if (res.opposed) {
      e.label = e.label || "Jet opposé";
      e.main = res.net > 0 ? `+${res.net}` : String(res.net);
      e.unit = "net";
      e.sub = `A : ${res.a.hits} succès — B : ${res.b.hits} succès`;
      e.tag =
        res.net > 0 ? "Camp A" : res.net < 0 ? "Camp B" : "Égalité";
      e.cls = res.net > 0 ? "good" : res.net < 0 ? "glitch" : "zero";
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
            : res.threshold != null
              ? `Seuil ${res.threshold} ${res.hits >= res.threshold ? "atteint" : "manqué"}`
              : "";
      e.cls = res.critGlitch
        ? "crit"
        : res.glitch
          ? "glitch"
          : res.threshold != null
            ? res.hits >= res.threshold
              ? "good"
              : "zero"
            : res.hits > 0
              ? "good"
              : "zero";
    }
    this.history.unshift(e);
    // Rétention protégée (J3) : le plafond n'ampute jamais le tour en cours.
    // Les entrées du round actif sont toujours les plus récentes (unshift),
    // donc contiguës en tête — les compter suffit à savoir jusqu'où étendre
    // la limite avant de tronquer la queue (entrées les plus anciennes).
    let protectedCount = 0;
    if (e.turn != null) {
      for (const h of this.history) {
        if (h.turn === e.turn) protectedCount++;
        else break;
      }
    }
    const keep = Math.max(this.HISTORY_MAX, protectedCount);
    if (this.history.length > keep) this.history.length = keep;
    this._save();
    if ((e.cls === "crit" || e.cls === "glitch") && !this._open) this._flash();
    this.refresh();
  },

  /** J3 : signale une alarme ajoutée pendant que le panneau est fermé.
      ≥641 : pastille/compteur sur #dice-log-btn (seule largeur où il est
      visible, cf. base.css). <641 : ce bouton est masqué (le journal s'ouvre
      depuis la feuille de dés mobile), donc toast() est le seul relais. */
  _flash() {
    this._unseen++;
    this._renderBadge();
    toast("Nouvelle alarme dans le journal des jets.", "warning");
  },

  _renderBadge() {
    const btn = document.getElementById("dice-log-btn");
    if (!btn) return;
    let badge = btn.querySelector(".dice-log-badge");
    if (!this._unseen) {
      if (badge) badge.remove();
      return;
    }
    if (!badge) {
      badge = document.createElement("span");
      badge.className = "dice-log-badge";
      btn.appendChild(badge);
    }
    badge.textContent = this._unseen > 9 ? "9+" : String(this._unseen);
  },

  /** J2 : rangée de puces Tout / Alarmes / <par personnage> — mêmes règles que
      les facettes du Hub F1 (valeurs distinctes présentes, filtre session-only,
      pas de branche App.edition, la sémantique cls est déjà neutre). */
  _renderFilters() {
    const box = document.getElementById("dice-log-filters");
    if (!box) return;
    if (!this.history.length) {
      box.innerHTML = "";
      return;
    }
    const whos = [...new Set(this.history.map((e) => e.who).filter(Boolean))];
    const chip = (filter, label) =>
      `<button class="hub-facet-chip${this._filter === filter ? " active" : ""}" data-action="log-filter" data-filter="${Utils.escHtml(filter)}">${Utils.escHtml(label)}</button>`;
    box.innerHTML =
      chip("all", "Tout") +
      chip("alarm", "Alarmes") +
      whos.map((w) => chip(w, w)).join("");
  },

  /** Re-rend la liste (appelé après chaque jet si le panneau existe). */
  refresh() {
    const list = document.getElementById("dice-log-list");
    if (!list) return;
    this._renderFilters();
    const entries = this.history.filter((e) => {
      if (this._filter === "all") return true;
      if (this._filter === "alarm") return e.cls === "crit" || e.cls === "glitch";
      return e.who === this._filter;
    });
    if (!entries.length) {
      list.innerHTML = `<div class="dice-log-empty">${this.history.length ? "Aucun jet ne correspond à ce filtre." : "Aucun jet pour l'instant."}</div>`;
      return;
    }
    const fmt = (t) => {
      const d = new Date(t);
      return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    };
    // J1 : cartes pré-attentives — crit (échec critique/désastre) et glitch
    // (bévue/complication mineure) sont les seules ALARMES (cf. sémantique
    // cls, dicelog.js:159-183) ; elles se détachent en carte pleine, tout le
    // reste reste en ligne compacte. Icône ⚠/✕ : réutilise le vocabulaire
    // déjà en place ailleurs (☠/⚑ du tracker de combat), pas un ajout de motif.
    const ICON = { crit: "✕", glitch: "⚠" };
    // J3 : en-têtes de tour sticky — les entrées d'un même round sont déjà
    // contiguës (unshift à l'enregistrement), un simple changement de valeur
    // suffit à repérer une frontière de groupe. liveTurn = round du tout
    // dernier jet enregistré (non filtré) : proxy du round « en cours ».
    const liveTurn = this.history[0] && this.history[0].turn != null ? this.history[0].turn : null;
    const header = (e) =>
      e.turn == null
        ? `<div class="dice-log-turn-header">Hors combat</div>`
        : `<div class="dice-log-turn-header">Tour ${e.turnLabel}${e.turn === liveTurn ? " en cours" : ""}</div>`;
    let prevTurn;
    const parts = [];
    entries.forEach((e) => {
      if (e.turn !== prevTurn) {
        parts.push(header(e));
        prevTurn = e.turn;
      }
      parts.push(this._itemHtml(e, fmt, ICON));
    });
    list.innerHTML = parts.join("");
  },

  /** Rendu d'une entrée (extrait de refresh en J3 pour intercaler les
      en-têtes de tour sans dupliquer le HTML de la carte/ligne). */
  _itemHtml(e, fmt, ICON) {
    const isCard = e.cls === "crit" || e.cls === "glitch";
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
    const icon = isCard ? `<span class="dice-log-icon" aria-hidden="true">${ICON[e.cls]}</span>` : "";
    // Détail replié par défaut : bouton "▸ Détail" à la place du sub brut,
    // le pool complet reste à un tap (outil de confiance à la demande).
    const expanded = this._expanded.has(String(e.t));
    const detail = expanded
      ? `<span class="dice-log-sub">${Utils.escHtml(e.sub)}</span>
         <button class="dice-log-detail-btn" data-action="log-expand" data-t="${e.t}">▾ Replier</button>`
      : `<button class="dice-log-detail-btn" data-action="log-expand" data-t="${e.t}">▸ Détail</button>`;
    return `<div class="dice-log-item ${e.cls}${isCard ? " is-card" : ""}">
      <span class="dice-log-time">${fmt(e.t)}</span>
      ${icon}
      <div class="dice-log-body">
        ${label}
        ${detail}
        ${tag}
      </div>
      <span class="dice-log-main">${e.main}<small>${e.unit || ""}</small></span>
    </div>`;
  },
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => DiceLog.init());
} else {
  DiceLog.init();
}
