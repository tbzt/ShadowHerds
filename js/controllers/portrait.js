"use strict";

/* ============================================================
   PORTRAIT — génération de portraits IA à la demande, via
   Pollinations (endpoint anonyme, aucune clé requise — le repo est
   public sur GitHub Pages, donc aucun secret à exposer). Fonctionnalité
   opt-in : cf. Settings.getPortraitSettings(). Agnostique à l'édition :
   ne lit que des champs génériques (meta, gender, archetype, role...),
   jamais App.edition.
   ============================================================ */
export const Portrait = {
  PROMPT_SUFFIX:
    "cyberpunk digital painting, dramatic rim lighting, muted teal and magenta palette, highly detailed, concept art style",

  /* Traits physiques par métatype (SR5/SR6/Anarchy partagent les mêmes
     libellés FR : "Humain", "Elfe", "Nain", "Ork", "Troll"). Décrire les
     traits un à un plutôt que le mot "ork"/"troll" seul évite le biais
     "orc de fantasy" observé en test — cf. mémoire du projet. Pas de teinte
     de peau imposée ici : contrairement au cliché fantasy, les Orks/Trolls
     canon Shadowrun couvrent la même diversité de teint que les autres
     métatypes (teint olive, foncé, clair...) — le teint vient uniquement
     de _APPEARANCE_DIVERSITY, appliquée à tous les métatypes. Le trait
     distinctif (défenses, cornes) est placé en tête et formulé sans
     "subtle"/"small" : ces qualificatifs font disparaître le trait au
     rendu (observé en test — les défenses des Orks ne ressortaient pas).*/
  _METATYPE_TRAITS: {
    Humain: "human",
    Elfe: "elf, pointed ears",
    Nain: "dwarf, short stature, sturdy build",
    Ork: "visible tusks jutting from the lower jaw, broad jaw, prominent brow, human-like proportions",
    Troll: "visible horns on the forehead, tall and broad-shouldered, thick skin texture",
  },

  /* Métavariantes, métaconsciences et zoocanthropes (pnj.metavariant,
     posé à la génération SR5/SR6 — cf. js/rules/metavariants.js). Quand
     présent, remplace _METATYPE_TRAITS plutôt que s'y ajouter : le nom de
     métavariante encode déjà une identité visuelle cohérente avec le
     métatype de base (ex. Oni implique Ork), les cumuler ferait doublon. */
  _METAVARIANT_LOOK: {
    // Troll
    Cyclope: "cyclops, single large central eye, towering muscular troll build",
    Fomori: "fomori, twisted asymmetrical troll features, gnarled hunched frame",
    Géant: "giant, immense towering troll build, larger than an ordinary troll",
    Minotaure: "minotaur, bull-like head with curved horns, powerful troll build",
    // Ork
    Hobgobelin: "hobgoblin, lean wiry ork build, sharp angular features",
    Ogre: "ogre, hulking heavyset ork build, thick brutish features",
    Oni: "oni, red-tinted skin, small horns, fierce ork features",
    Satyre: "satyr, small goat-like horns, ork build with a mischievous look",
    // Nain
    Gnome: "gnome, small wiry dwarf build, sharp intelligent eyes",
    Hanuman: "hanuman, monkey-like features, prehensile tail, agile dwarf build",
    Koborokuru: "koborokuru, small stocky dwarf build, weathered features",
    Menehune: "menehune, small sturdy dwarf build, warm island features",
    Duende: "duende, small dwarf build with sharp mischievous features",
    // Elfe
    Dryade: "dryad, willowy elf build, faint bark-like skin texture, leaf-like hair",
    Nocturna: "nocturna, pale elf build, large light-sensitive eyes, nocturnal features",
    Wakyambi: "wakyambi, tall elongated limbs, graceful elf build",
    "Xapiri thëpè": "elf build with vivid natural body markings, forest-attuned features",
    Dalakitnon: "elf build with faint luminous skin markings",
    // Humain
    Nartaki: "nartaki, an extra pair of arms, human build",
    Valkyrie: "valkyrie, tall powerful human build, commanding presence",
    // Métaconsciences
    Centaure: "centaur, human torso fused with a horse body, muscular build",
    Naga: "naga, human torso with a long serpent lower body, ornate scales",
    Pixie: "small winged humanoid pixie, delicate features, faint magical glow",
    Sasquatch: "towering ape-like hominid, thick fur, broad shoulders",
    Triton: "triton, aquatic humanoid with fish-like lower body or fins, ocean-attuned features",
    // Zoocanthropes
    Bovin: "human with bovine features, small horns, broad sturdy build",
    Canin: "human with canine features, sharp teeth, alert posture",
    Équin: "human with equine features, elongated face, powerful build",
    Falcin: "human with falcon-like features, sharp eyes, lean build",
    Léonin: "human with leonine features, mane-like hair, powerful build",
    Lupin: "human with wolf-like features, sharp teeth, keen eyes",
    Panthérin: "human with panther-like features, sleek build, sharp eyes",
    Tigrin: "human with tiger-like features, faint striped markings, powerful build",
    Ursin: "human with bear-like features, broad heavy build",
    Vulpin: "human with fox-like features, sharp narrow face, agile build",
  },

  /* Types d'esprit (spirit.spiritType, posé par Spirits.spawn — mêmes
     clés SR5/SR6/Anarchy pour air/betes/eau/feu/terre). */
  _SPIRIT_TYPE_LOOK: {
    air: "swirling translucent form of wind and mist, crackling with faint static",
    betes: "beast-like astral form, feral animalistic silhouette, predatory posture",
    eau: "flowing translucent form made of rippling water, droplets suspended in the air",
    feu: "humanoid silhouette made of shifting flame and ember, glowing core",
    homme: "human-shaped astral silhouette, calm and composed, faint glowing outline",
    terre: "hulking rocky astral form, cracked stone texture, heavy and grounded",
    aines: "ancient sage-like astral spirit, faint runic patterns, wise imposing presence",
    plantes: "astral form woven from vines and roots, faint bioluminescent leaves",
  },

  _GENDER_TRAITS: { M: "male", F: "female", NB: "androgynous" },

  /* Diversité d'apparence — sans ça, le modèle retombe par défaut sur des
     portraits à peau claire. originPool (bassin de noms) n'est pas
     conservé sur le PNJ après génération (seulement utilisé pour tirer un
     nom), donc plutôt que de deviner une origine depuis le nom (fragile,
     réducteur), on tire un teint/des traits de façon stable par PNJ (hash
     de l'id, pas aléatoire à chaque génération) — appliqué à tous les
     métatypes, Ork/Troll compris (cf. note sur _METATYPE_TRAITS). */
  _APPEARANCE_DIVERSITY: [
    "fair skin, Northern European features",
    "olive skin, Mediterranean features",
    "dark skin, African features",
    "brown skin, South Asian features",
    "tan skin, Latin American features",
    "East Asian features",
    "light brown skin, Middle Eastern features",
    "Indigenous American features",
    "Pacific Islander features, sun-tanned skin",
    "mixed heritage features, medium skin tone",
  ],
  _hash(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
    return Math.abs(h);
  },
  _appearanceFor(entity) {
    const pool = this._APPEARANCE_DIVERSITY;
    return pool[this._hash(entity.id || entity.name || "") % pool.length];
  },

  /* Détails visuels tirés du "portrait" narratif (âge, signe distinctif,
     style, attitude) — posé par Flavor.apply() sur tout PNJ/contact
     généré. Manie et motivation sont comportementales, pas visuelles :
     volontairement exclues. */
  _flavorDetails(entity) {
    const f = entity.flavor;
    if (!f) return "";
    const bits = [];
    if (Number.isFinite(f.age)) bits.push(`around ${f.age} years old`);
    if (f.signe) bits.push(f.signe);
    if (f.style) bits.push(f.style);
    if (f.attitude) bits.push(f.attitude);
    return bits.join(", ");
  },

  /* Habillage/décor par milieu (pnj.milieu, posé à la génération par
     Coherence.resolveTuple — cf. js/rules/coherence.js MILIEUX). Sans ça,
     le suffixe de DA fixe ("cyberpunk...") pousse le modèle vers un look
     "shadowrunner de rue" par défaut, même pour un cadre corpo ou un
     militaire. */
  _MILIEU_LOOK: {
    corpo: "sharp tailored business suit, corporate office backdrop, clean composition, confident executive posture",
    securite_corpo: "tactical corporate security uniform, body armor, company badge, sterile facility background",
    police: "police uniform or riot gear, badge, urban patrol background",
    militaire: "military fatigues or combat armor, disciplined stance, tactical outdoor backdrop",
    crime: "sharp mob-style suit or gang colors, dim backroom background, dangerous aura",
    gang: "streetwear, gang colors and tattoos, gritty urban alley background",
    rue: "worn street clothes, gritty urban background",
    ombres: "utilitarian tactical streetwear, neon-lit alley background",
  },

  /* Accessoires/pose par rôle (pnj.role, même origine). Complète le
     milieu sans le remplacer — un mage corpo reste en tenue de sécurité,
     mais doit rester visuellement identifiable comme mage : pas de
     "subtle" (le rendu l'ignore, cf. note _METATYPE_TRAITS), un vrai
     marqueur visible (aura, symboles lumineux). */
  _ROLE_LOOK: {
    mage: "faint glowing magical aura around the hands, glowing arcane markings on the skin, mystic focus item",
    chamane: "tribal totemic markings glowing faintly, natural mystic aura, ritual charms",
    adepte: "athletic build, minimal gear, focused expression",
    decker: "AR glasses, wired data jack",
    rigger: "grease-stained gear, tool harness",
    technicien: "tool belt, work gloves",
    infiltrateur: "dark stealth-oriented clothing",
  },

  /* Augmentations VISIBLES (la chrome, signature de Shadowrun) tirées de
     pnj.augs ET de la cyberware rangée dans equip (ItemResolver.augItems,
     clés d'aug lues sur le module d'édition via App.getEditionModule —
     accesseur neutre, jamais une branche `if (App.edition === …)`).
     Volontairement PARTIEL : seules les augmentations qui se VOIENT sur un
     portrait comptent. Les augmentations internes (réflexes câblés, boosters
     synaptiques, densité osseuse/musculaire, accroissement de réaction…) ne
     changent rien à l'image → exclues, comme manie/motivation le sont du
     flavor. Descripteurs FRANCS (pas de "subtle"/"small", qui disparaissent
     au rendu — cf. note _METATYPE_TRAITS). Table de paires [regex FR → repère
     visuel EN] : les libellés du catalogue sont en français (« Yeux
     cybernétiques », « Bras cybernétique [remplacement…] »), on matche des
     sous-chaînes. Ordre important : les lames avant les membres (un
     « Bras-tronçonneuse » doit ressortir comme lame, pas comme simple bras),
     un seul repère retenu par item (premier match). */
  _AUGMENT_LOOK: [
    [/yeux cyber|cyber-?yeux/i, "glowing cybernetic eyes with visible metallic optical implants"],
    [/oreilles? cyber/i, "cybernetic ear implants"],
    [/datajack|prise de données/i, "a datajack port on the temple with a thin trailing cable"],
    [/lame rétractable|éperons?|égide de poignet|tronçonneuse/i, "retractable blade spurs extending from the forearm"],
    [/bras cyber|avant-bras cyber|main cyber|bras entier cyber|bras simien/i, "a chrome cybernetic arm"],
    [/jambe cyber|bas de jambe/i, "a chrome cybernetic leg"],
    [/crâne cyber/i, "partially exposed cybernetic skull plating"],
    [/armure dermique|blindage dermique/i, "visible subdermal armor plating under the skin"],
  ],
  _MAX_AUGMENT_CUES: 3,

  /** Repères visuels de chrome pour un PNJ. augItems (socle ItemResolver)
      fusionne pnj.augs + la cyberware d'equip selon les AUGS_KEYS de
      l'édition (undefined en Anarchy → retombe sur pnj.augs, souvent vide).
      Dédoublonne et plafonne pour ne pas noyer le prompt. */
  _augmentDetails(entity) {
    const items = ItemResolver.augItems(
      entity,
      App.getEditionModule(entity.edition)?.AUGS_KEYS,
    );
    const cues = [];
    for (const it of items) {
      const s = ItemResolver.itemStr(it);
      for (const [re, cue] of this._AUGMENT_LOOK) {
        if (re.test(s) && !cues.includes(cue)) {
          cues.push(cue);
          break;
        }
      }
      if (cues.length >= this._MAX_AUGMENT_CUES) break;
    }
    return cues.join(", ");
  },

  /** Mots-clés descriptifs d'un PJ (Anarchy : pnj.keywords, saisis à la
      création). Texte libre FR laissé tel quel (le modèle le tolère), mais on
      retire celui qui répète le métatype (souvent keywords[0], déjà rendu par
      _METATYPE_TRAITS) et on plafonne à 3 pour borner la longueur du prompt. */
  _keywordDetails(entity) {
    if (!Array.isArray(entity.keywords) || !entity.keywords.length) return "";
    const metaLabel = String(entity.meta || "").toLowerCase();
    const seen = new Set();
    const out = [];
    for (const k of entity.keywords) {
      const t = String(k || "").trim();
      const low = t.toLowerCase();
      if (!t || low === metaLabel || seen.has(low)) continue;
      seen.add(low);
      out.push(t);
      if (out.length >= 3) break;
    }
    return out.join(", ");
  },

  /** Construit la description (sans le suffixe de DA) selon le type
      d'entité. Les esprits/créatures sont des objets PNJ (pnj.type),
      les contacts sont des objets distincts (role/metatype/trait). */
  _describe(entity) {
    if (entity.type === "spirit") {
      const power = entity.force ?? entity.tier;
      const look =
        this._SPIRIT_TYPE_LOOK[entity.spiritType] || "ethereal, translucent astral form";
      return `${entity.name}, astral spirit${power ? `, power ${power}` : ""}, ${look}`;
    }
    if (entity.type === "creature") {
      // visualTag (catalogue) : descripteur visuel dédié, prioritaire sur
      // le lore narratif (habitat/comportement, peu exploitable en prompt).
      const visual = entity.visualTag || entity.lore || "";
      return `${entity.name}${visual ? `, ${visual}` : ""}, paranormal creature`;
    }
    // Contact : pas de champ "type", identifié par son rôle.
    if (!entity.type && entity.role && !entity.archetype) {
      const meta = this._METATYPE_TRAITS[entity.metatype] || "";
      const appearance = this._appearanceFor({ id: entity.id, meta: entity.metatype });
      const trait = entity.trait ? `, ${entity.trait}` : "";
      const flavor = this._flavorDetails(entity);
      return `portrait of a ${entity.role}${meta ? `, ${meta}` : ""}${appearance ? `, ${appearance}` : ""}${trait}${flavor ? `, ${flavor}` : ""}`;
    }
    // PNJ standard : métatype + archétype + apparence + rôle (identité
    // visuelle prioritaire — un mage doit rester identifiable comme mage
    // même sous une tenue de sécurité) + décor du milieu + portrait narratif.
    // Une métavariante (Oni, Naga, Léonin...) remplace le métatype de base :
    // le nom encode déjà une identité visuelle cohérente avec ce métatype.
    const meta =
      this._METAVARIANT_LOOK[entity.metavariant] ||
      this._METATYPE_TRAITS[entity.meta] ||
      entity.meta ||
      "";
    const gender = this._GENDER_TRAITS[entity.gender] || "";
    const archetype = entity.archetype || "";
    const appearance = this._appearanceFor(entity);
    const roleLook = this._ROLE_LOOK[entity.role] || "";
    const augs = this._augmentDetails(entity);
    const keywords = this._keywordDetails(entity);
    const look = this._MILIEU_LOOK[entity.milieu] || "";
    const flavor = this._flavorDetails(entity);
    return `portrait of a ${gender} ${archetype}, ${meta}${appearance ? `, ${appearance}` : ""}${roleLook ? `, ${roleLook}` : ""}${augs ? `, ${augs}` : ""}${keywords ? `, ${keywords}` : ""}${look ? `, ${look}` : ""}${flavor ? `, ${flavor}` : ""}`
      .replace(/\s+/g, " ")
      .trim();
  },

  /** Prompt de portrait = description de l'entité + suffixe de DA. */
  _prompt(entity) {
    return `${this._describe(entity)}, ${this.PROMPT_SUFFIX}`;
  },

  /** PNJ, esprit ou créature (résolus via PnjLookup, persistés via
      Shadows.save()). Génération déléguée à `Pollinations` (file d'attente
      partagée, token/anonyme, retries) ; Portrait ne garde que le prompt et la
      persistance du résultat. */
  generateForPnj(id, btn) {
    const pnj = PnjLookup.find(id);
    if (!pnj) return;
    Pollinations.generate({
      prompt: this._prompt(pnj),
      token: Settings.getPortraitSettings().token,
      btn,
      label: pnj.name || "PNJ",
      onSuccess: (url) => {
        pnj.portraitUrl = url;
        Shadows.save();
        CardRenderer.refresh(pnj);
      },
    });
  },

  /** Contact — persisté via ContactsBook (collection séparée). */
  generateForContact(id, btn) {
    const c = ContactsBook.data.all.find((x) => x.id === id);
    if (!c) return;
    Pollinations.generate({
      prompt: this._prompt(c),
      token: Settings.getPortraitSettings().token,
      btn,
      label: c.name || "Contact",
      onSuccess: (url) => {
        ContactsBook.editField(id, "portraitUrl", url);
        ContactsBook.render();
      },
    });
  },

  /* ---- Lightbox : clic sur une vignette → affichage en grand.
     Même patron que ContentModal (js/widgets/kit/contentmodal.js) : overlay
     paresseux, fermeture au clic dehors / croix / Échap, délégation sur
     data-* (aucun onclick inline). ---- */
  _previewEl: null,
  _previewDelegated: false,

  bindDelegation() {
    if (this._previewDelegated) return;
    this._previewDelegated = true;
    document.addEventListener("click", (e) => {
      const el = e.target.closest("[data-portrait-preview]");
      if (el) this.showPreview(el.dataset.portraitPreview);
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        this.hidePreview();
        return;
      }
      if (e.key !== "Enter" && e.key !== " ") return;
      const el = e.target.closest && e.target.closest("[data-portrait-preview]");
      if (el) {
        e.preventDefault();
        this.showPreview(el.dataset.portraitPreview);
      }
    });
  },

  _ensurePreview() {
    if (this._previewEl) return this._previewEl;
    const overlay = document.createElement("div");
    overlay.className = "portrait-preview-overlay";
    overlay.innerHTML = `
      <div class="portrait-preview-box">
        <button class="portrait-preview-close" aria-label="Fermer">&times;</button>
        <img class="portrait-preview-img" alt="Portrait généré">
      </div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) this.hidePreview();
    });
    overlay
      .querySelector(".portrait-preview-close")
      .addEventListener("click", () => this.hidePreview());
    this._previewEl = overlay;
    return overlay;
  },

  showPreview(url) {
    const el = this._ensurePreview();
    el.querySelector(".portrait-preview-img").src = url;
    el.classList.add("visible");
  },

  hidePreview() {
    if (this._previewEl) this._previewEl.classList.remove("visible");
  },
};

// Pont couche 5 (migration modules ES) — retiré en fin de migration.
window.Portrait = Portrait;
