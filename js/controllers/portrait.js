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
     "orc de fantasy" observé en test — cf. mémoire du projet. */
  _METATYPE_TRAITS: {
    Humain: "human",
    Elfe: "elf, pointed ears",
    Nain: "dwarf, short stature, sturdy build",
    Ork: "human-like proportions, subtle grey-green skin undertone, two small tusks protruding upward from the lower lip",
    Troll: "tall and broad-shouldered, small horns, thick skin",
  },

  _GENDER_TRAITS: { M: "male", F: "female", NB: "androgynous" },

  /** Construit la description (sans le suffixe de DA) selon le type
      d'entité. Les esprits/créatures sont des objets PNJ (pnj.type),
      les contacts sont des objets distincts (role/metatype/trait). */
  _describe(entity) {
    if (entity.type === "spirit") {
      const power = entity.force ?? entity.tier;
      return `${entity.name}, astral spirit${power ? `, power ${power}` : ""}, ethereal, translucent`;
    }
    if (entity.type === "creature") {
      const lore = entity.lore ? `, ${entity.lore}` : "";
      return `${entity.name}, paranormal creature${lore}`;
    }
    // Contact : pas de champ "type", identifié par son rôle.
    if (!entity.type && entity.role && !entity.archetype) {
      const meta = this._METATYPE_TRAITS[entity.metatype] || "";
      const trait = entity.trait ? `, ${entity.trait}` : "";
      return `portrait of a ${entity.role}${meta ? `, ${meta}` : ""}${trait}`;
    }
    // PNJ standard.
    const meta = this._METATYPE_TRAITS[entity.meta] || entity.meta || "";
    const gender = this._GENDER_TRAITS[entity.gender] || "";
    const archetype = entity.archetype || "";
    return `portrait of a ${gender} ${archetype}, ${meta}`.replace(/\s+/g, " ").trim();
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
};
