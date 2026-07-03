"use strict";

/* ============================================================
   UI — CardRenderer, ContactRenderer, RunRenderer
   ============================================================ */

const CardRenderer = {
  /** Rend une card PNJ et retourne l'élément DOM */
  render(pnj, actions = ["save", "discard"]) {
    const el = document.createElement("div");
    el.className = "pnj-card scanning";
    el.dataset.id = pnj.id;
    el.dataset.edition = pnj.edition;

    el.innerHTML =
      this._header(pnj) + this._body(pnj) + this._footer(pnj, actions);

    setTimeout(() => el.classList.remove("scanning"), 900);
    return el;
  },

  /** Met à jour le contenu d'une card existante (après édition) */
  refresh(pnj) {
    const el = document.querySelector(`.pnj-card[data-id="${pnj.id}"]`);
    if (!el) return;
    const actions = el.dataset.savedActions
      ? JSON.parse(el.dataset.savedActions)
      : ["edit", "remove"];
    el.innerHTML =
      this._header(pnj) + this._body(pnj) + this._footer(pnj, actions);
  },

  /* ---- Header ---- */
  _header(pnj) {
    if (pnj.type === "vehicle") return this._headerVehicle(pnj);
    const gIcon = { M: "♂", F: "♀", NB: "⚧" }[pnj.gender] || "";
    let badge = "";

    if (pnj.edition === "anarchy") {
      const tier = pnj.tier || "Figurant";
      const tierClass = `rang-${tier.toLowerCase()}`;
      badge = `<span class="pnj-rank-badge ${tierClass}">${tier}</span>`;
    } else {
      badge = `<span class="pnj-rank-badge">PRO&nbsp;${pnj.proRating}</span>`;
    }

    const specialStr =
      pnj.special && pnj.special !== "Aucun"
        ? ` · <em>${pnj.special}</em>`
        : "";

    const metaStr = pnj.infected
      ? `${pnj.meta} <span class="pnj-metavariant pnj-infected">(${this._esc(pnj.infected)})</span>`
      : pnj.metavariant
        ? `${pnj.meta} <span class="pnj-metavariant">(${this._esc(pnj.metavariant)})</span>`
        : pnj.meta;

    const nameHtml = this._nameBlock(pnj.name);

    return `<div class="pnj-card-header">
      <div class="pnj-header-left">
        ${nameHtml}
        <div class="pnj-meta">${gIcon} ${metaStr} · ${pnj.archetype}${specialStr}</div>
      </div>
      ${badge}
    </div>`;
  },

  /* Découpe « Prénom "Surnom" Famille » : le surnom devient le titre
     mis en avant ; le nom civil (prénom + famille) passe en sous-ligne
     discrète. Si aucun surnom n'est présent, on affiche le nom tel quel. */
  _nameBlock(rawName) {
    const name = String(rawName ?? "");
    const m = name.match(/^(.*?)\s*[«"“]([^»"”]+)[»"”]\s*(.*)$/);
    if (m) {
      const alias = m[2].trim();
      const civil = `${m[1].trim()} ${m[3].trim()}`.replace(/\s+/g, " ").trim();
      return `<div class="pnj-name" title="${this._esc(name)}">${this._esc(alias)}</div>
        ${civil ? `<div class="pnj-civilname">${this._esc(civil)}</div>` : ""}`;
    }
    return `<div class="pnj-name" title="${this._esc(name)}">${this._esc(name)}</div>`;
  },

  /* ---- Header véhicule/drone lié ---- */
  _headerVehicle(v) {
    const icon = v.kind === "drone" ? "◇" : "▣";
    const kindLabel = v.kind === "drone" ? "Drone" : "Véhicule";
    return `<div class="pnj-card-header vehicle-header">
      <div class="pnj-header-left">
        <div class="pnj-name">${icon} ${this._esc(v.name)}</div>
        <div class="pnj-meta">
          <span class="vehicle-owner-link" role="button" tabindex="0"
            onclick="UI.focusOwner('${v.ownerId}')"
            title="Retrouver ${this._esc(v.ownerName)}">↳ lié à ${this._esc(v.ownerName)}</span>
        </div>
      </div>
      <span class="pnj-rank-badge vehicle-badge">${kindLabel}</span>
    </div>`;
  },

  /* ---- Body ---- */
  _body(pnj) {
    if (pnj.type === "vehicle") return this._bodyVehicle(pnj);
    let core;
    switch (pnj.edition) {
      case "sr5":
        core = this._bodySR5(pnj);
        break;
      case "sr6":
        core = this._bodySR6(pnj);
        break;
      case "anarchy":
        core = this._bodyAnarchy(pnj);
        break;
      default:
        return '<div class="pnj-card-body">—</div>';
    }
    // Injecter magie (tradition/esprit mentor) + traits raciaux + habillage
    const extra =
      this._magicSection(pnj) +
      this._metaTraitsSection(pnj) +
      this._flavorSection(pnj);
    if (extra) {
      const idx = core.lastIndexOf("</div>");
      if (idx !== -1) {
        core = core.slice(0, idx) + extra + core.slice(idx);
      }
    }
    return core;
  },

  /* ---- Tradition magique & esprit mentor (Éveillés) ---- */
  _magicSection(pnj) {
    let html = "";
    if (pnj.tradition) {
      html += this._listSection("Tradition", [
        { name: pnj.tradition, desc: pnj.traditionDesc },
      ]);
    }
    if (pnj.mentorSpirit) {
      html += this._listSection("Esprit mentor", [pnj.mentorSpirit]);
    }
    return html;
  },

  /* ---- Traits raciaux de métavariante ---- */
  _metaTraitsSection(pnj) {
    if (!pnj.metaTraits || !pnj.metaTraits.length) return "";
    const label =
      pnj.metaFamily === "zoocanthrope"
        ? "Traits zoocanthropes"
        : pnj.metaFamily === "metaconscience"
          ? "Traits de métaconscience"
          : "Traits de métavariante";
    return this._tagsSection(label, pnj.metaTraits);
  },

  /* ---- Habillage (âge, signe, manie, motivation, style, attitude) ---- */
  _flavorSection(pnj) {
    const f = pnj.flavor;
    if (!f) return "";
    const rows = [
      ["Âge", `${f.age} ans`],
      ["Signe distinctif", f.signe],
      ["Style", f.style],
      ["Attitude", f.attitude],
      ["Manie", f.manie],
      ["Motivation", f.motivation],
    ]
      .filter(([, v]) => v)
      .map(
        ([k, v]) =>
          `<div class="flavor-row"><span class="flavor-key">${k}</span><span class="flavor-val">${this._esc(String(v))}</span></div>`,
      )
      .join("");
    return `<div class="card-section flavor-section">
      <div class="card-section-label">Portrait</div>
      ${rows}
    </div>`;
  },

  /* ---- Réserves de dés utiles au MJ ---- */
  _gmPoolRow(label, value, title) {
    if (value == null) return "";
    const n = Number(value);
    const rollAttrs =
      Number.isFinite(n) && n >= 1
        ? ` data-roll="${n}" data-roll-label="${this._esc(label)}"`
        : "";
    const rollableCls = Number.isFinite(n) && n >= 1 ? " rollable" : "";
    return `<span class="stat-pill gm-pool${rollableCls}" title="${this._esc(title)}"${rollAttrs}>${label}&nbsp;<strong>${value}</strong></span>`;
  },

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

  /* ---- Body SR5 ---- */
  /* ========================================================
     REDESIGN — cartes organisées par usage de jeu
     Zone Combat (mise en avant) / Capacités / Référence (repliable)
     Préférences : défaut global (Réglages) + surcharge par carte
     (état de repli mémorisé sur pnj._refOpen).
     ======================================================== */

  /** Préférences d'affichage, avec valeurs par défaut. */
  _displayPrefs() {
    const def = {
      layout: "expanded", // 'expanded' (B) | 'compact' (A)
      showGmPools: true,
      showAttributes: true,
      showEquipment: true,
    };
    if (typeof Settings === "undefined" || !Settings.getCardDisplay) return def;
    return { ...def, ...Settings.getCardDisplay() };
  },

  /** La référence est-elle ouverte pour cette carte ? */
  _refIsOpen(pnj) {
    if (pnj._refOpen === true || pnj._refOpen === false) return pnj._refOpen;
    return this._displayPrefs().layout === "expanded";
  },

  /** Pastille de réserve lançable (Défense, Encaissement…). */
  _rollPill(label, value, title) {
    if (value == null) return "";
    return `<span class="stat-pill rollable combat-pill" data-roll="${value}" data-roll-label="${this._esc(label)}" title="${this._esc(title || label)}">${this._esc(label)} <strong>${value}</strong></span>`;
  },

  _zoneEyebrow(label) {
    return `<div class="zone-eyebrow">${this._esc(label)}</div>`;
  },

  /** Sépare l'équipement : weapons (lançables) vs reste. */
  _splitEquip(equip) {
    const weapons = [];
    const gear = [];
    (equip || []).forEach((i) => {
      if (typeof i === "string" && /\[/.test(i) && /(VD|PRE)/.test(i))
        weapons.push(i);
      else gear.push(i);
    });
    return { weapons, gear };
  },

  /** Bloc d'armes lançables, sorti dans la zone Combat. */
  _weaponBlock(pnj, weapons, edition) {
    if (!weapons.length) return "";
    const rows = weapons
      .map((w) => {
        const r =
          typeof WeaponRoll !== "undefined"
            ? WeaponRoll.resolvePool(pnj, w, edition)
            : null;
        const parsed =
          typeof WeaponRoll !== "undefined" ? WeaponRoll.parse(w) : { name: w };
        const name = parsed.name || w;
        const stat = String(w).includes("[")
          ? String(w).split("[")[1].replace("]", "").replace(/,\s*/g, " · ")
          : "";
        if (!r) {
          return `<div class="weapon-line"><div><div class="weapon-name">${this._esc(name)}</div><div class="weapon-stat">${this._esc(stat)}</div></div></div>`;
        }
        const approxTxt = r.approx ? " ~" : "";
        const smartTxt = r.smartBonus ? ` · +${r.smartBonus} smartlink` : "";
        const title = `${r.weaponName} : ${r.pool} dés (${r.matchedSkill || r.skill}${approxTxt})${r.limit != null ? ` · limite ${r.limit}` : ""}${smartTxt}`;
        const poolBadge = `<span class="weapon-pool">⚄${r.pool}${r.limit != null ? `<span class="lim">▸${r.limit}</span>` : ""}${r.rr ? `<span class="lim">RR${r.rr}</span>` : ""}${r.smartBonus ? `<span class="lim">SL+${r.smartBonus}</span>` : ""}</span>`;
        const dataAttr =
          edition === "anarchy"
            ? `data-roll-weapon-anarchy="${this._esc(name)}"`
            : `data-roll-weapon="${this._esc(w)}" data-roll-edition="${edition}"`;
        return `<div class="weapon-line weapon-rollable rollable" ${dataAttr} data-roll-pnj="${pnj.id}" title="${this._esc(title)}">
          <div><div class="weapon-name">${this._esc(name)}</div><div class="weapon-stat">${this._esc(stat)}</div></div>
          ${poolBadge}
        </div>`;
      })
      .join("");
    return `<div class="weapon-block">${rows}</div>`;
  },

  _refToggle(pnj, summary) {
    return `<button class="ref-toggle" data-ref-toggle="${pnj.id}">
      <span>${this._esc(summary)}</span>
      <span class="chev">▾</span>
    </button>`;
  },

  /* ---- Body d'une fiche véhicule/drone liée ---- */
  _bodyVehicle(v) {
    const s = v.stats || {};
    let html = '<div class="pnj-card-body vehicle-body">';
    html += '<div class="combat-zone">';
    html += this._zoneEyebrow(v.kind === "drone" ? "Drone" : "Véhicule");

    // Pills de stats brutes
    const statDefs =
      v.edition === "anarchy"
        ? [["Autopilote", s.autopilote], ["Structure", s.structure], ["Maniabilité", s.mania], ["Vitesse", s.vitesse], ["Blindage", s.blindage]]
        : [["Maniabilité", s.mania], ["Vitesse", s.vitesse], ["Accél", s.accel], ["Structure", s.structure], ["Blindage", s.blindage], ["Autopilote", s.pilote], ["Senseurs", s.senseurs]];
    html += '<div class="combat-row vehicle-stats">';
    for (const [label, val] of statDefs) {
      if (val == null) continue;
      html += `<span class="stat-pill" title="${label}">${label.slice(0, 5)} <strong>${val}</strong></span>`;
    }
    html += "</div>";

    // Réserves de dés (jets cliquables) + initiative SR5/SR6
    const edAttr = v.edition === "anarchy" ? ' data-roll-edition="anarchy"' : "";
    html += '<div class="combat-row">';
    const init = Vehicles.initiative(v);
    if (init) html += this._initPill(init.base, init.dice, v);
    for (const p of Vehicles.pools(v)) {
      if (p.weaponOnly && !(v.weapons || []).length) continue;
      const roll =
        p.pool >= 1
          ? ` data-roll="${p.pool}" data-roll-label="${this._esc(v.name)} — ${this._esc(p.label)}"${edAttr} data-roll-rr="0" data-roll-pnj="${v.id}"`
          : "";
      html += `<span class="stat-pill combat-pill${p.pool >= 1 ? " rollable" : ""}"${roll} title="${this._esc(p.title)}">${this._esc(p.label)} <strong>${p.pool}</strong></span>`;
    }
    html += "</div>";

    // Moniteur d'état
    if (v.edition === "anarchy") {
      const [l, g, i] = Vehicles.anarchyThresholds(v);
      html += `<div class="monitor-block">
        <div class="monitor-row">
          <span class="monitor-label" title="Seuils : léger ${l} / grave ${g} / incap ${i} (Structure+Blindage ×1/×2/×3)">État</span>
          <div class="monitor-boxes">${this._monitorBoxesAnarchy(v)}</div>
        </div>
        <div class="anarchy-seuil-row" style="margin-top:4px;">
          <span class="anarchy-seuil-label">Seuils dommages</span>
          <span class="anarchy-seuil-val">${l} / ${g} / ${i}</span>
        </div>
      </div>`;
    } else {
      html += `<div class="monitor-block">
        <div class="monitor-row">
          <span class="monitor-label">État</span>
          <div class="monitor-boxes">${this._monitorBoxes(v.id, "mon", v.monTotal || 9, v.monFilled || 0)}</div>
        </div>
      </div>`;
    }

    // Armes embarquées
    if ((v.weapons || []).length) {
      const atk = Vehicles.pools(v).find((p) => p.weaponOnly || p.label === "Autonome");
      html += '<div class="weapon-block">';
      for (const w of v.weapons) {
        const pool = atk ? atk.pool : 0;
        const roll =
          pool >= 1
            ? ` data-roll="${pool}" data-roll-label="${this._esc(v.name)} — ${this._esc(w.name)}"${edAttr} data-roll-rr="0" data-roll-pnj="${v.id}"`
            : "";
        html += `<div class="weapon-line${pool >= 1 ? " weapon-rollable rollable" : ""}"${roll} title="Arme embarquée — cliquer pour lancer ${pool} dés">
          <div><div class="weapon-name">${this._esc(w.name)}</div><div class="weapon-stat">${this._esc(w.vd || "")}</div></div>
          ${pool >= 1 ? `<span class="weapon-pool">⚄${pool}</span>` : ""}
        </div>`;
      }
      html += "</div>";
    }
    html += "</div>"; // fin combat-zone

    // Notes RR (Anarchy) + notes libres
    if (v.rrNotes || v.notes) {
      html += '<div class="capacity-zone">';
      if (v.rrNotes)
        html += `<div class="card-section"><div class="card-section-label">Bonus</div>
          <div class="card-section-content"><span class="tag">${this._esc(v.rrNotes)}</span></div></div>`;
      if (v.notes)
        html += `<div class="card-section"><div class="card-section-label">Notes</div>
          <div style="font-size:0.75rem;">${this._esc(v.notes)}</div></div>`;
      html += "</div>";
    }

    html += "</div>";
    return html;
  },

  /** Rangée de chips « Drones & véhicules » dans la zone Combat du
      propriétaire : 1 clic déploie la fiche liée, re-clic la retrouve. */
  _vehicleChipRow(pnj) {
    if (typeof Vehicles === "undefined" || typeof UI === "undefined") return "";
    const items = UI._vehicleItems(pnj);
    if (!items.length) return "";
    const chips = items
      .map((item, idx) => {
        const parsed = Vehicles.matchItem(item, pnj.edition);
        const deployed = Vehicles.linkedTo(pnj.id, item).length > 0;
        const icon = parsed.kind === "drone" ? "◇" : "▣";
        const label = parsed.count > 1 ? `${parsed.count}× ${parsed.name}` : parsed.name;
        const state = deployed
          ? '<span class="vehicle-chip-state on">● fiche</span>'
          : '<span class="vehicle-chip-state">▸ déployer</span>';
        return `<span class="tag vehicle-chip${deployed ? " deployed" : ""}" role="button" tabindex="0"
          onclick="UI.deployVehicle('${pnj.id}',${idx})"
          title="${this._esc(item)}">${icon} ${this._esc(label)}${state}</span>`;
      })
      .join("");
    return `<div class="combat-drugs vehicle-chips">${chips}</div>`;
  },

  _bodySR5(pnj) {
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
      equip,
      augs,
      spells,
      powers,
      traits,
    } = pnj;

    const prefs = this._displayPrefs();
    const refOpen = this._refIsOpen(pnj);
    const { weapons, gear } = this._splitEquip(equip);
    let html = `<div class="pnj-card-body${refOpen ? "" : " ref-collapsed"}">`;

    const malus5 = Utils.woundMalus(pnj, "sr5");

    // ---- ZONE COMBAT ----
    html += '<div class="combat-zone">';
    html += this._zoneEyebrow("Combat");
    html += '<div class="combat-row">';
    html += this._initPill(init, initDice, pnj);
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

    html += this._weaponBlock(pnj, weapons, "sr5");
    html += this._drugRow(pnj, "sr5");
    html += this._vehicleChipRow(pnj);
    html += "</div>"; // fin combat-zone

    // ---- ZONE CAPACITÉS ----
    html += '<div class="capacity-zone">';
    html += this._skillsSection(skills, malus5);
    if (spells && spells.length) html += this._listSection("Sorts", spells);
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
      const extras = ["ESS", ...(attrs.MAG ? ["MAG"] : [])];
      html += `<div class="ref-block"><div class="ref-lbl">Attributs</div>`;
      html += `<div class="attr-grid">${attrKeys.map((k) => this._attrCell(k, attrs[k])).join("")}</div>`;
      if (extras.length)
        html += `<div class="attr-grid with-ess">${extras.map((k) => this._attrCell(k, attrs[k])).join("")}</div>`;
      html += `<div class="limites-grid" style="margin-top:6px;">
        ${this._attrCell("Lim.Phys", limPhys)}
        ${this._attrCell("Lim.Ment", limMent)}
        ${this._attrCell("Lim.Soc", limSoc)}
      </div></div>`;
    }
    if (prefs.showGmPools) html += this._gmPoolsSR5(pnj);
    if (prefs.showEquipment && gear.length)
      html += this._equipSection(pnj, gear, "sr5");
    if (augs && augs.length) html += this._listSection("Augmentations", augs);
    html += "</div>"; // fin ref-zone

    html += "</div>";
    return html;
  },

  /* ---- Body SR6 ---- */
  _bodySR6(pnj) {
    const {
      attrs,
      me,
      sdBase,
      initBase,
      initDice,
      pa,
      physFilled,
      skills,
      equip,
      augs,
      spells,
      powers,
      traits,
    } = pnj;

    const prefs = this._displayPrefs();
    const refOpen = this._refIsOpen(pnj);
    const { weapons, gear } = this._splitEquip(equip);
    let html = `<div class="pnj-card-body${refOpen ? "" : " ref-collapsed"}">`;

    const malus6 = Utils.woundMalus(pnj, "sr6");

    // ---- ZONE COMBAT ----
    html += '<div class="combat-zone">';
    html += this._zoneEyebrow("Combat");
    html += '<div class="combat-row">';
    html += this._initPill(initBase ?? 0, initDice ?? 1, pnj);
    if (pnj.drainResist != null)
      html += this._rollPill("Drain", Math.max(0, pnj.drainResist - malus6), "Résistance au Drain");
    html += this._rollPill("Défense", Math.max(0, (pnj.defense || 0) - malus6), "Test de défense");
    html += this._rollPill("Encaissement", pnj.damageResist, "Résistance aux dommages : Constitution + armure (non affectée par le malus de blessure)");
    html += `<span class="stat-pill" title="Score Défensif">SD <strong>${sdBase ?? "?"}</strong></span>`;
    if (pa) html += `<span class="stat-pill">PA <strong>${pa}</strong></span>`;
    html += "</div>";

    const monTotal = me ?? 9;
    html += `<div class="monitor-block">
      <div class="monitor-row">
        <span class="monitor-label">État</span>
        <div class="monitor-boxes">${this._monitorBoxes(pnj.id, "phys", monTotal, physFilled ?? 0)}</div>
      </div>
    </div>`;

    html += this._weaponBlock(pnj, weapons, "sr6");
    html += this._drugRow(pnj, "sr6");
    html += this._vehicleChipRow(pnj);
    html += "</div>"; // fin combat-zone

    // ---- ZONE CAPACITÉS ----
    html += '<div class="capacity-zone">';
    html += this._skillsSection(skills, malus6);
    if (spells && spells.length) html += this._listSection("Sorts", spells);
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
      html += `<div class="ref-block"><div class="ref-lbl">Attributs</div>`;
      html += `<div class="attr-grid">${attrKeys.map((k) => this._attrCell(k, attrs[k] ?? "—")).join("")}</div>`;
      if (extras.length)
        html += `<div class="attr-grid with-ess">${extras.map((k) => this._attrCell(k, attrs[k])).join("")}</div>`;
      html += `<div class="limites-grid" style="margin-top:6px;">
        ${this._attrCell("ME", me ?? "?")}
      </div></div>`;
    }
    if (prefs.showGmPools) html += this._gmPoolsSR6(pnj);
    if (prefs.showEquipment && gear.length)
      html += this._equipSection(pnj, gear, "sr6");
    if (augs && augs.length) html += this._listSection("Augmentations", augs);
    html += "</div>";

    html += "</div>";
    return html;
  },

  /* ---- Body Anarchy 2e ---- */
  _bodyAnarchy(pnj) {
    const {
      attrs,
      skills,
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
    } = pnj;

    const prefs = this._displayPrefs();
    const refOpen = this._refIsOpen(pnj);
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

    // Armes (lançables, ouvrent le panneau de risque RR)
    if (weapons && weapons.length) {
      html += `<div class="weapon-block">`;
      for (const a of weapons) {
        const noteStr = a.note
          ? ` <em style="color:var(--text-dim);font-size:0.58rem;">(${this._esc(a.note)})</em>`
          : "";
        const r =
          typeof WeaponRoll !== "undefined"
            ? WeaponRoll.resolvePool(pnj, a, "anarchy")
            : null;
        if (r) {
          const rrTxt = r.rr ? ` RR${r.rr}` : "";
          const title = `${r.weaponName} : ${r.pool} dés (${r.skill} ${r.skillVal}+${r.attr} ${r.attrVal}${rrTxt}) — cliquer pour lancer`;
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
    html += this._drugRow(pnj, "anarchy");
    html += this._vehicleChipRow(pnj);
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
        const rollMain =
          pool >= 1
            ? ` data-roll="${pool}" data-roll-label="${this._esc(s.name)}" data-roll-edition="anarchy" data-roll-rr="${s.rr || 0}" data-roll-pnj="${pnj.id}"`
            : "";
        html += `<span class="tag skill-tag${pool >= 1 ? " rollable" : ""}"${rollMain} title="${this._esc(s.name)} : ${pool} (${s.val}+${s.attr}${rrStr}) — cliquer pour lancer">${this._esc(s.name)}&nbsp;<strong style="color:var(--text)">${pool}</strong>${s.rr > 0 ? `<span class="lim">RR${s.rr}</span>` : ""}</span>`;
        if (s.spec && s.spec !== true && s.specVal) {
          const specAttrVal = attrs[s.specAttr || s.attr] || 0;
          const specPool = s.specVal + specAttrVal;
          const specRr = s.specRR != null ? s.specRR : s.rr || 0;
          const specRrStr = specRr > 0 ? ` RR${specRr}` : "";
          const rollSpec =
            specPool >= 1
              ? ` data-roll="${specPool}" data-roll-label="${this._esc(s.name)} · ${this._esc(s.spec)}" data-roll-edition="anarchy" data-roll-rr="${specRr}" data-roll-pnj="${pnj.id}"`
              : "";
          html += `<span class="tag skill-tag skill-tag-spec${specPool >= 1 ? " rollable" : ""}"${rollSpec} title="Spécialisation ${this._esc(s.spec)} : ${specPool}${specRrStr} — cliquer pour lancer">◊&nbsp;${this._esc(s.spec)}&nbsp;<strong style="color:var(--text)">${specPool}</strong>${specRr > 0 ? `<span class="lim">RR${specRr}</span>` : ""}</span>`;
        }
      }
      html += "</div></div>";
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
    if (spells && spells.length) html += this._listSection("Sorts", spells);
    html += "</div>"; // fin capacity-zone

    // ---- ZONE RÉFÉRENCE ----
    html += this._refToggle(pnj, "Référence — attributs, seuils, équipement");
    html += '<div class="ref-zone">';
    if (prefs.showAttributes) {
      const attrKeys = ["FOR", "AGI", "VOL", "LOG", "CHA"];
      html += `<div class="ref-block"><div class="ref-lbl">Attributs</div>
        <div class="attr-grid">${attrKeys.map((k) => this._attrCell(k, attrs[k])).join("")}</div></div>`;
    }
    html += `<div class="ref-block"><div class="ref-lbl">Seuils de blessures</div>
      <div class="anarchy-seuils">
        <div class="anarchy-seuil-row"><span class="anarchy-seuil-label">Physiques</span><span class="anarchy-seuil-val">${fmtThresholds(physMonitor)}</span></div>
        <div class="anarchy-seuil-row" style="margin-top:3px;"><span class="anarchy-seuil-label">Mentales</span><span class="anarchy-seuil-val">${fmtThresholds(mentMonitor)}</span></div>
        ${matrixMonitor ? `<div class="anarchy-seuil-row" style="margin-top:3px;"><span class="anarchy-seuil-label">Matricielles</span><span class="anarchy-seuil-val">${fmtThresholds(matrixMonitor)}</span></div>` : ""}
      </div></div>`;
    if (prefs.showEquipment && equip && equip.length)
      html += this._equipSection(pnj, equip, "anarchy");
    if (notes) {
      html += `<div class="ref-block"><div class="ref-lbl">Notes</div>
        <div style="font-size:0.75rem;">${this._esc(notes)}</div></div>`;
    }
    html += "</div>"; // fin ref-zone

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
        return `<div class="${cls}" onclick="UI.toggleMonitor('${pnj.id}','${sev}',${i})"></div>`;
      }).join("");
    return `${seg("leger")}<span class="monitor-gap"></span>${seg("grave")}<span class="monitor-gap"></span>${seg("incap")}`;
  },

  /* ---- Helpers ---- */
  _initPill(base, dice, pnj) {
    const b = Number(base) || 0;
    const d = Number(dice) || 1;
    const id = pnj && pnj.id ? pnj.id : "";
    const li = pnj && pnj.lastInit ? pnj.lastInit : null;

    // Résultat lancé affiché à la suite, avec bouton d'effacement.
    let resultHtml = "";
    if (li && Number.isFinite(li.total)) {
      const detail = `${li.base} + [${(li.faces || []).join(", ")}]`;
      resultHtml =
        ` <span class="init-result" title="${this._esc(li.total + " = " + detail)}">` +
        `→ <strong>${li.total}</strong>` +
        `<span class="init-clear" data-init-clear="${id}" role="button" title="Effacer l'initiative">✕</span>` +
        `</span>`;
    }

    return `<span class="stat-pill accent rollable init-pill" data-roll-init="${b}" data-roll-init-dice="${d}" data-roll-pnj="${id}" title="Lancer l'initiative : ${b} + ${d}D6">Init <strong>${b}+${d}D6</strong>${resultHtml}</span>`;
  },

  _attrCell(label, value, extraClass = "", opts = {}) {
    const n = Number(value);
    const rollable = opts.roll && Number.isFinite(n) && n >= 1;
    const edAttr = opts.edition ? ` data-roll-edition="${opts.edition}"` : "";
    const rollAttrs = rollable
      ? ` data-roll="${n}" data-roll-label="${this._esc(label)}"${edAttr} data-roll-rr="0" title="Lancer ${n} dés — ${this._esc(label)}"`
      : "";
    const cls = `attr-cell ${extraClass} ${rollable ? "rollable" : ""}`.trim();
    return `<div class="${cls}"${rollAttrs}>
      <span class="attr-label">${label}</span>
      <span class="attr-value">${value ?? "—"}</span>
    </div>`;
  },

  _monitorBoxes(pnjId, type, total, filled = 0) {
    return Array.from({ length: total }, (_, i) => {
      const isFilled = i < filled;
      // Pénalité toutes les 3 cases
      const isPenalty = (i + 1) % 3 === 0;
      const cls =
        `monitor-box ${isFilled ? "filled" : ""} ${isPenalty ? "penalty" : ""}`.trim();
      return `<div class="${cls}" onclick="UI.toggleMonitor('${pnjId}','${type}',${i})"></div>`;
    }).join("");
  },

  _skillsSection(skills, malus = 0) {
    if (!skills || !skills.length) return "";
    const malusTxt = malus > 0 ? ` (malus blessure −${malus})` : "";
    const tags = skills
      .map((s) => {
        const n = Number(s.val);
        const eff = Number.isFinite(n) ? Math.max(0, n - malus) : n;
        const rollAttrs =
          Number.isFinite(eff) && eff >= 1
            ? ` data-roll="${eff}" data-roll-label="${this._esc(s.name)}" title="Lancer ${eff} dés — ${this._esc(s.name)}${malusTxt}"`
            : "";
        const rollCls = Number.isFinite(eff) && eff >= 1 ? " rollable" : "";
        let html = `<span class="tag skill-tag${rollCls}"${rollAttrs}>${this._esc(s.name)}&nbsp;<strong style="color:var(--text)">${eff}</strong></span>`;
        if (s.spec && s.spec !== true) {
          // Spécialité : +2 dés sur le pool en SR5/SR6.
          const specN = Number.isFinite(n) ? Math.max(0, n + 2 - malus) : null;
          const specRoll =
            specN && specN >= 1
              ? ` data-roll="${specN}" data-roll-label="${this._esc(s.name)} · ${this._esc(s.spec)}" title="Spécialité ${this._esc(s.spec)} : ${specN} dés (+2)${malusTxt}"`
              : ` title="Spécialité ${this._esc(s.spec)} : +2 dés${malusTxt}"`;
          html += `<span class="tag skill-tag skill-tag-spec${specN ? " rollable" : ""}"${specRoll}>◊&nbsp;${this._esc(s.spec)}</span>`;
        }
        return html;
      })
      .join("");
    return `<div class="card-section">
      <div class="card-section-label">Compétences${malus > 0 ? ` <span class="wound-malus-badge" title="Malus de blessure automatique">−${malus}D</span>` : ""}</div>
      <div class="card-section-content">
        ${tags}
      </div>
    </div>`;
  },

  _listSection(label, items) {
    if (!items || !items.length) return "";
    return `<div class="card-section">
      <div class="card-section-label">${label}</div>
      <div class="card-section-content">
        ${items.map((i) => this._contentTag(i)).join("")}
      </div>
    </div>`;
  },

  /* Rend un élément de contenu : objet {nom, desc} -> tag cliquable
     ouvrant une modale ; chaîne simple -> tag normal. Pour les sorts, un
     champ drain (SR5/SR6) ou niveau (Anarchy) est affiché dans le libellé. */
  /* Libellé court d'un bonus de trait (voir BonusEngine / content.js). */
  _bonusLabel(bonus) {
    if (!bonus) return "";
    if (bonus.initDice) return `+${bonus.initDice} Init`;
    if (bonus.stat) {
      const labels = { composure: "Sang-froid", memory: "Mémoire" };
      return `+${bonus.val} ${labels[bonus.stat] || bonus.stat}`;
    }
    if (bonus.attr) return `+${bonus.val} ${bonus.attr}`;
    if (bonus.skill) return `+${bonus.val} ${bonus.skill}`;
    return "";
  },

  _contentTag(item) {
    if (item && typeof item === "object" && item.name) {
      const name = this._esc(item.name);
      // Suffixe Drain (SR5/SR6) ou Seuil (Anarchy 2.0) pour les sorts.
      let suffix = "";
      if (item.drain != null) {
        suffix = ` <span class="tag-stat">(Drain ${this._esc(item.drain)})</span>`;
      } else if (item.seuil != null) {
        suffix = ` <span class="tag-stat">(Seuil ${this._esc(item.seuil)})</span>`;
      } else if (item.bonus) {
        const label = this._bonusLabel(item.bonus);
        if (label) suffix = ` <span class="tag-stat">(${this._esc(label)})</span>`;
      }
      if (item.desc) {
        // _esc échappe " donc le contenu est sûr dans un attribut entre guillemets.
        // Pas de onclick inline : on stocke nom/desc en data-* et on délègue
        // le clic/clavier (voir ContentModal.bindDelegation), ce qui évite tout
        // problème d'apostrophes ou de guillemets dans le texte.
        const desc = this._esc(item.desc);
        const t = this._esc(item.name);
        return `<span class="tag tag-clickable" role="button" tabindex="0"
          data-content-name="${t}" data-content-desc="${desc}"
          >${name}${suffix}<span class="tag-info">i</span></span>`;
      }
      return `<span class="tag">${name}${suffix}</span>`;
    }
    return `<span class="tag">${this._esc(item)}</span>`;
  },

  _tagsSection(label, items) {
    return this._listSection(label, items);
  },

  /** Tag cliquable d'une drogue détectée : cycle à 3 clics idle → effet →
      contrecoup → idle (OK), cf. js/drugs.js. */
  _drugTag(pnj, edition, drug, rawLabel) {
    const state = Drugs.state(pnj, drug.id);
    const next = Drugs.next(state);
    const nextLabel = { effect: "Effet", sideEffect: "Contrecoup", idle: "OK" }[next];
    const info =
      state === "idle"
        ? `${drug.effect.text} → ${drug.sideEffect.text}`
        : state === "effect"
          ? drug.effect.text
          : drug.sideEffect.text;
    const stateClass =
      state === "effect" ? " drug-effect" : state === "sideEffect" ? " drug-side" : "";
    return `<span class="tag drug-tag${stateClass}" role="button" tabindex="0"
      onclick="UI.cycleDrug('${pnj.id}','${edition}','${drug.id}')"
      title="${this._esc(info)}">${this._esc(rawLabel)}<span class="drug-next">${nextLabel}</span></span>`;
  },

  /** Ligne compacte, toujours visible dans la zone Combat (pas besoin de
      déplier la Référence), listant les drogues détectées dans
      l'équipement (SR5/SR6) et les atouts (Anarchy). */
  _drugRow(pnj, edition) {
    if (typeof Drugs === "undefined") return "";
    const found = [];
    for (const i of pnj.equip || []) {
      const drug = Drugs.matchItem(i, edition, "equip");
      if (drug) found.push(this._drugTag(pnj, edition, drug, i));
    }
    if (edition === "anarchy") {
      for (const a of pnj.edges || []) {
        const drug = Drugs.matchItem(a, "anarchy", "edges");
        if (drug) found.push(this._drugTag(pnj, edition, drug, a));
      }
    }
    if (!found.length) return "";
    return `<div class="combat-drugs">${found.join("")}</div>`;
  },

  /** Section Équipement où les weapons (VD/PRE) deviennent lançables. */
  _equipSection(pnj, items, edition) {
    if (!items || !items.length) return "";
    const tags = items
      .map((i) => {
        // Les drogues sont pilotées depuis leur tag dans la zone Combat
        // (this._drugRow) — ici, texte simple pour éviter le doublon.
        if (typeof Drugs !== "undefined" && Drugs.matchItem(i, edition, "equip"))
          return this._contentTag(i);
        const isWeapon =
          typeof i === "string" && /\[/.test(i) && /(VD|PRE)/.test(i);
        if (!isWeapon) return this._contentTag(i);
        const r =
          typeof WeaponRoll !== "undefined"
            ? WeaponRoll.resolvePool(pnj, i, edition)
            : null;
        if (!r) return this._contentTag(i);
        const limTxt = r.limit != null ? ` · lim ${r.limit}` : "";
        const approxTxt = r.approx ? " ~" : "";
        const smartTxt = r.smartBonus ? ` · +${r.smartBonus} smartlink` : "";
        const title = `${r.weaponName} : ${r.pool} dés (${r.matchedSkill || r.skill}${approxTxt} ${r.skillVal} + ${r.attr} ${r.attrVal})${limTxt}${smartTxt} — cliquer pour lancer`;
        return `<span class="tag weapon-rollable rollable" data-roll-weapon="${this._esc(i)}" data-roll-pnj="${pnj.id}" data-roll-edition="${edition}" title="${this._esc(title)}">${this._esc(i)}<span class="weapon-pool">⚄${r.pool}${r.limit != null ? `<span class="weapon-lim">▸${r.limit}</span>` : ""}</span></span>`;
      })
      .join("");
    return `<div class="card-section">
      <div class="card-section-label">Équipement</div>
      <div class="card-section-content">${tags}</div>
    </div>`;
  },

  _esc(str) {
    return String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  },

  /* ---- Footer ---- */
  _footer(pnj, actions) {
    if (pnj.type === "vehicle") {
      return `<div class="pnj-card-footer" data-saved-actions='${JSON.stringify(actions)}'>
        <button class="card-action-btn ghost" onclick="EditModal.open('${pnj.id}')">Éditer</button>
        <button class="card-action-btn danger" onclick="UI.dismissVehicle('${pnj.id}')">Ranger</button>
      </div>`;
    }
    const btns = [];
    if (actions.includes("save")) {
      btns.push(
        `<button class="card-action-btn save" onclick="Shadows.savePNJ('${pnj.id}')">Sauvegarder</button>`,
      );
    }
    if (actions.includes("edit")) {
      btns.push(
        `<button class="card-action-btn ghost" onclick="EditModal.open('${pnj.id}')">Éditer</button>`,
      );
    }
    if (actions.includes("discard")) {
      btns.push(
        `<button class="card-action-btn danger" onclick="Gen.discard('${pnj.id}')">Virer</button>`,
      );
    }
    if (actions.includes("remove")) {
      btns.push(
        `<button class="card-action-btn danger" onclick="Shadows.removePNJ('${pnj.id}')">Supprimer</button>`,
      );
    }
    return `<div class="pnj-card-footer" data-saved-actions='${JSON.stringify(actions)}'>${btns.join("")}</div>`;
  },
};

