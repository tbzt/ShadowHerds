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
      valide donc par chargement réel plutôt que par fetch(). Retourne
      l'URL telle quelle : c'est elle qui sera stockée et réaffichée. */
  _loadViaImg(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const timer = setTimeout(() => {
        img.onload = img.onerror = null;
        reject(new Error("Délai dépassé — le service est peut-être surchargé."));
      }, 20000);
      img.onload = () => {
        clearTimeout(timer);
        resolve(url);
      };
      img.onerror = () => {
        clearTimeout(timer);
        reject(new Error("Génération impossible (limite de requêtes atteinte ?)."));
      };
      img.src = url;
    });
  },

  /** Avec un token personnel (Réglages), on passe par fetch() + header
      Authorization — <img> ne peut pas porter de header. La réponse est
      convertie en data URL (pas un blob: URL, qui ne survivrait pas à un
      rechargement de page) pour rester stockable comme les URLs directes. */
  async _loadViaToken(url, token) {
    let resp;
    try {
      resp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    } catch {
      throw new Error("Génération impossible — vérifiez la connexion.");
    }
    if (!resp.ok) {
      throw new Error(`Pollinations a répondu ${resp.status} (token invalide ?).`);
    }
    const blob = await resp.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("Réponse illisible."));
      reader.readAsDataURL(blob);
    });
  },

  /** Résout l'URL finale à stocker pour un portrait — chemin token ou
      chemin anonyme selon Settings.getPortraitSettings().token. */
  _resolve(url) {
    const token = Settings.getPortraitSettings().token;
    return token ? this._loadViaToken(url, token) : this._loadViaImg(url);
  },

  _startLoading(btn, label = "Génération…") {
    if (!btn) return;
    btn.disabled = true;
    if (btn.dataset.origLabel === undefined) btn.dataset.origLabel = btn.textContent;
    btn.textContent = label;
  },
  _stopLoading(btn) {
    if (!btn) return;
    btn.disabled = false;
    btn.textContent = btn.dataset.origLabel || "Portrait IA";
    delete btn.dataset.origLabel;
  },

  /* ---- File d'attente — Pollinations (anonyme) n'accepte qu'une requête
     à la fois par IP ("Queue full", cf. tests manuels). Empiler plusieurs
     clics "Portrait IA" plutôt que de les lancer en parallèle évite
     l'échec immédiat ; un échec malgré tout (surcharge du service) est
     retenté automatiquement avant de déranger l'utilisateur. */
  _queue: [],
  _processing: false,
  _MAX_ATTEMPTS: 3,
  _RETRY_DELAY_MS: 4000,

  _enqueue(job) {
    const idle = !this._processing && this._queue.length === 0;
    this._queue.push(job);
    this._startLoading(job.btn, idle ? "Génération…" : `En file (${this._queue.length})…`);
    this._processQueue();
  },

  async _processQueue() {
    if (this._processing) return;
    this._processing = true;
    while (this._queue.length) {
      const job = this._queue.shift();
      await this._runJob(job);
    }
    this._processing = false;
  },

  async _runJob(job, attempt = 1) {
    this._startLoading(job.btn, attempt > 1 ? `Nouvel essai (${attempt}/${this._MAX_ATTEMPTS})…` : "Génération…");
    try {
      const resolvedUrl = await this._resolve(job.url);
      job.onSuccess(resolvedUrl);
    } catch (e) {
      if (attempt < this._MAX_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, this._RETRY_DELAY_MS * attempt));
        return this._runJob(job, attempt + 1);
      }
      toast(`${job.label} — ${e.message}`);
      this._stopLoading(job.btn);
    }
  },

  /** PNJ, esprit ou créature (tous résolus via PnjLookup, tous persistés
      via Shadows.save() — même convention que les autres callers de
      PnjLookup.find, ex. UI.cycleDrug). */
  generateForPnj(id, btn) {
    const pnj = PnjLookup.find(id);
    if (!pnj) return;
    const url = this._url(pnj);
    this._enqueue({
      btn,
      url,
      label: pnj.name || "PNJ",
      onSuccess: (resolvedUrl) => {
        pnj.portraitUrl = resolvedUrl;
        Shadows.save();
        CardRenderer.refresh(pnj);
      },
    });
  },

  /** Contact — persisté via ContactsBook (collection séparée). */
  generateForContact(id, btn) {
    const c = ContactsBook.data.all.find((x) => x.id === id);
    if (!c) return;
    const url = this._url(c);
    this._enqueue({
      btn,
      url,
      label: c.name || "Contact",
      onSuccess: (resolvedUrl) => {
        ContactsBook.editField(id, "portraitUrl", resolvedUrl);
        ContactsBook.render();
      },
    });
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

// Pont couche 5 (migration modules ES) — retiré en fin de migration.
window.Portrait = Portrait;
