"use strict";

/* ============================================================
   SCENARIO TEMPLATES — la biblio de squelettes de trame (lots S3/S3b).
   ------------------------------------------------------------
   Deux sources fusionnées par `all()` :
   - les squelettes INTÉGRÉS (données pures ci-dessous, immuables) ;
   - les modèles UTILISATEUR (S3b), extraits d'une trame existante et
     PERSISTÉS via Storage (clé `scenario_templates`, par édition comme
     tout le reste de la trame). Ce module devient donc adossé à Storage
     pour les modèles user — jamais de localStorage direct.

   Chaque template = une suite de `beats` (chacun mappé sur un des 6 TYPES
   de scène de S1 : accroche/repérage/action/sociale/décision/retombée) +
   des `links` par INDEX de beat (résolus en ids à la pose). Édition-NEUTRE :
   une colonne dramatique est commune aux 4 livres.

   Distinction built-in vs user : un modèle INTÉGRÉ porte `key` (immuable,
   sans `id`) ; un modèle UTILISATEUR porte `id` (généré) et peut être
   renommé/supprimé. Les intégrés (S3) : Donjon 5 salles (Johnn Four),
   Story Spine (Kenn Adams), Story Circle (Dan Harmon).

   La pose (create + addSceneNode + addSceneEdge) reste au consommateur
   (ScenarioGraph). Les modèles INTÉGRÉS n'ont pas de x,y (la vue assigne un
   flux zig-zag) ; les modèles UTILISATEUR reportent les positions arrangées
   par le MJ (`b.x/b.y`). Cf. PLANS/architecture-graphe-scenaristique.md § S3/S3b.
   ============================================================ */
import { Storage } from "../../core/storage.js";

export const ScenarioTemplates = {
  _userKey: "scenario_templates", // modèles user (Storage, par édition)

  _templates: [
    {
      key: "five-room",
      label: "Donjon en 5 salles",
      source: "Johnn Four",
      desc: "Cinq temps forts qui montent en tension : le classique pour un run compact.",
      beats: [
        { beat: "entree", type: "accroche", title: "Entrée & gardien", body: "Le seuil du run : ce qui garde l'entrée, la raison d'y aller." },
        { beat: "epreuve", type: "sociale", title: "Épreuve / énigme", body: "Un défi hors combat : négociation, casse-tête, dilemme moral." },
        { beat: "revers", type: "action", title: "Revers / piège", body: "Le twist qui complique : embuscade, trahison, imprévu." },
        { beat: "climax", type: "action", title: "Affrontement (climax)", body: "Le pic de tension : le face-à-face décisif." },
        { beat: "recompense", type: "retombée", title: "Récompense / révélation", body: "Le butin, la vérité — et l'accroche de la suite." },
      ],
      links: [
        { from: 0, to: 1 }, { from: 1, to: 2 }, { from: 2, to: 3 }, { from: 3, to: 4 },
      ],
    },
    {
      key: "story-spine",
      label: "Colonne narrative (Story Spine)",
      source: "Kenn Adams",
      desc: "Sept amorces de phrase qui déroulent une histoire du statu quo à sa nouvelle normalité.",
      beats: [
        { beat: "once", type: "accroche", title: "Il était une fois…", body: "Le statu quo : le monde et les gens avant que tout bascule." },
        { beat: "everyday", type: "repérage", title: "Chaque jour…", body: "La routine, les habitudes — ce qui est normal ici." },
        { beat: "untiloneday", type: "décision", title: "Jusqu'au jour où…", body: "L'élément déclencheur qui rompt l'équilibre." },
        { beat: "becauseof1", type: "action", title: "À cause de ça…", body: "La première conséquence en chaîne." },
        { beat: "becauseof2", type: "action", title: "…et à cause de ça…", body: "L'escalade : chaque acte en appelle un autre." },
        { beat: "untilfinally", type: "action", title: "Jusqu'à ce qu'enfin…", body: "Le climax : la confrontation qui résout la tension." },
        { beat: "eversince", type: "retombée", title: "Et depuis ce jour…", body: "La nouvelle normalité — ce qui a changé pour de bon." },
      ],
      links: [
        { from: 0, to: 1 }, { from: 1, to: 2 }, { from: 2, to: 3 },
        { from: 3, to: 4 }, { from: 4, to: 5 }, { from: 5, to: 6 },
      ],
    },
    {
      key: "story-circle",
      label: "Cercle narratif (Story Circle)",
      source: "Dan Harmon",
      desc: "Huit étapes d'un cycle : le personnage part, paie le prix, revient transformé — et ça recommence.",
      beats: [
        { beat: "you", type: "accroche", title: "Zone de confort", body: "Le personnage dans son ordinaire (You)." },
        { beat: "need", type: "décision", title: "Un besoin", body: "Un désir, un manque qui met en mouvement (Need)." },
        { beat: "go", type: "repérage", title: "Le seuil", body: "Franchir dans une situation inconnue (Go)." },
        { beat: "search", type: "action", title: "La quête", body: "S'adapter, chercher, encaisser (Search)." },
        { beat: "find", type: "action", title: "Trouver", body: "Obtenir ce qu'on cherchait (Find)." },
        { beat: "take", type: "sociale", title: "Le prix", body: "Payer le prix fort de cette trouvaille (Take)." },
        { beat: "return", type: "action", title: "Le retour", body: "Revenir vers le point de départ, transformé (Return)." },
        { beat: "change", type: "retombée", title: "Le changement", body: "Le nouvel équilibre — le personnage a changé (Change)." },
      ],
      links: [
        { from: 0, to: 1 }, { from: 1, to: 2 }, { from: 2, to: 3 }, { from: 3, to: 4 },
        { from: 4, to: 5 }, { from: 5, to: 6 }, { from: 6, to: 7 },
        { from: 7, to: 0, kind: "temporelle", label: "le cycle recommence" },
      ],
    },
  ],

  /** Intégrés + user (les user d'abord absents → tableau vide). */
  all() {
    return this._templates.concat(this._readUser());
  },
  /** Résout par `key` (intégré) OU `id` (user). */
  get(idOrKey) {
    return this.all().find((t) => t && (t.key === idOrKey || t.id === idOrKey)) || null;
  },

  /* ---- Modèles UTILISATEUR (S3b), persistés via Storage (par édition) ---- */
  _readUser() {
    const raw = Storage.get(this._userKey, []);
    return Array.isArray(raw) ? raw : [];
  },
  /** Vrai si le modèle est un modèle utilisateur (renommable/supprimable). */
  isUser(t) {
    return !!(t && t.id);
  },
  /** Extrait d'une trame → enregistre un modèle user. Renvoie le modèle. */
  saveUser({ label, source = "Perso", desc = "", beats = [], links = [] } = {}) {
    const clean = String(label || "").trim();
    if (!clean) return null;
    const tpl = {
      id: "ut" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      label: clean, source, desc,
      beats: beats || [],
      links: links || [],
    };
    const list = this._readUser();
    list.push(tpl);
    Storage.set(this._userKey, list);
    return tpl;
  },
  removeUser(id) {
    if (!id) return false;
    const list = this._readUser();
    const kept = list.filter((t) => t && t.id !== id);
    if (kept.length === list.length) return false;
    Storage.set(this._userKey, kept);
    return true;
  },
  renameUser(id, label) {
    const clean = String(label || "").trim();
    if (!id || !clean) return false;
    const list = this._readUser();
    const t = list.find((x) => x && x.id === id);
    if (!t) return false;
    t.label = clean;
    Storage.set(this._userKey, list);
    return true;
  },
};
