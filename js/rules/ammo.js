"use strict";

/* ============================================================
   MUNITIONS, RECHARGEMENT ET RECUL — le magasin, neutre par édition (lot F2).

   Trois choses que le livre facture et que l'app ne facturait pas : les BALLES
   qu'un mode de tir consomme, l'ACTION que coûte un rechargement, et le RECUL
   qui s'accumule tant qu'on tire (SR5 seul). Les tables vivent dans les modules
   d'édition (`fireModes`, `reloadPlan`, `recoilModel`) ; ce module ne connaît
   que la FORME, jamais le contenu — même partage que `Statuses`/`Actions`.

   ── La donnée était déjà là ─────────────────────────────────────────────
   Les 69 armes à feu SR5 et 65 SR6 déclarent leur mode de tir ET leur capacité
   dans leur propre chaîne depuis toujours :

     "Ares Alpha [PRE 5(7), VD 11P, PA -2, SA/TR/TA, 42(c), lance-grenades]"

   `WeaponRoll.parse` extrayait `name/pre/vd/so` et jetait le reste. Il n'y
   avait rien à saisir — seulement à lire. Seule la colonne CR du livre SR5
   manquait vraiment aux chaînes ; elle y a été ajoutée au même lot.

   ── Ce que ce module motorise, et ce qu'il refuse ────────────────────────
   MOTORISÉ, parce que c'est de l'arithmétique pure que le MJ a déclenchée :
   le compteur de balles, le coût du rechargement, le malus de recul cumulé.

   ANNONCÉ, jamais injecté : le malus de DÉFENSE d'un mode de tir. Il est
   circonstanciel — il appartient au jet, pas au personnage, exactement comme
   `statusModel` l'a tranché pour SR5 (« défenseur étendu −2 n'est pas une
   propriété du personnage »). L'app l'écrit sur la ligne de jet pour que le MJ
   l'annonce au joueur qui va lancer ; elle ne réécrit jamais la fiche du
   défenseur.

   REFUSÉ : empêcher un tir à sec. Le livre prévoit le tir court et en donne le
   prix (SR5 : « réduisez les modificateurs de défense et de recul de 1 par
   balle manquante ») — griser le bouton retirerait au MJ un arbitrage que le
   livre lui rend.
   ============================================================ */