/* ============================================================
   UI — interactions live (moniteurs, narcos, etc.)
   ============================================================ */
const UI = {
  /** Clic sur une case de moniteur */
  toggleMonitor(pnjId, type, idx) {
    const pnj = this._findPNJ(pnjId);
    if (!pnj) return;

    // Mapping type → champ du PNJ
    const fieldMap = {
      phys: "physFilled",
      stun: "stunFilled",
      mon: "monFilled",
      ment: "mentFilled",
      mat: "matFilled",
      // Anarchy 2.0 : moniteur d'état unique à cases fixes (léger/grave/incap)
      leger: "legerFilled",
      grave: "graveFilled",
      incap: "incapFilled",
    };
    const field = fieldMap[type] || "monFilled";
    if (pnj[field] === undefined) pnj[field] = 0;

    pnj[field] = idx < pnj[field] ? idx : idx + 1;

    Shadows.save();
    CardRenderer.refresh(pnj);
  },

  /** Clic sur un point de narco (Anarchy) */
  toggleNarco(pnjId, idx) {
    const pnj = this._findPNJ(pnjId);
    if (!pnj) return;
    if (idx < (pnj.narcoUsed || 0)) {
      pnj.narcoUsed = idx;
    } else {
      pnj.narcoUsed = idx + 1;
    }
    Shadows.save();
    CardRenderer.refresh(pnj);
  },

  /** Clic sur le tag d'une drogue : fait avancer le cycle idle → effet →
      contrecoup → idle (cf. js/drugs.js). */
  cycleDrug(pnjId, edition, drugId) {
    const pnj = this._findPNJ(pnjId);
    if (!pnj) return;
    Drugs.advance(pnj, edition, drugId);
    Shadows.save();
    CardRenderer.refresh(pnj);
  },

  /** Cherche dans les sauvegardés ET le pool du générateur, pour que
      les interactions (moniteurs, drogues, déploiements) fonctionnent
      aussi sur les cartes pas encore sauvegardées. */
  _findPNJ(id) {
    const saved = Shadows.data.all.find((p) => p.id === id);
    if (saved) return saved;
    if (typeof Gen !== "undefined" && Gen.findInPool) return Gen.findInPool(id);
    return null;
  },

  /* ========================================================
     VÉHICULES & DRONES LIÉS (js/vehicles.js)
     ======================================================== */

  /** Clic sur une chip de la zone Combat : déploie la fiche liée,
      ou recentre la vue dessus si elle existe déjà. */
  deployVehicle(ownerId, srcIdx) {
    const owner = this._findPNJ(ownerId);
    if (!owner) return;
    const srcItem = (this._vehicleItems(owner) || [])[srcIdx];
    if (!srcItem) return;

    const existing = Vehicles.linkedTo(ownerId, srcItem);
    if (existing.length) {
      this._flashCard(existing[0].id);
      return;
    }

    const spawned = Vehicles.spawn(owner, srcItem, owner.edition);
    if (!spawned.length) return;

    const inShadows = Shadows.data.all.some((p) => p.id === ownerId);
    const ownerCard = document.querySelector(`.pnj-card[data-id="${ownerId}"]`);
    let anchor = ownerCard;
    for (const v of spawned) {
      if (inShadows) Shadows.data.all.push(v);
      else Gen.pool.push(v);
      if (anchor) {
        const card = CardRenderer.render(v, inShadows ? ["remove"] : ["discard"]);
        card.classList.add("vehicle-card", "vehicle-deploying");
        anchor.insertAdjacentElement("afterend", card);
        setTimeout(() => card.classList.remove("vehicle-deploying"), 700);
        anchor = card;
      }
    }
    if (inShadows) Shadows.save();
    CardRenderer.refresh(owner); // met à jour l'état des chips
  },

  /** Bouton « Ranger » d'une fiche liée : retire la ou les fiches
      issues du même item source. */
  dismissVehicle(vehicleId) {
    const v = this._findPNJ(vehicleId);
    if (!v || v.type !== "vehicle") return;
    const siblings = Vehicles.linkedTo(v.ownerId, v.srcItem);
    for (const s of siblings) {
      Shadows.data.all = Shadows.data.all.filter((p) => p.id !== s.id);
      if (typeof Gen !== "undefined" && Gen.pool)
        Gen.pool = Gen.pool.filter((p) => p.id !== s.id);
      const card = document.querySelector(`.pnj-card[data-id="${s.id}"]`);
      if (card) card.remove();
    }
    Shadows.save();
    const owner = this._findPNJ(v.ownerId);
    if (owner) CardRenderer.refresh(owner);
  },

  /** Badge « lié à » : scroll + flash de la carte du propriétaire. */
  focusOwner(ownerId) {
    this._flashCard(ownerId);
  },

  _flashCard(id) {
    const card = document.querySelector(`.pnj-card[data-id="${id}"]`);
    if (!card) return;
    card.scrollIntoView({ behavior: "smooth", block: "center" });
    card.classList.add("card-flash");
    setTimeout(() => card.classList.remove("card-flash"), 1200);
  },

  /** Items déployables d'un PNJ (équipement + atouts Anarchy),
      dans un ordre stable — l'index sert de référence aux chips. */
  _vehicleItems(pnj) {
    if (typeof Vehicles === "undefined" || !pnj || pnj.type === "vehicle")
      return [];
    const src = [...(pnj.equip || []), ...(pnj.edition === "anarchy" ? pnj.edges || [] : [])];
    return src.filter((i) => Vehicles.matchItem(i, pnj.edition));
  },
};

