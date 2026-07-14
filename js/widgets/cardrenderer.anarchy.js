"use strict";

/* ============================================================
   CARD RENDERER — corps de carte Anarchy 2e édition.
   ============================================================ */
Object.assign(CardRenderer, {
  /** Tags cliquables des armures optionnelles, dans la zone Combat. */
  _armorChipRow(pnj) {
    const opts = ItemResolver.armorOptions(pnj);
    if (!opts.length) return "";
    const chips = opts
      .map((o) => {
        const state = o.on
          ? '<span class="vehicle-chip-state on">● actif</span>'
          : '<span class="vehicle-chip-state">▸ activer</span>';
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
      isPC,
      keywords,
      behaviors,
      quotes,
      lifestyle,
      nuyenSpent,
      nuyenBudget,
    } = pnj;

    const prefs = this._displayPrefs(deps);
    const refOpen = this._refIsOpen(pnj, deps);
    let html = `<div class="pnj-card-body${refOpen ? "" : " ref-collapsed"}">`;

    const fmtThresholds = (arr) =>
      arr ? `${arr[0]} / ${arr[1]} / ${arr[2]}` : "—";

    // ---- ZONE COMBAT ----
    html += '<div class="combat-zone">';
    html += this._zoneEyebrow("Combat");
    html += '<div class="combat-row">';
    const combClass =
      threatLevel === "forte" || threatLevel === "extrême" ? "accent" : "";
    html += `<span class="stat-pill ${combClass}">Combativité <strong>${threatLevel}</strong></span>`;
    if (awakened) {
      const evLabel =
        {
          hermétique: "Éveillé hermétique",
          adepte: "Adepte",
          chamanique: "Éveillé chaman",
        }[awakened] || awakened;
      html += `<span class="stat-pill">✦ ${evLabel}</span>`;
    }
    html += "</div>";

    // Moniteur d'état (p.68) : UN SEUL moniteur par personnage (2 cases
    // légères / 1 grave / 1 incapacitante, extensible par atout), quel
    // que soit le type de dommage. Les seuils Phys/Ment/Matr ci-dessous
    // ne déterminent que la GRAVITÉ d'un coup reçu (via des attributs de
    // résistance différents), pas des moniteurs séparés.
    html += `<div class="monitor-block">
      <div class="monitor-row">
        <span class="monitor-label">État</span>
        <div class="monitor-boxes">${this._monitorBoxesAnarchy(pnj)}</div>
      </div>
    </div>`;

    // Seuils de blessures, sous la gestion des dégâts (un coup dont la VD
    // atteint le seuil 1/2/3 inflige une blessure légère/grave/incap.).
    // Les seuils physiques intègrent les armures optionnelles actives.
    const armorBonus = ItemResolver.armorOptionBonus(pnj);
    const effPhys = physMonitor
      ? physMonitor.map((v) => v + armorBonus)
      : null;
    html += `<div class="anarchy-seuils combat-seuils">
      <div class="anarchy-seuil-row"><span class="anarchy-seuil-label">Seuils phys.${armorBonus ? ` <span class="armor-bonus-note">(armure +${armorBonus})</span>` : ""}</span><span class="anarchy-seuil-val">${fmtThresholds(effPhys)}</span></div>
      <div class="anarchy-seuil-row" style="margin-top:3px;"><span class="anarchy-seuil-label">Seuils ment.</span><span class="anarchy-seuil-val">${fmtThresholds(mentMonitor)}</span></div>
      ${matrixMonitor ? `<div class="anarchy-seuil-row" style="margin-top:3px;"><span class="anarchy-seuil-label">Seuils matr.</span><span class="anarchy-seuil-val">${fmtThresholds(matrixMonitor)}</span></div>` : ""}
    </div>`;

    // Armes (lançables, ouvrent le panneau de risque RR)
    if (weapons && weapons.length) {
      html += `<div class="weapon-block">`;
      for (const a of weapons) {
        const noteStr = a.note
          ? ` <em style="color:var(--text-dim);font-size:0.58rem;">(${this._esc(a.note)})</em>`
          : "";
        const r = deps.WeaponRoll ? deps.WeaponRoll.resolvePool(pnj, a, pnj.edition) : null;
        if (r) {
          const rrTxt = r.rr ? ` RR${r.rr}` : "";
          const title = `${r.weaponName} : ${r.pool} dés (${r.matchedSkill || r.skill} ${r.skillVal}+${r.attr} ${r.attrVal}${rrTxt}) — cliquer pour lancer`;
          html += `<div class="weapon-line weapon-rollable rollable" data-roll-weapon-anarchy="${this._esc(a.name)}" data-roll-pnj="${pnj.id}" title="${this._esc(title)}">
            <div><div class="weapon-name">${this._esc(a.name)}${noteStr}</div><div class="weapon-stat">VD ${a.vd} · ${this._esc(a.ranges)}</div></div>
            <span class="weapon-pool">⚄${r.pool}${r.rr ? `<span class="lim">RR${r.rr}</span>` : ""}</span>
          </div>`;
        } else {
          html += `<div class="weapon-line">
            <div><div class="weapon-name">${this._esc(a.name)}${noteStr}</div><div class="weapon-stat">VD ${a.vd} · ${this._esc(a.ranges)}</div></div>
          </div>`;
        }
      }
      html += "</div>";
    }
    // Sorts (CH-M7e) : en zone Combat, façon armes. Anarchy 2 lance via la
    // compétence Sorcellerie (jet de risque) — le Drain est géré par
    // complication (CH-M7d). Pool = Sorcellerie (val + attribut + RR).
    if (spells && spells.length) {
      const sorc = (skills || []).find((s) => s.name === "Sorcellerie");
      const riskPool = sorc ? sorc.val + (attrs[sorc.attr] || 0) : 0;
      html += this._spellsBlock(pnj, spells, pnj.edition, {
        viaRisk: true,
        riskPool,
        riskRR: sorc ? sorc.rr || 0 : 0,
      });
    }
    html += this._drugRow(pnj, pnj.edition, deps);
    html += this._armorChipRow(pnj);
    html += this._vehicleChipRow(pnj, deps);
    html += this._spiritChipRow(pnj, deps);
    html += "</div>"; // fin combat-zone

    // ---- ZONE CAPACITÉS ----
    html += '<div class="capacity-zone">';
    if (skills && skills.length) {
      html += `<div class="card-section">
        <div class="card-section-label">Compétences</div>
        <div class="card-section-content">`;
      for (const s of skills) {
        const attrVal = attrs[s.attr] || 0;
        const pool = s.val + attrVal;
        const rrStr = s.rr > 0 ? ` RR${s.rr}` : "";
        const detail = `${this._esc(Utils.attrFullName(s.attr))} ${attrVal} + ${this._esc(s.name)} ${s.val}${rrStr}`;
        const rollMain =
          pool >= 1
            ? ` data-roll="${pool}" data-roll-label="${this._esc(s.name)}" data-roll-detail="${detail}" data-roll-edition="${pnj.edition}" data-roll-rr="${s.rr || 0}" data-roll-pnj="${pnj.id}"`
            : "";
        html += this._rollableTag(
          pool >= 1,
          `tag skill-tag${pool >= 1 ? " rollable" : ""}`,
          `${rollMain} title="${this._esc(s.name)} : ${pool} (${s.val}+${s.attr}${rrStr}) — cliquer pour lancer"`,
          `${this._esc(s.name)}&nbsp;<strong style="color:var(--text)">${pool}</strong>${s.rr > 0 ? `<span class="lim">RR${s.rr}</span>` : ""}`,
        );
        // Puce de spécialisation (indice+2). La spé principale + chaque
        // spé supplémentaire (extraSpecs) partagent le même rendu lançable.
        const specChip = (specName, specVal, specAttrKey, specRr) => {
          const specAttrVal = attrs[specAttrKey || s.attr] || 0;
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
          html += specChip(s.spec, s.specVal, s.specAttr, s.specRR != null ? s.specRR : s.rr || 0);
        }
        for (const ex of s.extraSpecs || []) {
          html += specChip(ex.name, ex.val != null ? ex.val : s.val + 2, ex.attr, ex.rr || 0);
        }
      }
      html += "</div></div>";
    }
    if (knowledges && knowledges.length) {
      // Connaissances (p.85) : flat, s'utilisent avec un attribut (souvent
      // Logique) selon le contexte — rendues en tags simples, non lançables.
      html += `<div class="card-section">
        <div class="card-section-label">Connaissances</div>
        <div class="card-section-content">
          ${knowledges.map((k) => `<span class="tag skill-tag skill-tag-knowledge">${this._esc(typeof k === "string" ? k : k.name)}</span>`).join("")}
        </div></div>`;
    }
    if (edges && edges.length) {
      html += `<div class="card-section">
        <div class="card-section-label">Atouts</div>
        <div class="card-section-content">`;
      // Les drogues sont pilotées depuis leur tag dans la zone Combat
      // (this._drugRow) — ici, texte simple pour éviter le doublon.
      for (const a of edges) {
        html += `<div class="anarchy-atout">• ${this._esc(a)}</div>`;
      }
      html += "</div></div>";
    }
    html += "</div>"; // fin capacity-zone

    // ---- ZONE PERSONNAGE (PJ uniquement) ----
    // Couche narrative propre aux personnages jouables (mots-clés,
    // comportements, répliques, p.50-51) + suivi de création/progression
    // (nuyens dépensés, Karma). Absente des PNJ (isPC non posé).
    if (isPC) html += this._pcNarrativeZone(pnj, { keywords, behaviors, quotes, lifestyle, nuyenSpent, nuyenBudget });

    // ---- ZONE RÉFÉRENCE ----
    // (les seuils de blessures vivent dans la zone Combat, sous le moniteur)
    html += this._refToggle(pnj, "Référence — attributs, équipement");
    html += '<div class="ref-zone">';
    if (prefs.showAttributes) {
      const attrKeys = ["FOR", "AGI", "VOL", "LOG", "CHA"];
      html += `<div class="ref-block"><div class="ref-lbl">Attributs</div>
        <div class="attr-grid">${attrKeys.map((k) => this._attrCell(k, attrs[k])).join("")}</div></div>`;
    }
    if (prefs.showEquipment && equip && equip.length)
      html += this._equipSection(pnj, equip, pnj.edition, deps);
    if (pnj.cyberdeck) html += CyberdeckRenderer.block(pnj, pnj.edition, deps);
    if (notes) {
      html += `<div class="ref-block"><div class="ref-lbl">Notes</div>
        <div style="font-size:0.75rem;">${this._esc(notes)}</div></div>`;
    }
    html += "</div>"; // fin ref-zone

    html += "</div>";
    return html;
  },

  /** Zone narrative d'un personnage jouable (p.50-51 : 5 mots-clés, 4
      comportements, 4 répliques) + budget de CRÉATION (nuyens dépensés).
      Le Karma et les nuyens VIVANTS de campagne vivent dans la zone
      Progression (cross-édition, cf. CardRenderer._progressionZone) : ici on
      ne garde que la référence de création, distincte du portefeuille courant. */
  _pcNarrativeZone(pnj, { keywords, behaviors, quotes, lifestyle, nuyenSpent, nuyenBudget }) {
    let html = '<div class="pc-narrative-zone">';
    html += this._zoneEyebrow("Personnage");

    html += '<div class="combat-row">';
    if (nuyenBudget) {
      const spentStr = (nuyenSpent || 0).toLocaleString("fr-FR");
      const budgetStr = nuyenBudget.toLocaleString("fr-FR");
      html += `<span class="stat-pill" title="Budget de création (dépensé / disponible)">${spentStr} / ${budgetStr} ¥</span>`;
    }
    if (lifestyle) html += `<span class="stat-pill">${this._esc(lifestyle)}</span>`;
    html += "</div>";

    if (keywords && keywords.length) html += this._listSection("Mots-clés", keywords);
    if (behaviors && behaviors.length) html += this._listSection("Comportements", behaviors);
    if (quotes && quotes.length) {
      html += `<div class="card-section">
        <div class="card-section-label">Répliques</div>
        <div class="card-section-content pc-quotes">
          ${quotes.map((q) => `<div class="pc-quote">« ${this._esc(q)} »</div>`).join("")}
        </div>
      </div>`;
    }
    html += "</div>"; // fin pc-narrative-zone
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
  _monitorBoxesAnarchy(pnj) {
    const CAPS = {
      leger: 2 + (pnj.legerCapBonus || 0),
      grave: 1 + (pnj.graveCapBonus || 0),
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
