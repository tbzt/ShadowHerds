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
    // Délégation des interactions d'une ligne de sort (rendu par cardrenderer).
    document.addEventListener("click", (e) => {
      // Seconde chance sur le sort / le Drain (boutons de l'overlay de dés).
      const rr = e.target.closest("[data-action='reroll-cast'], [data-action='reroll-drain']");
      if (rr && !rr.disabled) {
        if (rr.dataset.action === "reroll-cast") this.rerollCast();
        else this.rerollDrain();
        return;
      }
      // ✕ : efface le dernier jet mémorisé (prioritaire, ne lance pas).
      const clr = e.target.closest("[data-spell-clear]");
      if (clr) {
        this._clearLastCast(clr.getAttribute("data-roll-pnj"), clr.getAttribute("data-spell-clear"));
        return;
      }
      // ⓘ : détails du sort — laissé à ContentModal, ne pas lancer.
      if (e.target.closest("[data-content-name]")) return;
      const b = e.target.closest("[data-cast-spell]");
      if (!b) return;
      this.castSpell(b.getAttribute("data-roll-pnj"), b.getAttribute("data-cast-spell"));
    });
  },

  /** Efface le dernier jet mémorisé d'un sort (sort maintenu terminé). */
  _clearLastCast(pnjId, name) {
    const pnj = PnjLookup.find(pnjId);
    if (!pnj) return;
    const sp = (pnj.spells || []).find((s) => s && s.name === name);
    if (sp && sp._lastCast) {
      delete sp._lastCast;
      this._hooks.onPnjChanged(pnj);
    }
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
        <button class="risk-roll-btn" id="magic-roll-btn">Lancer le sort</button>
      </div>`;
    document.body.appendChild(p);

    p.addEventListener("click", (e) => {
      if (e.target === p) this._close();
    });
    document.getElementById("magic-close").addEventListener("click", () => this._close());
    document.getElementById("magic-roll-btn").addEventListener("click", () => this._doCast());
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

  /** Lance un sort d'un PNJ. SR5 (Puissance à choisir) : ouvre un sélecteur ;
      « Lancer » → jet présenté par l'affichage de dés standard. SR6/Anarchy1
      (VD fixe, aucune Puissance) : lance directement, comme une compétence. */
  castSpell(pnjId, spellName) {
    const pnj = PnjLookup.find(pnjId);
    if (!pnj) return;
    const entry = (pnj.spells || []).find((s) => s && s.name === spellName);
    if (!entry || entry.drain == null) return;
    const ed = App.getEditionModule(pnj.edition);
    if (!ed.spellSkill) return; // édition sans mécanique de sort (Anarchy)

    const mag = (pnj.attrs && pnj.attrs.MAG) || 1;
    this._cast = {
      pnjId,
      name: spellName,
      entry,
      edition: pnj.edition,
      force: Utils.clamp(mag, 1, 12),
    };

    if (!ed.spellUsesForce) {
      this._doCast(); // pas de Puissance à choisir → lancer direct
      return;
    }

    // SR5 : sélecteur de Puissance (le seul réglage avant le jet).
    this._ensurePanel();
    document.getElementById("magic-title").textContent =
      `${pnj.name || "PNJ"} — ${spellName}`;
    const maxForce = Utils.clamp(mag * 2, 1, 12);
    document.getElementById("magic-force-steps").innerHTML = Array.from(
      { length: maxForce },
      (_, i) => i + 1,
    )
      .map((n) => `<button class="summon-step-btn" data-force="${n}">${n}</button>`)
      .join("");
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

  /** Lance le sort et présente le résultat via l'affichage de dés STANDARD
      (DiceRoller.show — animation, journal, Seconde chance/Edge), pas un
      affichage maison. Le Drain est résolu/encaissé et signalé par un toast
      (comme le Drain Anarchy), cohérent avec le reste de l'app. */
  _doCast() {
    const c = this._cast;
    if (!c) return;
    const pnj = PnjLookup.find(c.pnjId);
    if (!pnj) return;
    const ed = App.getEditionModule(c.edition);
    this._close(); // le résultat passe par l'affichage de dés, pas le panneau

    // 1) Test de Lancement de sorts (l'app le roule) → succès = effet. Mémorise
    // le dernier jet sur le sort (persisté ; utile pour un sort maintenu).
    const castRes = Dice.computeRoll(Magic.actionPool(pnj, ed.spellSkill, c.edition));
    c.entry._lastCast = { hits: castRes.hits };

    // 2) Drain (VD du contrat) : résiste (jet loggé), encaisse (met à jour la
    // carte). Résolu AVANT l'affichage pour le présenter dans le même overlay.
    const dv = ed.spellDrainValue(c.entry, c.force);
    const drain = this._resolveDrain(pnj, ed, {
      dv,
      kind: "spell",
      castHits: castRes.hits,
      force: c.force,
      label: c.name,
    });

    // Contexte du lancer courant : source des Secondes chances (sort/Drain),
    // qui re-résolvent une partie et corrigent l'encaissement (jamais deux
    // fois la même partie — flags castRerolled/drainRerolled).
    this._resolved = {
      pnjId: c.pnjId,
      edition: c.edition,
      entry: c.entry,
      force: c.force,
      dv,
      castRes,
      drain: {
        res: drain.res,
        dv,
        damage: drain.drainDamage,
        type: drain.type,
        applied: drain.applied,
        castRerolled: false,
        drainRerolled: false,
      },
    };

    // 3) Présente TOUT via l'affichage de dés standard : jet de lancement (dés
    // + succès) + jet de résistance au Drain + dégâts encaissés. Le cast est
    // loggé ici (après le Drain → il apparaît en tête, au-dessus de son Drain).
    this._present(true);
  },

  /** (Ré)affiche le lancer courant via l'affichage de dés standard.
      `logCast` : journalise le jet de sort (vrai au 1er lancer et sur une
      Seconde chance du sort ; faux sur une Seconde chance du Drain, où le
      cast n'a pas changé — on ne re-logge que le Drain, fait par l'appelant). */
  _present(logCast) {
    const r = this._resolved;
    const pnj = PnjLookup.find(r.pnjId);
    DiceRoller.show(r.castRes, {
      label: `Sort — ${r.entry.name}`,
      who: (pnj && pnj.name) || "",
      pnjId: r.pnjId,
      drain: r.drain,
      noLog: !logCast,
    });
  },

  /** Débite 1 point de la ressource de Seconde chance (Chance/Atout) du
      lanceur. Renvoie false (et ne débite pas) si indisponible. */
  _debitEdge(pnj, ed) {
    const attr = ed.rerollAction && ed.rerollAction.costAttr;
    if (!attr) return true; // édition sans coût (ne devrait pas arriver ici)
    const val = (pnj.attrs && pnj.attrs[attr]) || 0;
    if (val <= 0) return false;
    pnj.attrs[attr] = val - 1;
    return true;
  },

  /** Annule un encaissement de Drain (retire du moniteur ce qui a été
      réellement appliqué). `applied` = { field, delta } renvoyé par
      edModule.applyDrainDamage. */
  _revertDrain(pnj, applied) {
    if (!applied || !applied.delta) return;
    pnj[applied.field] = Math.max(0, (pnj[applied.field] || 0) - applied.delta);
  },

  /** Seconde chance sur le SORT (p.58) : relance les dés ratés du jet de
      lancement → nouvel effet + « → N » mis à jour. En SR5 les succès
      déterminent le type de Drain : si le type bascule, on corrige
      l'encaissement (même quantité, autre moniteur). */
  rerollCast() {
    const r = this._resolved;
    if (!r || r.drain.castRerolled) return;
    const pnj = PnjLookup.find(r.pnjId);
    if (!pnj) return;
    const ed = App.getEditionModule(r.edition);
    if (r.castRes.critGlitch) return; // Seconde chance interdite sur échec critique
    if (!this._debitEdge(pnj, ed)) return;

    r.castRes = Dice.rerollMisses(r.castRes);
    r.entry._lastCast = { hits: r.castRes.hits };
    r.drain.castRerolled = true;

    // Type de Drain revu (SR5 : selon les succès du sort) — corrige le moniteur.
    const newType = ed.drainDamageType(
      { kind: "spell", castHits: r.castRes.hits, drainDamage: r.drain.damage, force: r.force },
      pnj,
    );
    if (newType !== r.drain.type) {
      this._revertDrain(pnj, r.drain.applied);
      r.drain.type = newType;
      r.drain.applied = ed.applyDrainDamage(pnj, r.drain.damage, newType);
    }
    this._hooks.onPnjChanged(pnj);
    this._present(true); // nouveau jet de sort → journalisé
  },

  /** Seconde chance sur le DRAIN (p.58) : relance les dés ratés de la
      résistance → nouveaux dégâts. Défait l'encaissement précédent avant
      d'appliquer le nouveau (les dégâts ne restent jamais appliqués à tort). */
  rerollDrain() {
    const r = this._resolved;
    if (!r || r.drain.drainRerolled) return;
    const pnj = PnjLookup.find(r.pnjId);
    if (!pnj) return;
    const ed = App.getEditionModule(r.edition);
    if (r.drain.res.critGlitch) return;
    if (!this._debitEdge(pnj, ed)) return;

    // 1) Annule l'ancien encaissement.
    this._revertDrain(pnj, r.drain.applied);
    // 2) Relance la résistance, recalcule dégâts + type, réapplique.
    const newRes = Dice.rerollMisses(r.drain.res);
    const newDamage = Magic.resolveDrainDamage(r.dv, newRes.hits);
    const newType = ed.drainDamageType(
      { kind: "spell", castHits: r.castRes.hits, drainDamage: newDamage, force: r.force },
      pnj,
    );
    const applied = ed.applyDrainDamage(pnj, newDamage, newType);
    r.drain = {
      res: newRes,
      dv: r.dv,
      damage: newDamage,
      type: newType,
      applied,
      castRerolled: r.drain.castRerolled,
      drainRerolled: true,
    };
    DiceLog.record(newRes, {
      label: `Résistance au Drain — ${r.entry.name}`,
      who: pnj.name || "",
    });
    this._hooks.onPnjChanged(pnj);
    this._present(false); // le cast n'a pas changé → seul le Drain est re-loggé
  },

  /** Résout le Drain d'une action magique et l'encaisse (partagé sorts /
      invocation) : roule la résistance au Drain du PNJ (loggée), calcule les
      dégâts + le type (contrat d'édition), applique sur le bon moniteur.
      Renvoie { resistHits, drainDamage, type }. */
  _resolveDrain(pnj, ed, { dv, kind, castHits, force, label }) {
    const drainPool = Math.max(0, (pnj.drainResist || 0) - Utils.woundMalus(pnj, pnj.edition));
    const drainRes = Dice.computeRoll(drainPool);
    DiceLog.record(drainRes, {
      label: `Résistance au Drain — ${label}`,
      who: pnj.name || "",
    });
    const drainDamage = Magic.resolveDrainDamage(dv, drainRes.hits);
    const type = ed.drainDamageType({ kind, castHits, drainDamage, force }, pnj);
    const applied = ed.applyDrainDamage(pnj, drainDamage, type);
    this._hooks.onPnjChanged(pnj);
    return { res: drainRes, resistHits: drainRes.hits, drainDamage, type, applied };
  },

  /** Résout une invocation (CH-M7c) : roule Conjuration (magicien) +
      résistance de l'esprit → services = succès nets, puis le Drain
      (VD = contrat sur les succès de l'esprit). Renvoie
      { netHits, casterHits, spiritHits, dv, resistHits, drainDamage, type },
      ou `null` si l'édition n'a pas de mécanique chiffrée (Anarchy). Ne crée
      PAS l'esprit — c'est ui._doSummon qui décide selon netHits. */
  resolveConjuration(owner, force) {
    const ed = App.getEditionModule(owner.edition);
    if (!ed.conjureSkill) return null;
    const conjRes = Dice.computeRoll(Magic.actionPool(owner, ed.conjureSkill, owner.edition));
    DiceLog.record(conjRes, { label: "Invocation", who: owner.name || "" });
    const spiritRes = Dice.computeRoll(ed.spiritResistPool(force));
    DiceLog.record(spiritRes, {
      label: `Résistance de l'esprit (Puissance ${force})`,
      who: owner.name || "",
    });
    const netHits = Math.max(0, conjRes.hits - spiritRes.hits);
    const dv = ed.conjureDrainValue(spiritRes.hits);
    const drain = this._resolveDrain(owner, ed, {
      dv,
      kind: "conjuration",
      castHits: conjRes.hits,
      force,
      label: "Invocation",
    });
    return { netHits, casterHits: conjRes.hits, spiritHits: spiritRes.hits, dv, ...drain };
  },
};