/* ============================================================
   CONTACT RENDERER
   ============================================================ */
const ContactRenderer = {
  render(c) {
    return c.edition === "anarchy" ? this._renderAnarchy(c) : this._renderSR(c);
  },

  /* ---- Card persistante (ContactsBook) avec édition inline ---- */
  renderPersistent(c, allGroups, currentGroups) {
    const el = document.createElement("div");
    el.className = "contact-card contact-card-saved";
    el.dataset.id = c.id;

    const isAnarchy = c.edition === "anarchy";
    const stats = isAnarchy ? this._statsAnarchy(c) : this._statsSR(c);

    const gCount = currentGroups.length;
    const gLabel =
      gCount === 0
        ? "Groupes"
        : gCount === 1
          ? currentGroups[0]
          : `${gCount} groupes`;
    const groupTrigger = `<button class="group-picker-trigger${gCount ? " has-groups" : ""}"
      title="Gérer les groupes de ce contact" type="button"
      onclick="GroupPicker.open('${c.id}', this)">
      <span class="group-picker-trigger-icon">🏷</span><span class="group-picker-trigger-label">${CardRenderer._esc(gLabel)}</span>
    </button>`;

    el.innerHTML = `
      <div class="contact-card-body">
        <div class="contact-header-row">
          <div>
            <div class="contact-name" contenteditable="true" spellcheck="false"
              onblur="ContactsBook.editField('${c.id}', 'name', this.textContent.trim())"
              >${CardRenderer._esc(c.name)}</div>
            <div class="contact-role" contenteditable="true" spellcheck="false"
              onblur="ContactsBook.editField('${c.id}', 'role', this.textContent.trim())"
              >${CardRenderer._esc(c.role)}</div>
            ${c.metatype ? `<div class="contact-meta">${CardRenderer._esc(c.metatype)}</div>` : ""}
          </div>
          <div class="contact-header-actions">
            ${groupTrigger}
          </div>
        </div>

        <div class="contact-desc">${CardRenderer._esc(c.desc)}</div>

        ${stats}

        <div class="contact-trait">⚠ <span contenteditable="true" spellcheck="false"
          onblur="ContactsBook.editField('${c.id}', 'trait', this.textContent.trim())"
          >${CardRenderer._esc(c.trait)}</span></div>

        ${this._portrait(c)}

        <div class="contact-notes-row">
          <textarea class="contact-notes" placeholder="Notes…" rows="2"
            onchange="ContactsBook.editNote('${c.id}', this.value)"
            >${CardRenderer._esc(c.notes || "")}</textarea>
        </div>
      </div>
      <div class="pnj-card-footer">
        <button class="card-action-btn danger" onclick="ContactsBook.remove('${c.id}')">Supprimer</button>
      </div>`;
    return el;
  },

  /* ---- Portrait éditable (flavor) pour un contact ---- */
  _portrait(c) {
    const f = c.flavor;
    if (!f) return "";
    const row = (key, field, val) =>
      `<div class="flavor-row">
        <span class="flavor-key">${key}</span>
        <span class="flavor-val" contenteditable="true" spellcheck="false"
          onblur="ContactsBook.editFlavor('${c.id}', '${field}', this.textContent.trim())"
          >${CardRenderer._esc(String(val))}</span>
      </div>`;
    const rows = [
      f.age != null ? row("Âge", "age", f.age) : "",
      f.signe ? row("Signe", "signe", f.signe) : "",
      f.style ? row("Style", "style", f.style) : "",
      f.attitude ? row("Attitude", "attitude", f.attitude) : "",
      f.manie ? row("Manie", "manie", f.manie) : "",
      f.motivation ? row("Motivation", "motivation", f.motivation) : "",
    ].join("");
    return `<div class="card-section flavor-section contact-portrait">
      <div class="card-section-label">Portrait
        <button class="btn-icon-tiny" title="Relancer le portrait"
          onclick="ContactsBook.rerollFlavor('${c.id}')">⟳</button>
      </div>
      ${rows}
    </div>`;
  },

  _statsAnarchy(c) {
    const dots = Array.from(
      { length: 6 },
      (_, i) =>
        `<span class="niveau-dot ${i < c.level ? "filled" : ""}"
        onclick="ContactsBook.editField('${c.id}', 'niveau', ${i + 1}); ContactsBook.render()"></span>`,
    ).join("");
    const bonus = c.bonus
      ? `<div class="contact-bonus">+ ${CardRenderer._esc(c.bonus)}</div>`
      : "";
    return `<div class="contact-anarchy-stats">
      <div class="contact-stat-row">
        <span class="contact-stat-label">Niveau</span>
        <div class="niveau-dots">${dots}</div>
        <span class="contact-stat-val">${c.level} (${(c.level * 5000).toLocaleString("fr-FR")}¥)</span>
      </div>
      <div class="contact-stat-row">
        <span class="contact-stat-label">Effet</span>
        <span class="contact-rr">RR ${c.rr} — ${CardRenderer._esc(c.domaine)}</span>
      </div>
      ${c.atoutCost != null ? `<div class="contact-stat-row"><span class="contact-stat-label">Atout</span><span class="contact-stat-val">${c.atoutCost} pts</span></div>` : ""}
      ${bonus}
    </div>`;
  },

  _statsSR(c) {
    return `<div class="stats-row" style="margin-top:6px;flex-wrap:wrap;gap:6px;">
      <span class="stat-pill accent">Influence
        <strong contenteditable="true" spellcheck="false" class="editable-num"
          onblur="ContactsBook.editField('${c.id}', 'influence', this.textContent.trim())"
          >${c.influence}</strong>
      </span>
      <span class="stat-pill">Loyauté
        <strong contenteditable="true" spellcheck="false" class="editable-num"
          onblur="ContactsBook.editField('${c.id}', 'loyaute', this.textContent.trim())"
          >${c.loyaute}</strong>
      </span>
      ${c.lieu ? `<span style="font-size:0.68rem;color:var(--text-dim);align-self:center;">📍 ${CardRenderer._esc(c.lieu)}</span>` : ""}
    </div>`;
  },

  _renderAnarchy(c) {
    const el = document.createElement("div");
    el.className = "contact-card";

    // Pastilles de niveau : cercles pleins / vides
    const levelDots = Array.from(
      { length: 6 },
      (_, i) =>
        `<span class="niveau-dot ${i < c.level ? "filled" : ""}"></span>`,
    ).join("");

    const bonusHtml = c.bonus
      ? `<div class="contact-bonus">+ ${CardRenderer._esc(c.bonus)}</div>`
      : "";

    el.innerHTML = `
      <div class="contact-card-body">
        <div class="contact-name">${CardRenderer._esc(c.name)}</div>
        <div class="contact-role">${CardRenderer._esc(c.role)}</div>
        <div class="contact-desc">${CardRenderer._esc(c.desc)}</div>

        <div class="contact-anarchy-stats">
          <div class="contact-stat-row">
            <span class="contact-stat-label">Niveau</span>
            <div class="niveau-dots">${levelDots}</div>
            <span class="contact-stat-val">${c.level} (${c.cout.toLocaleString("fr-FR")}¥)</span>
          </div>
          <div class="contact-stat-row">
            <span class="contact-stat-label">Effet</span>
            <span class="contact-rr">RR ${c.rr} — ${CardRenderer._esc(c.domaine)}</span>
          </div>
          ${bonusHtml}
        </div>

        <div class="contact-trait">⚠ ${CardRenderer._esc(c.trait)}</div>
      </div>
      <div class="pnj-card-footer">
        <button class="card-action-btn danger" onclick="this.closest('.contact-card').remove()">Virer</button>
      </div>`;
    return el;
  },

  _renderSR(c) {
    const el = document.createElement("div");
    el.className = "contact-card";
    el.innerHTML = `
      <div class="contact-card-body">
        <div class="contact-name">${CardRenderer._esc(c.name)}</div>
        <div class="contact-role">${CardRenderer._esc(c.role)}</div>
        <div class="contact-desc">${CardRenderer._esc(c.desc)}</div>
        <div class="stats-row" style="margin-top:6px;">
          <span class="stat-pill accent">Influence <strong>${c.influence}</strong></span>
          <span class="stat-pill">Loyauté <strong>${c.loyaute}</strong></span>
        </div>
        <div style="margin-top:5px;font-size:0.68rem;color:var(--text-dim);">
          📍 ${CardRenderer._esc(c.lieu)}
        </div>
        <div class="contact-trait">⚠ ${CardRenderer._esc(c.trait)}</div>
      </div>
      <div class="pnj-card-footer">
        <button class="card-action-btn danger" onclick="this.closest('.contact-card').remove()">Virer</button>
      </div>`;
    return el;
  },
};

