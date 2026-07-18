"use strict";

/* ============================================================
   CARD RENDERER — corps de carte Anarchy 2e édition.
   ============================================================ */
import { Actor } from "../../rules/actor.js";
import { ItemResolver } from "../../rules/itemresolver.js";
import { Utils } from "../../core/utils.js";

Object.assign(CardRenderer, {
  /** Badge de rappel « Points d'Anarchy de scène » accolé à un item
      d'équipement (cyberware p.77 / drogue p.159) qui en octroie. Décorateur
      passé à `_equipSection` — rend le MJ conscient, sur la fiche, que ce PNJ
      génère des points en scène (le compteur vivant est dans le cockpit).
      Neutre : `scenePoints` renvoie 0 pour tout item non concerné. */
  _anarchyPointBadge(s) {
    const n = AnarchyAtouts.scenePoints(s);
    if (n <= 0) return "";
    return ` <span class="anarchy-point-badge" title="Octroie +${n} point${n > 1 ? "s" : ""} d'Anarchy par scène (crédit au tap dans le cockpit)">◆+${n}</span>`;
  },

  /** Tags cliquables des armures optionnelles, dans la zone Combat. */
  _armorChipRow(pnj) {
    const opts = ItemResolver.armorOptions(pnj);
    if (!opts.length) return "";
    const chips = opts
      .map((o) => {
        const state = o.on
          ? '<span class="vehicle-chip-state on">● actif</span>'
          : '<span class="vehicle-chip-state"><svg class="icon icon-sm" aria-hidden="true"><use href="#ic-chevron"></use></svg> activer</span>';
        const title = o.on
          ? `${o.label} : seuils physiques +${o.bonus} — cliquer pour ranger`
          : `${o.label} : cliquer pour l'équiper (seuils physiques +${o.bonus})`;
        return `<span class="tag vehicle-chip armor-chip${o.on ? " deployed" : ""}" role="button" tabindex="0"
          data-action="toggle-armor" data-id="${pnj.id}" data-idx="${o.idx}"
          title="${this._esc(title)}">⛨ ${this._esc(o.label)} +${o.bonus}${state}</span>`;
      })
      .join("");
    return `<div class="combat-drugs armor-chips">${chips}</div>`;
  },

  _bodyAnarchy(pnj, deps) {
    const {
      attrs,
      skills,
      knowledges,
      edges,
      weapons,
      equip,
      spells,
      threatLevel,
      physMonitor,
      mentMonitor,
      matrixMonitor,
      awakened,
      notes,
      lifestyle,
      nuyenSpent,
      nuyenBudget,
    } = pnj;

    const prefs = this._displayPrefs(deps);
    // Overlay render-time des atouts d'ÉQUIPEMENT (RR/armure/blessure des
    // items catalogue, que le bake de génération ne voit pas). Neutre :
    // gating usesRiskPanel, pas de branche App.edition. Calculé une fois.
    const atouts = App.getEditionModule(pnj.edition)?.usesRiskPanel
      ? AnarchyAtouts.collect(pnj)
      : null;
    let html = `<div class="pnj-card-body">`;

    const fmtThresholds = (arr) =>
      arr ? `${arr[0]} / ${arr[1]} / ${arr[2]}` : "—";

    // ---- ZONE COMBAT ----
    let combatBody = '<div class="combat-row">';
    const combClass =
      threatLevel === "forte" || threatLevel === "extrême" ? "accent" : "";
    combatBody += `<span class="stat-pill ${combClass}">Combativité <strong>${threatLevel}</strong></span>`;
    if (awakened) {
      const evLabel =
        {
          hermétique: "Éveillé hermétique",
          adepte: "Adepte",
          chamanique: "Éveillé chaman",
        }[awakened] || awakened;
      combatBody += `<span class="stat-pill">✦ ${evLabel}</span>`;
    }
    combatBody += "</div>";

    // Moniteur d'état (p.68) : UN SEUL moniteur par personnage (2 cases
    // légères / 1 grave / 1 incapacitante, extensible par atout), quel
    // que soit le type de dommage. Les seuils Phys/Ment/Matr ci-dessous
    // ne déterminent que la GRAVITÉ d'un coup reçu (via des attributs de
    // résistance différents), pas des moniteurs séparés.
    combatBody += `<div class="monitor-block">
      <div class="monitor-row">
        <span class="monitor-label">État</span>
        <div class="monitor-boxes">${this._monitorBoxesAnarchy(pnj, atouts)}</div>
      </div>
    </div>`;

    // Seuils de blessures, sous la gestion des dégâts (un coup dont la VD
    // atteint le seuil 1/2/3 inflige une blessure légère/grave/incap.).
    // Les seuils physiques intègrent les armures optionnelles actives.
    const armorBonus =
      ItemResolver.armorOptionBonus(pnj) + (atouts ? atouts.armor : 0);
    const effPhys = physMonitor
      ? physMonitor.map((v) => v + armorBonus)
      : null;
    combatBody += `<div class="anarchy-seuils combat-seuils">
      <div class="anarchy-seuil-row"><span class="anarchy-seuil-label">Seuils phys.${armorBonus ? ` <span class="armor-bonus-note">(armure +${armorBonus})</span>` : ""}</span><span class="anarchy-seuil-val">${fmtThresholds(effPhys)}</span></div>
      <div class="anarchy-seuil-row" style="margin-top:3px;"><span class="anarchy-seuil-label">Seuils ment.</span><span class="anarchy-seuil-val">${fmtThresholds(mentMonitor)}</span></div>
      ${matrixMonitor ? `<div class="anarchy-seuil-row" style="margin-top:3px;"><span class="anarchy-seuil-label">Seuils matr.</span><span class="anarchy-seuil-val">${fmtThresholds(matrixMonitor)}</span></div>` : ""}
    </div>`;

    // Armes (lançables, ouvrent le panneau de risque RR)
    if (weapons && weapons.length) {
      combatBody += `<div class="weapon-block">`;
      // Rangé par catégorie (Mains nues → mêlée → pistolets → armes
      // d'épaule → lourd), rang lu depuis WEAPON_CATALOG (prohibition n°1).
      const ed = App.getEditionModule(pnj.edition);
      const sortedWeapons = weapons
        .slice()
        .sort((a, b) => ed.weaponCategoryRank(a.name) - ed.weaponCategoryRank(b.name));
      for (const a of sortedWeapons) {
        const noteStr = a.note
          ? ` <em style="color:var(--text-dim);font-size:0.58rem;">(${this._esc(a.note)})</em>`
          : "";
        const r = deps.WeaponRoll ? deps.WeaponRoll.resolvePool(pnj, a, pnj.edition) : null;
        if (r) {
          const rrTxt = r.rr ? ` RR${r.rr}` : "";
          const title = `${r.weaponName} : ${r.pool} dés (${r.matchedSkill || r.skill} ${r.skillVal}+${r.attr} ${r.attrVal}${rrTxt}) — cliquer pour lancer`;
          combatBody += `<div class="weapon-line weapon-rollable rollable" data-roll-weapon-anarchy="${this._esc(a.name)}" data-roll-pnj="${pnj.id}" title="${this._esc(title)}">
            <div><div class="weapon-name">${this._esc(a.name)}${noteStr}</div><div class="weapon-stat">VD ${a.vd} · ${this._esc(a.ranges)}</div></div>
            <span class="weapon-pool">⚄${r.pool}${r.rr ? `<span class="lim">RR${r.rr}</span>` : ""}</span>
          </div>`;
        } else {
          combatBody += `<div class="weapon-line">
            <div><div class="weapon-name">${this._esc(a.name)}${noteStr}</div><div class="weapon-stat">VD ${a.vd} · ${this._esc(a.ranges)}</div></div>
          </div>`;
        }
      }
      combatBody += "</div>";
    }
    // Sorts : en zone Combat, façon armes. Anarchy 2 lance via la
    // compétence Sorcellerie (jet de risque) — le Drain est géré par
    // complication. Pool = Sorcellerie (val + attribut + RR).
    if (spells && spells.length) {
      const sorc = (skills || []).find((s) => s.name === "Sorcellerie");
      const riskPool = sorc ? sorc.val + Actor.attr(pnj, sorc.attr) : 0;
      combatBody += this._spellsBlock(pnj, spells, pnj.edition, {
        viaRisk: true,
        riskPool,
        riskRR: sorc ? sorc.rr || 0 : 0,
      });
    }
    combatBody += this._drugRow(pnj, pnj.edition, deps);
    combatBody += this._armorChipRow(pnj);
    combatBody += this._vehicleChipRow(pnj, deps);
    combatBody += this._spiritChipRow(pnj, deps);
    combatBody += CyberdeckRenderer.combatArsenal(pnj, pnj.edition); // râtelier Attaques unifié
    const combatSummary = threatLevel ? `Combativité ${threatLevel}` : "";
    html += this._zoneShell(pnj, "combat", combatBody, combatSummary);
    html += this._modulesHtml(pnj, deps); // modules conditionnels (Magie, Matrice), après Combat

    // ---- ZONE CAPACITÉS ----
    let capBody = "";
    if (skills && skills.length) {
      capBody += `<div class="card-section">
        <div class="card-section-label">Compétences</div>
        <div class="card-section-content">`;
      for (const s of skills) {
        const attrVal = Actor.attr(pnj, s.attr);
        const pool = s.val + attrVal;
        // RR effective = RR bakée (edges) + RR d'équipement (atouts) ; overlay
        // local, le renderer ne mute jamais s.rr. Sans atout → s.rr inchangé.
        const effRr = AnarchyAtouts.skillRR(atouts, s);
        const rrStr = effRr > 0 ? ` RR${effRr}` : "";
        const detail = `${this._esc(Utils.attrFullName(s.attr))} ${attrVal} + ${this._esc(s.name)} ${s.val}${rrStr}`;
        const rollMain =
          pool >= 1
            ? ` data-roll="${pool}" data-roll-label="${this._esc(s.name)}" data-roll-detail="${detail}" data-roll-edition="${pnj.edition}" data-roll-rr="${effRr}" data-roll-pnj="${pnj.id}"`
            : "";
        capBody += this._rollableTag(
          pool >= 1,
          `tag skill-tag${pool >= 1 ? " rollable" : ""}`,
          `${rollMain} title="${this._esc(s.name)} : ${pool} (${s.val}+${s.attr}${rrStr}) — cliquer pour lancer"`,
          `${this._esc(s.name)}&nbsp;<strong style="color:var(--text)">${pool}</strong>${effRr > 0 ? `<span class="lim">RR${effRr}</span>` : ""}`,
        );
        // Puce de spécialisation (indice+2). La spé principale + chaque
        // spé supplémentaire (extraSpecs) partagent le même rendu lançable.
        const specChip = (specName, specVal, specAttrKey, specRr) => {
          const specAttrVal = Actor.attr(pnj, specAttrKey || s.attr);
          const specPool = specVal + specAttrVal;
          const specRrStr = specRr > 0 ? ` RR${specRr}` : "";
          const specDetail = `${this._esc(Utils.attrFullName(specAttrKey || s.attr))} ${specAttrVal} + ${this._esc(specName)} ${specVal}${specRrStr}`;
          const rollSpec =
            specPool >= 1
              ? ` data-roll="${specPool}" data-roll-label="${this._esc(s.name)} · ${this._esc(specName)}" data-roll-detail="${specDetail}" data-roll-edition="${pnj.edition}" data-roll-rr="${specRr}" data-roll-pnj="${pnj.id}"`
              : "";
          return this._rollableTag(
            specPool >= 1,
            `tag skill-tag skill-tag-spec${specPool >= 1 ? " rollable" : ""}`,
            `${rollSpec} title="Spécialisation ${this._esc(specName)} : ${specPool} (${specVal}+${specAttrKey || s.attr}${specRrStr}) — cliquer pour lancer"`,
            `◊&nbsp;${this._esc(specName)}&nbsp;<strong style="color:var(--text)">${specPool}</strong>${specRr > 0 ? `<span class="lim">RR${specRr}</span>` : ""}`,
          );
        };
        if (s.spec && s.spec !== true && s.specVal) {
          const bakedSpecRr = s.specRR != null ? s.specRR : s.rr || 0;
          capBody += specChip(
            s.spec,
            s.specVal,
            s.specAttr,
            AnarchyAtouts.specRR(atouts, s, s.spec, s.specAttr, bakedSpecRr),
          );
        }
        for (const ex of s.extraSpecs || []) {
          capBody += specChip(
            ex.name,
            ex.val != null ? ex.val : s.val + 2,
            ex.attr,
            AnarchyAtouts.specRR(atouts, s, ex.name, ex.attr, ex.rr || 0),
          );
        }
      }
      capBody += "</div></div>";
    }
    if (knowledges && knowledges.length) {
      // Connaissances (p.85) : flat, s'utilisent avec un attribut (souvent
      // Logique) selon le contexte — rendues en tags simples, non lançables.
      capBody += `<div class="card-section">
        <div class="card-section-label">Connaissances</div>
        <div class="card-section-content">
          ${knowledges.map((k) => `<span class="tag skill-tag skill-tag-knowledge">${this._esc(typeof k === "string" ? k : k.name)}</span>`).join("")}
        </div></div>`;
    }
    if (edges && edges.length) {
      capBody += `<div class="card-section">
        <div class="card-section-label">Atouts</div>
        <div class="card-section-content">`;
      // Les drogues sont pilotées depuis leur tag dans la zone Combat
      // (this._drugRow) — ici, texte simple pour éviter le doublon.
      for (const a of edges) {
        capBody += `<div class="anarchy-atout">• ${this._esc(a)}</div>`;
      }
      capBody += "</div></div>";
    }
    const capSummary = skills && skills.length ? `${skills.length} compétence${skills.length > 1 ? "s" : ""}` : "";
    html += this._zoneShell(pnj, "capacites", capBody, capSummary);

    // ---- ZONE DÉTAILS ----
    // (les seuils de blessures vivent dans la zone Combat, sous le moniteur)
    // PJ-b (dissolution de « zone Personnage » Anarchy) : Budget de création
    // + Lifestyle rejoignent Détails ; Mots-clés/Comportements/Répliques sont
    // partis en Incarnation (_flavorSection) ; le portefeuille VIVANT (nuyens
    // de campagne) vit dans le module Suivi (_suiviModule, PJ-c) — plus de
    // double-nuyens (I6 : plus de zone spéciale « Personnage » Anarchy-only).
    let detailsBody = "";
    if (nuyenBudget) {
      const spentStr = (nuyenSpent || 0).toLocaleString("fr-FR");
      const budgetStr = nuyenBudget.toLocaleString("fr-FR");
      detailsBody += `<div class="ref-block"><div class="ref-lbl">Budget de création</div>
        <div class="combat-row">
          <span class="stat-pill" title="Budget de création (dépensé / disponible)">${spentStr} / ${budgetStr} ¥</span>
          ${lifestyle ? `<span class="stat-pill">${this._esc(lifestyle)}</span>` : ""}
        </div>
      </div>`;
    } else if (lifestyle) {
      detailsBody += `<div class="ref-block"><div class="ref-lbl">Style de vie</div>
        <div class="combat-row"><span class="stat-pill">${this._esc(lifestyle)}</span></div>
      </div>`;
    }
    if (prefs.showAttributes) {
      const attrKeys = ["FOR", "AGI", "VOL", "LOG", "CHA"];
      detailsBody += `<div class="ref-block"><div class="ref-lbl">Attributs</div>
        <div class="attr-grid">${attrKeys.map((k) => this._attrCell(k, Actor.attr(pnj, k), "", { roll: true, edition: pnj.edition, rr: atouts ? atouts.attrRR[k] || 0 : 0 })).join("")}</div></div>`;
    }
    if (prefs.showEquipment && equip && equip.length)
      detailsBody += this._equipSection(pnj, equip, pnj.edition, deps, undefined, (s) =>
        this._anarchyPointBadge(s),
      );
    // Cyberdeck : vit désormais dans le module Matrice.
    if (notes) {
      detailsBody += `<div class="ref-block"><div class="ref-lbl">Notes</div>
        <div style="font-size:0.75rem;">${this._esc(notes)}</div></div>`;
    }
    html += this._zoneShell(pnj, "details", detailsBody, "attributs, équipement");

    html += "</div>";
    return html;
  },

  /**
   * Moniteur d'état Anarchy 2.0 (p.68) : UN SEUL moniteur par personnage,
   * à cases fixes : 2 légères (3 avec un atout), 1 grave (2 avec un
   * atout), 1 incapacitante. Les seuils Phys/Ment/Matr (cf. _bodyAnarchy)
   * ne servent qu'à déterminer la gravité d'un coup selon son type, pas
   * à définir des moniteurs séparés. `legerCapBonus`/`graveCapBonus` sur
   * le PNJ permettent d'ajouter les cases supplémentaires d'un atout.
   */
  _monitorBoxesAnarchy(pnj, atouts) {
    const CAPS = {
      leger: 2 + (pnj.legerCapBonus || 0) + (atouts ? atouts.legerBonus : 0),
      grave: 1 + (pnj.graveCapBonus || 0) + (atouts ? atouts.graveBonus : 0),
      incap: 1,
    };
    const seg = (sev) =>
      Array.from({ length: CAPS[sev] }, (_, i) => {
        const field = `${sev}Filled`;
        const filled = pnj[field] || 0;
        const isFilled = i < filled;
        const cls = ["monitor-box", `sev-${sev}`, isFilled ? "filled" : ""]
          .filter(Boolean)
          .join(" ");
        return `<div class="${cls}" data-action="toggle-monitor" data-id="${pnj.id}" data-sev="${sev}" data-idx="${i}"></div>`;
      }).join("");
    return `${seg("leger")}<span class="monitor-gap"></span>${seg("grave")}<span class="monitor-gap"></span>${seg("incap")}`;
  },
});
