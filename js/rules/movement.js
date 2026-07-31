"use strict";

/* ============================================================
   MOUVEMENT À PIED — marche, course, sprint (lot P7).

   Miroir de `chase.js` : ce fichier ne connaît AUCUNE édition. Il reçoit le
   régime par `Movement.use(edition)` → `movementModel` du module d'édition
   (prohibition n°1 : la règle vit dans l'édition). Il ne touche ni au DOM,
   ni au Storage : il calcule sur une fiche qu'on lui passe.

   ── Pourquoi le contrat est une LISTE de paliers, et pas trois champs ──
   Le premier réflexe était `{ marche, course, sprint }`. Il est faux, et il
   l'est dès la deuxième édition :

     · **SR5** (p. 163-164) donne bien trois paliers — marche (AGI × 2),
       course (AGI × 4) et un sprint qui AUGMENTE la course d'un gain par
       succès. Ce gain dépend du métatype, et c'est la seule chose que la
       table fasse varier : +1 m pour les nains et les trolls, +2 m pour les
       elfes, les humains et les orks.
     · **SR6** (p. 48) n'en donne que DEUX, et aucun n'est dérivé d'un
       attribut : « Se déplacer » (action mineure) vaut 10 mètres, « Sprinter »
       (action majeure) en vaut 15, plus 1 mètre par succès. Pas de palier
       intermédiaire, pas de métatype, pas d'Agilité. Il n'y a pas de « course »
       à remplir en SR6, et en inventer une serait mentir.
     · **Anarchy 1 & 2** ne comptent pas en mètres du tout : ils comptent en
       PORTÉES, et changer de portée coûte des Narrations. `movementModel`
       y vaut `null`, et les surfaces le disent au lieu d'afficher un chiffre.

   D'où `steps: [{ key, label, value, note }]` : chaque édition déclare les
   paliers qu'elle a, avec leurs noms à elle. Le rendu compte ce qu'on lui
   donne, il ne cherche jamais un palier par son nom.

   ── La ligne rouge, la même que la piste ──
   Quand l'app ne tient pas une valeur du livre, `rates` renvoie `null` et la
   surface écrit « — ». Aucune dérivation inventée pour boucher un trou.
   ============================================================ */
import { Metavariants } from "./metavariants.js";

