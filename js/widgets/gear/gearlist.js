"use strict";

/* ============================================================
   GEAR LIST — la liste d'équipement structuré, une rangée par objet

   UN composant pour deux écrans : l'étape Équipement de l'assistant de
   création (hôte = le brouillon) et la zone Équipement de la fiche d'un
   PJ à `gear` (hôte = l'entité). Le CONTRIBUTING l'exige : le même
   problème rencontré deux fois, et il l'était — la fiche s'éditait dans
   un textarea de quatre lignes qui ignorait tout ce que l'assistant
   savait (gamme, montures, capacité, réserves).

   Le widget ne connaît AUCUNE édition : il rend ce que le module de
   création décrit (`implantState`, `armorCapacityState`, `weaponModState`,
   `accessoryMounts`, `vehicleModState`, `gearFamily`, `accessoryCatalogFor`,
   `gearCatalog`, `gearFromCatalog`) et mute `host.gear` ; l'appelant est
   prévenu par `onChange` et fait le reste (budget et rail de l'assistant ;
   projection `applyGear` et Essence sur la fiche).

   Montage : `GearList.mount(key, cfg)` avec
     rows      — l'élément qui reçoit les rangées (obligatoire)
     catalog   — l'élément qui reçoit le catalogue (optionnel)
     creation  — le module de création (`App.editionModule.creation`)
     host()    — l'objet qui porte `gear`
     onChange()— après toute mutation
     onAdd(item)— après l'entrée d'un objet (achat en campagne)
     total()   — un total en ¥ pour l'en-tête (optionnel)
     limits()  — `{ allowed, nuyenLeft }` pour le catalogue (optionnel)
     isOpen(uid) / setOpen(uid, open) — l'état des plis (défaut : mémoire)
     freeAdd   — proposer « Équipement libre… » sous les rangées
   Les conteneurs reçoivent `data-gl-host="<key>"` ; la délégation, unique
   au document, retrouve la config par cet attribut. Rangées : `data-gl`
   (liaison d'un champ, chemin dans `host`) et `data-gl-action`. Pas de
   handler inline.
   ============================================================ */
import { CatalogPicker } from "../kit/catalogpicker.js";
import { ModRefs } from "../../rules/modrefs.js";
import { Utils } from "../../core/utils.js";

