"use strict";

/* ============================================================
   SERVER GEN — données + génération de serveurs & CI.

   Domaine serveur, brique « données » : fabrication d'un objet
   serveur (profil, indice, attributs ASDF, liste de CI, sculpture,
   spider lié) à partir d'options déjà résolues. Ne touche ni au DOM
   du panneau (→ Servers.createFromForm lit le formulaire) ni à la
   persistance (→ Servers, socle Collection). Miroir de ContactGen
   pour le domaine serveur.

   Les catalogues (profils, CI, sculptures, noms) par édition vivent
   dans js/rules/matrix.js (Matrix.use(edition)) ; ce module ne fait
   que les assembler selon la règle de génération.
   ============================================================ */
import { Matrix } from "../rules/matrix.js";
import { Utils } from "../core/utils.js";

export const ServerGen = {
  /** Répartit les 4 attributs matriciels (ASDF) sur la plage
      indice…indice+3, dans un ordre aléatoire. L'appelant décide si
      l'édition courante a des attributs (Mod.matrixModel.hasAttrs). */
  rollAttrs(indice) {
    const vals = [indice, indice + 1, indice + 2, indice + 3].sort(
      () => Math.random() - 0.5,
    );
    return Object.fromEntries(Matrix.ATTR_KEYS.map((ak, i) => [ak.key, vals[i]]));
  },

  /** Options de génération du spider (decker de sécurité lié) dérivées
      du serveur : archétype et rating suivent l'indice. */
  _spiderOpts(srv) {
    const Mod = App.getEditionModule(srv.edition);
    const opts = {
      meta: "Aléatoire",
      gender: "Aléatoire",
      archetype: Mod.spiderArchetype(srv.indice),
      tier: "Aléatoire",
      special: Mod.spiderSpecial,
    };
    // Rating du spider dérivé de l'indice serveur (SR5/SR6 uniquement :
    // Anarchy n'a pas de champ de rating numérique, cf. ratingBadge).
    if (Mod.ratingBadge.field !== "tier") {
      opts[Mod.ratingBadge.field] = String(Utils.clamp(Math.ceil(srv.indice / 2), 2, 6));
    }
    return opts;
  },

  /** Fabrique un spider (PNJ) en poste sur le serveur donné. */
  makeSpider(srv) {
    const Mod = App.getEditionModule(srv.edition);
    if (!Mod || !Mod.generate) return null;
    const pnj = Mod.generate(this._spiderOpts(srv));
    pnj.archetype = `Spider — ${pnj.archetype}`;
    pnj.ownerName = srv.name;
    return pnj;
  },

  /** Construit un objet serveur complet à partir d'options déjà lues
      du formulaire (aucun accès DOM ici). Options :
        profileId  : id d'un profil, ou "random"
        indiceSel  : "auto" (dérivé du profil) ou un indice numérique
        secPhys    : applique le bonus de sécurité physique de l'édition
        icChoices  : CI cochées manuellement ([] → tirage automatique)
        name       : nom saisi ("" → nom d'ambiance selon la gamme)
        withSpider : joint un spider de sécurité */
  generate(edition, opts = {}) {
    const profiles = Matrix.use(edition).profiles();
    const profile =
      opts.profileId && opts.profileId !== "random"
        ? profiles.find((p) => p.id === opts.profileId) || Utils.rand(profiles)
        : Utils.rand(profiles);

    let indice;
    if (opts.indiceSel == null || opts.indiceSel === "auto") {
      indice =
        profile.indice != null ? profile.indice : Utils.randInt(profile.min, profile.max);
    } else {
      indice = parseInt(opts.indiceSel, 10);
    }

    const Mod = App.getEditionModule(edition);
    const secPhys = !!opts.secPhys && !!(Mod && Mod.secPhysBonus);
    if (secPhys) indice += Mod.secPhysBonus;

    // Attributs ASDF (SR5/SR6) : indice à indice+3 répartis au hasard.
    const attrs = Mod?.matrixModel?.hasAttrs ? this.rollAttrs(indice) : null;

    // Liste des CI : sélection manuelle si des cases sont cochées, sinon auto.
    const checked = opts.icChoices || [];
    const icList = checked.length
      ? ["patrouilleuse", ...checked.filter((k) => k !== "patrouilleuse")]
      : Matrix.use(edition).pickICs(indice, profile.sev);

    const name = (opts.name || "").trim() || Matrix.makeName(profile.sev);

    const srv = {
      id: Utils.uid(),
      edition,
      name,
      profile: profile.label,
      indice,
      sev: profile.sev,
      secPhys,
      attrs,
      icList,
      sculpture: Matrix.pickSculpture(profile.sev),
      spider: null,
      notes: "",
      // Plus d'`intrusion` ici — le serveur est une pure définition,
      // l'état vivant vit scène-scopé (Encounter.state.matrix), créé à
      // la volée par Intrusion._state.
    };

    if (opts.withSpider) srv.spider = this.makeSpider(srv);
    return srv;
  },
};

// Pont couche 5 (migration modules ES) — retiré en fin de migration.
window.ServerGen = ServerGen;
