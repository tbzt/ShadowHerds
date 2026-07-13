"use strict";

/* ============================================================
   UI — interactions live (moniteurs, drogues, véhicules/drones liés).
   L'invocation d'esprits vit dans SummonPanel (CH-A7 : UI était un
   fourre-tout mélangeant plusieurs domaines fonctionnels autonomes).
   ============================================================ */
const UI = {
  /** Clic sur une case de moniteur. Mute TOUTES les copies vivantes de
      l'entité et persiste tous les stores concernés (`_entityCopies`/
      `persistEntity`, motif F2) — corrige un bug latent trouvé en vérifiant
      E3 : un PJ (léger ou complet) ne vit que dans `Characters`, jamais
      `Shadows` ; l'ancien `Shadows.save()` inconditionnel ne persistait
      donc jamais une case cochée sur un PJ (perdue au reload), et une
      entité à copies multiples (pool+biblio) ne mutait que la première
      trouvée par `PnjLookup.find`. */
  toggleMonitor(pnjId, type, idx) {
    const copies = this._entityCopies(pnjId);
    if (!copies.length) return;

    // Mapping type → champ du PNJ
    const fieldMap = {
      phys: "physFilled",
      stun: "stunFilled",
      mon: "monFilled",
      ment: "mentFilled",
      mat: "matFilled",
      // Anarchy 2.0 : moniteur d'état unique à cases fixes (léger/grave/incap)
      leger: "legerFilled",
      grave: "graveFilled",
      incap: "incapFilled",
    };
    const field = fieldMap[type] || "monFilled";
    for (const pnj of copies) {
      if (pnj[field] === undefined) pnj[field] = 0;
      pnj[field] = idx < pnj[field] ? idx : idx + 1;
    }

    this.persistEntity(pnjId);
    CardRenderer.refresh(copies[0]);
    // Vague D : cocher/décocher un moniteur peut basculer « hors de combat » ou
    // le drapeau « devrait fuir » d'un combattant → rafraîchir le tracker.
    if (typeof Encounter !== "undefined") Encounter.notifyPnjChanged(copies[0]);
  },

  /** M2 (PLAN_MATRICE_CYBERDECK.md) : case du moniteur matriciel du DECK
      (`pnj.cyberdeck.filled`), distinct de toggleMonitor ci-dessus (qui ne
      connaît que des champs top-level `pnj.*Filled`). Même motif copies
      multiples + persistEntity (F2) que le reste de cette section. */
  toggleDeckMonitor(pnjId, idx) {
    const copies = this._entityCopies(pnjId);
    if (!copies.length) return;
    for (const pnj of copies) {
      if (!pnj.cyberdeck) continue;
      const cur = pnj.cyberdeck.filled || 0;
      pnj.cyberdeck.filled = idx < cur ? idx : idx + 1;
    }
    this.persistEntity(pnjId);
    CardRenderer.refresh(copies[0]);
  },

  /** M2 : réallocation ASDF/ACTF en un tap — échange les valeurs de deux
      attributs matriciels du deck (SR5 : action gratuite p.229 ; SR6 :
      action mineure p.185 — cf. cyberdeckModel.reallocCostLabel).
      Masqué en Anarchy côté rendu (Cyberdeck.reallocatable() false), donc
      jamais appelable depuis l'UI pour ces éditions — pas de garde ici. */
  reallocDeck(pnjId, fromKey, toKey) {
    const copies = this._entityCopies(pnjId);
    if (!copies.length) return;
    for (const pnj of copies) {
      if (!pnj.cyberdeck || !pnj.cyberdeck.attrs) continue;
      const a = pnj.cyberdeck.attrs;
      const tmp = a[fromKey];
      a[fromKey] = a[toKey];
      a[toKey] = tmp;
    }
    this.persistEntity(pnjId);
    CardRenderer.refresh(copies[0]);
    toast("Cyberdeck reconfiguré.");
  },

  /* ========================================================
     JOURNAL DE FICHE (F2) — notes datées, empilées en tête.
     Champ ADDITIF `pnj.journal = [{ts, text}]` : voyage tel quel
     dans les exports (Backup sérialise les tableaux *_all en bloc)
     et est lu par la recherche plein-fiche (Utils.entityContent).
     ======================================================== */

  /** Toutes les COPIES vivantes d'une entité, par id. Un PNJ généré puis
      sauvegardé garde une entrée dans Gen.pool ET dans une bibliothèque ; après
      un reload ces copies sont désérialisées SÉPARÉMENT (mêmes valeurs,
      références distinctes). Muter/persister toutes les copies garde le journal
      cohérent quelle que soit la carte affichée (générateur ou Hub). */
  _entityCopies(id) {
    const out = [];
    const scan = (arr) => {
      if (arr) for (const e of arr) if (e && e.id === id) out.push(e);
    };
    if (typeof Gen !== "undefined") scan(Gen.pool);
    scan(Shadows.data.all);
    if (typeof Characters !== "undefined") scan(Characters.data.all);
    if (typeof ContactsBook !== "undefined") scan(ContactsBook.data.all);
    if (typeof Servers !== "undefined") {
      const sp = Servers.findSpider(id);
      if (sp) out.push(sp);
    }
    return out;
  },

  /** Persiste tous les stores contenant l'id (pas de branche d'édition ;
      route par appartenance). */
  persistEntity(id) {
    if (typeof Gen !== "undefined" && Gen.findInPool(id)) Gen._savePool();
    if (Shadows.data.all.some((p) => p.id === id)) Shadows.save();
    if (typeof Characters !== "undefined" && Characters.data.all.some((p) => p.id === id))
      Characters.save();
    if (typeof ContactsBook !== "undefined" && ContactsBook.data.all.some((p) => p.id === id))
      ContactsBook.save();
    if (typeof Servers !== "undefined" && Servers.findSpider(id)) Servers.save();
  },

  /** Rafraîchit la ou les cartes affichées d'une entité, en routant par
      appartenance comme `persistEntity` : un contact vit dans une grille de
      Collection (ContactsBook.render), les autres entités dans des `.pnj-card`
      (CardRenderer.refresh, qui balaie déjà toutes les copies DOM). Point
      d'entrée commun du journal (toggle/ajout/retrait), qui s'affiche
      désormais aussi bien sur un PNJ que sur un contact. */
  refreshEntityCard(id) {
    if (typeof ContactsBook !== "undefined" && ContactsBook.data.all.some((c) => c.id === id)) {
      ContactsBook.render();
      if (ContactsBook.refreshGrid) ContactsBook.refreshGrid(); // écran de génération
      return;
    }
    const pnj = PnjLookup.find(id);
    if (pnj) CardRenderer.refresh(pnj);
  },

  addJournalEntry(pnjId, text) {
    const t = (text || "").trim();
    if (!t) return;
    const copies = this._entityCopies(pnjId);
    if (!copies.length) return;
    const entry = { ts: Date.now(), text: t }; // partagé entre copies (identique)
    for (const c of copies) {
      if (!Array.isArray(c.journal)) c.journal = [];
      c.journal.unshift(entry); // plus récent en tête
    }
    this.persistEntity(pnjId);
    this.refreshEntityCard(pnjId);
  },

  removeJournalEntry(pnjId, ts) {
    const copies = this._entityCopies(pnjId);
    if (!copies.length) return;
    for (const c of copies) {
      if (Array.isArray(c.journal))
        c.journal = c.journal.filter((e) => String(e.ts) !== String(ts));
    }
    this.persistEntity(pnjId);
    this.refreshEntityCard(pnjId);
  },

  /** Clic sur le tag d'une drogue : fait avancer le cycle idle → effet →
      contrecoup → idle (cf. js/drugs.js). */
  cycleDrug(pnjId, edition, drugId) {
    const pnj = PnjLookup.find(pnjId);
    if (!pnj) return;
    Drugs.advance(pnj, edition, drugId);
    Shadows.save();
    CardRenderer.refresh(pnj);
  },

  /** Clic sur le tag d'une armure optionnelle (Anarchy) : équipe/range le
      bouclier, ce qui relève/abaisse les seuils physiques affichés. */
  toggleArmorOption(pnjId, idx) {
    const pnj = PnjLookup.find(pnjId);
    if (!pnj) return;
    pnj.armorOptions = pnj.armorOptions || {};
    if (pnj.armorOptions[idx]) delete pnj.armorOptions[idx];
    else pnj.armorOptions[idx] = true;
    Shadows.save();
    CardRenderer.refresh(pnj);
  },

  /* ========================================================
     VÉHICULES & DRONES LIÉS (js/vehicles.js)
     ======================================================== */

  /** Clic sur une chip de la zone Combat : déploie la fiche liée,
      ou recentre la vue dessus si elle existe déjà. */
  deployVehicle(ownerId, srcIdx) {
    const owner = PnjLookup.find(ownerId);
    if (!owner) return;
    const srcItem = (this._vehicleItems(owner) || [])[srcIdx];
    if (!srcItem) return;

    const existing = Vehicles.linkedTo(ownerId, srcItem);
    const alreadyShown = existing.filter((v) => v.deployed);
    if (alreadyShown.length) {
      this._flashCard(alreadyShown[0].id);
      return;
    }

    const inShadows = Shadows.data.all.some((p) => p.id === ownerId);
    // Un PNJ sauvegardé peut avoir deux cartes : on ancre la fiche liée
    // sur la carte du panneau actif (celle que l'utilisateur voit).
    const ownerCard =
      document.querySelector(`.panel.active .pnj-card[data-id="${ownerId}"]`) ||
      document.querySelector(`.pnj-card[data-id="${ownerId}"]`);
    let anchor = ownerCard;

    // Des fiches rangées existent déjà pour cet item : on les redéploie
    // telles quelles (moniteur, nom, notes... tout est conservé) plutôt
    // que d'en fabriquer de nouvelles.
    const toShow = existing.length ? existing : Vehicles.spawn(owner, srcItem, owner.edition);
    if (!toShow.length) return;
    for (const v of toShow) {
      v.deployed = true;
      if (!existing.length) {
        if (inShadows) Shadows.data.all.push(v);
        else Gen.pool.push(v);
      }
      if (anchor) {
        const card = CardRenderer.render(v, inShadows ? ["remove"] : ["discard"]);
        card.classList.add("vehicle-card", "vehicle-deploying");
        anchor.insertAdjacentElement("afterend", card);
        setTimeout(() => card.classList.remove("vehicle-deploying"), 700);
        anchor = card;
      }
    }
    if (inShadows) Shadows.save();
    CardRenderer.refresh(owner); // met à jour l'état des chips
  },

  /** Bouton « Ranger » d'une fiche liée : masque la ou les fiches issues
      du même item source, sans perdre leur état (moniteur, notes...). */
  dismissVehicle(vehicleId) {
    const v = PnjLookup.find(vehicleId);
    if (!v || v.type !== "vehicle") return;
    const siblings = Vehicles.linkedTo(v.ownerId, v.srcItem);
    for (const s of siblings) {
      s.deployed = false;
      document
        .querySelectorAll(`.pnj-card[data-id="${s.id}"]`)
        .forEach((card) => card.remove());
    }
    Shadows.save();
    const owner = PnjLookup.find(v.ownerId);
    if (owner) CardRenderer.refresh(owner);
  },

  /** Badge « lié à » : scroll + flash de la carte du propriétaire. */
  focusOwner(ownerId) {
    this._flashCard(ownerId);
  },

  _flashCard(id) {
    const card =
      document.querySelector(`.panel.active .pnj-card[data-id="${id}"]`) ||
      document.querySelector(`.pnj-card[data-id="${id}"]`);
    if (!card) return;
    card.scrollIntoView({ behavior: "smooth", block: "center" });
    card.classList.add("card-flash");
    setTimeout(() => card.classList.remove("card-flash"), 1200);
  },

  /** Items déployables d'un PNJ (équipement + atouts Anarchy),
      dans un ordre stable — l'index sert de référence aux chips. */
  _vehicleItems(pnj) {
    if (typeof Vehicles === "undefined" || !pnj || pnj.type === "vehicle")
      return [];
    const src = [...(pnj.equip || []), ...(App.getEditionModule(pnj.edition).hasEdges ? pnj.edges || [] : [])];
    return src.filter((i) => Vehicles.matchItem(i, pnj.edition));
  },

  /* ========================================================
     ESPRITS INVOQUÉS (js/spirits.js)
     ======================================================== */
  _summon: null, // état du panneau : { ownerId, force, tier, services }

  /** Panneau d'invocation singleton (pattern du panneau de risque). */
  _ensureSummonPanel() {
    if (document.getElementById("summon-panel")) return;
    const p = document.createElement("div");
    p.id = "summon-panel";
    p.className = "risk-panel-overlay";
    p.setAttribute("hidden", "");
    p.innerHTML = `
      <div class="risk-panel" role="dialog" aria-label="Invocation d'esprit">
        <div class="risk-panel-head">
          <span class="risk-panel-title" id="summon-title">Invoquer un esprit</span>
          <button class="risk-panel-close" id="summon-close" aria-label="Fermer">✕</button>
        </div>
        <div class="summon-row" id="summon-power-row">
          <span class="summon-row-label" id="summon-power-label">Puissance</span>
          <div class="summon-steps" id="summon-power-steps"></div>
        </div>
        <div class="summon-row" id="summon-service-row">
          <span class="summon-row-label">Services</span>
          <div class="summon-steps" id="summon-service-steps"></div>
        </div>
        <div class="summon-types" id="summon-types"></div>
      </div>`;
    document.body.appendChild(p);
    p.addEventListener("click", (e) => {
      if (e.target === p) this._closeSummonPanel();
    });
    document.getElementById("summon-close").addEventListener("click", () =>
      this._closeSummonPanel(),
    );
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !p.hasAttribute("hidden")) this._closeSummonPanel();
    });

    document.getElementById("summon-power-steps").addEventListener("click", (e) => {
      const b = e.target.closest("[data-power]");
      if (!b) return;
      const summonField = App.getEditionModule(this._summon.edition).summonPower.field;
      this._summon[summonField] = parseInt(b.dataset.power, 10);
      this._syncSummonPanel();
    });
    document.getElementById("summon-service-steps").addEventListener("click", (e) => {
      const b = e.target.closest("[data-services]");
      if (!b) return;
      this._summon.services = parseInt(b.dataset.services, 10);
      this._syncSummonPanel();
    });
    document.getElementById("summon-types").addEventListener("click", (e) => {
      const b = e.target.closest("[data-spirit-type]");
      if (!b) return;
      this._doSummon(b.dataset.spiritType);
    });
  },

  openSummonPanel(ownerId) {
    const owner = PnjLookup.find(ownerId);
    if (!owner) return;
    this._ensureSummonPanel();
    this._summon = {
      ownerId,
      edition: owner.edition,
      force: Utils.clamp((owner.attrs && owner.attrs.MAG) || 4, 1, 12),
      tier: 1,
      services: 3,
    };
    document.getElementById("summon-title").textContent =
      `Invoquer — ${owner.name || "PNJ"}`;
    const ed = App.getEditionModule(owner.edition);
    document.getElementById("summon-power-label").textContent =
      ed.summonPower.label;
    // Services choisis à la main uniquement là où l'invocation n'est pas
    // chiffrée (Anarchy) ; en SR5/SR6 ils découlent des succès nets du jet.
    document.getElementById("summon-service-row").style.display =
      ed.conjureSkill ? "none" : "";
    this._syncSummonPanel();
    const p = document.getElementById("summon-panel");
    p.removeAttribute("hidden");
    void p.offsetWidth;
    p.classList.add("show");
  },

  _closeSummonPanel() {
    const p = document.getElementById("summon-panel");
    if (!p) return;
    p.classList.remove("show");
    clearTimeout(p._t);
    p._t = setTimeout(() => p.setAttribute("hidden", ""), 200);
  },

  _syncSummonPanel() {
    const s = this._summon;
    const powerEl = document.getElementById("summon-power-steps");
    const summonPower = App.getEditionModule(s.edition).summonPower;
    powerEl.innerHTML = summonPower
      .steps()
      .map(
        ({ value, label }) =>
          `<button class="summon-step-btn${s[summonPower.field] === value ? " active" : ""}" data-power="${value}">${label}</button>`,
      )
      .join("");
    document.getElementById("summon-service-steps").innerHTML = [1, 2, 3, 4, 5, 6]
      .map(
        (n) =>
          `<button class="summon-step-btn${s.services === n ? " active" : ""}" data-services="${n}">${n}</button>`,
      )
      .join("");
    const types = Spirits.typesFor(s.edition);
    document.getElementById("summon-types").innerHTML = Object.entries(types)
      .map(
        ([key, t]) =>
          `<button class="summon-type-btn" data-spirit-type="${key}">✦ ${t.label}</button>`,
      )
      .join("");
  },

  /** Résumé lisible d'un Drain pour un toast. */
  _drainToast(conj) {
    const t = conj.type === "physical" ? "Physique" : "Étourdissant";
    return conj.drainDamage > 0
      ? `Drain : ${conj.drainDamage} case${conj.drainDamage > 1 ? "s" : ""} (${t}).`
      : "Drain résisté.";
  },

  _doSummon(typeKey) {
    const s = this._summon;
    const owner = PnjLookup.find(s.ownerId);
    if (!owner) return;
    const ed = App.getEditionModule(owner.edition);

    // SR5/SR6 : l'app roule l'invocation (services = succès nets) + le Drain.
    // Anarchy : pas de mécanique chiffrée → services choisis à la main, pas
    // de Drain (comportement historique).
    let services = s.services;
    let conj = null;
    if (ed.conjureSkill) {
      conj = MagicAction.resolveConjuration(owner, s.force);
      services = conj.netHits;
    }

    this._closeSummonPanel();

    // Invocation ratée (aucun succès net) : l'esprit n'apparaît pas, mais le
    // magicien subit tout de même le Drain (SR5 p.303 / SR6 p.150).
    if (conj && conj.netHits < 1) {
      toast(`Invocation ratée (0 succès net). ${this._drainToast(conj)}`);
      return;
    }

    const spirit = Spirits.spawn(owner, typeKey, {
      force: s.force,
      tier: s.tier,
      services,
    });
    if (!spirit) return;

    const inShadows = Shadows.data.all.some((p) => p.id === owner.id);
    if (inShadows) {
      Shadows.data.all.push(spirit);
      Shadows.save();
    } else {
      Gen.pool.push(spirit);
    }
    const ownerCard =
      document.querySelector(`.panel.active .pnj-card[data-id="${owner.id}"]`) ||
      document.querySelector(`.pnj-card[data-id="${owner.id}"]`);
    if (ownerCard) {
      const card = CardRenderer.render(spirit, inShadows ? ["remove"] : ["discard"]);
      card.classList.add("vehicle-card", "spirit-card", "vehicle-deploying");
      ownerCard.insertAdjacentElement("afterend", card);
      setTimeout(() => card.classList.remove("vehicle-deploying"), 700);
    }
    if (conj) {
      toast(`Esprit invoqué : ${services} service${services > 1 ? "s" : ""}. ${this._drainToast(conj)}`);
    }
    CardRenderer.refresh(owner);
  },

  /** Pip de service : marque les services rendus (clic = bascule). */
  toggleService(spiritId, idx) {
    const sp = PnjLookup.find(spiritId);
    if (!sp || sp.type !== "spirit") return;
    sp.servicesUsed = idx < (sp.servicesUsed || 0) ? idx : idx + 1;
    Shadows.save();
    CardRenderer.refresh(sp);
  },

  /** Congédie un esprit : masque sa fiche sans perdre son état (services
      rendus, moniteur, notes...) — l'esprit reste dans le pool. */
  dismissSpirit(spiritId) {
    const sp = PnjLookup.find(spiritId);
    if (!sp || sp.type !== "spirit") return;
    sp.deployed = false;
    document
      .querySelectorAll(`.pnj-card[data-id="${sp.id}"]`)
      .forEach((card) => card.remove());
    Shadows.save();
    const owner = PnjLookup.find(sp.ownerId);
    if (owner) CardRenderer.refresh(owner);
  },
};
