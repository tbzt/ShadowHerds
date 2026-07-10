"use strict";

/* ============================================================
   PORTRAIT — génération de portraits IA à la demande, via
   Pollinations (endpoint anonyme, aucune clé requise — le repo est
   public sur GitHub Pages, donc aucun secret à exposer). Fonctionnalité
   opt-in : cf. Settings.getPortraitSettings(). Agnostique à l'édition :
   ne lit que des champs génériques (meta, gender, archetype, role...),
   jamais App.edition.
   ============================================================ */
const Portrait = {
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

  /** Construit la description (sans le suffixe de DA) selon le type
      d'entité. Les esprits/créatures sont des objets PNJ (pnj.type),
      les contacts sont des objets distincts (role/metatype/trait). */
  _describe(entity) {
    if (entity.type === "spirit") {
      const power = entity.force ?? entity.tier;
      return `${entity.name}, astral spirit${power ? `, power ${power}` : ""}, ethereal, translucent`;
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
    const meta = this._METATYPE_TRAITS[entity.meta] || entity.meta || "";
    const gender = this._GENDER_TRAITS[entity.gender] || "";
    const archetype = entity.archetype || "";
    const appearance = this._appearanceFor(entity);
    const roleLook = this._ROLE_LOOK[entity.role] || "";
    const look = this._MILIEU_LOOK[entity.milieu] || "";
    const flavor = this._flavorDetails(entity);
    return `portrait of a ${gender} ${archetype}, ${meta}${appearance ? `, ${appearance}` : ""}${roleLook ? `, ${roleLook}` : ""}${look ? `, ${look}` : ""}${flavor ? `, ${flavor}` : ""}`
      .replace(/\s+/g, " ")
      .trim();
  },

  _url(entity) {
    const prompt = `${this._describe(entity)}, ${this.PROMPT_SUFFIX}`;
    return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=512&height=512&nologo=true`;
  },

  /** Précharge l'URL via une balise <img> — Pollinations bloque les
      requêtes fetch() « nues » derrière une vérification anti-bot
      (Cloudflare Turnstile) que la balise <img> ne déclenche pas ; on
      valide donc par chargement réel plutôt que par fetch(). */
  _validate(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const timer = setTimeout(() => {
        img.onload = img.onerror = null;
        reject(new Error("Délai dépassé — le service est peut-être surchargé."));
      }, 20000);
      img.onload = () => {
        clearTimeout(timer);
        resolve();
      };
      img.onerror = () => {
        clearTimeout(timer);
        reject(new Error("Génération impossible (limite de requêtes atteinte ?)."));
      };
      img.src = url;
    });
  },

  _startLoading(btn) {
    if (!btn) return;
    btn.disabled = true;
    btn.dataset.origLabel = btn.textContent;
    btn.textContent = "Génération…";
  },
  _stopLoading(btn) {
    if (!btn) return;
    btn.disabled = false;
    btn.textContent = btn.dataset.origLabel || "Portrait IA";
  },

  /** PNJ, esprit ou créature (tous résolus via PnjLookup, tous persistés
      via Shadows.save() — même convention que les autres callers de
      PnjLookup.find, ex. UI.cycleDrug). */
  async generateForPnj(id, btn) {
    const pnj = PnjLookup.find(id);
    if (!pnj) return;
    this._startLoading(btn);
    const url = this._url(pnj);
    try {
      await this._validate(url);
      pnj.portraitUrl = url;
      Shadows.save();
      CardRenderer.refresh(pnj);
    } catch (e) {
      toast(e.message);
      this._stopLoading(btn);
    }
  },

  /** Contact — persisté via ContactsBook (collection séparée). */
  async generateForContact(id, btn) {
    const c = ContactsBook.data.all.find((x) => x.id === id);
    if (!c) return;
    this._startLoading(btn);
    const url = this._url(c);
    try {
      await this._validate(url);
      ContactsBook.editField(id, "portraitUrl", url);
      ContactsBook.render();
    } catch (e) {
      toast(e.message);
      this._stopLoading(btn);
    }
  },

  /* ---- Lightbox : clic sur une vignette → affichage en grand.
     Même patron que ContentModal (js/widgets/contentmodal.js) : overlay
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
