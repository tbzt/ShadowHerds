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

import { Statuses } from "./statuses.js";

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

  /** DOMAINES (lot F1b) — combat, magie, Matrice.

      Le lot F1 tenait dans une seule liste : 32 actions en SR6, 36 en SR5.
      F1b y verse les tables magique et matricielle et fait passer SR6 à 76,
      SR5 à 74. « tous… » deviendrait un mur de puces où l'œil ne retrouve
      rien — d'où trois rubriques, dans l'ordre où le livre les imprime.

      `domain` absent = combat : c'est la table de référence, celle qu'on joue
      le plus, et elle n'a pas à porter une étiquette pour exister. */
  DOMAINS: [
    { key: "combat", label: "Combat" },
    { key: "magie", label: "Magie" },
    { key: "matrice", label: "Matrice" },
  ],

  domain(entry) {
    return (entry && entry.domain) || "combat";
  },

  /** Le reste du catalogue, groupé par domaine et dans l'ordre du contrat.
      Les rubriques vides ne sont pas rendues : une édition sans magie ni
      Matrice n'affiche qu'une liste, exactement comme avant F1b. */
  restByDomain(pnj) {
    const reste = this.rest(pnj);
    return this.DOMAINS.map((d) => ({
      ...d,
      entries: reste.filter((a) => this.domain(a) === d.key),
    })).filter((g) => g.entries.length);
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
  costLabel(pnj, entry, cost) {
    // SR5 classe DEUX actions matricielles en « Variable » (Contrôler un
    // appareil, Rechercher des données) : leur type dépend de la situation.
    // Le dire est la seule réponse honnête — inventer un jeton serait pire que
    // n'en poser aucun, et « gratuit » serait un contresens.
    if (entry && entry.variable) return "coût variable";
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
    // `cost` explicite = le coût DÉJÀ résolu (surtaxes d'état comprises, lot
    // F3). Sans lui, le coût nu du contrat — les appelants antérieurs à F3 ne
    // bougent pas.
    const parts = (cost || this.cost(entry)).map((c) => `${c.n} ${nom(c.key)}${c.n > 1 ? "s" : ""}`);
    return parts.join(" + ") || "gratuit";
  },

  /* ============================================================
     SURTAXES D'ÉTAT (lot F3) — le coût réel d'une action, ici et maintenant.

     `Statuses` déclare la FORME d'une surtaxe, ce module la RÉSOUT contre une
     action : lui seul sait ce qu'est une action, sa clé, son groupe de coût.
     C'est le point où la table des états et la table des actions se parlent
     pour de bon — E4 avait ouvert la porte avec le verrou « surpris ».
     ============================================================ */

  /** Une règle de surtaxe frappe-t-elle CETTE action ?
      `targets` vise des clés d'action nommées (Couvert → « Attaquer »),
      `group` vise une nature de coût (Estropié I → toutes les mineures). Sans
      l'un ni l'autre, la règle frappe tout. */
  _hits(entry, rule) {
    if (entry.noSurcharge) return false;
    if (rule.targets && !rule.targets.includes(entry.key)) return false;
    if (rule.group && !this.cost(entry).some((c) => c.key === rule.group)) return false;
    return true;
  },

  /** Le coût RÉEL d'une action sur ce PNJ, surtaxes comprises, plus de quoi
      l'expliquer. Un chiffre ne monte jamais sans nom — miroir exact de
      `Statuses.globalDiceSources`, qui l'avait établi pour les malus de dés.

      → { cost, sources, warnings }
        · `cost`     — la liste à débiter (base + surtaxes AUTO)
        · `sources`  — [{ name, cost, why }] les surtaxes appliquées
        · `warnings` — [{ name, cost, why }] celles que le MJ doit trancher
                       lui-même (`auto: false`), affichées et jamais débitées */
  costWith(pnj, entry) {
    const base = this.cost(entry);
    const sources = [];
    const warnings = [];
    if (!entry) return { cost: base, sources, warnings };

    const agg = new Map();
    for (const c of base) agg.set(c.key, (agg.get(c.key) || 0) + c.n);

    for (const s of Statuses.surcharges(pnj)) {
      for (const r of s.rules) {
        if (!this._hits(entry, r)) continue;
        // `targeted` — la règle NOMME ses actions (Couvert → « Attaquer »),
        // par opposition à celle qui frappe toute une nature (Estropié → toutes
        // les mineures). La distinction n'est pas cosmétique : elle décide OÙ
        // l'avertissement se dit. Cf. `conditionalNotices`.
        const item = { name: s.name, level: s.level, cost: r.cost || [], why: r.why || s.why || "", targeted: !!r.targets };
        if (s.auto) {
          for (const c of item.cost) agg.set(c.key, (agg.get(c.key) || 0) + c.n);
          sources.push(item);
        } else {
          warnings.push(item);
        }
      }
    }
    return { cost: [...agg].map(([key, n]) => ({ key, n })), sources, warnings };
  },

  /* ============================================================
     INTERDICTIONS (lot F3b) — ce que le livre refuse, l'app le refuse aussi.

     F3 avait branché les états qui RENCHÉRISSENT une action. Quelques-uns ne la
     renchérissent pas : ils l'INTERDISENT. Électrocuté écrit « il ne peut
     effectuer une action Sprinter », À terre « il ne peut pas Sprinter ».

     ── Pourquoi refuser ici, alors qu'E3 refusait de griser ────────────────
     E3 a posé que l'app ne grise pas un bouton, parce que « griser retirerait
     au MJ un arbitrage que le livre lui rend explicitement ». La nuance est
     dans « que le livre lui rend » : E3 parlait d'effets CONDITIONNELS
     (« −3 aux tests liés à la vision » — c'est au MJ de dire si le test est
     lié à la vision). Ici, il n'y a rien à arbitrer : le livre nomme l'action
     et n'y met aucune condition.

     Le précédent existe et il est exactement celui-là — E4, `blockedByStatus` :
     un personnage Surpris ne peut déclarer aucune interruption, la console
     refuse et DIT pourquoi. F3b applique la même règle à la feuille d'actions.

     ── Deux formes, deux traitements ──────────────────────────────────────
     · `forbids` — le livre NOMME l'action → la puce est refusée, motif affiché.
     · `halts`   — « aucune action possible », avec ou sans liste blanche
       (Figé, Paniqué, Pétrifié) → un rappel en tête de feuille, et RIEN de
       grisé. Deux raisons : la liste blanche est un arbitrage (« sauf pour
       éviter la source de l'état » — quelle action est-ce ?), et griser 76
       puces d'un coup répéterait l'erreur corrigée en F3 pour Estropié.
     ============================================================ */

  /** Cette action est-elle interdite à ce PNJ ? → [{ name, why }], vide sinon. */
  forbidden(pnj, entry) {
    if (!entry) return [];
    return Statuses.forbids(pnj)
      .filter((f) => f.actions.includes(entry.key))
      .map((f) => ({ name: f.name, why: f.why }));
  },

  /** Les arrêts larges à annoncer une fois — jamais un verrou. */
  halts(pnj) {
    return Statuses.halts(pnj);
  },

  /** Les surtaxes conditionnelles qui frappent TOUTE UNE NATURE d'action, à
      dire UNE FOIS au-dessus de la feuille plutôt que sur chaque puce.

      C'est une correction de conception, faite en regardant l'écran : avec
      Estropié II posé, la règle « les actions impliquant le membre » touche
      potentiellement 75 puces sur 76, et un ⚠ sur chacune n'avertit de rien —
      c'est le bruit que le bilan de round (E3b) évite déjà en restant muet
      quand il n'a rien à dire. Le ⚠ sur la puce reste réservé aux surtaxes qui
      NOMMENT leur cible, où il désigne vraiment quelque chose.

      L'avertissement par action, lui, ne disparaît pas : il est dans le toast
      au moment où l'action est jouée, c'est-à-dire là où le MJ a une décision
      à prendre. → [{ name, level, cost, why }] */
  conditionalNotices(pnj) {
    const out = [];
    for (const s of Statuses.surcharges(pnj)) {
      if (s.auto) continue;
      for (const r of s.rules) {
        if (r.targets) continue; // ciblée → elle se dit sur la puce
        out.push({ name: s.name, level: s.level, cost: r.cost || [], why: r.why || s.why || "" });
      }
    }
    return out;
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

  /* ============================================================
     POSE ET RETRAIT D'ÉTAT (lot F4) — ce que le livre écrit dans la même phrase.

     Le livre ne sépare pas l'action de son effet : « Se coucher : il obtient
     alors l'état À terre », « Se relever : se débarrasse de l'état À terre ».
     L'app le faisait en deux gestes — jouer l'action, puis poser l'état à la
     main — et le second s'oubliait.

     `sets`   — la conséquence est MÉCANIQUE : le livre l'écrit sans jet ni
                choix. Appliquée, et dite.
     `maySet` — la conséquence dépend d'un JET (« si vous réussissez, le feu
                s'éteint ») ou d'un CHOIX (« s'il choisit de se déplacer de plus
                de 2 mètres »). PROPOSÉE, jamais appliquée : c'est la même
                frontière qu'E3b, qui rappelle un test et tend les dés sans
                jamais lire le résultat.

     ⚠ Sur la règle « l'app ne pose jamais un état d'elle-même » : elle n'est pas
     enfreinte, elle est précisée — cf. l'amendement en tête de `statuses.js`.
     Le MJ pose toujours ; il le fait par le nom de l'action au lieu du nom de
     l'état. Ce que l'app continue de ne JAMAIS faire, c'est déduire un état
     d'une situation qu'elle observe.

     ⚠ Un niveau posé par une action est un PLANCHER quand le livre en laisse le
     choix (« Couvert I, II, III ou IV » selon l'abri) : l'app pose le minimum,
     le MJ monte d'un tap. Jamais l'inverse — elle ne peut pas accorder plus que
     le livre. Même raisonnement que le −1 mineure de Nauséeux (F3).
     ============================================================ */

  /** Les états qu'une action pose ou retire MÉCANIQUEMENT.
      → [{ status, level, note }] */
  sets(entry) {
    return (entry && entry.sets) || [];
  },

  /** Ceux qu'elle pose ou retire SOUS CONDITION — proposés, jamais appliqués.
      → [{ status, level, when }] */
  maySet(entry) {
    return (entry && entry.maySet) || [];
  },

  /** Nom lisible d'un état visé, pour l'annonce. Résolu contre le catalogue de
      l'édition : une clé inconnue (édition sans cet état) est ignorée par
      l'appelant, jamais affichée nue. */
  statusName(pnj, key) {
    const s = Statuses.find(pnj, key);
    return s ? s.name : null;
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
