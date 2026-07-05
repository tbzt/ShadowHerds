"use strict";

/* ============================================================
   CARD RENDERER — entités liées : véhicules/drones et esprits.
   ============================================================ */
Object.assign(CardRenderer, {
  /* ---- Header véhicule/drone lié ---- */
  _headerVehicle(v) {
    const icon = v.kind === "drone" ? "◇" : "▣";
    const kindLabel = v.kind === "drone" ? "Drone" : "Véhicule";
    const destroyed = App.getEditionModule(v.edition).conditionMonitor.isDestroyed(v);
    return `<div class="pnj-card-header vehicle-header${destroyed ? " destroyed" : ""}">
      <div class="pnj-header-left">
        <div class="pnj-name">${icon} ${this._esc(v.name)}</div>
        <div class="pnj-meta">
          <span class="vehicle-owner-link" role="button" tabindex="0"
            data-action="focus-owner" data-id="${v.ownerId}"
            title="Retrouver ${this._esc(v.ownerName)}">↳ lié à ${this._esc(v.ownerName)}</span>
        </div>
      </div>
      ${destroyed
        ? '<span class="pnj-rank-badge vehicle-badge destroyed">☠ Détruit</span>'
        : `<span class="pnj-rank-badge vehicle-badge">${kindLabel}</span>`}
    </div>`;
  },

  /* ---- Header esprit (invoqué ou libre) ---- */
  _headerSpirit(sp) {
    const Mod = App.getEditionModule(sp.edition);
    const spSummonPower = Mod.summonPower;
    const destroyed = Mod.conditionMonitor.isDestroyed(sp);
    const badge = destroyed
      ? '<span class="pnj-rank-badge vehicle-badge destroyed">☠ Détruit</span>'
      : spSummonPower.field === "tier"
        ? `<span class="pnj-rank-badge vehicle-badge">${this._esc(sp[spSummonPower.field] || "Esprit")}</span>`
        : `<span class="pnj-rank-badge vehicle-badge">P ${sp[spSummonPower.field]}</span>`;
    const metaLine = sp.ownerId
      ? `<span class="vehicle-owner-link" role="button" tabindex="0"
          data-action="focus-owner" data-id="${sp.ownerId}"
          title="Retrouver ${this._esc(sp.ownerName)}">↳ invoqué par ${this._esc(sp.ownerName)}</span>`
      : `<span>Esprit libre — indépendant</span>`;
    return `<div class="pnj-card-header vehicle-header spirit-header${destroyed ? " destroyed" : ""}">
      <div class="pnj-header-left">
        <div class="pnj-name">✦ ${this._esc(sp.name)}</div>
        <div class="pnj-meta">${metaLine}</div>
      </div>
      ${badge}
    </div>`;
  },

  /* ---- Body d'une fiche véhicule/drone liée ---- */
  _bodyVehicle(v, deps) {
    const s = v.stats || {};
    const Mod = App.getEditionModule(v.edition);
    let html = '<div class="pnj-card-body vehicle-body">';
    html += '<div class="combat-zone">';
    html += this._zoneEyebrow(v.kind === "drone" ? "Drone" : "Véhicule");

    // Pills de stats brutes
    const statDefs = Mod.vehicleModel.statFields.map(([key, label]) => [label, s[key]]);
    html += '<div class="combat-row vehicle-stats">';
    for (const [label, val] of statDefs) {
      if (val == null) continue;
      html += `<span class="stat-pill" title="${label}">${label.slice(0, 5)} <strong>${val}</strong></span>`;
    }
    html += "</div>";

    // Réserves de dés (jets cliquables) + initiative SR5/SR6
    const edAttr = v.edition === "anarchy" ? ' data-roll-edition="anarchy"' : "";
    html += '<div class="combat-row">';
    const init = deps.Vehicles.initiative(v);
    if (init) html += this._initPill(init.base, init.dice, v);
    for (const p of deps.Vehicles.pools(v)) {
      if (p.weaponOnly && !(v.weapons || []).length) continue;
      const roll =
        p.pool >= 1
          ? ` data-roll="${p.pool}" data-roll-label="${this._esc(v.name)} — ${this._esc(p.label)}"${edAttr} data-roll-rr="0" data-roll-pnj="${v.id}"`
          : "";
      html += `<span class="stat-pill combat-pill${p.pool >= 1 ? " rollable" : ""}"${roll} title="${this._esc(p.title)}">${this._esc(p.label)} <strong>${p.pool}</strong></span>`;
    }
    html += "</div>";

    // Moniteur d'état — dispatch structurel accepté (issue #14) : deux
    // blocs de rendu complets (seuils vs total cumulatif), pas une
    // valeur scalaire ; cf. conditionMonitor.vehicleFields.
    if (Mod.conditionMonitor.vehicleFields === "thresholds") {
      const [l, g, i] = deps.Vehicles.anarchyThresholds(v);
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
      const atk = deps.Vehicles.pools(v).find((p) => p.weaponOnly || p.label === "Autonome");
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
  _vehicleChipRow(pnj, deps) {
    if (!deps.Vehicles || !deps.UI) return "";
    const items = deps.UI._vehicleItems(pnj);
    if (!items.length) return "";
    const chips = items
      .map((item, idx) => {
        const parsed = deps.Vehicles.matchItem(item, pnj.edition);
        const linked = deps.Vehicles.linkedTo(pnj.id, item);
        const deployed = linked.some((v) => v.deployed);
        const destroyed = linked.some((v) =>
          App.getEditionModule(v.edition).conditionMonitor.isDestroyed(v),
        );
        const icon = parsed.kind === "drone" ? "◇" : "▣";
        const label = parsed.count > 1 ? `${parsed.count}× ${parsed.name}` : parsed.name;
        const state = destroyed
          ? '<span class="vehicle-chip-state destroyed">☠ détruit</span>'
          : deployed
            ? '<span class="vehicle-chip-state on">● fiche</span>'
            : '<span class="vehicle-chip-state">▸ déployer</span>';
        return `<span class="tag vehicle-chip${deployed ? " deployed" : ""}${destroyed ? " destroyed" : ""}" role="button" tabindex="0"
          data-action="deploy-vehicle" data-id="${pnj.id}" data-idx="${idx}"
          title="${this._esc(item)}">${icon} ${this._esc(label)}${state}</span>`;
      })
      .join("");
    return `<div class="combat-drugs vehicle-chips">${chips}</div>`;
  },

  /** Barre de services d'un esprit : pips cliquables (services rendus).
      Les esprits libres ne doivent aucun service — pas de barre. */
  _spiritServicesBar(sp) {
    if (!sp.ownerId) return "";
    const total = sp.services || 0;
    const used = sp.servicesUsed || 0;
    const pips = Array.from({ length: total }, (_, i) => {
      const cls = i < used ? "service-pip used" : "service-pip";
      return `<span class="${cls}" data-action="toggle-service" data-id="${sp.id}" data-idx="${i}" title="Service ${i + 1}${i < used ? " (rendu)" : ""}"></span>`;
    }).join("");
    return `<div class="spirit-services" title="Services dus par l'esprit — cliquer pour marquer un service rendu">
      <span class="spirit-services-label">Services</span>
      <span class="spirit-services-pips">${pips}</span>
      <span class="spirit-services-count">${total - used}/${total}</span>
    </div>`;
  },

  /** Chip « Invoquer » dans la zone Combat des conjurateurs. */
  _spiritChipRow(pnj, deps) {
    if (!deps.Spirits || !deps.Spirits.canSummon(pnj)) return "";
    const linked = deps.Spirits.linkedTo(pnj.id).filter((sp) => sp.deployed);
    const active = linked.length;
    const destroyed = linked.some((sp) =>
      App.getEditionModule(sp.edition).conditionMonitor.isDestroyed(sp),
    );
    const state = destroyed
      ? '<span class="vehicle-chip-state destroyed">☠ détruit</span>'
      : active
        ? `<span class="vehicle-chip-state on">● ${active}</span>`
        : '<span class="vehicle-chip-state">▸ invoquer</span>';
    return `<div class="combat-drugs spirit-chips">
      <span class="tag vehicle-chip spirit-chip${active ? " deployed" : ""}${destroyed ? " destroyed" : ""}" role="button" tabindex="0"
        data-action="open-summon" data-id="${pnj.id}"
        title="Invoquer un esprit lié à ce PNJ">✦ Esprit${state}</span>
    </div>`;
  },
});
