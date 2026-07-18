"use strict";

/* ============================================================
   CARD RENDERER — corps de carte Shadowrun 5e.
   ============================================================ */
import { CyberdeckRenderer } from "./cyberdeckrenderer.js";
import { ItemResolver } from "../../rules/itemresolver.js";
import { Utils } from "../../core/utils.js";

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
      <div class="card-section-label">Jets de situation</div>
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
      spells,
      complexForms,
      traits,
    } = pnj;

    const prefs = this._displayPrefs(deps);
    const augsKeys = App.getEditionModule("sr5").AUGS_KEYS;
    const { weapons, gear: gearAll } = ItemResolver.splitEquip(equip);
    // #63 : les items catalogue catégorisés cyberware/bioware rejoignent
    // l'affichage Augmentations (cf. ItemResolver.augItems) au lieu de
    // « Porté » — stockage inchangé, seul le tri d'affichage bouge.
    const gear = gearAll.filter((i) => !augsKeys.includes(ItemResolver.itemCat(i)));
    const augsAll = ItemResolver.augItems(pnj, augsKeys);
    let html = `<div class="pnj-card-body">`;

    // Deux pénalités distinctes : `wound5` (blessure seule) NE sert QUE le
    // badge de moniteur, qui nomme sa source ; `malus5` (blessure + effets
    // maintenus) s'applique à toutes les RÉSERVES affichées (Drain, Défense,
    // compétences…). Voir Utils.dicePenalty.
    const wound5 = Utils.woundMalus(pnj, "sr5");
    const malus5 = Utils.dicePenalty(pnj, "sr5");

    // ---- ZONE COMBAT ----
    let combatBody = '<div class="combat-row">';
    const initDetail = `${Utils.attrFullName("REA")} ${Actor.attr(pnj, "REA")} + ${Utils.attrFullName("INT")} ${Actor.attr(pnj, "INT")}`;
    combatBody += this._initPill(init, initDice, pnj, initDetail);
    if (drainResist != null)
      combatBody += this._rollPill("Drain", Math.max(0, drainResist - malus5), {
        title: "Résistance au Drain",
        key: "drainResist",
        pnj,
        deps,
      });
    combatBody += this._rollPill("Défense", Math.max(0, (pnj.defense || 0) - malus5), {
      title: "Test de défense : Réaction + Intuition",
      glyph: "⛉",
      key: "defense",
      pnj,
      deps,
    });
    combatBody += this._rollPill("Encaissement", pnj.damageResist, {
      title: "Résistance aux dommages : Constitution + armure (non affectée par le malus de blessure)",
      glyph: "⛊",
      key: "damageResist",
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
      ${this._monitorMalusBadge(wound5)}
      ${this._sustainBadge(pnj, "sr5")}
    </div>`;

    combatBody += this._weaponBlock(pnj, weapons, "sr5", deps);
    combatBody += this._spellsBlock(pnj, spells, "sr5");
    combatBody += this._complexFormsBlock(pnj, complexForms, "sr5");
    combatBody += this._drugRow(pnj, "sr5", deps);
    combatBody += this._vehicleChipRow(pnj, deps);
    combatBody += this._spiritChipRow(pnj, deps);
    combatBody += this._spriteCompileRow(pnj, deps);
    combatBody += CyberdeckRenderer.combatArsenal(pnj, "sr5"); // râtelier Attaques unifié
    const combatSummary = init != null ? `Init ${init}+${initDice}D6` : "";
    html += this._zoneShell(pnj, "combat", combatBody, combatSummary);
    html += this._modulesHtml(pnj, deps); // modules conditionnels (Magie, Matrice), après Combat

    // ---- ZONE CAPACITÉS ----
    let capBody = "";
    capBody += this._skillsSection(skills, malus5, { pnj });
    capBody += this._knowledgesSection(knowledges, pnj, malus5);
    // Pouvoirs d'adepte : vivent désormais dans le module Magie.
    if (traits && traits.length) capBody += this._listSection("Traits", traits);
    if (pnj.infectedPowers && pnj.infectedPowers.length)
      capBody += this._listSection("Pouvoirs (Infecté)", pnj.infectedPowers);
    if (pnj.infectedWeaknesses && pnj.infectedWeaknesses.length)
      capBody += this._listSection("Faiblesses (Infecté)", pnj.infectedWeaknesses);
    const capSummary = skills && skills.length ? `${skills.length} compétence${skills.length > 1 ? "s" : ""}` : "";
    html += this._zoneShell(pnj, "capacites", capBody, capSummary);

    // ---- ZONE DÉTAILS (repliable) ----
    let detailsBody = "";
    if (prefs.showAttributes) {
      const attrKeys = ["CON", "AGI", "REA", "FOR", "VOL", "LOG", "INT", "CHA"];
      // Attributs spéciaux : ESS toujours, puis MAG (éveillé) ou RES (techno).
      const extras = [
        "ESS",
        ...(attrs.MAG ? ["MAG"] : []),
        ...(attrs.RES ? ["RES"] : []),
        ...(attrs.CHC != null ? ["CHC"] : []),
      ];
      detailsBody += `<div class="ref-block"><div class="ref-lbl">Attributs</div>`;
      detailsBody += `<div class="attr-grid">${attrKeys.map((k) => this._attrCell(k, Actor.attr(pnj, k), "", { roll: true, edition: "sr5" })).join("")}</div>`;
      if (extras.length)
        // ESS n'est pas un pool de dés (ressource, pas un test) — non lançable.
        detailsBody += `<div class="attr-grid attr-special-row">${extras.map((k) => this._attrCell(k, Actor.attr(pnj, k), "attr-special", { roll: k !== "ESS", edition: "sr5" })).join("")}</div>`;
      detailsBody += `<div class="limites-grid" style="margin-top:6px;">
        ${this._attrCell("Lim.Phys", limPhys)}
        ${this._attrCell("Lim.Ment", limMent)}
        ${this._attrCell("Lim.Soc", limSoc)}
      </div></div>`;
    }
    if (prefs.showGmPools) detailsBody += this._gmPoolsSR5(pnj);
    // inventaire consolidé (Porté + Augmentations en une section).
    detailsBody += this._equipSection(pnj, prefs.showEquipment ? gear : [], "sr5", deps, augsAll);
    // Identités (SIN) : vit désormais dans le module `identites`, promu en
    // haut de carte — et n'est plus SR5-only (le champ est neutre).
    // Cyberdeck : vit désormais dans le module Matrice.
    html += this._zoneShell(pnj, "details", detailsBody, "attributs, jets de situation, équipement");

    html += "</div>";
    return html;
  },
});
