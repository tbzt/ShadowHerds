"use strict";

/* ============================================================
   CARD RENDERER — corps de carte Shadowrun Anarchy 1re édition.
   Anarchy 1re ≈ un SR5 simplifié (cf. plan d'implémentation §2) :
   deux moniteurs P/E numériques, Défense = AGI+LOG, compétences en
   pool indice+attribut, PAS de panneau de Réduction de Risque (donc
   pas de RR/seuils comme cardrenderer.anarchy.js — V2). Modelé sur
   _bodySR5 (cardrenderer.sr5.js), pas sur _bodyAnarchy (V2).
   ============================================================ */
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
      equip,
    } = pnj;

    const prefs = this._displayPrefs(deps);
    const refOpen = this._refIsOpen(pnj, deps);
    const { weapons, gear } = ItemResolver.splitEquip(equip);
    let html = `<div class="pnj-card-body${refOpen ? "" : " ref-collapsed"}">`;

    const malus = Utils.woundMalus(pnj, "anarchy1");

    // ---- ZONE COMBAT ----
    html += '<div class="combat-zone">';
    html += this._zoneEyebrow("Combat");
    html += '<div class="combat-row">';
    if (init != null)
      html += this._initPill(init, initDice, pnj);
    if (drainResist != null)
      html += this._rollPill("Drain", Math.max(0, drainResist - malus), "Résistance au Drain");
    if (pnj.defense != null)
      html += this._rollPill("Défense", Math.max(0, pnj.defense - malus), "Test de défense : Agilité + Logique");
    html += "</div>";

    html += `<div class="monitor-block">
      <div class="monitor-row">
        <span class="monitor-label">Phys</span>
        <div class="monitor-boxes monitor-phys">${this._monitorBoxes(pnj.id, "phys", physMon, physFilled)}</div>
      </div>
      <div class="monitor-row" style="margin-top:4px;">
        <span class="monitor-label">Étourd</span>
        <div class="monitor-boxes monitor-stun">${this._monitorBoxes(pnj.id, "stun", stunMon, stunFilled)}</div>
      </div>
      ${this._monitorMalusBadge(malus)}
    </div>`;

    html += this._weaponBlock(pnj, weapons, "anarchy1", deps);
    html += this._spellsBlock(pnj, spells, "anarchy1");
    html += this._drugRow(pnj, "anarchy1", deps);
    html += this._vehicleChipRow(pnj, deps);
    html += this._spiritChipRow(pnj, deps);
    html += "</div>"; // fin combat-zone

    // ---- ZONE CAPACITÉS ----
    html += '<div class="capacity-zone">';
    html += this._skillsSection(skills, malus);
    if (edges && edges.length) html += this._listSection("Atouts", edges);
    html += "</div>";

    // ---- ZONE RÉFÉRENCE (repliable) ----
    html += this._refToggle(pnj, "Référence — attributs, équipement");
    html += '<div class="ref-zone">';
    if (prefs.showAttributes) {
      const attrKeys = ["FOR", "AGI", "VOL", "LOG", "CHA", "CHC"];
      html += `<div class="ref-block"><div class="ref-lbl">Attributs</div>
        <div class="attr-grid">${attrKeys.map((k) => this._attrCell(k, attrs[k])).join("")}</div>
        ${attrs.ESS != null ? `<div class="attr-grid attr-special-row">${this._attrCell("ESS", attrs.ESS, "attr-special")}</div>` : ""}
      </div>`;
    }
    if (prefs.showEquipment && gear.length)
      html += this._equipSection(pnj, gear, "anarchy1", deps);
    if (pnj.cyberdeck) html += CyberdeckRenderer.block(pnj, "anarchy1", deps);
    html += "</div>"; // fin ref-zone

    html += "</div>";
    return html;
  },
});
