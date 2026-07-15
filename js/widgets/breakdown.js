"use strict";

/* ============================================================
   BREAKDOWN — popover d'explication décomposée d'une réserve
   (Défense, Encaissement, Drain…). Un seul contrôle par pastille
   (data-explain, posé par CardRenderer._rollPill sur le MÊME élément
   que data-roll) : clic/tap lance (geste sacré, inchangé) ; survol
   desktop ou appui long tactile ouvre le décompte. Recalcule
   reserveBreakdown(pnj,key) à la demande (aucune donnée persistée) —
   un seul panneau flottant réutilisé, ancré au déclencheur sur
   desktop/tablette, promu en bottom-sheet sur mobile.
   ============================================================ */
const Breakdown = {
  _resolve: null,
  _el: null,
  _trigger: null,
  _pressTimer: null,
  _pressStart: null,
  _suppressTrigger: null,
  _suppressUntil: 0,

  _LONG_PRESS_MS: 480,
  _MOVE_TOLERANCE: 10,

  /** resolve(pnjId) -> pnj, même hook que DiceRoller.init. */
  init({ resolve }) {
    this._resolve = resolve;

    // Clic en phase de CAPTURE (avant le listener de lancer de
    // diceroller.js, en bubble) : avale le clic qui suit immédiatement un
    // appui long ayant ouvert le panneau (même geste tactile, pas un
    // second lancer voulu) ; sinon, un panneau ouvert se ferme au premier
    // clic — sur son propre déclencheur (qui relance ensuite normalement
    // en bubble) comme ailleurs — sauf clic À L'INTÉRIEUR du panneau
    // (sélection de texte).
    document.addEventListener(
      "click",
      (e) => {
        const trigger = e.target.closest("[data-explain]");
        if (trigger && trigger === this._suppressTrigger && Date.now() < this._suppressUntil) {
          e.preventDefault();
          e.stopPropagation();
          this._suppressUntil = 0;
          this._suppressTrigger = null;
          return;
        }
        if (this._el && !e.target.closest(".breakdown-pop")) this.close();
      },
      true,
    );

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") this.close();
    });

    window.addEventListener("scroll", () => this.close(), true);
    window.addEventListener("resize", () => this.close());

    // Survol desktop/tablette (pointeur) — libre, ne consomme aucun clic.
    if (window.matchMedia && matchMedia("(hover:hover)").matches) {
      document.addEventListener("mouseover", (e) => {
        const trigger = e.target.closest("[data-explain]");
        if (trigger) this.open(trigger);
      });
      document.addEventListener("mouseout", (e) => {
        const trigger = e.target.closest("[data-explain]");
        if (trigger && !trigger.contains(e.relatedTarget)) this.close();
      });
      return; // pointeur à survol : pas d'appui long (évite le double geste)
    }

    // Appui long tactile/stylet — annulé si déplacement (scroll) ou
    // relâchement avant le seuil. Le menu contextuel natif (callout iOS)
    // est neutralisé sur les pastilles concernées.
    document.addEventListener("pointerdown", (e) => {
      if (e.pointerType === "mouse") return;
      const trigger = e.target.closest("[data-explain]");
      if (!trigger) return;
      this._pressStart = { x: e.clientX, y: e.clientY, trigger };
      this._pressTimer = setTimeout(() => {
        this._pressTimer = null;
        this.open(trigger);
        this._suppressTrigger = trigger;
        this._suppressUntil = Date.now() + 500;
      }, this._LONG_PRESS_MS);
    });
    const cancelPress = () => {
      if (this._pressTimer) {
        clearTimeout(this._pressTimer);
        this._pressTimer = null;
      }
      this._pressStart = null;
    };
    document.addEventListener("pointerup", cancelPress);
    document.addEventListener("pointercancel", cancelPress);
    document.addEventListener("pointermove", (e) => {
      if (!this._pressTimer || !this._pressStart) return;
      const dx = e.clientX - this._pressStart.x;
      const dy = e.clientY - this._pressStart.y;
      if (Math.hypot(dx, dy) > this._MOVE_TOLERANCE) cancelPress();
    });
    document.addEventListener("contextmenu", (e) => {
      if (e.target.closest("[data-explain]")) e.preventDefault();
    });
  },

  open(trigger) {
    const key = trigger.dataset.explain;
    const pnj = this._resolve ? this._resolve(trigger.dataset.explainPnj) : null;
    if (!pnj) return;
    const ed = App.getEditionModule(pnj.edition);
    const bd = ed && ed.reserveBreakdown ? ed.reserveBreakdown(pnj, key) : null;
    if (!bd || !bd.length) return;
    this._render(trigger, key, bd);
  },

  close() {
    if (this._el) this._el.remove();
    this._el = null;
    if (this._trigger) this._trigger.removeAttribute("aria-describedby");
    this._trigger = null;
  },

  _LABELS: { defense: "Défense", damageResist: "Encaissement", drainResist: "Drain" },

  _render(trigger, key, bd) {
    this.close();
    const total = bd.reduce((s, c) => s + c.value, 0);
    const isSheet = !!(window.matchMedia && matchMedia("(max-width: 640px)").matches);
    const el = document.createElement("div");
    el.className = "breakdown-pop" + (isSheet ? " breakdown-sheet" : "");
    el.id = "breakdown-pop-" + Utils.uid();
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-label", "Détail du calcul — " + (this._LABELS[key] || key));
    el.innerHTML = this._html(key, total, bd);
    document.body.appendChild(el);
    trigger.setAttribute("aria-describedby", el.id);
    this._el = el;
    this._trigger = trigger;
    if (!isSheet) this._position(trigger, el);
  },

  _html(key, total, bd) {
    const esc = Utils.escHtml;
    const lines = bd
      .map((c) => {
        const sub = (c.detail || [])
          .map(
            (d) =>
              `<div class="breakdown-sub" data-negative="${d.value < 0}"><span>${esc(d.label)}</span><span>${d.value >= 0 ? "" : "−"}${Math.abs(d.value)}</span></div>`,
          )
          .join("");
        return `<div class="breakdown-line" data-negative="${c.value < 0}"><span>${esc(c.label)}</span><span>${c.value >= 0 ? "" : "−"}${Math.abs(c.value)}</span></div>${sub}`;
      })
      .join("");
    return `<div class="breakdown-title">${esc(this._LABELS[key] || key)} <strong>${total}</strong></div>
      <div class="breakdown-lines">${lines}</div>`;
  },

  _position(trigger, el) {
    const r = trigger.getBoundingClientRect();
    const pr = el.getBoundingClientRect();
    let top = r.bottom + 6;
    let left = r.left;
    if (left + pr.width > window.innerWidth - 8) left = window.innerWidth - pr.width - 8;
    if (top + pr.height > window.innerHeight - 8) top = r.top - pr.height - 6;
    el.style.top = Math.max(8, top) + "px";
    el.style.left = Math.max(8, left) + "px";
  },
};
