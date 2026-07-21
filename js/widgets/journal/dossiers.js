"use strict";

/* ============================================================
   DOSSIERS — registre transverse de regroupement narratif
   ------------------------------------------------------------
   Un dossier (« Run 1 ») regroupe du contenu de PLUSIEURS
   collections à la fois (PNJ + contacts + serveurs). Ce module
   ne détient QUE la structure : un arbre plat à parentId.

       [{ id, name, parentId, kind? }]

   parentId = null  → dossier de premier niveau
   parentId = <id>  → sous-groupe libre d'un dossier
   kind             → type optionnel dans la hiérarchie de campagne :
                      "campaign" | "run" | absent (non typé, historique)

   Les sections par type (PNJ / Contacts / Serveurs) ne sont pas
   stockées : elles se dérivent du type d'entité au rendu.

   L'APPARTENANCE des entités reste, elle, portée par chaque
   collection (Collection.data.groups keyé par id de dossier) —
   ce module ne duplique pas le stockage des membres, il n'expose
   que le référentiel des clés et sa hiérarchie. Feuille : ses
   seules dépendances sortantes sont Storage et Utils.
   ============================================================ */
import { Storage } from "../../core/storage.js";
import { Utils } from "../../core/utils.js";

export const Dossiers = {
  _key: "dossiers",
  _tree: [],

  /* ---- Persistance (par édition, via Storage) ---- */
  load() {
    this._tree = Storage.get(this._key, []);
    return this._tree;
  },
  save() {
    Storage.set(this._key, this._tree);
  },

  /* ---- Lecture ---- */
  list() {
    return this._tree;
  },
  /** Dossiers de premier niveau (parentId null). */
  roots() {
    return this._tree.filter((d) => d.parentId == null);
  },
  /** Sous-groupes directs d'un dossier. */
  children(parentId) {
    return this._tree.filter((d) => d.parentId === parentId);
  },
  /** Runs (kind:"run") enfants directs d'une campagne (VIS-16). */
  runsOf(campaignId) {
    return this.children(campaignId).filter((d) => d.kind === "run");
  },
  /** Scènes (kind:"scene") enfants directs d'un run (VIS-16). La scène est la
      cellule de jeu : ses participants et outils s'y rattachent par référence,
      son état de jeu vit dans l'Encounter (jamais recopié sur les Actifs). */
  scenesOf(runId) {
    return this.children(runId).filter((d) => d.kind === "scene");
  },
  get(id) {
    return this._tree.find((d) => d.id === id) || null;
  },
  nameOf(id) {
    const d = this.get(id);
    return d ? d.name : null;
  },
  /** Type de campagne d'un dossier : "campaign" | "run" | null (non typé). */
  kindOf(id) {
    const d = this.get(id);
    return (d && d.kind) || null;
  },
  has(id) {
    return this._tree.some((d) => d.id === id);
  },

  /* ---- CRUD ---- */
  /** `kind` (optionnel) type le dossier dans la hiérarchie de campagne :
      "campaign" (racine d'une chronique) | "run" (une mission) | null (non
      typé, comportement historique). Champ ADDITIF : un dossier sans `kind`
      reste valide, et le typage voyage tel quel dans les dossiers déjà
      synchronisés/fusionnés-par-id (aucune migration). */
  add(name, parentId = null, kind = null) {
    const clean = String(name || "").trim();
    if (!clean) return null;
    const node = { id: Utils.uid(), name: clean, parentId: parentId || null };
    if (kind) node.kind = kind;
    this._tree.push(node);
    this.save();
    return node;
  },

  rename(id, name) {
    const clean = String(name || "").trim();
    const node = this.get(id);
    if (!node || !clean) return false;
    node.name = clean;
    this.save();
    return true;
  },

  /** Type un dossier (ou le dé-type avec `null`). Additif, idempotent. */
  setKind(id, kind) {
    const node = this.get(id);
    if (!node) return false;
    if (kind) node.kind = kind;
    else delete node.kind;
    this.save();
    return true;
  },

  /** Déplace un nœud sous un nouveau parent (null = racine). Refuse un
      cycle (se replacer sous soi-même ou l'un de ses descendants). */
  move(id, newParentId) {
    const node = this.get(id);
    if (!node) return false;
    if (id === newParentId) return false;
    if (newParentId && this.descendantIds(id).has(newParentId)) return false;
    node.parentId = newParentId || null;
    this.save();
    return true;
  },

  /** Supprime un nœud ET tous ses descendants. Renvoie l'ensemble des ids
      retirés pour que l'appelant purge l'appartenance côté collections. */
  remove(id) {
    const doomed = this.descendantIds(id);
    this._tree = this._tree.filter((d) => !doomed.has(d.id));
    this.save();
    return doomed;
  },

  /** id + tous ses descendants (parcours en profondeur). */
  descendantIds(id) {
    const out = new Set([id]);
    const walk = (pid) => {
      for (const child of this._tree.filter((d) => d.parentId === pid)) {
        if (!out.has(child.id)) {
          out.add(child.id);
          walk(child.id);
        }
      }
    };
    walk(id);
    return out;
  },

  /* ---- Migration des groupes historiques ----
     Transforme les groupes nommés, jusqu'ici cloisonnés par collection,
     en dossiers transverses. Les noms IDENTIQUES entre collections sont
     fusionnés en un seul dossier (« Run 1 » PNJ + « Run 1 » contacts →
     un dossier unique). Fonction PURE : ne touche ni Storage ni les
     collections ; elle renvoie de quoi appliquer la bascule.

     @param  byCollection { <collKey>: { <groupName>: [ids] } }
     @return { nodes, keyMap } où
       nodes  = arbre de dossiers à premier niveau
       keyMap = { <collKey>: { <groupName>: <dossierId> } } pour remapper
                les clés d'appartenance de chaque collection. */
  planMigration(byCollection) {
    const nameToId = {};
    const nodes = [];
    const keyMap = {};
    for (const [col, groups] of Object.entries(byCollection || {})) {
      keyMap[col] = {};
      for (const name of Object.keys(groups || {})) {
        if (name === "all") continue; // clé réservée, jamais un groupe réel
        let id = nameToId[name];
        if (!id) {
          id = Utils.uid();
          nameToId[name] = id;
          nodes.push({ id, name, parentId: null });
        }
        keyMap[col][name] = id;
      }
    }
    return { nodes, keyMap };
  },
};

// Pont couche 4 (migration modules ES) — retiré en fin de migration.
window.Dossiers = Dossiers;
