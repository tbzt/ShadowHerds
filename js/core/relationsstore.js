"use strict";

/* ============================================================
   RELATIONS STORE — la SEULE vérité d'arête entité↔entité.
   ------------------------------------------------------------
   Un registre plat d'arêtes GÉNÉRIQUES, par édition, sur Storage :

       Edge { id, from, to, type, weight?, label?, since?, until?, scope?,
              color?, dashed?, dir? }

   `from`/`to` = ids d'entités (PJ, contact, serveur…) OU de nœuds
   `Dossiers` (scène, fait). `type` qualifie l'arête :
       "contact"  → lien PJ→contact  (weight = loyauté, label = relation)
       "clue"     → indice scène→fait (validateur d'enquête, futur)
       "relation" → rivalité/lien générique ratifié

   Style d'arête (Lot 3, mind-map éditable — annotations NEUTRES côté
   édition, portées par l'arête, sa seule vérité) : `color` (CSS, nue =
   accent d'édition), `dashed` (bool), `dir` ("none"|"forward"|"back"|
   "both", direction PUREMENT narrative — jamais une marque SR5). Tous
   optionnels et additifs : `upsert` les porte via Object.assign, aucune
   migration (une vieille arête les lit `undefined` = défauts).

   Ce module N'EST PAS une 4ᵉ Collection : pas de roster, pas de
   groupes — juste la forme d'arête. Les arêtes sont keyées par ID
   (robuste au renommage). VIS-15 B0 : `contactLinks` (jadis porté
   par le PJ dans `characters_all`) y est MIGRÉ (`storage.js` v11) et
   relu ici — plus deux foyers d'arêtes. Feuille : dépend de Storage
   seul. Cf. PLANS/PLAN_MOTEUR_GRAPHE_UNIFIE.md § B0.
   ============================================================ */
import { Storage } from "./storage.js";

export const RelationsStore = {
  _key: "entity_relations",
  _edges: [],

  /* ---- Persistance (par édition, via Storage) ---- */
  load() {
    const raw = Storage.get(this._key, []);
    this._edges = Array.isArray(raw) ? raw : [];
    return this._edges;
  },
  save() {
    Storage.set(this._key, this._edges);
  },

  _uid() {
    return "e" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  },

  /* ---- Lecture générique ---- */
  all() {
    return this._edges;
  },
  /** Arêtes filtrées par `from`/`to`/`type` (chaque critère optionnel). */
  edgesWhere({ from = null, to = null, type = null } = {}) {
    return this._edges.filter(
      (e) =>
        e &&
        (from == null || e.from === from) &&
        (to == null || e.to === to) &&
        (type == null || e.type === type),
    );
  },
  /** Toutes les arêtes incidentes à une entité (dans un sens ou l'autre). */
  edgesTouching(id) {
    return this._edges.filter((e) => e && (e.from === id || e.to === id));
  },

  /* ---- Mutation générique ---- */
  /** Insère ou met à jour une arête. Unicité par (from, to, type) : une
      seconde arête « contact » entre les mêmes bouts met à jour la
      première plutôt que d'en créer une seconde. Renvoie l'arête. */
  upsert(edge) {
    if (!edge || !edge.from || !edge.to || !edge.type) return null;
    let e = this._edges.find(
      (x) => x.from === edge.from && x.to === edge.to && x.type === edge.type,
    );
    if (e) Object.assign(e, edge, { id: e.id });
    else {
      e = Object.assign({ id: this._uid() }, edge);
      this._edges.push(e);
    }
    this.save();
    return e;
  },
  /** Retire les arêtes correspondant au filtre (from/to/type). */
  removeWhere({ from = null, to = null, type = null } = {}) {
    const before = this._edges.length;
    this._edges = this._edges.filter(
      (e) =>
        !(
          e &&
          (from == null || e.from === from) &&
          (to == null || e.to === to) &&
          (type == null || e.type === type)
        ),
    );
    if (this._edges.length !== before) this.save();
  },
  /** Purge (intégrité) toutes les arêtes incidentes à l'une des entités
      supprimées. Renvoie les arêtes retirées (pour un éventuel undo). */
  purgeEntities(ids) {
    const set = ids instanceof Set ? ids : new Set(ids);
    const removed = this._edges.filter((e) => e && (set.has(e.from) || set.has(e.to)));
    if (removed.length) {
      this._edges = this._edges.filter((e) => !(e && (set.has(e.from) || set.has(e.to))));
      this.save();
    }
    return removed;
  },
  /** Réinsère des arêtes retirées (undo de suppression). Idempotent par id. */
  addEdges(edges) {
    if (!Array.isArray(edges) || !edges.length) return;
    const byId = new Set(this._edges.map((e) => e && e.id));
    let changed = false;
    for (const e of edges)
      if (e && e.id && !byId.has(e.id)) {
        this._edges.push(e);
        byId.add(e.id);
        changed = true;
      }
    if (changed) this.save();
  },

  /* ---- Vue typée « contact » (absorbe l'ancien pnj.contactLinks) ---- */
  /** Liens contact d'un PJ, à la FORME héritée `{ contactId, relation,
      loyalty }` (les lecteurs de carte/modale changent de source, pas de
      forme). Dé-doublonné par contact (un merge cross-appareil pourrait
      poser deux arêtes contact vers le même bout). */
  contactLinksOf(pnjId) {
    const seen = new Set();
    const out = [];
    for (const e of this.edgesWhere({ from: pnjId, type: "contact" })) {
      if (seen.has(e.to)) continue;
      seen.add(e.to);
      out.push({ contactId: e.to, relation: e.label || "", loyalty: e.weight ?? null });
    }
    return out;
  },
  /** Lie un contact à un PJ. Renvoie false si le lien existe déjà (le
      contrôleur en tire le toast « déjà lié »), true sinon. */
  linkContact(pnjId, contactId, relation, loyalty) {
    if (!pnjId || !contactId) return false;
    if (this.edgesWhere({ from: pnjId, to: contactId, type: "contact" }).length)
      return false;
    this.upsert({
      from: pnjId,
      to: contactId,
      type: "contact",
      label: relation || "",
      weight: loyalty ?? null,
    });
    return true;
  },
  unlinkContact(pnjId, contactId) {
    this.removeWhere({ from: pnjId, to: contactId, type: "contact" });
  },
};

// Pont couche 1 (voir PLANS/PLAN_MODULES_ES.md) : global classique tant
// que les couches hautes n'ont pas basculé en `import`.
window.RelationsStore = RelationsStore;
