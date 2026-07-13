"use strict";

/* ============================================================
   CARD RENDERER — corps de carte Shadowrun 6e.
   ============================================================ */
Object.assign(CardRenderer, {
  _gmPoolsSR6(pnj) {
    // Défense, Encaissement et Drain sont dans la zone Combat.
    const cells = [
      this._gmPoolRow(
        "Sang-froid",
        pnj.composure,
        "Sang-froid : Volonté + Charisme",
      ),
      this._gmPoolRow(
        "Intentions",
        pnj.judgeIntentions,
        "Jauger les intentions : Intuition + Charisme",
      ),
      this._gmPoolRow("Mémoire", pnj.memory, "Mémoire : Logique + Volonté"),
    ]
      .filter(Boolean)
      .join("");
    if (!cells) return "";
    return `<div class="card-section gm-pools-section">
      <div class="card-section-label">Réserves MJ</div>
      <div class="stats-row" style="flex-wrap:wrap;gap:5px;">${cells}</div>
    </div>`;
  },

  _bodySR6(pnj, deps) {
    const {
      attrs,
      me,
      physMon,
      stunMon,
      sdBase,
      initBase,
      initDice,
      pa,
      physFilled,
      stunFilled,
      skills,
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

    const malus6 = Utils.woundMalus(pnj, "sr6");

    // ---- ZONE COMBAT ----
    html += '<div class="combat-zone">';
    html += this._zoneEyebrow("Combat");
    html += '<div class="combat-row">';
    const initDetail = `${Utils.attrFullName("RÉA")} ${attrs.RÉA} + ${Utils.attrFullName("INT")} ${attrs.INT}`;
    html += this._initPill(initBase ?? 0, initDice ?? 1, pnj, initDetail);
    if (pnj.drainResist != null)
      html += this._rollPill("Drain", Math.max(0, pnj.drainResist - malus6), "Résistance au Drain");
    html += this._rollPill("Défense", Math.max(0, (pnj.defense || 0) - malus6), "Test de défense : Réaction + Intuition", "⛉");
    html += this._rollPill("Encaissement", pnj.damageResist, "Résistance aux dommages : Constitution + armure (non affectée par le malus de blessure)", "⛊");
    html += `<span class="stat-pill" title="Score Défensif">SD <strong>${sdBase ?? "?"}</strong></span>`;
    if (pa) html += `<span class="stat-pill">PA <strong>${pa}</strong></span>`;
    html += "</div>";

    // Moniteur unique (standard SR6) sauf si le PNJ a été généré avec le
    // réglage separateMonitors actif (physMon/stunMon posés, comme SR5).
    if (stunMon !== undefined) {
      html += `<div class="monitor-block">
        <div class="monitor-row">
          <span class="monitor-label">Phys</span>
          <div class="monitor-boxes monitor-phys">${this._monitorBoxes(pnj.id, "phys", physMon, physFilled ?? 0)}</div>
        </div>
        <div class="monitor-row" style="margin-top:4px;">
          <span class="monitor-label">Étourd</span>
          <div class="monitor-boxes monitor-stun">${this._monitorBoxes(pnj.id, "stun", stunMon, stunFilled ?? 0)}</div>
        </div>
        ${this._monitorMalusBadge(malus6)}
      </div>`;
    } else {
      const monTotal = me ?? 9;
      html += `<div class="monitor-block">
        <div class="monitor-row">
          <span class="monitor-label">État</span>
          <div class="monitor-boxes">${this._monitorBoxes(pnj.id, "phys", monTotal, physFilled ?? 0)}</div>
        </div>
        ${this._monitorMalusBadge(malus6)}
      </div>`;
    }

    html += this._weaponBlock(pnj, weapons, "sr6", deps);
    html += this._spellsBlock(pnj, spells, "sr6");
    html += this._drugRow(pnj, "sr6", deps);
    html += this._vehicleChipRow(pnj, deps);
    html += this._spiritChipRow(pnj, deps);
    html += "</div>"; // fin combat-zone

    // ---- ZONE CAPACITÉS ----
    html += '<div class="capacity-zone">';
    html += this._skillsSection(skills, malus6);
    if (powers && powers.length)
      html += this._listSection("Pouvoirs d'adepte", powers);
    if (traits && traits.length) html += this._listSection("Traits", traits);
    if (pnj.infectedPowers && pnj.infectedPowers.length)
      html += this._listSection("Pouvoirs (Infecté)", pnj.infectedPowers);
    if (pnj.infectedWeaknesses && pnj.infectedWeaknesses.length)
      html += this._listSection("Faiblesses (Infecté)", pnj.infectedWeaknesses);
    html += "</div>";

    // ---- ZONE RÉFÉRENCE ----
    html += this._refToggle(pnj, "Référence — attributs, réserves MJ, équipement");
    html += '<div class="ref-zone">';
    if (prefs.showAttributes) {
      const attrKeys = ["CON", "AGI", "RÉA", "FOR", "VOL", "LOG", "INT", "CHA"];
      const extras = [];
      if (attrs.MAG) extras.push("MAG");
      if (attrs.RES) extras.push("RES");
      if (attrs.ATO != null) extras.push("ATO");
      html += `<div class="ref-block"><div class="ref-lbl">Attributs</div>`;
      html += `<div class="attr-grid">${attrKeys.map((k) => this._attrCell(k, attrs[k] ?? "—")).join("")}</div>`;
      if (extras.length)
        html += `<div class="attr-grid attr-special-row">${extras.map((k) => this._attrCell(k, attrs[k], "attr-special")).join("")}</div>`;
      html += `<div class="limites-grid" style="margin-top:6px;">
        ${this._attrCell("ME", me ?? "?")}
      </div></div>`;
    }
    if (prefs.showGmPools) html += this._gmPoolsSR6(pnj);
    if (prefs.showEquipment && gear.length)
      html += this._equipSection(pnj, gear, "sr6", deps);
    if (pnj.cyberdeck) html += CyberdeckRenderer.block(pnj, "sr6", deps);
    if (augs && augs.length) html += this._listSection("Augmentations", augs);
    html += "</div>";

    html += "</div>";
    return html;
  },
});
