"use strict";

/* ============================================================
   BONUS ENGINE — applique automatiquement les bonus mécaniques
   d'équipement et de traits aux PNJ générés.

   Trois sources, un seul point d'entrée (apply(pnj, edition)) :
   - Cyberware/équipement SR5/SR6 (REA/FOR/CON/AGI/INT, initiative,
     armure dermique) repérés dans pnj.equip + pnj.augs.
   - Synergie smartgun (arme) / smartlink (PNJ) : stocke un flag
     pnj.smartlink consommé par WeaponRoll.resolvePool() au moment
     du jet (le bonus dépend de l'arme lancée, pas figé à la génération).
   - Atouts Anarchy « RR N aux tests de X » : appliqués à pnj.skills.

   Les bonus d'attribut/armure SR5/SR6 sont suivis d'un appel à
   EditionXXX.recalc(pnj), qui existe déjà (sr5.js/sr6.js) et recalcule
   Limites/Défense/Moniteurs/etc. à partir de pnj.attrs — pas de formule
   dupliquée ici.
   ============================================================ */
const BonusEngine = {
  /* Table de correspondance « préfixe du libellé déjà existant dans
     equipPools.cyberware/equipSpecial/augsBySpecial » → bonus.
     Pas de réécriture des libellés : on les reconnaît tels quels. */
  CYBER_BONUS: {
    sr5: [
      ["Réflexes câblés 1", { initDice: 1 }],
      ["Réflexes câblés 2", { initDice: 2 }],
      // Le volet REA manquait — le livre (p.458) augmente aussi la Réaction,
      // pas seulement les dés d'init (déjà motorisés séparément via
      // initAugPool).
      ["Réflexes câblés 1", { attr: "REA", val: 1 }],
      ["Réflexes câblés 2", { attr: "REA", val: 2 }],
      ["Accroissement de réaction", { attr: "REA", val: 1 }],
      // « Tonification musculaire » = bioware AGI au livre (Muscle Toner,
      // SR5 p.464), PAS FOR. Le +FOR était un bug. ⚠ SR6 « Tonification
      // musculaire 3 → FOR » non corrigé ici (à vérifier au livre SR6).
      ["Tonification musculaire", { attr: "AGI", val: 1 }],
      // Renforcement musculaire (bioware Muscle Augmentation, SR5 p.463) =
      // +INDICE Force — premier bonus indice-scalé (byRating).
      ["Renforcement musculaire", { attr: "FOR", byRating: true }],
      ["Armure dermique", { armor: 1 }],
      // Substitut musculaire = double attribut : le livre ajoute l'indice à
      // FOR **et** AGI simultanément.
      ["Substitut musculaire", { attr: "FOR", byRating: true }],
      ["Substitut musculaire", { attr: "AGI", byRating: true }],
      // Booster cérébral = +indice LOG (p.464). Décision utilisateur
      // 2026-07-15 : LOG seul, le livre ne motorise pas l'INT malgré le
      // libellé catalogue « bonus LOG/INT ».
      ["Booster cérébral", { attr: "LOG", byRating: true }],
      // Booster synaptique = +1 REA à l'indice 1 (seul indice existant pour
      // ce volet, p.464). Le volet dés d'initiative reste motorisé séparément
      // (initAugPool).
      ["Booster synaptique", { attr: "REA", val: 1 }],
      // Orthoderme = bonus d'armure égal à l'indice (p.462-463).
      ["Orthoderme", { armor: true, byRating: true }],
      // Phéromones optimisées = +indice à la Limite sociale (p.463). Le volet
      // pool Comédie/Influence (bonus de dés, pas de Limite) reste hors
      // schéma — non motorisé ici.
      ["Phéromones optimisées", { limit: "soc", byRating: true }],
      // Amélioration mnémonique = +indice à la Limite mentale (p.464). Le
      // volet pool Connaissances/langues reste hors schéma — non motorisé ici.
      ["Amélioration mnémonique", { limit: "ment", byRating: true }],
      // Articulations intelligentes (Chrome Flesh, cyberware) = +2 Limite
      // physique, fixe. Débloqué par le puits Limite + le fix d'écrasement
      // recalc (seau _limitMods).
      ["Articulations intelligentes", { limit: "phys", val: 2 }],
      // Optimisation d'accroissement de réaction (Chrome Flesh p.171,
      // optimisation génétique) = +1 au SCORE d'Initiative (fixe, « aucun
      // bonus pour indices supérieurs »). PAS +1 REA (le livre dit
      // Initiative). Passe par le seau _initMod (dérivée recalculée). Préfixe
      // « Optimisation d'… » distinct de « Accroissement de réaction » (pas
      // de collision).
      ["Optimisation d'accroissement de réaction", { init: 1 }],
    ],
    sr6: [
      ["Réflexes câblés 1", { initDice: 1 }],
      ["Réflexes câblés 2", { initDice: 2 }],
      ["Amplificateur de réaction 2", { attr: "RÉA", val: 2 }],
      ["Amplificateurs synaptiques 2", { attr: "INT", val: 2 }],
      ["Tonification musculaire 3", { attr: "FOR", val: 3 }],
      ["Renforcement musculaire 3", { attr: "FOR", val: 3 }],
      // Préfixe resserré sur la forme crochets (item cyberware simple) pour
      // ne pas capter les variantes parenthétiques ci-dessous.
      ["Ossature renforcée [", { attr: "CON", val: 2 }],
      ["Substituts musculaires", { attr: "AGI", val: 2 }],
      ["Armure dermique 3", { sd: 3 }],
      ["Armure dermique 4", { sd: 4 }],
      // Orthoderme = +indice au Score Défensif (p.299). Nécessite le libellé
      // catalogue corrigé (sr6.js) pour porter « Indice 1-4 » et rendre le
      // stepper opérant.
      ["Orthoderme", { sd: true, byRating: true }],
      // Renforcement musculaire = +indice FOR (p.300). Préfixe resserré sur
      // « [Indice » (forme catalogue manuelle, sr6.js) : la forme courte des
      // statblocks générés
      // « Renforcement musculaire 3 [FOR+3] » est lue par ItemResolver.
      // itemRating comme un indice « 3 » via son repli sur la forme courte
      // (`\s([1-6])(?=\s*\[|$)`) — un préfixe générique collisionnerait avec
      // l'entrée fixe ci-dessus et compterait le bonus deux fois (vérifié en
      // navigateur : FOR 3→9 au lieu de 3→6 avant ce resserrement).
      ["Renforcement musculaire [Indice", { attr: "FOR", byRating: true }],
      // Trois variantes fixes (p.294-295), valeurs déjà dans le libellé
      // catalogue.
      ["Ossature renforcée (plastique)", { attr: "CON", val: 1, sd: 1 }],
      ["Ossature renforcée (aluminium)", { attr: "CON", val: 2, sd: 1 }],
      ["Ossature renforcée (titane)", { attr: "CON", val: 2, sd: 2 }],
      // Ossature renforcée TMG (Hantise astrale) — les 3 variantes
      // (Plastique/Aluminium/Titane) ne
      // diffèrent qu'en Essence/coût, toutes +1 SD → une seule entrée. Le
      // préfixe « Ossature renforcée TMG » ne collisionne PAS avec les
      // matchers standard ci-dessus (« Ossature renforcée [ » et
      // « … (plastique/…) »). Item alternatif à l'Ossature standard (un PNJ
      // porte l'un OU l'autre) → pas de double-comptage. Volet « dés de
      // défense » = pool distinct, non couvert (facette défense hors puits).
      ["Ossature renforcée TMG", { sd: 1 }],
      // Move-by-wire (Corps à la carte p.39, indice 1-2) — « chaque point
      // octroie +2 Réaction ET
      // +2 Agilité » → table littérale ×2 par indice (1→+2, 2→+4). Le volet
      // « +2 actions mineures mouvement » (économie d'action) est hors puits.
      // ⚠ Incompatible au livre avec toute autre augmentation de Réaction
      // (Réflexes câblés/Amplificateur) — non modélisé (BonusEngine ne gère
      // pas les incompatibilités, il somme ce que le PNJ porte).
      ["Move-by-wire", { attr: "RÉA", perRating: [null, 2, 4] }],
      ["Move-by-wire", { attr: "AGI", perRating: [null, 2, 4] }],
      // Articulations améliorées = +1 AGI fixe (p.299 ; la remise d'Atout
      // espaces étroits n'est pas motorisable, pas de champ pour ça dans
      // BonusEngine).
      ["Articulations améliorées", { attr: "AGI", val: 1 }],
      // Glande suprathyroïdienne = +1 fixe à AGI/CON/RÉA simultanément
      // (p.300). La part FOR+25% est multiplicative,
      // hors du schéma additif {attr,val} — non motorisée (signalée dans la
      // collecte).
      ["Glande suprathyroïdienne", { attr: "AGI", val: 1 }],
      ["Glande suprathyroïdienne", { attr: "CON", val: 1 }],
      ["Glande suprathyroïdienne", { attr: "RÉA", val: 1 }],
    ],
  },

  /* Bonus de trait : appliqué directement sur les objets traits de
     content.js (champ `bonus`), lu ici depuis pnj.traits. Ce tableau ne
     sert qu'à documenter le schéma — les valeurs vivent dans content.js. */

  /** Repère le cyberware/équipement présent et cumule les bonus. */
  _collectCyberBonuses(pnj, edition) {
    const table = this.CYBER_BONUS[edition] || [];
    const items = [...(pnj.equip || []), ...(pnj.augs || [])];
    // attrMods : contributions ÉTIQUETÉES (source = libellé du cyberware
    // reconnu) plutôt qu'une somme — la provenance remonte jusqu'au Trait.
    const totals = { initDice: 0, initScore: 0, armor: 0, sd: 0, limits: {}, attrMods: [] };
    for (const item of items) {
      const s = ItemResolver.itemStr(item); // item chaîne OU objet
      if (!s) continue;
      for (const [prefix, bonus] of table) {
        if (!s.startsWith(prefix)) continue;
        if (bonus.initDice) totals.initDice += bonus.initDice;
        // `init` = bonus au SCORE d'Initiative (≠ dé d'init). Dérivé
        // recalculé (REA+INT) → passe par le seau `_initMod` (comme les
        // Limites), sinon écrasé par recalc.
        if (bonus.init) totals.initScore += bonus.init;
        // Valeur à l'INDICE : `byRating` = +indice ; `perRating[r]` = table
        // littérale ; sinon la valeur fixe du champ. Un indice non résolu
        // (plage « 1-4 ») → 0 (inactif jusqu'au stepper). Généralisé au-delà
        // de `attr` : `armor`/`sd` (booléens quand scalés) et `limit`.
        let scaled = null;
        if (bonus.byRating || bonus.perRating) {
          // Lire l'indice sur l'ITEM d'origine (chaîne OU objet), pas sur
          // `s` déjà aplati en chaîne — sinon `.rating` réglé par
          // le stepper (EditModal) est invisible ici.
          const r = ItemResolver.itemRating(item);
          scaled = r == null ? 0 : bonus.byRating ? r : bonus.perRating[r] || 0;
        }
        if (bonus.armor) totals.armor += bonus.armor === true ? scaled : bonus.armor;
        if (bonus.sd) totals.sd += bonus.sd === true ? scaled : bonus.sd;
        if (bonus.limit) {
          const val = scaled != null ? scaled : bonus.val;
          if (val) totals.limits[bonus.limit] = (totals.limits[bonus.limit] || 0) + val;
        }
        if (bonus.attr) {
          const val = scaled != null ? scaled : bonus.val;
          if (val) totals.attrMods.push({ attr: bonus.attr, val, source: prefix });
        }
      }
    }
    return totals;
  },

  /** Détecte un smartlink (implanté ou externe) dans l'équipement du PNJ. */
  detectSmartlink(pnj) {
    const items = [...(pnj.equip || []), ...(pnj.augs || [])];
    let implanted = false;
    let external = false;
    for (const item of items) {
      const s = ItemResolver.itemStr(item); // item chaîne OU objet
      if (!s || !/smartlink/i.test(s)) continue;
      if (/cybernétique|implant/i.test(s)) implanted = true;
      else external = true;
    }
    if (!implanted && !external) return null;
    return { implanted, external };
  },

  /**
   * Applique un seul objet bonus au pnj. Types supportés :
   * - initDice : dés d'initiative supplémentaires
   * - attr / attrChoice (+val) : attribut fixe ou tiré au hasard dans une liste
   * - skill / skillChoice (+val) : compétence nommée, ou tirée au hasard
   *   parmi celles que le PNJ possède déjà (cohérent avec la condition du
   *   livre « doit déjà connaître la compétence » — silencieux si aucune)
   * - armor (SR5 → pnj.armure) / sd (SR6 → pnj.sdBase)
   * - limit: "phys"|"ment"|"soc" (+val, SR5 uniquement, Limites naturelles)
   * - monitor (+cases au moniteur physique, SR5 physMon / SR6 me)
   * - stat : nom de champ pnj direct (composure, memory... déjà utilisé
   *   par les traits SR5/SR6 existants)
   * Renvoie true si un attribut a été touché (pour déclencher recalc()).
   */
  _applyOneBonus(pnj, edition, b, source = "") {
    if (!b) return false;
    let attrsTouched = false;
    if (b.initDice) pnj.initDice = (pnj.initDice || 0) + b.initDice;
    if (b.stat) pnj[b.stat] = (pnj[b.stat] || 0) + b.val;
    if (b.armor) {
      pnj.armure = (pnj.armure || 0) + b.armor;
      attrsTouched = true; // pour rafraîchir damageResist (SR5) via recalc()
    }
    if (b.sd) pnj.sdBase = (pnj.sdBase || 0) + b.sd;
    if (b.limit && b.val) {
      // Les Limites sont RECALCULÉES depuis les attributs par recalc() —
      // un `pnj.limSoc += v` serait écrasé. On accumule dans un seau
      // `pnj._limitMods` que recalc ré-ajoute après sa formule de base
      // (miroir de Actor.addMod/refreshAttrs pour les attributs). Survit
      // au recalc de génération ET d'édition (editmodal.js).
      pnj._limitMods = pnj._limitMods || { phys: 0, ment: 0, soc: 0 };
      pnj._limitMods[b.limit] = (pnj._limitMods[b.limit] || 0) + b.val;
      attrsTouched = true; // un bonus de Limite seul doit déclencher recalc
    }
    if (b.monitor) {
      const key = App.getEditionModule(edition).conditionMonitor.fields.primary;
      if (key) pnj[key] = (pnj[key] || 0) + b.monitor;
    }
    const attr =
      b.attrChoice && b.attrChoice.length ? Utils.rand(b.attrChoice) : b.attr;
    if (attr) {
      Actor.addMod(pnj, attr, { value: b.val, source: source || "bonus", type: "trait" });
      attrsTouched = true;
    }
    const skillName =
      b.skillChoice && pnj.skills && pnj.skills.length
        ? Utils.rand(pnj.skills).name
        : b.skill;
    if (skillName) {
      const s = (pnj.skills || []).find(
        (sk) => sk.name.toLowerCase() === skillName.toLowerCase(),
      );
      if (s) s.val += b.val;
    }
    return attrsTouched;
  },

  /** Somme les bonus d'une liste d'objets {bonus} — traits, pouvoirs
      d'adepte, traits de métatype. */
  _sumListBonus(pnj, edition, list) {
    let attrsTouched = false;
    for (const item of list || []) {
      if (item && item.bonus && this._applyOneBonus(pnj, edition, item.bonus, item.name || ""))
        attrsTouched = true;
    }
    return attrsTouched;
  },

  /** SR5/SR6 : cyberware + traits + pouvoirs d'adepte + métatype + Infecté
      → attrs/initiative/armure/limites/moniteur, puis recalc(). */
  _applySR(pnj, edition, EditionModule) {
    // Reset du seau de mods de Limite AVANT toute accumulation (item ou
    // trait) : recalc le ré-appliquera après sa formule de base. Reset →
    // pas de double-comptage si _applySR est rejoué (régénération).
    pnj._limitMods = { phys: 0, ment: 0, soc: 0 };
    // Seau de mod du SCORE d'Initiative (dérivé REA+INT, recalculé) — même
    // logique que _limitMods (fix tranche 4) : reset ici, ré-appliqué par
    // recalc. Optimisation d'accroissement de réaction (SR5).
    pnj._initMod = 0;
    const totals = this._collectCyberBonuses(pnj, edition);
    let attrsTouched = false;

    if (totals.initDice) pnj.initDice = (pnj.initDice || 0) + totals.initDice;
    if (totals.initScore) {
      pnj._initMod = (pnj._initMod || 0) + totals.initScore;
      attrsTouched = true; // dérivée init → recalc doit se déclencher
    }
    if (totals.armor) pnj.armure = (pnj.armure || 0) + totals.armor;
    if (totals.sd) pnj.sdBase = (pnj.sdBase || 0) + totals.sd;
    // Bonus de Limite naturelle scalés à l'indice (Phéromones optimisées,
    // Amélioration mnémonique). Accumulés dans le
    // seau `_limitMods` (ré-appliqué par recalc), PAS un `pnj.limX +=` qui
    // serait écrasé par le recalc suivant (fix tranche 4).
    for (const [k, v] of Object.entries(totals.limits)) {
      if (v) {
        pnj._limitMods[k] = (pnj._limitMods[k] || 0) + v;
        attrsTouched = true; // un bonus de Limite seul doit déclencher recalc
      }
    }
    for (const m of totals.attrMods) {
      Actor.addMod(pnj, m.attr, { value: m.val, source: m.source, type: "cyber" });
      attrsTouched = true;
    }

    if (this._sumListBonus(pnj, edition, pnj.traits)) attrsTouched = true;
    if (this._sumListBonus(pnj, edition, pnj.powers)) attrsTouched = true;
    if (this._sumListBonus(pnj, edition, pnj.metaTraits)) attrsTouched = true;

    // Bonus « Tous » d'un esprit mentor (une compétence), appliqué si le
    // PNJ possède la compétence visée.
    if (
      pnj.mentorSpirit &&
      pnj.mentorSpirit.bonus &&
      this._applyOneBonus(pnj, edition, pnj.mentorSpirit.bonus, pnj.mentorSpirit.name || "Mentor")
    )
      attrsTouched = true;

    // Bonus de type Infecté (initDice/sd/armor), déposé temporairement par
    // generate() sur pnj._infectedBonus.
    if (
      pnj._infectedBonus &&
      this._applyOneBonus(pnj, edition, pnj._infectedBonus, "Infecté")
    )
      attrsTouched = true;
    delete pnj._infectedBonus;

    if (
      attrsTouched &&
      EditionModule &&
      typeof EditionModule.recalc === "function"
    ) {
      EditionModule.recalc(pnj);
    }

    pnj.smartlink = this.detectSmartlink(pnj);
  },

  /* ========================================================
     ANARCHY — atouts « RR N aux tests de X (sous-spé) [et de Y...] »
     ======================================================== */

  /** Découpe le texte d'un atout en { rr, skills:[{name, subspec}] } ou null. */
  parseAnarchyRR(text) {
    const m = String(text || "").match(/RR\s*(\d+)\s+aux tests d[e’']\s*(.+)/i);
    if (!m) return null;
    const rr = parseInt(m[1], 10);
    // Coupe à la première ponctuation de fin de phrase qui ne fait pas
    // partie d'une parenthèse de sous-spécialisation.
    const rest = m[2].split(/[.;]/)[0];
    const segments = rest.split(/\s+et\s+(?:de\s+|d[’'])?/i);
    const skills = [];
    for (const seg of segments) {
      const sm = seg.trim().match(/^([^(]+?)\s*(?:\(([^)]+)\))?$/);
      if (!sm) continue;
      const name = sm[1].trim();
      if (!name) continue;
      skills.push({ name, subspec: sm[2] ? sm[2].trim() : null });
    }
    return skills.length ? { rr, skills } : null;
  },

  /** Trouve la compétence du PNJ correspondant à un nom d'atout (insensible
      à la casse, tolère les variantes "Combat rapproché" / "Furtivité"...). */
  _findAnarchySkill(pnj, name) {
    const target = name.toLowerCase();
    return (pnj.skills || []).find((s) => {
      const n = s.name.toLowerCase();
      return n === target || n.includes(target) || target.includes(n);
    });
  },

  _applyAnarchy(pnj) {
    // « Armure +N » d'un atout AU CHOIX (ex. Armure dermique) : relève les
    // seuils de blessures physiques. Uniquement les atouts tirés parmi
    // edgeOptions (pnj.chosenEdges) : les seuils imprimés des statblocks
    // incluent déjà l'armure des atouts fixes (cf. Adepte d'élite,
    // FOR 3 + Armure 4 + Armure mystique 1 = seuils 8/11/14). Exclusions :
    // sorts au bonus dynamique (« +1 par 3 succès ») et équipements
    // « optionnels » (bouclier), gérés par un tag cliquable sur la carte.
    for (const edgeText of pnj.chosenEdges || []) {
      const m = String(edgeText).match(/Armure\s*\+(\d+)/i);
      if (!m) continue;
      if (/par\s+\d+\s+succès|optionnel/i.test(edgeText)) continue;
      const n = parseInt(m[1], 10);
      if (/biofeedback|matriciel/i.test(edgeText)) {
        if (pnj.matrixMonitor)
          pnj.matrixMonitor = pnj.matrixMonitor.map((v) => v + n);
      } else if (pnj.physMonitor) {
        pnj.physMonitor = pnj.physMonitor.map((v) => v + n);
      }
    }

    // Cases de moniteur supplémentaires (p.61 : "Case de blessure légère/
    // grave supplémentaire", max +1 chacune, cumulé toutes sources
    // confondues — cyberware/bioware/pouvoir d'adepte/trait/drone...).
    // Ex. : "Producteur de plaquettes (bioware) : +1 blessure légère".
    let legerBonus = 0;
    let graveBonus = 0;
    for (const edgeText of pnj.edges || []) {
      if (/\+\s*1\s+blessure\s+légère/i.test(edgeText)) legerBonus = 1;
      if (/\+\s*1\s+blessure\s+grave/i.test(edgeText)) graveBonus = 1;
    }
    if (legerBonus) pnj.legerCapBonus = legerBonus;
    if (graveBonus) pnj.graveCapBonus = graveBonus;

    for (const edgeText of pnj.edges || []) {
      const parsed = this.parseAnarchyRR(edgeText);
      if (!parsed) continue;
      for (const { name, subspec } of parsed.skills) {
        const skill = this._findAnarchySkill(pnj, name);
        if (!skill) continue;
        if (
          subspec &&
          skill.spec &&
          skill.spec.toLowerCase().includes(subspec.toLowerCase())
        ) {
          skill.specRR = (skill.specRR || 0) + parsed.rr;
        } else {
          skill.rr = (skill.rr || 0) + parsed.rr;
        }
      }
    }

    // Esprit mentor Anarchy 2.0 : relances (RR 1) sur les tests choisis,
    // appliquées aux compétences que le PNJ possède (specRR si la
    // spécialisation correspond, sinon rr au niveau de la compétence).
    const chosen = pnj.mentorSpirit && pnj.mentorSpirit.chosen;
    for (const { skill, subspec } of chosen || []) {
      const s = this._findAnarchySkill(pnj, skill);
      if (!s) continue;
      if (
        subspec &&
        s.spec &&
        s.spec.toLowerCase().includes(subspec.toLowerCase())
      ) {
        s.specRR = (s.specRR || 0) + 1;
      } else {
        s.rr = (s.rr || 0) + 1;
      }
    }

    // Plafond règle (p.71) : la RR cumulée toutes sources confondues (atouts
    // + esprit mentor) ne peut jamais dépasser 3, même déjà respecté au jet
    // par Dice.computeAnarchyRoll — on borne ici pour que l'affichage de la
    // fiche corresponde à la RR réellement utilisable.
    for (const s of pnj.skills || []) {
      if (s.rr != null) s.rr = Utils.clamp(s.rr, 0, 3);
      if (s.specRR != null) s.specRR = Utils.clamp(s.specRR, 0, 3);
    }
  },

  /** Point d'entrée unique, appelé en fin de generate() de chaque édition. */
  apply(pnj, edition) {
    if (!pnj) return pnj;
    const EditionModule = App.getEditionModule(edition);
    // usesRiskPanel = famille Anarchy (RR, atouts, seuils) — jamais de
    // branche `edition === "anarchy…"` ici.
    if (EditionModule && EditionModule.usesRiskPanel) {
      this._applyAnarchy(pnj);
      return pnj;
    }
    this._applySR(pnj, edition, EditionModule);
    return pnj;
  },
};
