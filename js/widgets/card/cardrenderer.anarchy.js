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
        return `<span class="tag tag-clickable vehicle-chip armor-chip${o.on ? " deployed" : ""}" role="button" tabindex="0"
          data-action="toggle-armor" data-id="${pnj.id}" data-idx="${o.idx}"
          title="${this._esc(title)}">⛨ ${this._esc(o.label)} +${o.bonus}${state}</span>`;
      })
      .join("");
    return `<div class="cluster combat-drugs armor-chips">${chips}</div>`;
  },

  /** Overlay render-time des atouts d'ÉQUIPEMENT (RR/armure/blessure des items
      catalogue, que le bake de génération ne voit pas). Neutre : gating
      usesRiskPanel, pas de branche App.edition. Partagé par la fiche et la
      console « Agir » du tracker — une seule lecture des atouts, deux vues. */
  _anarchyAtouts(pnj) {
    return App.getEditionModule(pnj.edition)?.usesRiskPanel ? AnarchyAtouts.collect(pnj) : null;
  },

  /** ② Armes (Anarchy 2) — lançables, ouvrent le panneau de risque RR. Rangées
      par catégorie (mains nues → mêlée → pistolets → armes d'épaule → lourd),
      rang lu depuis WEAPON_CATALOG (prohibition n°1). Extrait de `_bodyAnarchy`
      pour que la console « Agir » serve le MÊME balisage que la fiche, plutôt
      qu'une copie qui dériverait. */
  _weaponBlockAnarchy(pnj, weapons, deps) {
    if (!weapons || !weapons.length) return "";
    const ed = App.getEditionModule(pnj.edition);
    const sorted = weapons
      .slice()
      .sort((a, b) => ed.weaponCategoryRank(a.name) - ed.weaponCategoryRank(b.name));
    let html = `<div class="stack weapon-block">`;
    for (const a of sorted) {
      const noteStr = a.note
        ? ` <em style="color:var(--text-dim);font-size:var(--fs-2xs);">(${this._esc(a.note)})</em>`
        : "";
      const r = deps.WeaponRoll ? deps.WeaponRoll.resolvePool(pnj, a, pnj.edition) : null;
      if (r) {
        const rrTxt = r.rr ? ` RR${r.rr}` : "";
        const title = `${r.weaponName} : ${r.pool} dés (${r.matchedSkill || r.skill} ${r.skillVal}+${r.attr} ${r.attrVal}${rrTxt}) — cliquer pour lancer`;
        html += `<div class="cluster weapon-line weapon-rollable rollable" data-roll-weapon-anarchy="${this._esc(a.name)}" data-roll-pnj="${pnj.id}" title="${this._esc(title)}">
            <div><div class="weapon-name">${this._esc(a.name)}${noteStr}</div><div class="weapon-stat">VD ${a.vd} · ${this._esc(a.ranges)}</div></div>
            <span class="weapon-pool">⚄${r.pool}${r.rr ? `<span class="lim">RR${r.rr}</span>` : ""}</span>
          </div>`;
      } else {
        html += `<div class="cluster weapon-line">
            <div><div class="weapon-name">${this._esc(a.name)}${noteStr}</div><div class="weapon-stat">VD ${a.vd} · ${this._esc(a.ranges)}</div></div>
          </div>`;
      }
    }
    return html + "</div>";
  },

  /** ③ Sorts (Anarchy 2) — lancés via Sorcellerie au jet de risque ; le Drain
      est géré par complication, d'où l'absence de réserve de Drain propre. */
  _spellsBlockAnarchy(pnj, spells, skills) {
    if (!spells || !spells.length) return "";
    const sorc = (skills || []).find((s) => s.name === "Sorcellerie");
    const riskPool = sorc ? sorc.val + Actor.attr(pnj, sorc.attr) : 0;
    return this._spellsBlock(pnj, spells, pnj.edition, {
      viaRisk: true,
      riskPool,
      riskRR: sorc ? sorc.rr || 0 : 0,
    });
  },

  /** ④ Compétences (Anarchy 2) — puces lançables indice+attribut, RR effective
      (bake + atouts d'équipement) et spécialisations comprises. Extrait de la
      zone Capacités de `_bodyAnarchy` pour la partager avec la console. */
  _skillsSectionAnarchy(pnj, skills, atouts) {
    if (!skills || !skills.length) return "";
    let capBody = `<div class="card-section">
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
    return capBody + "</div></div>";
  },

  /** Blocs d'OFFENSE d'Anarchy 2 pour la console « Agir » du tracker — le
      constructeur que `CardRenderer.offenseBlocks` attendait (elle repliait sur
      la fiche COMPLÈTE faute de l'avoir : cinq zones, dont Incarnation, Détails
      et Journal, pour jouer un tour). Même principe qu'en SR5/SR6 (« Agir
      produit / Réagir subit ») et même ordre : ① Actions est posé par le
      tracker, ② Armes → ③ Sorts · Matrice · véhicules · esprits · armures →
      ④ Compétences ici.
      HORS de l'offense, volontairement : le moniteur d'état et les seuils de
      blessure (ce que le PNJ SUBIT — la vie est dans l'effectif, le malus est
      déjà cuit dans les réserves affichées), et la Combativité (déjà en
      pastille sur la ligne, juste au-dessus de la console).
      Aucun balisage neuf : ce sont les helpers de la fiche, appelés dans un
      autre ordre — une lentille, pas un second rendu. */
  _offenseBlocksAnarchy(pnj, deps) {
    const ed = pnj.edition;
    const atouts = this._anarchyAtouts(pnj);
    let html = "";
    // R1 — état maintenu (⟳ ×N · −ND) + drogues actives, réémis même sans la
    // fiche complète (ils vivaient dans la zone Combat).
    const etat =
      this._sustainBadge(pnj, ed) +
      this._statusMalusBadge(pnj, ed, deps) +
      this._statusRow(pnj, ed, deps) +
      this._drugRow(pnj, ed, deps);
    if (etat) html += `<div class="cluster">${etat}</div>`;
    html += this._weaponBlockAnarchy(pnj, pnj.weapons, deps);
    html += this._spellsBlockAnarchy(pnj, pnj.spells, pnj.skills);
    html += this._armorChipRow(pnj);
    html += this._vehicleChipRow(pnj, deps);
    html += this._spiritChipRow(pnj, deps);
    html += CyberdeckRenderer.combatArsenal(pnj, ed);
    html += this._skillsSectionAnarchy(pnj, pnj.skills, atouts);
    return html;
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
      physMagicMonitor,
      mentMonitor,
      matrixMonitor,
      awakened,
      notes,
      lifestyle,
      nuyenSpent,
      nuyenBudget,
    } = pnj;

    const prefs = this._displayPrefs(deps);
    // Calculé une fois pour toute la carte (cf. _anarchyAtouts).
    const atouts = this._anarchyAtouts(pnj);
    let html = `<div class="pnj-card-body">`;

    const fmtThresholds = (arr) =>
      arr ? `${arr[0]} / ${arr[1]} / ${arr[2]}` : "—";

    // ---- ZONE COMBAT ----
    let combatBody = '<div class="cluster combat-row">';
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
      <div class="cluster monitor-row">
        <span class="monitor-label">État</span>
        <div class="cluster monitor-boxes">${this._monitorBoxesAnarchy(pnj, atouts)}</div>
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
    combatBody += `<div class="stack anarchy-seuils combat-seuils">
      <div class="cluster anarchy-seuil-row"><span class="anarchy-seuil-label">Seuils phys.${armorBonus ? ` <span class="armor-bonus-note">(armure +${armorBonus})</span>` : ""}</span><span class="anarchy-seuil-val">${fmtThresholds(effPhys)}</span></div>
      <div class="cluster anarchy-seuil-row" style="margin-top:3px;"><span class="anarchy-seuil-label">Seuils ment.</span><span class="anarchy-seuil-val">${fmtThresholds(mentMonitor)}</span></div>
      ${physMagicMonitor ? `<div class="cluster anarchy-seuil-row" style="margin-top:3px;"><span class="anarchy-seuil-label" title="Le livre imprime deux barèmes : celui-ci vaut face aux armes magiques">Seuils phys. (magiques)</span><span class="anarchy-seuil-val">${fmtThresholds(physMagicMonitor.map((v) => v + armorBonus))}</span></div>` : ""}
      ${matrixMonitor ? `<div class="cluster anarchy-seuil-row" style="margin-top:3px;"><span class="anarchy-seuil-label">Seuils matr.</span><span class="anarchy-seuil-val">${fmtThresholds(matrixMonitor)}</span></div>` : ""}
    </div>`;

    // Armes (lançables, ouvrent le panneau de risque RR) puis sorts : en zone
    // Combat, façon armes. Mêmes blocs que la console « Agir » du tracker.
    combatBody += this._weaponBlockAnarchy(pnj, weapons, deps);
    combatBody += this._spellsBlockAnarchy(pnj, spells, skills);
    combatBody += this._statusRow(pnj, pnj.edition, deps);
    combatBody += this._drugRow(pnj, pnj.edition, deps);
    combatBody += this._armorChipRow(pnj);
    combatBody += this._vehicleChipRow(pnj, deps);
    combatBody += this._spiritChipRow(pnj, deps);
    combatBody += CyberdeckRenderer.combatArsenal(pnj, pnj.edition); // râtelier Attaques unifié
    const combatSummary = threatLevel ? `Combativité ${threatLevel}` : "";
    html += this._zoneShell(pnj, "combat", combatBody, combatSummary);
    html += this._modulesHtml(pnj, deps); // modules conditionnels (Magie, Matrice), après Combat

    // ---- ZONE CAPACITÉS ----
    let capBody = this._skillsSectionAnarchy(pnj, skills, atouts);
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
        <div class="cluster combat-row">
          <span class="stat-pill" title="Budget de création (dépensé / disponible)">${spentStr} / ${budgetStr} ¥</span>
          ${lifestyle ? `<span class="stat-pill">${this._esc(lifestyle)}</span>` : ""}
        </div>
      </div>`;
    } else if (lifestyle) {
      detailsBody += `<div class="ref-block"><div class="ref-lbl">Style de vie</div>
        <div class="cluster combat-row"><span class="stat-pill">${this._esc(lifestyle)}</span></div>
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
        <div style="font-size:var(--fs-xs);">${this._esc(notes)}</div></div>`;
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
