"use strict";

/* ============================================================
   AMPLITUDE SELECTOR — rendu partagé d'un cadran d'amplitude
   (Puissance de sort/esprit, Niveau de forme complexe/sprite) : au-delà
   de PUCES_MAX crans, la rangée de puces (`.summon-step-btn`) cède la
   place à un stepper compact (valeur + −/+) plutôt que de continuer à
   empiler des boutons.

   Décision produit (verrouillée) : le seuil bascule sur `steps.length`,
   JAMAIS sur une media query — l'entrée décide, pas l'appareil. 8 est
   une DONNÉE DE JEU (« les valeurs les plus utilisées »), pas une
   contrainte de largeur d'écran : ne pas le rejustifier par du CSS.

   Chaque bouton — puce ou +/− du stepper — porte le MÊME attribut
   `data-*` que l'ancien rendu (nom passé en paramètre) : les écouteurs
   de clic existants (summonpanel.js, magicaction.js) n'ont rien à
   changer, seul le contenu de `.summon-steps` est régénéré à chaque
   synchronisation.
   ============================================================ */
import { Utils } from "../../core/utils.js";

export const AmplitudeSelector = {
  PUCES_MAX: 8,

  /** `steps`: [{value, label}], `activeValue`: valeur courante,
      `dataAttr`: nom de l'attribut data-* (ex. "force", "power"). */
  render(steps, activeValue, dataAttr) {
    if (!steps || !steps.length) return "";
    if (steps.length <= this.PUCES_MAX) {
      return steps
        .map(
          ({ value, label }) =>
            `<button class="summon-step-btn${value === activeValue ? " active" : ""}" data-${dataAttr}="${Utils.escHtml(String(value))}">${Utils.escHtml(String(label))}</button>`,
        )
        .join("");
    }
    let idx = steps.findIndex((s) => s.value === activeValue);
    if (idx < 0) idx = 0;
    const cur = steps[idx];
    const prev = steps[Math.max(0, idx - 1)];
    const next = steps[Math.min(steps.length - 1, idx + 1)];
    return `
      <button class="summon-step-btn summon-step-adjust" data-${dataAttr}="${Utils.escHtml(String(prev.value))}"${idx <= 0 ? " disabled" : ""} aria-label="Diminuer">−</button>
      <span class="summon-step-value">${Utils.escHtml(String(cur.label))}</span>
      <button class="summon-step-btn summon-step-adjust" data-${dataAttr}="${Utils.escHtml(String(next.value))}"${idx >= steps.length - 1 ? " disabled" : ""} aria-label="Augmenter">+</button>`;
  },
};

// Pont couche 4 (migration modules ES) — retiré en fin de migration.
window.AmplitudeSelector = AmplitudeSelector;
