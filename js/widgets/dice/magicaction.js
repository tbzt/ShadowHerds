"use strict";

/* ============================================================
   ACTION MAGIQUE — lance un sort (et, via resolveConjuration,
   une invocation) de bout en bout : l'app roule le test de Lancement de
   sorts / Conjuration ELLE-MÊME (pool = compétence + Magie du PNJ),
   affiche les succès (= effet), résiste au Drain, en déduit le type
   Physique/Étourdissant et encaisse les dégâts sur le bon moniteur.

   Tout passe par le contrat d'édition (spellSkill, spellDrainValue,
   drainDamageType, applyDrainDamage…) — jamais de branche d'édition ici.
   Les deux jets partent au journal (DiceLog) ; le détail est présenté
   dans le panneau. Coquille .risk-panel réutilisée.
   ============================================================ */
import { Actor } from "../../rules/actor.js";
import { Dice } from "../../rules/dice.js";
import { DiceLog } from "./dicelog.js";
import { DiceRoller } from "./diceroller.js";
import { Magic } from "../../rules/magic.js";
import { Utils } from "../../core/utils.js";

export const MagicAction = {
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
        if (rr.dataset.action === "reroll-cast") this.rerollMain();
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

    const mag = Actor.attr(pnj, "MAG") || 1;
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

    // Contexte du lancer courant : source des Secondes chances. Modèle
    // UNIFIÉ sort / invocation — `kind` distingue, `main` est le jet du
    // lanceur (Lancement de sorts OU Conjuration), `drain` porte le Drain.
    this._resolved = {
      kind: "spell",
      pnjId: c.pnjId,
      edition: c.edition,
      force: c.force,
      main: castRes,
      entry: c.entry,
      drain: this._drainState(drain, dv),
    };

    // 3) Présente TOUT via l'affichage de dés standard : jet de lancement (dés
    // + succès) + jet de résistance au Drain + dégâts encaissés. Le cast est
    // loggé ici (après le Drain → il apparaît en tête, au-dessus de son Drain).
    this._present(true);
  },

  /** Construit l'état de Drain stocké (résultat + flags de relance). */
  _drainState(drain, dv) {
    return {
      res: drain.res,
      dv,
      damage: drain.drainDamage,
      type: drain.type,
      applied: drain.applied,
      mainRerolled: false,
      drainRerolled: false,
    };
  },

  /** Présente une invocation (parité avec les sorts) : appelée par le
      panneau d'invocation APRÈS création de l'esprit. `conj` vient de
      resolveConjuration (jets conjRes/spiritRes/drain déjà loggés) ; `spirit`
      est l'esprit créé (ses services suivent les Secondes chances). */
  presentConjuration(owner, force, conj, spirit) {
    this._resolved = {
      kind: "conjuration",
      pnjId: owner.id,
      edition: owner.edition,
      force,
      main: conj.conjRes,
      spiritRes: conj.spiritRes,
      netHits: conj.netHits,
      spirit,
      drain: this._drainState(conj.drain, conj.dv),
    };
    // conjRes/spiritRes/drain sont déjà journalisés par resolveConjuration.
    this._present(false);
  },

  /** Libellé du jet de Drain / titre du lancer selon le type. */
  _label() {
    const r = this._resolved;
    return r.kind === "conjuration" ? "Invocation" : `Sort — ${r.entry.name}`;
  },

  /** (Ré)affiche le lancer courant via l'affichage de dés standard.
      `logMain` : journalise le jet du lanceur (vrai au 1er lancer d'un sort et
      sur une Seconde chance du jet principal ; faux quand le jet principal n'a
      pas changé — Seconde chance du Drain — ou déjà loggé — invocation). */
  _present(logMain) {
    const r = this._resolved;
    const pnj = PnjLookup.find(r.pnjId);
    const opts = {
      label: this._label(),
      who: (pnj && pnj.name) || "",
      pnjId: r.pnjId,
      drain: r.drain,
      kind: r.kind,
      noLog: !logMain,
    };
    if (r.kind === "conjuration") {
      opts.conjure = { spiritHits: r.spiritRes.hits, netHits: r.netHits };
    }
    DiceRoller.show(r.main, opts);
  },

  /** Débite 1 point de la ressource de Seconde chance (Chance/Atout) du
      lanceur. Renvoie false (et ne débite pas) si indisponible. */
  _debitEdge(pnj, ed) {
    const attr = ed.rerollAction && ed.rerollAction.costAttr;
    if (!attr) return true; // édition sans coût (ne devrait pas arriver ici)
    const val = Actor.attr(pnj, attr);
    if (val <= 0) return false;
    Actor.spend(pnj, attr, 1); // dépense d'attribut-ressource (Chance/Atout)
    return true;
  },

  /** Annule un encaissement de Drain (retire du moniteur ce qui a été
      réellement appliqué). `applied` = { field, delta } renvoyé par
      edModule.applyDrainDamage. */
  _revertDrain(pnj, applied) {
    if (!applied || !applied.delta) return;
    pnj[applied.field] = Math.max(0, (pnj[applied.field] || 0) - applied.delta);
  },

  /** Seconde chance sur le JET PRINCIPAL (p.58) : relance les dés ratés.
      Sort → nouvel effet + « → N » ; en SR5 le type de Drain (selon les
      succès) peut basculer → le moniteur est corrigé. Invocation → nouveaux
      succès nets = services de l'esprit (mis à jour). Le Drain d'invocation
      dépend des succès de l'ESPRIT (inchangés) → non affecté ici. */
  rerollMain() {
    const r = this._resolved;
    if (!r || r.drain.mainRerolled) return;
    const pnj = PnjLookup.find(r.pnjId);
    if (!pnj) return;
    const ed = App.getEditionModule(r.edition);
    if (r.main.critGlitch) return; // Seconde chance interdite sur échec critique
    if (!this._debitEdge(pnj, ed)) return;

    r.main = Dice.rerollMisses(r.main);
    r.drain.mainRerolled = true;

    if (r.kind === "conjuration") {
      r.netHits = Math.max(0, r.main.hits - r.spiritRes.hits);
      if (r.spirit) {
        r.spirit.services = r.netHits;
        this._hooks.onPnjChanged(r.spirit);
      }
    } else {
      r.entry._lastCast = { hits: r.main.hits };
      // Type de Drain revu (SR5 : selon les succès du sort) — corrige le moniteur.
      const newType = ed.drainDamageType(
        { kind: "spell", castHits: r.main.hits, drainDamage: r.drain.damage, force: r.force },
        pnj,
      );
      if (newType !== r.drain.type) {
        this._revertDrain(pnj, r.drain.applied);
        r.drain.type = newType;
        r.drain.applied = ed.applyDrainDamage(pnj, r.drain.damage, newType);
      }
    }
    this._hooks.onPnjChanged(pnj);
    this._present(true); // nouveau jet principal → journalisé
  },

  /** Seconde chance sur le DRAIN (p.58) : relance les dés ratés de la
      résistance → nouveaux dégâts. Défait l'encaissement précédent avant
      d'appliquer le nouveau (les dégâts ne restent jamais appliqués à tort).
      Identique pour sorts et invocation. */
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
    const newDamage = Magic.resolveDrainDamage(r.drain.dv, newRes.hits);
    const newType = ed.drainDamageType(
      { kind: r.kind, castHits: r.main.hits, drainDamage: newDamage, force: r.force },
      pnj,
    );
    const applied = ed.applyDrainDamage(pnj, newDamage, newType);
    r.drain = {
      res: newRes,
      dv: r.drain.dv,
      damage: newDamage,
      type: newType,
      applied,
      mainRerolled: r.drain.mainRerolled,
      drainRerolled: true,
    };
    DiceLog.record(newRes, {
      label: `Résistance au Drain — ${this._label().replace(/^Sort — /, "")}`,
      who: pnj.name || "",
    });
    this._hooks.onPnjChanged(pnj);
    this._present(false); // le jet principal n'a pas changé → seul le Drain re-loggé
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

  /** Résout une invocation : roule Conjuration (magicien) +
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
    // Objets conjRes/spiritRes/drain conservés pour presentConjuration (relances).
    return {
      netHits,
      casterHits: conjRes.hits,
      spiritHits: spiritRes.hits,
      dv,
      conjRes,
      spiritRes,
      drain,
      drainDamage: drain.drainDamage,
      type: drain.type,
    };
  },
};

// Pont couche 4 (migration modules ES) — retiré en fin de migration.
window.MagicAction = MagicAction;
