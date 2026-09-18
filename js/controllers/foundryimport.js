"use strict";

/* ============================================================
   FOUNDRY IMPORT — contrôleur NEUTRE (aucune logique d'édition)

   Miroir de FoundryExport : lit un ou plusieurs fichiers JSON
   d'acteur Foundry VTT (PJ ou PNJ) et crée les fiches ShadowHerds
   correspondantes. Toute la connaissance spécifique à une édition
   (forme du schéma, mapping attributs/compétences/items, PJ vs PNJ)
   vit dans le module d'édition, exposée via
   `App.editionModule.foundryImport` (SR5, SR6, Anarchy2) — ce
   contrôleur ne fait qu'orchestrer :

     1. lire le fichier (idiome FileReader de Backup) ;
     2. DÉTECTER l'édition par la forme de l'acteur — chaque module
        expose `detect(actor)` (score de confiance) ; repli sur
        l'édition active. Les modules d'édition étant chargés à la
        demande (App._EDITION_JS), on charge d'abord les 3 modules
        Foundry avant de détecter ;
     3. construire le PNJ via `buildPnj(actor)` puis `recalc(pnj)` ;
     4. ROUTER PJ (Characters) vs PNJ (Shadows) via `isPc(actor)`
        (sémantique Foundry, connue de l'édition seule) ;
     5. ajouter à la collection et sauver.

   Fidélité assumée : un PC Foundry est bien plus riche que le
   modèle ShadowHerds ; on ne remplit que les champs modélisés, le
   reste est signalé via `note()` (même doctrine que l'export —
   perte volontaire vers le modèle simple, cf. storage.js).
   ============================================================ */
import { Campaign } from "../rules/campaign.js";
import { CardRenderer } from "../widgets/card/cardrenderer.js";
import { Characters } from "./characters.js";
import { FoundryExport } from "./foundryexport.js";
import { Contacts } from "./contacts.js";
import { ContactsBook } from "./contactsbook.js";
import { Debug } from "../core/debug.js";
import { Dialog } from "../widgets/kit/dialog.js";
import { Shadows } from "./shadows.js";
import { Utils } from "../core/utils.js";

