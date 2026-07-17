"use strict";

/* ============================================================
   CARD FOOTER — mise en page UNIQUE du pied de toute carte
   (PNJ, contact, serveur, véhicule, esprit). Le domaine décrit
   SES actions ; ce module décide de la disposition : le socle
   Collection préfixe ★/🏷 à gauche (footer.prepend), et l'amas
   droite porte les secondaires + un primaire + un menu de
   débordement « ⋯ ».

   Convention (voir CONTRIBUTING « Chrome de carte ») : seul le
   PRIMAIRE porte un glyphe ; les secondaires et les items du ⋯
   sont en texte seul. Le renderer reste maître de QUELLES actions
   existent ; il n'en choisit pas la disposition.
   ============================================================ */
import { CardRenderer } from "./cardrenderer.js";

export const CardFooter = {
  /**
   * @param {Array<Object>} actions  descripteurs, dans l'ordre voulu :
   *   { kind:"primary"|"secondary"|"menu", label, attrs,
   *     icon?    (glyphe — primaire uniquement),
   *     danger?  (primaire teinté danger, ou item rouge du menu) }
   *   `attrs` = chaîne d'attributs data-* déjà échappés. Le domaine
   *   y met sa propre clé de délégation (data-action, data-contact-action…).
   * @param {Object} [opts]
   *   footerClass   classe du conteneur (défaut "pnj-card-footer")
   *   savedActions  chaîne portée en data-saved-actions (cf. CardRenderer.refresh)
   *   savedLabel    libellé « ✓ Sauvegardé » éventuel
   */
  render(actions, opts = {}) {
    const esc = CardRenderer._esc;
    const primary = actions.find((a) => a.kind === "primary");
    const secondaries = actions.filter((a) => a.kind === "secondary");
    const menu = actions.filter((a) => a.kind === "menu");

    const btn = (a, cls) =>
      `<button type="button" class="${cls}" ${a.attrs || ""}>${a.icon ? `${a.icon} ` : ""}${esc(a.label)}</button>`;

    const secHtml = secondaries
      .map((a) => btn(a, "card-action-btn ghost"))
      .join("");
    const primHtml = primary
      ? btn(primary, `card-action-btn ${primary.danger ? "primary-danger" : "save"}`)
      : "";
    const menuHtml = menu.length
      ? `<button type="button" class="card-kebab" data-card-menu-toggle aria-haspopup="true" aria-expanded="false" aria-label="Plus d'actions">⋯</button>
         <div class="card-menu" role="menu" hidden>${menu
           .map(
             (a) =>
               `<button type="button" role="menuitem" class="card-menu-item${a.danger ? " danger" : ""}" ${a.attrs || ""}>${esc(a.label)}</button>`,
           )
           .join("")}</div>`
      : "";

    const savedLbl = opts.savedLabel
      ? `<span class="card-saved-label">${esc(opts.savedLabel)}</span>`
      : "";
    const savedAttr = opts.savedActions
      ? ` data-saved-actions='${opts.savedActions}'`
      : "";

    return `<div class="${opts.footerClass || "pnj-card-footer"}"${savedAttr}>
      ${savedLbl}
      <div class="card-act-cluster">${secHtml}${primHtml}${menuHtml}</div>
    </div>`;
  },
};

// Pont couche 4 (migration modules ES) — retiré en fin de migration.
window.CardFooter = CardFooter;
