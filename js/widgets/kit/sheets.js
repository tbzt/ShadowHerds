"use strict";

/* ============================================================
   FEUILLES DÉPLIABLES — la primitive unique du cockpit (lot A1).

   ── Pourquoi ce module existe ────────────────────────────────────────────
   Le cockpit déplie QUATRE feuilles : les états (`.status-sheet`), les actions
   (`.action-sheet`), les dégâts (`.react-damage-chips`) et les interruptions
   (`.react-interrupt-chips`). Elles ont été écrites à trois moments différents
   et ont produit DEUX disciplines qui s'ignoraient :

     · `toggleActionSheet` / `_toggleStatusSheet` fermaient tous les
       `.status-sheet` — donc actions et états s'excluaient l'un l'autre ;
     · `toggleReactDamage` / `toggleReactInterrupt` ne fermaient qu'elles-mêmes.

   Tant que la feuille d'états vivait sur la carte, les deux familles ne se
   rencontraient jamais. Le jour où le ＋ est entré dans `.react-row`
   (2026-07-29), elles ont cohabité dans la MÊME ligne : mesuré, 28 puces
   d'états et les puces de Dégâts du même PNJ ouvertes ensemble — 77 cibles
   tappables, 742px de haut. C'est l'erreur de source que le panel MJ avait
   nommée : « je ne sais plus laquelle des deux listes je regarde » (Tom).

   Ce module ferme le trou dans le système, pas seulement le bug : il n'y a
   plus qu'UNE façon de déplier quelque chose dans l'app (décision A1 n°1,
   arbitrage Estelle — cf. PLANS/DESIGN_ATTENTION_COCKPIT.md).

   ── Le contrat, en trois phrases ─────────────────────────────────────────
   1. **Une seule feuille ouverte dans tout le cockpit**, toutes familles
      confondues. Ouvrir ferme ce qui l'était.
   2. **Le repli se mémorise.** Un débit, une pose d'état, un rafraîchissement
      de scène re-rendent la surface ; la feuille que le MJ avait ouverte doit
      se retrouver ouverte. C'est le comportement que `_actionSheetOpen`
      s'était donné seul (jouer trois actions dans un tour SR6 rouvrait la
      feuille deux fois de trop) — il devient la règle commune.
   3. **Le second étage (« tous… ») se mémorise avec elle** : il appartient à
      la feuille ouverte et meurt avec elle.

   ── La limite, assumée et documentée ─────────────────────────────────────
   La mémoire est un couple (famille, id de combattant), SANS surface. Un même
   PNJ peut être rendu à plusieurs endroits (la carte du Hub et le cockpit
   rendent le même `data-status-sheet`) : après un re-rendu, ses deux copies
   rouvriront la feuille. Ce n'est pas le bug que `Utils.nearest` corrigeait —
   celui-là était un mis-tap (taper le cockpit dépliait la carte), et la
   BASCULE continue de passer par `nearest`, donc il reste corrigé. C'est un
   doublon bénin, sur deux surfaces dont une seule est à l'écran en pratique
   (le tracker est une modale qui couvre le Hub). Y répondre demanderait un
   registre de surfaces : à faire le jour où ça se voit, pas avant.
   ============================================================ */
import { Utils } from "../../core/utils.js";