export const FoundryImport = {
  /* Éditions dotées d'une capacité d'import (Anarchy1 exclue, comme
     l'export). Ordre = ordre de préférence en cas d'égalité de score. */
  _EDITIONS: ["sr5", "sr6", "anarchy2"],

  /* ---- Diagnostic des mappings non résolus (miroir de FoundryExport) ----
     Un champ Foundry non mappé = donnée laissée de côté à l'import. On la
     signale (console.warn inconditionnel) pour que l'utilisateur sache ce
     qui n'a pas été repris. `_session` collecte le temps d'un import. */
  _session: null,

  note(kind, value, fallback) {
    const tail = fallback !== undefined ? ` → repli « ${fallback} »` : " (ignoré)";
    console.warn(`[foundry-import] non repris — ${kind} « ${value} »${tail}`);
    if (this._session) this._session.push({ kind, value, fallback });
  },

  /** Charge (une seule fois) les modules d'édition dotés d'un `foundryImport`
      et renvoie [{ id, mod, cap }]. Nécessaire car App ne charge que
      l'édition active : la détection cross-édition exige les 3 en mémoire. */
  async _capabilities() {
    for (const ed of this._EDITIONS) {
      try {
        await App.ensureEditionLoaded(ed);
      } catch (e) {
        Debug.warn("foundry", "chargement module d'édition échoué", { ed, error: e });
      }
    }
    const out = [];
    for (const ed of this._EDITIONS) {
      const mod = App.getEditionModule(ed);
      if (mod && mod.foundryImport) out.push({ id: ed, mod, cap: mod.foundryImport });
    }
    return out;
  },

  /** Choisit l'édition la plus probable pour un acteur : score `detect`
      max, repli sur l'édition active si tout le monde renvoie 0. */
  _pick(actor, caps) {
    let best = null;
    let bestScore = 0;
    for (const c of caps) {
      let score = 0;
      try {
        score = Number(c.cap.detect(actor)) || 0;
      } catch (e) {
        Debug.warn("foundry", "detect a échoué", { ed: c.id, error: e });
      }
      if (score > bestScore) {
        bestScore = score;
        best = c;
      }
    }
    if (best) return best;
    // Repli : l'édition active, si elle sait importer.
    return caps.find((c) => c.id === App.edition) || null;
  },

  /** Lit un fichier local → objet JSON (idiome Backup.importFromFile). */
  _readFile(file) {
    return new Promise((resolve, reject) => {
      if (!file) return reject(new Error("Aucun fichier."));
      const reader = new FileReader();
      reader.onload = () => {
        try {
          resolve(JSON.parse(reader.result));
        } catch {
          reject(new Error(`« ${file.name} » n'est pas un JSON valide.`));
        }
      };
      reader.onerror = () => reject(new Error(`Lecture de « ${file.name} » impossible.`));
      reader.readAsText(file);
    });
  },

  /** PJ homonyme (D4) : cherche un PJ déjà présent portant le même nom
      (insensible à la casse/aux espaces — un joueur ne réimporte jamais
      sous un nom légèrement différent). Édition non comparée : c'est le
      même personnage qui compte, pas le système sous lequel il est rangé. */
  _findHomonym(name) {
    const n = (name || "").trim().toLowerCase();
    if (!n) return null;
    return Characters.data.all.find((p) => (p.name || "").trim().toLowerCase() === n) || null;
  },

  /** Demande l'arbitrage (D4) : mettre à jour / écraser / dupliquer /
      ignorer. « Mettre à jour » est le cas courant en campagne — le joueur a
      fait évoluer son PJ dans Foundry, on resynchronise — et le choix par
      défaut. Résout "skip" si annulée (croix/Échap) : le repli le plus sûr,
      celui qui ne touche à rien. */
  async _askHomonym(name, hasGear) {
    const choice = await Dialog.choose({
      title: "PJ déjà présent",
      message: `Un PJ nommé « ${name} » existe déjà dans la bibliothèque.\n\nMettre à jour : Foundry remplace le personnage (attributs, compétences, équipement, identités, moniteurs), ShadowHerds garde ce qui l'entoure (dossiers, contacts liés, journal, registre de campagne, portrait).${hasGear ? "\n\n⚠ Son équipement structuré par l'assistant repassera en texte : Foundry ne le rend pas." : ""}`,
      options: [
        { value: "update", label: "Mettre à jour", primary: true },
        { value: "overwrite", label: "Écraser", danger: true },
        { value: "duplicate", label: "Dupliquer" },
        { value: "skip", label: "Ignorer" },
      ],
    });
    return choice || "skip";
  },

  /** Fusion « Mettre à jour » : `fresh` remplace le personnage, `existing`
      garde le monde autour. EN PLACE — l'identité de l'objet est partagée
      par la collection, le DOM et les liens du registre de relations,
      jamais réassignée (même règle que EditModal._restore). Le registre de
      campagne se complète sans doublon : une ligne de même ressource, même
      montant et même raison n'est pas rejouée, le suffixe d'import compris.
      Renvoie true si un `gear` structuré a été perdu au passage. */
  _updateInPlace(existing, fresh) {
    const GARDE = ["id", "pcColor", "portraitUrl", "player", "journal"];
    const garde = {};
    for (const k of GARDE) if (existing[k] !== undefined) garde[k] = existing[k];
    // Les notes locales priment quand Foundry n'en apporte pas.
    if (existing.notes && !fresh.notes) garde.notes = existing.notes;
    const campagne = existing.campaign ? structuredClone(existing.campaign) : null;
    const hadGear = Array.isArray(existing.gear);
    for (const k of Object.keys(existing)) delete existing[k];
    Object.assign(existing, fresh, garde);
    if (campagne || fresh.campaign) {
      const cle = (e) => `${e.res}|${Number(e.delta) || 0}|${String(e.reason || "").replace(/\s*\(importé de Foundry\)$/, "")}`;
      const fusion = [...((campagne && campagne.ledger) || [])];
      const vues = new Set(fusion.map(cle));
      for (const e of (fresh.campaign && fresh.campaign.ledger) || []) {
        if (vues.has(cle(e))) continue;
        vues.add(cle(e));
        fusion.push(e);
      }
      const c = Campaign.ensure(existing);
      c.ledger = fusion;
      if (campagne && campagne.customTracks) c.customTracks = campagne.customTracks;
    }
    return hadGear;
  },

  /** Construit le PNJ ShadowHerds à partir d'un acteur Foundry et l'ajoute
      à la bonne collection. Renvoie un récap sans toaster (l'appelant
      décide du message). */
  async _importActor(actor, chosen) {
    if (!actor || typeof actor !== "object" || !actor.system) {
      return { ok: false, reason: "invalid" };
    }
    if (!chosen) return { ok: false, reason: "unsupported" };

    let pnj;
    this._session = [];
    try {
      pnj = chosen.cap.buildPnj(actor);
      pnj.id = (chosen.cap.isPc(actor) ? "char-" : "") + Utils.uid();
      pnj.edition = chosen.id;
      // Dérivées (limites, moniteurs, initiative) : produites par l'édition.
      // Un acteur incomplet ne doit pas faire tomber tout l'import.
      try {
        chosen.mod.recalc(pnj);
      } catch (e) {
        this.note("recalcul des dérivées", pnj.name || actor.name || "?");
        Debug.warn("foundry", "recalc a échoué à l'import", { id: pnj.id, error: e });
      }
    } catch (e) {
      this._session = null;
      Debug.warn("foundry", "buildPnj a échoué", { name: actor.name, error: e });
      return { ok: false, reason: "error" };
    }
    const unresolved = this._session;
    this._session = null;

    const isPc = chosen.cap.isPc(actor);
    let cible = pnj;
    let updated = false;
    let gearDropped = false;
    if (isPc) {
      const homonym = this._findHomonym(pnj.name);
      if (homonym) {
        const choice = await this._askHomonym(pnj.name, Array.isArray(homonym.gear));
        if (choice === "skip") return { ok: false, reason: "skipped", name: pnj.name };
        if (choice === "overwrite") Characters.remove(homonym.id);
        if (choice === "update") {
          gearDropped = this._updateInPlace(homonym, pnj);
          cible = homonym;
          updated = true;
        }
        // "duplicate" : rien à faire, le PJ neuf s'ajoute à côté.
      }
    }
    const col = isPc ? Characters : Shadows;
    if (!updated) {
      // add() toaste ; on veut un récap groupé
      col.data.all.push(pnj);
    }
    col.save();
    col.render();
    if (typeof col.renderLabel === "function") col.renderLabel();
    if (updated) CardRenderer.refresh(cible);

    // Contacts (itemContact SR5, PJ seulement — cf. Characters.addContactLink)
    // : après le push, pnj.id existe déjà dans Characters.data.all (requis
    // pour lier). Extraction pure côté édition (readContacts), création/
    // liaison ici (ContactsBook/Characters sont hors de portée d'un module
    // d'édition — couche 3 ne descend pas vers la couche 5).
    let linkedContacts = 0;
    if (isPc && typeof chosen.cap.readContacts === "function") {
      linkedContacts = this._linkContacts(cible, chosen.cap.readContacts(actor), chosen.id);
    }

    // Véhicules/drones (itemVehicle) : entités liées « qui suivent leur
    // maître » (Shadows.data.all + ownerId, socle existant — cf.
    // js/catalogs/vehicles.js) — PJ et PNJ tous deux propriétaires possibles.
    // Une mise à jour ne recrée pas les véhicules déjà liés au PJ.
    let linkedVehicles = 0;
    if (!updated && typeof chosen.cap.readVehicles === "function") {
      linkedVehicles = this._spawnVehicles(cible, chosen.cap.readVehicles(actor), chosen.id);
    }

    return {
      ok: true, edition: chosen.id, isPc, name: cible.name, updated, gearDropped,
      unresolved: unresolved.length, notes: unresolved, linkedContacts, linkedVehicles,
    };
  },

  /** Apparie par nom (même édition) dans ContactsBook, crée sinon — même
      geste que la création manuelle (`Contacts.buildManual`, réutilisé
      tel quel : gère déjà le clamp par édition, Anarchy compris). Lie via
      le même schéma que `Characters.addContactLink` (contactId/relation/
      loyalty), sans son toast par doublon — silencieux pendant un import
      groupé. Une seule sauvegarde groupée en sortie. */
  _linkContacts(pnj, contacts, edition) {
    if (!contacts || !contacts.length) return 0;
    let n = 0;
    for (const c of contacts) {
      if (!c.name) continue;
      let contact = ContactsBook.data.all.find(
        (x) => x.edition === edition && x.name.toLowerCase() === c.name.toLowerCase(),
      );
      if (!contact) {
        contact = Contacts.buildManual(edition, {
          name: c.name, role: c.role, metatype: c.metatype,
          influence: c.connection, loyaute: c.loyalty, level: c.connection, rr: 1,
        });
        ContactsBook.data.all.push(contact);
      }
      // L'arête PJ→contact vit dans RelationsStore (VIS-15 B0), qui persiste
      // lui-même ; linkContact renvoie false si le lien existe déjà.
      if (RelationsStore.linkContact(pnj.id, contact.id, c.role || "", c.loyalty || null)) n++;
    }
    if (n) ContactsBook.save();
    return n;
  },

  /** Construit une entité `type:"vehicle"` par véhicule extrait — même
      forme que `Vehicles.spawn` (js/catalogs/vehicles.js), mais sans passer
      par son parseur de texte catalogue : les stats Foundry sont déjà
      chiffrées, structurées, il n'y a rien à reparser. `monTotal` vient du
      moniteur déjà calculé côté Foundry (edition SR5 : vehicleFields
      "total", pas de seuils à dériver). */
  _spawnVehicles(pnj, vehicles, edition) {
    if (!vehicles || !vehicles.length) return 0;
    for (const v of vehicles) {
      Shadows.data.all.push({
        id: Utils.uid(),
        type: "vehicle",
        kind: v.kind,
        edition,
        name: v.name,
        ownerId: pnj.id,
        ownerName: pnj.name || "PNJ",
        srcItem: `Foundry: ${v.name}`,
        stats: { ...v.stats },
        weapons: [],
        rrNotes: null,
        notes: "",
        deployed: true,
        monTotal: v.monTotal || 0,
        monFilled: 0,
      });
    }
    Shadows.save();
    return vehicles.length;
  },

  /** Point d'entrée (data-action="foundry-import") : ouvre un sélecteur de
      fichier(s) et importe chaque acteur Foundry. */
  async openImportDialog() {
    const caps = await this._capabilities();
    if (!caps.length) {
      toast("Import Foundry indisponible (aucun module d'édition).", "warning");
      return;
    }
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.multiple = true;
    input.hidden = true;
    document.body.appendChild(input);
    input.addEventListener("change", async () => {
      const files = Array.from(input.files || []);
      input.remove();
      if (!files.length) return;
      await this._runImport(files, caps);
    });
    input.click();
  },

  /** Pré-vol : les fichiers sont LUS d'abord, et l'écran dit, par acteur,
      l'édition détectée, PJ ou PNJ, le nom — avant d'importer quoi que ce
      soit. On confirme tel quel, ou on force une édition pour tout le lot
      (une détection peut se tromper entre deux systèmes proches). Résout
      la liste `[{ actor, chosen }]`, ou null si annulé. */
  async _preflight(files, caps) {
    const lot = [];
    for (const file of files) {
      let data;
      try {
        data = await this._readFile(file);
      } catch (e) {
        toast(e.message, "danger");
        continue;
      }
      // Foundry exporte un acteur par fichier, mais on tolère un tableau.
      for (const actor of Array.isArray(data) ? data : [data]) {
        const chosen = actor && actor.system ? this._pick(actor, caps) : null;
        lot.push({ file: file.name, actor, chosen });
      }
    }
    if (!lot.length) return null;
    const nomDe = (c) => (c && (c.mod.label || c.id)) || "édition inconnue";
    const lignes = lot.map((x) => {
      if (!x.chosen) return `• ${x.file} — format non reconnu`;
      const type = x.chosen.cap.isPc(x.actor) ? "PJ" : "PNJ";
      return `• ${x.file} — ${nomDe(x.chosen)} · ${type} · ${(x.actor && x.actor.name) || "sans nom"}`;
    });
    const options = [{ value: "go", label: "Importer", primary: true }];
    for (const c of caps) options.push({ value: `force:${c.id}`, label: `Tout en ${nomDe(c)}` });
    options.push({ value: "cancel", label: "Annuler" });
    const choix = await Dialog.choose({ title: "Importer depuis Foundry", message: lignes.join("\n"), options });
    if (!choix || choix === "cancel") return null;
    if (choix.startsWith("force:")) {
      const forced = caps.find((c) => c.id === choix.slice(6));
      for (const x of lot) if (x.actor && x.actor.system) x.chosen = forced;
    }
    return lot;
  },

  /** Importe le lot confirmé, puis un toast de récap et, s'il y a eu des
      pertes, la liste à l'écran. */
  async _runImport(files, caps) {
    const lot = await this._preflight(files, caps);
    if (!lot) return;
    let pj = 0;
    let pnjCount = 0;
    let updated = 0;
    let failed = 0;
    let skipped = 0;
    let contactsLinked = 0;
    let vehiclesSpawned = 0;
    const notes = [];
    for (const { actor, chosen } of lot) {
      const res = await this._importActor(actor, chosen);
      if (!res.ok) {
        if (res.reason === "skipped") skipped++;
        else failed++;
        continue;
      }
      if (res.isPc) pj++;
      else pnjCount++;
      if (res.updated) updated++;
      if (res.gearDropped) notes.push({ kind: "équipement structuré", value: res.name, fallback: "repassé en texte (Foundry ne le rend pas)" });
      for (const n of res.notes || []) notes.push({ ...n, value: `${res.name} : ${n.value}` });
      contactsLinked += res.linkedContacts || 0;
      vehiclesSpawned += res.linkedVehicles || 0;
    }
    if (!pj && !pnjCount) {
      if (skipped) toast(`${skipped} PJ ignoré(s) (déjà présent)`, "warning");
      else toast("Aucun acteur Foundry n'a pu être importé (format non reconnu).", "warning");
      return;
    }
    const parts = [];
    if (pj) parts.push(`${pj} PJ`);
    if (pnjCount) parts.push(`${pnjCount} PNJ`);
    const head = `${parts.join(" + ")} importé${pj + pnjCount > 1 ? "s" : ""} depuis Foundry`;
    const tail = [];
    if (updated) tail.push(`${updated} mis à jour`);
    if (contactsLinked) tail.push(`${contactsLinked} contact(s) lié(s)`);
    if (vehiclesSpawned) tail.push(`${vehiclesSpawned} véhicule(s)/drone(s)`);
    if (notes.length) tail.push(`${notes.length} élément(s) non repris`);
    if (skipped) tail.push(`${skipped} ignoré(s) (déjà présent)`);
    if (failed) tail.push(`${failed} échec(s)`);
    toast(tail.length ? `${head} · ${tail.join(" · ")}` : head, notes.length || failed ? "warning" : "success");
    if (notes.length) FoundryExport.recap("Import depuis Foundry", notes);
  },
};

// Pont couche 5 (migration modules ES) — retiré en fin de migration.
window.FoundryImport = FoundryImport;
