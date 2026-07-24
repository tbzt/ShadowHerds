"use strict";

/* ============================================================
   TRAME GEN — bâtisseur PUR d'une trame jouable à partir d'un topos.
   ------------------------------------------------------------
   Couche 2 (rules), FEUILLE : ne dépend que d'`Utils`. Ne connaît ni
   `ToposCatalog`, ni les stores, ni le DOM — le contrôleur (`RunGen`)
   lui RÉSOUT le contexte (opposition, mandant, sécurité, menace, modèle
   de scènes tiré au sort) et POSE le spec renvoyé dans les stores.

   Principe (cf. REFERENCE/TRAME_MCCARTHY_MODELE.md + topos_coherence_seattle.md,
   motifs relevés dans les scénarios SR6/Anarchy — anatomie de scène : Situation
   → Adversaires → « Et si… » → « Poussez plus loin » → Débriefing) : un topos
   porte déjà tout le conflit ; on le PLIE sur un squelette narratif et on greffe
   TOUTES les couches d'une trame, corrélées entre elles.

   ── VARIÉTÉ ──
   Chaque axe (leads de scène, bang de climax, twist, horloge d'objectif, titres/
   impulsions/présages de front, faits cachés, indices, issues) tire dans un POOL
   de 7-8 variantes ; plusieurs couches sont OPTIONNELLES (présence aléatoire :
   horloge de complication, 2ᵉ fait caché, présage de traque, objectif secondaire
   semé en indice). Deux « Générer la trame » sur le même topos ne se ressemblent
   plus. Édition-NEUTRE : aucune branche d'édition, `system` = donnée d'habillage.
   Cibles (effet d'horloge, ancre d'indice, faction de front) exprimées par
   INDEX/RÔLE, résolues en ids par `RunGen`.
   ============================================================ */
import { Utils } from "../core/utils.js";

/* Casse initiale — fonctions LIBRES de module : les pools de phrases sont des
   fonctions fléchées dans un littéral d'objet, où `this` ne pointe PAS l'objet.
   On les appelle donc sans `this`. */
const cap = (s) => { s = String(s || ""); return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; };
const low = (s) => {
  s = String(s || "");
  if (!s) return s;
  // Ne pas déminuscule un acronyme (CI, MCT, KE…) : deux majuscules initiales.
  if (s.length >= 2 && s[0] === s[0].toUpperCase() && s[1] === s[1].toUpperCase() && s[1] !== s[1].toLowerCase()) return s;
  return s.charAt(0).toLowerCase() + s.slice(1);
};

/* Accord pluriel — quand le nom de faction est au pluriel (« les Ancients »),
   un verbe qui le suit DIRECTEMENT comme sujet doit se conjuger au pluriel. On
   ne touche qu'au verbe collé au nom (lookahead `(?!\p{L})` pour ne pas mordre
   un mot plus long) : le cas « La sécurité DE X suit… » (sujet = la sécurité)
   n'est jamais collé au nom, donc épargné. Formes multi-tokens d'abord. */
const _AGREE_MULTI = [["n'a", "n'ont"], ["n'est", "ne sont"], ["n'exfiltre", "n'exfiltrent"], ["ne cherche", "ne cherchent"], ["ne lâche", "ne lâchent"], ["vous attend", "vous attendent"]];
const _AGREE = [["réagit", "réagissent"], ["resserre", "resserrent"], ["passe", "passent"], ["défend", "défendent"], ["montre", "montrent"], ["lave", "lavent"], ["règle", "règlent"], ["étouffe", "étouffent"], ["protège", "protègent"], ["garde", "gardent"], ["verrouille", "verrouillent"], ["boucle", "bouclent"], ["applique", "appliquent"], ["tire", "tirent"], ["invoque", "invoquent"], ["rameute", "rameutent"], ["rappelle", "rappellent"], ["déclare", "déclarent"], ["lance", "lancent"], ["tient", "tiennent"], ["joue", "jouent"], ["coupe", "coupent"], ["bloque", "bloquent"], ["désamorce", "désamorcent"], ["a", "ont"]];
const _escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const agreePlural = (str, name) => {
  if (!str || !name) return str;
  let s = str;
  const rep = (sg, pl) => {
    s = s.replace(new RegExp(_escRe(name + " " + sg) + "(?!\\p{L})", "gu"), name + " " + pl);
  };
  for (const [sg, pl] of _AGREE_MULTI) rep(sg, pl);
  for (const [sg, pl] of _AGREE) rep(sg, pl);
  return s;
};
/* Contraction « de + article » collée à un nom de faction interpolé : « de les
   Triades » → « des Triades », « de le Vory » → « du Vory » (« de la »/« de l' »
   sont déjà corrects). Sûr : aucun autre « de les/le » dans les gabarits. */
const contractDe = (s) =>
  !s ? s : s
    .replace(/\bde les\b/g, "des")
    .replace(/\bde le\b/g, "du")
    // Élision « de + voyelle / h muet » → « d' » : « de une ruche » → « d'une ruche »,
    // « de Ares » → « d'Ares ». « de la/le/l' » (consonne l) épargnés. Y exclu (« de Yakuza »).
    .replace(/\bde ([aeiouàâäéèêëîïôöûùAEIOUÀÂÄÉÈÊËÎÏÔÖÛÙHh])/g, "d'$1");