export const Ammo = {
  /* ========================================================
     ARME
     ======================================================== */

  /** Capacité nominale d'une arme analysée : `{ n, mech }`, ou null si l'arme
      n'en déclare pas (mêlée, jet, exotique) — auquel cas TOUTE la surface
      munitions disparaît pour elle, comme `statusModel: null` fait disparaître
      la ligne d'états. */
  capacity(parsed) {
    return (parsed && parsed.capacity && parsed.capacity[0]) || null;
  },

  /** Les autres capacités déclarées (« 50(c) ou 100(bande) ») — le MJ choisit,
      l'app ne tranche pas. */
  altCapacities(parsed) {
    return (parsed && parsed.capacity && parsed.capacity.slice(1)) || [];
  },

  /** Cette arme compte-t-elle ses balles ? */
  tracks(parsed) {
    return !!this.capacity(parsed);
  },

  /* ========================================================
     MODES DE TIR
     ======================================================== */

  /** Table de l'édition, ou [] si elle n'en a pas (Anarchy : le combat y est
      narratif, aucun décompte de balles n'y a de sens). */
  fireModes(pnj) {
    const mod = pnj ? App.getEditionModule(pnj.edition) : null;
    return (mod && mod.fireModes) || [];
  },

  /** Les modes RÉELLEMENT disponibles pour cette arme : ceux de la table dont
      le prérequis figure dans les modes déclarés par la chaîne. Une arme `SA`
      ne se voit pas proposer le tir automatique. */
  modesFor(pnj, parsed) {
    const dispo = (parsed && parsed.modes) || [];
    if (!dispo.length) return [];
    return this.fireModes(pnj).filter((m) => dispo.includes(m.requires));
  },

  find(pnj, key) {
    return this.fireModes(pnj).find((m) => m.key === key) || null;
  },

  /** RÉSOLUTION D'UN TIR : ce qui part, ce qu'il en coûte, et ce qu'il faut
      annoncer — y compris à court de munitions.

      → { mode, tires, manquants, court, defense, so, dv, note }

      `defense` (SR5) et `so`/`dv` (SR6) sont les valeurs À ANNONCER, déjà
      corrigées du manque :

      · SR5 p.180 — « Si le tireur est à court de munitions, réduisez les
        modificateurs de défense et de recul de 1 par balle manquante. »
        Un tir automatique complexe (−9) avec 7 balles sur 10 annonce donc −6,
        et le recul ne compte que 7 balles. C'est l'exemple du livre, au chiffre
        près.

      · SR6 — « Si vous n'avez pas assez de munitions pour effectuer une rafale
        ciblée de quatre balles, réduisez ses effets en conséquence avec une
        modification du Score Offensif égale au nombre de balles tirées et une
        Valeur de Dommages augmentée de +1 tant qu'au moins deux balles sont
        tirées. » Le SO court vaut donc −(balles tirées), pas le −4 du plein. */
  resolve(pnj, mode, reste) {
    if (!mode) return null;
    const veut = mode.bullets || 0;
    const tires = Math.max(0, Math.min(veut, reste));
    const manquants = Math.max(0, veut - tires);
    const court = manquants > 0;
    const out = { mode, veut, tires, manquants, court, note: mode.note || "" };

    if (mode.defense !== undefined && mode.defense !== null) {
      // SR5 : le modificateur remonte vers 0 d'un point par balle manquante.
      out.defense = Math.min(0, mode.defense + manquants);
    } else {
      out.defense = mode.defense === null ? null : 0;
    }
    if (mode.so !== undefined) out.so = court ? -tires : mode.so;
    if (mode.dv !== undefined) out.dv = court ? (tires >= 2 ? 1 : 0) : mode.dv;
    return out;
  },

  /** La ligne d'annonce du jet — ce que le MJ lit à voix haute au joueur qui
      va se défendre. Elle vit ici et non dans le renderer pour que les trois
      surfaces qui peuvent lancer un tir disent EXACTEMENT la même chose. */
  rollDetail(res) {
    if (!res) return "";
    const bouts = [res.mode.name];
    bouts.push(res.court ? `${res.tires} balle${res.tires > 1 ? "s" : ""} sur ${res.veut}` : `${res.tires} balle${res.tires > 1 ? "s" : ""}`);
    // Signe TYPOGRAPHIQUE (−, U+2212) et non le trait d'union ASCII : c'est la
    // convention du reste de l'app (badge ⊘ −ND, malus de défenses multiples).
    const moins = (n) => `${n < 0 ? "−" : "+"}${Math.abs(n)}`;
    if (res.defense !== null && res.defense !== undefined && res.defense !== 0) bouts.push(`défense ${moins(res.defense)}`);
    if (res.so) bouts.push(`SO ${moins(res.so)}`);
    if (res.dv) bouts.push(`VD ${moins(res.dv)}`);
    if (res.note) bouts.push(res.note);
    return bouts.join(" · ");
  },

  /* ========================================================
     RECHARGEMENT
     ======================================================== */

  /** Les CLÉS D'ACTION qui rechargent cette arme, dans l'ordre où le livre les
      enchaîne. Le contrat les donne, `Actions` en porte le coût : l'app ne
      duplique jamais un coût, elle pointe vers l'action qui le déclare.

      SR5 p.169 fait coûter le chargeur amovible (c) DEUX actions simples
      (« retire OU insère »), soit la phase d'action entière — sauf smartgun,
      où l'éjection devient gratuite. SR6 facture une mineure au smartgun et une
      majeure à tout le reste. */
  reloadPlan(pnj, parsed) {
    const mod = pnj ? App.getEditionModule(pnj.edition) : null;
    if (!mod || !mod.reloadPlan) return [];
    return mod.reloadPlan(parsed) || [];
  },

  /* ========================================================
     RECUL PROGRESSIF (SR5) — le malus que personne ne suit.

     Le livre p.177-178, verbatim :

       « Tout d'abord 1 point de compensation gratuit à chaque fois que le
       personnage commence à faire feu, auquel on ajoute Force / 3 (arrondie au
       supérieur) et la compensation de recul dont disposent les armes avec
       lesquelles vous faites feu. Soustrayez ensuite le nombre de balles que
       vous êtes sur le point de tirer. Si le résultat est négatif, c'est le
       modificateur de recul, qui doit être retranché à votre réserve de dés. »

       « Les modificateurs de recul s'accumulent d'une phase d'action et d'un
       tour de combat à l'autre À MOINS QUE le personnage ne dépense, ou soit
       forcé de dépenser, une action simple ou complexe pour AUTRE CHOSE que
       faire feu. Le recul se cumule POUR LE PERSONNAGE, PAS POUR L'ARME. »

     ⚠ C'est ici que les deux lots se referment l'un sur l'autre : la remise à
     zéro est déclenchée par « une action pour autre chose que faire feu »,
     c'est-à-dire exactement l'information que le catalogue F1 vient de créer
     (`Actions.isShot`). Sans actions nommées, ce malus n'était pas motorisable.
     ======================================================== */

  /** L'édition compte-t-elle le recul ? (SR6 : non — le Score Offensif l'a
      remplacé ; Anarchy : pas de combat chiffré). */
  hasRecoil(pnj) {
    const mod = pnj ? App.getEditionModule(pnj.edition) : null;
    return !!(mod && mod.recoilModel);
  },

  /** Compensation TOTALE : le point gratuit + l'apport d'attribut + la CR des
      armes en main. `crosse` = true si le MJ déclare les accessoires internes
      déployés (crosse pliable) — c'est le nombre entre parenthèses du livre,
      qui est un TOTAL et non un supplément. */
  compensation(pnj, parsedList, crosse) {
    const mod = pnj ? App.getEditionModule(pnj.edition) : null;
    const spec = mod && mod.recoilModel;
    if (!spec) return 0;
    let n = spec.free || 0;
    if (spec.fromAttr) {
      const v = Actor.attr(pnj, spec.fromAttr.attr) || 0;
      n += Math.ceil(v / (spec.fromAttr.div || 1));
    }
    for (const p of parsedList || []) {
      if (!p || !p.cr) continue;
      n += crosse ? p.cr.full : p.cr.base;
    }
    return n;
  },

  /** Le malus, en magnitude POSITIVE (à soustraire), comme `woundMalus` et
      `globalDiceMalus`. Zéro tant que le cumul ne dépasse pas la compensation. */
  recoilMalus(cumul, comp) {
    return Math.max(0, (cumul || 0) - (comp || 0));
  },

  /** Cette action REMET-ELLE le cumul à zéro ? « À moins que le personnage ne
      dépense […] une action simple ou complexe pour autre chose que faire feu »
      — donc : ni un tir, et d'une nature que le contrat désigne (`resetGroups`).
      Une action GRATUITE ne suffit pas : parler ou lâcher un objet n'a jamais
      calmé un canon. */
  resetsRecoil(pnj, entry) {
    const mod = pnj ? App.getEditionModule(pnj.edition) : null;
    const spec = mod && mod.recoilModel;
    if (!spec || !entry || entry.shot) return false;
    const groupes = spec.resetGroups || [];
    const cost = Array.isArray(entry.cost) ? entry.cost : entry.cost ? [entry.cost] : [];
    return cost.some((c) => groupes.includes(c.key) && c.n > 0);
  },

  /** Le mode CC échappe au recul progressif : « les armes coup par coup ont
      l'avantage de ne pas souffrir de recul progressif quand elles utilisent ce
      mode de tir » (p.178). La pause entre deux tirs suffit à reprendre le
      contrôle. Les autres modes cumulent leurs balles TIRÉES (pas voulues :
      à court de munitions, le recul « sera calculé en prenant en compte 7
      balles », dit l'exemple). */
  recoilFrom(res) {
    if (!res || res.mode.recoil === false) return 0;
    return res.tires;
  },
};
