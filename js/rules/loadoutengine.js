"use strict";

/* ============================================================
   LOADOUT ENGINE — tirage d'équipement data-driven, cohérent avec
   les règles (rareté + affinité), neutre vis-à-vis de l'édition.

   PROBLÈME RÉSOLU. Aujourd'hui `buildLoadout` (sr5.js / sr6.js) cadre
   la *catégorie* d'un slot par le professionnalisme, puis tire un item
   au hasard UNIFORME dans la catégorie. Un catalogue élargi n'ajoute
   donc que du bruit : un grouille peut tirer une arme de guerre, et la
   rareté d'un item est invisible. Ce moteur remplace ce tirage par un
   tirage PONDÉRÉ sur deux axes orthogonaux, portés comme métadonnée :

     • RARETÉ (`tier`) — le *gate*. 4 crans adossés aux bandes de
       Disponibilité SR : courant / pro / militaire / blackops. Le
       professionnalisme (proRating) ne pose PAS un plafond dur : il
       pondère les crans (chevauchement doux → le PNJ-surprise crédible).

     • AFFINITÉ (`tags`) — le *biais qui signe le PNJ*. Tags de rôle
       (Coherence.ROLES), de milieu (Coherence.MILIEUX) et de forme
       d'arme. Un decker tire un deck au palier, un flic une
       électromatraque, un adepte un katana. Généralise `augsBySpecial`
       (SR5) et remplace les listes `archetype.includes(...)` en dur.

   NEUTRE PAR CONSTRUCTION. Le moteur ne connaît AUCUNE édition : il
   consomme un `equipPools` et un `profile` que le module d'édition lui
   passe (prohibition #1). Chaque édition possède SES clés et SES poids.

   SIDECAR, PAS DE RÉÉCRITURE. La métadonnée (tier/tags) vit dans le
   `profile`, keyée par catégorie (+ overrides par sous-chaîne d'item) —
   les chaînes de `equipPools` restent INCHANGÉES, et les PNJ persistés
   ne changent pas de forme (contrainte Failsafe).

   DÉGRADATION GRACIEUSE (garantie d'iso-comportement). Tant qu'un
   `profile` ne fournit pas une table (poids de tier, affinité…), la
   fonction correspondante renvoie un poids neutre (1). Un `profile`
   vide ⇒ tous poids = 1 ⇒ `weightedPick` == tirage uniforme actuel
   (`Utils.rand`). Aucune sortie de génération ne change tant qu'un profil
   d'édition n'a pas été autoré.

   ------------------------------------------------------------
   CONTRAT — forme d'un `profile` d'édition (tout est optionnel ;
   l'absence d'une table = neutre). Autoré par édition (SR5, SR6…).

   profile = {
     // proRating → clé de tranche (pour choisir la ligne de poids).
     // Tableau de seuils [maxProRating, bucketKey] testés dans l'ordre.
     proRatingBuckets: [[1,"grouille"], [2,"amateur"], [4,"pro"],
                        [5,"vet"], [Infinity,"elite"]],

     // Matrice de rareté (D2) : bucket → poids relatif par tier.
     tierWeights: {
       grouille: { courant:85, pro:15, militaire:0,  blackops:0 },
       pro:      { courant:25, pro:55, militaire:18, blackops:2 },
       elite:    { courant:5,  pro:25, militaire:50, blackops:20 },
       // …
     },

     // Rareté : défaut par catégorie (+ overrides d'outliers par
     // sous-chaîne de l'item, ex. "Fusil Gauss" → "blackops").
     tierByCat:  { pistoletsLegers:"courant", fusilsAssaut:"pro",
                   snipers:"militaire" },
     tierByItem: { "Fusil Gauss":"blackops", "Ares Redline":"blackops" },

     // Affinité : tags par catégorie (+ overrides par sous-chaîne).
     tagsByCat:  { electroarmes:["police","securite_corpo","nonlethal"],
                   cyberdecks:["decker"], meleeWeapons:["adepte","gang"] },
     tagsByItem: { "Katana":["adepte","combattant","gang"] },

     // Poids d'affinité : pour un tag de rôle/milieu porté par le PNJ,
     // quels tags/catégories d'item favoriser (× le poids). Absent = 1.
     affinity: {
       decker: { tags:{ decker:6, matrice:4 } },
       police: { tags:{ police:5, nonlethal:3 }, cats:{ electroarmes:4 } },
       // …
     },

     // Slots à remplir, dans l'ordre. Le moteur remplace le *comment on
     // remplit un slot*, pas *quels slots existent*.
     slots: [
       { name:"primaryWeapon", cats:["pistoletsLourds","mitraillettes",
         "fusilsAssaut","snipers"], count:1 },
       { name:"focus", cats:["fociCaster"], count:1,
         when:(ctx)=>ctx.awakened === "caster" },
       // …
     ],
   }
   ============================================================ */
