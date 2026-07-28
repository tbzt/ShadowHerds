"use strict";

/* ============================================================
   ACTIONS DE COMBAT — le magasin, neutre par édition (lot F1).

   Une action est un GESTE que le livre facture : Attaquer, Recharger, Se
   mettre à couvert, Sprinter… Le CATALOGUE vit dans le module d'édition
   (`actionModel`), jamais ici — même partage que `Statuses`/`statusModel` :
   SR6 en a 32 en combat, SR5 en a 36 réparties en trois natures, Anarchy n'en
   a pas (1 action significative + déplacement gratuit, pas de table).
   Ce module ne connaît que la FORME d'une action, pas son contenu.

   ── Ce qui existait déjà, et ce qui manquait ─────────────────────────────
   L'app comptait les actions depuis longtemps : `actionBudget` porte le COMPTE
   de jetons, `actionExchange` la MONNAIE entre groupes (SR6 p.42), et
   `interruptActions` la 4ᵉ nature SR5. Mais aucune action n'avait de NOM :
   `_consumeAction` n'avait qu'UN SEUL appelant dans tout le projet, la Défense
   totale. Attaquer, recharger, lancer un sort ne coûtaient rien. Ce module ne
   crée pas une machine — il donne un nom à ce que la machine débitait déjà.

   ── Le coût est une LISTE, pas une paire ─────────────────────────────────
   `cost: [{ key, n }, …]`. Deux raisons, toutes deux tirées du livre :

   1. SR5 p.164 accorde « 2 actions simples OU 1 complexe » par phase d'action.
      L'app affichait deux rangées ÉTANCHES — soit trois actions payables — et
      le commentaire d'`actionBudget` assumait le trou (« le "ou" est laissé au
      jugement du MJ »). C'était un arbitrage pris FAUTE DE COÛT NOMMÉ. Une
      complexe déclare désormais `[{complex:1},{simple:2}]` et noircit les trois
      jetons : l'app n'arbitre pas, elle applique un coût que le livre écrit.

   2. Les états qui RENCHÉRISSENT une action (SR6 Estropié « les actions
      mineures impliquant le membre en coûtent deux », Couvert « attaquer à
      couvert coûte 1 mineure supplémentaire ») s'ajouteront à cette liste sans
      toucher au moteur. C'est le lot F3 ; la forme l'attend déjà.

   `fullDefenseFor().actionCost` reste une PAIRE — `cost()` normalise, aucun
   appelant existant ne bouge.

   ── Le `timing` : la trouvaille SR6 ──────────────────────────────────────
   Le livre SR6 (p.45) note chaque action : « c'est soit au moment de
   l'initiative du joueur (I) soit un choix libre à n'importe quel moment (L).
   […] pour pouvoir effectuer une action Libre, vous devez avoir ENCORE UNE
   ACTION EN RÉSERVE durant ce round. »

   `(L)` n'est PAS une troisième catégorie de coût : c'est un MOMENT. Une action
   Libre coûte toujours sa mineure ou sa majeure, mais se déclare hors de son
   tour. SR6 en compte NEUF dans la table de combat (Bloquer, Esquiver, Éviter,
   Intercepter, Se jeter par terre, Lâcher un objet, Changer le mode d'un
   appareil, Assister, Défense totale) — plus deux hors périmètre F1 : Contrer
   un sort (table magique) et Défense matricielle totale (table matricielle).

   ⚠ L'app affirmait le contraire (« en SR6, l'édition n'a qu'une interruption »,
   CHANGELOG 1.124.0). C'est faux : SR6 a un vrai jeu de réactions hors tour.
   Simplement, elles se paient en JETONS et non en score d'initiative comme les
   interruptions SR5 — d'où deux surfaces distinctes et non une fusion.

   ── Ce que ce module ne fait PAS ─────────────────────────────────────────
   Il ne REFUSE jamais une action (garde-fou R4 « pas d'automatisation complète
   du combat » + (e) « informer, jamais décider ») : `affordable` est une
   INFORMATION, pas un verrou. `_consumeAction` débite déjà au-delà du budget
   et le DIT — le MJ a cliqué en connaissance de cause, l'app lui montre
   l'ardoise. Seules refusent les portes que le livre écrit comme des
   interdictions, et elles existent déjà ailleurs (`initGate`, `blockedByStatus`).
   ============================================================ */

