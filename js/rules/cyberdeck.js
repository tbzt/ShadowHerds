"use strict";

/* ============================================================
   CYBERDECK — matrice côté decker (M1, PLAN_MATRICE_CYBERDECK.md).
   Miroir de js/rules/matrix.js (catalogues côté serveur) : ce module
   n'a pas de données propres par édition, il délègue tout le régime
   à App.getEditionModule(ed).cyberdeckModel (prohibition n°1). Le
   deck lui-même vit niché sur le PNJ (`pnj.cyberdeck`, comme
   `srv.spider` sur le serveur) — pas de 4ᵉ collection Storage
   (prohibition n°2).

   Forme par édition (table CODIR 2026-07-13) :
   - SR5/SR6 : 4 attributs ASDF/ACTF, réallouables (M2).
   - Anarchy 1re : Firewall seul + relance de N échecs.
   - Anarchy 2.0 : Attaque + Firewall + filtre de biofeedback en option.
   Le moniteur matriciel du deck et la réallocation en un tap sont
   du ressort de M2 — ce module ne pose que le socle data (M1).
   ============================================================ */
const Cyberdeck = {
  /** Codes d'attributs matriciels communs (mêmes clés que Matrix.ATTR_KEYS,
      réutilisées ici pour rester cohérent entre le régime serveur et le
      régime decker) — chaque édition n'en retient qu'un sous-ensemble via
      cyberdeckModel.attrKeys. */
  ATTR_KEYS: [
    { key: "attack", badge: "A", label: "Attaque" },
    { key: "sleaze", badge: "C", label: "Corruption" },
    { key: "dataProcessing", badge: "T", label: "Traitement de données" },
    { key: "firewall", badge: "F", label: "Firewall" },
  ],

  _model(edition) {
    const mod = App.getEditionModule ? App.getEditionModule(edition) : null;
    return (mod && mod.cyberdeckModel) || null;
  },

  /** Sous-ensemble d'ATTR_KEYS pertinent pour l'édition (ordre d'affichage). */
  attrKeys(edition) {
    const m = this._model(edition);
    if (!m) return [];
    return this.ATTR_KEYS.filter((a) => (m.attrKeys || []).includes(a.key));
  },

  reallocatable(edition) {
    return !!(this._model(edition) || {}).reallocatable;
  },
  hasReroll(edition) {
    return !!(this._model(edition) || {}).hasReroll;
  },
  hasBiofeedbackFilter(edition) {
    return !!(this._model(edition) || {}).hasBiofeedbackFilter;
  },
  label(edition) {
    return (this._model(edition) || {}).label || "Cyberdeck";
  },
  /** M2 : libellé du coût de reconfiguration (SR5 = action gratuite p.229 ;
      SR6 = action mineure, coût imprimé non détaillé au-delà de « une
      action » p.185 — traité par défaut comme mineure, à confirmer). Vide en
      Anarchy (pas de réallocation, attrs fixes). */
  reallocCostLabel(edition) {
    return (this._model(edition) || {}).reallocCostLabel || "";
  },
  /** M2 : taille du moniteur matriciel du deck. `null` = pas de moniteur de
      deck séparé pour cette édition (Anarchy 2.0 : le biofeedback encaisse
      sur la Volonté du decker, pas sur un moniteur de deck — table CODIR). */
  monitorSize(edition, deck) {
    const m = this._model(edition);
    return m && typeof m.monitorSize === "function" ? m.monitorSize(deck) : null;
  },

  /** Deck vierge d'une édition — structure minimale, aucune valeur devinée
      (l'utilisateur/le MJ les saisit). */
  blank(edition) {
    const keys = (this._model(edition) || {}).attrKeys || [];
    const attrs = {};
    for (const k of keys) attrs[k] = 0;
    return {
      name: "",
      attrs,
      programs: [],
      reroll: 0,
      biofeedbackFilter: false,
      filled: 0,
      legacyText: "",
    };
  },

  /** M7 : catalogue PLEIN des actions matricielles offensives de l'édition
      (entrées brutes {key, name, type, page, pool(deck), dv(deck)}), délégué au
      module d'édition (`cyberdeckModel.actions`, îlot — zéro `if (App.edition)`).
      Miroir de forme du catalogue de CI de matrix.js. Vide si l'édition n'a pas
      de râtelier (Anarchy 1re : Firewall seul, pas d'attribut Attaque). Sert le
      picker de loadout (toutes les actions disponibles). */
  catalog(edition) {
    return (this._model(edition) || {}).actions || [];
  },

  /** Catalogue PLEIN des programmes matriciels de l'édition (données
      d'édition, îlot `cyberdeckModel.programs`). Chaque entrée :
      `{key, name, page, effect}` où `effect` est soit `null` (programme
      catalogué mais non motorisable par un simple bonus de pool/VD : effet
      narratif, sur une action non modélisée, ou sur le Score O/D), soit un
      descripteur additif `{poolByType:{<type>:N}, poolAll:N, dvByType:{<type>:N},
      dvAll:N}`. Vide si l'édition n'a pas de programmes (Anarchy). */
  programCatalog(edition) {
    return (this._model(edition) || {}).programs || [];
  },

  /** Somme des effets mécaniques des programmes ACTIFS d'un deck. `deck.programs`
      est un tableau de noms (tolérant au texte libre : une entrée sans
      correspondance au catalogue — programme custom/legacy — est simplement
      ignorée côté effet, mais reste affichée). Deux familles d'effet :
      - `attr:{<clé>:N}` = modifie un ATTRIBUT/LIMITE du deck (attack/sleaze/
        dataProcessing/firewall). Dans cette app l'attribut EST la limite et
        alimente pools d'actions, défense (Firewall) et affichage → motorisé
        partout via effectiveAttrs().
      - `poolByType/poolAll/dvByType/dvAll` = bonus direct à une action donnée,
        pour les rares programmes qui ne passent pas par un attribut (Marteau
        SR5 = +VD au pic ; Overclock SR6 = +dés à toute action).
      Renvoie toujours la forme complète (zéros/objets vides par défaut). */
  programModifiers(edition, deck) {
    const mods = { attr: {}, poolByType: {}, poolAll: 0, dvByType: {}, dvAll: 0 };
    const cat = this.programCatalog(edition);
    if (!cat.length || !deck || !Array.isArray(deck.programs)) return mods;
    const byName = new Map(cat.map((p) => [p.name, p.effect]));
    for (const entry of deck.programs) {
      const eff = byName.get(entry);
      if (!eff) continue; // programme libre/inconnu → aucun bonus
      if (eff.poolAll) mods.poolAll += eff.poolAll;
      if (eff.dvAll) mods.dvAll += eff.dvAll;
      for (const [k, n] of Object.entries(eff.attr || {}))
        mods.attr[k] = (mods.attr[k] || 0) + n;
      for (const [t, n] of Object.entries(eff.poolByType || {}))
        mods.poolByType[t] = (mods.poolByType[t] || 0) + n;
      for (const [t, n] of Object.entries(eff.dvByType || {}))
        mods.dvByType[t] = (mods.dvByType[t] || 0) + n;
    }
    return mods;
  },

  /** Attributs EFFECTIFS du deck = base (`deck.attrs`) + deltas des programmes
      actifs (`attr:{…}`), bornés à ≥ 0. Source unique lue par les calculs de
      pool/VD, la défense (Firewall) et l'affichage de la carte — un programme
      qui relève un attribut/limite se voit donc partout. Ne mute jamais
      `deck.attrs` (les programmes sont amovibles). */
  effectiveAttrs(edition, deck) {
    const base = (deck && deck.attrs) || {};
    const delta = this.programModifiers(edition, deck).attr;
    const out = { ...base };
    for (const [k, n] of Object.entries(delta))
      out[k] = Math.max(0, (base[k] || 0) + n);
    return out;
  },

  /** Applique les modificateurs d'ACTION (pool/VD) à un couple résolu pour une
      action de type `type`. `null` reste `null` (une action non lançable / sans
      VD ne devient jamais chiffrée par un programme). Les modificateurs
      d'attribut, eux, sont déjà pris en compte en amont via effectiveAttrs. */
  _withProgramMods(mods, type, pool, dv) {
    const poolBonus = mods.poolAll + (mods.poolByType[type] || 0);
    const dvBonus = mods.dvAll + (mods.dvByType[type] || 0);
    return {
      pool: pool == null ? null : pool + poolBonus,
      dv: dv == null ? null : dv + dvBonus,
    };
  },

  /** M7 : entrées de catalogue ÉQUIPÉES d'un deck. Défaut PARESSEUX : `loadout`
      absent → toutes les actions (decks migrés/anciens = râtelier plein, aucune
      migration). Un `loadout` présent mais vide = aucune action (le decker a
      tout retiré volontairement — distinct de « absent »). */
  loadout(edition, deck) {
    const all = this.catalog(edition);
    if (!deck || !Array.isArray(deck.loadout)) return all;
    const keep = new Set(deck.loadout);
    return all.filter((a) => keep.has(a.key));
  },

  /** M7 : actions équipées, RÉSOLUES pour ce deck (pool/VD calculés). Pool
      simplifié = l'attribut du deck lié à la limite [crochets] de l'action
      (même simplification que rollAttack, qui ignore compétence + attribut
      cognitif — cohérent avec Intrusion.rollIC). La VD n'est chiffrée que pour
      le pic de données (VD = indice d'Attaque, SR5 p.242 / SR6 p.184) ; les
      succès excédentaires (+1) et marks (+2) s'ajoutent live, côté MJ. */
  actions(edition, deck) {
    const mods = this.programModifiers(edition, deck);
    // Deck « vu » avec ses attributs effectifs (programmes de type `attr`
    // pris en compte) — les fonctions pool/dv du catalogue lisent d.attrs.
    const effDeck = { ...(deck || {}), attrs: this.effectiveAttrs(edition, deck) };
    return this.loadout(edition, deck).map((a) => {
      const basePool = typeof a.pool === "function" ? a.pool(effDeck) : null;
      const baseDv = typeof a.dv === "function" ? a.dv(effDeck) : null;
      const { pool, dv } = this._withProgramMods(mods, a.type, basePool, baseDv);
      return { key: a.key, name: a.name, type: a.type, page: a.page, pool, dv };
    });
  },

  /** M7 : descripteur d'un jet d'action (consommé par le dispatch deck-action).
      Cherche dans le catalogue plein (une action peut être jouée même hors
      loadout affiché — le picker filtre l'affichage, pas la validité). `null`
      si la clé n'existe pas dans l'édition. Une action narrative (`pool null`,
      ex. « Pirater la Matrice » en Anarchy) se joue en marqueur, sans dés. */
  rollAction(edition, deck, key) {
    const a = this.catalog(edition).find((x) => x.key === key);
    if (!a) return null;
    const effDeck = { ...(deck || {}), attrs: this.effectiveAttrs(edition, deck) };
    const basePool = typeof a.pool === "function" ? a.pool(effDeck) : null;
    const baseDv = typeof a.dv === "function" ? a.dv(effDeck) : null;
    const { pool, dv } = this._withProgramMods(
      this.programModifiers(edition, deck),
      a.type,
      basePool,
      baseDv,
    );
    return { pool, dv, label: a.name, type: a.type };
  },

  /** M3→M7 : pool de l'attaque matricielle principale (le « pic de données »),
      conservé pour compatibilité — délègue à la 1ʳᵉ action de type "attack" du
      catalogue. `null` si l'édition n'a pas d'attaque motorisée (Anarchy 1re).
      Même simplicité que Intrusion.rollIC : un seul pool, pas de test opposé. */
  rollAttack(edition, deck) {
    const atk = this.catalog(edition).find((a) => a.type === "attack");
    if (!atk) return null;
    const effDeck = { ...(deck || {}), attrs: this.effectiveAttrs(edition, deck) };
    const mods = this.programModifiers(edition, deck);
    const basePool = typeof atk.pool === "function" ? atk.pool(effDeck) : null;
    if (basePool == null) return null;
    const baseDv = typeof atk.dv === "function" ? atk.dv(effDeck) : null;
    const { pool, dv } = this._withProgramMods(mods, atk.type, basePool, baseDv);
    return { pool, dv, label: atk.name };
  },

  /** M5 : pool de défense d'un appareil M4 PROTÉGÉ (SR5 p.236 — PAN/esclave :
      l'appareil esclave « utilise l'indice le plus avantageux entre le sien et
      celui de son maître », additionné du Firewall du maître ; SR6 n'a pas
      cette règle au livre — approximation par la même formule, arbitrage
      utilisateur/traducteur officiel 2026-07-14). Simplifié aux SEULS champs
      réellement trackés : ni la Volonté (`pnj.volonte` existe en chargen SR5
      mais n'est lue nulle part ailleurs dans le code, vérifié) ni un Firewall
      propre à l'appareil (M4 n'a que l'Indice) ne sont fiables — pool =
      Indice de l'appareil + Firewall du deck protecteur, tel quel. */
  rollDefense(deviceIndice, protectorDeck) {
    const fw = (protectorDeck && protectorDeck.attrs && protectorDeck.attrs.firewall) || 0;
    return { pool: (deviceIndice || 0) + fw, label: "Défense protégée" };
  },

  /** M5 : « Protection active » Anarchy 2.0 (p.216-217) — un coéquipier
      dépense une action pour un test Électronique (protection matricielle) +
      Logique, dont les succès se retranchent de ceux de l'attaquant (vaut
      aussi contre une tentative de brickage, p.217). La compétence
      Électronique n'étant pas trackée pour les PNJ (même simplification que
      Cyberdeck.rollAttack, qui ignore déjà Cybercombat), le pool retenu est
      Firewall du deck protecteur + Logique (attrs.LOG) du protecteur. */
  rollProtectActive(protectorPnj) {
    // Firewall EFFECTIF (programmes de type `attr`, ex. Cryptage +1 Firewall).
    const fw = protectorPnj.cyberdeck
      ? this.effectiveAttrs(protectorPnj.edition, protectorPnj.cyberdeck).firewall || 0
      : 0;
    const log = Actor.attr(protectorPnj, "LOG");
    return { pool: fw + log, label: "Protection active" };
  },

  /** M1 — migration : reconstruit un deck structuré à partir d'une ligne
      d'équipement/atout héritée. Formes rencontrées dans les catalogues :
      "Cyberdeck (Attaque 4, Firewall 4)", "Cyberdeck Shiawase Cyber-5
      (Att 8, FW 7, DP 5)", "Cyberdeck Erika MCD-1 (Firewall 1, moniteur
      matriciel 6 cases, 1 Programme, relance 1 échec)". Extraction par
      mots-clés (insensible à la casse), tolérante aux abréviations. Ne perd
      jamais le texte d'origine (conservé dans `legacyText` — la ligne reste
      en outre intacte dans equip/augs/edges, jamais retirée par l'appelant).
      Renvoie `null` si la chaîne ne ressemble pas à un cyberdeck. Utilisée
      par la migration Storage (v4, copie autonome — cf. storage.js) et
      disponible ici pour un ré-essai manuel (bouton « reparser » éventuel). */
  parseLegacy(str, edition) {
    if (typeof str !== "string" || !/cyberdeck/i.test(str)) return null;
    const num = (re) => {
      const m = str.match(re);
      return m ? parseInt(m[1], 10) : 0;
    };
    const rawAttrs = {
      attack: num(/(?:attaque|att)\s*[:\s]?\s*(\d+)/i),
      sleaze: num(/(?:corruption|corr|sleaze)\s*[:\s]?\s*(\d+)/i),
      dataProcessing: num(/(?:traitement de donn[ée]es|tdd|dp)\s*[:\s]?\s*(\d+)/i),
      firewall: num(/(?:firewall|fw)\s*[:\s]?\s*(\d+)/i),
    };
    const keys = (this._model(edition) || {}).attrKeys || Object.keys(rawAttrs);
    const attrs = {};
    for (const k of keys) attrs[k] = rawAttrs[k] || 0;
    const nameMatch = str.match(/^Cyberdeck\s+([^(]+?)\s*\(/i);
    return {
      name: nameMatch ? nameMatch[1].trim() : "",
      attrs,
      programs: [],
      reroll: num(/relance\s+(?:de\s+)?(\d+)\s+[ée]chec/i),
      biofeedbackFilter: /biofeedback/i.test(str),
      filled: 0,
      legacyText: str,
    };
  },

  /** Génération : structure `pnj.cyberdeck` depuis la 1ère ligne "Cyberdeck…"
      trouvée dans equip/augs/edges, si pas déjà structuré. Miroir *runtime*
      de la migration Storage v4 (storage.js) — mais ici les modules d'édition
      sont chargés, donc parseLegacy restreint les attrs au sous-ensemble de
      l'édition (cyberdeckModel.attrKeys) au lieu de tout garder. Idempotent ;
      appelée en fin de generate() par chaque édition. */
  hydrate(pnj, edition) {
    if (!pnj || pnj.cyberdeck) return pnj;
    const pools = [...(pnj.equip || []), ...(pnj.augs || []), ...(pnj.edges || [])];
    const line = pools // #63 : item chaîne OU objet
      .map((s) => ItemResolver.itemStr(s))
      .find((s) => /cyberdeck/i.test(s));
    if (line) pnj.cyberdeck = this.parseLegacy(line, edition);
    return pnj;
  },

  /** Choix explicite d'un deck depuis le catalogue d'équipement (EditModal) :
      (re)configure `pnj.cyberdeck` à partir d'une ligne "Cyberdeck …" — attrs
      + nom via parseLegacy — en PRÉSERVANT le curage déjà fait par le joueur
      (programmes choisis, loadout d'actions, cases de moniteur remplies). Le
      joueur peut donc changer de matériel sans reperdre son paramétrage. À la
      différence de hydrate() (idempotent, ne s'active que si pas de deck), ce
      point d'entrée ÉCRASE volontairement les attrs. `null` si la ligne n'est
      pas un cyberdeck. */
  setFromLine(pnj, str, edition) {
    const fresh = this.parseLegacy(str, edition);
    if (!fresh) return null;
    const prev = pnj.cyberdeck;
    if (prev) {
      fresh.programs = prev.programs || [];
      fresh.loadout = prev.loadout; // peut être absent → défaut paresseux « tout »
      fresh.filled = prev.filled || 0;
    }
    pnj.cyberdeck = fresh;
    return fresh;
  },
};
