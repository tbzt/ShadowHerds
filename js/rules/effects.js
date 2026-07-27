"use strict";

/* ============================================================
   EFFETS — la transition ORDONNÉE, extraite de `Drugs` (lot E1).

   Un effet porté par un PNJ (drogue en cours, état de combat) se pose et se
   retire par des `apply`/`revert` symétriques. La partie difficile n'est pas
   d'appliquer : c'est de RETIRER sans résidu quand l'effet touche un attribut
   dérivé, parce que `recalc()` de l'édition recuit Limites/Défense/moniteurs
   à partir de `pnj.attrs`. Poser puis recalculer dans le mauvais ordre écrase
   silencieusement un delta manuel (le cas d'école : `initBase` du contrecoup
   du Jazz, qui n'est pas dérivé d'un attribut).

   L'ordre juste, découvert et payé par `drugs.js` :
     revert(précédent) → recalc → apply(suivant) → recalc

   Ce module ne fait QUE ça. Il ne connaît ni les drogues, ni les états, ni
   leur catalogue : il reçoit deux « phases » (des objets qui savent s'appliquer
   et se retirer) et les enchaîne. `Drugs` et `Statuses` s'appuient dessus —
   une seule machine, comme l'exige le garde-fou (c) « une capacité = un seul
   concept, pas un doublon ».
   ============================================================ */

export const Effects = {
  /** Recalcul dérivé de l'édition (Limites/Défense/moniteurs à partir des
      attributs). No-op si l'édition n'expose pas `recalc`. */
  recalc(edition, pnj) {
    const mod = App.getEditionModule(edition);
    if (mod && typeof mod.recalc === "function") mod.recalc(pnj);
  },

  /** Passe un PNJ de la phase `prev` à la phase `next`, dans l'ordre qui ne
      laisse pas de résidu. Une phase est `{ apply?, revert?, recalc? }` ou
      `null` (= rien à faire de ce côté). `arg` est passé aux deux callbacks :
      c'est par lui qu'un état à niveaux dit QUEL niveau il pose ou retire.

      Symétrie non négociable : `revert` doit défaire exactement ce qu'`apply`
      a fait, avec le MÊME `arg` que celui qui l'a posé — sinon la transition
      est cumulative et le PNJ dérive. C'est à l'appelant de conserver l'arg
      de pose (cf. Statuses, qui relit le niveau courant avant de le changer). */
  transition(pnj, edition, prev, next, prevArg, nextArg) {
    if (!pnj) return;
    if (prev && prev.revert) prev.revert(pnj, prevArg);
    if (prev && prev.recalc) this.recalc(edition, pnj);
    if (next && next.apply) next.apply(pnj, nextArg);
    if (next && next.recalc) this.recalc(edition, pnj);
  },
};
