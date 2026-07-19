"use strict";

/* ============================================================
   CARD RENDERER — entités liées : véhicules/drones et esprits.
   ============================================================ */
import { Resonance } from "../../rules/resonance.js";
import { Spirits } from "../../catalogs/spirits.js";
import { UI } from "../kit/ui.js";
import { Vehicles } from "../../catalogs/vehicles.js";

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
    // Bascule repli/dépli : masque le corps de la fiche sans congédier
    // l'esprit (il reste dans le pool avec tout son état). Purement visuel.
    const foldBtn = `<button class="spirit-fold-btn" data-action="toggle-spirit-fold" data-id="${sp.id}"
        title="${sp.collapsed ? "Déplier la fiche" : "Replier la fiche"}"
        aria-label="${sp.collapsed ? "Déplier la fiche" : "Replier la fiche"}"
        aria-expanded="${sp.collapsed ? "false" : "true"}"><svg class="icon${sp.collapsed ? "" : " is-open"}" aria-hidden="true"><use href="#ic-chevron"></use></svg></button>`;
    return `<div class="pnj-card-header vehicle-header spirit-header${destroyed ? " destroyed" : ""}">
      ${this._portraitThumb(sp)}
      <div class="pnj-header-left">
        <div class="pnj-name">✦ ${this._esc(sp.name)}</div>
        <div class="pnj-meta">${metaLine}</div>
      </div>
      ${foldBtn}
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

    // Attributs du véhicule (Autopilote/Structure/Maniabilité…) — même
    // présentation que les attributs d'un PNJ (grille `_attrCell`), pas des
    // chips de compétence : ce sont les attributs propres de l'engin, le
    // libellé entier reste lisible et la valeur est mise en avant. Les vraies
    // réserves de jet (`Vehicles.pools`) restent en pills cliquables dessous.
    const cells = Mod.vehicleModel.statFields
      .filter(([key]) => s[key] != null)
      .map(([key, label]) => this._attrCell(label, s[key]))
      .join("");
    if (cells) html += `<div class="attr-grid vehicle-stats">${cells}</div>`;

    // Réserves de dés (jets cliquables) + initiative SR5/SR6
    const edAttr = App.getEditionModule(v.edition)?.usesRiskPanel ? ` data-roll-edition="${v.edition}"` : "";
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

    // Moniteur d'état — dispatch structurel accepté : deux
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
            : '<span class="vehicle-chip-state"><svg class="icon icon-sm" aria-hidden="true"><use href="#ic-chevron"></use></svg> déployer</span>';
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

  /** Chips « Invoquer » (produire) et « Bannir » (renvoi hostile) dans la zone
      Combat des conjurateurs. Le glyphe ✦ (domaine esprit) est réutilisé pour
      les deux verbes ; « Agir produit » — les deux affordances vivent sur la
      carte du lanceur, donc aussi dans l'Agir du tracker (même renderer). */
  _spiritChipRow(pnj, deps) {
    const ed = App.getEditionModule(pnj.edition);
    const canSummon = !!(deps.Spirits && deps.Spirits.canSummon(pnj));
    const canBanish = !!(ed && ed.banishSkill) && ed.arcaneLock(pnj, "magic") === null;
    if (!canSummon && !canBanish) return "";
    let chips = "";
    if (canSummon) {
      const linked = deps.Spirits.linkedTo(pnj.id).filter((sp) => sp.deployed);
      const active = linked.length;
      const destroyed = linked.some((sp) =>
        App.getEditionModule(sp.edition).conditionMonitor.isDestroyed(sp),
      );
      const state = destroyed
        ? '<span class="vehicle-chip-state destroyed">☠ détruit</span>'
        : active
          ? `<span class="vehicle-chip-state on">● ${active}</span>`
          : '<span class="vehicle-chip-state"><svg class="icon icon-sm" aria-hidden="true"><use href="#ic-chevron"></use></svg> invoquer</span>';
      chips += `<span class="tag vehicle-chip spirit-chip${active ? " deployed" : ""}${destroyed ? " destroyed" : ""}" role="button" tabindex="0"
        data-action="open-summon" data-id="${pnj.id}"
        title="Invoquer un esprit lié à ce PNJ">✦ Esprit${state}</span>`;
    }
    if (canBanish) {
      chips += `<span class="tag vehicle-chip spirit-chip" role="button" tabindex="0"
        data-action="open-dismiss" data-kind="spirit" data-id="${pnj.id}"
        title="Bannir un esprit adverse (test opposé de Bannissement)">✦ Bannir</span>`;
    }
    return `<div class="combat-drugs spirit-chips">${chips}</div>`;
  },

  /* ============================================================
     SPRITES COMPILÉS (T3b) — entité MATRICIELLE liée à un
     technomancien. ⚠️ À ne pas confondre avec les méthodes
     `_*Spirit`/`_spirit*` ci-dessus (ESPRIT du mage) : ici c'est
     le SPRITE du technomancien, vocabulaire distinct (Compiler /
     Niveau / tâches / Renvoyer). Glyphe ◈ (esprit = ✦).
     ============================================================ */

  /** En-tête d'un sprite compilé (miroir de `_headerSpirit`). */
  _headerSprite(sp) {
    const destroyed = App.getEditionModule(sp.edition).conditionMonitor?.isDestroyed?.(sp);
    const lvl = sp.regime === "anarchy1" ? this._esc(sp.tier || "Sprite") : `Niv ${sp.level}`;
    const badgeTxt = sp.registered ? `${lvl} · inscrit` : lvl;
    const badge = destroyed
      ? '<span class="pnj-rank-badge vehicle-badge destroyed">☠ Détruit</span>'
      : `<span class="pnj-rank-badge vehicle-badge">${badgeTxt}</span>`;
    const metaLine = sp.ownerId
      ? `<span class="vehicle-owner-link" role="button" tabindex="0"
          data-action="focus-owner" data-id="${sp.ownerId}"
          title="Retrouver ${this._esc(sp.ownerName)}">↳ compilé par ${this._esc(sp.ownerName)}</span>`
      : `<span>Sprite libre — non compilé</span>`;
    const foldBtn = `<button class="spirit-fold-btn" data-action="toggle-spirit-fold" data-id="${sp.id}"
        title="${sp.collapsed ? "Déplier la fiche" : "Replier la fiche"}"
        aria-label="${sp.collapsed ? "Déplier la fiche" : "Replier la fiche"}"
        aria-expanded="${sp.collapsed ? "false" : "true"}"><svg class="icon${sp.collapsed ? "" : " is-open"}" aria-hidden="true"><use href="#ic-chevron"></use></svg></button>`;
    return `<div class="pnj-card-header vehicle-header spirit-header sprite-header${destroyed ? " destroyed" : ""}">
      <div class="pnj-header-left">
        <div class="pnj-name">◈ ${this._esc(sp.name)}</div>
        <div class="pnj-meta">${metaLine}</div>
      </div>
      ${foldBtn}
      ${badge}
    </div>`;
  },

  /** Barre de tâches d'un sprite (miroir de `_spiritServicesBar`, lexique
      « tâches » côté technomancien). Sprite libre → aucune tâche due. */
  _spriteTasksBar(sp) {
    if (!sp.ownerId) return "";
    const total = sp.tasks || 0;
    const used = sp.tasksUsed || 0;
    const pips = Array.from({ length: total }, (_, i) => {
      const cls = i < used ? "service-pip used" : "service-pip";
      return `<span class="${cls}" data-action="toggle-sprite-task" data-id="${sp.id}" data-idx="${i}" title="Tâche ${i + 1}${i < used ? " (rendue)" : ""}"></span>`;
    }).join("");
    return `<div class="spirit-services" title="Tâches dues par le sprite — cliquer pour en marquer une rendue">
      <span class="spirit-services-label">Tâches</span>
      <span class="spirit-services-pips">${pips}</span>
      <span class="spirit-services-count">${total - used}/${total}</span>
    </div>`;
  },

  /** Corps de carte d'un sprite : entité matricielle, PAS le corps physique
      d'édition (veto Kernel). SR5/SR6 : 4 attributs matriciels (clés persona
      A/C/T/F, cf. Resonance.ATTR_KEYS) ; Anarchy 1 : LOG-centré, Firewall =
      Logique. Moniteur matriciel commun (type "mat", réserve la mécanique
      toggle-monitor existante). */
  _bodySprite(sp, deps) {
    const esc = this._esc;
    let html = '<div class="pnj-card-body vehicle-body sprite-body">';
    html += this._spriteTasksBar(sp);
    html += '<div class="combat-zone">';
    html += this._zoneEyebrow("Sprite — matrice");

    if (sp.regime === "anarchy1") {
      html += `<div class="attr-grid">
        ${this._attrCell("LOG", sp.attrs.LOG)}
        ${this._attrCell("Déf", sp.defense)}
        ${this._attrCell("FW", sp.firewall)}
      </div>`;
    } else {
      const cells = Resonance.ATTR_KEYS.map((k) =>
        this._attrCell(k.badge, (sp.matrix || {})[k.key], "", { roll: false }),
      ).join("");
      html += `<div class="attr-grid" title="Attaque · Corruption · Traitement de données · Firewall">${cells}</div>`;
      if (sp.initBase != null) {
        html += '<div class="combat-row">' + this._initPill(sp.initBase, sp.initDice || 4, sp) + "</div>";
      }
    }

    // Compétences (rang) — tags simples, non rollables en T3b (le duel
    // matriciel motorisé viendra en T6).
    const skills = (sp.skills || [])
      .map((s) => `<span class="tag">${esc(s.name)} ${s.val}</span>`)
      .join("");
    if (skills) html += `<div class="tag-row sprite-skills">${skills}</div>`;

    // Arme de cybercombat (Anarchy 1) / pouvoirs (SR).
    const notes = [];
    for (const w of sp.weapons || []) notes.push(`${esc(w.name)} — VD ${w.vd}${w.dmgType || ""}`);
    for (const p of sp.powers || []) notes.push(esc(p.name));
    for (const e of sp.edges || []) notes.push(esc(e));
    if (sp.special) notes.push(esc(sp.special));
    if (notes.length)
      html += `<div class="sprite-notes">${notes.map((n) => `<div class="sprite-note">${n}</div>`).join("")}</div>`;

    // Moniteur matriciel (case unique, mécanique toggle-monitor type "mat").
    html += `<div class="monitor-block sprite-monitor">
      <div class="monitor-label">Moniteur matriciel</div>
      <div class="monitor-boxes">${this._monitorBoxes(sp.id, "mat", sp.matrixMonitor || 8, sp.matFilled || 0)}</div>
    </div>`;

    html += "</div></div>";
    return html;
  },

  /** Chip « Compiler » dans la zone Combat du technomancien (miroir de
      `_spiritChipRow`, kind:"sprite"). Réutilise le rail via open-summon +
      data-kind. Seuls les Émergés (Sprites.canCompile) le voient. */
  _spriteCompileRow(pnj, deps) {
    const ed = App.getEditionModule(pnj.edition);
    const canCompile = !!(deps.Sprites && deps.Sprites.canCompile(pnj));
    const canDecompile =
      !!(ed && ed.spriteModel && ed.spriteModel.decompileSkill) &&
      ed.arcaneLock(pnj, "resonance") === null;
    if (!canCompile && !canDecompile) return "";
    let chips = "";
    if (canCompile) {
      const linked = deps.Sprites.linkedTo(pnj.id).filter((sp) => sp.deployed);
      const active = linked.length;
      const state = active
        ? `<span class="vehicle-chip-state on">● ${active}</span>`
        : '<span class="vehicle-chip-state"><svg class="icon icon-sm" aria-hidden="true"><use href="#ic-chevron"></use></svg> compiler</span>';
      chips += `<span class="tag vehicle-chip spirit-chip sprite-chip${active ? " deployed" : ""}" role="button" tabindex="0"
        data-action="open-summon" data-kind="sprite" data-id="${pnj.id}"
        title="Compiler un sprite lié à ce technomancien">◈ Sprite${state}</span>`;
    }
    if (canDecompile) {
      chips += `<span class="tag vehicle-chip spirit-chip sprite-chip" role="button" tabindex="0"
        data-action="open-dismiss" data-kind="sprite" data-id="${pnj.id}"
        title="Décompiler un sprite adverse (test opposé)">◈ Décompiler</span>`;
    }
    return `<div class="combat-drugs sprite-chips">${chips}</div>`;
  },
});
