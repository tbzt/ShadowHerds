"use strict";

/* ============================================================
   CARD RENDERER — corps de carte Shadowrun Anarchy 1re édition.
   Anarchy 1re ≈ un SR5 simplifié (cf. plan d'implémentation §2) :
   deux moniteurs P/E numériques, Défense = AGI+LOG, compétences en
   pool indice+attribut, PAS de panneau de Réduction de Risque (donc
   pas de RR/seuils comme cardrenderer.anarchy.js — V2). Modelé sur
   _bodySR5 (cardrenderer.sr5.js), pas sur _bodyAnarchy (V2).
   ============================================================ */
import { Actor } from "../../rules/actor.js";
import { CyberdeckRenderer } from "./cyberdeckrenderer.js";
import { ItemResolver } from "../../rules/itemresolver.js";
import { Utils } from "../../core/utils.js";

Object.assign(CardRenderer, {
  _bodyAnarchy1(pnj, deps) {
    const {
      attrs,
      init,
      initDice,
      drainResist,
      physMon,
      stunMon,
      physFilled,
      stunFilled,
      skills,
      edges,
      spells,
      complexForms,
      equip,
    } = pnj;

    const prefs = this._displayPrefs(deps);
    const { weapons, gear } = ItemResolver.splitEquip(equip);
    let html = `<div class="pnj-card-body">`;

    // `wound` (blessure seule) → badge de moniteur ; `malus` → réserves. En
    // Anarchy les deux coïncident (pas de règle d'effet maintenu, dicePenalty
    // n'ajoute rien), mais on garde l'invariant universel pools/badge.
    const wound = Utils.woundMalus(pnj, "anarchy1");
    const malus = Utils.dicePenalty(pnj, "anarchy1");

    // ---- ZONE COMBAT ----
    let combatBody = '<div class="combat-row">';
    if (init != null)
      combatBody += this._initPill(init, initDice, pnj);
    if (drainResist != null)
      combatBody += this._rollPill("Drain", Math.max(0, drainResist - malus), {
        title: "Résistance au Drain",
        key: "drainResist",
        pnj,
        deps,
      });
    if (pnj.defense != null)
      combatBody += this._rollPill("Défense", Math.max(0, pnj.defense - malus), {
        title: "Test de défense : Agilité + Logique",
        glyph: "⛉",
        key: "defense",
        pnj,
        deps,
      });
    combatBody += "</div>";

    combatBody += `<div class="monitor-block">
      <div class="monitor-row">
        <span class="monitor-label" title="Physique">P</span>
        <div class="monitor-boxes monitor-phys">${this._monitorBoxes(pnj.id, "phys", physMon, physFilled)}</div>
      </div>
      <div class="monitor-row">
        <span class="monitor-label" title="Étourdissant">E</span>
        <div class="monitor-boxes monitor-stun">${this._monitorBoxes(pnj.id, "stun", stunMon, stunFilled)}</div>
      </div>
      ${this._monitorMalusBadge(wound)}
    </div>`;

    combatBody += this._weaponBlock(pnj, weapons, "anarchy1", deps);
    combatBody += this._spellsBlock(pnj, spells, "anarchy1");
    combatBody += this._complexFormsBlock(pnj, complexForms, "anarchy1");
    combatBody += this._drugRow(pnj, "anarchy1", deps);
    combatBody += this._vehicleChipRow(pnj, deps);
    combatBody += this._spiritChipRow(pnj, deps);
    combatBody += CyberdeckRenderer.combatArsenal(pnj, "anarchy1"); // râtelier Attaques unifié
    const combatSummary = init != null ? `Init ${init}+${initDice}D6` : "";
    html += this._zoneShell(pnj, "combat", combatBody, combatSummary);
    html += this._modulesHtml(pnj, deps); // modules conditionnels (Magie, Matrice), après Combat

    // ---- ZONE CAPACITÉS ----
    let capBody = "";
    capBody += this._skillsSection(skills, malus, { pnj });
    if (edges && edges.length) capBody += this._listSection("Atouts", edges);
    const capSummary = skills && skills.length ? `${skills.length} compétence${skills.length > 1 ? "s" : ""}` : "";
    html += this._zoneShell(pnj, "capacites", capBody, capSummary);

    // ---- ZONE DÉTAILS (repliable) ----
    let detailsBody = "";
    if (prefs.showAttributes) {
      const attrKeys = ["FOR", "AGI", "VOL", "LOG", "CHA", "CHC"];
      detailsBody += `<div class="ref-block"><div class="ref-lbl">Attributs</div>
        <div class="attr-grid">${attrKeys.map((k) => this._attrCell(k, Actor.attr(pnj, k), "", { roll: true, edition: "anarchy1" })).join("")}</div>
        ${attrs.ESS != null ? `<div class="attr-grid attr-special-row">${this._attrCell("ESS", Actor.attr(pnj, "ESS"), "attr-special")}</div>` : ""}
      </div>`;
    }
    if (prefs.showEquipment && gear.length)
      detailsBody += this._equipSection(pnj, gear, "anarchy1", deps);
    // Cyberdeck : vit désormais dans le module Matrice.
    html += this._zoneShell(pnj, "details", detailsBody, "attributs, équipement");

    html += "</div>";
    return html;
  },
});
