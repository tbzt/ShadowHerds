"use strict";

/* ============================================================
   UI — interactions live (moniteurs, drogues, véhicules/drones liés).
   L'invocation d'esprits vit dans SummonPanel (UI était un
   fourre-tout mélangeant plusieurs domaines fonctionnels autonomes).
   ============================================================ */
import { Campaign } from "../../rules/campaign.js";
import { CardRenderer } from "../card/cardrenderer.js";
import { Drugs } from "../../catalogs/drugs.js";
import { PersonaRenderer } from "../card/personarenderer.js";
import { Utils } from "../../core/utils.js";
import { Vehicles } from "../../catalogs/vehicles.js";

export const UI = {
  /** Clic sur une case de moniteur. Mute TOUTES les copies vivantes de
      l'entité et persiste tous les stores concernés (`_entityCopies`/
      `persistEntity`) — corrige un bug latent trouvé en vérifiant
      Un PJ (léger ou complet) ne vit que dans `Characters`, jamais
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
    const before = copies[0][field] || 0;
    for (const pnj of copies) {
      if (pnj[field] === undefined) pnj[field] = 0;
      pnj[field] = idx < pnj[field] ? idx : idx + 1;
    }
    const after = copies[0][field] || 0;

    this.persistEntity(pnjId);
    // V0-d : cocher une case ne change jamais la FORME du moniteur (total
    // inchangé) — patcher les classes en place laisse enfin jouer la
    // transition CSS de `.monitor-box`, écrasée jusqu'ici par le innerHTML
    // complet de `CardRenderer.refresh()` à chaque coche.
    this._patchMonitorDOM(copies[0], pnjId, type, idx, before, after);
    // Vague D : cocher/décocher un moniteur peut basculer « hors de combat » ou
    // le drapeau « devrait fuir » d'un combattant → rafraîchir le tracker.
    if (typeof Encounter !== "undefined") Encounter.notifyPnjChanged(copies[0]);
  },

  /** Patch chirurgical des cases + du malus, sur toutes les cartes vivantes
      de l'entité (générateur + Ombres peuvent coexister, cf. refresh()).
      Pulse + haptique seulement au FRANCHISSEMENT d'un palier de 3 (jamais
      à la coche simple) — la case qui vient de faire basculer le malus. */
  _patchMonitorDOM(pnj, pnjId, type, idx, before, after) {
    // Le badge de malus n'existe que pour le moniteur phys/étourdissant
    // (seuls sr5.js/sr6.js/anarchy1.js appellent _monitorMalusBadge) — un
    // moniteur matriciel/persona/Anarchy 2 n'en a pas, ne pas lui en inventer un.
    const tracksMalus = type === "phys" || type === "stun";
    const malus = tracksMalus ? Utils.woundMalus(pnj, pnj.edition) : 0;
    const palierCrossed = Math.floor(before / 3) !== Math.floor(after / 3);
    document.querySelectorAll(`.pnj-card[data-id="${pnjId}"]`).forEach((card) => {
      const boxes = card.querySelectorAll(`.monitor-box[data-id="${pnjId}"][data-sev="${type}"]`);
      boxes.forEach((box, i) => box.classList.toggle("filled", i < after));
      const malusEl = tracksMalus ? card.querySelector(".monitor-malus") : null;
      if (malus > 0) {
        if (malusEl) {
          malusEl.textContent = `−${malus}D`;
        } else if (boxes[0]) {
          // Le badge n'existait pas encore (malus passe de 0 à >0) : même
          // markup que CardRenderer._monitorMalusBadge, posé une fois.
          const block = boxes[0].closest(".monitor-block");
          if (block) {
            const el = document.createElement("div");
            el.className = "monitor-malus";
            el.title = "Malus de blessure cumulé (déjà appliqué aux tests)";
            el.textContent = `−${malus}D`;
            block.appendChild(el);
          }
        }
      } else if (malusEl) {
        malusEl.remove();
      }
      if (palierCrossed) {
        const box = card.querySelector(
          `.monitor-box[data-id="${pnjId}"][data-sev="${type}"][data-idx="${idx}"]`,
        );
        if (box) {
          box.classList.remove("rule-pulse");
          void box.offsetWidth; // relance l'animation si déjà posée
          box.classList.add("rule-pulse");
        }
      }
    });
    if (palierCrossed) Utils.haptic(12);
  },

  /** Case du moniteur matriciel du DECK
      (`pnj.cyberdeck.filled`), distinct de toggleMonitor ci-dessus (qui ne
      connaît que des champs top-level `pnj.*Filled`). Même motif copies
      multiples + persistEntity que le reste de cette section. */
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

  /** Réallocation ASDF/ACTF en un tap — échange les valeurs de deux
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

  /** Réallocation du persona incarné (SR6 uniquement — Resonance.
      redistributable) : déplace 1 point du pool bonus entre deux attributs
      matriciels, borné au cap de chacun (js/rules/resonance.js). À la
      différence du deck (échange de valeurs brutes), ici seul le DELTA
      `pnj.persona.alloc` bouge — les attributs mentaux de base sont fixes. */
  reallocPersona(pnjId, fromKey, toKey) {
    const copies = this._entityCopies(pnjId);
    if (!copies.length) return;
    for (const pnj of copies) {
      if (!pnj.persona) continue;
      PersonaRenderer.realloc(pnj, pnj.edition, fromKey, toKey);
    }
    this.persistEntity(pnjId);
    CardRenderer.refresh(copies[0]);
    toast("Persona reconfiguré.");
  },

  /** Le decker vise un serveur (`pnj.cyberdeck.run.targetServerId`),
      hors combat comme en scène — même motif copies multiples + persistEntity
      que reallocDeck/toggleDeckMonitor ci-dessus. `serverId` vide
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
     JOURNAL DE FICHE — notes datées, empilées en tête.
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

  /* ---- Identités (SIN) — mutations structurelles depuis l'édition -------
     Même patron que les compteurs libres ci-dessus : mutation de TOUTES les
     copies vivantes (`_entityCopies`) puis `persistEntity`, jamais un
     `Store.save()` ciblé — un PJ ne vit que dans `Characters`, un PNJ généré
     vit en pool ET en bibliothèque. Aucune branche d'édition : `identities`
     est un champ neutre (seul l'import Foundry SR5 le peuple aujourd'hui).
     ---------------------------------------------------------------------- */

  /** Conteneur de styles de vie : la SIN d'indice `idx`, ou les orphelins
      (« sans SIN ») quand `idx` est `null`. Adresser les deux pareil évite
      de doubler chaque ajout/retrait/déplacement. */
  _lifestyleHost(pnj, idx) {
    if (idx === null || idx === undefined) {
      if (!Array.isArray(pnj.orphanLifestyles)) pnj.orphanLifestyles = [];
      return pnj.orphanLifestyles;
    }
    const idn = (pnj.identities || [])[idx];
    if (!idn) return null;
    if (!Array.isArray(idn.lifestyles)) idn.lifestyles = [];
    return idn.lifestyles;
  },

  addIdentity(pnjId, name) {
    const n = (name || "").trim();
    if (!n) return;
    const copies = this._entityCopies(pnjId);
    if (!copies.length) return;
    for (const c of copies) {
      if (!Array.isArray(c.identities)) c.identities = [];
      c.identities.push({ name: n, nationality: "", rating: null, licenses: [], lifestyles: [] });
      // Première SIN d'une fiche = celle qu'on joue, sinon la carte n'aurait
      // aucune identité active à marquer ●.
      if (!c.activeIdentity) c.activeIdentity = n;
    }
    this.persistEntity(pnjId);
    this.refreshEntityCard(pnjId);
  },

  /** Supprime une SIN. Ses styles de vie ne partent PAS avec elle : ils
      redeviennent orphelins (« sans SIN »), comme à l'import quand le lien
      pend (Failsafe) — on ne détruit jamais une donnée que l'utilisateur n'a
      pas explicitement visée. */
  removeIdentity(pnjId, idx) {
    const copies = this._entityCopies(pnjId);
    if (!copies.length) return;
    for (const c of copies) {
      const ids = c.identities || [];
      const gone = ids[idx];
      if (!gone) continue;
      const orphans = this._lifestyleHost(c, null);
      orphans.push(...(gone.lifestyles || []));
      ids.splice(idx, 1);
      if (c.activeIdentity === gone.name) c.activeIdentity = ids.length ? ids[0].name : null;
    }
    this.persistEntity(pnjId);
    this.refreshEntityCard(pnjId);
  },

  setActiveIdentity(pnjId, name) {
    const copies = this._entityCopies(pnjId);
    if (!copies.length) return;
    for (const c of copies) c.activeIdentity = name;
    this.persistEntity(pnjId);
    this.refreshEntityCard(pnjId);
  },

  addLicense(pnjId, idx, name) {
    const n = (name || "").trim();
    if (!n) return;
    const copies = this._entityCopies(pnjId);
    for (const c of copies) {
      const idn = (c.identities || [])[idx];
      if (!idn) continue;
      if (!Array.isArray(idn.licenses)) idn.licenses = [];
      idn.licenses.push({ name: n, rating: null });
    }
    this.persistEntity(pnjId);
    this.refreshEntityCard(pnjId);
  },

  removeLicense(pnjId, idx, lidx) {
    const copies = this._entityCopies(pnjId);
    for (const c of copies) {
      const idn = (c.identities || [])[idx];
      if (idn && Array.isArray(idn.licenses)) idn.licenses.splice(lidx, 1);
    }
    this.persistEntity(pnjId);
    this.refreshEntityCard(pnjId);
  },

  addLifestyle(pnjId, idx, name) {
    const n = (name || "").trim();
    if (!n) return;
    const copies = this._entityCopies(pnjId);
    for (const c of copies) {
      const host = this._lifestyleHost(c, idx);
      if (host) host.push({ name: n, city: "" });
    }
    this.persistEntity(pnjId);
    this.refreshEntityCard(pnjId);
  },

  removeLifestyle(pnjId, idx, lidx) {
    const copies = this._entityCopies(pnjId);
    for (const c of copies) {
      const host = this._lifestyleHost(c, idx);
      if (host) host.splice(lidx, 1);
    }
    this.persistEntity(pnjId);
    this.refreshEntityCard(pnjId);
  },

  /** Rattache un style de vie à une autre SIN (ou à « sans SIN »). Déplace
      l'objet tel quel : c'est le rattachement qui change, pas le style de vie. */
  moveLifestyle(pnjId, fromIdx, lidx, toIdx) {
    const copies = this._entityCopies(pnjId);
    for (const c of copies) {
      const from = this._lifestyleHost(c, fromIdx);
      const to = this._lifestyleHost(c, toIdx);
      if (!from || !to || from === to) continue;
      const [moved] = from.splice(lidx, 1);
      if (moved) to.push(moved);
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

// Pont couche 4 (migration modules ES) — retiré en fin de migration.
window.UI = UI;