const LoadoutEngine = {
  /* ---- Vocabulaire canonique (D1 + D5) ---- */

  /** Les 4 crans de rareté, du plus courant au plus rare (ordre = échelle
      de Disponibilité SR : ≤6 / 7-11 / 12-17 / 18+ ou prototype). */
  TIERS: ["courant", "pro", "militaire", "blackops"],

  /** Tags d'affinité — 24 clés. Rôles + milieux = clés canoniques de
      `Coherence.ROLES` / `Coherence.MILIEUX` (déjà portées par chaque PNJ
      via `role`/`milieu`) ; formes = ce que le rôle seul ne capture pas. */
  ROLE_TAGS: ["combattant", "mage", "chamane", "adepte", "decker", "rigger",
              "technicien", "social", "infiltrateur", "civil"],
  MILIEU_TAGS: ["rue", "gang", "crime", "securite_corpo", "police",
                "militaire", "corpo", "ombres"],
  FORM_TAGS: ["sniper", "heavy", "holdout", "nonlethal", "magical", "stealth"],

  /** Ensemble de tous les tags reconnus (validation/documentation). */
  get ALL_TAGS() {
    return [...this.ROLE_TAGS, ...this.MILIEU_TAGS, ...this.FORM_TAGS];
  },

  /* ---- Résolution de métadonnée (sidecar `profile`, items tolérants) ----
     Un item peut être une chaîne legacy ou l'objet polymorphe
     ({str, cat, rating}) ; on lit via ItemResolver. La catégorie de
     tirage (`cat`) est fournie par le slot, l'override par sous-chaîne
     l'emporte sur le défaut de catégorie. */

  /** Tier d'un item : override par sous-chaîne (`tierByItem`) sinon défaut
      de sa catégorie (`tierByCat`) sinon "courant" (neutre = le plus
      accessible, ne restreint personne tant que non autoré). */
  itemTier(item, cat, profile) {
    const str = ItemResolver.itemStr(item);
    const byItem = profile && profile.tierByItem;
    if (byItem) {
      for (const key of Object.keys(byItem)) {
        if (str.includes(key)) return byItem[key];
      }
    }
    const byCat = profile && profile.tierByCat;
    if (byCat && cat && byCat[cat]) return byCat[cat];
    return "courant";
  },

  /** Tags d'un item : union des tags de sa catégorie (`tagsByCat`) et des
      overrides par sous-chaîne (`tagsByItem`). [] si rien d'autoré. */
  itemTags(item, cat, profile) {
    if (!profile) return [];
    const out = new Set();
    const byCat = profile.tagsByCat;
    if (byCat && cat && Array.isArray(byCat[cat])) byCat[cat].forEach((t) => out.add(t));
    const byItem = profile.tagsByItem;
    if (byItem) {
      const str = ItemResolver.itemStr(item);
      for (const key of Object.keys(byItem)) {
        if (str.includes(key)) byItem[key].forEach((t) => out.add(t));
      }
    }
    return [...out];
  },

  /* ---- Axe 1 : poids de rareté selon le professionnalisme ---- */

  /** Tranche de proRating (ligne de la matrice `tierWeights`). Renvoie
      null si le profil n'a pas de tranches → poids neutre en aval. */
  _bucket(proRating, profile) {
    const buckets = profile && profile.proRatingBuckets;
    if (!Array.isArray(buckets)) return null;
    for (const [max, key] of buckets) {
      if (proRating <= max) return key;
    }
    return buckets.length ? buckets[buckets.length - 1][1] : null;
  },

  /** Poids de tirage d'un tier pour un proRating donné (chevauchement doux,
      D2). 1 (neutre) si la matrice n'est pas autorée → uniforme. */
  tierWeight(proRating, tier, profile) {
    const bucket = this._bucket(proRating, profile);
    const row = bucket && profile.tierWeights && profile.tierWeights[bucket];
    if (!row) return 1;
    const w = row[tier];
    return typeof w === "number" ? w : 0;
  },

  /* ---- Axe 2 : multiplicateur d'affinité rôle/milieu ---- */

  /** Multiplicateur d'affinité d'un item pour le PNJ courant : produit des
      poids déclarés (`profile.affinity`) pour le rôle ET le milieu du PNJ,
      via les tags de l'item et sa catégorie. 1 (neutre) si rien ne matche
      ou si l'affinité n'est pas autorée. */
  affinityMultiplier(item, cat, ctx, profile) {
    const aff = profile && profile.affinity;
    if (!aff || !ctx) return 1;
    const tags = this.itemTags(item, cat, profile);
    let mult = 1;
    for (const key of [ctx.role, ctx.milieu]) {
      const rule = key && aff[key];
      if (!rule) continue;
      if (rule.tags) {
        for (const t of tags) if (rule.tags[t]) mult *= rule.tags[t];
      }
      if (rule.cats && cat && rule.cats[cat]) mult *= rule.cats[cat];
    }
    return mult;
  },

  /** Poids total d'un candidat = rareté × affinité (toujours ≥ 0). Un item
      à poids 0 (tier interdit à ce proRating) est exclu du tirage. */
  weight(item, cat, ctx, profile) {
    const tier = this.itemTier(item, cat, profile);
    const tw = this.tierWeight(ctx ? ctx.proRating : 0, tier, profile);
    if (tw <= 0) return 0;
    return tw * this.affinityMultiplier(item, cat, ctx, profile);
  },

  /* ---- Tirage pondéré ---- */

  /** Rassemble les candidats d'un ou plusieurs pools en `[{item, cat}]`.
      Aplati les pools sous-bucketés (bas/moyen/haut/elite) via ItemResolver
      — la rareté remplace ces sous-buckets, un même pool à plat suffit. */
  gatherCandidates(equipPools, cats) {
    const out = [];
    (cats || []).forEach((cat) => {
      const flat = ItemResolver._flatPool(equipPools[cat]);
      flat.forEach((item) => out.push({ item, cat }));
    });
    return out;
  },

  /** Tire UN candidat pondéré par rareté × affinité parmi `candidates`
      (`[{item, cat}]`). GARANTIE ISO : `profile` vide ⇒ tous les poids
      valent 1 ⇒ tirage uniforme, identique à `Utils.rand`. Renvoie l'item
      (pas l'enveloppe). null si aucun candidat éligible. */
  weightedPick(candidates, ctx, profile) {
    if (!candidates || !candidates.length) return null;
    const weights = candidates.map((c) => this.weight(c.item, c.cat, ctx, profile));
    let total = weights.reduce((a, b) => a + b, 0);
    // Tous exclus (poids 0) : repli sur uniforme pour ne jamais rendre vide
    // un slot qui a des candidats (un tier trop haut ne doit pas « bloquer »).
    if (total <= 0) return Utils.rand(candidates).item;
    let r = Math.random() * total;
    for (let i = 0; i < candidates.length; i++) {
      r -= weights[i];
      if (r < 0) return candidates[i].item;
    }
    return candidates[candidates.length - 1].item;
  },

  /** Tire jusqu'à `n` candidats DISTINCTS (par chaîne d'affichage) — même
      pondération, sans doublon (motif `Content._sample`). */
  weightedSample(candidates, n, ctx, profile) {
    const pool = candidates.slice();
    const out = [];
    const seen = new Set();
    let guard = 0;
    while (out.length < n && pool.length && guard < 200) {
      guard++;
      const pick = this.weightedPick(pool, ctx, profile);
      if (pick == null) break;
      const key = ItemResolver.itemStr(pick);
      const idx = pool.findIndex((c) => c.item === pick);
      if (idx >= 0) pool.splice(idx, 1);
      if (!seen.has(key)) {
        seen.add(key);
        out.push(pick);
      }
    }
    return out;
  },

  /** Remplit un slot : rassemble les candidats de ses catégories, applique
      sa condition `when(ctx)`, tire `count` items distincts. `count` peut
      être un nombre ou une fonction de ctx. Renvoie un tableau d'items. */
  fillSlot(equipPools, slot, ctx, profile) {
    if (slot.when && !slot.when(ctx)) return [];
    const candidates = this.gatherCandidates(equipPools, slot.cats);
    if (!candidates.length) return [];
    const count = typeof slot.count === "function" ? slot.count(ctx) : (slot.count || 1);
    if (count <= 1) {
      const one = this.weightedPick(candidates, ctx, profile);
      return one == null ? [] : [one];
    }
    return this.weightedSample(candidates, count, ctx, profile);
  },

  /** Orchestre tous les slots d'un `profile` et renvoie la liste d'items
      (à pousser dans `pnj.equip`). Consommé par les modules d'édition en
      remplacement du corps de `buildLoadout`. Sans `slots`
      autorés, renvoie [] (le module garde alors son ancien chemin). */
  pick(equipPools, profile, ctx) {
    if (!profile || !Array.isArray(profile.slots)) return [];
    const out = [];
    for (const slot of profile.slots) {
      out.push(...this.fillSlot(equipPools, slot, ctx, profile));
    }
    return out;
  },
};
