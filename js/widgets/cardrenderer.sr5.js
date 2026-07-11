"use strict";

/* ============================================================
   CARD RENDERER — corps de carte Shadowrun 5e.
   ============================================================ */
Object.assign(CardRenderer, {
  _gmPoolsSR5(pnj) {
    // Défense et Encaissement sont remontés dans la zone Combat ;
    // ici on ne garde que les réserves de référence.
    const cells = [
      this._gmPoolRow(
        "Sang-froid",
        pnj.composure,
        "Sang-froid : Volonté + Charisme",
      ),
      this._gmPoolRow(
        "Surprise",
        pnj.surprise,
        "Surprise : Réaction + Intuition",
      ),
      this._gmPoolRow(
        "Intentions",
        pnj.judgeIntentions,
        "Jauger les intentions : Intuition + Charisme",
      ),
      this._gmPoolRow("Mémoire", pnj.memory, "Mémoire : Logique + Volonté"),
      this._gmPoolRow(
        "Port",
        pnj.liftCarry,
        "Soulever / porter : Force + Constitution",
      ),
    ]
      .filter(Boolean)
      .join("");
    if (!cells) return "";
    return `<div class="card-section gm-pools-section">
      <div class="card-section-label">Réserves MJ</div>
      <div class="stats-row" style="flex-wrap:wrap;gap:5px;">${cells}</div>
    </div>`;
  },

  _bodySR5(pnj, deps) {
    const {
      attrs,
      limPhys,
      limMent,
      limSoc,
      init,
      initDice,
      drainResist,
      physMon,
      stunMon,
      physFilled,
      stunFilled,
      skills,
      knowledges,
      equip,
      augs,
      spells,
      powers,
      traits,
    } = pnj;

    const prefs = this._displayPrefs(deps);
    const refOpen = this._refIsOpen(pnj, deps);
    const { weapons, gear } = ItemResolver.splitEquip(equip);
    let html = `<div class="pnj-card-body${refOpen ? "" : " ref-collapsed"}">`;

    const malus5 = Utils.woundMalus(pnj, "sr5");

    // ---- ZONE COMBAT ----
    html += '<div class="combat-zone">';
    html += this._zoneEyebrow("Combat");
    html += '<div class="combat-row">';
    const initDetail = `${Utils.attrFullName("REA")} ${attrs.REA} + ${Utils.attrFullName("INT")} ${attrs.INT}`;
    html += this._initPill(init, initDice, pnj, initDetail);
    if (drainResist != null)
      html += this._rollPill("Drain", Math.max(0, drainResist - malus5), "Résistance au Drain");
    html += this._rollPill("Défense", Math.max(0, (pnj.defense || 0) - malus5), "Test de défense : Réaction + Intuition");
    html += this._rollPill("Encaissement", pnj.damageResist, "Résistance aux dommages : Constitution + armure (non affectée par le malus de blessure)");
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
    </div>`;

    html += this._weaponBlock(pnj, weapons, "sr5", deps);
    html += this._spellsBlock(pnj, spells, "sr5");
    html += this._drugRow(pnj, "sr5", deps);
    html += this._vehicleChipRow(pnj, deps);
    html += this._spiritChipRow(pnj, deps);
    html += "</div>"; // fin combat-zone

    // ---- ZONE CAPACITÉS ----
    html += '<div class="capacity-zone">';
    html += this._skillsSection(skills, malus5);
    html += this._knowledgesSection(knowledges, pnj, malus5);
    if (powers && powers.length)
      html += this._listSection("Pouvoirs d'adepte", powers);
    if (traits && traits.length) html += this._listSection("Traits", traits);
    if (pnj.infectedPowers && pnj.infectedPowers.length)
      html += this._listSection("Pouvoirs (Infecté)", pnj.infectedPowers);
    if (pnj.infectedWeaknesses && pnj.infectedWeaknesses.length)
      html += this._listSection("Faiblesses (Infecté)", pnj.infectedWeaknesses);
    html += "</div>";

    // ---- ZONE RÉFÉRENCE (repliable) ----
    html += this._refToggle(pnj, "Référence — attributs, réserves MJ, équipement");
    html += '<div class="ref-zone">';
    if (prefs.showAttributes) {
      const attrKeys = ["CON", "AGI", "REA", "FOR", "VOL", "LOG", "INT", "CHA"];
      // Attributs spéciaux : ESS toujours, puis MAG (éveillé) ou RES (techno).
      const extras = [
        "ESS",
        ...(attrs.MAG ? ["MAG"] : []),
        ...(attrs.RES ? ["RES"] : []),
        ...(attrs.CHC != null ? ["CHC"] : []),
      ];
      html += `<div class="ref-block"><div class="ref-lbl">Attributs</div>`;
      html += `<div class="attr-grid">${attrKeys.map((k) => this._attrCell(k, attrs[k])).join("")}</div>`;
      if (extras.length)
        html += `<div class="attr-grid attr-special-row">${extras.map((k) => this._attrCell(k, attrs[k], "attr-special")).join("")}</div>`;
      html += `<div class="limites-grid" style="margin-top:6px;">
        ${this._attrCell("Lim.Phys", limPhys)}
        ${this._attrCell("Lim.Ment", limMent)}
        ${this._attrCell("Lim.Soc", limSoc)}
      </div></div>`;
    }
    if (prefs.showGmPools) html += this._gmPoolsSR5(pnj);
    if (prefs.showEquipment && gear.length)
      html += this._equipSection(pnj, gear, "sr5", deps);
    if (augs && augs.length) html += this._listSection("Augmentations", augs);
    html += "</div>"; // fin ref-zone

    html += "</div>";
    return html;
  },
});
