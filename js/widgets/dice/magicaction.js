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
import { AmplitudeSelector } from "../kit/amplitudeselector.js";
import { Dice } from "../../rules/dice.js";
import { DiceLog } from "./dicelog.js";
import { DiceRoller } from "./diceroller.js";
import { Magic } from "../../rules/magic.js";
import { Resonance } from "../../rules/resonance.js";
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
      const clr = e.target.closest("[data-spell-clear], [data-form-clear]");
      if (clr) {
        const isForm = clr.hasAttribute("data-form-clear");
        this._clearLastCast(
          clr.getAttribute("data-roll-pnj"),
          clr.getAttribute(isForm ? "data-form-clear" : "data-spell-clear"),
          isForm ? "complexForm" : "spell",
        );
        return;
      }
      // Clic sur les succès = bascule du maintien (prioritaire, ne lance pas).
      const sus = e.target.closest("[data-spell-sustain], [data-form-sustain]");
      if (sus) {
        const isForm = sus.hasAttribute("data-form-sustain");
        this._toggleSustain(
          sus.getAttribute("data-roll-pnj"),
          sus.getAttribute(isForm ? "data-form-sustain" : "data-spell-sustain"),
          isForm ? "complexForm" : "spell",
        );
        return;
      }
      // ⓘ : détails du sort/forme — laissé à ContentModal, ne pas lancer.
      if (e.target.closest("[data-content-name]")) return;
      const bs = e.target.closest("[data-cast-spell]");
      if (bs) {
        this.castSpell(bs.getAttribute("data-roll-pnj"), bs.getAttribute("data-cast-spell"));
        return;
      }
      const bf = e.target.closest("[data-cast-form]");
      if (bf) this.castComplexForm(bf.getAttribute("data-roll-pnj"), bf.getAttribute("data-cast-form"));
    });
  },

  /** Efface le dernier jet mémorisé d'un sort/d'une forme (maintenu terminé). */
  _clearLastCast(pnjId, name, kind = "spell") {
    const pnj = PnjLookup.find(pnjId);
    if (!pnj) return;
    const list = kind === "complexForm" ? pnj.complexForms : pnj.spells;
    const entry = (list || []).find((s) => s && s.name === name);
    if (entry && entry._lastCast) {
      delete entry._lastCast;
      this._hooks.onPnjChanged(pnj);
    }
  },

  /** Bascule le maintien du dernier effet lancé (sort/forme complexe). On ne
      maintient qu'un effet effectivement LANCÉ (`_lastCast` présent) — le flag
      vit DANS `_lastCast`, donc le ✕ (efface le dernier jet) met fin au
      maintien du même geste. Le compte des effets maintenus en dérive
      (`Utils.sustainedCount`) et pilote le malus de −2/effet à tous les tests
      (`Utils.dicePenalty`). */
  _toggleSustain(pnjId, name, kind = "spell") {
    const pnj = PnjLookup.find(pnjId);
    if (!pnj) return;
    const list = kind === "complexForm" ? pnj.complexForms : pnj.spells;
    const entry = (list || []).find((s) => s && s.name === name);
    if (!entry || !entry._lastCast) return;
    entry._lastCast.sustained = !entry._lastCast.sustained;
    this._hooks.onPnjChanged(pnj);
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
    // Cadran d'amplitude (contrat d'amplitude, cf. AmplitudeSelector) : la
    // Puissance choisie va de 1 à 2×Magie (plafond 12, SR5 p.283). Au-delà de
    // 8 crans (mage MAG ≥ 5), le rendu bascule en stepper — jamais sur une
    // media query, uniquement sur le nombre de crans.
    const maxForce = Utils.clamp(mag * 2, 1, 12);
    this._cast = {
      kind: "spell",
      pnjId,
      name: spellName,
      entry,
      edition: pnj.edition,
      force: Utils.clamp(mag, 1, 12),
      forceSteps: Array.from({ length: maxForce }, (_, i) => ({ value: i + 1, label: String(i + 1) })),
    };

    if (!ed.spellUsesForce) {
      this._doCast(); // pas de Puissance à choisir → lancer direct
      return;
    }

    // SR5 : sélecteur de Puissance (le seul réglage avant le jet).
    this._ensurePanel();
    document.getElementById("magic-title").textContent =
      `${pnj.name || "PNJ"} — ${spellName}`;
    document.getElementById("magic-force-row").querySelector(".summon-row-label").textContent = "Puissance";
    document.getElementById("magic-roll-btn").textContent = "Lancer le sort";
    this._syncPanel();

    const p = document.getElementById("magic-panel");
    p.removeAttribute("hidden");
    void p.offsetWidth;
    p.classList.add("show");
  },

  /** Tisse une forme complexe d'un PNJ (mirroir exact de `castSpell`,
      kind:"complexForm") : Niveau à choisir (1 à Résonance×3, p.252),
      panneau réutilisé, pool/VD/type de Technodrain lus sur le contrat au
      lieu de spellSkill/spellDrainValue/drainDamageType. */
  castComplexForm(pnjId, formName) {
    const pnj = PnjLookup.find(pnjId);
    if (!pnj) return;
    const entry = (pnj.complexForms || []).find((f) => f && f.name === formName);
    if (!entry || entry.vt == null || entry.manualTest) return;
    const ed = App.getEditionModule(pnj.edition);
    if (!ed.technoFormSkill) return; // édition sans formes complexes motorisées

    const res = Actor.attr(pnj, ed.resonanceAttr || "RES") || 1;
    const maxLevel = Utils.clamp(res * 3, 1, 12);
    this._cast = {
      kind: "complexForm",
      pnjId,
      name: formName,
      entry,
      edition: pnj.edition,
      force: Utils.clamp(res, 1, 12),
      forceSteps: Array.from({ length: maxLevel }, (_, i) => ({ value: i + 1, label: String(i + 1) })),
    };

    if (!ed.technoFormUsesLevel) {
      this._doCast(); // SR6 : pas de Niveau à choisir → tissage direct
      return;
    }

    this._ensurePanel();
    document.getElementById("magic-title").textContent =
      `${pnj.name || "PNJ"} — ${formName}`;
    document.getElementById("magic-force-row").querySelector(".summon-row-label").textContent = "Niveau";
    document.getElementById("magic-roll-btn").textContent = "Tisser la forme";
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

    document.getElementById("magic-force-steps").innerHTML =
      AmplitudeSelector.render(c.forceSteps, c.force, "force");

    const isForm = c.kind === "complexForm";
    // Le panneau ne s'ouvre que pour les formes à Niveau (SR5) : `ctx.castHits`
    // n'y sert pas (0), il n'existe qu'au moment du jet (régime « succès » SR6,
    // qui tisse direct sans panneau). Pic de Résonance déroge sur la compétence.
    const skill = isForm ? c.entry.skill || ed.technoFormSkill : ed.spellSkill;
    const attrLabel = isForm ? Resonance.label(c.edition) : "Magie";
    const castPool = isForm
      ? Resonance.actionPool(pnj, skill, c.edition)
      : Magic.actionPool(pnj, skill, c.edition);
    const dv = isForm
      ? ed.technoDrainValue(c.entry, { level: c.force, castHits: 0 })
      : ed.spellDrainValue(c.entry, c.force);
    const resist = isForm ? pnj.technoDrainResist : pnj.drainResist;
    const forceLabel = isForm ? "Niveau" : "Puissance";
    const forceTxt = !isForm && !ed.spellUsesForce ? "" : ` · ${forceLabel} ${c.force}`;
    const costLabel = isForm ? ed.technoCostLabel || "VT" : "Drain VD";
    document.getElementById("magic-forecast").innerHTML =
      `<span>${Utils.escHtml(skill)} + ${Utils.escHtml(attrLabel)} : <strong>${castPool}</strong> dés${forceTxt}</span>` +
      `<span class="magic-forecast-note">${costLabel} ${dv} — résistance ${Math.max(0, (resist || 0) - Utils.dicePenalty(pnj, c.edition))} dés</span>`;
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

    // 1) Test de Lancement de sorts / Tissage (l'app le roule) → succès =
    // effet. Mémorise le dernier jet sur l'entrée (persisté ; utile pour un
    // sort/forme maintenu).
    const isForm = c.kind === "complexForm";
    const skill = isForm ? c.entry.skill || ed.technoFormSkill : ed.spellSkill;
    const castPool = isForm
      ? Resonance.actionPool(pnj, skill, c.edition)
      : Magic.actionPool(pnj, skill, c.edition);
    const castRes = Dice.computeRoll(castPool);
    c.entry._lastCast = { hits: castRes.hits };

    // 2) Drain/Technodrain (VD/VT du contrat) : résiste (jet loggé), encaisse
    // (met à jour la carte). Résolu AVANT l'affichage pour le présenter dans
    // le même overlay.
    const dv = isForm
      ? ed.technoDrainValue(c.entry, { level: c.force, castHits: castRes.hits })
      : ed.spellDrainValue(c.entry, c.force);
    const drain = this._resolveDrain(pnj, ed, {
      dv,
      kind: c.kind,
      castHits: castRes.hits,
      force: c.force,
      label: c.name,
    });

    // Contexte du lancer courant : source des Secondes chances. Modèle
    // UNIFIÉ sort / invocation / forme complexe — `kind` distingue, `main`
    // est le jet du lanceur, `drain` porte le Drain/Technodrain.
    this._resolved = {
      kind: c.kind,
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
    if (r.kind === "conjuration") return "Invocation";
    if (r.kind === "complexForm") return `Forme — ${r.entry.name}`;
    return `Sort — ${r.entry.name}`;
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
      const isForm = r.kind === "complexForm";
      // Régime « succès » (SR6, Hacker vaillant) : le Technodrain VAUT les
      // succès du tissage → un nouveau jet principal le change, donc les dégâts
      // avec. VT à Niveau (SR5) ou fixe : `technoDrainValue` ignore castHits,
      // newDv === dv, ce bloc est un no-op (comportement SR5 inchangé).
      const newDv = isForm
        ? ed.technoDrainValue(r.entry, { level: r.force, castHits: r.main.hits })
        : r.drain.dv;
      const newDamage =
        newDv !== r.drain.dv ? Magic.resolveDrainDamage(newDv, r.drain.res.hits) : r.drain.damage;
      // Type revu (selon les succès en SR5, selon la VD en SR6) — corrige le moniteur.
      const newType = (isForm ? ed.technoDrainType : ed.drainDamageType)(
        { kind: r.kind, castHits: r.main.hits, drainDamage: newDamage, force: r.force },
        pnj,
      );
      if (newDv !== r.drain.dv || newType !== r.drain.type) {
        this._revertDrain(pnj, r.drain.applied);
        r.drain.dv = newDv;
        r.drain.damage = newDamage;
        r.drain.type = newType;
        r.drain.applied = ed.applyDrainDamage(pnj, newDamage, newType);
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
    const newType = (r.kind === "complexForm" ? ed.technoDrainType : ed.drainDamageType)(
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
      label: `Résistance au ${r.kind === "complexForm" ? "Technodrain" : "Drain"} — ${this._label().replace(/^(Sort|Forme) — /, "")}`,
      who: pnj.name || "",
    });
    this._hooks.onPnjChanged(pnj);
    this._present(false); // le jet principal n'a pas changé → seul le Drain re-loggé
  },

  /** Résout le Drain/Technodrain d'une action magique et l'encaisse
      (partagé sorts / invocation / formes complexes) : roule la résistance
      du PNJ (loggée), calcule les dégâts + le type (contrat d'édition),
      applique sur le bon moniteur. Renvoie { resistHits, drainDamage, type }. */
  _resolveDrain(pnj, ed, { dv, kind, castHits, force, label }) {
    const isForm = kind === "complexForm";
    const resistBase = isForm ? pnj.technoDrainResist : pnj.drainResist;
    const drainPool = Math.max(0, (resistBase || 0) - Utils.dicePenalty(pnj, pnj.edition));
    const drainRes = Dice.computeRoll(drainPool);
    DiceLog.record(drainRes, {
      label: `Résistance au ${isForm ? "Technodrain" : "Drain"} — ${label}`,
      who: pnj.name || "",
    });
    const drainDamage = Magic.resolveDrainDamage(dv, drainRes.hits);
    const type = isForm
      ? ed.technoDrainType({ kind, castHits, drainDamage, force }, pnj)
      : ed.drainDamageType({ kind, castHits, drainDamage, force }, pnj);
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

  /** Résout une compilation de sprite (T3c) — miroir EXACT de
      resolveConjuration, scopé Résonance : le technomancien jette
      compileSkill + RES, le sprite oppose `compileOpposeDice(level)` dés,
      succès nets = tâches. Le Technodrain (VD = `compileFading(succès du
      sprite)`) est résisté et encaissé par `_resolveDrain` (kind
      "complexForm" → technoDrainResist + technoDrainType). `castHits = level`
      porte la règle physique SR5 (Niveau > RES) ; SR6 est en régime dégâts.
      `null` si l'édition n'a pas de jet chiffré (Anarchy 1 : compilation
      narrative, comme ses esprits). N'engendre PAS le sprite. */
  resolveCompilation(owner, level) {
    const ed = App.getEditionModule(owner.edition);
    const sm = ed.spriteModel;
    if (!sm || !sm.compileSkill) return null;
    const compRes = Dice.computeRoll(Resonance.actionPool(owner, sm.compileSkill, owner.edition));
    DiceLog.record(compRes, { label: `Compilation (Niveau ${level})`, who: owner.name || "" });
    const spriteRes = Dice.computeRoll(sm.compileOpposeDice(level));
    DiceLog.record(spriteRes, {
      label: `Résistance du sprite (Niveau ${level})`,
      who: owner.name || "",
    });
    const netHits = Math.max(0, compRes.hits - spriteRes.hits);
    const dv = sm.compileFading(spriteRes.hits);
    const drain = this._resolveDrain(owner, ed, {
      dv,
      kind: "complexForm",
      castHits: level,
      force: level,
      label: "Compilation",
    });
    return {
      netHits,
      casterHits: compRes.hits,
      spriteHits: spriteRes.hits,
      dv,
      compRes,
      drain,
      drainDamage: drain.drainDamage,
      type: drain.type,
    };
  },

  /** Présente le jet de compilation via l'affichage de dés standard (le
      Technodrain est déjà encaissé + journalisé par resolveCompilation ; la
      Seconde chance sur le jet de compilation est un raffinement futur). */
  presentCompilation(owner, level, comp, sprite) {
    DiceRoller.show(comp.compRes, {
      label: sprite
        ? `Compilation — ${sprite.name} (Niveau ${level})`
        : `Compilation ratée (Niveau ${level})`,
      who: owner.name || "",
    });
  },

  /* ============================================================
     SOCLE « RENVOI » (T6b) — bannir un esprit / décompiler un sprite.
     Inverse hostile de l'invocation / compilation, en miroir EXACT :
     resolveBanishment ↔ resolveConjuration, resolveDecompilation ↔
     resolveCompilation. Les deux réduisent services/tâches de la cible par
     les succès nets et encaissent un Drain via `_resolveDrain` (kind
     "conjuration" pour la magie, "complexForm" pour la résonance). L'entité
     visée est l'esprit/sprite ADVERSE ; l'invocateur/compilateur d'origine
     (target.ownerId) ne fournit que le bonus d'opposition « si lié/inscrit ».
     ============================================================ */

  /** Résout un bannissement (esprit) — miroir de resolveConjuration. Renvoie
      { netHits, casterHits, spiritHits, dv, roll, drain, drainDamage, type },
      ou `null` si l'édition n'a pas de bannissement chiffré (Anarchy : renvoi
      narratif, comme l'invocation). Ne retire PAS les services — c'est le
      geste UI (_doBanish) qui décide selon netHits. */
  resolveBanishment(caster, spirit) {
    const ed = App.getEditionModule(caster.edition);
    if (!ed.banishSkill) return null;
    const roll = Dice.computeRoll(Magic.actionPool(caster, ed.banishSkill, caster.edition));
    DiceLog.record(roll, { label: `Bannissement — ${spirit.name || "esprit"}`, who: caster.name || "" });
    // Opposition = Puissance (+ Magie de l'invocateur d'origine si l'esprit est
    // lié, SR5 ; ignoré en SR6). `bound` posé sur l'esprit (miroir de sprite
    // `registered`) ; l'invocateur d'origine = spirit.ownerId (0 si absent).
    const owner = spirit.ownerId ? PnjLookup.find(spirit.ownerId) : null;
    const ownerMag = owner ? Actor.attr(owner, "MAG") : 0;
    const spiritRes = Dice.computeRoll(ed.banishOppose(spirit, ownerMag));
    DiceLog.record(spiritRes, {
      label: `Résistance de l'esprit (Puissance ${spirit.force})`,
      who: caster.name || "",
    });
    const netHits = Math.max(0, roll.hits - spiritRes.hits);
    const dv = ed.banishDrainValue(spiritRes.hits);
    const drain = this._resolveDrain(caster, ed, {
      dv,
      kind: "conjuration",
      castHits: roll.hits,
      force: spirit.force,
      label: "Bannissement",
    });
    return {
      netHits,
      casterHits: roll.hits,
      spiritHits: spiritRes.hits,
      dv,
      roll,
      drain,
      drainDamage: drain.drainDamage,
      type: drain.type,
    };
  },

  /** Résout une décompilation (sprite) — miroir de resolveCompilation. Deux
      régimes d'effet portés par `spriteModel.decompileEffect` : "tasks"
      (SR5/SR6, succès nets → tâches retirées, appliqué par l'UI) ou "damage"
      (Anarchy 1, `dmgBoxes` cases sur le moniteur matriciel). Technodrain
      seulement si `decompileFading` (SR5 ; null en SR6/A1). Renvoie
      { netHits, casterHits, spriteHits, effect, dmgBoxes, dv, roll, drain,
      drainDamage, type } ou `null` si l'édition n'a pas de décompilation
      chiffrée (A2 : pas de sprite). */
  resolveDecompilation(caster, sprite) {
    const ed = App.getEditionModule(caster.edition);
    const sm = ed.spriteModel;
    if (!sm || !sm.decompileSkill) return null;
    // Réserve du décompilateur : Résonance.actionPool (SR) ou override d'édition
    // (Anarchy 1 = Technomancie + Logique, faute de Résonance).
    const pool = sm.decompilePool
      ? sm.decompilePool(caster)
      : Resonance.actionPool(caster, sm.decompileSkill, caster.edition);
    const roll = Dice.computeRoll(pool);
    DiceLog.record(roll, { label: `Décompilation — ${sprite.name || "sprite"}`, who: caster.name || "" });
    const owner = sprite.ownerId ? PnjLookup.find(sprite.ownerId) : null;
    const ownerRes = owner ? Actor.attr(owner, "RES") : 0;
    const spriteRes = Dice.computeRoll(sm.decompileOppose(sprite, ownerRes));
    DiceLog.record(spriteRes, {
      label: `Résistance du sprite (${sprite.tier || "Niveau " + (sprite.level || 0)})`,
      who: caster.name || "",
    });
    const netHits = Math.max(0, roll.hits - spriteRes.hits);
    const dmgBoxes =
      sm.decompileEffect === "damage" && sm.decompileDamage && netHits > 0
        ? sm.decompileDamage(caster, netHits)
        : 0;
    // Technodrain SR5 = 2 × succès du sprite (min 2), résisté RES+VOL, physique
    // si la VD dépasse la RES (règle générale de Technodrain, castHits = dv).
    let drain = null;
    let dv = 0;
    if (sm.decompileFading) {
      dv = sm.decompileFading(spriteRes.hits);
      drain = this._resolveDrain(caster, ed, {
        dv,
        kind: "complexForm",
        castHits: dv,
        force: sprite.level,
        label: "Décompilation",
      });
    }
    return {
      netHits,
      casterHits: roll.hits,
      spriteHits: spriteRes.hits,
      effect: sm.decompileEffect,
      dmgBoxes,
      dv,
      roll,
      drain,
      drainDamage: drain ? drain.drainDamage : 0,
      type: drain ? drain.type : null,
    };
  },

  /** Présente un jet de renvoi (bannissement/décompilation) via l'affichage de
      dés standard — le Drain éventuel est déjà encaissé + journalisé par le
      résolveur. */
  presentDismissal(caster, res, label) {
    DiceRoller.show(res.roll, { label, who: caster.name || "" });
  },
};

// Pont couche 4 (migration modules ES) — retiré en fin de migration.
window.MagicAction = MagicAction;