export const Actions = {
  /** Spéc d'actions de l'édition d'un PNJ, ou null si elle n'en a pas
      (Anarchy 1 et 2 : la surface disparaît d'elle-même, comme `statusModel`
      absent fait disparaître la ligne d'états). */
  model(pnj) {
    const mod = pnj ? App.getEditionModule(pnj.edition) : null;
    return (mod && mod.actionModel) || null;
  },

  /** Catalogue complet de l'édition, dans l'ordre du contrat. L'ordre est FIXE
      et ne se réordonne JAMAIS selon l'usage : une cible qui se déplace sous le
      doigt entre deux ouvertures produit un mis-tap silencieux (même discipline
      que `Statuses.catalog`). */
  catalog(pnj) {
    const m = this.model(pnj);
    return (m && m.catalog) || [];
  },

  /** Entrée de catalogue par clé, ou null. */
  find(pnj, key) {
    return this.catalog(pnj).find((a) => a.key === key) || null;
  },

  /** Les actions d'accès direct (`quick`) et le reste, dans l'ordre du
      contrat — les deux étages de la feuille de pose, comme les états. */
  quick(pnj) {
    return this.catalog(pnj).filter((a) => a.quick);
  },
  rest(pnj) {
    return this.catalog(pnj).filter((a) => !a.quick);
  },

  /** Coût NORMALISÉ d'une entrée : toujours un tableau `[{ key, n }]`.
      Accepte une paire seule (`fullDefenseFor().actionCost`) pour que les
      appelants antérieurs à ce lot n'aient pas à changer. */
  cost(entry) {
    const c = entry && entry.cost;
    if (!c) return [];
    return Array.isArray(c) ? c : [c];
  },

  /** Le coût en clair : « 1 majeure », « 1 complexe + 2 simples ».
      Les libellés viennent d'`actionBudget` — le module d'édition est la seule
      source des noms de groupes, jamais une table codée en dur ici (prohibition
      n°1 : la règle vit dans l'édition). */
  costLabel(pnj, entry) {
    const mod = pnj ? App.getEditionModule(pnj.edition) : null;
    const budget = (mod && mod.actionBudget && mod.actionBudget(pnj)) || [];
    const nom = (key) => {
      const g = budget.find((b) => b.key === key);
      if (!g) return key;
      // « Mineures » au pluriel dans la rangée, « mineure » au singulier dans
      // une phrase de coût : on redescend au singulier minuscule.
      const l = g.label.toLowerCase();
      return l.endsWith("s") ? l.slice(0, -1) : l;
    };
    const parts = this.cost(entry).map((c) => `${c.n} ${nom(c.key)}${c.n > 1 ? "s" : ""}`);
    return parts.join(" + ") || "gratuit";
  },

  /** Le coût est-il payable avec ce qui reste ? INFORMATION, jamais un verrou :
      l'appelant s'en sert pour marquer visuellement, pas pour désactiver.
      `budget` = groupes déjà résolus (échanges compris) ; `used` = c.actionsUsed. */
  affordable(entry, budget, used) {
    const u = used || {};
    for (const c of this.cost(entry)) {
      const g = (budget || []).find((b) => b.key === c.key);
      const reste = (g ? g.total : 0) - (u[c.key] || 0);
      if (reste < c.n) return false;
    }
    return true;
  },

  /** Les actions déclarables HORS de son tour — SR6 `timing: "L"`. Vide pour
      les éditions qui n'en ont pas (SR5 : ses réactions hors tour sont les
      actions d'INTERRUPTION, qui ne coûtent aucun jeton et vivent dans
      `interruptActions`, cf. l'en-tête). */
  free(pnj) {
    return this.catalog(pnj).filter((a) => a.timing === "L");
  },

  /** Cette action est-elle un TIR ? Lu par le recul progressif SR5 (lot F2) :
      le livre p.178 remet le cumul à zéro dès que le personnage « dépense une
      action simple ou complexe pour AUTRE CHOSE que faire feu ». C'est
      exactement l'information que ce catalogue vient de créer — sans actions
      nommées, le recul progressif n'était pas motorisable. */
  isShot(entry) {
    return !!(entry && entry.shot);
  },

  /** Cette action consomme-t-elle un budget ? (une entrée à coût vide — SR5
      gratuite déclarée sans coût — ne débite rien mais reste affichée). */
  costs(entry) {
    return this.cost(entry).some((c) => c.n > 0);
  },
};
