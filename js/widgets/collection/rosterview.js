"use strict";

/* ============================================================
   ROSTER VIEW — bascule Ombres entre cartes compactes
   et ligne d'annuaire dense (CardRenderer.renderRow), pour consulter
   un long roster sans faire défiler des accordéons repliés. Préférence
   globale (toutes éditions), persistée via Storage.getGlobal — pas de
   localStorage direct (doctrine).
   ============================================================ */
import { Storage } from "../../core/storage.js";
import { CardPeek } from "../card/cardpeek.js";

export const RosterView = {
  _key: "roster_row_view",
  /* DA lot 3 — l'ANNUAIRE devient le défaut de la bibliothèque.
     Mesuré : une fiche sauvegardée fait 1 703 à 2 380px de haut (moyenne
     2 062) pour un écran de 720 — près de trois écrans par entrée, donc
     ~16 000px de défilement pour lire huit noms. La ligne d'annuaire fait
     36px : un rapport de densité de 57:1 entre les deux modes du MÊME écran,
     et c'est la carte qui était le défaut.
     Or « Ombres portées » répond à « retrouve-moi celui-là », pas à « montre-moi
     tout de lui ». Une carte est un objet de JEU (elle porte des gestes : jets,
     moniteur, actions) ; l'employer comme entrée d'index fait payer le coût
     d'un objet manipulable à chaque fiche qu'on ne fait que survoler des yeux. */
  _on: true,
  _wired: false,

  init() {
    // Le défaut ne s'applique qu'aux MJ qui n'ont jamais tranché : un choix
    // explicite déjà stocké (dans un sens comme dans l'autre) est respecté.
    this._on = !!Storage.getGlobal(this._key, true);
    this._syncButtons();
  },

  active() {
    return this._on;
  },

  bindDelegation() {
    if (this._wired) return;
    this._wired = true;

    document.addEventListener("click", (e) => {
      if (e.target.closest('[data-action="toggle-roster-row"]')) {
        this.toggle();
        return;
      }
      // Clic sur le nom d'une ligne : la fiche s'ouvre EN COUP D'ŒIL, et
      // l'annuaire reste.
      // Avant le lot 3, ce geste appelait `disable()` puis `UI.focusOwner` —
      // cohérent tant que l'annuaire était un mode temporaire dont on sortait
      // en consultant. Maintenant qu'il est le défaut, ce chemin le faisait
      // quitter à chaque consultation : le MJ devait le réactiver après chaque
      // fiche ouverte. `CardPeek` existe exactement pour ça (VIS-14, overlay
      // léger et éditable) et sait feuilleter — on lui passe les lignes
      // affichées dans l'ordre, donc prev/next parcourt l'index sans le
      // refermer. Le retour à la grille de cartes reste offert par la bascule.
      const nameEl = e.target.closest('[data-action="roster-row-open"]');
      if (nameEl) {
        const id = nameEl.getAttribute("data-id");
        const siblings = [
          ...document.querySelectorAll('[data-action="roster-row-open"]'),
        ].map((n) => n.getAttribute("data-id"));
        CardPeek.open(id, { siblings });
      }
    });
  },

  toggle() {
    this._on ? this.disable() : this.enable();
  },
  enable() {
    this._on = true;
    Storage.setGlobal(this._key, true);
    this._syncButtons();
    if (typeof Hub !== "undefined") Hub.render();
  },
  disable() {
    this._on = false;
    Storage.setGlobal(this._key, false);
    this._syncButtons();
    if (typeof Hub !== "undefined") Hub.render();
  },

  /* Le libellé porte l'état, l'accent ne le porte plus.
     Ce bouton posait `.active` quand l'annuaire tournait — juste tant que
     l'annuaire était un mode qu'on allume. Devenu le défaut (cf. `_on`), il
     serait accentué en permanence sur l'écran le plus consulté, pour dire « tu
     es dans la vue normale » : de l'accent qui ne signale rien, exactement ce
     que la loi du § 2 interdit.
     Et il n'en a pas besoin. Ce n'est pas un mode discret comme « Sélectionner »
     — c'est une bascule entre deux vues PAIRES dont le résultat occupe tout
     l'écran : on voit des lignes ou on voit des cartes. Le libellé dit vers où
     l'on va, le contenu dit où l'on est. */
  _syncButtons() {
    document
      .querySelectorAll('[data-action="toggle-roster-row"]')
      .forEach((b) => {
        b.textContent = this._on ? "▤ Cartes" : "☰ Annuaire";
      });
  },
};

// Pont couche 4 (migration modules ES) — retiré en fin de migration.
window.RosterView = RosterView;
