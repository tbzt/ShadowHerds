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

import { EdgeActions } from "./edgeactions.js";
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
      contrat — les deux étages de la feuille de pose, comme les états.

      ⚠ CE QUI MÉRITE `quick` — arbitrage utilisateur du 2026-07-28, après
      usage réel. Le critère n'est pas « ce que le livre imprime en premier »
      mais **ce que le MJ tape le plus souvent, et qui n'a pas d'autre porte**.

      SORTIS vers « tous… » : les manipulations de chargeur (Éjecter, Insérer,
      Recharger). Elles sont MOTORISÉES DIRECTEMENT SUR L'ARME depuis F5d — le
      panneau pré-jet porte « Recharger » avec son prix, dans la ligne des
      munitions — donc les garder en accès direct offrait deux portes au même
      geste, dont une qui ne connaît ni l'arme ni son chargeur.

      ENTRÉS : Attaques multiples, Cibler, Courir / Se déplacer, Se jeter au
      sol — les quatre réflexes d'un tour de combat, toutes gratuites ou
      mineures, et sans aucune autre surface. Avec Ajuster, Se mettre à couvert
      et Se relever qui ne bougent pas.

      La liste reste courte À DESSEIN : sept entrées en SR5, huit en SR6, sur
      un catalogue de 74 et 76. Ce qui n'est pas là n'est pas caché — « tous… »
      est à un tap, et rien ne se masque en silence. */
  quick(pnj) {
    return this.catalog(pnj).filter((a) => a.quick && !this.hasDoor(a));
  },
  rest(pnj) {
    return this.catalog(pnj).filter((a) => !a.quick && !this.hasDoor(a));
  },

  /* ============================================================
     LES AUTRES PORTES (lot G2) — généralisation de `viaWeapon`.

     `viaWeapon` disait depuis F1 une chose vraie et utile : « cette action
     existe, elle se débite, mais son point d'entrée est ailleurs ». Taper
     « Ares Alpha » EST l'action Attaquer ; l'offrir une seconde fois dans la
     feuille donnerait deux portes au même geste.

     La feuille en comptait pourtant HUIT AUTRES, mesurées : Lancer un sort a
     le bloc Sorts, Invoquer et Bannir ont leurs chips ✦, Pic de données et ses
     trois voisines ont le râtelier Matrice, Recharger a le panneau de l'arme.
     Le catalogue le SAVAIT — l'en-tête de `actionModel` en SR6 écrit noir sur
     blanc « elles ont déjà leur surface motorisée ; ce qui leur manquait,
     c'était uniquement leur COÛT » — mais rien ne le lisait.

     ⚠ ET LE COÛT NE SE PAYAIT PAS. C'est le vrai défaut que ce lot corrige, et
     il est plus grave que le doublon : sur les trois portes concernées, AUCUNE
     n'appelait `useAction`. Le mage qui lançait son sort depuis le bloc Sorts
     ne payait rien ; le même sort depuis la feuille coûtait une majeure. Deux
     portes, deux prix, dont un gratuit. Fermer la porte en trop sans brancher
     le débit sur celle qui reste aurait donc effacé le coût, pas déplacé.

     `via` est la CLÉ de la porte, jamais son libellé : c'est par elle que la
     porte retrouve l'action à débiter (`byDoor`), et c'est `DOORS` qui donne le
     mot à afficher. Une seule déclaration, deux lecteurs. `viaWeapon` garde sa
     forme booléenne — la résolution d'une arme a besoin de `family` et de
     `weaponMatch`, que ce champ-ci ne porte pas.
     ============================================================ */

  /** Où se joue une action qui ne s'affiche pas dans la feuille. Le libellé est
      celui que le MJ lit dans le rappel — il doit NOMMER un endroit de l'écran,
      pas une abstraction : « rien ne se masque en silence » n'est tenu que si
      le rappel dit où regarder. */
  DOORS: {
    arme: "le panneau de l'arme",
    rechargement: "le panneau de l'arme",
    sorts: "le bloc Sorts",
    formes: "le bloc Formes complexes",
    invocation: "la chip ✦ Esprit",
    bannissement: "la chip ✦ Bannir",
    compilation: "la chip ✦ Sprite",
    decompilation: "la chip ✦ Décompiler",
    matrice: "le râtelier Matrice",
    // La console « Réagir », c'est-à-dire la ligne du PNJ quand ce n'est PAS
    // son tour. Seule porte de ce tableau qui ne soit pas sur la fiche active,
    // et c'est le fond du sujet : une action `timing:"L"` se joue pendant le
    // tour d'un autre. Cf. `counterSpellFor`.
    reactions: "la console Réagir",
  },

  /** Cette action a-t-elle un point d'entrée AILLEURS que la feuille ? */
  hasDoor(entry) {
    return !!(entry && (entry.viaWeapon || entry.via));
  },

  /** L'action du catalogue que dessert CETTE porte, ou null si l'édition n'en
      déclare pas (SR6 n'a pas d'action « tisser une forme complexe » ; Anarchy
      n'a pas de catalogue du tout). C'est le point d'entrée des portes elles-
      mêmes : `MagicAction` demande « sorts », le panneau d'invocation demande
      « invocation », et aucune ne code en dur une clé d'édition. */
  byDoor(pnj, door) {
    return this.catalog(pnj).find((a) => a.via === door) || null;
  },

  /** Ce qui ne s'affiche PAS dans la feuille parce que ça se joue ailleurs,
      groupé par endroit → [{ where, n }]. Dit une fois en tête de feuille, sur
      le patron de `closedDomains` : une action retirée de la vue doit dire où
      elle est partie, sinon le MJ la croit disparue.

      ⚠ LIMITÉ AUX DOMAINES OÙ CE PNJ PEUT AGIR — corrigé en le regardant à
      l'écran. Sans ce filtre, le ganger lisait « 1 action se joue depuis le
      bloc Sorts · 4 actions depuis le râtelier Matrice » alors qu'il n'a ni
      l'un ni l'autre sur sa fiche : un renvoi vers un endroit qui n'existe pas
      pour lui est pire qu'un silence, il envoie chercher. La ligne juste
      au-dessus lui dit déjà que la magie et la Matrice sont fermées, et
      `closedDomains` compte ces actions-là — chaque action masquée est donc
      annoncée exactement une fois, par la raison qui la masque vraiment. */
  doorGroups(pnj) {
    const par = new Map();
    for (const a of this.catalog(pnj)) {
      if (!a.via) continue; // `viaWeapon` a sa porte évidente : l'arme elle-même
      if (!this.domainAvailable(pnj, this.domain(a))) continue;
      const where = this.DOORS[a.via] || a.via;
      par.set(where, (par.get(where) || 0) + 1);
    }
    return [...par].map(([where, n]) => ({ where, n }));
  },

  /** ⚠ `viaWeapon` — l'action existe au catalogue (elle a un coût, elle se
      débite) mais ne s'affiche PAS dans la feuille : son point d'entrée est
      l'ARME, dans les blocs d'offense. Taper « Ares Alpha » EST l'action
      Attaquer — le livre ne connaît qu'un geste, l'app ne doit pas en offrir
      deux. Le décompte, lui, passe toujours par `useAction`. */
  viaWeapon(pnj) {
    return this.catalog(pnj).filter((a) => a.viaWeapon);
  },

  /** L'action `viaWeapon` que dessert CETTE arme — jamais `viaWeapon()[0]`.

      SR5 en déclare SIX, à DEUX prix différents : « Faire feu (CC, SA, TR,
      TA) » coûte une simple, « Attaquer en mêlée » une complexe — c'est-à-dire
      la phase d'action entière. Prendre le premier de la liste facturait donc
      un coup de katana au prix d'un coup de pistolet, et laissait « Lancer une
      arme », « Tirer à l'arc » et « Faire feu (arme montée) » sans aucun point
      d'entrée. La LISTE est la règle ; l'index l'effaçait.

      Ce magasin ne sait pas ce qu'est un arc : c'est l'édition qui déclare, sur
      son entrée, l'arme qu'elle dessert (`weaponMatch` pour un cas nommé,
      `family` pour le cas générique). Une famille n'a QU'UNE entrée générique,
      donc la résolution est déterministe. Les actions de tir portent déjà
      `shot` et se débitent par le mode de tir (`fireModes[].actionKey`) — elles
      ne passent ici que si l'arme ne déclare aucun mode lisible. */
  viaWeaponFor(pnj, weaponName, family) {
    const list = this.viaWeapon(pnj);
    if (!list.length) return null;
    const nomme = this.viaWeaponNamed(pnj, weaponName);
    if (nomme) return nomme;
    const generique = list.find((a) => a.family === family && !a.weaponMatch);
    return generique || list[0];
  },

  /** Le contrat d'AJUSTER de l'édition, ou null si elle n'en déclare pas
      (Anarchy : la surface disparaît d'elle-même). Ce magasin ne connaît ni la
      Volonté ni la Précision — il rend la spéc, `Encounter` compte les crans
      et `WeaponRoll` les applique. */
  aimModel(pnj) {
    const mod = pnj ? App.getEditionModule(pnj.edition) : null;
    return (mod && mod.aimModel) || null;
  },

  /** Le plafond de cumul d'Ajuster pour CE personnage — la spéc le donne comme
      une fonction parce qu'il dépend d'un attribut (moitié de la Volonté en
      SR5, Volonté entière en SR6). 0 si l'édition n'a pas la règle. */
  aimMax(pnj) {
    const m = this.aimModel(pnj);
    if (!m || typeof m.max !== "function") return 0;
    return Math.max(0, m.max(pnj) || 0);
  },

  /** L'action que l'édition NOMME pour cette arme, ou null. Séparée parce que
      le chemin du tir a besoin de la question seule : un arc et une arbalète
      déclarent « CC » comme un pistolet, donc leur mode renvoie « Faire feu »
      alors que le livre leur donne « Tirer à l'arc ». Même prix, autre nom —
      et c'est le nom que le MJ lit. Sans clé nommée, le mode reste maître. */
  viaWeaponNamed(pnj, weaponName) {
    const nom = String(weaponName || "");
    return this.viaWeapon(pnj).find((a) => a.weaponMatch && a.weaponMatch.test(nom)) || null;
  },

  /** DOMAINES (lot F1b, quatrième rubrique au lot G1) — combat, magie,
      Matrice, pilotage.

      Le lot F1 tenait dans une seule liste : 32 actions en SR6, 36 en SR5.
      F1b y verse les tables magique et matricielle et fait passer SR6 à 78,
      SR5 à 76. « tous… » deviendrait un mur de puces où l'œil ne retrouve
      rien — d'où des rubriques, dans l'ordre où le livre les imprime.

      ── PILOTAGE (G1) : le domaine qui manquait ─────────────────────────────
      F1b s'était arrêté aux rubriques que le LIVRE imprime en tables séparées.
      Mais la question que `domainAvailable` pose n'est pas « le livre range-t-il
      ça à part ? », c'est « ce PNJ peut-il seulement agir là ? ». À ce compte,
      Commander un drone / Contrôler un drone à distance / Plonger (rigger) /
      Utiliser une CCR sont aussi inutiles à un vigile que Lancer un sort —
      **quatre puces en SR6, une en SR5** (Plonger dans un véhicule) qui ne
      servaient à personne d'autre qu'à un rigger, et qu'aucune porte ne fermait.
      Le livre les imprime dans la table de combat ; ce n'est pas une raison
      pour les proposer à un molosse.

      Ce domaine est donc le premier qui ne CALQUE PAS une table du livre : il
      calque une capacité de la fiche, comme les trois autres le font déjà par
      leur prédicat. La rubrique arrive en dernier — c'est la moins jouée des
      cinq, et l'ordre d'une feuille ne se renégocie pas à chaque ouverture.

      ── RÉSONANCE (G1) : la Matrice avait DEUX publics ─────────────────────
      « Matrice » restait ouverte au decker comme au technomancien, et c'est
      juste — le livre SR5 (p.252) fait jouer au technomancien les MÊMES actions
      matricielles, par la Résonance. Mais sept d'entre elles ne sont PAS les
      mêmes : compiler, inscrire, décompiler un sprite, lui donner un ordre,
      l'appeler, tisser et tuer une forme complexe. Un decker n'a ni sprite ni
      forme complexe, et le rappel des portes le renvoyait vers une « chip
      ✦ Sprite » qui n'existe pas sur sa fiche — un renvoi vers un endroit
      absent, ce que ce lot s'était justement interdit.

      Le prédicat « matrice » n'était donc pas trop large : c'est la rubrique
      qui confondait deux publics. On ne resserre pas, on SÉPARE.

      `domain` absent = combat : c'est la table de référence, celle qu'on joue
      le plus, et elle n'a pas à porter une étiquette pour exister. */
  DOMAINS: [
    { key: "combat", label: "Combat" },
    { key: "magie", label: "Magie" },
    { key: "matrice", label: "Matrice" },
    { key: "resonance", label: "Résonance" },
    { key: "pilotage", label: "Pilotage" },
  ],

  domain(entry) {
    return (entry && entry.domain) || "combat";
  },

  /** Ce PNJ peut-il seulement AGIR dans ce domaine ? (lot F5b)

      « Lancer un sort » sur un ganger sans une once de Magie, « Pic de
      données » sur un troll sans cyberjack : ce sont 44 puces qui ne servent
      jamais, chez la grande majorité des PNJ. Le combat, lui, n'a pas de
      condition — tout le monde peut frapper.

      Le prédicat vit dans le module d'édition (`actionModel.domains`), jamais
      ici : ce magasin ne sait pas ce qu'est un cyberdeck. Domaine sans
      prédicat = toujours disponible, pour qu'une édition qui n'en déclare pas
      se comporte exactement comme avant. */
  domainAvailable(pnj, key) {
    const m = this.model(pnj);
    const spec = m && m.domains && m.domains[key];
    return !spec || !spec.when || !!spec.when(pnj);
  },

  /** Le reste du catalogue, groupé par domaine et dans l'ordre du contrat,
      LIMITÉ aux domaines où ce PNJ peut agir. Les rubriques vides ou fermées
      ne sont pas rendues — mais `closedDomains` dit lesquelles et pourquoi :
      rien ne se masque en silence. */
  restByDomain(pnj) {
    const reste = this.rest(pnj);
    return this.DOMAINS.filter((d) => this.domainAvailable(pnj, d.key))
      .map((d) => ({ ...d, entries: reste.filter((a) => this.domain(a) === d.key) }))
      .filter((g) => g.entries.length);
  },

  /* ============================================================
     LE MOMENT, DEUXIÈME AXE DE RANGEMENT (lot G3).

     Le domaine répond à « ce PNJ peut-il agir là ? ». Il ne répond pas à la
     question que l'utilisateur a posée ensuite — « pas forcément au bon
     moment ». Or le catalogue porte déjà la réponse, depuis F1 : `timing`.

     SR6 note chaque action « I » (au moment de son initiative) ou « L » (choix
     libre, à n'importe quel moment). Les « L » sont des RÉACTIONS — Bloquer,
     Esquiver, Éviter, Intercepter, Assister, Contrer un sort, Défense
     matricielle totale. Le PNJ actif ne les joue jamais à son tour : elles se
     déclarent quand quelqu'un d'AUTRE agit. Mélangées aux dix-huit actions du
     tour, elles obligeaient l'œil à trier à chaque ouverture ce que le livre
     avait déjà trié.

     ⚠ ELLES NE CHANGENT PAS DE SURFACE, seulement de rangée. L'ancrage posé en
     tête de ce module tient : une action qui se paie en JETONS vit là où le
     budget se manipule, par opposition aux interruptions SR5 qui se paient en
     score d'initiative et vivent dans la console de réaction. Les séparer en
     rubrique, c'est appliquer ce que le livre imprime — ce n'est pas les
     déménager.

     La rubrique traverse les domaines (« Contrer un sort » est magique ET hors
     tour) : chaque puce garde donc son domaine, et donc sa teinte. Le domaine
     dit CE QUE C'EST, la rubrique dit QUAND ÇA SE JOUE — deux questions, deux
     canaux, jamais le même.

     SR5 n'a pas de `timing` : ses réactions hors tour SONT les interruptions,
     déjà ailleurs. La rubrique n'apparaît donc pas, sans une ligne de garde —
     elle est vide, et une rubrique vide ne s'imprime pas.
     ============================================================ */

  OUT_OF_TURN: { key: "horsTour", label: "Hors tour" },

  /** Le reste du catalogue tel que la feuille le range : les domaines ouverts
      (ce qui se joue à son tour), puis « Hors tour ». → [{ key, label, entries }] */
  restGroups(pnj) {
    const parDomaine = this.restByDomain(pnj);
    const groupes = parDomaine
      .map((g) => ({ ...g, entries: g.entries.filter((a) => a.timing !== "L") }))
      .filter((g) => g.entries.length);
    const hors = parDomaine.flatMap((g) => g.entries).filter((a) => a.timing === "L");
    if (hors.length) groupes.push({ ...this.OUT_OF_TURN, entries: hors });
    return groupes;
  },

  /** Les domaines fermés à ce PNJ, avec leur motif — pour la ligne de rappel.
      → [{ key, label, why, n }]

      ⚠ Le compte se fait sur le CATALOGUE, pas sur `rest()` (lot G2). Depuis
      que les actions à autre porte sortent de `rest()`, compter là aurait
      annoncé « 8 magie masquées » pour une table qui en a onze : les trois qui
      ont une porte auraient disparu des DEUX comptes — de celui-ci parce
      qu'elles ne sont plus dans `rest()`, et du rappel des portes parce que
      leur domaine est fermé. Un domaine fermé masque tout ce qu'il contient ;
      c'est ce nombre-là que le MJ doit lire. */
  closedDomains(pnj) {
    const m = this.model(pnj);
    const cat = this.catalog(pnj);
    return this.DOMAINS.filter((d) => !this.domainAvailable(pnj, d.key)).map((d) => ({
      ...d,
      why: (m.domains[d.key] && m.domains[d.key].why) || "",
      n: cat.filter((a) => this.domain(a) === d.key).length,
    }));
  },

  /* ============================================================
     GREFFONS D'ATOUT (lot F5, révision de surface).

     Première version : un bouton ✦ sur la rangée d'Atout, dépliant les 82
     actions d'Atout filtrées. Le panel a tranché en deux mots — « la question
     que la feuille devrait poser n'est pas un filtre à cocher, c'est : quelle
     action le PNJ vient-il de déclarer ? » — et le design system a ajouté
     « une feuille par intention de jeu, pas par ressource ».

     Ils avaient raison, et le LIVRE le disait déjà : il range ces options par
     leur hôte, entre parenthèses. « Arracher (Bloquer) ». Le MJ ne cherche
     jamais « une action d'Atout » ; il joue une action et se demande s'il peut
     l'améliorer. Les greffons remontent donc SUR L'ACTION, au moment où elle
     est jouée — 47 puces à trier deviennent trois, sans un seul filtre.
     ============================================================ */

  /** Les actions d'Atout qui se greffent sur cette action-ci, triées par coût
      croissant (le MJ compare au compteur, pas au nom). `EdgeActions` porte le
      filtre à trois axes ; ici on ne fait que demander l'axe « hôte ». */
  grafts(pnj, entryKey, opts) {
    if (!entryKey) return [];
    const keys = this.hostKeys(entryKey, opts && opts.family);
    return EdgeActions.resolve(pnj, { ...(opts || {}), host: keys })
      .visibles.filter((e) => (e.host || []).some((h) => keys.includes(h)))
      .sort((a, b) => a.cost - b.cost);
  },

  /** Les clés d'hôte que couvre une action, FAMILLE D'ARME COMPRISE.

      Le livre SR6 n'a QU'UNE action « Attaquer » — mêlée et distance
      confondues — mais il range ses actions d'Atout selon l'arme : « Arracher
      (Bloquer) », « Poignarder (Attaquer en mêlée) », « Placement parfait
      (Attaquer à distance) ». Dédoubler l'ACTION serait trahir la table p.45 ;
      c'est donc l'ARME qui tranche, au moment où on la choisit.

      Sans famille connue, les deux jeux remontent : mieux vaut une puce de trop
      qu'une règle escamotée (même arbitrage que `matchesHost`). */
  hostKeys(entryKey, family) {
    if (entryKey !== "attaquer") return [entryKey];
    if (family === "melee") return ["attaquer", "attaquerMelee"];
    if (family === "ranged") return ["attaquer", "attaquerDistance"];
    return ["attaquer", "attaquerMelee", "attaquerDistance"];
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
  costWith(pnj, entry, cancelled) {
    const base = this.cost(entry);
    const sources = [];
    const warnings = [];
    if (!entry) return { cost: base, sources, warnings };
    // F5 — les surtaxes ANNULÉES par une action d'Atout déjà déclarée ce tour.
    // Trois d'entre elles achètent la mineure « Attaquer depuis un couvert » ;
    // sans ce filtre, l'app la ferait payer une seconde fois.
    const off = cancelled instanceof Set ? cancelled : new Set(cancelled || []);

    const agg = new Map();
    for (const c of base) agg.set(c.key, (agg.get(c.key) || 0) + c.n);

    for (const s of Statuses.surcharges(pnj)) {
      if (off.has(s.key)) continue; // surtaxe déjà payée en Atout (F5)
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

  /** Cette action PORTE-T-ELLE une attaque ? (lot G4)

      `viaWeapon` couvre les six entrées SR5 et l'unique SR6 : ce sont
      exactement les gestes qui partent d'une arme, et le livre ne compte pas
      autre chose quand il écrit « aucune autre action d'attaque ». `shot` s'y
      ajoute pour les modes de tir, qui se débitent par `fireModes[].actionKey`
      sans forcément passer par une entrée `viaWeapon`.

      ⚠ VOLONTAIREMENT ÉTROIT. « Lancer un sort » est une attaque quand le sort
      en est une, et ne l'est pas sinon — l'app ne lit pas la catégorie du sort
      et deviner reviendrait à décider. Compter une attaque de trop serait pire
      qu'un compte muet : le rappel qui en découle affirmerait une faute que le
      MJ n'a pas commise. */
  isAttack(entry) {
    return !!(entry && (entry.viaWeapon || entry.shot));
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
