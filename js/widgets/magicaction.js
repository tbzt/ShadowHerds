"use strict";

/* ============================================================
   ACTION MAGIQUE (CH-M7c) — lance un sort (et, via resolveConjuration,
   une invocation) de bout en bout : l'app roule le test de Lancement de
   sorts / Conjuration ELLE-MÊME (pool = compétence + Magie du PNJ),
   affiche les succès (= effet), résiste au Drain, en déduit le type
   Physique/Étourdissant et encaisse les dégâts sur le bon moniteur.

   Tout passe par le contrat d'édition (spellSkill, spellDrainValue,
   drainDamageType, applyDrainDamage…) — jamais de branche d'édition ici.
   Les deux jets partent au journal (DiceLog) ; le détail est présenté
   dans le panneau. Coquille .risk-panel réutilisée.
   ============================================================ */
const MagicAction = {
  /** Hooks injectés par app.js (couche 6) : onPnjChanged(pnj). */
  _hooks: null,

  /** État du lancer courant : { pnjId, name, entry, force, edition }. */
  _cast: null,

  /** hooks: { onPnjChanged(pnj) }. */
  init(hooks) {
    if (!hooks || typeof hooks.onPnjChanged !== "function") {
      throw new Error("MagicAction.init: hook onPnjChanged manquant");
    }
    this._hooks = hooks;
    // Délégation du clic « Lancer » d'un sort (rendu par cardrenderer).
    document.addEventListener("click", (e) => {
      const b = e.target.closest("[data-cast-spell]");
      if (!b) return;
      this.castSpell(b.getAttribute("data-roll-pnj"), b.getAttribute("data-cast-spell"));
    });
  },

  _ensurePanel() {
    if (document.getElementById("magic-panel")) return;
    const p = document.createElement("div");
    p.id = "magic-panel";
    p.className = "risk-panel-overlay";
    p.setAttribute("hidden", "");
    p.innerHTML = `
      <div class="risk-panel" role="dialog" aria-label="Lancer un sort">
        <div class="risk-panel-head">
          <span class="risk-panel-title" id="magic-title">Lancer un sort</span>
          <button class="risk-panel-close" id="magic-close" aria-label="Fermer">✕</button>
        </div>
        <div class="summon-row" id="magic-force-row">
          <span class="summon-row-label">Puissance</span>
          <div class="summon-steps" id="magic-force-steps"></div>
        </div>
        <div class="magic-forecast" id="magic-forecast"></div>
        <div class="magic-result" id="magic-result"></div>
        <button class="risk-roll-btn" id="magic-roll-btn">Lancer le sort</button>
      </div>`;
    document.body.appendChild(p);

    p.addEventListener("click", (e) => {
      if (e.target === p) this._close();
    });
    document.getElementById("magic-close").addEventListener("click", () => this._close());
    document.getElementById("magic-roll-btn").addEventListener("click", () => this._roll());
    document.getElementById("magic-force-steps").addEventListener("click", (e) => {
      const b = e.target.closest("[data-force]");
      if (!b || !this._cast) return;
      this._cast.force = parseInt(b.dataset.force, 10) || 1;
      this._syncPanel();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !p.hasAttribute("hidden")) this._close();
    });
  },

  /** Ouvre le panneau pour lancer un sort d'un PNJ. */
  castSpell(pnjId, spellName) {
    const pnj = PnjLookup.find(pnjId);
    if (!pnj) return;
    const entry = (pnj.spells || []).find((s) => s && s.name === spellName);
    if (!entry || entry.drain == null) return;
    const ed = App.getEditionModule(pnj.edition);
    if (!ed.spellSkill) return; // édition sans mécanique de sort (Anarchy)

    this._ensurePanel();
    const mag = (pnj.attrs && pnj.attrs.MAG) || 1;
    this._cast = {
      pnjId,
      name: spellName,
      entry,
      edition: pnj.edition,
      force: Utils.clamp(mag, 1, 12),
    };
    document.getElementById("magic-title").textContent =
      `${pnj.name || "PNJ"} — ${spellName}`;

    // Sélecteur de Puissance : uniquement là où le sort en dépend (SR5).
    const forceRow = document.getElementById("magic-force-row");
    if (ed.spellUsesForce) {
      forceRow.style.display = "";
      const maxForce = Utils.clamp(mag * 2, 1, 12);
      document.getElementById("magic-force-steps").innerHTML = Array.from(
        { length: maxForce },
        (_, i) => i + 1,
      )
        .map(
          (n) =>
            `<button class="summon-step-btn" data-force="${n}">${n}</button>`,
        )
        .join("");
    } else {
      forceRow.style.display = "none";
    }

    document.getElementById("magic-result").innerHTML = "";
    document.getElementById("magic-roll-btn").textContent = "Lancer le sort";
    this._syncPanel();

    const p = document.getElementById("magic-panel");
    p.removeAttribute("hidden");
    void p.offsetWidth;
    p.classList.add("show");
  },

  _close() {
    const p = document.getElementById("magic-panel");
    if (!p) return;
    p.classList.remove("show");
    clearTimeout(p._t);
    p._t = setTimeout(() => p.setAttribute("hidden", ""), 200);
    this._cast = null;
  },

  /** Rafraîchit l'état des boutons de Puissance et la prévision (pool + VD). */
  _syncPanel() {
    const c = this._cast;
    if (!c) return;
    const pnj = PnjLookup.find(c.pnjId);
    if (!pnj) return;
    const ed = App.getEditionModule(c.edition);

    document.querySelectorAll("#magic-force-steps .summon-step-btn").forEach((b) => {
      b.classList.toggle("active", parseInt(b.dataset.force, 10) === c.force);
    });

    const castPool = Magic.actionPool(pnj, ed.spellSkill, c.edition);
    const dv = ed.spellDrainValue(c.entry, c.force);
    const forceTxt = ed.spellUsesForce ? ` · Puissance ${c.force}` : "";
    document.getElementById("magic-forecast").innerHTML =
      `<span>${Utils.escHtml(ed.spellSkill)} + Magie : <strong>${castPool}</strong> dés${forceTxt}</span>` +
      `<span class="magic-forecast-note">Drain VD ${dv} — résistance ${Math.max(0, (pnj.drainResist || 0) - Utils.woundMalus(pnj, c.edition))} dés</span>`;
  },

  _roll() {
    const c = this._cast;
    if (!c) return;
    const pnj = PnjLookup.find(c.pnjId);
    if (!pnj) return;
    const ed = App.getEditionModule(c.edition);

    // 1) Test de Lancement de sorts (l'app le roule) → succès = effet.
    const castPool = Magic.actionPool(pnj, ed.spellSkill, c.edition);
    const castRes = Dice.computeRoll(castPool);
    DiceLog.record(castRes, { label: `Sort — ${c.name}`, who: pnj.name || "" });

    // 2) Drain : VD via le contrat, résistance au Drain du PNJ.
    const dv = ed.spellDrainValue(c.entry, c.force);
    const drainPool = Math.max(0, (pnj.drainResist || 0) - Utils.woundMalus(pnj, c.edition));
    const drainRes = Dice.computeRoll(drainPool);
    DiceLog.record(drainRes, {
      label: `Résistance au Drain — ${c.name}`,
      who: pnj.name || "",
    });

    // 3) Dégâts + type (contrat), encaissement sur le bon moniteur.
    const drainDamage = Magic.resolveDrainDamage(dv, drainRes.hits);
    const type = ed.drainDamageType(
      { kind: "spell", castHits: castRes.hits, drainDamage, force: c.force },
      pnj,
    );
    ed.applyDrainDamage(pnj, drainDamage, type);
    this._hooks.onPnjChanged(pnj);

    this._renderResult({
      castHits: castRes.hits,
      dv,
      resistHits: drainRes.hits,
      drainDamage,
      type,
    });
    document.getElementById("magic-roll-btn").textContent = "Lancer à nouveau";
  },

  _renderResult({ castHits, dv, resistHits, drainDamage, type }) {
    const typeLabel = type === "physical" ? "Physique" : "Étourdissant";
    const drainCls = drainDamage === 0 ? "good" : drainDamage >= dv ? "crit" : "glitch";
    const el = document.getElementById("magic-result");
    el.innerHTML =
      `<div class="magic-result-line good">Sort lancé : <strong>${castHits}</strong> succès</div>` +
      `<div class="magic-result-line ${drainCls}">Drain : VD ${dv} − ${resistHits} succès = ` +
      `<strong>${drainDamage}</strong> case${drainDamage > 1 ? "s" : ""} ${drainDamage > 0 ? `(${typeLabel})` : "· résisté"}</div>`;
  },
};
