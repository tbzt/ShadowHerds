"use strict";

/* ============================================================
   DICE LOG — journal des jets de la session
   Alimenté par Dice._animate (dice.js) via DiceLog.record().
   ============================================================ */
import { DicePanel } from "./dicepanel.js";
import { Storage } from "../../core/storage.js";
import { Utils } from "../../core/utils.js";

export const DiceLog = {
  _open: false,

  /* ---- Journal des jets (persistant, plus récent en premier) ---- */
  history: [],
  HISTORY_MAX: 100,

  /** J1 : détail (sub) replié par défaut, déplié au tap — état de session
      uniquement (pas de Storage), clé = e.t (timestamp, déjà unique). */
  _expanded: new Set(),

  /** J2 : filtre actif — "all" | "alarm" | "pinned" | un nom de who | R3
      `_ENCOUNTER_FILTER`. Session only (comme les facettes du Hub), reset
      à chaque ouverture du panneau. */
  _filter: "all",

  /** R3 : valeur de `_filter` réservée pour « cette rencontre » — préfixée
      pour ne jamais collisionner avec un nom de personnage (`who`). */
  _ENCOUNTER_FILTER: "__encounter__",

  /** Loi 5 (grammaire d'interaction) : nombre de puces « personnage » visibles
      d'emblée dans `.dice-log-filters`, triées par activité — donnée de jeu
      (les plus actifs de la séance), jamais un seuil de largeur d'écran. */
  WHO_VISIBLE_MAX: 5,

  /** Session only (comme `_filter`) : déplie la queue de puces « personnage »
      au-delà de `WHO_VISIBLE_MAX`. Reset à chaque ouverture du panneau. */
  _filtersExpanded: false,

  /** J3 : compteur d'alarmes (crit/glitch) ajoutées pendant que le panneau
      est fermé — session only, remis à zéro à l'ouverture. Alimente la
      pastille sur #dice-log-btn (≥641, seule largeur où il est visible) et
      le toast <641 (pas de slot topbar visible à cette largeur). */
  _unseen: 0,

  /** J4 : entrées dont le formulaire de note est ouvert — session only,
      clé = e.t (comme _expanded). */
  _noteEditing: new Set(),

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
        <button class="btn-icon-tiny" data-action="export" title="Exporter le journal"><svg class="icon icon-sm" aria-hidden="true"><use href="#ic-export"></use></svg></button>
        <button class="btn-icon-tiny" data-action="clear" title="Vider le journal">⌫</button>
        <button class="btn-icon-tiny" data-action="close" title="Fermer" aria-label="Fermer">✕</button>
      </div>
      <div class="dice-log-summary" id="dice-log-summary"></div>
      <div class="dice-log-filters" id="dice-log-filters"></div>
      <div class="dice-log-list" id="dice-log-list"></div>`;
    document.body.appendChild(panel);

    panel.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-action]");
      if (!btn) return;
      if (btn.dataset.action === "clear") this.clear();
      else if (btn.dataset.action === "export") this.export();
      else if (btn.dataset.action === "close") this.close();
      else if (btn.dataset.action === "summary-toggle") {
        Storage.setGlobal("diceLogSummaryOpen", !this._summaryOpen());
        this.refresh();
      }
      else if (btn.dataset.action === "log-expand") {
        const t = btn.dataset.t;
        if (this._expanded.has(t)) this._expanded.delete(t);
        else this._expanded.add(t);
        this.refresh();
      } else if (btn.dataset.action === "log-filter") {
        this._filter = btn.dataset.filter;
        this.refresh();
      } else if (btn.dataset.action === "log-filters-more") {
        this._filtersExpanded = !this._filtersExpanded;
        this.refresh();
      } else if (btn.dataset.action === "log-pin") {
        const entry = this.history.find((h) => String(h.t) === btn.dataset.t);
        if (entry) {
          entry.pinned = !entry.pinned;
          this._save();
          this.refresh();
        }
      } else if (btn.dataset.action === "log-note-open") {
        this._noteEditing.add(btn.dataset.t);
        this.refresh();
      } else if (btn.dataset.action === "log-note-clear") {
        const entry = this.history.find((h) => String(h.t) === btn.dataset.t);
        if (entry) {
          entry.note = null;
          this._save();
          this.refresh();
        }
      }
    });

    // J4 : soumission du formulaire de note (Entrée dans le champ) — un seul
    // écouteur délégué, comme le reste de la délégation data-action du panel.
    panel.addEventListener("submit", (e) => {
      const form = e.target.closest('[data-action="log-note-form"]');
      if (!form) return;
      e.preventDefault();
      const t = form.dataset.t;
      const input = form.querySelector(".dice-log-note-input");
      const text = (input && input.value || "").trim();
      const entry = this.history.find((h) => String(h.t) === t);
      if (entry && text) entry.note = text.slice(0, 140);
      this._noteEditing.delete(t);
      this._save();
      this.refresh();
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
    // R3 : une rencontre ouverte (Encounter.restore) est le filtre par
    // défaut — « rouvrir une rencontre applique ce filtre » (R4).
    this._filter =
      typeof Encounter !== "undefined" && Encounter.activeDossierId
        ? this._ENCOUNTER_FILTER
        : "all";
    this._filtersExpanded = false;
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
      const tex = this._textureText(e.texture);
      const texStr = tex ? ` {${tex}}` : "";
      const tag = e.tag ? ` [${e.tag}]` : "";
      return `${stamp(e.t)} — ${who}${label} : ${e.main} ${e.unit || ""} (${e.sub})${texStr}${tag}`
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
      // J4 : champs additifs, jamais de migration de schéma Storage.
      pinned: false,
      note: null,
      // R3 (Ranger la run) : tague le jet avec la rencontre ouverte au
      // moment du jet, si une rencontre est active (Encounter.restore) —
      // champ additif, jamais de migration.
      dossierId: (typeof Encounter !== "undefined" && Encounter.activeDossierId) || null,
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
      // V6 : la gravité de complication EST la texture d'édition d'Anarchy
      // (échelle mineure→critique→désastre), pas un tag string parmi d'autres.
      // Lue du champ neutre `res.complication` (aucune branche App.edition).
      if (res.complication && res.complication !== "none") {
        e.texture = { kind: "complication", sev: res.complication };
      }
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
      // V6 : textures d'édition, lues de champs neutres de `res` (aucune branche
      // App.edition). La Limite (`limited`) n'est posée que sur le chemin SR5
      // (plafond de Précision) ; l'Edge pré-jet (`edgeDice`) sur SR5 « Repousser
      // les limites » ET SR6 — c'est le PHÉNOMÈNE (Edge dépensé + six explosifs)
      // qui porte le sens, pas l'édition. Orthogonales aux tags d'ALARME
      // (complication/échec critique) qui, eux, portent la sémantique cls.
      if (res.limited) {
        e.texture = { kind: "limit", from: res.cappedFrom, to: res.limit };
      } else if (res.edgeDice) {
        // Terme VF de la ressource, fourni par le module d'édition (« Chance »
        // en SR5, « Atout » en SR6) — jamais « Edge », jamais une branche
        // App.edition. Capturé au jet (mono-édition) ; repli sur l'abréviation
        // du contrat si `resourceLabel` est absent.
        const spec = (typeof App !== "undefined" && App.editionModule && App.editionModule.preRollEdge) || null;
        const term = (spec && (spec.resourceLabel || spec.costAttr)) || "";
        e.texture = { kind: "edge", dice: res.edgeDice, sixes: res.edgeSixes || 0, term };
      }
      e.tag = res.critGlitch
        ? "Échec critique"
        : res.glitch
          ? // Terme VF de la complication de pool, lu du module d'édition
            // (« Complication » SR5/SR6, jamais « Bévue »). Mono-édition, même
            // convention que le terme de ressource plus haut (App.editionModule).
            (typeof App !== "undefined" &&
              App.editionModule &&
              App.editionModule.complicationModel &&
              App.editionModule.complicationModel.glitchLabel) ||
            "Complication"
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
    // Rétention protégée (J3 + J4) : le plafond n'ampute jamais le tour en
    // cours NI un jet épinglé. Le tour actif est toujours contigu en tête
    // (unshift), mais les épingles peuvent être dispersées n'importe où dans
    // l'historique — on purge donc en partant de la queue (le plus ancien),
    // en sautant tout ce qui est protégé, jusqu'à repasser sous le plafond
    // (ou à court d'entrées non protégées : un pin illimité reste possible).
    if (this.history.length > this.HISTORY_MAX) {
      for (let i = this.history.length - 1; i >= 0 && this.history.length > this.HISTORY_MAX; i--) {
        const h = this.history[i];
        if (h.pinned) continue;
        if (e.turn != null && h.turn === e.turn) continue;
        this.history.splice(i, 1);
      }
    }
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

  /** Résumé de séance : pli mémorisé en Storage global (comme les préférences
      de dés / le journal lui-même) — jamais de localStorage direct. Replié
      par défaut. */
  _summaryOpen() {
    return Storage.getGlobal("diceLogSummaryOpen", false);
  },

  /** Bandeau « Résumé de séance » repliable en tête du panneau, recalculé à la
      volée sur tout l'historique — aucune donnée neuve, aucun nouvel écran.
      La sémantique `cls` (good/zero/glitch/crit) est déjà neutre aux 4 éditions ;
      le champ `unit` l'est aussi et partitionne les entrées sans branche
      `App.edition` : "succès" = vrai test (normal/Anarchy), "" = initiative,
      "net" = jet opposé. On n'agrège le taux de réussite et le MVP que sur les
      vrais tests (init & opposés ne sont pas des tests de compétence). */
  _summaryBand() {
    const box = document.getElementById("dice-log-summary");
    if (!box) return;
    if (!this.history.length) {
      box.innerHTML = "";
      return;
    }
    const total = this.history.length;
    // Alarmes : même prédicat que la puce « Alarmes » (cls crit/glitch), pour
    // que le compteur du résumé colle exactement au filtre.
    const alarms = this.history.filter(
      (e) => e.cls === "crit" || e.cls === "glitch"
    ).length;
    const tests = this.history.filter((e) => e.unit === "succès");
    const good = tests.filter((e) => e.cls === "good").length;
    const zero = tests.filter((e) => e.cls === "zero").length;
    const rate = good + zero ? Math.round((good / (good + zero)) * 100) : null;
    // MVP : le `who` cumulant le plus de « good » parmi les tests ; ex æquo →
    // celui qui a le plus de jets.
    const byWho = {};
    tests.forEach((e) => {
      if (!e.who) return;
      const w = (byWho[e.who] = byWho[e.who] || { good: 0, rolls: 0 });
      if (e.cls === "good") w.good++;
      w.rolls++;
    });
    let mvp = null;
    let best = null;
    Object.keys(byWho).forEach((w) => {
      const s = byWho[w];
      if (!s.good) return;
      if (!best || s.good > best.good || (s.good === best.good && s.rolls > best.rolls)) {
        best = s;
        mvp = w;
      }
    });
    const open = this._summaryOpen();
    const stat = (val, unit) =>
      `<span class="dice-log-stat"><b>${val}</b>${unit ? `<small>${unit}</small>` : ""}</span>`;
    const body = open
      ? `<div class="dice-log-summary-body">
          ${stat(total, total > 1 ? "jets" : "jet")}
          ${stat(rate == null ? "—" : rate + "%", "réussite")}
          ${stat(alarms, alarms > 1 ? "alarmes" : "alarme")}
          ${mvp ? `<span class="dice-log-stat">MVP <b>${Utils.escHtml(mvp)}</b></span>` : ""}
        </div>`
      : "";
    box.innerHTML =
      `<button class="dice-log-summary-toggle" data-action="summary-toggle" aria-expanded="${open}">
        <span class="dice-log-summary-chevron${open ? " is-open" : ""}" aria-hidden="true"><svg class="icon icon-sm" aria-hidden="true"><use href="#ic-chevron"></use></svg></span>
        Résumé de séance
      </button>${body}`;
  },

  /** J2 : rangée de puces Tout / Alarmes / <par personnage> — mêmes règles que
      les facettes du Hub (valeurs distinctes présentes, filtre session-only,
      pas de branche App.edition, la sémantique cls est déjà neutre). */
  _renderFilters() {
    const box = document.getElementById("dice-log-filters");
    if (!box) return;
    if (!this.history.length) {
      box.innerHTML = "";
      return;
    }
    // Loi 5 : les puces "personnage" sont un choix, pas un contenu qui se lit
    // — au-delà de WHO_VISIBLE_MAX on ne fait pas défiler la queue hors champ,
    // on montre les plus actifs (comptage réel, pas l'ordre d'apparition) et
    // une puce "+N" déplie le reste au clic (session only, comme `_filter`).
    const counts = new Map();
    for (const e of this.history) {
      if (!e.who) continue;
      counts.set(e.who, (counts.get(e.who) || 0) + 1);
    }
    const whosByActivity = [...counts.keys()].sort((a, b) => counts.get(b) - counts.get(a));
    const hiddenCount = Math.max(0, whosByActivity.length - this.WHO_VISIBLE_MAX);
    const whos =
      hiddenCount && !this._filtersExpanded
        ? whosByActivity.slice(0, this.WHO_VISIBLE_MAX)
        : whosByActivity;
    const chip = (filter, label) =>
      `<button class="hub-facet-chip${this._filter === filter ? " active" : ""}" data-action="log-filter" data-filter="${Utils.escHtml(filter)}">${Utils.escHtml(label)}</button>`;
    const hasPinned = this.history.some((e) => e.pinned);
    // R3 : puce "cette rencontre" seulement si une rencontre est ouverte
    // (Encounter.restore) — filtre session-only, aucun 2ᵉ mécanisme
    // d'historique (garde-fou c), réutilise `_filter` comme les autres puces.
    const activeDossierId = typeof Encounter !== "undefined" ? Encounter.activeDossierId : null;
    const moreChip = hiddenCount
      ? `<button class="hub-facet-chip" data-action="log-filters-more">${this._filtersExpanded ? "Réduire" : `+${hiddenCount}`}</button>`
      : "";
    box.innerHTML =
      chip("all", "Tout") +
      chip("alarm", "Alarmes") +
      (hasPinned ? chip("pinned", "📌 Épinglés") : "") +
      (activeDossierId ? chip(this._ENCOUNTER_FILTER, "🎬 Cette rencontre") : "") +
      whos.map((w) => chip(w, w)).join("") +
      moreChip;
  },

  /** Re-rend la liste (appelé après chaque jet si le panneau existe). */
  refresh() {
    const list = document.getElementById("dice-log-list");
    if (!list) return;
    this._summaryBand();
    this._renderFilters();
    const entries = this.history.filter((e) => {
      if (this._filter === "all") return true;
      if (this._filter === "alarm") return e.cls === "crit" || e.cls === "glitch";
      if (this._filter === "pinned") return !!e.pinned;
      if (this._filter === this._ENCOUNTER_FILTER) {
        return e.dossierId && typeof Encounter !== "undefined" && e.dossierId === Encounter.activeDossierId;
      }
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
    // (complication/complication mineure) sont les seules ALARMES (cf. sémantique
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

  /** V6 : texture d'édition d'un jet, en clair (export texte). Chaque édition a
      sa propre « chose qui a fait compter le jet » : la Limite plafonne (SR5),
      l'Edge dépensé ajoute des dés à six explosifs (SR5/SR6), la complication a
      une gravité (Anarchy). Descripteur neutre `e.texture` construit dans
      record() — ici on n'interprète que ses champs, aucune branche App.edition. */
  _textureText(tx) {
    if (!tx) return "";
    if (tx.kind === "limit") return `Précision ${tx.from}→${tx.to}`;
    if (tx.kind === "edge") return `+${tx.dice} ${tx.term || ""}`.trim() + (tx.sixes ? ` · ${tx.sixes}×6` : "");
    if (tx.kind === "complication") {
      return { minor: "Complication mineure", critical: "Complication critique", disaster: "Désastre" }[tx.sev] || "";
    }
    return "";
  },

  /** V6 : rendu HTML de la texture (pastille teintée). Limite/Edge prennent la
      teinte d'édition (`--accent`, dont la valeur suit le livre actif) ; la
      complication prend la couleur de sa gravité (ambre → rouge). */
  _textureHtml(tx) {
    if (!tx) return "";
    if (tx.kind === "limit") {
      return `<span class="dice-log-texture is-limit"><span class="dice-log-texture-mark" aria-hidden="true">⊟</span>Précision ${tx.from}→${tx.to}</span>`;
    }
    if (tx.kind === "edge") {
      const term = tx.term ? ` ${tx.term}` : "";
      const six = tx.sixes ? ` · ${tx.sixes}×6<span class="dice-log-texture-mark" aria-hidden="true">↯</span>` : "";
      return `<span class="dice-log-texture is-edge">+${tx.dice}${term}${six}</span>`;
    }
    if (tx.kind === "complication") {
      const lvl = { minor: 1, critical: 2, disaster: 3 }[tx.sev] || 0;
      const word = { minor: "mineure", critical: "critique", disaster: "désastre" }[tx.sev] || "";
      let dots = "";
      for (let i = 0; i < 3; i++) dots += i < lvl ? "◆" : "◇";
      return `<span class="dice-log-texture is-complication sev-${tx.sev}"><span class="dice-log-texture-dots" aria-hidden="true">${dots}</span>${word}</span>`;
    }
    return "";
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
    // V6 : texture d'édition (pastille) — « ce qui a fait compter le jet » selon
    // le livre. Aucune donnée d'utilisateur (chiffres/gravité issus de `res`),
    // pas de délégation : c'est une signature en lecture seule.
    const texture = this._textureHtml(e.texture);
    const icon = isCard ? `<span class="dice-log-icon" aria-hidden="true">${ICON[e.cls]}</span>` : "";
    // Détail replié par défaut : bouton "▸ Détail" à la place du sub brut,
    // le pool complet reste à un tap (outil de confiance à la demande).
    const expanded = this._expanded.has(String(e.t));
    const detailChev = `<svg class="icon icon-sm${expanded ? " is-open" : ""}" aria-hidden="true"><use href="#ic-chevron"></use></svg>`;
    const detail = expanded
      ? `<span class="dice-log-sub">${Utils.escHtml(e.sub)}</span>
         <button class="dice-log-detail-btn" data-action="log-expand" data-t="${e.t}">${detailChev} Replier</button>`
      : `<button class="dice-log-detail-btn" data-action="log-expand" data-t="${e.t}">${detailChev} Détail</button>`;
    // J4 : une note à la fois par jet (pas un journal — un seul jet, un seul
    // rappel), sur le même patron que les boutons détail (bouton texte
    // discret, pas d'éditeur).
    const t = String(e.t);
    let note;
    if (e.note) {
      note = `<div class="dice-log-note">
        <span class="dice-log-note-text">${Utils.escHtml(e.note)}</span>
        <button class="dice-log-detail-btn" data-action="log-note-clear" data-t="${e.t}">✕</button>
      </div>`;
    } else if (this._noteEditing.has(t)) {
      note = `<form class="dice-log-note-form" data-action="log-note-form" data-t="${e.t}">
        <input class="dice-log-note-input" type="text" maxlength="140" placeholder="Note…" autofocus>
      </form>`;
    } else {
      note = `<button class="dice-log-detail-btn" data-action="log-note-open" data-t="${e.t}">✎ Note</button>`;
    }
    const pinBtn = `<button class="dice-log-pin-btn${e.pinned ? " is-pinned" : ""}" data-action="log-pin" data-t="${e.t}"
      title="${e.pinned ? "Désépingler" : "Épingler — garder ce jet même après la purge"}"
      aria-label="${e.pinned ? "Désépingler" : "Épingler"}">📌</button>`;
    return `<div class="dice-log-item ${e.cls}${isCard ? " is-card" : ""}${e.pinned ? " is-pinned" : ""}">
      <span class="dice-log-time">${fmt(e.t)}</span>
      ${icon}
      <div class="dice-log-body">
        ${label}
        ${detail}
        ${note}
        ${texture}
        ${tag}
      </div>
      <span class="dice-log-main">${e.main}<small>${e.unit || ""}</small></span>
      ${pinBtn}
    </div>`;
  },
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => DiceLog.init());
} else {
  DiceLog.init();
}

// Pont couche 4 (migration modules ES) — retiré en fin de migration.
window.DiceLog = DiceLog;
