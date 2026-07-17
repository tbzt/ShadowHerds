"use strict";

/* ============================================================
   PRINT SHEET — contrôleur NEUTRE (aucune logique d'édition)

   Imprime les fiches PNJ/PJ du DOSSIER Hub courant, chacune rendue
   FIDÈLE à la feuille de son édition. Miroir de FoundryExport : ce
   contrôleur orchestre (collecte les fiches de la sélection, peuple
   #print-root, déclenche window.print) ; le savoir « à quoi ressemble
   une fiche SR5/SR6/Anarchy » vit dans les modules d'édition, exposé
   via App.editionModule.printSheet(pnj) (js/editions/*.print.js).
   Aucune branche App.edition ici (prohibition #1).
   ============================================================ */
import { DossierBar } from "../widgets/dossierbar.js";

export const PrintSheet = {
  _root() {
    return document.getElementById("print-root");
  },

  /** Fiches imprimables de la sélection DossierBar courante : PNJ (Shadows)
      et PJ (Characters), hors entités liées (drones/esprits suivent leur
      maître, pas de fiche propre). */
  _entities() {
    const out = [];
    for (const col of [Shadows, Characters]) {
      if (typeof col === "undefined") continue;
      const byId = new Map(col.data.all.map((e) => [e.id, e]));
      for (const id of DossierBar.memberIds(col)) {
        const e = byId.get(id);
        if (e && !e.ownerId) out.push(e);
      }
    }
    return out;
  },

  /** Enveloppe la fiche d'une édition (ou un repli neutre) dans l'article
      porteur de la classe de palette (.psheet-<edition>). */
  _sheetFor(pnj) {
    const mod = App.getEditionModule(pnj.edition);
    const inner =
      mod && typeof mod.printSheet === "function"
        ? mod.printSheet(pnj)
        : this._fallback(pnj);
    return `<article class="psheet psheet-${pnj.edition}" data-edition="${pnj.edition}">${inner}</article>`;
  },

  /** Repli minimal pour une édition sans feuille dédiée (jamais vide). */
  _fallback(pnj) {
    return `<div class="psheet-titlebar"><h2 class="psheet-name">${CardRenderer._esc(pnj.name || "Sans nom")}</h2></div>`;
  },

  /** Construit le document d'impression et lance l'impression navigateur. */
  print() {
    const root = this._root();
    if (!root) return;
    const ents = this._entities();
    if (!ents.length) {
      toast("Aucune fiche à imprimer dans cette sélection.", "info");
      return;
    }
    root.innerHTML = ents.map((e) => this._sheetFor(e)).join("");
    window.print();
  },

  /** Aperçu à l'écran (vérification) : peuple #print-root et le rend visible
      via la classe .print-preview, sans déclencher l'impression. */
  preview(on = true) {
    const root = this._root();
    if (!root) return;
    if (on) root.innerHTML = this._entities().map((e) => this._sheetFor(e)).join("");
    document.documentElement.classList.toggle("print-preview", on);
  },
};

// Pont couche 5 (migration modules ES) — retiré en fin de migration.
window.PrintSheet = PrintSheet;
