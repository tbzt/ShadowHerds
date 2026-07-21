"use strict";

/* ============================================================
   CARD PEEK — le « coup d'œil » (VIS-14). Ouvre une VRAIE fiche
   (CardRenderer, éditable) en OVERLAY par-dessus « Jouer », sans
   quitter le poste de commandement : on inspecte le casting sans
   déménager, et on feuillette (prev/next) sans refermer.

   Coquille calquée sur `ContentModal` (backdrop, ×, Échap), mais qui
   héberge une carte complète au lieu d'un texte. La fiche est rendue
   avec ses actions (Éditer / Supprimer) : édition et suppression sont
   déléguées GLOBALEMENT par `CardRenderer.bindDelegation` et résolvent
   l'entité par `data-id` — elles écrivent donc dans la Collection
   propriétaire quel que soit le conteneur (ici l'overlay), et
   `CardRenderer.refresh` re-rend toutes les copies, dont celle du peek.

   Ne résout QUE les entités que CardRenderer sait rendre (PNJ / PJ /
   contact via `PnjLookup.find`) ; l'appelant (`play.js`) réserve le
   serveur à la révélation Hub classique et ne passe ici que des frères
   consultables.
   ============================================================ */
import { CardRenderer } from "./cardrenderer.js";
import { PinRow } from "../journal/pinrow.js";