export const Movement = {
  /* ---- Le régime de l'édition ---- */
  use(edition) {
    const mod = typeof App !== "undefined" ? App.getEditionModule(edition) : null;
    return (mod && mod.movementModel) || null;
  },
  supports(edition) {
    return !!this.use(edition);
  },
  _edition(pnj, edition) {
    return edition || (pnj && pnj.edition) || (typeof App !== "undefined" ? App.edition : null);
  },

  /** Le déplacement RACIAL, quand la forme du personnage en a un propre —
      un centaure ne court pas comme un humain, et le livre le chiffre.

      Il vit sur l'entrée de métavariante (champ `move`), à côté du trait qui
      l'écrit en clair : le texte est ce que le lecteur lit, le champ est ce
      avec quoi l'app calcule. `null` pour un métatype de base, et `null` en
      SR6 et Anarchy — leurs tables de métavariantes ne chiffrent aucun
      déplacement, et on ne leur en prête pas un. */
  racial(pnj, edition) {
    if (typeof Metavariants === "undefined" || !pnj || !pnj.meta) return null;
    const ed = this._edition(pnj, edition);
    const r = Metavariants.use(ed).resolve(pnj.meta);
    return (r && r.move) || null;
  },

  /** La souche (« Troll » pour un Cyclope) : c'est elle que porte la table de
      l'édition, la métavariante ne fait que la remplacer quand elle chiffre
      sa propre forme. */
  baseMeta(pnj, edition) {
    if (!pnj) return null;
    return typeof Metavariants !== "undefined"
      ? Metavariants.use(this._edition(pnj, edition)).baseMetatype(pnj.meta)
      : pnj.meta;
  },

  /** Les vitesses de ce personnage → `{ unit, steps, sprint, note, capped }`,
      ou `null` quand l'édition ne compte pas en mètres (Anarchy) ou que la
      fiche ne porte pas de quoi les dériver.

      `statuses` est la liste des clés d'état posées sur le combattant : un
      état qui FIXE ou PLAFONNE une vitesse l'emporte en dernier (SR6 Fatigué
      « Vitesse : 5 m (marche), 10 m (sprint) », Entravé « divisée par 2 »).
      Ils viennent de la scène, donc de l'appelant — une couche 2 ne remonte
      pas chercher l'état d'une rencontre. */
  rates(pnj, { edition, statuses } = {}) {
    const ed = this._edition(pnj, edition);
    const m = this.use(ed);
    if (!m || !m.rates || !pnj) return null;
    const base = m.rates(pnj, { racial: this.racial(pnj, ed), baseMeta: this.baseMeta(pnj, ed) });
    if (!base || !base.steps || !base.steps.length) return null;
    return (m.statusRates && m.statusRates(base, statuses || [])) || base;
  },

  /** Le test de sprint → `{ pool, label, action, maxTests, perHit }`, ou
      `null` quand la fiche ne porte pas la compétence (le joueur annonce,
      l'app ne fabrique pas une réserve — doctrine de l'initiative, lot B3.5). */
  sprintSpec(pnj, { edition } = {}) {
    const m = this.use(this._edition(pnj, edition));
    return m && m.sprintSpec && pnj ? m.sprintSpec(pnj) || null : null;
  },

  /** Cet état parle-t-il de déplacement ? La liste est DÉCLARÉE par l'édition
      (`movementModel.statusKeys`), jamais devinée ici : SR5 pose « En course »
      dès qu'on dépasse sa vitesse de marche, SR6 plafonne avec Fatigué et
      Entravé. Sert aux surfaces qui veulent joindre la vitesse à l'état —
      « En course » sans dire de combien ne renseigne personne. */
  touchesMovement(edition, key) {
    const m = this.use(edition);
    return !!(m && (m.statusKeys || []).includes(key));
  },

  /** Ce que l'édition dit du déplacement quand elle ne le chiffre PAS
      (Anarchy : des portées et des Narrations, pas des mètres). La surface
      écrit cette phrase à la place d'un nombre — c'est un vide assumé, pas un
      trou de données. */
  narrativeNote(edition) {
    const m = this.use(edition);
    return m && m.narrative ? m.note || "" : "";
  },

  /** Le falcin marche en ×0,5 d'Agilité : la seule décimale du corpus, et
      elle s'écrit à la française — l'app est en français, et le trait qui la
      décrit l'écrit déjà « +0,5 ». */
  num(v) {
    return String(v).replace(".", ",");
  },

  /** « 10 / 20 m · +2/succès ». Mise en forme UNIQUE : la piste, la fiche et
      le tracker disent exactement la même chose, au caractère près. */
  label(rates) {
    if (!rates || !rates.steps || !rates.steps.length) return "";
    const chiffres = rates.steps.map((s) => this.num(s.value)).join(" / ");
    const gain = rates.sprint ? ` · +${this.num(rates.sprint.perHit)}/succès` : "";
    return `${chiffres} ${rates.unit || "m"}${gain}`;
  },

  /** « 10 / 20 m » — les paliers seuls, pour une pastille où le gain de
      sprint tiendrait mal. Il reste dans l'infobulle (`detail`). */
  short(rates) {
    if (!rates || !rates.steps || !rates.steps.length) return "";
    return `${rates.steps.map((s) => this.num(s.value)).join(" / ")} ${rates.unit || "m"}`;
  },

  /** La même chose en long, pour une infobulle : chaque palier nommé, avec ce
      qu'il coûte quand l'édition le dit (« action mineure », « action
      complexe »). */
  detail(rates) {
    if (!rates) return "";
    const lignes = rates.steps.map(
      (s) => `${s.label} ${this.num(s.value)} ${rates.unit || "m"}${s.note ? ` (${s.note})` : ""}`,
    );
    if (rates.sprint) lignes.push(rates.sprint.label);
    if (rates.alt)
      lignes.push(
        `${rates.alt.mode} : ${rates.alt.steps.map((s) => this.num(s.value)).join(" / ")} ${rates.unit || "m"} · +${this.num(rates.alt.perHit)}/succès`,
      );
    if (rates.note) lignes.push(rates.note);
    return lignes.join("\n");
  },
};

// Pont couche 2 (migration modules ES) — retiré en fin de migration.
window.Movement = Movement;