export const GearList = {
  _mounts: new Map(),
  _open: new Set(),
  _bound: false,

  mount(key, cfg) {
    this.init();
    CatalogPicker.init();
    this._mounts.set(key, cfg);
    if (cfg.rows) cfg.rows.setAttribute("data-gl-host", key);
    if (cfg.catalog) cfg.catalog.setAttribute("data-gl-host", key);
    this.render(key);
  },

  /** Rendu complet : rangées ET catalogue. */
  render(key) {
    const cfg = this._mounts.get(key);
    if (!cfg) return;
    if (cfg.rows) cfg.rows.innerHTML = this.rowsHtml(cfg);
    if (cfg.catalog) cfg.catalog.innerHTML = this.catalogHtml(cfg, key);
  },

  /** Repeint les rangées seules ; le catalogue n'est PAS reconstruit — sa
      recherche, son rayon et son défilement survivent à l'ajout. On y met
      seulement à jour « pris » et « au-delà du reste ». */
  refresh(key) {
    const cfg = this._mounts.get(key);
    if (!cfg) return;
    if (cfg.rows) cfg.rows.innerHTML = this.rowsHtml(cfg);
    if (cfg.catalog) {
      const host = cfg.host();
      CatalogPicker.markTaken(cfg.catalog, (host.gear || []).map((g) => g.name));
      const lim = cfg.limits ? cfg.limits() : null;
      CatalogPicker.markDear(cfg.catalog, lim ? lim.nuyenLeft : null);
    }
  },

  _cfgOf(el) {
    const hote = el && el.closest("[data-gl-host]");
    return hote ? this._mounts.get(hote.dataset.glHost) : null;
  },

  _isOpen(cfg, uid) {
    return cfg.isOpen ? cfg.isOpen(uid) : this._open.has(uid);
  },
  _setOpen(cfg, uid, open) {
    if (cfg.setOpen) cfg.setOpen(uid, open);
    else if (open) this._open.add(uid);
    else this._open.delete(uid);
  },

  /* ---- Rendu ---- */
  catalogHtml(cfg, key) {
    const c = cfg.creation;
    const host = cfg.host();
    return CatalogPicker.html({
      id: `gear-${key}`,
      groups: (c.gearCatalog && c.gearCatalog()) || [],
      actionAttr: "data-gl-action",
      action: "pick",
      selected: (host.gear || []).map((g) => g.name),
      limits: cfg.limits ? cfg.limits() : null,
    });
  },

  /** L'en-tête (compte, total) et une rangée par objet, puis la saisie libre. */
  rowsHtml(cfg) {
    const esc = CatalogPicker.esc;
    const c = cfg.creation;
    const host = cfg.host();
    const gear = host.gear || [];
    const x = (n) => Number(n).toLocaleString("fr-FR");
    const total = cfg.total ? cfg.total() : null;
    const tete = `<div class="cg-section-label">Équipement choisi <span class="cg-section-note">${gear.length} objet${gear.length > 1 ? "s" : ""}${total != null ? ` · ${x(total)} ¥` : ""}</span></div>`;
    const rows = gear.map((g, i) => this.rowHtml(cfg, g, i)).join("") || '<p class="cg-hint">Aucun équipement — choisis dans le catalogue.</p>';
    const libre = cfg.freeAdd
      ? `<div class="cluster cg-add-row">
          <input type="text" data-gl-free placeholder="Équipement libre…" aria-label="Équipement libre">
          <button type="button" class="btn-secondary btn-small" data-gl-action="add-free">＋ Ajouter</button>
        </div>`
      : "";
    return tete + rows + libre;
  },

  /** Une rangée d'objet : résumé sur une ligne, détail replié. */
  rowHtml(cfg, g, i) {
    const esc = CatalogPicker.esc;
    const c = cfg.creation;
    const host = cfg.host();
    const x = (n) => Number(n).toLocaleString("fr-FR");
    /* Un mod est `{ id, indice }` (js/rules/modrefs.js) ; les anciens (ids
       nus) sont mis à cette forme ici, une fois pour toutes. Un objet porte
       un `uid` (les hôtes d'implants s'y réfèrent). */
    g.mods = ModRefs.normalize(g.mods);
    if (!g.uid) g.uid = Utils.uid();
    const mods = g.mods;
    /* Le conflit de monture est dit à l'endroit où il se produit. */
    const conflits = c.accessoryConflicts ? c.accessoryConflicts(g) : [];
    const tags = mods
      .map((ref, k) => {
        const a = c.accessoryById(ModRefs.id(ref));
        if (!a) return "";
        /* Un objet à indice : son indice se choisit ICI, borné par la plage du
           livre ; c'est lui qui résout « 1 × Indice », « Indice × 250 ¥ ». */
        const plage = ModRefs.indiceRange(a);
        const indice = ModRefs.usesIndice(a)
          ? `<label class="cg-mod-indice" title="Indice de cet objet${plage ? ` (${plage.min}–${plage.max})` : ""}">i
              <input type="number" class="cg-in-indice" data-gl="gear.${i}.mods.${k}.indice" value="${ref.indice ?? ""}" min="${plage ? plage.min : 1}"${plage ? ` max="${plage.max}"` : ""}></label>`
          : "";
        return `<span class="cg-pick-tag cg-mod-tag">${esc(a.nom)}${a.monture && a.monture !== "—" ? ` (${esc(a.monture)})` : ""}${indice}<button type="button" class="btn-icon-tiny" data-gl-action="remove-mod" data-idx="${i}" data-k="${k}" title="Retirer">✕</button></span>`;
      })
      .join("");
    /* Les accessoires QUI CONVIENNENT à cet objet — ceux de sa famille,
       aucun sans famille. Sur une arme, une entrée dont toutes les montures
       sont prises se lit à l'ambre : on peut, mais on le sait avant. */
    const famille = c.gearFamily ? c.gearFamily(g) : null;
    const familleAuto = c.gearFamily ? c.gearFamily({ ...g, family: undefined }) : null;
    let groupesMods = (famille && c.accessoryCatalogFor ? c.accessoryCatalogFor(g) : []).filter((grp) => grp.items.length);
    if (famille === "arme" && c.accessoryMounts) {
      const occupees = new Set(c.accessoryMounts(g).occupation.filter((o) => o.nom).map((o) => o.monture));
      groupesMods = groupesMods.map((grp) => ({
        ...grp,
        items: grp.items.map((it) => {
          const a = c.accessoryById(it.id);
          const m = a && Array.isArray(a.montures) ? a.montures : null;
          const prises = m && m.length && m.every((mm) => occupees.has(mm));
          return prises ? { ...it, warn: `Monture${m.length > 1 ? "s" : ""} déjà prise${m.length > 1 ? "s" : ""} : ${m.join(", ")}` } : it;
        }),
      }));
    }
    /* Un objet que rien ne classe : le meneur dit ce qu'il est. Les puces
       restent tant que la famille vient de lui, pour se reprendre. */
    const puces = familleAuto
      ? ""
      : `<div class="cluster cg-add-row cg-gear-family">
          <span class="cg-section-note">Cet objet est</span>
          ${[["arme", "une arme"], ["armure", "une armure"], ["vehicule", "un véhicule"]]
            .map(([f, l]) => `<button type="button" class="cg-pick-shelf${g.family === f ? " is-on" : ""}" data-gl-action="set-family" data-idx="${i}" data-family="${f}" aria-pressed="${g.family === f}">${l}</button>`)
            .join("")}
          ${g.family ? "" : `<span class="cg-section-note">— sans famille, pas d'accessoire</span>`}
        </div>`;
    const opts = groupesMods.length
      ? CatalogPicker.html({
          id: `mods-${g.uid}`,
          groups: groupesMods,
          actionAttr: "data-gl-action",
          action: "add-mod",
          attrs: `data-idx="${i}"`,
          vide: "Aucun accessoire pour cette famille.",
        })
      : "";
    const reserves = this._vehicleReserves(c, g, i) + this._weaponSlots(c, g) + this._armorCapacity(c, g, i);
    const implant = c.isImplant && c.isImplant(g);
    const st = implant ? c.implantState(g, host) : null;
    const cout = st ? st.cost : g.cost;
    const dispo = st ? st.availability : g.availability;
    const resume = [
      cout ? `${x(cout)} ¥` : g.costNote ? g.costNote : "prix à saisir",
      dispo != null && dispo !== "" ? `Disp. ${dispo}` : "",
      st ? `Essence ${st.essence == null ? "?" : x(st.essence)}` : "",
      mods.length ? `${mods.length} accessoire${mods.length > 1 ? "s" : ""}` : "",
    ].filter(Boolean).join(" · ");
    const alerte = conflits.length ? ` <span class="cg-gear-flag" title="${esc(conflits.join(" ; "))}">⚑</span>` : "";
    const open = this._isOpen(cfg, g.uid);
    return `<div class="cg-gear-row" data-gear-uid="${esc(g.uid)}">
      <details class="cg-gear-details" data-gear-fold="${esc(g.uid)}"${open ? " open" : ""}>
        <summary class="cg-gear-summary">
          <span class="cg-gear-name">${esc(g.name || "")}</span>
          <span class="cg-gear-meta">${esc(resume)}${alerte}</span>
        </summary>
        <div class="stack cg-gear-body">
          <div class="cluster cg-add-row">
            <label class="cg-section-note cg-essence-in">Prix <input type="number" class="cg-in-price" min="0" step="100" data-gl="gear.${i}.cost" value="${g.cost || 0}" title="${implant ? "Prix au tarif standard — la gamme s'applique ensuite" : "Coût en nuyens"}"> ¥</label>
            ${g.costNote && !g.cost ? `<span class="cg-section-note" title="Le livre donne une formule, pas un nombre : à calculer">${esc(g.costNote)}</span>` : ""}
            <label class="cg-section-note cg-essence-in">Disp. <input type="number" class="cg-in-dispo" min="0" data-gl="gear.${i}.availability" value="${g.availability ?? ""}" title="${implant ? "Disponibilité standard — la gamme s'applique ensuite" : "Disponibilité"}"></label>
          </div>
          ${implant ? this._implantRow(cfg, g, i) : ""}
          ${tags ? `<div class="cg-pick-chosen">${tags}</div>` : ""}
          ${conflits.map((t) => `<p class="cg-hint">⚑ ${esc(t)}</p>`).join("")}
          ${reserves}
          ${puces}
          ${opts ? `<div class="cg-section-label">Accessoires <span class="cg-section-note">choisir dans la liste</span></div>${opts}` : ""}
        </div>
      </details>
      <button type="button" class="btn-icon-tiny danger cg-gear-remove" data-gl-action="remove" data-idx="${i}" title="Retirer">✕</button>
    </div>`;
  },

  /* La GAMME d'un implant : le sélecteur, et ce qu'elle fait — Essence,
     prix, Disponibilité effectifs. L'Essence introuvable sur la ligne du
     livre est dite « ? », pas comptée 0. */
  _implantRow(cfg, g, i) {
    const esc = CatalogPicker.esc;
    const c = cfg.creation;
    const host = cfg.host();
    const st = c.implantState(g, host);
    const x = (n) => Number(n).toLocaleString("fr-FR");
    const opts = c.implantGrades()
      .map((o) => `<option value="${esc(o.value)}" ${(g.grade || "standard") === o.value ? "selected" : ""}>${esc(o.label)}</option>`)
      .join("");
    const plage = st.table && st.table.plage;
    const indice = plage
      ? `<label class="cg-section-note cg-essence-in">Indice <input type="number" class="cg-in-indice" min="${plage.min}" max="${plage.max}" data-gl="gear.${i}.rating" value="${g.rating ?? ""}" placeholder="${plage.min}–${plage.max}" title="Indice de cet implant (${plage.min}–${plage.max})"></label>`
      : "";
    /* Capacité : un hôte montre ce qu'il offre et ce qui y est logé ; un
       implant à coût de capacité choisit son hôte — ou la chair. */
    const cap = st.capacite || {};
    const hotes = c.implantHosts ? c.implantHosts(host).filter((h) => h.uid !== g.uid) : [];
    let capHtml = "";
    if (cap.offerte != null) {
      const moi = c.implantHosts(host).find((h) => h.uid === g.uid) || { utilises: 0, total: cap.offerte, pris: [] };
      capHtml += `<span class="cg-pick-tag${moi.utilises > moi.total ? " cg-tag-over" : ""}" title="${esc(moi.pris.join(", ") || "rien de logé")}">Capacité ${moi.utilises}/${moi.total}</span>`;
    }
    if (cap.consommee != null) {
      const o = hotes.map((h) => `<option value="${esc(h.uid)}" ${g.hote === h.uid ? "selected" : ""}>${esc(h.name)} (${h.libre} libre${h.libre > 1 ? "s" : ""})</option>`).join("");
      capHtml += `<span class="cg-section-note">[${cap.consommee}]</span>
        <select data-gl="gear.${i}.hote" aria-label="Logé dans" ${hotes.length ? "" : "disabled"}>
          <option value="">${cap.doitEtreLoge ? "— à loger dans un membre —" : "dans la chair (Essence)"}</option>${o}
        </select>`;
      if (!hotes.length && cap.doitEtreLoge) capHtml += `<span class="cg-section-note">aucun cybermembre dans l'équipement</span>`;
    }
    /* Un cybermembre a sa Force et son Agilité : base, personnalisation,
       améliorations logées. Une « Augmentation d'attribut » (SR6) choisit
       l'attribut qu'elle monte. */
    let membreHtml = "";
    if (st.membre) {
      const m = st.membre;
      const perso = c.CYBERLIMB && c.CYBERLIMB.personnalisation;
      const maxDe = (k) => {
        try {
          return c.attrRangeFor(host, k)[1];
        } catch {
          return 12;
        }
      };
      const champ = (k) =>
        perso
          ? `<label class="cg-section-note cg-essence-in">${k} <input type="number" class="cg-in-indice" min="${m.base}" max="${maxDe(k)}" data-gl="gear.${i}.membre.${k}" value="${(g.membre || {})[k] ?? m.base}" title="${k} du membre (base ${m.base}, personnalisable jusqu'au maximum naturel)"></label>${m.ameliorations[k] ? `<span class="cg-section-note">+${m.ameliorations[k]} = <strong>${m[k]}</strong></span>` : ""}`
          : `<span class="cg-section-note">${k} <strong>${m[k]}</strong></span>`;
      membreHtml = `<div class="cluster cg-add-row"><span class="cg-section-note">Membre</span>${champ("FOR")}${champ("AGI")}${m.armure ? `<span class="cg-section-note">Armure +${m.armure}</span>` : ""}${m.persoPoints ? `<span class="cg-section-note">personnalisé +${m.persoPoints} : +${m.persoCout.toLocaleString("fr-FR")} ¥, Disp. +${m.persoDispo}</span>` : ""}</div>`;
    }
    const dAttr = c.implantDefaults ? c.implantDefaults(g.name, g.rating) : null;
    const attribut = dAttr && dAttr.ref && /augmentation d.attribut/i.test(dAttr.ref.nom)
      ? `<label class="cg-section-note">monte <select data-gl="gear.${i}.attribut"><option value="FOR" ${g.attribut !== "AGI" ? "selected" : ""}>Force</option><option value="AGI" ${g.attribut === "AGI" ? "selected" : ""}>Agilité</option></select></label>`
      : "";
    return `${membreHtml}<div class="cluster cg-add-row">
      ${indice}${attribut}
      <span class="cg-section-note">Gamme</span>
      <select data-gl="gear.${i}.grade" aria-label="Gamme de l'implant">${opts}</select>
      ${
        st.essence == null || g.essenceBase != null
          ? `<label class="cg-section-note cg-essence-in">Essence standard <input type="number" class="cg-in-dispo" min="0" step="0.05" data-gl="gear.${i}.essenceBase" value="${g.essenceBase ?? ""}" placeholder="?" title="Coût en Essence au livre, gamme standard"></label>`
          : ""
      }
      <span class="cg-pick-tag${st.essence == null ? " cg-tag-libre" : ""}" title="Essence perdue à cette gamme">Essence ${st.essence == null ? "?" : x(st.essence)}</span>
      ${st.multiplicateurs.cout !== 1 ? `<span class="cg-section-note">coût ${x(st.cost)} ¥</span>` : ""}
      ${st.multiplicateurs.dispo && st.availability != null ? `<span class="cg-section-note">Disp. ${st.availability}</span>` : ""}
      ${capHtml}
    </div>
    ${st.essence == null ? `<p class="cg-hint">⚑ Le catalogue ne donne pas l'Essence de cet implant : saisis-la, sinon elle n'est pas comptée.</p>` : ""}`;
  },

  /* La CAPACITÉ d'une armure, quand l'objet porte au moins une modification
     d'armure ou du matériel installé. */
  _armorCapacity(c, g, i) {
    const esc = CatalogPicker.esc;
    if (!c.armorCapacityState || !c.ARMOR_RESERVE) return "";
    const armure = ModRefs.normalize(g.mods).some((ref) => {
      const a = c.accessoryById(ModRefs.id(ref));
      return a && Object.prototype.hasOwnProperty.call(a, "capacite");
    });
    if (!armure) return "";
    const base = c.ARMOR_RESERVE;
    const val = g[base.key];
    const e = c.armorCapacityState(g);
    const over = e.total != null && e.utilises > e.total;
    return `<div class="cluster cg-add-row">
      <span class="cg-section-note">${esc(base.label)}</span>
      <input type="number" class="cg-in-dispo" min="0" data-gl="gear.${i}.${esc(base.key)}" value="${val ?? ""}" title="${esc(base.hint)}">
      <span class="cg-pick-tag${over ? " cg-tag-over" : ""}" title="${esc(e.pris.join(", ") || "rien d'installé")}">Utilisée ${e.utilises}/${e.total == null ? "?" : e.total}</span>
    </div>
    ${val == null ? `<p class="cg-hint">Saisis l'indice d'Armure : ${esc(base.hint)}</p>` : ""}
    ${over ? `<p class="cg-hint">⚑ ${e.utilises - e.total} point(s) de capacité de trop pour cette protection.</p>` : ""}
    ${e.indetermines.map((m) => `<p class="cg-hint">⚑ ${esc(m.nom)} : capacité ${esc(m.note)} — non comptée.</p>`).join("")}`;
  },

  /* Les emplacements de modification d'une ARME (SR6) et ses montures. */
  _weaponSlots(c, g) {
    const esc = CatalogPicker.esc;
    const armes = ModRefs.normalize(g.mods).map((ref) => c.accessoryById(ModRefs.id(ref))).filter((a) => a && a.montures !== undefined);
    if (!armes.length) return "";
    const morceaux = [];
    if (c.weaponModState) {
      const e = c.weaponModState(g);
      const sur = e.total == null ? "?" : e.total;
      const over = e.total != null && e.utilises > e.total;
      morceaux.push(`<span class="cg-pick-tag${over ? " cg-tag-over" : ""}" title="${esc(e.pris.join(", ") || "aucune modification")}">Modifications ${e.utilises}/${sur}</span>`);
      if (e.note) morceaux.push(`<span class="cg-section-note">${esc(e.note)}</span>`);
      if (over) morceaux.push(`<p class="cg-hint">⚑ ${e.utilises - e.total} modification(s) de trop pour ce type d'arme.</p>`);
    }
    if (c.accessoryMounts && armes.some((a) => a.montures === "*" || (a.montures && a.montures.length))) {
      const m = c.accessoryMounts(g);
      const puces = m.occupation
        .map((o) => `<span class="cg-pick-tag${o.nom ? "" : " cg-tag-libre"}" title="${esc(o.nom ? `${o.monture} : ${o.nom}` : `${o.monture} : libre`)}">${esc(o.monture)}${o.nom ? ` : ${esc(o.nom)}` : ""}</span>`)
        .join("");
      morceaux.push(puces || `<span class="cg-section-note">aucune monture sur cette arme</span>`);
      if (m.note) morceaux.push(`<span class="cg-section-note">${esc(m.note)}</span>`);
    }
    return morceaux.length ? `<div class="cluster cg-add-row">${morceaux.join("")}</div>` : "";
  },

  /* Les réserves d'emplacements d'un véhicule, quand l'objet porte au moins
     un mod de véhicule. Un mod aux emplacements indéterminés est NOMMÉ, pas
     compté 0 ; un dépassement n'a pas le même sens partout (SR6 rachète à
     2:1, Rigger 5 interdit) — `deficit.conversion` le dit. */
  _vehicleReserves(c, g, i) {
    const esc = CatalogPicker.esc;
    if (!c.vehicleModState || !c.MOD_RESERVE) return "";
    const deVehicule = ModRefs.normalize(g.mods).some((ref) => {
      const a = c.accessoryById(ModRefs.id(ref));
      return a && a.montures === undefined && !Object.prototype.hasOwnProperty.call(a, "capacite");
    });
    if (!deVehicule) return "";
    const base = c.MOD_RESERVE;
    const val = g[base.key];
    const etat = c.vehicleModState(g);
    const deficit = c.vehicleModDeficit ? c.vehicleModDeficit(g) : null;
    const puces = etat.reserves
      .map((r) => `<span class="cg-pick-tag${r.reste < 0 ? " cg-tag-over" : ""}" title="${esc(r.famille)} : ${r.utilises} sur ${r.total}">${esc(r.famille)} ${r.utilises}/${r.total}</span>`)
      .join("");
    let ligneDeficit = "";
    if (deficit && val != null) {
      const suite = deficit.conversion
        ? ` Conversion 2 pour 1 : il faut ${deficit.besoin} emplacement(s) libres ailleurs, il y en a ${deficit.dispo}${deficit.possible ? "" : " — pas assez"}.`
        : " Aucune conversion entre catégories dans cette édition : il faut retirer un mod.";
      ligneDeficit = `<p class="cg-hint">⚑ ${esc(deficit.manque.join(" ; "))}.${esc(suite)}</p>`;
    }
    return `<div class="cluster cg-add-row">
      <span class="cg-section-note">${esc(base.label)}</span>
      <input type="number" class="cg-in-dispo" min="0" data-gl="gear.${i}.${esc(base.key)}" value="${val ?? ""}" title="${esc(base.hint)} — à saisir">
      ${puces}
    </div>
    ${val == null ? `<p class="cg-hint">Saisis la ${esc(base.label)} du véhicule : ${esc(base.hint)}</p>` : ""}
    ${ligneDeficit}
    ${etat.indetermines.map((m) => `<p class="cg-hint">⚑ ${esc(m.nom)} : emplacements ${esc(m.note)} — non comptés dans ${esc(m.famille)}.</p>`).join("")}`;
  },

  /* ---- Mutations ---- */
  _setPath(obj, path, val) {
    const parts = path.split(".");
    let cur = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      if (cur[parts[i]] == null && !/^\d+$/.test(parts[i + 1])) cur[parts[i]] = {};
      cur = cur[parts[i]];
      if (cur == null) return;
    }
    cur[parts[parts.length - 1]] = val;
  },

  /** Un champ `data-gl` a changé : on écrit dans `host` puis `onChange`. */
  _applyField(cfg, el) {
    const host = cfg.host();
    const c = cfg.creation;
    const path = el.dataset.gl;
    let val;
    if (el.type === "number") {
      // Un champ vide ou illisible ne doit jamais écrire `NaN`.
      val = el.value === "" ? null : Number(el.value);
      if (val != null && !Number.isFinite(val)) return;
    } else val = el.value;
    /* L'indice d'un implant vient d'être choisi : la table du livre donne
       alors son prix et sa Disponibilité standard — proposés si les champs
       sont encore vides, jamais écrasés. */
    const mRating = path.match(/^gear\.(\d+)\.rating$/);
    if (mRating && c.implantDefaults) {
      const g = (host.gear || [])[Number(mRating[1])];
      const d = g ? c.implantDefaults(g.name, val) : null;
      if (g && d) {
        if (!g.cost && d.cost != null) g.cost = d.cost;
        if ((g.availability == null || g.availability === "") && d.availability != null) g.availability = d.availability;
      }
    }
    this._setPath(host, path, val);
    cfg.onChange();
  },

  _handle(cfg, el) {
    const host = cfg.host();
    const c = cfg.creation;
    host.gear = host.gear || [];
    const i = Number(el.dataset.idx);
    switch (el.dataset.glAction) {
      case "pick": {
        const nom = el.dataset.name;
        if (!host.gear.some((g) => g.name === nom)) {
          const ref = ((c.gearCatalog && c.gearCatalog()) || []).flatMap((g) => g.items).find((it) => it.label === nom);
          const brut = { name: nom, detail: ref && ref.detail, kind: el.dataset.kind || undefined };
          const item = c.gearFromCatalog ? c.gearFromCatalog(brut) : { uid: Utils.uid(), name: nom, cost: 0, ...(brut.kind ? { kind: brut.kind } : {}) };
          host.gear.push(item);
          // L'objet qu'on vient d'ajouter s'ouvre : ses options sont là.
          this._setOpen(cfg, item.uid, true);
          if (cfg.onAdd) cfg.onAdd(item);
        }
        break;
      }
      case "add-free": {
        const src = cfg.rows && cfg.rows.querySelector("[data-gl-free]");
        const txt = (src && src.value || "").trim();
        if (!txt) return;
        const item = { uid: Utils.uid(), name: txt, cost: 0, availability: null };
        host.gear.push(item);
        this._setOpen(cfg, item.uid, true);
        if (cfg.onAdd) cfg.onAdd(item);
        break;
      }
      case "add-mod": {
        const g = host.gear[i];
        const id = el.dataset.id;
        if (!g || !id) return;
        g.mods = ModRefs.normalize(g.mods);
        const a = c.accessoryById(id);
        const plage = a && ModRefs.indiceRange(a);
        // Le même mod peut se poser deux fois (deux Dessous sur un M23).
        g.mods.push(a && ModRefs.usesIndice(a) ? { id, indice: plage ? plage.min : 1 } : { id });
        break;
      }
      case "remove-mod": {
        const g = host.gear[i];
        if (!g || !g.mods) return;
        g.mods = ModRefs.normalize(g.mods).filter((_, k) => k !== Number(el.dataset.k));
        break;
      }
      case "remove":
        host.gear.splice(i, 1);
        break;
      case "set-family": {
        // Recliquer la famille choisie la retire — et ses accessoires avec.
        const g = host.gear[i];
        if (!g) return;
        if (g.family === el.dataset.family) {
          delete g.family;
          g.mods = [];
        } else g.family = el.dataset.family;
        break;
      }
      default:
        return;
    }
    cfg.onChange();
  },

  /** Délégation unique, au document. `toggle` ne remonte pas : capture. */
  init() {
    if (this._bound) return;
    this._bound = true;
    document.addEventListener("click", (e) => {
      const el = e.target.closest("[data-gl-action]");
      if (!el) return;
      // Une entrée barrée (hors limite) se lit, ne se choisit pas.
      if (el.getAttribute("aria-disabled") === "true") return;
      const cfg = this._cfgOf(el);
      if (cfg) this._handle(cfg, el);
    });
    document.addEventListener("change", (e) => {
      const el = e.target.closest("[data-gl]");
      if (!el) return;
      const cfg = this._cfgOf(el);
      if (cfg) this._applyField(cfg, el);
    });
    document.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" || !e.target.matches("[data-gl-free]")) return;
      const cfg = this._cfgOf(e.target);
      const btn = cfg && cfg.rows && cfg.rows.querySelector('[data-gl-action="add-free"]');
      if (!btn) return;
      e.preventDefault();
      this._handle(cfg, btn);
    });
    document.addEventListener(
      "toggle",
      (e) => {
        const d = e.target;
        if (!d || !d.dataset || !d.dataset.gearFold) return;
        const cfg = this._cfgOf(d);
        if (cfg) this._setOpen(cfg, d.dataset.gearFold, d.open);
      },
      true,
    );
  },
};

// Pont couche 4 (migration modules ES) — retiré en fin de migration.
window.GearList = GearList;