export const CardPeek = {
  _el: null,
  _id: null,
  _siblings: [],
  _returnFocus: null,
  _view: null,

  /** Ouvre le coup d'œil sur `id`. `siblings` = ids consultables du casting,
      dans l'ordre d'affichage, pour feuilleter sans refermer (prev/next).
      `view` (optionnel, ex. "combat") pose une vue de carte sur un clone au
      rendu — le tracker s'en sert pour ouvrir directement la fiche en combat. */
  open(id, { siblings = [], view = null } = {}) {
    const ent = PnjLookup.find(id);
    if (!ent) return; // défensif : serveurs & entités non rendues filtrés en amont
    this._returnFocus = document.activeElement;
    this._view = view;
    this._siblings = siblings.length ? siblings.slice() : [id];
    this._show(id, ent);
  },

  hide() {
    if (!this._el) return;
    this._el.classList.remove("visible");
    const f = this._returnFocus;
    this._returnFocus = null;
    // On n'a jamais quitté Jouer : on rend le focus au déclencheur (a11y).
    if (f && typeof f.focus === "function") f.focus();
  },

  /** prev/next : re-rend en place la fiche voisine (boucle bornée). Ne touche
      pas `_returnFocus` — on reste dans la même ouverture d'overlay. */
  _step(delta) {
    if (this._siblings.length < 2) return;
    const i = this._siblings.indexOf(this._id);
    if (i < 0) return;
    const n = this._siblings.length;
    const next = this._siblings[(i + delta + n) % n];
    const ent = PnjLookup.find(next);
    if (ent) this._show(next, ent);
  },

  _show(id, ent) {
    this._id = id;
    const loc = PnjLookup.locate(id);
    if (loc) PinRow.noteConsulted(loc); // parité « consulté » (comme Palette.reveal)
    // Actions par type : un PJ se supprime via `remove-pj` (Characters), un
    // PNJ via `remove` (Shadows) ; un contact a son propre pied (param ignoré).
    const actions = loc && loc.type === "pj" ? ["edit", "remove-pj"] : ["edit", "remove"];

    const overlay = this._ensure();
    const body = overlay.querySelector(".card-peek-body");
    body.innerHTML = "";
    // Vue optionnelle (ex. "combat") : posée sur un CLONE — applyView écrit le
    // pli, on ne veut pas polluer la carte bibliothèque. Rendu avec les deps
    // live pour que les réserves restent lançables, comme la fiche active.
    if (this._view) {
      const clone = { ...ent, _zoneOpen: { ...ent._zoneOpen } };
      CardRenderer.applyView(clone, this._view);
      body.appendChild(CardRenderer.render(clone, actions, CardRenderer.liveDeps()));
    } else {
      body.appendChild(CardRenderer.render(ent, actions));
    }
    overlay.querySelector(".card-peek-title").textContent = ent.name || "Sans nom";

    const multi = this._siblings.length > 1;
    overlay.querySelector(".card-peek-prev").hidden = !multi;
    overlay.querySelector(".card-peek-next").hidden = !multi;

    overlay.classList.add("visible");
    overlay.querySelector(".card-peek").focus();
  },

  _ensure() {
    if (this._el) return this._el;
    const overlay = document.createElement("div");
    // Réutilise la coquille de ContentModal (backdrop + centrage + fondu) ;
    // `.card-peek-overlay` n'en surcharge que la largeur et le z-index (sous
    // le modal d'édition qu'il peut ouvrir : deux élévations, jamais trois).
    overlay.className = "content-modal-overlay card-peek-overlay";
    overlay.id = "card-peek-overlay";
    overlay.innerHTML = `
      <div class="card-peek" role="dialog" aria-modal="true" aria-label="Fiche" tabindex="-1">
        <div class="card-peek-head">
          <button type="button" class="card-peek-nav card-peek-prev" aria-label="Fiche précédente">&lsaquo;</button>
          <span class="card-peek-title"></span>
          <button type="button" class="card-peek-nav card-peek-next" aria-label="Fiche suivante">&rsaquo;</button>
          <button type="button" class="card-peek-close" aria-label="Fermer">&times;</button>
        </div>
        <div class="card-peek-body"></div>
      </div>`;
    document.body.appendChild(overlay);

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) return this.hide(); // fond
      if (e.target.closest(".card-peek-close")) return this.hide();
      if (e.target.closest(".card-peek-prev")) return this._step(-1);
      if (e.target.closest(".card-peek-next")) return this._step(1);
      // Suppression confirmée depuis la carte → la fiche devient orpheline :
      // fermer APRÈS que le retrait global (annulable) se soit exécuté.
      if (
        e.target.closest(
          '[data-action="remove-pnj"],[data-action="remove-pj"],[data-action="contact-remove"]',
        )
      )
        setTimeout(() => this.hide(), 0);
    });

    overlay.addEventListener("keydown", (e) => {
      if (e.key === "Escape") return this.hide();
      // Flèches = feuilleter, mais jamais pendant l'édition inline d'un champ
      // (contact contenteditable) — sinon on navigue au lieu de déplacer le curseur.
      if (e.target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName))
        return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        this._step(-1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        this._step(1);
      }
    });

    // Balayage tactile = accélérateur mobile pour feuilleter, qui S'AJOUTE aux
    // flèches (loi 1 « affordance sans survol » : un geste caché n'existe pas,
    // les flèches restent la voie découvrable). Trois gardes : ne réagir qu'à un
    // balayage franchement horizontal (sinon on vole le défilement vertical du
    // corps) ; ignorer un départ dans une zone à défilement horizontal interne
    // (chips, tableaux) ; laisser la sélection de texte d'un champ éditable.
    // Passif (jamais de preventDefault) → taps, scroll et zoom restent intacts ;
    // on n'agit qu'au relâchement, sur un delta clairement latéral.
    let sx = 0,
      sy = 0,
      tracking = false;
    overlay.addEventListener(
      "touchstart",
      (e) => {
        tracking = false;
        if (this._siblings.length < 2 || e.touches.length !== 1) return;
        const t = e.target;
        if (
          t.isContentEditable ||
          (t.closest && t.closest('[contenteditable="true"]')) ||
          this._inHScroll(t)
        )
          return;
        sx = e.touches[0].clientX;
        sy = e.touches[0].clientY;
        tracking = true;
      },
      { passive: true },
    );
    overlay.addEventListener(
      "touchend",
      (e) => {
        if (!tracking) return;
        tracking = false;
        const dx = e.changedTouches[0].clientX - sx;
        const dy = e.changedTouches[0].clientY - sy;
        // Franchement horizontal : amplitude ≥ 50px ET dominante latérale.
        if (Math.abs(dx) < 50 || Math.abs(dx) <= Math.abs(dy)) return;
        this._step(dx < 0 ? 1 : -1); // gauche = suivant, droite = précédent
      },
      { passive: true },
    );

    this._el = overlay;
    return overlay;
  },

  /** Vrai si `el` ou un ancêtre (jusqu'au peek) défile horizontalement : un
      balayage qui y démarre doit faire défiler cette rangée (chips, tableau),
      pas feuilleter la fiche. */
  _inHScroll(el) {
    let n = el;
    while (n && n !== this._el) {
      if (n.nodeType === 1 && n.scrollWidth > n.clientWidth + 2) {
        const ox = getComputedStyle(n).overflowX;
        if (ox === "auto" || ox === "scroll") return true;
      }
      n = n.parentElement;
    }
    return false;
  },
};