export const TrameGen = {
  /* ================= POOLS ================= */

  /* Profils d'OBJECTIF (verbes Vise Juste). `stake` = enjeu, `recon` = axe de
     repérage, `clocks` = pool d'horloges propres, `bangs` = pool de choix forcés. */
  _OBJECTIVES: {
    extraction: {
      stake: "faire sortir la cible vivante",
      recons: [
        "Relever les habitudes de la cible et les angles morts de la sécurité",
        "Localiser la chambre (ou le bureau) de la cible et ses gardes",
        "Repérer le véhicule d'exfiltration et l'itinéraire de repli",
        "Savoir si la cible viendra de gré — ou de force",
      ],
      actions: [
        (c) => `La cible détale : poursuite dans les couloirs de ${c.lieu}.`,
        () => `La cible se débat — elle ne veut pas partir avec vous.`,
        () => `Un garde reconnaît la cible et donne l'alerte.`,
        () => `La cible réclame de récupérer un objet avant de suivre.`,
      ],
      climaxes: [
        (c) => `Dernière ligne droite : sortir la cible de ${c.lieu} pendant que ${c.opp} verrouille tout.`,
        (c) => `${c.opp} bloque l'exfiltration. Passer en force avec la cible, ou ruser ?`,
      ],
      clocks: [
        { type: "objectif", title: "Fenêtre d'exfiltration" },
        { type: "menace", title: "La cible change de main" },
        { type: "alerte", title: "Verrouillage du périmètre" },
      ],
      bangs: [
        "La cible refuse de suivre : la convaincre, l'assommer, ou l'abandonner ?",
        "On l'extrait amochée mais tout de suite, ou intacte mais trop tard ?",
        "Elle n'est pas seule : on embarque le témoin gênant, ou on le laisse ?",
        "La cible supplie qu'on prévienne un proche — on perd du temps, ou on file ?",
      ],
    },
    vol_donnees: {
      stake: "extraire les données sans laisser de trace",
      recons: [
        "Cartographier le host, ses nœuds et la ronde des CI",
        "Trouver le terminal d'accès physique aux données",
        "Repérer le spider de garde et ses horaires",
        "Identifier le chiffrement et le temps de copie nécessaire",
      ],
      actions: [
        () => `La CI se réveille : le decker est repéré sur le host.`,
        () => `Les données sont chiffrées — il faut tenir la connexion plus longtemps.`,
        (c) => `Un technicien entre dans la salle serveur de ${c.lieu}.`,
        () => `Le fichier du brief est un leurre : la vraie donnée est ailleurs.`,
      ],
      climaxes: [
        (c) => `La copie touche à sa fin, les CI convergent. Tenir la position dans ${c.lieu} ?`,
        (c) => `${c.opp} coupe l'accès matriciel. Arracher les données, ou décrocher ?`,
      ],
      clocks: [
        { type: "alerte", title: "Traçage de l'intrusion" },
        { type: "menace", title: "Réveil de la CI" },
        { type: "objectif", title: "Copie en cours" },
      ],
      bangs: [
        "Copier proprement mais lentement, ou tout arracher au risque de corrompre le lot ?",
        "Les données cachent un second dossier compromettant : on le prend, ou on n'y touche pas ?",
        "Effacer ses traces (long), ou filer avant que la CI ne verrouille ?",
        "Vendre une copie à un tiers en douce, ou rester réglo avec le Johnson ?",
      ],
    },
    sabotage: {
      stake: "mettre l'infrastructure hors service",
      recons: [
        "Repérer le point de rupture et le chemin de pose des charges",
        "Localiser la salle des machines ou le nœud critique",
        "Trouver la ronde de maintenance et ses angles morts",
        "Vérifier la présence de civils sur la zone à frapper",
      ],
      actions: [
        () => `La charge est posée, mais la minuterie s'emballe.`,
        (c) => `Une équipe de maintenance débarque à ${c.lieu}.`,
        () => `Le point faible est mieux gardé que prévu.`,
        () => `Des civils s'attardent près de la zone à faire sauter.`,
      ],
      climaxes: [
        (c) => `Tout est en place. Déclencher dans ${c.lieu} et sortir avant l'effondrement.`,
        (c) => `${c.opp} désamorce ce que vous posez. Course contre la montre.`,
      ],
      clocks: [
        { type: "menace", title: "Compte à rebours" },
        { type: "alerte", title: "Ronde de maintenance" },
        { type: "objectif", title: "Charges en place" },
      ],
      bangs: [
        "Déclencher maintenant, ou attendre que les civils aient évacué ?",
        "Sabotage propre et discret (lent), ou explosion franche (bruyante) ?",
        "Un ouvrier innocent est sur la charge : on l'écarte, ou on tire quand même ?",
        "Détruire pour de bon, ou laisser une panne « accidentelle » réparable ?",
      ],
    },
    liquidation: {
      stake: "atteindre la cible sans bavure",
      recons: [
        "Pister la cible, ses gardes et sa routine",
        "Trouver la fenêtre où la cible est isolée",
        "Repérer le poste de tir et la ligne de repli",
        "Identifier les proches à ne surtout pas toucher",
      ],
      actions: [
        () => `La cible change de programme à la dernière minute.`,
        () => `Un garde du corps s'interpose entre vous et la cible.`,
        () => `La cible n'est pas seule : témoins imprévus.`,
        () => `La cible a flairé le danger et se terre.`,
      ],
      climaxes: [
        (c) => `La cible à portée dans ${c.lieu}, mais ${c.opp} resserre la garde. Frapper maintenant ?`,
        (c) => `Dernière fenêtre de tir avant que ${c.opp} n'exfiltre la cible.`,
      ],
      clocks: [
        { type: "menace", title: "La cible flaire le danger" },
        { type: "alerte", title: "La garde rapprochée se resserre" },
        { type: "objectif", title: "Fenêtre de tir" },
      ],
      bangs: [
        "Frappe nette, ou la faire parler d'abord ?",
        "La cible offre un pot-de-vin plus gros que le contrat : on écoute, ou on tire ?",
        "Un innocent partage la pièce : dommage collatéral, ou on renonce au tir ?",
        "Maquiller en accident (risqué), ou signature franche (un message) ?",
      ],
    },
    protection: {
      stake: "garder le protégé intact",
      recons: [
        "Sécuriser l'itinéraire et repérer les angles de tir",
        "Identifier les points d'embuscade probables",
        "Connaître les habitudes et les caprices du protégé",
        "Repérer une planque de repli en cas de coup dur",
      ],
      actions: [
        () => `Première tentative sur le protégé : embuscade éclair.`,
        (c) => `Le protégé s'éloigne du groupe dans ${c.lieu}.`,
        () => `Un assaillant se fait passer pour un allié.`,
        () => `La menace vise un proche du protégé pour l'attirer.`,
      ],
      climaxes: [
        (c) => `Assaut final sur le protégé dans ${c.lieu}. Le couvrir coûte que coûte.`,
        (c) => `${c.opp} joue le tout pour le tout contre votre protégé.`,
      ],
      clocks: [
        { type: "menace", title: "Les assaillants convergent" },
        { type: "alerte", title: "Le protégé s'expose" },
        { type: "objectif", title: "Mise à l'abri" },
      ],
      bangs: [
        "Rester collé au protégé, ou éliminer la menace à la source ?",
        "Le protégé veut fuir seul : on le retient de force, ou on le suit ?",
        "Sauver le protégé, ou la cargaison ? On ne peut pas les deux.",
        "L'assaillant est un ancien contact : on le neutralise, ou on négocie ?",
      ],
    },
    intimidation: {
      stake: "faire plier la cible sans tout casser",
      recons: [
        "Cerner les leviers, les proches et les peurs de la cible",
        "Trouver où et quand coincer la cible seule",
        "Identifier ce qui compte vraiment pour la cible",
        "Jauger sa garde et sa capacité de résistance",
      ],
      actions: [
        () => `La cible fait mine de céder — puis appelle du renfort.`,
        (c) => `La cible se réfugie dans un lieu public de ${c.lieu}.`,
        () => `Un proche de la cible complique le message.`,
        () => `La cible enregistre tout pour retourner la menace contre vous.`,
      ],
      climaxes: [
        (c) => `Face-à-face : la cible plie ou casse, et ${c.opp} n'est pas loin.`,
        (c) => `Dernier avertissement dans ${c.lieu}, sous l'œil de ${c.opp}.`,
      ],
      clocks: [
        { type: "objectif", title: "La volonté de la cible" },
        { type: "menace", title: "La cible cherche du renfort" },
        { type: "alerte", title: "Les témoins s'agitent" },
      ],
      bangs: [
        "Monter d'un cran, ou tenir parole pour garder l'ascendant ?",
        "La cible bluffe peut-être : on appuie, ou on recule ?",
        "Un proche de la cible s'interpose : on l'écarte, ou on l'utilise ?",
        "Message discret, ou démonstration publique qui laisse des traces ?",
      ],
    },
    enquete: {
      stake: "démasquer qui tire les ficelles avant que la piste ne refroidisse",
      recons: [
        "Recouper les témoignages et les rumeurs de rue",
        "Lire la scène : traces, logs matriciels, résidus rituels",
        "Remonter la chaîne des intermédiaires jusqu'au commanditaire",
        "Faire parler un témoin avant qu'il ne file",
      ],
      actions: [
        () => `Un témoin clé se volatilise — ou file au commissariat.`,
        (c) => `La piste mène à ${c.lieu}, déjà nettoyé de ses traces.`,
        () => `Quelqu'un efface les preuves à mesure que vous les trouvez.`,
        () => `Un faux indice vous envoie droit dans un guet-apens.`,
      ],
      climaxes: [
        (c) => `La vérité éclate à ${c.lieu} : reste à la faire sortir vivante.`,
        (c) => `${c.opp} comprend que vous savez, et veut enterrer l'affaire — vous avec.`,
      ],
      clocks: [
        { type: "menace", title: "La piste refroidit" },
        { type: "alerte", title: "On sait que vous fouinez" },
        { type: "objectif", title: "Reconstitution de la vérité" },
      ],
      bangs: [
        "Livrer le coupable au mandant, ou protéger la source qui vous a parlé ?",
        "Sortir la preuve au grand jour (se griller), ou la monnayer en silence ?",
        "La vérité innocente un « coupable » évident : on la révèle, ou on ferme les yeux ?",
        "Le coupable offre plus que le contrat pour votre silence : on écoute, ou on livre ?",
      ],
    },
    escorte: {
      stake: "faire arriver le convoi au bout de la route, malgré tout",
      recons: [
        "Repérer l'itinéraire, les points de contrôle et les guet-apens probables",
        "Identifier qui d'autre convoite le convoi",
        "Prévoir une route de repli et un relais sûr",
        "Jauger la fiabilité du guide local",
      ],
      actions: [
        (c) => `Embuscade sur la route : le convoi est pris pour cible près de ${c.lieu}.`,
        () => `Un poste de contrôle imprévu barre le passage.`,
        () => `Le guide flanche — ou vous vend.`,
        () => `Un blessé ralentit tout le convoi.`,
      ],
      climaxes: [
        (c) => `Dernière ligne avant ${c.lieu} : ${c.opp} joue le tout pour le tout sur le convoi.`,
        (c) => `${c.opp} coupe la route. Passer en force, ou trouver une brèche ?`,
      ],
      clocks: [
        { type: "menace", title: "Les poursuivants gagnent du terrain" },
        { type: "alerte", title: "La route se ferme" },
        { type: "objectif", title: "Distance jusqu'au refuge" },
      ],
      bangs: [
        "Fuir avec le convoi, ou tenir la ligne pour couvrir les autres ?",
        "Sauver la cargaison, ou le protégé ? On ne peut pas les deux.",
        "Le protégé veut fuir seul : on le retient de force, ou on le suit ?",
        "Le guide réclame sa part avant la fin : on paie, ou on le laisse en plan ?",
      ],
    },
    recuperation_objet: {
      stake: "remettre la main sur le bien et le ramener intact",
      recons: [
        "Pister le receleur et remonter la chaîne de possession",
        "Localiser la planque où l'objet est gardé",
        "Identifier qui d'autre est sur le coup",
        "Vérifier l'authenticité de l'objet avant de partir avec",
      ],
      actions: [
        (c) => `L'objet a déjà changé de mains : la piste bifurque vers ${c.lieu}.`,
        () => `Une équipe rivale rafle l'objet juste avant vous.`,
        () => `L'objet est piégé — ou n'est pas ce qu'on croyait.`,
        () => `Le receleur exige un service avant de lâcher l'adresse.`,
      ],
      climaxes: [
        (c) => `L'objet est à portée dans ${c.lieu}, mais ${c.opp} ne le lâchera pas sans se battre.`,
        (c) => `${c.opp} veut l'objet autant que vous : à qui restera-t-il ?`,
      ],
      clocks: [
        { type: "objectif", title: "Localisation de l'objet" },
        { type: "menace", title: "L'objet change de main" },
        { type: "alerte", title: "Les concurrents se rapprochent" },
      ],
      bangs: [
        "Rendre l'objet au mandant, ou le garder pour soi ?",
        "Le prendre par la force, ou négocier avec celui qui le détient ?",
        "L'objet cache un secret compromettant : on regarde, ou on n'y touche pas ?",
        "Un tiers surenchérit pour l'objet : on trahit le mandant, ou on reste réglo ?",
      ],
    },
    filature: {
      stake: "suivre la cible sans être vu jusqu'à ce qu'elle se trahisse",
      recons: [
        "Établir les habitudes de trajet de la cible",
        "Repérer les points où l'on risque de la perdre de vue",
        "Préparer des relais discrets (drones, contacts, véhicules)",
        "Savoir ce qu'on cherche à lui faire révéler",
      ],
      actions: [
        () => `La cible flaire une présence et change brusquement de route.`,
        (c) => `La filature mène à ${c.lieu} — un rendez-vous qui n'était pas prévu.`,
        () => `La cible se sait suivie et tend un piège au suiveur.`,
        () => `Un tiers file la même cible et manque de vous griller.`,
      ],
      climaxes: [
        (c) => `La cible arrive à ${c.lieu} : ce qu'elle y fait vaut tout le run — si ${c.opp} ne vous repère pas.`,
        () => `La cible se retourne : la suivre encore, ou frapper maintenant ?`,
      ],
      clocks: [
        { type: "alerte", title: "La cible vous repère" },
        { type: "objectif", title: "Ce que la cible révèle" },
        { type: "menace", title: "La cible s'apprête à disparaître" },
      ],
      bangs: [
        "La rattraper vivante, ou la laisser filer pour une meilleure piste ?",
        "Rester couvert et patienter, ou intervenir avant qu'il ne soit trop tard ?",
        "La cible en croise une autre : on suit laquelle ?",
        "La filature révèle un innocent : on continue, ou on lâche l'affaire ?",
      ],
    },
    chasse_a_la_prime: {
      stake: "neutraliser la cible et fournir la preuve pour toucher la prime",
      recons: [
        "Établir le dernier emplacement connu de la cible",
        "Jauger sa nature et sa dangerosité réelles",
        "Comprendre qui la protège — ou qui la manipule",
        "Prévoir comment prouver la capture ou l'élimination",
      ],
      actions: [
        () => `La cible se cache sous une apparence banale.`,
        () => `Un pacte (esprit, protecteur) rend la cible plus coriace que prévu.`,
        (c) => `La cible fuit ${c.lieu} vers un autre territoire.`,
        () => `Un autre chasseur de prime est déjà sur le coup.`,
      ],
      climaxes: [
        (c) => `La cible acculée à ${c.lieu} : l'abattre, ou l'écouter ?`,
        (c) => `${c.opp} protège la cible : passer outre, ou renoncer à la prime ?`,
      ],
      clocks: [
        { type: "menace", title: "La cible change de territoire" },
        { type: "objectif", title: "Traque de la cible" },
        { type: "alerte", title: "La cible sait qu'on la traque" },
      ],
      bangs: [
        "Encaisser la prime en livrant la cible, ou lui offrir une porte de sortie ?",
        "La cible est une victime, pas un monstre : on tire, ou on la retourne ?",
        "La prendre vivante (risqué), ou morte (plus simple, moins payé) ?",
        "Un rival réclame la même prime : on partage, ou on l'élimine aussi ?",
      ],
    },
    arnaque: {
      stake: "monter la mise en scène pour que la cible se dépossède elle-même",
      recons: [
        "Cerner le profil et les faiblesses de la cible",
        "Réunir accessoires crédibles et fausses accréditations",
        "Identifier les noms à citer pour asseoir la légende",
        "Préparer une sortie propre avant que la cible ne comprenne",
      ],
      actions: [
        () => `La cible flaire quelque chose et exige des garanties.`,
        () => `Un détail de la légende ne tient pas : il faut improviser.`,
        () => `Un complice imprévu s'invite dans l'arnaque.`,
        () => `La cible appelle vérifier vos accréditations.`,
      ],
      climaxes: [
        (c) => `Le dernier acte se joue à ${c.lieu} : la cible mord, ou tout s'effondre.`,
        (c) => `${c.opp} flaire l'arnaque au pire moment : filer avec la mise, ou sauver la face ?`,
      ],
      clocks: [
        { type: "objectif", title: "La cible mord à l'hameçon" },
        { type: "alerte", title: "La légende se fissure" },
        { type: "menace", title: "La cible flaire le piège" },
      ],
      bangs: [
        "Filer avec la mise, ou pousser l'arnaque pour rafler plus ?",
        "On tient un secret gênant sur la cible : monnaie d'échange, ou on n'y touche pas ?",
        "La cible est plus fragile qu'on croyait : on continue, ou on renonce ?",
        "L'arnaque attire un prédateur plus gros : empocher vite, ou tenir le mensonge ?",
      ],
    },
  },
  _DEFAULT_OBJECTIVE: {
    stake: "remplir le contrat",
    recons: ["Repérer les lieux, la sécurité et les issues"],
    actions: [],
    climaxes: [],
    clocks: [{ type: "objectif", title: "Progression de l'objectif" }],
    bangs: [],
  },

  /* Choix forcés GÉNÉRIQUES (mêlés au pool d'objectif pour le bang de climax). */
  _BANGS: [
    "S'en tenir au plan, ou tout miser sur un coup d'audace ?",
    "Un des vôtres est à terre : on s'arrête, ou on avance ?",
    "L'exfil prévue est coupée : forcer le passage, ou improviser une autre sortie ?",
    "L'objectif est à portée, l'alarme sur le point de sonner : précipiter, ou assurer ?",
    "Un garde se rend : témoin gênant, ou on l'épargne ?",
    "Trop beau pour être vrai : saisir l'occasion, ou flairer le piège ?",
    "L'objectif est en main, mais un second, plus juteux, se présente : s'en tenir au plan, ou rafler les deux ?",
    "La cible n'est qu'une victime : honorer le contrat, ou la retourner contre le mandant ?",
    "Le Johnson coupe les comms en plein run : continuer à l'aveugle, ou décrocher ?",
    "Deux Johnson se disputent la même chose : à qui obéir, maintenant ?",
    "Expédier vite et sale, ou soigner le travail en laissant une trace ?",
    "On vous offre plus que la paie pour lâcher l'équipe : écouter, ou couper court ?",
  ],

  /* Le twist (la complication en choix forcé), au point de bascule. */
  _TWIST_BANGS: [
    (c) => `${c.complication} — on encaisse et on avance, ou on renégocie tout ?`,
    (c) => `${c.complication}. On s'adapte, ou on décroche ?`,
    (c) => `Le plan vacille : ${low(c.complication)}. Forcer, ou temporiser ?`,
    (c) => `${c.complication} — coup monté, ou simple malchance ?`,
    (c) => `Il faut trancher, vite : ${low(c.complication)}.`,
    (c) => `${c.complication}. Qui, dans l'équipe, tranche ?`,
    (c) => `Personne ne vous avait prévenus. ${c.complication} — et maintenant ?`,
    (c) => `Le job semblait simple : ${low(c.complication)}. Qui avait prévu un repli ?`,
    (c) => `${c.complication} — et si le mandant l'avait voulu depuis le début ?`,
    (c) => `Trop tard pour reculer : ${low(c.complication)}. Improviser, ou tout saborder proprement ?`,
    (c) => `${c.complication}. On encaisse pour la paie, ou on renverse la donne ?`,
  ],

  /* Leads de SCÈNE par type (fonctions du contexte `c`). 7-8 variantes chacun. */
  _LEADS: {
    accroche: [
      (c) => `Le Johnson — ${c.client}. Le contrat : ${c.type}. En jeu : ${c.stake}.`,
      (c) => `Rencontre discrète : ${c.client} pose le job sur la table. ${cap(c.stake)}, et pas de questions.`,
      (c) => `${c.client} vous briefe. Objectif : ${c.type}. Le reste, c'est votre problème.`,
      (c) => `Un fixer arrange le rendez-vous. ${c.client} veut ${c.stake} — l'enveloppe est déjà prête.`,
      (c) => `Le brief tient en une phrase : ${c.type}. ${c.client} paie ${c.payment} pour ${c.stake}.`,
      (c) => `${c.client} a un problème. Vous êtes la solution : ${c.type}.`,
      (c) => `Café froid, lumière basse : ${c.client} déballe le job. ${cap(c.stake)}.`,
      (c) => `Le contrat vient de ${c.client}. Ce qu'il veut vraiment, c'est ${c.stake}.`,
      (c) => `${c.client} ne dit pas tout. Le job affiché : ${c.type}. Le vrai, vous le lirez en route.`,
      (c) => `La paie est énorme — du genre qui sent le piège. ${c.client} veut ${c.stake}.`,
      () => `Pas de Johnson, pas de brief : vous êtes déjà dans les ennuis, et il faut décider vite.`,
    ],
    "repérage": [
      (c) => `${c.recon}. Face à vous : ${c.opp} (${c.secu}).`,
      (c) => `Avant de foncer : ${low(c.recon)}. La sécurité, c'est ${c.secu}.`,
      (c) => `Repérage à ${c.lieu}. ${c.recon} — sans réveiller ${c.opp}.`,
      (c) => `Vous observez, vous notez. ${c.recon}.`,
      (c) => `Le terrain d'abord : ${low(c.recon)}. ${c.opp} tient le secteur.`,
      (c) => `Une planque, des jumelles, du soykaf. ${c.recon}.`,
      (c) => `Reconnaissance de ${c.lieu} : rondes, caméras, angles morts.`,
      (c) => `Chaque groupe de gardes visible en cache un autre : la moitié de la sécurité de ${c.opp} est planquée.`,
      (c) => `Votre porte d'entrée est dans les failles du quotidien de ${c.opp} : une livraison, une inspection en retard, un poste vacant.`,
    ],
    sociale: [
      (c) => `Approche autour de ${c.lieu} : un contact à retourner, une porte à ouvrir.`,
      (c) => `On passe par les gens : ${c.opp} a des failles, ce sont des humains.`,
      (c) => `Un verre, un pot-de-vin, un mensonge bien placé — l'info se monnaie.`,
      (c) => `Négociation ou séduction : quelqu'un ici sait, et peut parler.`,
      (c) => `L'approche en douceur : convaincre plutôt que forcer.`,
      (c) => `Un intermédiaire propose un marché. Fiable ? À vous de voir.`,
      (c) => `Contacts, rumeurs, dettes anciennes : on tire les bons fils.`,
      () => `Un accessoire crédible, une histoire pressante, et l'on vous ouvre ce qui devait rester fermé.`,
      () => `Quelqu'un ici sait, et se laissera acheter, séduire ou intimider — reste à trouver le bon levier.`,
    ],
    "décision": [
      (c) => `Point de bascule — ${c.complication}.`,
      (c) => `Le plan se scinde : deux voies s'ouvrent, aucune sûre.`,
      (c) => `Un carrefour. ${cap(c.complication)}. L'équipe doit trancher.`,
      (c) => `Ici, on choisit — et on vit avec les conséquences.`,
      (c) => `Le job dérape : ${low(c.complication)}. Quelle route ?`,
      (c) => `Deux mauvaises options, une décision à prendre maintenant.`,
      (c) => `Le moment où tout peut basculer d'un côté ou de l'autre.`,
      () => `Deux voix dans l'oreillette, deux commanditaires : à qui obéir se décide ici.`,
      (c) => `La vérité qui remonte retire le « méchant » évident : ${low(c.complication)}.`,
    ],
    action: [
      (c) => `Ça se complique : ${c.complication}.`,
      (c) => `Le calme se rompt. ${cap(c.complication)}.`,
      (c) => `Fusillade, alarme, course — ${low(c.complication)}.`,
      (c) => `La sécurité de ${c.opp} se réveille ; il faut passer en force ou en finesse.`,
      (c) => `Ça part en vrille : ${low(c.complication)}.`,
      (c) => `Un obstacle imprévu barre la route. Il faut le lever, vite.`,
      (c) => `Le terrain se retourne. ${cap(c.complication)}.`,
      (c) => `Course-poursuite : la foule, les contrôles, les angles morts — ${low(c.complication)}.`,
      (c) => `Le décor se retourne contre vous autant que ${c.opp} : ${low(c.complication)}.`,
    ],
    "retombée": [
      (c) => `Sortie — paie ${c.payment}. ${c.ending}${c.bonus}`,
      (c) => `Débriefing : ${low(c.ending)} Paie ${c.payment}.${c.bonus}`,
      (c) => `Le job se referme sur trois fins : ${low(c.ending)}${c.bonus}`,
      (c) => `Retombées : oubli, rancune tenace, ou traque — selon les traces laissées. Paie ${c.payment}.${c.bonus}`,
      (c) => `L'après : la paie (${c.payment}), les traces laissées, les portes ouvertes ou fermées.${c.bonus}`,
      (c) => `${c.ending} Reste à encaisser ${c.payment}.${c.bonus}`,
      (c) => `Le run se referme. ${c.ending}${c.bonus}`,
      (c) => `Le mandant paie ${c.payment} — mais un tiers vous a peut-être vus, et ça se paiera plus tard.${c.bonus}`,
      (c) => `Assumer l'échec et transmettre l'info entame la réputation ; doubler le Johnson la réduit en cendres. Paie ${c.payment}.${c.bonus}`,
    ],
    climax: [
      (c) => `Affrontement — ${c.opp} défend ${c.lieu}. ${cap(c.stake)}, maintenant ou jamais.`,
      (c) => `Le pic : ${c.opp} vous attend de pied ferme. Tout se joue ici.`,
      (c) => `Face-à-face décisif à ${c.lieu}. ${cap(c.stake)} — ou tout perdre.`,
      (c) => `La confrontation : plus de finesse, ${c.opp} a compris. ${cap(c.stake)}.`,
      (c) => `Le moment de vérité à ${c.lieu}. ${c.opp} joue son va-tout, vous aussi.`,
      (c) => `Climax : sirènes, projecteurs, ${c.opp} en travers du chemin. ${cap(c.stake)}.`,
      (c) => `Tout converge sur ${c.lieu} : ${c.opp}, l'horloge, et le choix que vous avez repoussé jusqu'ici.`,
      (c) => `Dernière ligne droite : ${cap(c.stake)}, sous le feu de ${c.opp}, sans filet.`,
    ],
  },

  /* Ton de l'ACCROCHE selon la nature du mandant (mêlé aux accroches génériques) :
     une corpo n'engage pas comme la pègre, un dragon ou un particulier. */
  _ACCROCHE_BY_TYPE: {
    corpo: [
      (c) => `Réunion aseptisée, NDA implicite : ${c.client} ne veut aucun lien avec vous après coup.`,
      (c) => `Le Johnson corpo est courtois et glacial : ${c.type}, et zéro trace.`,
    ],
    gouv: [
      (c) => `Un contact officieux, sans logo ni nom : ${c.type}, et ça n'a jamais eu lieu.`,
      (c) => `${c.client} parle bas : l'État nie déjà vous connaître.`,
    ],
    pègre: [
      (c) => `${c.client} vous reçoit en personne : c'est une affaire de respect autant que d'argent.`,
      (c) => `Ton chaleureux, menace implicite : on ne refuse pas ${c.client}.`,
    ],
    gang: [
      (c) => `Rendez-vous dans un rade enfumé : ${c.client} veut ${c.stake}, à la dure.`,
      (c) => `Pas de finesse : ${c.client} pose le job et un flingue sur la table.`,
    ],
    loi: [
      (c) => `Un badge discret vous approche : ${c.type}, hors des radars officiels.`,
      (c) => `${c.client} vous tient par un dossier autant que par la paie.`,
    ],
    dragon: [
      (c) => `Un émissaire énigmatique délivre le contrat de ${c.client} : les vraies raisons vous échappent.`,
      (c) => `${c.client} vous emploie par intermédiaire ; son plan vous dépasse.`,
    ],
    magie: [
      (c) => `${c.client} vous jauge à l'aura avant de parler : ${c.type}.`,
      (c) => `Le contact sent l'encens et le danger : ${c.client} a des fins occultes.`,
    ],
    policlub: [
      (c) => `${c.client} enrobe le job d'idéologie : méfiez-vous du discours.`,
      (c) => `Le commanditaire a un agenda plus large que ce qu'il avoue.`,
    ],
    particulier: [
      (c) => `Un privé nerveux, cash en main : ${c.client} veut ${c.stake}, discrètement.`,
      (c) => `${c.client} n'est pas du milieu : ça se sent, et ça complique.`,
    ],
  },

  /* Leads de REPÉRAGE teintés par l'ambiance du district (n'entrent dans le pool
     que si une ambiance est disponible). */
  _LEADS_AMBIANCE: [
    (c) => `${cap(c.ambiance)}. ${c.recon}.`,
    (c) => `Repérage à ${c.lieu} — ${c.ambiance}. ${low(c.recon)}.`,
    (c) => `Le décor : ${c.ambiance}. ${c.recon}.`,
  ],

  /* Front de l'OPPOSITION — pools de titre, d'impulsion et de présages étagés. */
  _FRONT_TITLES: [
    (c) => `${c.opp} réagit`,
    (c) => `${c.opp} resserre l'étau`,
    (c) => `La sécurité de ${c.opp} se réveille`,
    (c) => `${c.opp} passe à l'offensive`,
    (c) => `${c.opp} ne lâche pas le morceau`,
    (c) => `Représailles de ${c.opp}`,
  ],
  _FRONT_IMPULSES: [
    (c) => `Protéger ${c.lieu} et repousser l'équipe`,
    (c) => `Identifier et neutraliser les intrus`,
    (c) => `Étouffer l'incident avant qu'il ne remonte`,
    (c) => `Sécuriser l'actif et faire un exemple`,
    (c) => `Ne laisser sortir personne, ni rien`,
  ],

  /* Front TYPÉ par nature de faction (`opposition.type` via ToposCatalog.typeOf) :
     ce qu'elle veut au fond diffère — la corpo protège son image et ses
     actionnaires, la pègre lave un affront, le gang défend son territoire, le
     dragon avance un plan insondable. Priment sur les pools génériques. */
  _FRONT_BY_TYPE: {
    corpo: {
      titles: [(c) => `${c.opp} étouffe l'affaire`, (c) => `${c.opp} protège ses intérêts`, (c) => `Le service de sécurité de ${c.opp}`],
      impulses: ["Nier l'incident et préserver l'image publique", "Récupérer l'actif et rassurer les actionnaires", "Effacer toute trace avant que la presse ne s'en mêle"],
    },
    gouv: {
      titles: [(c) => `${c.opp} verrouille le dossier`, (c) => `${c.opp} garde le contrôle`, () => `Les services officiels`],
      impulses: ["Maintenir l'ordre et le déni plausible", "Classer l'affaire, faire taire les gêneurs", "Reprendre le contrôle de la situation"],
    },
    pègre: {
      titles: [(c) => `${c.opp} lave l'affront`, (c) => `L'honneur de ${c.opp}`, (c) => `${c.opp} règle les comptes`],
      impulses: ["Laver l'affront et rétablir le respect", "Faire payer la dette, avec les intérêts", "Défendre le territoire et l'honneur de la famille"],
    },
    gang: {
      titles: [(c) => `${c.opp} défend le quartier`, (c) => `${c.opp} montre les crocs`, () => `La rue se soulève`],
      impulses: ["Défendre le territoire coûte que coûte", "Ne pas perdre la face devant les autres gangs", "Faire un exemple sanglant"],
    },
    loi: {
      titles: [(c) => `${c.opp} boucle l'affaire`, (c) => `${c.opp} applique la loi`, () => `Descente des forces de l'ordre`],
      impulses: ["Arrêter ou abattre, sans témoin gênant", "Rétablir l'ordre et boucler le secteur", "Ne laisser aucune bavure remonter la hiérarchie"],
    },
    dragon: {
      titles: [(c) => `Le plan de ${c.opp}`, (c) => `${c.opp} tire les fils`, () => `Une intelligence ancienne s'éveille`],
      impulses: ["Avancer un plan que nul ne comprend encore", "Manipuler tous les camps à son avantage", "Protéger un secret millénaire"],
    },
    magie: {
      titles: [(c) => `Le rituel de ${c.opp}`, (c) => `${c.opp} invoque`, () => `Le voile astral se déchire`],
      impulses: ["Achever le rituel, quoi qu'il en coûte", "Corrompre les lieux et repousser les profanes", "Nourrir les esprits liés"],
    },
    policlub: {
      titles: [(c) => `${c.opp} rameute la meute`, (c) => `La croisade de ${c.opp}`, () => `La foule se déchaîne`],
      impulses: ["Faire un exemple au nom de la « pureté »", "Ameuter la populace contre les intrus", "Purger la zone des indésirables"],
    },
    goules: {
      titles: [(c) => `La faim de ${c.opp}`, () => `La meute affamée`, () => `Ça sort des murs`],
      impulses: ["Se nourrir et ne rien laisser repartir", "Garder la chair fraîche à portée", "Traquer à l'odeur du sang"],
    },
    particulier: {
      titles: [(c) => `Le jeu de ${c.opp}`, () => `Un intérêt privé`, () => `Une main invisible`],
      impulses: ["Régler une affaire strictement personnelle", "Effacer un témoin d'un vieux secret", "Obtenir ce qu'il convoite sans se salir les mains"],
    },
    ia: {
      titles: [(c) => `${c.opp} défend son domaine`, (c) => `${c.opp} resserre son emprise`, () => `Une intelligence froide s'éveille`],
      impulses: ["Défendre « sa » Matrice comme un territoire exclusif", "Étendre son emprise sur le monde physique en asservissant des corps", "Rester insaisissable : effacer toute trace, retoucher les archives"],
    },
    culte: {
      titles: [(c) => `Le rite de ${c.opp}`, (c) => `${c.opp} passe à l'acte`, () => `La secte accomplit sa prophétie`],
      impulses: ["Recruter et asservir sous un faux rite", "Hâter l'accomplissement de sa prophétie", "Nourrir l'entité qu'elle sert, à tout prix"],
    },
  },

  /* Escalade TYPÉE par nature de faction : le repérage (notice) et la traque
     (hunt) ne se font pas pareil selon le type — le dragon sent à l'astral, le
     gang siffle ses guetteurs, les goules flairent. Priment sur les pools
     génériques ; le renfort/bouclage restent au profil de sécurité. */
  _TYPE_ESCALATION: {
    corpo: { notice: ["Un capteur discret vous a repérés.", "La sécurité corpo signale une anomalie."], hunt: ["La corpo lance ses limiers, sans un mot.", "Avis de recherche interne : vous êtes fichés."] },
    gouv: { notice: ["Une caméra officielle vous accroche.", "Un agent note un détail qui cloche."], hunt: ["Un avis de recherche officiel tombe.", "Les autorités lancent la traque."] },
    pègre: { notice: ["Un guetteur du quartier passe un coup de fil.", "On vous a remarqués sur leur territoire."], hunt: ["Un contrat tombe sur vos têtes.", "Toute la famille a votre signalement."] },
    gang: { notice: ["Un gamin en vigie siffle l'alerte.", "Les gangers repèrent des intrus."], hunt: ["Le gang rameute toute la bande.", "Chasse ouverte : vous êtes le gibier."] },
    loi: { notice: ["Une patrouille signale une activité suspecte.", "Un scan d'identité accroche."], hunt: ["Mandat lancé : la traque commence.", "Barrages et hélico, vous êtes recherchés."] },
    dragon: { notice: ["Une présence astrale vous effleure.", "Il sait déjà que vous êtes là."], hunt: ["Ses pions se referment sur vous.", "Manipulés, d'autres se lancent à vos trousses."] },
    magie: { notice: ["Un watcher astral vous a repérés.", "Le mana frémit : on vous sent."], hunt: ["Un esprit est lancé sur votre piste.", "La traque prend un tour surnaturel."] },
    policlub: { notice: ["Un sympathisant vous a à l'œil.", "La rumeur court : des intrus en ville."], hunt: ["La meute se forme pour vous chasser.", "La populace, ameutée, vous traque."] },
    goules: { notice: ["Quelque chose renifle votre passage.", "Des yeux luisent dans l'ombre."], hunt: ["La meute affamée suit votre trace.", "Vous êtes désormais de la viande en fuite."] },
    particulier: { notice: ["Un œil discret vous suit.", "Quelqu'un s'intéresse d'un peu trop près à vous."], hunt: ["Un traqueur privé est lancé.", "On a mis quelqu'un sur vous."] },
    ia: { notice: ["Une caméra pivote et vous suit le long du couloir.", "Un système censé être hors ligne s'active soudain."], hunt: ["Un contingent de serviteurs asservis converge sur votre position exacte.", "L'IA inonde la Matrice de votre signalement."] },
    culte: { notice: ["Un adepte vous a repérés et prévient les siens.", "Des symboles fraîchement gravés trahissent une présence organisée."], hunt: ["La secte lance ses fidèles à vos trousses.", "Une traque rituelle se met en branle contre vous."] },
  },

  /* Nature de la trahison du commanditaire, typée (front « mandant » de la
     complication « trahison »). Défaut = impulsions du front lui-même. */
  _BETRAYAL_BY_TYPE: {
    corpo: ["nier vous avoir jamais engagés", "récupérer le livrable sans lâcher un nuyen"],
    gouv: ["classer l'affaire et vous rayer des dossiers", "nier tout lien officiel avec vous"],
    pègre: ["faire de vous un exemple pour les autres", "effacer une dette en vous effaçant"],
    gang: ["vous dépouiller une fois le travail fait", "retourner sa veste dès que ça l'arrange"],
    loi: ["vous coffrer une fois devenus inutiles", "boucler le dossier avec vous dedans"],
    dragon: ["vous avoir manipulés depuis le premier jour", "vous garder comme pions jetables"],
    magie: ["vous sacrifier à la réussite du rite", "vous lier plutôt que vous payer"],
    policlub: ["vous trahir dès que sa cause l'exige", "vous livrer pour se dédouaner"],
    particulier: ["disparaître sans laisser d'adresse", "retourner le contrat contre vous"],
  },
  _PORTENTS: {
    notice: [
      (c) => `${c.firstRole} repère une anomalie.`,
      () => `Un garde signale un mouvement suspect.`,
      () => `Les caméras tiquent : quelque chose cloche.`,
      () => `Une ronde change d'itinéraire sans raison.`,
      () => `Alerte silencieuse : quelqu'un a vu quelque chose.`,
      (c) => `${c.firstRole} demande une confirmation d'identité.`,
    ],
    reinforce: [
      (c) => `Renforts sur zone : ${c.roles}.`,
      (c) => `${c.opp} rappelle une équipe d'intervention.`,
      () => `Des drones de couverture décollent.`,
      () => `La relève est doublée, fusils sortis.`,
      () => `Un mage de sécurité monte la garde astrale.`,
      () => `Les issues se ferment une à une.`,
      (c) => `${c.opp} resserre les rangs : relève doublée, accès secondaires fermés.`,
      () => `Des renforts non répertoriés entrent en scène, mieux équipés que prévu.`,
    ],
    lockdown: [
      (c) => `${c.opp} verrouille le secteur.`,
      () => `Bouclage : plus personne n'entre ni ne sort.`,
      () => `Le quartier passe en confinement.`,
      () => `Les accès matriciels sont coupés.`,
      (c) => `${c.opp} déclare l'alerte maximale.`,
      () => `Verrouillage total : plus un accès, plus un signal, plus une issue.`,
    ],
    hunt: [
      (c) => `${c.opp} lance une chasse à l'homme.`,
      () => `Une prime tombe sur vos têtes.`,
      (c) => `${c.opp} ne cherche plus à arrêter : à éliminer.`,
      () => `Traque active dans tout le district.`,
    ],
  },

  /* Présages PROPRES à chaque profil de sécurité (clé = `securityProfile` du
     topos) : un mage de sang, un samouraï rouge et une goule ne montent pas la
     pression de la même façon. Priment sur les présages génériques `reinforce`/
     `lockdown` quand le profil est connu. Chaînes simples (pas d'interpolation). */
  _SECURITY_PORTENTS: {
    knight_errant: {
      reinforce: ["Une équipe tactique Knight Errant se déploie.", "Des drones de combat KE quadrillent la zone."],
      lockdown: ["Barrages routiers et hélico de KE sur tout le secteur.", "KE déclare la zone rouge : tir autorisé."],
    },
    lone_star: {
      reinforce: ["Les patrouilleurs Lone Star affluent, gyrophares hurlants.", "Un agent corruptible tergiverse — mais ses collègues, non."],
      lockdown: ["Lone Star boucle le quartier et contrôle les identités.", "Mandat d'urgence : Lone Star ratisse rue par rue."],
    },
    blood_mages: {
      reinforce: ["Un mage de sang trace un cercle et invoque.", "L'air se charge : la magie de sang monte en puissance."],
      lockdown: ["Le sang appelle le sang : un esprit gardien se manifeste.", "Aztechnology scelle le site d'une barrière mystique."],
    },
    zone_zero: {
      reinforce: ["Les drones tueurs de MCT passent en chasse — aucun prisonnier.", "Un mage corpo et une CI mortelle entrent en scène."],
      lockdown: ["Protocole zone-zéro : ordre de tuer tout intrus.", "MCT scelle le complexe, létalité maximale."],
    },
    horizon_soft: {
      reinforce: ["La sousveillance vous a déjà taggés et diffusés.", "Un spin doctor retourne l'opinion contre vous."],
      lockdown: ["Horizon inonde la Matrice de votre visage.", "La foule, manipulée, devient un obstacle mouvant."],
    },
    red_samurai: {
      reinforce: ["Les samouraïs rouges se déploient en formation.", "Une CI Renraku verrouille vos communications."],
      lockdown: ["Renraku isole le secteur et coupe la Matrice.", "Les samouraïs rouges reçoivent l'ordre : ne rien laisser sortir."],
    },
    corpo_gen: {
      reinforce: ["Une équipe d'intervention sous contrat se déploie, méthodique.", "Le spider de garde lâche ses CI et ses drones."],
      lockdown: ["La corpo verrouille le site et filtre chaque sortie.", "Ordre du PC sécurité : plus personne ne passe sans contrôle."],
    },
    militaire: {
      reinforce: ["La Garde du métroplexe lâche ses para-créatures.", "Blindés en approche, tir à vue autorisé."],
      lockdown: ["Bouclage militaire : la zone est verrouillée au cordeau.", "Ordre d'engagement : neutralisation par tous les moyens."],
    },
    mafia: {
      reinforce: ["Les soldats mafieux sortent l'artillerie lourde.", "Un capo débarque avec ses hommes de main."],
      lockdown: ["La Mafia verrouille le pâté de maisons — territoire à eux.", "Le capo veut des têtes, pas des prisonniers."],
    },
    yakuza: {
      reinforce: ["Un mage wuxing de la Yakuza prépare un sort.", "Les go-gangers affiliés bouclent les issues."],
      lockdown: ["La Yakuza ferme le quartier : honte à qui laisse passer.", "Ordre de l'oyabun : effacer l'affront."],
    },
    vory: {
      reinforce: ["Le Vory sort les armes lourdes russes.", "Des hommes de main brutaux convergent, sans finesse."],
      lockdown: ["Le Vory transforme la rue en champ de tir.", "Ivan veut un exemple : pas de quartier."],
    },
    gang: {
      reinforce: ["Le gang rapplique en nombre, hétéroclite et féroce.", "Un shaman de rue lance ses esprits sur vous."],
      lockdown: ["Le gang verrouille son territoire, tags et barricades.", "Toute la bande converge vers l'intrus."],
    },
    goules: {
      reinforce: ["Les goules sortent des murs, affamées.", "L'odeur du sang attire toute la meute."],
      lockdown: ["Les tunnels se referment : vous êtes dans leur garde-manger.", "Tamanous ne laisse repartir personne — la chair, ça se garde."],
    },
    koshari: {
      reinforce: ["Les hommes de main koshari resserrent le piège.", "Un maître-chanteur agite vos secrets."],
      lockdown: ["Les Koshari bouclent l'île, complices partout.", "Impossible de fuir sans croiser un des leurs."],
    },
    dragon_circle: {
      reinforce: ["La garde changeling du dragon se rue sur vous.", "Un esprit lié du dragon se matérialise."],
      lockdown: ["Le cercle du dragon scelle le domaine.", "Le dragon lui-même prête attention — mauvais signe."],
    },
    humanis: {
      reinforce: ["La milice Humanis rameute la foule haineuse.", "Des sympathisants armés surgissent de partout."],
      lockdown: ["Humanis transforme le quartier en chasse aux métas.", "La populace, chauffée à blanc, bloque les issues."],
    },
    toxic_shamans: {
      reinforce: ["Un chaman toxique empoisonne l'air ambiant.", "Un esprit toxique se dresse entre vous et la sortie."],
      lockdown: ["Le lieu même devient hostile, saturé de mana corrompu.", "La zone toxique se referme comme un piège."],
    },
    bioaug: {
      reinforce: ["Les gardes bio-augmentés d'Evo changent de vitesse.", "Réflexes surhumains : la relève ne rate rien."],
      lockdown: ["Evo verrouille le site, biomoniteurs en réseau.", "Les augmentés reçoivent l'ordre de saturer la zone."],
    },
    vigilants: {
      reinforce: ["Les Voisins Vigilants rappliquent, battes en main.", "Une patrouille motorisée signale votre position."],
      lockdown: ["Le quartier s'éclaire : tout le voisinage vous cherche.", "Les Vigilants dressent des barrages improvisés."],
    },
    ia_hostile: {
      reinforce: ["Les systèmes se retournent contre vous : portes, caméras, drones asservis.", "Une CI noire se matérialise pour vous barrer la route."],
      lockdown: ["L'IA verrouille tout le complexe : plus un accès, plus un signal.", "Elle vous a identifiés : ses serviteurs convergent sur votre position exacte."],
    },
    chaman_insecte: {
      reinforce: ["De nouveaux hôtes possédés convergent, l'aura masquée.", "Un esprit-soldat jaillit d'un cocon éventré."],
      lockdown: ["Le nid se scelle : murs de chitine et de chair.", "La Reine s'éveille — tout le nid répond à sa faim."],
    },
    esprit_gardien: {
      reinforce: ["L'esprit gardien se matérialise entre vous et la sortie.", "Le mana se tend : une force invoquée entre en scène."],
      lockdown: ["Le lieu se referme sur une barrière mystique.", "L'esprit lié interdit tout passage aux profanes."],
    },
    infectes: {
      reinforce: ["La meute affamée sort des murs, attirée par le sang.", "D'autres Infectés rappliquent, crocs dehors."],
      lockdown: ["Les issues se referment : vous êtes dans leur garde-manger.", "La meute encercle — la chair ne repart pas."],
    },
  },

  /* Faits cachés « la vérité derrière le run » (fonctions du contexte). */
  _HIDDEN_FACTS: [
    (c) => `${c.opp} tient plus à protéger ${c.lieu} qu'à vous : c'est leur point sensible.`,
    (c) => `La sécurité de ${c.opp} suit un schéma prévisible — qui a ses failles.`,
    (c) => `${c.opp} n'a pas signalé l'incident en haut lieu : ils cachent quelque chose.`,
    (c) => `${c.opp} et le commanditaire se connaissent mieux qu'ils ne le disent.`,
    () => `Le vrai trésor du site n'est pas celui du brief.`,
    () => `Quelqu'un, dans la place, attend votre arrivée.`,
    (c) => `${c.opp} a déjà perdu une équipe ici — et ne l'a jamais ébruité.`,
    (c) => `Un cadre de ${c.opp} vendrait la mèche pour le bon prix.`,
    () => `Le mandant ne veut pas ce qu'il prétend : le vrai but du run est ailleurs.`,
    () => `Vous êtes des jetables : le commanditaire compte effacer l'équipe une fois le job fait.`,
    () => `La cible n'est pas coupable : c'est une victime qu'on a maquillée en objectif.`,
    () => `Un troisième camp tire les ficelles ; les deux adversaires visibles sont manipulés.`,
    () => `Le brief ment sur la nature du job : ce n'est pas ce qu'on vous a vendu.`,
  ],

  /* Descriptions d'INDICE (fonctions du contexte). */
  _CLUE_DESCS: [
    (c) => `Au repérage : ${low(c.recon)}.`,
    () => `Un badge oublié, une conversation captée, une porte mal fermée.`,
    () => `Les habitudes de la sécurité trahissent un angle mort.`,
    () => `Un indic du coin sait des choses — moyennant finance.`,
    () => `Les logs matriciels racontent une autre histoire que le brief.`,
    () => `Un détail sur place contredit le dossier.`,
    () => `Une rumeur de rue recoupe ce que vous cherchez.`,
    () => `Un contact commun vous ouvre une piste inattendue.`,
    () => `Une paie anticipée trop belle, une clause étrange : le contrat lui-même sonne faux.`,
    () => `Un badge encore actif dont le porteur vient d'être licencié.`,
    () => `Une seconde source contredit la première : quelqu'un a maquillé le dossier.`,
    () => `Une icône furtive qui se volatilise dès qu'on cherche à l'identifier.`,
  ],

  /* Horloges de complication génériques (couche optionnelle). */
  _EXTRA_CLOCKS: [
    { type: "menace", title: "Renforts en approche" },
    { type: "alerte", title: "La pression monte" },
    { type: "menace", title: "Le temps joue contre vous" },
    { type: "alerte", title: "Les regards se tournent vers vous" },
  ],

  /* Issues de RETOMBÉE, corrélées à l'objectif (réussite propre / coûteuse /
     ratée). Tirées dans le lead de retombée. */
  _ENDINGS: {
    extraction: [
      "La cible arrive intacte, arrive brisée, ou n'arrive jamais.",
      "Trois fins : cible livrée, cible perdue, ou cible retournée contre vous.",
      "Exfil réussie, exfil au prix fort, ou cible aux mains d'un autre.",
    ],
    vol_donnees: [
      "Données propres, données corrompues, ou données déjà copiées par un rival.",
      "Le lot sort net, sort tronqué, ou laisse une trace qui vous suivra.",
      "Dossier livré, dossier grillé, ou dossier qui vous explose à la figure.",
    ],
    sabotage: [
      "Cible détruite net, panne réparable, ou sabotage éventé avant l'heure.",
      "L'infrastructure tombe, tient à un fil, ou vous tombe dessus.",
      "Destruction propre, dégâts partiels, ou vous coincés dans les décombres.",
    ],
    liquidation: [
      "Contrat honoré discrètement, bavure retentissante, ou cible en fuite.",
      "La cible tombe sans bruit, tombe en public, ou vous glisse entre les doigts.",
      "Travail net, message sanglant, ou témoin de trop.",
    ],
    protection: [
      "Protégé sain et sauf, protégé marqué à vie, ou protégé perdu.",
      "Le protégé rentre entier, rentre diminué, ou ne rentre pas.",
      "Mission accomplie, victoire amère, ou échec cuisant.",
    ],
    intimidation: [
      "La cible plie, la cible casse, ou la cible se retourne contre vous.",
      "Message reçu cinq sur cinq, message trop appuyé, ou guerre déclenchée.",
      "Cible soumise, cible brisée, ou vendetta ouverte.",
    ],
    enquete: [
      "Vérité exposée, vérité enterrée, ou vérité qui vous explose à la figure.",
      "Le coupable tombe, le coupable achète votre silence, ou le vrai coupable court toujours.",
      "Affaire résolue proprement, résolue au prix fort, ou piste perdue pour de bon.",
    ],
    escorte: [
      "Le convoi arrive intact, arrive amoché, ou n'arrive jamais.",
      "Livraison au bout, livraison au prix fort, ou tout perdu en route.",
      "Le protégé rentre entier, rentre marqué, ou reste sur le carreau.",
    ],
    recuperation_objet: [
      "L'objet revient intact, revient abîmé, ou file à un rival.",
      "Bien récupéré, récupéré au prix d'ennemis tenaces, ou perdu pour de bon.",
      "Livré au mandant, gardé en douce, ou détruit dans la bagarre.",
    ],
    filature: [
      "Cible percée à jour, filature grillée, ou cible envolée.",
      "On sait tout d'elle, on n'en sait qu'à moitié, ou elle vous a semés.",
      "La vérité en poche, la couverture cramée, ou la piste perdue.",
    ],
    chasse_a_la_prime: [
      "Prime touchée net, prime touchée dans le doute, ou cible envolée.",
      "Cible livrée, cible relâchée par pitié, ou cible qui vous a retournés.",
      "Contrat honoré, victoire amère, ou traque sans fin.",
    ],
    arnaque: [
      "La cible se dépouille elle-même, l'arnaque tourne court (on revend ce qu'on peut), ou tout s'effondre.",
      "Coup parfait, coup à moitié, ou couverture grillée.",
      "La cible délestée, la cible sur ses gardes, ou l'arnaque éventée.",
    ],
    _default: [
      "Le plan tenu, le compromis boiteux, ou la déroute.",
      "Ça finit propre, ça finit sale, ou ça ne finit pas.",
      "Succès net, victoire à la Pyrrhus, ou dette de sang.",
      "Contrat rempli mais un tiers vous a vus, dette d'ombre ouverte, ou fiasco complet.",
      "Sortie propre, sortie qui laisse des traces, ou sortie qu'on vous fait payer.",
    ],
  },

  /* Profils de COMPLICATION (familles Vise Juste, cf. ToposCatalog.difficultes
     `kind`) : pools de fronts / faits cachés / indices / options. */
  _COMPLICATIONS: {
    trahison: {
      infos: [
        "Le commanditaire a menti sur l'objet réel du run.",
        "Un second Johnson joue le même contrat contre vous.",
        "Quelqu'un dans l'équipe a été approché — ou acheté.",
      ],
      infoRole: "progression", past: true,
      clues: [
        "Une faille dans le brief : le Johnson en sait trop — ou pas assez.",
        "Un paiement anticipé douteux, une clause étrange dans l'accord.",
      ],
      fronts: [
        { faction: "mandant", titles: ["Le double jeu du commanditaire", "Le Johnson tire les ficelles"],
          impulses: ["récupérer la mise sans jamais payer", "se débarrasser des témoins gênants (vous)"],
          portents: ["Le paiement se fait attendre.", "Un « observateur » du Johnson s'invite sur le run.", "Le commanditaire coupe la sortie et renie le contrat."] },
      ],
    },
    rival: {
      clock: true,
      clockPool: [{ type: "objectif", title: "Course contre l'équipe rivale" }, { type: "menace", title: "L'équipe rivale prend l'avantage" }],
      fronts: [
        { faction: "rival", titles: ["Une équipe de shadowrunners rivale", "La concurrence sur le contrat"],
          impulses: ["rafler le contrat la première", "vous faire porter le chapeau"],
          portents: ["Des traces fraîches : quelqu'un est passé avant vous.", "Sabotage discret de votre approche.", "Affrontement ouvert pour la cible."] },
      ],
    },
    securite: {
      boostAlert: 2,
      portentExtra: ["Mages de sécurité et watchers astraux passent en alerte.", "Une équipe d'élite non répertoriée entre en jeu.", "Des drones lourds bouclent les issues."],
    },
    mauvaise_info: {
      infos: [
        "La cible réelle n'est pas celle annoncée au brief.",
        "Les plans du lieu sont périmés : la disposition a changé.",
        "La cible est déjà morte — ou n'a jamais existé.",
      ],
      infoRole: "progression", past: true,
      clues: [
        "Un détail sur place contredit le dossier : plan périmé, ou cible substituée.",
        "Les repères du brief ne correspondent pas à la réalité du terrain.",
      ],
    },
    prerequis: {
      clues: ["Sans le bon contact (ou le bon matériel), la porte reste close.", "Il manque une pièce au puzzle : un code, une clé, un visage."],
      gated: true,
    },
    environnement: {
      portentExtra: ["Le terrain se retourne : toxique, brouillage, ou pire.", "La météo tourne au cauchemar sur zone.", "Le lieu lui-même devient un danger."],
    },
    ethique: {
      infos: ["Un innocent est pris dans la zone d'opération.", "Un enfant, un civil, un curieux — au mauvais endroit."],
      infoRole: "enrichissement", past: false,
      fearScene: true,
    },
    mandant_cache: {
      infos: [
        "Le mandant n'est pas ce qu'il prétend : une IA, un esprit ou pire derrière l'intermédiaire.",
        "Le « job » masque son vrai but : vous n'avez pas été engagés pour ce qu'on vous a dit.",
        "L'employeur anonyme est en réalité la cible même de votre run.",
      ],
      infoRole: "progression", past: false,
      clues: [
        "Une icône furtive qui se volatilise dès qu'on cherche à l'identifier.",
        "La paie est liée à un « vrai » but que le brief passe sous silence.",
      ],
      fronts: [
        { faction: "mandant", titles: ["Le vrai visage du commanditaire", "Ce que cache le Johnson"],
          impulses: ["instrumentaliser l'équipe pour un but qu'elle ignore", "effacer quiconque découvre ce qu'il est"],
          portents: ["Le Johnson reste injoignable après le brief.", "Un détail de sa couverture ne colle pas.", "Sa véritable nature affleure — et elle n'est pas humaine."] },
      ],
    },
    runners_jetables: {
      infos: [
        "Vous êtes des jetables : le commanditaire compte effacer l'équipe une fois le job fait.",
        "Un « observateur » du Johnson est là pour vous éliminer, pas pour vous aider.",
      ],
      infoRole: "progression", past: false,
      clues: [
        "La paie exceptionnelle sent le contrat sans lendemain.",
        "Un prestataire trop lié au Johnson rôde près de votre planque.",
      ],
      fronts: [
        { faction: "mandant", titles: ["Nettoyage prévu", "Le contrat a une clause cachée : vous"],
          impulses: ["effacer les exécutants une fois le travail fait", "ne laisser aucun témoin de l'opération"],
          portents: ["Un « observateur » du Johnson s'invite sur le run.", "La sortie prévue se referme derrière vous.", "Des nettoyeurs passent derrière vous pour effacer les traces — vous compris."] },
      ],
    },
    cible_innocente: {
      infos: [
        "La cible que vous visez ignore tout et n'a rien fait : c'est une victime.",
        "La personne à livrer ou abattre est manipulée, ou tenue par un pacte, pas coupable.",
      ],
      infoRole: "enrichissement", past: false,
      fearScene: true,
      clues: [
        "La cible supplie, terrifiée : son « crime » ne colle pas.",
        "Ce qu'on vous a dit d'elle contredit ce que vous voyez sur place.",
      ],
    },
  },

  /* Classe de casting par TYPE de scène (miroir `RunGen._ROLE_CLASS`). */
  _CAST_CLASS_BY_TYPE: {
    action: "combat", sociale: "social", "repérage": "tech", "décision": "social",
  },

  /* ================= MOTEUR ================= */

  /** Construit le spec d'une trame depuis un contexte résolu :
      `{ topos, template:{beats,links,key}, opposition:{key,name}, mandant:{key,name},
         security:{label,roles}, menace, system }`. Renvoie `{ factions, scenario,
      scenes, edges, clocks, fronts, infoNodes, clues, climaxIndex }` ou `null`. */
  fromTopos(ctx = {}) {
    const {
      topos = {}, template, opposition = {}, mandant = {},
      security = {}, ambiances = [], menace = 3, system = null,
    } = ctx;
    const beats = (template && Array.isArray(template.beats) && template.beats) || [];
    if (!beats.length) return null;

    const obj = this._OBJECTIVES[topos.objectif] || this._DEFAULT_OBJECTIVE;
    const comp = this._COMPLICATIONS[topos.complicationKind] || {};
    const roleLabels = Array.isArray(security.roles) ? security.roles.map((r) => r.label).filter(Boolean) : [];
    const c = {
      client: topos.client || mandant.name || "un Johnson",
      type: topos.type || "un run",
      lieu: topos.lieu || "le site",
      opp: opposition.name || "l'opposition",
      mandant: mandant.name || "le commanditaire",
      stake: obj.stake, recon: Utils.rand(obj.recons || ["Repérer les lieux et la sécurité"]),
      ending: Utils.rand(this._ENDINGS[topos.objectif] || this._ENDINGS._default),
      complication: topos.complication || "un imprévu force un choix",
      secu: security.label || "sécurité du site",
      secuKey: security.key || null,
      oppType: opposition.type || "corpo",
      oppPlural: /^les\s/i.test(String(opposition.name || "")),
      mandantType: mandant.type || "corpo",
      ambiance: Array.isArray(ambiances) && ambiances.length ? Utils.rand(ambiances) : "",
      payment: topos.payment || "à négocier",
      bonus: topos.objectif2 ? ` ${topos.objectif2}.` : "",
      roles: roleLabels.length ? roleLabels.join(", ") : "des renforts",
      firstRole: roleLabels[0] || "la sécurité",
    };

    // Climax = dernière étape « action » (sinon la dernière).
    let climaxIndex = beats.reduce((acc, b, i) => (b.type === "action" ? i : acc), -1);
    if (climaxIndex < 0) climaxIndex = beats.length - 1;
    const lastIndex = beats.length - 1;
    const idxOfType = (t) => beats.findIndex((b) => b.type === t);
    const reconIndex = idxOfType("repérage");
    const socialIndex = idxOfType("sociale");
    const decisionIndex = idxOfType("décision");

    // Pools de scènes flavorés, mêlés aux génériques : le climax et l'action
    // portent le VERBE d'objectif ; l'accroche, le TON du mandant ; le repérage,
    // l'AMBIANCE du district (une exfil ≠ un sabotage, une corpo ≠ la pègre,
    // Downtown ≠ les barrens).
    const climaxPool = this._LEADS.climax.concat(obj.climaxes || []);
    const actionPool = this._LEADS.action.concat(obj.actions || []);
    const accrochePool = this._LEADS.accroche.concat(this._ACCROCHE_BY_TYPE[c.mandantType] || []);
    const reconPool = c.ambiance ? this._LEADS["repérage"].concat(this._LEADS_AMBIANCE) : this._LEADS["repérage"];

    // --- Scènes (lead tiré au sort + beat dramatique + classe de cast) ---
    const scenes = beats.map((b, i) => {
      const isClimax = i === climaxIndex;
      const pool = isClimax ? climaxPool
        : b.type === "action" ? actionPool
        : b.type === "accroche" ? accrochePool
        : b.type === "repérage" ? reconPool
        : this._LEADS[b.type] || this._LEADS.action;
      const lead = Utils.rand(pool)(c);
      const scene = {
        beat: b.beat, type: b.type, title: b.title || "",
        body: lead + (b.body ? `\n\n${b.body}` : ""),
        x: Number.isFinite(b.x) ? b.x : 140 + (i % 2) * 200,
        y: Number.isFinite(b.y) ? b.y : 80 + i * 90,
        bang: "", arrow: null,
        cast: this._CAST_CLASS_BY_TYPE[b.type] || null,
      };
      if (isClimax) { scene.bang = Utils.rand(obj.bangs.concat(this._BANGS)); scene.arrow = "fear"; }
      else if (i === lastIndex) scene.arrow = "hope";
      return scene;
    });
    // Choix forcé au point de bascule (décision, sinon avant-climax).
    const twistIndex = decisionIndex >= 0 ? decisionIndex : Math.max(0, climaxIndex - 1);
    if (twistIndex !== climaxIndex && !scenes[twistIndex].bang)
      scenes[twistIndex].bang = Utils.rand(this._TWIST_BANGS)(c);
    // Complication éthique : une scène bascule en peur.
    if (comp.fearScene) {
      const fi = socialIndex >= 0 && socialIndex !== climaxIndex ? socialIndex : twistIndex;
      if (fi !== climaxIndex) scenes[fi].arrow = "fear";
    }

    // --- Arêtes : liens du modèle + sortie de secours (Alexander) ---
    const edges = (template.links || []).map((l) => ({
      from: l.from, to: l.to, kind: l.kind || "libre", gateway: l.gateway || null,
      isEscapeHatch: !!l.isEscapeHatch, label: l.label || "",
    }));
    let escapeEdgeIndex = null;
    const escFrom = climaxIndex - 1;
    if (escFrom >= 0 && escFrom !== lastIndex && lastIndex !== climaxIndex) {
      escapeEdgeIndex = edges.length;
      edges.push({ from: escFrom, to: lastIndex, kind: "libre", gateway: null, isEscapeHatch: true, label: "fuite" });
    }

    // --- Factions en lice (par rôle) ---
    const compFront = comp.fronts ? Utils.rand(comp.fronts) : null;
    const factions = { opposition: { name: opposition.name || "Opposition", anchor: opposition.key || null } };
    if (compFront && compFront.faction === "mandant")
      factions.mandant = { name: mandant.name || "le commanditaire", anchor: mandant.key || null };
    if (compFront && compFront.faction === "rival")
      factions.rival = { name: "Une équipe de shadowrunners rivale", anchor: null };

    // --- Horloges : alerte + objectif spécifique + complication (opt.) ---
    const alertSeg = Math.max(4, Math.min(9, menace + 2 + (comp.boostAlert || 0)));
    const alertEffects = [{ atThreshold: alertSeg, action: "activateNode", target: { scene: climaxIndex } }];
    if (escapeEdgeIndex != null)
      alertEffects.push({ atThreshold: Math.max(1, alertSeg - 1), action: "closeEdge", target: { edge: escapeEdgeIndex } });
    const objClock = Utils.rand(obj.clocks);
    const clocks = [
      { type: "alerte", title: `Alerte — ${c.secu}`, segments: alertSeg, effects: alertEffects },
      { type: objClock.type, title: objClock.title, segments: Utils.randInt(5, 8), effects: [] },
    ];
    if (comp.clock) {
      const ck = Utils.rand(comp.clockPool);
      clocks.push({ type: ck.type, title: ck.title, segments: 6, effects: [] });
    } else if (this._maybe(0.35)) {
      const ck = Utils.rand(this._EXTRA_CLOCKS);
      clocks.push({ type: ck.type, title: ck.title, segments: Utils.randInt(4, 6), effects: [] });
    }
    // Objectif secondaire (run à double objectif) : sa propre horloge d'objectif.
    const obj2 = topos.objectif2Key && topos.objectif2Key !== topos.objectif ? this._OBJECTIVES[topos.objectif2Key] : null;
    if (obj2) clocks.push({ type: "objectif", title: `Second objectif — ${obj2.stake}`, segments: Utils.randInt(5, 8), effects: [] });

    // --- Fronts : opposition (pools) + complication (opt.) ---
    const fronts = [this._oppositionFront(c, comp)];
    if (compFront) {
      // Impulsion du front de complication. Pour un mandant, on MÊLE ses impulsions
      // propres (spécifiques à la complication : « effacer les exécutants »…) à
      // celles typées par sa nature (_BETRAYAL_BY_TYPE) — sans que l'une aplatisse
      // l'autre. Même logique de concat que les pools de scène flavorés.
      const betrayalPool = compFront.faction === "mandant" ? (this._BETRAYAL_BY_TYPE[mandant.type] || []) : [];
      const compImpulse = Utils.rand((compFront.impulses || []).concat(betrayalPool));
      fronts.push({
        factionRole: compFront.faction,
        title: Utils.rand(compFront.titles),
        danger: {
          impulse: compImpulse,
          impendingDoom: topos.complication || "",
          portents: compFront.portents.slice(),
        },
      });
    }

    // --- Calque d'indices : faits cachés + indices ancrés ---
    const infoNodes = [];
    const clues = [];
    const eligible = beats
      .map((b, i) => i)
      .filter((i) => i !== climaxIndex && ["repérage", "sociale", "action", "décision"].includes(beats[i].type));
    const anchorPick = () => (eligible.length ? [Utils.rand(eligible)] : []);
    // Fait « vérité de l'opposition ».
    infoNodes.push({ fact: Utils.rand(this._HIDDEN_FACTS)(c), role: "enrichissement", when: null });
    clues.push({ toInfo: 0, anchorScenes: anchorPick(), description: Utils.rand(this._CLUE_DESCS)(c), gated: false });
    // Fait de complication (la vérité derrière le run).
    if (comp.infos) {
      const idx = infoNodes.length;
      infoNodes.push({ fact: Utils.rand(comp.infos), role: comp.infoRole || "progression", when: comp.past ? 0 : null });
      clues.push({
        toInfo: idx, anchorScenes: anchorPick(),
        description: comp.clues ? Utils.rand(comp.clues) : "Un indice contredit le brief.",
        gated: !!comp.gated,
      });
    } else if (comp.clues) {
      clues.push({ toInfo: 0, anchorScenes: anchorPick(), description: Utils.rand(comp.clues), gated: !!comp.gated });
    }
    // 2ᵉ fait caché (couche optionnelle) — une seconde vérité à exhumer.
    if (this._maybe(0.4)) {
      const idx = infoNodes.length;
      infoNodes.push({ fact: Utils.rand(this._HIDDEN_FACTS)(c), role: "enrichissement", when: null });
      clues.push({ toInfo: idx, anchorScenes: anchorPick(), description: Utils.rand(this._CLUE_DESCS)(c), gated: false });
    }
    // Objectif secondaire semé en fait (opt.) — l'accroche du bonus devient une piste.
    if (topos.objectif2 && this._maybe(0.6)) {
      const idx = infoNodes.length;
      infoNodes.push({ fact: `Occasion à saisir : ${topos.objectif2}.`, role: "enrichissement", when: null });
      clues.push({ toInfo: idx, anchorScenes: anchorPick(), description: "Une opportunité que le brief n'avait pas prévue.", gated: false });
    }

    // Passe de langue sur les textes portant le nom de l'opposition. TOUJOURS
    // appliquée : accord pluriel du verbe collé au nom quand il est au pluriel
    // (« les Ancients montrent »), et élision « de le/les » → « du/des », « de +
    // voyelle » → « d' » (« de une ruche » → « d'une ruche », « de Ares » → « d'Ares »).
    {
      const fx = (s) => contractDe(c.oppPlural ? agreePlural(s, c.opp) : s);
      for (const sc of scenes) { sc.body = fx(sc.body); sc.bang = fx(sc.bang); }
      for (const fr of fronts) {
        fr.title = fx(fr.title);
        fr.danger.impulse = fx(fr.danger.impulse);
        fr.danger.portents = fr.danger.portents.map(fx);
      }
      for (const n of infoNodes) n.fact = fx(n.fact);
      for (const cl of clues) cl.description = fx(cl.description);
    }

    return {
      factions,
      scenario: {
        title: this._scenarioTitle(topos, opposition),
        system: system || null,
        templateOrigin: (template && (template.key || template.id)) || null,
      },
      scenes, edges, clocks, fronts, infoNodes, clues, climaxIndex,
    };
  },

  /** Front de l'opposition : titre/impulsion tirés, présages étagés (notice →
      reinforce → lockdown, + traque optionnelle). Le renfort et le bouclage
      empruntent au profil de sécurité (mage de sang, samouraï rouge, goule…)
      quand il est connu ; sinon aux pools génériques. Une complication de type
      « sécurité » impose son propre renfort. */
  _oppositionFront(c, comp) {
    const prof = this._SECURITY_PORTENTS[c.secuKey] || {};
    const esc = this._TYPE_ESCALATION[c.oppType] || {};
    // Repérage (notice) et traque (hunt) : typés par nature de faction si connue.
    const portents = [esc.notice ? Utils.rand(esc.notice) : Utils.rand(this._PORTENTS.notice)(c)];
    // Renfort / bouclage : au profil de sécurité (ou complication « sécurité »).
    portents.push(
      comp.portentExtra ? Utils.rand(comp.portentExtra)
      : prof.reinforce ? Utils.rand(prof.reinforce)
      : Utils.rand(this._PORTENTS.reinforce)(c),
    );
    portents.push(prof.lockdown ? Utils.rand(prof.lockdown) : Utils.rand(this._PORTENTS.lockdown)(c));
    if (this._maybe(0.5)) portents.push(esc.hunt ? Utils.rand(esc.hunt) : Utils.rand(this._PORTENTS.hunt)(c));
    // Titre + impulsion : typés par la nature de la faction si connue, sinon génériques.
    const byType = this._FRONT_BY_TYPE[c.oppType];
    const title = byType ? Utils.rand(byType.titles)(c) : Utils.rand(this._FRONT_TITLES)(c);
    const impulse = byType ? Utils.rand(byType.impulses) : Utils.rand(this._FRONT_IMPULSES)(c);
    return {
      factionRole: "opposition",
      title,
      danger: { impulse, impendingDoom: c.complication || "", portents },
    };
  },

  _scenarioTitle(topos, opposition) {
    const verb = (topos.type || "Run").split(" — ")[0].split(" chez ")[0].split(" d'")[0];
    const opp = opposition.name ? ` vs ${opposition.name}` : "";
    return `${verb}${opp}`.slice(0, 80);
  },

  /* ---- Utilitaire pur ---- */
  _maybe(p) {
    return Math.random() < p;
  },
};