/* ============================================================
   RUN RENDERER
   ============================================================ */
const RunRenderer = {
  render(r) {
    const el = document.createElement("div");
    el.className = "run-card";
    const obj2 = r.objectif2
      ? `<div class="run-field">
           <span class="run-field-label">Objectif secondaire</span>
           <span class="run-field-val" style="color:var(--accent2);font-size:0.75rem;">${CardRenderer._esc(r.objectif2)}</span>
         </div>`
      : "";
    el.innerHTML = `
      <div class="run-card-header">
        <div class="run-type">${CardRenderer._esc(r.type)}</div>
        <span class="pnj-rank-badge">${r.difficulte}</span>
      </div>
      <div class="run-card-body">
        <div class="run-field">
          <span class="run-field-label">Client</span>
          <span class="run-field-val">${CardRenderer._esc(r.client)}</span>
        </div>
        <div class="run-field">
          <span class="run-field-label">Lieu</span>
          <span class="run-field-val">${CardRenderer._esc(r.lieu)}</span>
        </div>
        <div class="run-field">
          <span class="run-field-label">Complication</span>
          <span class="run-field-val run-complication">${CardRenderer._esc(r.complication)}</span>
        </div>
        ${obj2}
        <div class="stats-row" style="margin-top:0.5rem;">
          <span class="stat-pill accent">Paiement <strong>${r.payment}</strong></span>
        </div>
      </div>
      <div class="pnj-card-footer">
        <button class="card-action-btn danger" onclick="this.closest('.run-card').remove()">Virer</button>
      </div>`;
    return el;
  },
};

