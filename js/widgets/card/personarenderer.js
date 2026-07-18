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
