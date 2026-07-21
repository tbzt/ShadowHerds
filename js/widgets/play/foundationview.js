"use strict";

/* ============================================================
   FOUNDATION VIEW — lot B (option 2, « socle de référence »).
   Vue de RÉFÉRENCE en lecture seule des Fondations d'un serveur :
   les 7 nœuds, leurs actions/jets SOURCÉS, le paradigme réaffiché
   (srv.sculpture) et le rappel de la Variance. SR5 + SR6 seulement.

   N'INTRODUIT AUCUN ÉTAT et NE PERSISTE RIEN : un overlay qui lit
   `Matrix.foundation*` (données par édition) et se ferme. Aucun
   générateur SVG (B2, différé), aucun tracker de Variance (B4, différé).
   Coquille .modal-overlay réutilisée (thème par édition hérité), calquée
   sur js/controllers/debrief.js. Aucun `onclick` : délégation
   `data-foundation-action`, fermeture overlay/croix/Échap.

   ⚠ Anti-aplatissement (Canon) : ce widget ne compose JAMAIS un jet ;
   il affiche la chaîne `roll` déjà écrite par le module d'édition
   (SR5 = Indice + attribut, SR6 = Indice × 2 — cf. FONDATIONS_SERVEUR_BT1.md).
   ============================================================ */
import { Matrix } from "../../rules/matrix.js";
import { Utils } from "../../core/utils.js";

export const FoundationView = {
  _el: null,

  /** Ouvre la vue de référence des Fondations d'un serveur. No-op si
      l'édition du serveur n'a pas de Fondation (Anarchy) — l'affordance
      elle-même est déjà gatée, ce garde-fou est défensif. */
  open(srv) {
    if (!srv) return;
    const ed = Matrix.use(srv.edition);
    if (!ed.hasFoundation()) return;
    const overlay = this._ensure();
    overlay.querySelector('[data-foundation="title"]').textContent =
      `Fondations — ${srv.name || "serveur"}`;
    overlay.querySelector('[data-foundation="body"]').innerHTML = this._bodyHtml(srv, ed);
    overlay.classList.add("open");
  },

  hide() {
    if (this._el) this._el.classList.remove("open");
  },

  /* ---- Rendu (lecture seule) ---- */
  _bodyHtml(srv, ed) {
    const esc = Utils.escHtml;
    const indice = srv.indice != null ? ` · Indice ${esc(srv.indice)}` : "";

    const paradigm = srv.sculpture
      ? `<blockquote class="foundation-paradigm">${esc(srv.sculpture)}</blockquote>`
      : `<p class="foundation-hint">Aucune sculpture définie — le paradigme reste à décrire.</p>`;

    const nodes = ed
      .foundationNodes()
      .map((node) => {
        const actions = node.actions.length
          ? `<ul class="foundation-actions">${node.actions
              .map(
                (a) =>
                  `<li><span class="foundation-action-name">${esc(a.name)}</span>` +
                  `<span class="foundation-action-roll">${esc(a.roll)}</span>` +
                  (a.effect
                    ? `<span class="foundation-action-effect">${esc(a.effect)}</span>`
                    : "") +
                  `</li>`,
              )
              .join("")}</ul>`
          : `<p class="foundation-hint">Aucune action connue sur ce nœud.</p>`;
        return `<section class="foundation-node">
            <h4 class="foundation-node-title">${esc(node.label)}</h4>
            <p class="foundation-node-role">${esc(node.role)}</p>
            ${actions}
          </section>`;
      })
      .join("");

    return `<div class="foundation-lead">
        <span class="foundation-sub">Donjon interne de 7 nœuds${indice}</span>
      </div>
      <section class="foundation-meta">
        <h4 class="foundation-node-title">Paradigme</h4>
        ${paradigm}
        <p class="foundation-hint">${esc(ed.foundationParadigmHint())}</p>
      </section>
      <section class="foundation-meta">
        <h4 class="foundation-node-title">Entrer dans les Fondations</h4>
        <p class="foundation-node-role">${esc(ed.foundationEntryText())}</p>
      </section>
      <section class="foundation-meta foundation-variance">
        <h4 class="foundation-node-title">Variance</h4>
        <p class="foundation-node-role">${esc(ed.foundationVarianceNote())}</p>
      </section>
      <div class="foundation-section-title">Les 7 nœuds</div>
      ${nodes}`;
  },

  _ensure() {
    if (this._el) return this._el;
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay foundation-overlay";
    overlay.id = "foundation-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.innerHTML = `
      <div class="modal foundation-modal">
        <div class="modal-header">
          <span class="modal-title" data-foundation="title">Fondations</span>
          <button class="modal-close" data-foundation-action="close" aria-label="Fermer">✕</button>
        </div>
        <div class="modal-body foundation-body" data-foundation="body"></div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        this.hide();
        return;
      }
      const btn = e.target.closest("[data-foundation-action]");
      if (btn && btn.dataset.foundationAction === "close") this.hide();
    });
    document.addEventListener("keydown", (e) => {
      if (!overlay.classList.contains("open")) return;
      if (e.key === "Escape") {
        e.preventDefault();
        this.hide();
      }
    });
    this._el = overlay;
    return overlay;
  },
};

// Pont couche 5 (migration modules ES) — retiré en fin de migration.
window.FoundationView = FoundationView;
