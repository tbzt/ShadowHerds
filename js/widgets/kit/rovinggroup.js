"use strict";

/* ============================================================
   ROVING GROUP — un groupe de contrôles répétés qui ne coûte
   qu'UN arrêt de tabulation.

   LE PROBLÈME. Une grille de contrôles identiques — jetons
   d'action, cases de moniteur — doit être atteignable au
   clavier. La solution naïve, `tabindex="0"` sur chacun, est
   pire que le mal : 85 cases de moniteur donneraient 85 arrêts
   de tabulation, et traverser une fiche deviendrait un
   supplice. Le motif correct (WAI-ARIA « roving tabindex »)
   donne au groupe UN seul arrêt, et navigue aux flèches à
   l'intérieur.

   CE QUE CE MODULE N'EST PAS. Le kit contient déjà des listes
   navigables au clavier (`singleselect`, `multiselect`), mais
   elles suivent un AUTRE motif : leur arrêt de tabulation est
   fixe, posé sur le contrôle (`.ss-control`), et les options
   restent en `tabindex="-1"` dans une liste transitoire qu'on
   ouvre puis referme. Rien n'y roule — vérifié, aucun
   `setAttribute("tabindex")` dans tout le kit. Cousines, pas
   jumelles : les fondre ici forcerait un transfert dont elles
   n'ont pas l'usage.

   FEUILLE, sans dépendance sortante : reçoit des nœuds, rend
   des booléens, ne connaît ni l'application ni ses données.
   ============================================================ */

export const RovingGroup = {
  /** Index du membre qui porte le tab stop AU RENDU. À appeler depuis le
      gabarit. `active` = l'endroit où l'utilisateur va probablement agir
      (premier non consommé, par exemple) ; borné à la taille du groupe pour
      qu'un groupe entièrement consommé garde quand même son arrêt. */
  tabIndexAt(i, active, total) {
    return i === Math.max(0, Math.min(active, total - 1)) ? 0 : -1;
  },

  /** Les membres du groupe auquel `el` appartient, dans l'ordre du DOM. */
  members(el, { container, selector }) {
    const root = container ? el.closest(container) : el.parentElement;
    return root ? [...root.querySelectorAll(selector)] : [el];
  },

  /** Pose le tab stop sur `el` et le retire à ses frères, puis lui donne le
      focus. C'est l'opération dont TOUT dépend : sans le retrait, le groupe
      finit avec deux arrêts et l'invariant tombe — piège mesuré lors du
      premier câblage (AUD-3), où le rendu avait replacé son propre tab stop
      pendant que le rattrapage posait le sien. */
  arm(el, opts) {
    if (!el) return false;
    for (const m of this.members(el, opts)) m.setAttribute("tabindex", m === el ? "0" : "-1");
    el.focus();
    return true;
  },

  /** Rend le focus à un membre APRÈS un re-rendu qui l'a détruit. Le nœud
      focalisé n'existe plus : on retrouve son jumeau frais par sélecteur, et on
      ré-arme le groupe autour de lui. Sans ça, le clavier perd sa place à
      chaque activation — le défaut le plus sûr pour faire abandonner qui s'en
      sert. Renvoie false si le jumeau a disparu pour de bon. */
  refocus(selector, opts) {
    return this.arm(document.querySelector(selector), opts);
  },

  /** Traite une touche de navigation. Renvoie `true` si elle a été CONSOMMÉE —
      à l'appelant de faire alors `preventDefault()` et d'arrêter la
      propagation, car ces touches ont presque toujours un autre sens plus haut
      (dans le tracker, ↑ ↓ déplacent le combattant actif et Espace passe au
      tour suivant).

      `orientation` décide des flèches lues : "horizontal" (← →) pour une
      rangée, "vertical" (↑ ↓) pour une colonne, "both" pour les quatre. Ne
      JAMAIS prendre les quatre par défaut : une flèche non consommée ici doit
      pouvoir servir ailleurs. Home/End sont toujours lues. */
  key(key, el, opts = {}) {
    const { orientation = "horizontal" } = opts;
    const suivant = orientation !== "vertical" ? "ArrowRight" : "ArrowDown";
    const precedent = orientation !== "vertical" ? "ArrowLeft" : "ArrowUp";
    const aussi = orientation === "both";
    const list = this.members(el, opts);
    const i = list.indexOf(el);
    if (i < 0) return false;
    let cible = null;
    if (key === suivant || (aussi && key === "ArrowDown")) cible = list[Math.min(i + 1, list.length - 1)];
    else if (key === precedent || (aussi && key === "ArrowUp")) cible = list[Math.max(i - 1, 0)];
    else if (key === "Home") cible = list[0];
    else if (key === "End") cible = list[list.length - 1];
    if (!cible || cible === el) return !!cible;
    return this.arm(cible, opts);
  },
};
