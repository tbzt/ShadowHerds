"use strict";

/* ============================================================
   PERSONA RENDERER — bloc persona incarné sur la carte PNJ
   (technomancien), partagé avec le bloc Cyberdeck dans le module
   Matrice ⚡ (cardrenderer.js). Miroir minimal de CyberdeckRenderer :
   reçoit le PNJ + son édition en paramètres, ne lit ni ne modifie
   rien lui-même — la donnée vit sur `pnj.persona`
   (structure posée par Resonance.blank/hydrate et la migration
   Storage v9). Contrairement au deck, pas de moniteur ni de
   programmes/loadout ici : le persona n'est pas du matériel choisi,
   juste des attributs calculés (cf. resonance.js) — seul le choix de
   répartition SR6 est édité.
   ============================================================ */
import { CardRenderer } from "./cardrenderer.js";
import { Resonance } from "../../rules/resonance.js";
import { Utils } from "../../core/utils.js";

export const PersonaRenderer = {
  /** Bloc lecture seule sur la carte (module Matrice, juste après le
      bloc Cyberdeck le cas échéant). `""` si le PNJ n'a NI persona NI
      progression de Submersion (pas de technomancien, ou pas encore
      hydraté) — un submergé A1 (pas de persona chiffré, cf. technoModel
      A1) doit quand même voir son badge de grade. */
  block(pnj, edition, deps) {
    const submerged = !!(pnj.esoteric && pnj.esoteric.voie === "submersion");
    if (!pnj.persona && !submerged) return "";
    const esc = (deps && deps.CardRenderer && deps.CardRenderer._esc) || CardRenderer._esc;
    const badge = submerged ? CardRenderer._esotericBadge(pnj) : "";
    if (!pnj.persona) return badge;
    const keys = Resonance.attrKeys(edition);
    if (!keys.length) return badge;
    const persona = Resonance.livingPersona(pnj, edition);
    const attrsHtml = `<div class="attr-grid">${keys
      .map((k) => CardRenderer._attrCell(k.badge, persona[k.key], "", { roll: false }))
      .join("")}</div>`;
    const realloc = Resonance.redistributable(edition);
    const reallocHtml = realloc && keys.length > 1
      ? `<div class="cyberdeck-realloc" title="Reconfigurer les attributs matriciels">${keys
          .slice(0, -1)
          .map(
            (k, i) =>
              `<button type="button" class="cyberdeck-swap" data-action="persona-realloc" data-id="${pnj.id}" data-from="${k.key}" data-to="${keys[i + 1].key}" aria-label="Échanger ${esc(k.label)} et ${esc(keys[i + 1].label)}">${k.badge} <svg class="icon icon-sm" aria-hidden="true"><use href="#ic-swap"></use></svg> ${keys[i + 1].badge}</button>`,
          )
          .join("")}</div>`
      : "";
    return `${badge}<div class="ref-block persona-block">
      <div class="ref-lbl">${esc(Resonance.label(edition))} · Indice ${persona.deviceRating}</div>
      ${attrsHtml}
      ${reallocHtml}
      ${this._targetRow(pnj)}
    </div>`;
  },

  /** Cible Matrice du technomancien — même picker de serveur + accès au
      tracker que le decker (miroir de `CyberdeckRenderer._targetRow`), mais
      posé sur le persona. L'état de ciblage est host-générique (`DeckRun`
      lit `persona.run ∥ cyberdeck.run` depuis T6a) → on réutilise les MÊMES
      `data-action` (`deck-set-target`/`deck-open-matrix`), zéro handler neuf :
      le technomancien devient un runner ciblé exactement comme le decker.
      `DeckRun`/`Servers` en globals de pont, comme le fait le renderer de
      deck (pas d'import ES ici). */
  _targetRow(pnj) {
    const esc = CardRenderer._esc;
    const targetId = DeckRun.target(pnj);
    const servers = (Servers.data && Servers.data.all) || [];
    const options =
      `<option value="">Aucune cible</option>` +
      servers
        .map((s) => `<option value="${s.id}" ${s.id === targetId ? "selected" : ""}>${esc(s.name)}</option>`)
        .join("");
    const openBtn = targetId
      ? `<button type="button" class="cyberdeck-swap" data-action="deck-open-matrix" data-id="${pnj.id}" title="Ouvrir la Matrice de ce serveur">⚡ Ouvrir la Matrice</button>`
      : "";
    return `<div class="cyberdeck-target">
      <select class="cyberdeck-target-select" data-action="deck-set-target" data-id="${pnj.id}" aria-label="Serveur ciblé">${options}</select>
      ${openBtn}
    </div>`;
  },

  /** Râtelier d'actions matricielles du persona — miroir de
      `CyberdeckRenderer.combatArsenal`, appelé par les renderers d'édition en
      zone Combat juste après le râtelier du deck. Vide si le PNJ n'a pas de
      persona chiffré (pas de technomancien, ou édition sans livingPersona). */
  combatArsenal(pnj, edition) {
    if (!pnj.persona) return "";
    return this._arsenalRow(pnj, edition);
  },

  /** Barre des actions offensives, VOILÉE Résonance (le technomancien joue les
      MÊMES actions matricielles qu'un decker — cf. Resonance.actions — mais par
      la Résonance : bandeau « Résonance », pools tirés du persona vivant). Même
      grammaire d'affichage que le râtelier du deck (`.matrix-block`, une action
      = une `.weapon-line`, pic de données en tête, le reste replié) : on reprend
      tout le chrome Matrice sans dupliquer de CSS. `data-action="persona-action"`
      route vers `Resonance.rollAction`. Les actions sont indépendantes de la
      cible (le serveur ne sert qu'à nommer, cf. dispatch) : pas de picker ici. */
  _arsenalRow(pnj, edition) {
    const esc = CardRenderer._esc;
    const acts = Resonance.actions(pnj, edition);
    if (!acts.length) return "";
    const line = (a) => {
      const rollable = a.pool != null;
      const poolBadge = rollable ? `<span class="weapon-pool">⚄${a.pool}</span>` : "";
      const dvTxt = a.dv != null ? `VD ${a.dv}` : "";
      const title = `${a.name}${a.dv != null ? ` · VD ${a.dv}` : ""}${rollable ? ` · ${a.pool} dés` : ""} (p.${a.page})`;
      return `<div class="weapon-line matrix-line${rollable ? " weapon-rollable rollable" : ""}" data-action="persona-action" data-id="${pnj.id}" data-key="${esc(a.key)}" title="${esc(title)}">
        <div><div class="weapon-name">${esc(a.name)}</div>${dvTxt ? `<div class="weapon-stat">${dvTxt}</div>` : ""}</div>
        ${poolBadge}
      </div>`;
    };
    const primary = acts.filter((a) => a.type === "attack").map(line).join("");
    const rest = acts.filter((a) => a.type !== "attack");
    let restHtml = "";
    if (rest.length) {
      const n = rest.length;
      restHtml = `<details class="cyberdeck-more">
        <summary class="cyberdeck-more-summary"><span class="cyberdeck-more-dots">⋯</span> ${n} autre${n > 1 ? "s" : ""} action${n > 1 ? "s" : ""}</summary>
        <div class="cyberdeck-more-body">${rest.map(line).join("")}</div>
      </details>`;
    }
    return `<div class="weapon-block matrix-block">
      <div class="zone-eyebrow">Résonance</div>
      ${primary}
      ${restHtml}
    </div>`;
  },

  /** Déplace 1 point d'`alloc` d'un attribut vers l'autre, borné au cap
      de chacun (reallocCap). Appelé par le handler `data-action=
      "persona-realloc"` (délégation, comme `deck-realloc`). */
  realloc(pnj, edition, from, to) {
    if (!pnj.persona) return;
    const alloc = (pnj.persona.alloc ||= {});
    const base = (key) => Utils.clamp(
      Resonance.livingPersona(pnj, edition)[key] - (alloc[key] || 0),
      0,
      99,
    );
    const capFrom = Resonance.reallocCap(edition, base(from));
    const capTo = Resonance.reallocCap(edition, base(to));
    const curFrom = alloc[from] || 0;
    const curTo = alloc[to] || 0;
    if (curFrom <= -capFrom || curTo >= capTo) return;
    alloc[from] = curFrom - 1;
    alloc[to] = curTo + 1;
  },

  /** Section EditModal — répartition SR6 uniquement (SR5 n'a rien à
      éditer, le persona est un mappage direct). Montée seulement si
      `pnj.persona` existe et que l'édition est redistribuable. */
  editSection(pnj) {
    const esc = CardRenderer._esc;
    const edition = pnj.edition;
    if (!Resonance.redistributable(edition)) return "";
    const keys = Resonance.attrKeys(edition);
    const persona = Resonance.livingPersona(pnj, edition);
    const alloc = pnj.persona.alloc || {};
    const inputs = keys
      .map(
        (k) => `<div class="form-group">
          <label>${esc(k.label)} (dont ${alloc[k.key] || 0} répartis)</label>
          <input type="number" id="em-persona-alloc-${k.key}" value="${alloc[k.key] || 0}" min="-4" max="4">
        </div>`,
      )
      .join("");
    return `<div class="modal-section">
      <div class="modal-section-title">${esc(Resonance.label(edition))} — répartition (Indice ${persona.deviceRating})</div>
      <div class="modal-grid">${inputs}</div>
    </div>`;
  },

  /** Lit les champs du formulaire ci-dessus dans pnj.persona.alloc
      (appelé par EditModal._readForm, seulement si la section a été
      montée). Chaque valeur bornée à son cap individuel. */
  readForm(pnj) {
    if (!pnj.persona || !Resonance.redistributable(pnj.edition)) return;
    const alloc = (pnj.persona.alloc ||= {});
    for (const k of Resonance.attrKeys(pnj.edition)) {
      const el = document.getElementById(`em-persona-alloc-${k.key}`);
      if (!el) continue;
      const n = parseInt(el.value, 10);
      alloc[k.key] = Number.isFinite(n) ? Utils.clamp(n, -4, 4) : alloc[k.key] || 0;
    }
  },
};

// Pont couche 4 (migration modules ES) — retiré en fin de migration.
window.PersonaRenderer = PersonaRenderer;