/* ============================================================
   CONTENT MODAL — affiche la description d'un contenu en un clic
   (arme, sort, pouvoir, trait). Modale légère, fermeture au clic
   en dehors, sur la croix, ou avec Échap.
   ============================================================ */
const ContentModal = {
  _el: null,
  _delegated: false,

  /* Délégation globale : tout clic / touche Enter|Espace sur un
     [data-content-name] ouvre la modale. dataset décode automatiquement
     les entités HTML (&#39;, &quot;…), donc le texte affiché est correct. */
  bindDelegation() {
    if (this._delegated) return;
    this._delegated = true;
    const open = (target) => {
      const tag = target.closest("[data-content-name]");
      if (!tag) return false;
      this.show(tag.dataset.contentName, tag.dataset.contentDesc || "");
      return true;
    };
    document.addEventListener("click", (e) => open(e.target));
    document.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      const tag = e.target.closest && e.target.closest("[data-content-name]");
      if (tag) {
        e.preventDefault();
        this.show(tag.dataset.contentName, tag.dataset.contentDesc || "");
      }
    });
  },

  _ensure() {
    if (this._el) return this._el;
    const overlay = document.createElement("div");
    overlay.className = "content-modal-overlay";
    overlay.id = "content-modal-overlay";
    overlay.innerHTML = `
      <div class="content-modal" role="dialog" aria-modal="true">
        <button class="content-modal-close" aria-label="Fermer">&times;</button>
        <h3 class="content-modal-title"></h3>
        <p class="content-modal-desc"></p>
      </div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) this.hide();
    });
    overlay
      .querySelector(".content-modal-close")
      .addEventListener("click", () => this.hide());
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") this.hide();
    });
    this._el = overlay;
    return overlay;
  },

  show(nom, desc) {
    const el = this._ensure();
    el.querySelector(".content-modal-title").textContent = nom;
    el.querySelector(".content-modal-desc").textContent = desc;
    el.classList.add("visible");
  },

  hide() {
    if (this._el) this._el.classList.remove("visible");
  },
};
