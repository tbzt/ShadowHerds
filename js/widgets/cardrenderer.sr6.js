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
      <div class="card-section-label">Jets de situation</div>
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
      traits,
    } = pnj;

    const prefs = this._displayPrefs(deps);
    const { weapons, gear } = ItemResolver.splitEquip(equip);
    let html = `<div class="pnj-card-body">`;

    const malus6 = Utils.woundMalus(pnj, "sr6");

    // ---- ZONE COMBAT ----
    let combatBody = '<div class="combat-row">';
    const initDetail = `${Utils.attrFullName("RÉA")} ${Actor.attr(pnj, "RÉA")} + ${Utils.attrFullName("INT")} ${Actor.attr(pnj, "INT")}`;
    combatBody += this._initPill(initBase ?? 0, initDice ?? 1, pnj, initDetail);
    if (pnj.drainResist != null)
      combatBody += this._rollPill("Drain", Math.max(0, pnj.drainResist - malus6), "Résistance au Drain");
    combatBody += this._rollPill("Défense", Math.max(0, (pnj.defense || 0) - malus6), "Test de défense : Réaction + Intuition", "⛉");
    combatBody += this._rollPill("Encaissement", pnj.damageResist, "Résistance aux dommages : Constitution + armure (non affectée par le malus de blessure)", "⛊");
    combatBody += `<span class="stat-pill" title="Score Défensif">SD <strong>${sdBase ?? "?"}</strong></span>`;
    if (pa) combatBody += `<span class="stat-pill">PA <strong>${pa}</strong></span>`;
    combatBody += "</div>";

    // Moniteur unique (standard SR6) sauf si le PNJ a été généré avec le
    // réglage separateMonitors actif (physMon/stunMon posés, comme SR5).
    if (stunMon !== undefined) {
      combatBody += `<div class="monitor-block">
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
      combatBody += `<div class="monitor-block">
        <div class="monitor-row">
          <span class="monitor-label">État</span>
          <div class="monitor-boxes">${this._monitorBoxes(pnj.id, "phys", monTotal, physFilled ?? 0)}</div>
        </div>
        ${this._monitorMalusBadge(malus6)}
      </div>`;
    }

    combatBody += this._weaponBlock(pnj, weapons, "sr6", deps);
    combatBody += this._spellsBlock(pnj, spells, "sr6");
    combatBody += this._drugRow(pnj, "sr6", deps);
    combatBody += this._vehicleChipRow(pnj, deps);
    combatBody += this._spiritChipRow(pnj, deps);
    combatBody += CyberdeckRenderer.combatArsenal(pnj, "sr6"); // CP2 : râtelier Attaques unifié
    const combatSummary = initBase != null ? `Init ${initBase}+${initDice ?? 1}D6` : "";
    html += this._zoneShell(pnj, "combat", combatBody, combatSummary);
    html += this._modulesHtml(pnj, deps); // CP3 : modules conditionnels (Magie, Matrice), après Combat

    // ---- ZONE CAPACITÉS ----
    let capBody = "";
    capBody += this._skillsSection(skills, malus6);
    // Pouvoirs d'adepte : vivent désormais dans le module Magie (CP3).
    if (traits && traits.length) capBody += this._listSection("Traits", traits);
    if (pnj.infectedPowers && pnj.infectedPowers.length)
      capBody += this._listSection("Pouvoirs (Infecté)", pnj.infectedPowers);
    if (pnj.infectedWeaknesses && pnj.infectedWeaknesses.length)
      capBody += this._listSection("Faiblesses (Infecté)", pnj.infectedWeaknesses);
    const capSummary = skills && skills.length ? `${skills.length} compétence${skills.length > 1 ? "s" : ""}` : "";
    html += this._zoneShell(pnj, "capacites", capBody, capSummary);

    // ---- ZONE DÉTAILS ----
    let detailsBody = "";
    if (prefs.showAttributes) {
      const attrKeys = ["CON", "AGI", "RÉA", "FOR", "VOL", "LOG", "INT", "CHA"];
      const extras = [];
      if (attrs.MAG) extras.push("MAG");
      if (attrs.RES) extras.push("RES");
      if (attrs.ATO != null) extras.push("ATO");
      detailsBody += `<div class="ref-block"><div class="ref-lbl">Attributs</div>`;
      detailsBody += `<div class="attr-grid">${attrKeys.map((k) => this._attrCell(k, Actor.attr(pnj, k), "", { roll: true, edition: "sr6" })).join("")}</div>`;
      if (extras.length)
        detailsBody += `<div class="attr-grid attr-special-row">${extras.map((k) => this._attrCell(k, Actor.attr(pnj, k), "attr-special", { roll: true, edition: "sr6" })).join("")}</div>`;
      detailsBody += `<div class="limites-grid" style="margin-top:6px;">
        ${this._attrCell("ME", me ?? "?")}
      </div></div>`;
    }
    if (prefs.showGmPools) detailsBody += this._gmPoolsSR6(pnj);
    // CP2 : inventaire consolidé (Porté + Augmentations en une section).
    detailsBody += this._equipSection(pnj, prefs.showEquipment ? gear : [], "sr6", deps, augs);
    // Cyberdeck : vit désormais dans le module Matrice (CP3).
    html += this._zoneShell(pnj, "details", detailsBody, "attributs, jets de situation, équipement");

    html += "</div>";
    return html;
  },
});
