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

  /** M3 : le decker vise un serveur (`pnj.cyberdeck.run.targetServerId`),
      hors combat comme en scène — même motif copies multiples + persistEntity
      (F2) que reallocDeck/toggleDeckMonitor ci-dessus. `serverId` vide
      (option "Aucune") efface la cible. */
  setDeckTarget(pnjId, serverId) {
    const copies = this._entityCopies(pnjId);
    if (!copies.length) return;
    const id = serverId || null;
    for (const pnj of copies) {
      if (!pnj.cyberdeck) continue;
      DeckRun._ensure(pnj).targetServerId = id;
    }
    this.persistEntity(pnjId);
    CardRenderer.refresh(copies[0]);
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

  /* ========================================================
     SUIVI DE CAMPAGNE (nuyens, Karma, réputation, compteurs libres)
     Jumeau du journal : registre daté `pnj.campaign.ledger = [{ts,res,
     delta,reason}]`, muté sur TOUTES les copies vivantes, persisté par
     appartenance ; le solde est DÉRIVÉ (Campaign.balance), jamais stocké.
     Champ additif → voyage tel quel dans characters_all (pas de migration).
     ======================================================== */

  addLedgerEntry(pnjId, res, delta, reason) {
    const d = Number(delta);
    if (!res || !Number.isFinite(d) || d === 0) return;
    const copies = this._entityCopies(pnjId);
    if (!copies.length) return;
    const entry = Campaign.entry(res, d, reason); // partagé entre copies (identique)
    for (const c of copies) Campaign.ensure(c).ledger.unshift(entry); // plus récent en tête
    this.persistEntity(pnjId);
    this.refreshEntityCard(pnjId);
  },

  removeLedgerEntry(pnjId, ts) {
    const copies = this._entityCopies(pnjId);
    if (!copies.length) return;
    for (const c of copies) {
      if (c.campaign && Array.isArray(c.campaign.ledger))
        c.campaign.ledger = c.campaign.ledger.filter((e) => String(e.ts) !== String(ts));
    }
    this.persistEntity(pnjId);
    this.refreshEntityCard(pnjId);
  },

  /** Règle le solde d'une ressource à une valeur cible en écrivant l'ajustement
      correspondant (`cible − solde courant`), jamais un écrasement de l'historique.
      Utilisé par l'édition ; l'écriture reste une ligne datée comme les autres. */
  setTrackerBalance(pnjId, res, target, reason) {
    const pnj = this._entityCopies(pnjId)[0];
    if (!pnj) return;
    const t = Number(target);
    if (!Number.isFinite(t)) return;
    const delta = t - Campaign.balance(pnj.campaign, res);
    if (delta !== 0) this.addLedgerEntry(pnjId, res, delta, reason || "ajustement");
  },

  /** Compteur libre (nommé) créé par le MJ — même ressource dans le registre
      que les devises/réputation, distinguée par une clé stable unique. */
  addCustomTrack(pnjId, label) {
    const l = (label || "").trim();
    if (!l) return null;
    const copies = this._entityCopies(pnjId);
    if (!copies.length) return null;
    const key = "c_" + Utils.uid();
    for (const c of copies) Campaign.ensure(c).customTracks.push({ key, label: l });
    this.persistEntity(pnjId);
    this.refreshEntityCard(pnjId);
    return key;
  },

  /** Retire un compteur libre ET ses écritures (pas de solde orphelin). */
  removeCustomTrack(pnjId, key) {
    const copies = this._entityCopies(pnjId);
    if (!copies.length) return;
    for (const c of copies) {
      if (!c.campaign) continue;
      if (Array.isArray(c.campaign.customTracks))
        c.campaign.customTracks = c.campaign.customTracks.filter((t) => t.key !== key);
      if (Array.isArray(c.campaign.ledger))
        c.campaign.ledger = c.campaign.ledger.filter((e) => e.res !== key);
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
};