export const Sheets = {
  /** Les quatre familles, par leur sélecteur et l'attribut qui porte l'id du
      combattant. `status` exclut `.action-sheet` : la feuille d'actions porte
      les DEUX classes (elle réutilise le style de la feuille d'états), et sans
      ce `:not` elle répondrait à la mauvaise clé. */
  KINDS: {
    status: { sel: ".status-sheet:not(.action-sheet)", attr: "data-status-sheet" },
    action: { sel: ".action-sheet", attr: "data-action-sheet" },
    damage: { sel: ".react-damage-chips", attr: "data-damage-for" },
    interrupt: { sel: ".react-interrupt-chips", attr: "data-interrupt-for" },
  },

  /** Tous les déclencheurs, pour remettre leur `aria-expanded` à false d'un
      seul geste — l'ARIA est la source de vérité du glyphe ＋/− (`.toggle-glyph`),
      un déclencheur qui garde son « − » après fermeture ment à l'œil. */
  TRIGGERS:
    '[data-action="status-sheet"], [data-action="action-sheet"],' +
    '[data-action="react-damage-toggle"], [data-action="react-interrupt-toggle"]',

  /** La SEULE feuille ouverte du cockpit : `{ kind, id }`, ou null. État de
      VUE — il vit ici, jamais dans `Encounter.state` ni dans le Storage. */
  _open: null,
  /** Le second étage de cette feuille-là (« tous… »). */
  _rest: false,

  /** La feuille (kind, id) est-elle celle qui est ouverte ? Lu par les rendus
      pour émettre `hidden` ou non — c'est par là que la mémoire se restitue. */
  isOpen(kind, id) {
    return !!this._open && this._open.kind === kind && this._open.id === id;
  },

  /** ` hidden` ou chaîne vide, à interpoler directement dans le balisage. */
  hiddenAttr(kind, id) {
    return this.isOpen(kind, id) ? "" : " hidden";
  },

  /** Le « tous… » de cette feuille est-il déplié ? Faux dès qu'une AUTRE
      feuille est ouverte : le second étage n'existe pas sans le premier. */
  isRestOpen(kind, id) {
    return this.isOpen(kind, id) && this._rest;
  },

  /** Bascule (kind, id) : ferme tout, ouvre si elle était fermée. Renvoie
      l'état obtenu, pour l'appelant qui a une marque à poser en plus (le
      `.is-open` du bouton Dégâts).

      Le noeud se cherche AUTOUR DU BOUTON (`Utils.nearest`) et non dans tout
      le document : le cockpit et la carte de bibliothèque rendent le même PNJ,
      donc le même attribut. Un `document.querySelector` dépliait la première
      du DOM — celle de la carte — pendant que le MJ tapait celle du cockpit. */
  toggle(kind, id, btn, opts = {}) {
    const spec = this.KINDS[kind];
    if (!spec || id == null) return false;
    const esc = window.CSS && CSS.escape ? CSS.escape(String(id)) : id;
    const sel = `${spec.sel}[${spec.attr}="${esc}"]`;
    const sheet = (btn && Utils.nearest(btn, sel)) || document.querySelector(sel);
    if (!sheet) return false;
    const ouvrir = opts.close ? false : sheet.hidden;
    this.closeAll();
    if (ouvrir) {
      sheet.hidden = false;
      this._open = { kind, id };
      if (btn) btn.setAttribute("aria-expanded", "true");
    }
    return ouvrir;
  },

  /** Ferme les quatre familles, partout, et oublie. Le seul endroit du code
      qui connaisse la liste — ajouter une 5ᵉ feuille un jour, c'est ajouter
      une ligne à `KINDS`, pas une discipline de plus. */
  closeAll() {
    for (const k of Object.keys(this.KINDS))
      document.querySelectorAll(this.KINDS[k].sel).forEach((s) => (s.hidden = true));
    document.querySelectorAll(this.TRIGGERS).forEach((b) => b.setAttribute("aria-expanded", "false"));
    // La marque du bouton Dégâts n'est pas un `aria-expanded` (le bouton porte
    // un libellé, pas un glyphe ＋/−) : elle se retire ici, avec le reste.
    document.querySelectorAll(".react-damage-btn.is-open").forEach((b) => b.classList.remove("is-open"));
    this._open = null;
    this._rest = false;
  },

  /** Déplie/replie le second étage de la feuille ouverte (« tous… »).
      `restSel` = la classe du conteneur, qui diffère selon la famille
      (`.status-rest` / `.action-rest`) — c'est la seule chose que les deux
      étages ne partagent pas. */
  toggleRest(btn, restSel) {
    const rest = btn && btn.parentElement && btn.parentElement.querySelector(restSel);
    if (!rest) return false;
    rest.hidden = !rest.hidden;
    btn.setAttribute("aria-expanded", String(!rest.hidden));
    this._rest = !rest.hidden;
    return this._rest;
  },
};

// Pont couche 4 (migration modules ES) — retiré en fin de migration.
window.Sheets = Sheets;
