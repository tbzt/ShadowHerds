"use strict";

/* ============================================================
   CONTENT — base d'aléas cohérents pour les PNJ, INDEXÉE PAR
   ÉDITION (sr5, sr6, anarchy). Chaque édition a ses propres
   listes et ses propres descriptifs, fidèles à ses livres.

   Sources :
     SR6 : livre de base (Grimoire de sorts BBESR6A03, p.136-172)
     SR5 : livre de base (Sorcellerie p.283-301) + Grimoire des ombres
     Anarchy : Shadowrun : Anarchy 2.0 (« Lancement de sorts » p.178-185) —
       5 catégories (combat/détection/santé/illusion/manipulation), coût
       exprimé en « Seuil » (champ `seuil` : nombre, 0, « variable », ou
       selon aire/taille/matériau, ou réserve opposée de la cible).

   Entrée : { nom, desc, profMin, pour[], (drain|seuil), cat }
   profMin = professionnalisme minimum (cohérence). "tous" = universel.
   Tags : combat, corpo, police, crime, militaire, rue, ombre,
          magique, matrice, tech, gang, civil.
   ============================================================ */

import { Utils } from "../core/utils.js";

export const Content = {
  /* ========================================================
     SORTS
     ======================================================== */
  spells: {
    // ----- SR6 (livre de base, Grimoire de sorts p.136-172) -----
    // Catalogue officiel = 72 sorts ; sélection élargie et vérifiée
    // (~38 sorts) plutôt qu'exhaustive. drain = valeur fixe (RAW SR6).
    sr6: [
      {
        name: "Éclair étourdissant",
        cat: "combat",
        drain: 3,
        proRatingMin: 1,
        desc: "Canalise le mana pour étourdir une cible à distance (dommages E). Idéal pour neutraliser sans tuer. Portée LdV, Type M, durée Instantanée.",
      },
      {
        name: "Sphère étourdissante",
        cat: "combat",
        drain: 4,
        proRatingMin: 2,
        desc: "Version à effet de zone : assomme tout un groupe d'un coup. Portée LdV (Z), Type M, durée Instantanée.",
      },
      {
        name: "Éclair de force",
        cat: "combat",
        drain: 4,
        proRatingMin: 2,
        desc: "Version extrême de Frappe à distance, inflige des dommages physiques à une cible. Portée LdV, Type P.",
      },
      {
        name: "Éclair mana",
        cat: "combat",
        drain: 4,
        proRatingMin: 2,
        desc: "Modèle le mana pour briser les crânes à distance. N'affecte qu'une cible vivante. Type M, Portée LdV.",
      },
      {
        name: "Flot acide",
        cat: "combat",
        drain: 5,
        proRatingMin: 2,
        desc: "Projette de l'acide corrosif sur une cible : dommages physiques et état Corrodé. Type P, Portée LdV.",
      },
      {
        name: "Trait de feu",
        cat: "combat",
        drain: 5,
        proRatingMin: 2,
        desc: "Un classique : projette du feu, dommages élémentaires de Feu et état Enflammé. Type P, Portée LdV.",
      },
      {
        name: "Sphère de feu",
        cat: "combat",
        drain: 6,
        proRatingMin: 3,
        desc: "Trait de feu en zone : embrase toute une aire et impose Enflammé. Gare aux matériaux combustibles. Type P, LdV (Z).",
      },
      {
        name: "Lance de glace",
        cat: "combat",
        drain: 5,
        proRatingMin: 2,
        desc: "Frappe d'un froid glacial : dommages de Froid et état Frigorifié. Pour les ennemis en sous-vêtements ignifuges. Type P, LdV.",
      },
      {
        name: "Foudre",
        cat: "combat",
        drain: 5,
        proRatingMin: 2,
        desc: "Ce que Zeus et Thor réservaient aux imprudents : dommages d'Électricité et état Électrocuté. Type P, Portée LdV.",
      },
      {
        name: "Sphère de foudre",
        cat: "combat",
        drain: 6,
        proRatingMin: 3,
        desc: "Foudre en zone : décharge électrique qui frappe tout un groupe et électrocute. Type P, LdV (Z).",
      },
      {
        name: "Soins",
        cat: "sante",
        drain: 3,
        proRatingMin: 1,
        desc: "La méthode la plus rapide pour refermer bosses et blessures par balle : 1 case de dommages récupérée par succès net. Type P, Permanente.",
      },
      {
        name: "Stabilisation",
        cat: "sante",
        drain: 2,
        proRatingMin: 1,
        desc: "Quand quelqu'un a encaissé du surplus : récupère 1 case de surplus par succès net et stabilise le mourant. Type P.",
      },
      {
        name: "Augmentation de réflexes",
        cat: "sante",
        drain: 5,
        proRatingMin: 2,
        desc: "Accélère la cible : Réaction et dés d'initiative en hausse (jusqu'à +5 dés), donc des actions mineures en plus. Type P.",
      },
      {
        name: "Augmentation d'attribut",
        cat: "sante",
        drain: 3,
        proRatingMin: 2,
        desc: "Le toucher du mage renforce temporairement un attribut (max +4). N'affecte ni Atout, ni Essence, ni Magie. Type P.",
      },
      {
        name: "Diminution d'attribut",
        cat: "sante",
        drain: 3,
        proRatingMin: 2,
        desc: "L'inverse d'Augmentation d'attribut : affaiblit temporairement un attribut de la cible. Type P, Maintenue.",
      },
      {
        name: "Antidote",
        cat: "sante",
        drain: 5,
        proRatingMin: 2,
        desc: "Du mana parcourt le corps pour purger les toxines : chaque succès réduit la Virulence d'un point. Type P.",
      },
      {
        name: "Résistance à la douleur",
        cat: "sante",
        drain: 3,
        proRatingMin: 1,
        desc: "Ne soigne pas mais permet d'ignorer les dommages : réduit le malus de blessures. Type M, durée Maintenue.",
      },
      {
        name: "Soins purificateurs",
        cat: "sante",
        drain: 5,
        proRatingMin: 3,
        desc: "Comme Soins, mais retire en plus l'état Corrodé de la cible en même temps que les dommages. Type P, Permanente.",
      },
      {
        name: "Détection de la vie",
        cat: "detection",
        drain: 3,
        proRatingMin: 1,
        desc: "Des gens cachés derrière ces décombres ? Ce sort le dit : détecte les êtres conscients à portée. Type M, Maintenue.",
      },
      {
        name: "Clairvoyance",
        cat: "detection",
        drain: 3,
        proRatingMin: 1,
        desc: "Le sujet voit à distance, à travers murs et obstacles, dans une zone qu'il peut déplacer. Type M, Maintenue.",
      },
      {
        name: "Sonde mentale",
        cat: "detection",
        drain: 5,
        proRatingMin: 3,
        desc: "Pénètre l'esprit d'une cible pour lire pensées et souvenirs ; avec assez de succès, atteint l'inconscient. Type P.",
      },
      {
        name: "Analyse de la véracité",
        cat: "detection",
        drain: 3,
        proRatingMin: 1,
        desc: "Le sujet sent si la cible dit la vérité, ou croit la dire. Il doit entendre directement les paroles. Type M.",
      },
      {
        name: "Détection de la magie",
        cat: "detection",
        drain: 4,
        proRatingMin: 2,
        desc: "Alerte dès qu'une magie active est à portée : focus, sorts, réactifs, esprits, rituels. Type M, Maintenue.",
      },
      {
        name: "Détection des ennemis",
        cat: "detection",
        drain: 3,
        proRatingMin: 1,
        desc: "Repère les intentions hostiles dirigées vers le sujet, sans révéler la position exacte. Type M, Maintenue.",
      },
      {
        name: "Analyse de la magie",
        cat: "detection",
        drain: 3,
        proRatingMin: 1,
        desc: "Étudie un effet magique déjà lancé pour en déterminer la nature et l'origine. Type M.",
      },
      {
        name: "Invisibilité",
        cat: "illusion",
        drain: 3,
        proRatingMin: 2,
        desc: "La cible devient transparente : état Invisible, seuil à atteindre pour la voir. N'affecte que les êtres vivants. Type M.",
      },
      {
        name: "Masque",
        cat: "illusion",
        drain: 3,
        proRatingMin: 2,
        desc: "Modifie apparence, odeur et voix d'une personne. Parfait pour usurper une identité. N'affecte que le vivant. Type M.",
      },
      {
        name: "Confusion",
        cat: "illusion",
        drain: 3,
        proRatingMin: 1,
        desc: "Déferlement d'images et d'émotions : la cible subit l'état Confus et un malus à ses tests. Type M, Portée LdV.",
      },
      {
        name: "Silence",
        cat: "illusion",
        drain: 3,
        proRatingMin: 1,
        desc: "La cible ne peut plus émettre le moindre bruit, même volontairement. Idéal pour l'infiltration. Type M, Maintenue.",
      },
      {
        name: "Agonie",
        cat: "illusion",
        drain: 3,
        proRatingMin: 2,
        desc: "Inflige l'illusion d'une terrible douleur : chaque succès net ajoute un malus paralysant à la cible. Type M.",
      },
      {
        name: "Fantasme",
        cat: "illusion",
        drain: 3,
        proRatingMin: 2,
        desc: "Crée une illusion plurisensorielle complète dans une zone, crédible tant qu'elle reste plausible. Type M, LdV (Z).",
      },
      {
        name: "Anti-détecteurs",
        cat: "illusion",
        drain: 2,
        proRatingMin: 1,
        desc: "Rend la cible invisible aux détecteurs technologiques uniquement (caméras, capteurs), pas aux yeux. Type M, Maintenue.",
      },
      {
        name: "Armure",
        cat: "manipulation",
        drain: 4,
        proRatingMin: 2,
        desc: "Imprègne le corps de la cible : ajoute les succès nets au Score Défensif. Type P, durée Maintenue.",
      },
      {
        name: "Lévitation",
        cat: "manipulation",
        drain: 6,
        proRatingMin: 3,
        desc: "Pas tout à fait voler, mais un défi à la gravité : 50 kg levés par succès. La cible doit rester en LdV. Type P.",
      },
      {
        name: "Contrôle des pensées",
        cat: "manipulation",
        drain: 4,
        proRatingMin: 4,
        desc: "Entre dans la tête de la cible pour lui imposer sa volonté, de façon insidieuse. Type M, durée Limitée.",
      },
      {
        name: "Barrière physique",
        cat: "manipulation",
        drain: 6,
        proRatingMin: 3,
        desc: "Crée un mur d'indice de Structure égal à Magie + succès. Pour bloquer ou se protéger. Type P, LdV (Z).",
      },
      {
        name: "Barrière mana",
        cat: "manipulation",
        drain: 5,
        proRatingMin: 3,
        desc: "Comme Barrière physique, mais bloque aussi la magie et les esprits : idéale contre un adversaire éveillé. Type P, LdV (Z).",
      },
      {
        name: "Lumière",
        cat: "manipulation",
        drain: 3,
        proRatingMin: 1,
        desc: "Éclaire une zone d'une lumière magique, utile là où l'éclairage normal manque ou est coupé. Type P, Maintenue.",
      },
      {
        name: "Ténèbres",
        cat: "manipulation",
        drain: 3,
        proRatingMin: 1,
        desc: "Plonge une zone dans le noir complet, aveugle la vision normale. Idéal pour couvrir une fuite. Type P, Maintenue.",
      },
      // ----- Grimoire de sorts (p.130-150) -----
      {
        name: "Sphère mana",
        cat: "combat",
        drain: 5,
        proRatingMin: 3,
        desc: "Sort direct à zone affectant tout dans la zone. Version à zone de Éclair mana manipulant le mana directement.",
      },
      {
        name: "Sphère de force",
        cat: "combat",
        drain: 5,
        proRatingMin: 3,
        desc: "Sort direct à zone affectant tout dans la zone. Version extrême à zone de Éclair de force.",
      },
      {
        name: "Vague toxique",
        cat: "combat",
        drain: 6,
        proRatingMin: 3,
        desc: "Sort indirect à zone affectant tout dans la zone. Version acide à zone soumettant les cibles à l'état Corrodé.",
      },
      {
        name: "Tempête de glace",
        cat: "combat",
        drain: 6,
        proRatingMin: 3,
        desc: "Sort indirect à zone affectant tout dans la zone. Version glace à zone imposant l'état Frigorifié.",
      },
      {
        name: "Frappe à distance",
        cat: "combat",
        drain: 3,
        proRatingMin: 2,
        desc: "Sort indirect affectant une cible. Agit sur l'air pour donner un coup démontrant la puissance d'érosion du vent.",
      },
      {
        name: "Déflagration",
        cat: "combat",
        drain: 4,
        proRatingMin: 2,
        desc: "Sort indirect à zone affectant tout dans la zone. Version à zone de Frappe à distance avec effet de feu.",
      },
      {
        name: "Analyse d'objet",
        cat: "detection",
        drain: 3,
        proRatingMin: 2,
        desc: "Sort permettant d'obtenir des informations sur des objets inconnus selon le nombre de succès nets obtenus.",
      },
      {
        name: "Clairaudience",
        cat: "detection",
        drain: 3,
        proRatingMin: 2,
        desc: "Sort permettant au sujet d'entendre des sons distants dans une zone pouvant être déplacée.",
      },
      {
        name: "Lien mental",
        cat: "detection",
        drain: 3,
        proRatingMin: 2,
        desc: "Sort établissant une communication mentale entre le lanceur et le sujet qui doivent rester à portée.",
      },
      {
        name: "Sens du combat",
        cat: "detection",
        drain: 5,
        proRatingMin: 3,
        desc: "Sort augmentant la perception des dangers possibles et réaction plus rapide du sujet.",
      },
      {
        name: "Soins réchauffants",
        cat: "sante",
        drain: 5,
        proRatingMin: 3,
        desc: "Sort guérissant comme Soins en ajoutant élément réchauffant éliminant l'état Frigorifié.",
      },
      {
        name: "Soins refroidissants",
        cat: "sante",
        drain: 5,
        proRatingMin: 3,
        desc: "Sort guérissant comme Soins en ajoutant élément refroidissant éliminant l'état Enflammé.",
      },
      {
        name: "Confusion supérieure",
        cat: "illusion",
        drain: 4,
        proRatingMin: 2,
        desc: "Sort affectant aussi caméras microphones et technologie comme Confusion.",
      },
      {
        name: "Fantasme supérieur",
        cat: "illusion",
        drain: 4,
        proRatingMin: 2,
        desc: "Sort projetant image sons et odeurs affectant aussi caméras et technologie.",
      },
      {
        name: "Invisibilité supérieure",
        cat: "illusion",
        drain: 4,
        proRatingMin: 2,
        desc: "Sort octroie état Invisible supérieur fonctionnant contre caméras et appareils technologiques.",
      },
      {
        name: "Masque supérieur",
        cat: "illusion",
        drain: 4,
        proRatingMin: 2,
        desc: "Sort comme Masque affectant aussi caméras microphones et appareils technologiques.",
      },
      {
        name: "Silence supérieur",
        cat: "illusion",
        drain: 4,
        proRatingMin: 2,
        desc: "Sort comme Silence imposant état Silencieux supérieur microphones ne peuvent entendre.",
      },
      {
        name: "Animation du bois",
        cat: "manipulation",
        drain: 4,
        proRatingMin: 2,
        desc: "Sort animant morceau bois se déplaçant selon instructions infligeant 2E dommages.",
      },
      {
        name: "Animation du plastique",
        cat: "manipulation",
        drain: 3,
        proRatingMin: 2,
        desc: "Sort animant morceau plastique infligeant 1E dommages avec capacité déplacement limitée.",
      },
      {
        name: "Animation de la pierre",
        cat: "manipulation",
        drain: 5,
        proRatingMin: 3,
        desc: "Sort animant morceau pierre infligeant 3P dommages avec force de frappe accrue.",
      },
      {
        name: "Animation du métal",
        cat: "manipulation",
        drain: 6,
        proRatingMin: 3,
        desc: "Sort animant morceau métal infligeant 4P dommages avec puissance maximum.",
      },
      {
        name: "Armure astrale",
        cat: "manipulation",
        drain: 5,
        proRatingMin: 3,
        desc: "Sort renforçant forme astrale ajoutant succès nets au Score Défensif en astral ou sorts mana.",
      },
      {
        name: "Armure élémentaire",
        cat: "manipulation",
        drain: 3,
        proRatingMin: 2,
        desc: "Sort comme Armure ajoutant bonus élément choisi immunisant contre état élémentaire.",
      },
      {
        name: "Contrôle des actes",
        cat: "manipulation",
        drain: 5,
        proRatingMin: 3,
        desc: "Sort permettant lanceur contrôler cible comme marionnette consciente mais impuissante.",
      },
      {
        name: "Modeler le bois",
        cat: "manipulation",
        drain: 3,
        proRatingMin: 2,
        desc: "Sort rendant malléable bois 1 mètre cube par succès net conservant forme après sort.",
      },
      {
        name: "Modeler le métal",
        cat: "manipulation",
        drain: 2,
        proRatingMin: 1,
        desc: "Sort rendant malléable métal 1 mètre cube par succès net conservant forme après sort.",
      },
      {
        name: "Overclock",
        cat: "manipulation",
        drain: 4,
        proRatingMin: 2,
        desc: "Sort amplifiant brièvement puissance appareil électronique marche mieux plus vite.",
      },
      {
        name: "Modeler la pierre",
        cat: "manipulation",
        drain: 4,
        proRatingMin: 2,
        desc: "Sort rendant malléable pierre 1 mètre cube par succès net conservant forme après sort.",
      },
      {
        name: "Modeler le plastique",
        cat: "manipulation",
        drain: 2,
        proRatingMin: 1,
        desc: "Sort rendant malléable plastique 1 mètre cube par succès net conservant forme après sort.",
      },
      {
        name: "Projectile",
        cat: "manipulation",
        drain: 5,
        proRatingMin: 3,
        desc: "Sort catapultant demi-kilo matière par succès net infligeant dommages étourdissants.",
      },
      {
        name: "Renfort de mur",
        cat: "manipulation",
        drain: 5,
        proRatingMin: 3,
        desc: "Sort renforçant mur existant augmentant indice Structure de 1 point par succès net.",
      },
      {
        name: "Surcharge de focus",
        cat: "manipulation",
        drain: 7,
        proRatingMin: 4,
        desc: "Sort puisant énergie focus augmentant indice effectif de 1 durant sa durée.",
      },
      {
        name: "Tonnerre",
        cat: "manipulation",
        drain: 3,
        proRatingMin: 2,
        desc: "Sort affectant ondes sonores générant bruit malus à réserve dés entendre autres sons.",
      },
      // ----- Voies occultes (Compilation de sorts, p.23-42) -----
      {
        name: "Corrosion",
        cat: "combat",
        drain: 2,
        proRatingMin: 1,
        desc: "Détruit progressivement les matériaux d'une cible.",
      },
      {
        name: "Démantèlement",
        cat: "combat",
        drain: 2,
        proRatingMin: 1,
        desc: "Décompose une cible complexe pièce par pièce.",
      },
      {
        name: "Fusion",
        cat: "combat",
        drain: 3,
        proRatingMin: 2,
        desc: "Fusionne les matériaux de plusieurs objets ensemble.",
      },
      {
        name: "Bouillie",
        cat: "combat",
        drain: 4,
        proRatingMin: 2,
        desc: "Réduit un objet en bouillie indigeste.",
      },
      {
        name: "Défonçage",
        cat: "combat",
        drain: 1,
        proRatingMin: 1,
        desc: "Enfonce une porte ou barrière.",
      },
      {
        name: "Coup Étourdissant",
        cat: "combat",
        drain: 2,
        proRatingMin: 1,
        desc: "Frappe physique étourdissante contact.",
      },
      {
        name: "Sommeil",
        cat: "combat",
        drain: 4,
        proRatingMin: 2,
        desc: "Endort les cibles en zone.",
      },
      {
        name: "Dissipation",
        cat: "combat",
        drain: 6,
        proRatingMin: 3,
        desc: "Dissipe un sort ou effet maintenu.",
      },
      {
        name: "Impulsion Ectomagique",
        cat: "combat",
        drain: 7,
        proRatingMin: 4,
        desc: "Vague d'énergie destructrice zonale.",
      },
      {
        name: "Frappe",
        cat: "combat",
        drain: 2,
        proRatingMin: 1,
        desc: "Frappe magique contact contre une cible.",
      },
      {
        name: "Jet d'Eau",
        cat: "combat",
        drain: 5,
        proRatingMin: 3,
        desc: "Jet d'eau puissant pour noyer obstacles.",
      },
      {
        name: "Tsunami",
        cat: "combat",
        drain: 3,
        proRatingMin: 2,
        desc: "Vague destructrice d'eau.",
      },
      {
        name: "Traîne de Feu",
        cat: "combat",
        drain: 5,
        proRatingMin: 3,
        desc: "Traînée de flammes contre une cible.",
      },
      {
        name: "Explosion Infernale",
        cat: "combat",
        drain: 6,
        proRatingMin: 3,
        desc: "Explosion de feu dévastatrice.",
      },
      {
        name: "Napalm",
        cat: "combat",
        drain: 7,
        proRatingMin: 4,
        desc: "Flammes de napalm incendiaires.",
      },
      {
        name: "Toucher Mortel",
        cat: "combat",
        drain: 3,
        proRatingMin: 2,
        desc: "Contact mortel magique direct.",
      },
      {
        name: "Tuerie",
        cat: "combat",
        drain: 3,
        proRatingMin: 2,
        desc: "Sort ciblé hautement destructeur.",
      },
      {
        name: "Fléau",
        cat: "combat",
        drain: 3,
        proRatingMin: 2,
        desc: "Affliction ciblée d'immobilisation.",
      },
      {
        name: "Coup de Tonnerre",
        cat: "combat",
        drain: 6,
        proRatingMin: 3,
        desc: "Explosion sonore massive.",
      },
      {
        name: "Oeil de la Meute",
        cat: "combat",
        drain: 2,
        proRatingMin: 1,
        desc: "Permet à un animal de voir par les yeux du lanceur.",
      },
      {
        name: "Emprunt de Sens",
        cat: "detection",
        drain: 3,
        proRatingMin: 2,
        desc: "Emprunte temporairement un sens animal.",
      },
      {
        name: "Passager",
        cat: "detection",
        drain: 6,
        proRatingMin: 3,
        desc: "Voit à travers les yeux d'une créature.",
      },
      {
        name: "Sens Animal",
        cat: "detection",
        drain: 4,
        proRatingMin: 2,
        desc: "Perçoit via les sens d'un animal de compagnie.",
      },
      {
        name: "Fenêtre Astrale",
        cat: "detection",
        drain: 4,
        proRatingMin: 2,
        desc: "Ouvre une fenêtre visuelle sur le plan astral.",
      },
      {
        name: "Fenêtre Mana",
        cat: "detection",
        drain: 4,
        proRatingMin: 2,
        desc: "Visualise le flux d'énergie magique.",
      },
      {
        name: "Inspection",
        cat: "detection",
        drain: 5,
        proRatingMin: 3,
        desc: "Identifie objets et matériaux en détail.",
      },
      {
        name: "Catalogue",
        cat: "detection",
        drain: 5,
        proRatingMin: 3,
        desc: "Énumère tous les objets dans une zone.",
      },
      {
        name: "Traduction",
        cat: "detection",
        drain: 4,
        proRatingMin: 2,
        desc: "Comprend une langue étrangère.",
      },
      {
        name: "Anaphylaxie",
        cat: "sante",
        drain: 5,
        proRatingMin: 3,
        desc: "Provoque une réaction allergique potentiellement mortelle.",
      },
      {
        name: "Éphédrine",
        cat: "sante",
        drain: 4,
        proRatingMin: 2,
        desc: "Amplifie la perception et l'énergie.",
      },
      {
        name: "Jeûne",
        cat: "sante",
        drain: 4,
        proRatingMin: 2,
        desc: "Supprime la sensation de faim temporairement.",
      },
      {
        name: "Diagnostic",
        cat: "sante",
        drain: 4,
        proRatingMin: 2,
        desc: "Identifie problèmes médicaux et maladies.",
      },
      {
        name: "Nutrition",
        cat: "sante",
        drain: 3,
        proRatingMin: 2,
        desc: "Satisfait les besoins nutritionnels du corps.",
      },
      {
        name: "Oxygenation",
        cat: "sante",
        drain: 4,
        proRatingMin: 2,
        desc: "Permet de respirer sous l'eau.",
      },
      {
        name: "Préservation",
        cat: "sante",
        drain: 5,
        proRatingMin: 3,
        desc: "Ralentit la décomposition d'une cible.",
      },
      {
        name: "Veines Gelées",
        cat: "sante",
        drain: 4,
        proRatingMin: 2,
        desc: "Gèle les veines provoquant une blessure.",
      },
      {
        name: "Stérilisation",
        cat: "sante",
        drain: 4,
        proRatingMin: 2,
        desc: "Élimine bactéries et parasites.",
      },
      {
        name: "Traitement",
        cat: "sante",
        drain: 4,
        proRatingMin: 2,
        desc: "Soigne les blessures et effets physiques.",
      },
      {
        name: "Teint Radieux",
        cat: "sante",
        drain: 4,
        proRatingMin: 2,
        desc: "Améliore l'apparence physique.",
      },
      {
        name: "Décomposition",
        cat: "sante",
        drain: 5,
        proRatingMin: 3,
        desc: "Accélère la décomposition organique.",
      },
      {
        name: "Brouillage",
        cat: "illusion",
        drain: 4,
        proRatingMin: 2,
        desc: "Trouble la vision en zone avec flashes lumineux.",
      },
      {
        name: "Double Physique",
        cat: "illusion",
        drain: 3,
        proRatingMin: 2,
        desc: "Crée une illusion d'une seconde personne.",
      },
      {
        name: "Maquillage de Véhicule",
        cat: "illusion",
        drain: 4,
        proRatingMin: 2,
        desc: "Modifie l'apparence d'un véhicule.",
      },
      {
        name: "Décor Fantôme",
        cat: "illusion",
        drain: 5,
        proRatingMin: 3,
        desc: "Crée un environnement illusoire.",
      },
      {
        name: "Fausse Impression",
        cat: "illusion",
        drain: 3,
        proRatingMin: 2,
        desc: "Donne une fausse impression visuelle.",
      },
      {
        name: "Panomana",
        cat: "illusion",
        drain: 4,
        proRatingMin: 2,
        desc: "Modifie l'aura perçue d'une cible.",
      },
      {
        name: "Mauvais Pressentiment",
        cat: "illusion",
        drain: 4,
        proRatingMin: 2,
        desc: "Provoque une sensation d'inquiétude.",
      },
      {
        name: "Patate Chaude",
        cat: "illusion",
        drain: 3,
        proRatingMin: 2,
        desc: "Objecte brûlant qui oblige à le lâcher.",
      },
      {
        name: "Rêves",
        cat: "illusion",
        drain: 3,
        proRatingMin: 2,
        desc: "Fabrique un rêve illusoire.",
      },
      {
        name: "La Comédie Musicale de Loki",
        cat: "illusion",
        drain: 5,
        proRatingMin: 3,
        desc: "Crée une illusion musicale immersive.",
      },
      {
        name: "Inquiétude",
        cat: "illusion",
        drain: 3,
        proRatingMin: 2,
        desc: "Provoque une sensation d'anxiété.",
      },
      {
        name: "Charabia",
        cat: "illusion",
        drain: 3,
        proRatingMin: 2,
        desc: "Rend inintelhgible la conversation d'un sujet.",
      },
      {
        name: "Jobelin",
        cat: "illusion",
        drain: 3,
        proRatingMin: 2,
        desc: "Rend l'interlocuteur confus et distrait.",
      },
      {
        name: "Armure de Véhicule",
        cat: "manipulation",
        drain: 6,
        proRatingMin: 3,
        desc: "Renforce les vêtements en armure.",
      },
      {
        name: "Chute Féline",
        cat: "manipulation",
        drain: 3,
        proRatingMin: 2,
        desc: "Permet de tomber sans dégâts.",
      },
      {
        name: "Colle",
        cat: "manipulation",
        drain: 5,
        proRatingMin: 3,
        desc: "Adhésif qui colle deux surfaces ensemble.",
      },
      {
        name: "Couche de Glace",
        cat: "manipulation",
        drain: 5,
        proRatingMin: 3,
        desc: "Forme une couche glissante sur une surface.",
      },
      {
        name: "Doigts Télékinésiques",
        cat: "manipulation",
        drain: 4,
        proRatingMin: 2,
        desc: "Contrôle motrice fine des mains.",
      },
      {
        name: "Manipulation des Foules",
        cat: "manipulation",
        drain: 5,
        proRatingMin: 3,
        desc: "Manipule émotionnellement un groupe.",
      },
      {
        name: "Contrôle des Pensées des Foules",
        cat: "manipulation",
        drain: 5,
        proRatingMin: 3,
        desc: "Contrôle les pensées d'un groupe.",
      },
      {
        name: "Maquillage",
        cat: "manipulation",
        drain: 4,
        proRatingMin: 2,
        desc: "Change l'apparence physique d'une cible.",
      },
      {
        name: "Mode",
        cat: "manipulation",
        drain: 4,
        proRatingMin: 2,
        desc: "Améliore l'apparence vestimentaire.",
      },
      {
        name: "Indifférence",
        cat: "manipulation",
        drain: 5,
        proRatingMin: 3,
        desc: "Rend une cible invisible socialement.",
      },
      {
        name: "Réputation du Gecko",
        cat: "manipulation",
        drain: 4,
        proRatingMin: 2,
        desc: "Permet de gripper sur les surfaces verticales.",
      },
      {
        name: "Transparence",
        cat: "manipulation",
        drain: 5,
        proRatingMin: 3,
        desc: "Rend une cible invisible visuellement.",
      },
      // ----- Smooth Operations (p.107-110) -----
      {
        name: "Évanouissement",
        cat: "manipulation",
        drain: 5,
        proRatingMin: 3,
        desc: "Rend une cible incapable de se souvenir de quoi que ce soit tandis que le sort est actif. La cible se comporte normalement pendant la durée du sort, mais peut ensuite se sentir manipulée, particulièrement si la situation a changé depuis le début du sort, car elle ne se souvient pas des dernières min",
      },
      {
        name: "Charme",
        cat: "sante",
        drain: 3,
        proRatingMin: 2,
        desc: "Le charme rend la cible une langue de velours. Pendant que le charme est actif, la cible gagne +4 à tous les tests de compétence Con et Influence, et les succès nets du test de lancement de sort s'ajoutent à la Cote Sociale de la cible tant que le sort est maintenu.",
      },
      {
        name: "Pensées Claires",
        cat: "sante",
        drain: 3,
        proRatingMin: 2,
        desc: "Ce sort efface le statut Désorienté de la cible. Lors du lancement de ce sort, effectuez un test Sorcellerie + Magie avec un seuil de (5 – Essence).",
      },
      {
        name: "Excitation",
        cat: "illusion",
        drain: 5,
        proRatingMin: 3,
        desc: "Le sort fait émettre à l'aura d'une cible une vibration qui excite les gens, un peu comme des phéromones, ciblant spécifiquement la région septale du système limbique. La cible gagne un Edge temporaire chaque fois qu'elle utilise les compétences Con ou Influence pour séduire quelqu'un. Si les succès",
      },
      {
        name: "Antipathie",
        cat: "sante",
        drain: 4,
        proRatingMin: 2,
        desc: "Les cibles de ce sort sont magiquement infusées avec une forte opposition aux interactions sociales. Pendant l'effet d'Antipathie, une cible est immunisée aux statuts Arnaqué, Captivé et Désorienté, et gagne un Edge temporaire chaque fois qu'elle résiste à un test social. Cependant, l'antipathie sig",
      },
      {
        name: "Douche Froide",
        cat: "sante",
        drain: 3,
        proRatingMin: 2,
        desc: "Ce sort efface le statut Captivé de la cible. Lors du lancement de ce sort, effectuez un test Sorcellerie + Magie avec un seuil de (5 – Essence).",
      },
      {
        name: "Forcer la Vérité",
        cat: "manipulation",
        drain: 4,
        proRatingMin: 2,
        desc: "Forcer la Vérité oblige une cible à parler uniquement la vérité telle qu'elle la connaît. La cible peut dire n'importe quoi qu'elle croit être vrai, même si ce n'est pas le cas. Le sujet n'est pas forcé de parler et peut retenir des informations, mais ne peut pas mentir directement. Les succès nets ",
      },
      {
        name: "Désir",
        cat: "illusion",
        drain: 4,
        proRatingMin: 2,
        desc: "Les cibles de ce sort sont bombardées par des sentiments accablants de désir. La cible gagne le statut Captivé si elle échoue à résister.",
      },
      {
        name: "Mauvais Œil",
        cat: "illusion",
        drain: 4,
        proRatingMin: 2,
        desc: "Ce sort projette des sentiments de danger imminent, de peur et de malaise sur une cible émanant du lanceur. Les cibles se sentent simultanément froides et nerveuses, la panique commençant à s'installer. Les cibles qui échouent à résister au sort gagnent le statut Effrayé. Si les succès nets dépassen",
      },
      {
        name: "Spectacle Ambulant",
        cat: "illusion",
        drain: 6,
        proRatingMin: 3,
        desc: "Ces sorts exploitent le subconscient d'une cible, causant une diversion mentale. La cible voit quelque chose qui attire son attention loin du lanceur. L'illusion sera différente pour chaque observateur dans un groupe. La cible gagne le statut Désorienté (#), le nombre égalant les succès nets du test",
      },
      {
        name: "Fortitude Mentale",
        cat: "sante",
        drain: 3,
        proRatingMin: 2,
        desc: "Les cibles de ce sort peuvent rejeter les influences surnaturelles. Elles peuvent ajouter +1 par succès net à n'importe quel test pour résister au contrôle mental magique ou à la manipulation émotionnelle. Elles peuvent également effectuer un test Contrôle (2) pour se débarrasser de n'importe quel s",
      },
      {
        name: "Pression",
        cat: "manipulation",
        drain: 5,
        proRatingMin: 3,
        desc: "Similaire à Contrôle des Pensées mais plus subtil et moins contrôlant, ce sort place le lanceur de sort dans la tête de la cible, la rendant très susceptible aux suggestions du lanceur. Les succès nets déterminent la durée maximale du sort en minutes. Contrairement à Contrôle des Pensées, la cible e",
      },
      {
        name: "Trois Pistes",
        cat: "illusion",
        drain: 4,
        proRatingMin: 2,
        desc: "Ces sorts exploitent le subconscient d'une cible causant une diversion mentale. La cible voit quelque chose qui attirera son attention loin du lanceur. L'illusion sera différente pour chaque observateur dans un groupe. Quand utilisé sur un groupe de gardes de sécurité, un garde voit une écolière en ",
      },
      {
        name: "Reconnaissance de Pensées",
        cat: "detection",
        drain: 4,
        proRatingMin: 2,
        desc: "Cette forme moins intrusive de Sonde Mentale permet au sujet de scanner les pensées de surface d'une cible pour un sujet particulier (mot, phrase, son ou image choisi lors du lancement du sort). Le sort vérifie simplement si une cible pense activement à un sujet particulier. Le sort est souvent util",
      },
      {
        name: "Reconnaissance de Pensées de Zone",
        cat: "detection",
        drain: 6,
        proRatingMin: 3,
        desc: "Variante de zone de Reconnaissance de Pensées qui scanne simultanément les pensées de surface de tous les êtres sensibles dans la zone pour un sujet particulier.",
      },
      {
        name: "Ailier",
        cat: "detection",
        drain: 3,
        proRatingMin: 2,
        desc: "Forme spécialisée de Lien Mental, permettant au lanceur et au sujet de se lire mutuellement les intentions et les émotions sans montrer de communication évidente. Lors d'un test de Travail d'Équipe lié à un test social, l'aide gagne un Edge temporaire pour chaque dé supplémentaire qu'elle fournit au",
      },
    ],

    // ----- SR5 (livre de base, chapitre Sorcellerie p.283-301 + Grimoire des ombres) -----
    // Drain RAW SR5 = formule "Puissance - X" (jamais un nombre fixe) ;
    // le champ `drain` stocke donc cette formule en texte (ex. "P-3"),
    // "P" seul = X=0 (Drain égal à la Puissance).
    sr5: [
      {
        name: "Boule étourdissante",
        cat: "combat",
        drain: "P",
        proRatingMin: 1,
        desc: "Sort de « sommeil » en zone : canalise un pouvoir destructeur dans une aire, dommages étourdissants pour assommer sans tuer. Direct, Type M, Drain P.",
      },
      {
        name: "Boule mana",
        cat: "combat",
        drain: "P",
        proRatingMin: 2,
        desc: "Canalise une puissance destructrice dans les cibles d'une zone, dommages physiques par mort cellulaire. N'affecte que le vivant. Direct, Type M, Drain P.",
      },
      {
        name: "Éclair mana",
        cat: "combat",
        drain: "P-3",
        proRatingMin: 1,
        desc: "Trait de mana destructeur sur une cible : dommages physiques par mort cellulaire. S'agissant d'un sort mana, n'affecte que le vivant. Direct, Type M.",
      },
      {
        name: "Boule de feu",
        cat: "combat",
        drain: "P-1",
        proRatingMin: 3,
        desc: "Projette une boule de flammes dans une zone : dommages élémentaires de Feu pouvant tout enflammer. Indirect, élémentaire, Type P, CDV (Z).",
      },
      {
        name: "Lance-flammes",
        cat: "combat",
        drain: "P-3",
        proRatingMin: 2,
        desc: "Jaillissement de feu sur une cible unique : dommages élémentaires de Feu avec risque d'embrasement. Indirect, élémentaire, Type P, CDV.",
      },
      {
        name: "Foudre",
        cat: "combat",
        drain: "P-3",
        proRatingMin: 2,
        desc: "Décharge électrique sur une cible : dommages élémentaires d'Électricité, peut faire chuter et perturber l'électronique. Indirect, élémentaire, Type P.",
      },
      {
        name: "Flot acide",
        cat: "combat",
        drain: "P-3",
        proRatingMin: 2,
        desc: "Projette de l'acide corrosif : dommages physiques et corrosion de l'armure et de l'équipement. Indirect, élémentaire, Type P, CDV.",
      },
      {
        name: "Frappe",
        cat: "combat",
        drain: "P-6",
        proRatingMin: 0,
        desc: "Coup d'air comprimé au contact : dommages étourdissants par pure force concussive. Indirect, Type P, Drain P-6.",
      },
      {
        name: "Soins",
        cat: "sante",
        drain: "P-4",
        proRatingMin: 1,
        desc: "Soigne les blessures physiques : récupère des cases de dommages selon les succès. Sans effet sur l'étourdissant. Santé, Type M, Permanente.",
      },
      {
        name: "Augmentation de réflexes",
        cat: "sante",
        drain: "P",
        proRatingMin: 2,
        desc: "Augmente l'Initiative (un dé d'Initiative par paire de succès). Un seul sort de ce type à la fois. Santé, Type M, Maintenue, Drain P.",
      },
      {
        name: "Stabilisation",
        cat: "sante",
        drain: "P-4",
        proRatingMin: 1,
        desc: "Maintient les fonctions vitales et empêche de mourir : la Puissance doit égaler le surplus encaissé. Santé, Maintenue puis Permanente.",
      },
      {
        name: "Guérison de maladies",
        cat: "sante",
        drain: "P-4",
        proRatingMin: 2,
        desc: "Neutralise une maladie active chez la cible, succès par succès. Ne soigne pas les dommages déjà causés. Santé, Type M.",
      },
      {
        name: "Détection de la vie",
        cat: "detection",
        drain: "P-3",
        proRatingMin: 1,
        desc: "Révèle la présence des êtres vivants conscients à portée sensorielle, même cachés. Actif, directionnel, Type M, Maintenue.",
      },
      {
        name: "Clairvoyance",
        cat: "detection",
        drain: "P-3",
        proRatingMin: 1,
        desc: "Le sujet voit des scènes distantes comme s'il y était, depuis un point déplaçable à portée. Passif, directionnel, Type M.",
      },
      {
        name: "Sonde mentale",
        cat: "detection",
        drain: "P-1",
        proRatingMin: 3,
        desc: "Sonde l'esprit d'une cible pour en extraire pensées et souvenirs, couche par couche selon les succès. Type M.",
      },
      {
        name: "Analyse de véracité",
        cat: "detection",
        drain: "P-2",
        proRatingMin: 1,
        desc: "Permet de savoir si la cible ment consciemment. Le sujet doit entendre directement les déclarations. Passif, psychique, Type M.",
      },
      {
        name: "Agonie",
        cat: "illusion",
        drain: "P-4",
        proRatingMin: 2,
        desc: "Favori des magiciens en difficulté : inflige l'illusion d'une terrible douleur, chaque succès ajoutant un malus paralysant. Réaliste, unisensorielle, Type M.",
      },
      {
        name: "Invisibilité",
        cat: "illusion",
        drain: "P-2",
        proRatingMin: 2,
        desc: "Rend le sujet invisible aux yeux des observateurs vivants : la perception devient un test opposé. Réaliste, unisensorielle, Type M, CDV.",
      },
      {
        name: "Fantasme tridéo",
        cat: "illusion",
        drain: "P",
        proRatingMin: 2,
        desc: "Crée une illusion plurisensorielle convaincante d'un objet, d'une créature ou d'une scène, dans une zone. Réaliste, Type P, CDV (Z), Drain P.",
      },
      {
        name: "Silence physique",
        cat: "illusion",
        drain: "P-1",
        proRatingMin: 2,
        desc: "Crée une zone qui amortit les sons, réduisant aussi les attaques soniques. Indispensable à une infiltration discrète. Réaliste, Type P, CDV (Z).",
      },
      {
        name: "Armure",
        cat: "manipulation",
        drain: "P-2",
        proRatingMin: 2,
        desc: "Crée un champ d'énergie magique étincelante autour du sujet, le protégeant contre les dommages physiques. Physique, Type P, Maintenue.",
      },
      {
        name: "Lévitation",
        cat: "manipulation",
        drain: "P-2",
        proRatingMin: 3,
        desc: "Soulève et déplace une cible ou un objet dans les airs ; la victime peut résister par un test opposé. Physique, Type P, Maintenue.",
      },
      {
        name: "Contrôle des pensées",
        cat: "manipulation",
        drain: "P-1",
        proRatingMin: 4,
        desc: "Soumet l'esprit de la cible à la volonté du magicien : elle résiste chaque tour par Logique + Volonté. Mental, Type M, Maintenue.",
      },
      {
        name: "Projectile",
        cat: "manipulation",
        drain: "P-2",
        proRatingMin: 3,
        desc: "Manipule l'environnement pour projeter de la matière comme une arme contondante télékinétique. Physique, Type P.",
      },
      // ----- Livre de Règles (Grimoire, p.285-297) -----
      {
        name: "Coup étourdissant",
        cat: "combat",
        drain: "P-6",
        proRatingMin: 1,
        desc: "Type Mana, Portée Contact, Durée Instantané. Sort de contact qui canalise un pouvoir magique destructeur directement dans la cible, causant des dommages étourdissants. Peut rendre inconscient.",
      },
      {
        name: "Éclair étourdissant",
        cat: "combat",
        drain: "P-3",
        proRatingMin: 3,
        desc: "Type Mana, Portée Ligne de vue, Durée Instantané. Sort de portée qui inflige des dommages étourdissants à distance. Peut rendre inconscient.",
      },
      {
        name: "Vague toxique",
        cat: "combat",
        drain: "P-1",
        proRatingMin: 4,
        desc: "Type Physique, Portée Ligne de vue/Zone, Durée Instantané. Sort de zone qui crée une substance corrosive puissante, causant des brûlures acides dans la zone.",
      },
      {
        name: "Boule de foudre",
        cat: "combat",
        drain: "P-1",
        proRatingMin: 4,
        desc: "Type Physique, Portée Ligne de vue/Zone, Durée Instantané. Sort de zone qui crée une explosion d'électricité, causant des dommages électriques.",
      },
      {
        name: "Fracassement",
        cat: "combat",
        drain: "P-6",
        proRatingMin: 1,
        desc: "Type Physique, Portée Contact, Durée Instantané. Sort de contact qui canalise un pouvoir magique destructeur, causant des dommages physiques.",
      },
      {
        name: "Éclair de force",
        cat: "combat",
        drain: "P-3",
        proRatingMin: 3,
        desc: "Type Physique, Portée Ligne de vue, Durée Instantané. Sort direct qui inflige des dommages physiques à distance. La cible cuit de l'intérieur.",
      },
      {
        name: "Boule de force",
        cat: "combat",
        drain: "P",
        proRatingMin: 2,
        desc: "Type Physique, Portée Ligne de vue/Zone, Durée Instantané. Sort de zone qui canalise un pouvoir magique destructeur, causant des dommages physiques dans la zone.",
      },
      {
        name: "Frappe à distance",
        cat: "combat",
        drain: "P-3",
        proRatingMin: 3,
        desc: "Type Physique, Portée Ligne de vue, Durée Instantané. Sort indirect qui frappe la cible d'une force psychokinésique invisible, causant des dommages étourdissants.",
      },
      {
        name: "Explosion",
        cat: "combat",
        drain: "P",
        proRatingMin: 2,
        desc: "Type Physique, Portée Ligne de vue/Zone, Durée Instantané. Sort de zone indirect qui frappe les cibles d'une force psychokinésique invisible, causant des dommages étourdissants.",
      },
      {
        name: "Toucher mortel",
        cat: "combat",
        drain: "P-6",
        proRatingMin: 1,
        desc: "Type Mana, Portée Contact, Durée Instantané. Sort de contact mana qui canalise un pouvoir magique destructeur, causant des dommages physiques.",
      },
      {
        name: "Analyse d'objet",
        cat: "detection",
        drain: "P-3",
        proRatingMin: 3,
        desc: "Type Physique, Portée Contact, Durée Maintenu. Sort directionnel actif qui permet d'analyser le but et le fonctionnement d'un appareil à portée du sens.",
      },
      {
        name: "Analyse de la magie",
        cat: "detection",
        drain: "P-3",
        proRatingMin: 3,
        desc: "Type Physique, Portée Contact, Durée Maintenu. Sort directionnel actif qui permet d'analyser le but d'un objet magique comme un focus ou une rune.",
      },
      {
        name: "Clairaudience",
        cat: "detection",
        drain: "P-3",
        proRatingMin: 3,
        desc: "Type Mana, Portée Contact, Durée Maintenu. Sort directionnel passif qui permet d'entendre des sons distants comme si présent physiquement sur place.",
      },
      {
        name: "Détection d'un individu",
        cat: "detection",
        drain: "P-3",
        proRatingMin: 3,
        desc: "Type Mana, Portée Contact, Durée Maintenu. Sort à aire d'effet actif qui détecte la présence d'un individu particulier à portée du sens.",
      },
      {
        name: "Détection de [forme de vie]",
        cat: "detection",
        drain: "P-2",
        proRatingMin: 4,
        desc: "Type Mana, Portée Contact, Durée Maintenu. Sort à aire d'effet actif qui détecte tous les représentants d'une forme de vie spécifique.",
      },
      {
        name: "Détection de [forme de vie], étendue",
        cat: "detection",
        drain: "P",
        proRatingMin: 2,
        desc: "Type Mana, Portée Contact, Durée Maintenu. Sort à aire d'effet étendue actif qui détecte tous les représentants d'une forme de vie spécifique dans un rayon étendu.",
      },
      {
        name: "Détection de [objet]",
        cat: "detection",
        drain: "P-2",
        proRatingMin: 4,
        desc: "Type Mana, Portée Contact, Durée Maintenu. Sort à aire d'effet actif qui détecte tous les objets d'un type spécifique à portée du sens.",
      },
      {
        name: "Détection de la magie",
        cat: "detection",
        drain: "P-2",
        proRatingMin: 4,
        desc: "Type Mana, Portée Contact, Durée Maintenu. Sort à aire d'effet actif qui détecte focus, sorts, runes, loges magiques, rituels actifs et esprits.",
      },
      {
        name: "Détection de la magie, étendue",
        cat: "detection",
        drain: "P",
        proRatingMin: 2,
        desc: "Type Mana, Portée Contact, Durée Maintenu. Sort à aire d'effet étendue actif qui détecte focus, sorts, runes, loges magiques, rituels actifs et esprits dans un rayon étendu.",
      },
      {
        name: "Détection de la vie, étendue",
        cat: "detection",
        drain: "P-1",
        proRatingMin: 4,
        desc: "Type Mana, Portée Contact, Durée Maintenu. Sort à aire d'effet étendue actif qui détecte les êtres vivants dans un rayon étendu.",
      },
      {
        name: "Détection des ennemis",
        cat: "detection",
        drain: "P-2",
        proRatingMin: 4,
        desc: "Type Mana, Portée Contact, Durée Maintenu. Sort à aire d'effet actif qui détecte les cibles vivantes à portée ayant des intentions hostiles envers le sujet.",
      },
      {
        name: "Détection des ennemis, étendue",
        cat: "detection",
        drain: "P",
        proRatingMin: 2,
        desc: "Type Mana, Portée Contact, Durée Maintenu. Sort à aire d'effet étendue actif qui détecte les cibles vivantes hostiles dans un rayon étendu.",
      },
      {
        name: "Lien mental",
        cat: "detection",
        drain: "P-1",
        proRatingMin: 4,
        desc: "Type Mana, Portée Contact, Durée Maintenu. Sort psychique actif qui permet au magicien et à un sujet volontaire de communiquer mentalement.",
      },
      {
        name: "Sens du combat",
        cat: "detection",
        drain: "P",
        proRatingMin: 2,
        desc: "Type Mana, Portée Contact, Durée Maintenu. Sort psychique passif qui permet d'analyser les combats et situations dangereuses, octroyant des bonus à la Réaction et la défense.",
      },
      {
        name: "Antidote",
        cat: "sante",
        drain: "P-3",
        proRatingMin: 3,
        desc: "Type Mana, Portée Contact, Durée Permanent. Sort qui aide un sujet empoisonné à contrer les effets d'une toxine. Ajoute ses succès au test de résistance.",
      },
      {
        name: "Augmentation d'[attribut]",
        cat: "sante",
        drain: "P-3",
        proRatingMin: 3,
        desc: "Type Physique, Portée Contact, Durée Maintenu. Sort qui augmente un attribut donné. Chaque attribut nécessite d'apprendre une version de ce sort.",
      },
      {
        name: "Désintoxication",
        cat: "sante",
        drain: "P-6",
        proRatingMin: 1,
        desc: "Type Mana, Portée Contact, Durée Permanent. Sort qui atténue les effets secondaires d'une drogue ou d'un poison. Un succès élimine tous les symptômes.",
      },
      {
        name: "Diminution d'[attribut]",
        cat: "sante",
        drain: "P-2",
        proRatingMin: 4,
        desc: "Type Physique, Portée Contact, Durée Maintenu. Sort qui affaiblit une cible en diminuant un attribut donné par un test opposé.",
      },
      {
        name: "Oxygénation",
        cat: "sante",
        drain: "P-5",
        proRatingMin: 1,
        desc: "Type Physique, Portée Contact, Durée Maintenu. Sort qui oxygène le sang d'un sujet, fournissant des dés de Constitution supplémentaires.",
      },
      {
        name: "Prophylaxie",
        cat: "sante",
        drain: "P-4",
        proRatingMin: 3,
        desc: "Type Mana, Portée Contact, Durée Permanent. Sort qui fournit des dés supplémentaires pour résister aux infections, drogues et toxines.",
      },
      {
        name: "Résistance à la douleur",
        cat: "sante",
        drain: "P-4",
        proRatingMin: 3,
        desc: "Type Mana, Portée Contact, Durée Permanent. Sort qui permet au sujet d'ignorer la douleur causée par des blessures en réduisant les pénalités de dommages.",
      },
      {
        name: "Agonie de masse",
        cat: "illusion",
        drain: "P-2",
        proRatingMin: 4,
        desc: "Type Mana, Portée Ligne de vue/Zone, Durée Maintenu. Sort de zone réaliste unisensoriel qui inflige l'illusion de douleur terrible à plusieurs cibles.",
      },
      {
        name: "Fantasme",
        cat: "illusion",
        drain: "P-1",
        proRatingMin: 4,
        desc: "Type Mana, Portée Ligne de vue/Zone, Durée Maintenu. Sort de zone réaliste plurisensoriel qui crée des illusions convaincantes d'objets, créatures ou scènes.",
      },
      {
        name: "Confusion",
        cat: "illusion",
        drain: "P-3",
        proRatingMin: 3,
        desc: "Type Mana, Portée Ligne de vue, Durée Maintenu. Sort réaliste plurisensoriel qui produit un tourbillon de sensations contradictoires pour perturber les sens.",
      },
      {
        name: "Confusion de masse",
        cat: "illusion",
        drain: "P-1",
        proRatingMin: 4,
        desc: "Type Mana, Portée Ligne de vue/Zone, Durée Maintenu. Sort de zone réaliste plurisensoriel qui perturbe les sens de plusieurs cibles.",
      },
      {
        name: "Chaos",
        cat: "illusion",
        drain: "P-2",
        proRatingMin: 4,
        desc: "Type Physique, Portée Ligne de vue, Durée Maintenu. Sort réaliste plurisensoriel physique qui produit un tourbillon de sensations contradictoires.",
      },
      {
        name: "Monde chaotique",
        cat: "illusion",
        drain: "P",
        proRatingMin: 2,
        desc: "Type Physique, Portée Ligne de vue/Zone, Durée Maintenu. Sort de zone réaliste plurisensoriel physique qui produit un tourbillon de sensations contradictoires.",
      },
      {
        name: "Furtivité",
        cat: "illusion",
        drain: "P-2",
        proRatingMin: 4,
        desc: "Type Physique, Portée Ligne de vue, Durée Maintenu. Sort réaliste unisensoriel qui rend le sujet moins audible, faisant peu ou pas de bruit.",
      },
      {
        name: "Insectes",
        cat: "illusion",
        drain: "P-3",
        proRatingMin: 3,
        desc: "Type Mana, Portée Ligne de vue, Durée Maintenu. Sort réaliste plurisensoriel qui fait croire à la cible que des insectes rampent sur son corps.",
      },
      {
        name: "Nuée d'insectes",
        cat: "illusion",
        drain: "P-1",
        proRatingMin: 4,
        desc: "Type Mana, Portée Ligne de vue/Zone, Durée Maintenu. Sort de zone réaliste plurisensoriel qui fait croire aux cibles que des insectes les envahissent.",
      },
      {
        name: "Invisibilité physique",
        cat: "illusion",
        drain: "P-1",
        proRatingMin: 4,
        desc: "Type Physique, Portée Ligne de vue, Durée Maintenu. Sort réaliste unisensoriel physique qui rend plus difficile la détection du sujet par les sens visuels.",
      },
      {
        name: "Masque",
        cat: "illusion",
        drain: "P-2",
        proRatingMin: 4,
        desc: "Type Mana, Portée Contact, Durée Maintenu. Sort réaliste plurisensoriel qui modifie l'apparence physique, voix et odeur du sujet touché.",
      },
      {
        name: "Masque physique",
        cat: "illusion",
        drain: "P-1",
        proRatingMin: 4,
        desc: "Type Physique, Portée Contact, Durée Maintenu. Sort réaliste plurisensoriel physique qui modifie l'apparence et les caractéristiques du sujet touché.",
      },
      {
        name: "Silence",
        cat: "illusion",
        drain: "P-2",
        proRatingMin: 4,
        desc: "Type Mana, Portée Ligne de vue/Zone, Durée Maintenu. Sort de zone réaliste unisensoriel mana qui crée une zone amortissant les sons.",
      },
      {
        name: "Spectacle",
        cat: "illusion",
        drain: "P-3",
        proRatingMin: 3,
        desc: "Type Mana, Portée Ligne de vue/Zone, Durée Maintenu. Sort de zone évidente plurisensoriel qui crée des illusions divertissantes pour l'amusement.",
      },
      {
        name: "Spectacle tridéo",
        cat: "illusion",
        drain: "P-2",
        proRatingMin: 4,
        desc: "Type Physique, Portée Ligne de vue/Zone, Durée Maintenu. Sort de zone évidente plurisensoriel physique qui crée des illusions divertissantes visible par technologie.",
      },
      {
        name: "Animation",
        cat: "manipulation",
        drain: "P-1",
        proRatingMin: 4,
        desc: "Type Physique, Portée Ligne de vue, Durée Maintenu. Sort physique qui donne « vie » aux objets inanimés, leur permettant de se déplacer selon leur structure.",
      },
      {
        name: "Animation de masse",
        cat: "manipulation",
        drain: "P+1",
        proRatingMin: 1,
        desc: "Type Physique, Portée Ligne de vue/Zone, Durée Maintenu. Sort de zone physique qui anime tous les objets inanimés dans la zone, les rendant mobiles.",
      },
      {
        name: "Barrière mana",
        cat: "manipulation",
        drain: "P-2",
        proRatingMin: 4,
        desc: "Type Mana, Portée Ligne de vue/Zone, Durée Maintenu. Sort de zone environnemental qui crée une barrière invisible d'énergie magique affectant esprits et sorts.",
      },
      {
        name: "Barrière physique",
        cat: "manipulation",
        drain: "P-1",
        proRatingMin: 4,
        desc: "Type Physique, Portée Ligne de vue/Zone, Durée Maintenu. Sort de zone environnemental qui crée un champ de force translucide doté d'Armure et de Structure.",
      },
      // ----- Grimoire des ombres (p.102-120) -----
      {
        name: "Brise-bouclier",
        cat: "combat",
        drain: "P-3",
        proRatingMin: 3,
        desc: "Direct. Portée C. Dommages P. Variante du Toucher mortel visant les barrières mana.",
      },
      {
        name: "Corrosion de [objet]",
        cat: "combat",
        drain: "P-5",
        proRatingMin: 1,
        desc: "Indirect, élémentaire. Portée C. Dommages P. Crée une corrosion qui ronge les métaux.",
      },
      {
        name: "Fusion de [objet]",
        cat: "combat",
        drain: "P-3",
        proRatingMin: 3,
        desc: "Indirect, élémentaire. Portée CDV. Dommages P. Fusionne les structures d'objets.",
      },
      {
        name: "Bouillie de [objet]",
        cat: "combat",
        drain: "P-1",
        proRatingMin: 4,
        desc: "Indirect, élémentaire. Portée CDV(Z). Dommages P. Réduit un objet en pâte.",
      },
      {
        name: "Défonçage [objet]",
        cat: "combat",
        drain: "P-5",
        proRatingMin: 1,
        desc: "Direct. Portée C. Dommages P. Enfonce barrières et structures.",
      },
      {
        name: "Démantèlement [objet]",
        cat: "combat",
        drain: "P-3",
        proRatingMin: 3,
        desc: "Direct. Portée CDV. Dommages P. Sépare les composants d'un objet.",
      },
      {
        name: "Démolition [objet]",
        cat: "combat",
        drain: "P-1",
        proRatingMin: 4,
        desc: "Direct. Portée CDV(Z). Dommages P. Destructeur de structures variées.",
      },
      {
        name: "Destruction de [esprit libre]",
        cat: "combat",
        drain: "P-3",
        proRatingMin: 3,
        desc: "Direct. Portée CDV. Dommages P. Spécialisé contre esprits libres.",
      },
      {
        name: "Dissipation de [focus]",
        cat: "combat",
        drain: "special",
        proRatingMin: 2,
        desc: "M. Portée CDV. Drain spécial. Dispersion de focus actif par magie.",
      },
      {
        name: "Eau de feu",
        cat: "combat",
        drain: "P-2",
        proRatingMin: 4,
        desc: "Indirect, élémentaire. Portée CDV. Dommages P. Combine eau et feu.",
      },
      {
        name: "Napalm",
        cat: "combat",
        drain: "P",
        proRatingMin: 2,
        desc: "Indirect, élémentaire. Portée CDV(Z). Dommages P. Tache inflammable.",
      },
      {
        name: "Insecticide anti",
        cat: "combat",
        drain: "P+1",
        proRatingMin: 1,
        desc: "Esprit insecte direct. Portée CDV(Z). Dommages P. Ciblé contre esprits insectes.",
      },
      {
        name: "Lance de glace",
        cat: "combat",
        drain: "P-3",
        proRatingMin: 3,
        desc: "Indirect, élémentaire. Portée CDV. Dommages P. Projectile glacé.",
      },
      {
        name: "Tempête de glace",
        cat: "combat",
        drain: "P+1",
        proRatingMin: 1,
        desc: "Indirect, élémentaire. Portée CDV(Z). Dommages P. Zone de dégâts glacés.",
      },
      {
        name: "Explosion radioactive",
        cat: "combat",
        drain: "P-1",
        proRatingMin: 4,
        desc: "Indirect, élémentaire, zone. Portée CDV(Z). Dommages P. Rayonnement intense.",
      },
      {
        name: "Suppression [méthatype/espèce]",
        cat: "combat",
        drain: "P-6",
        proRatingMin: 1,
        desc: "Direct. Portée C. Dommages P. Ciblé par race/type.",
      },
      {
        name: "Tuerie [méthatype/espèce]",
        cat: "combat",
        drain: "P-4",
        proRatingMin: 3,
        desc: "Direct. Portée CDV. Dommages P. Variante de Tuerie par espèce.",
      },
      {
        name: "Carnage [méthatype/espèce]",
        cat: "combat",
        drain: "P-2",
        proRatingMin: 4,
        desc: "Direct. Portée CDV(Z). Dommages P. Zone contre type spécifique.",
      },
      {
        name: "Rayon radioactif",
        cat: "combat",
        drain: "P-3",
        proRatingMin: 3,
        desc: "Indirect, élémentaire. Portée CDV. Dommages P. Radiations ciblées.",
      },
      {
        name: "Catalogue",
        cat: "detection",
        drain: "P-3",
        proRatingMin: 3,
        desc: "Actif, aire d'effet. Portée M. Durée M. Compilation mystique d'objets en zone.",
      },
      {
        name: "Clairvoyance astrale",
        cat: "detection",
        drain: "P-3",
        proRatingMin: 3,
        desc: "Passif, directionnel. Portée C. Durée M. Vision astrale avancée à distance.",
      },
      {
        name: "Diagnostic",
        cat: "detection",
        drain: "P-5",
        proRatingMin: 1,
        desc: "Actif, directionnel. Portée C. Durée M. État de santé complet de la cible.",
      },
      {
        name: "Emprunt de sens",
        cat: "detection",
        drain: "P-3",
        proRatingMin: 3,
        desc: "Actif, directionnel. Portée C. Durée M. Perception par sens empruntés.",
      },
      {
        name: "Sens animal",
        cat: "detection",
        drain: "P-5",
        proRatingMin: 1,
        desc: "Actif, directionnel. Portée C. Durée M. Perception animalière de la cible.",
      },
      {
        name: "Ceil de la meute",
        cat: "detection",
        drain: "P-1",
        proRatingMin: 4,
        desc: "Actif, directionnel. Portée C. Durée M. Lien sensoriel avec meute.",
      },
      {
        name: "Fenêtre mana",
        cat: "detection",
        drain: "P-3",
        proRatingMin: 3,
        desc: "Actif, directionnel. Portée C. Durée M. Observation barrière mana.",
      },
      {
        name: "Fenêtre astrale",
        cat: "detection",
        drain: "P-3",
        proRatingMin: 3,
        desc: "Actif, directionnel. Portée C. Durée M. Vision et observation astrales.",
      },
      {
        name: "Message astral",
        cat: "detection",
        drain: "P-3",
        proRatingMin: 3,
        desc: "Passif, directionnel. Portée C. Durée M. Communication projetée astrale.",
      },
      {
        name: "Perception spatiale",
        cat: "detection",
        drain: "P-3",
        proRatingMin: 3,
        desc: "Passif, aire d'effet. Portée C(Z). Durée M. Conscience environnement géographique.",
      },
      {
        name: "Perception spatiale, étendue",
        cat: "detection",
        drain: "P-1",
        proRatingMin: 4,
        desc: "Passif, aire d'effet étendue. Portée C(Z). Durée M. Extension perception spatiale.",
      },
      {
        name: "Reconnaissance de pensée",
        cat: "detection",
        drain: "P",
        proRatingMin: 2,
        desc: "Active, psychique, directionnel. Portée C. Durée M. Sonde mentale superficielle.",
      },
      {
        name: "Reconnaissance de pensée de zone",
        cat: "detection",
        drain: "P+2",
        proRatingMin: 1,
        desc: "Active, psychique, aire d'effet. Portée C. Durée M. Groupe mental simultané.",
      },
      {
        name: "Réseau télépathique",
        cat: "detection",
        drain: "P",
        proRatingMin: 2,
        desc: "Actif, psychique, aire d'effet. Portée C(A). Durée M. Lien télépathique collectif.",
      },
      {
        name: "Réseau télépathique, étendu",
        cat: "detection",
        drain: "P+1",
        proRatingMin: 1,
        desc: "Actif, psychique, aire d'effet étendu. Portée C(A). Durée M. Réseau amplifié.",
      },
      {
        name: "[Sens] cryptesthésique",
        cat: "detection",
        drain: "P-3",
        proRatingMin: 3,
        desc: "Passif, directionnel. Portée C. Durée M. Perception paranormale spécialisée.",
      },
      {
        name: "Signature astrale draconique",
        cat: "detection",
        drain: "P+5",
        proRatingMin: 1,
        desc: "Actif, psychique, aire d'effet. Portée CDV(Z). Durée M. Détection signature dragon.",
      },
      {
        name: "Traduction",
        cat: "detection",
        drain: "P-4",
        proRatingMin: 3,
        desc: "Active, psychique, directionnel. Portée C. Durée M. Traduction télépathique linguistique.",
      },
      {
        name: "Visée améliorée",
        cat: "detection",
        drain: "P-1",
        proRatingMin: 4,
        desc: "Passif, directionnel. Portée C. Durée M. Capacité de distance de tir améliorée.",
      },
      {
        name: "Vision nocturne",
        cat: "detection",
        drain: "P-3",
        proRatingMin: 3,
        desc: "Passif, directionnel. Portée C. Durée M. Vision en milieu sombre.",
      },
      {
        name: "Ambidextrie",
        cat: "sante",
        drain: "P-3",
        proRatingMin: 3,
        desc: "Essence. Portée C. Durée M. Maîtrise égale des deux mains.",
      },
      {
        name: "Augmentation de limite naturelle",
        cat: "sante",
        drain: "P-1",
        proRatingMin: 4,
        desc: "Essence. Portée C. Durée M. Rehausse physique temporaire.",
      },
      {
        name: "Diminution de limite naturelle",
        cat: "sante",
        drain: "P-1",
        proRatingMin: 4,
        desc: "Essence. Portée C. Durée M. Réduction capacité physique.",
      },
      {
        name: "Coup de fouet",
        cat: "sante",
        drain: "P-3",
        proRatingMin: 3,
        desc: "Essence. Portée C. Durée M. Suppression temporaire fatigue.",
      },
      {
        name: "Diminution des réflexes",
        cat: "sante",
        drain: "P-2",
        proRatingMin: 4,
        desc: "Essence. Portée C. Durée M. Réduction initiative et réaction.",
      },
      {
        name: "Facilitateur",
        cat: "sante",
        drain: "P-3",
        proRatingMin: 3,
        desc: "Essence. Portée M. Durée M. Accroît réceptivité aux drogues/toxines.",
      },
      {
        name: "Jeûne",
        cat: "sante",
        drain: "P-3",
        proRatingMin: 3,
        desc: "Essence. Portée M. Durée M. Suppression temporaire faim/soif.",
      },
      {
        name: "Soulagement de l'addiction",
        cat: "sante",
        drain: "P-6",
        proRatingMin: 1,
        desc: "Essence. Portée M. Durée M. Réduction dépendance physique/mentale.",
      },
      {
        name: "Soulagement de l'allergie",
        cat: "sante",
        drain: "P-6",
        proRatingMin: 1,
        desc: "Essence. Portée M. Durée M. Blocage temporaire allergie.",
      },
      {
        name: "Réveil",
        cat: "sante",
        drain: "P-3",
        proRatingMin: 3,
        desc: "Essence. Portée M. Durée M. Réveil conscient instantané.",
      },
      {
        name: "Barrière acoustique",
        cat: "illusion",
        drain: "P-3",
        proRatingMin: 3,
        desc: "Réaliste, unisensorielle, zone. Portée CDV(Z). Durée M. Silence autour de l'aire.",
      },
      {
        name: "Brouillage",
        cat: "illusion",
        drain: "P-3",
        proRatingMin: 3,
        desc: "Réaliste, plurisensorielle. Portée CDV. Durée M. Perturbation perceptive multiple.",
      },
      {
        name: "Brouillage de zone",
        cat: "illusion",
        drain: "P",
        proRatingMin: 2,
        desc: "Réaliste, plurisensorielle, zone. Portée CDV(Z). Durée M. Chaos sensoriel régional.",
      },
      {
        name: "Camouflage",
        cat: "illusion",
        drain: "P-2",
        proRatingMin: 4,
        desc: "Réaliste, unisensorielle. Portée CDV. Durée M. Dissimulation visuelle.",
      },
      {
        name: "Camouflage physique",
        cat: "illusion",
        drain: "P",
        proRatingMin: 2,
        desc: "Réaliste, unisensorielle. Portée CDV. Durée M. Motif camouflage adaptatif.",
      },
      {
        name: "Double physique",
        cat: "illusion",
        drain: "P-1",
        proRatingMin: 4,
        desc: "Réaliste, plurisensorielle. Portée C. Durée M. Illusoire double de soi.",
      },
      {
        name: "Euphorie",
        cat: "illusion",
        drain: "P-3",
        proRatingMin: 3,
        desc: "Réaliste, unisensorielle. Portée CDV. Durée M. Sentiment bien-être illégal.",
      },
      {
        name: "Euphorie de masse",
        cat: "illusion",
        drain: "P",
        proRatingMin: 2,
        desc: "Réaliste, unisensorielle, zone. Portée CDV(Z). Durée M. Euphorie collective.",
      },
      {
        name: "Inversion de signature de véhicule",
        cat: "illusion",
        drain: "P-3",
        proRatingMin: 3,
        desc: "Réaliste, plurisensorielle. Portée C. Durée M. Fausse identité automobile.",
      },
      {
        name: "Maquillage de véhicule",
        cat: "illusion",
        drain: "P-3",
        proRatingMin: 3,
        desc: "Réaliste, plurisensorielle. Portée C. Durée M. Apparence véhicule altérée.",
      },
      {
        name: "Mauvais pressentiment",
        cat: "illusion",
        drain: "P-3",
        proRatingMin: 3,
        desc: "Réaliste, plurisensorielle, zone. Portée CDV(Z). Durée M. Aura de danger illusoire.",
      },
      {
        name: "Métal brûlant",
        cat: "illusion",
        drain: "P-3",
        proRatingMin: 3,
        desc: "Réaliste, unisensorielle. Portée CDV(Z). Durée M. Sensation brûlure contact métal.",
      },
      {
        name: "Privation de [sens]",
        cat: "illusion",
        drain: "P-3",
        proRatingMin: 3,
        desc: "Réaliste, unisensorielle. Portée CDV. Durée M. Suppression sensorielle ciblée.",
      },
      {
        name: "Privation de [sens] de masse",
        cat: "illusion",
        drain: "P-1",
        proRatingMin: 4,
        desc: "Réaliste, unisensorielle, zone. Portée CDV(Z). Durée M. Privation collective sens.",
      },
      {
        name: "Puanteur",
        cat: "illusion",
        drain: "P-3",
        proRatingMin: 3,
        desc: "Réaliste, unisensorielle. Portée CDV. Durée M. Odeur répugnante illusoire.",
      },
      {
        name: "Nuage pestilentiel",
        cat: "illusion",
        drain: "P-1",
        proRatingMin: 4,
        desc: "Réaliste, unisensorielle, zone. Portée CDV(Z). Durée M. Nauphorique gazeux.",
      },
      {
        name: "Songe",
        cat: "illusion",
        drain: "P-3",
        proRatingMin: 3,
        desc: "Réaliste, plurisensorielle. Portée CDV. Durée M. Rêve partagé conscient.",
      },
      {
        name: "Apaisement d'une meute",
        cat: "illusion",
        drain: "P-1",
        proRatingMin: 4,
        desc: "Mental. Portée CDV(Z). Durée M. Calme animal/groupe.",
      },
      {
        name: "Altération de la température",
        cat: "manipulation",
        drain: "P-3",
        proRatingMin: 3,
        desc: "Physique. Portée CDV(Z). Durée M. Modification thermique zone.",
      },
      {
        name: "Apaisement d'un animal",
        cat: "manipulation",
        drain: "P-3",
        proRatingMin: 3,
        desc: "Mental. Portée CDV. Durée M. Calme créature.",
      },
      {
        name: "Aura de [élément]",
        cat: "manipulation",
        drain: "P-1",
        proRatingMin: 4,
        desc: "Environnemental. Portée CDV. Durée M. Énergie élémentale entourage.",
      },
      {
        name: "Barrière anti-esprit",
        cat: "manipulation",
        drain: "P-1",
        proRatingMin: 4,
        desc: "Environnemental, zone. Portée CDV(Z). Durée M. Protection esprits.",
      },
      {
        name: "Barrière anti-esprit offensive",
        cat: "manipulation",
        drain: "P-1",
        proRatingMin: 4,
        desc: "Environnemental, zone. Portée CDV(Z). Durée M. Rejet agressif esprits.",
      },
      {
        name: "Barrière anti-insectes offensive",
        cat: "manipulation",
        drain: "P-1",
        proRatingMin: 4,
        desc: "Environnemental, zone. Portée CDV(Z). Durée M. Répulsion insectes magiques.",
      },
      {
        name: "Barrière mana offensive",
        cat: "manipulation",
        drain: "P+3",
        proRatingMin: 1,
        desc: "Environnemental, zone. Portée CDV(Z). Durée M. Agression barrière mana.",
      },
      {
        name: "Brouillage du mana",
        cat: "manipulation",
        drain: "P-1",
        proRatingMin: 4,
        desc: "Environnemental, zone. Portée CDV(Z). Durée M. Perturbation flux mana.",
      },
      {
        name: "Brume",
        cat: "manipulation",
        drain: "P-3",
        proRatingMin: 3,
        desc: "Environnemental, zone. Portée CDV(Z). Durée M. Brouillard magique.",
      },
      {
        name: "Bande de colle",
        cat: "manipulation",
        drain: "P-1",
        proRatingMin: 4,
        desc: "Physique. Portée CDV(Z). Durée P. Liaison adhésive magique.",
      },
      {
        name: "Chute féline",
        cat: "manipulation",
        drain: "P-3",
        proRatingMin: 3,
        desc: "Physique. Portée CDV. Durée M. Chute sans dommage.",
      },
      {
        name: "Colle",
        cat: "manipulation",
        drain: "P-3",
        proRatingMin: 3,
        desc: "Physique. Portée CDV. Durée P. Adhésion totale surface.",
      },
      {
        name: "Consolidation",
        cat: "manipulation",
        drain: "P-1",
        proRatingMin: 4,
        desc: "Physique. Portée CDV. Durée M. Renforcement structural objet.",
      },
      {
        name: "Contrôle d'animal",
        cat: "manipulation",
        drain: "P-3",
        proRatingMin: 3,
        desc: "Mental. Portée CDV. Durée M. Domination créature.",
      },
      {
        name: "Contrôle de meute",
        cat: "manipulation",
        drain: "P-1",
        proRatingMin: 4,
        desc: "Mental, zone. Portée CDV. Durée M. Commande groupe animal.",
      },
      {
        name: "Déflexion",
        cat: "manipulation",
        drain: "P-1",
        proRatingMin: 4,
        desc: "Physique. Portée CDV. Durée M. Protection objet/projectile.",
      },
      {
        name: "Défense forcée",
        cat: "manipulation",
        drain: "P-3",
        proRatingMin: 3,
        desc: "Mental. Portée C. Durée M. Amélioration défense instinctive.",
      },
      {
        name: "Façonnage de [matériaux]",
        cat: "manipulation",
        drain: "P-1",
        proRatingMin: 4,
        desc: "Physique, zone. Portée CDV(Z). Durée M. Transformation matière brute.",
      },
      {
        name: "Impulsion",
        cat: "manipulation",
        drain: "P+3",
        proRatingMin: 1,
        desc: "Environnemental, zone. Portée CDV(Z). Durée M. Onde électromagnétique.",
      },
      {
        name: "Liens",
        cat: "manipulation",
        drain: "P-2",
        proRatingMin: 4,
        desc: "Physique. Portée CDV. Durée M. Entrave magique.",
      },
      {
        name: "Filet",
        cat: "manipulation",
        drain: "P",
        proRatingMin: 2,
        desc: "Physique, zone. Portée CDV(Z). Durée M. Piège filet zonal.",
      },
      {
        name: "Liens mana",
        cat: "manipulation",
        drain: "P-2",
        proRatingMin: 4,
        desc: "Mana. Portée CDV. Durée M. Chaînes énergie spirituelle.",
      },
      {
        name: "Filet mana",
        cat: "manipulation",
        drain: "P",
        proRatingMin: 2,
        desc: "Mana, zone. Portée CDV(Z). Durée M. Piège mana zonal.",
      },
      {
        name: "Liquéfaction",
        cat: "manipulation",
        drain: "P+3",
        proRatingMin: 1,
        desc: "Physique. Portée CDV. Durée M. Transformation liquide.",
      },
      {
        name: "Maquillage",
        cat: "manipulation",
        drain: "P-3",
        proRatingMin: 3,
        desc: "Physique. Portée C. Durée P. Modification apparence.",
      },
      {
        name: "Métamorphose",
        cat: "manipulation",
        drain: "P-3",
        proRatingMin: 3,
        desc: "Physique. Portée CDV. Durée M. Transformation corps.",
      },
      {
        name: "Métamorphose (animal)",
        cat: "manipulation",
        drain: "P-4",
        proRatingMin: 3,
        desc: "Physique. Portée CDV. Durée M. Forme animale temporaire.",
      },
      {
        name: "Mode",
        cat: "manipulation",
        drain: "P-1",
        proRatingMin: 4,
        desc: "Environnemental, zone. Portée C(Z). Durée P. Altération apparence vestiges.",
      },
      {
        name: "Mur de [élément]",
        cat: "manipulation",
        drain: "P+2",
        proRatingMin: 1,
        desc: "Environnemental, zone. Portée CDV(Z). Durée M. Barrière élémentale.",
      },
      {
        name: "Pétrification",
        cat: "manipulation",
        drain: "P-2",
        proRatingMin: 4,
        desc: "Physique. Portée CDV. Durée M. Rigidité corporelle partielle.",
      },
      {
        name: "Préservation",
        cat: "manipulation",
        drain: "P-3",
        proRatingMin: 3,
        desc: "Physique. Portée C. Durée P. Ralentissement décomposition matière.",
      },
      {
        name: "Protection de véhicule",
        cat: "manipulation",
        drain: "P-1",
        proRatingMin: 4,
        desc: "Physique. Portée C. Durée P. Renforcement automobile.",
      },
      {
        name: "Purification de [élément]",
        cat: "manipulation",
        drain: "P-3",
        proRatingMin: 3,
        desc: "Environnemental, zone. Portée CDV(Z). Durée P. Nettoyage élément spécifique.",
      },
      {
        name: "Ralentissement de véhicule",
        cat: "manipulation",
        drain: "P+1",
        proRatingMin: 1,
        desc: "Physique. Portée CDV. Durée M. Réduction vitesse automobile.",
      },
      {
        name: "Réparation",
        cat: "manipulation",
        drain: "P",
        proRatingMin: 2,
        desc: "Physique. Portée C. Durée P. Restauration objet.",
      },
      {
        name: "Répétition du gecko",
        cat: "manipulation",
        drain: "P-3",
        proRatingMin: 3,
        desc: "Physique. Portée C. Durée P. Adhérence murale.",
      },
      // ----- Forbidden Arcana (p.49-51) -----
      {
        name: "Branche",
        cat: "manipulation",
        drain: "P-2",
        proRatingMin: 2,
        desc: "Sort de manipulation physique créant des branches/rameaux du sol pour restreindre une cible. Réduit l'Agilité d'un point par succès net ; si l'Agilité atteint 0, la cible est immobilisée. Cible unique. Type P, Portée LOS, Durée S.",
      },
      {
        name: "Vignes",
        cat: "manipulation",
        drain: "P-1",
        proRatingMin: 2,
        desc: "Variante de zone de Branche. Crée des vignes/lianes sortant du sol pour restreindre plusieurs cibles avec les mêmes effets. Type P, Portée LOS (A), Durée S.",
      },
      {
        name: "Épine",
        cat: "manipulation",
        drain: "P+2",
        proRatingMin: 2,
        desc: "Variante de zone de Branche infligeant aussi des dégâts. Restreint comme Branche mais inflige des dégâts physiques à la fin de chaque tour de combat égaux aux succès nets. Type P, Portée LOS (A), Durée S.",
      },
      {
        name: "Croissance",
        cat: "manipulation",
        drain: "P+3",
        proRatingMin: 2,
        desc: "Sort de manipulation augmentant temporairement les attributs physiques d'une cible (Corps, Agilité, Réflexes, Force de +1 par 3 succès nets). Peut aussi faire grandir la cible physiquement de 0,5 mètre par 3 succès nets. Type P, Portée LOS, Durée S.",
      },
      {
        name: "Gravité",
        cat: "manipulation",
        drain: "P+1",
        proRatingMin: 2,
        desc: "Sort de manipulation appliquant une force gravitationnelle magique sur une cible unique. Chaque succès net inflige un modificateur de –1 aux tests d'actions utilisant les attributs physiques. Si la pénalité dépasse la Force de la cible, elle est immobilisée. Type P, Portée LOS, Durée S.",
      },
      {
        name: "Puits de gravité",
        cat: "manipulation",
        drain: "P+3",
        proRatingMin: 2,
        desc: "Variante de zone de Gravité appliquant la force gravitationnelle à tous les cibles dans une zone (y compris le lanceur et ses alliés). Mêmes mécaniques que Gravité mais sur zone. Type P, Portée LOS (A), Durée S.",
      },
      {
        name: "Modification balistique",
        cat: "manipulation",
        drain: "P-2",
        proRatingMin: 2,
        desc: "Sort de manipulation unique à l'Alchimiste d'Armement ; préparation alchimique utilisant une munition comme centre d'ancrage. Modifie propriétés balistiques (portée double, réduction de bruit, précision, déformation, etc.) selon les succès nets. Dure un nombre de minutes égal à la Force. Type P, Portée T, Durée I.",
      },
      {
        name: "Fouet",
        cat: "combat",
        drain: "P",
        proRatingMin: 2,
        desc: "Sort de combat créant un fouet/tentacule/vigne de mana frappant une cible unique avec force. Inflige dégâts physiques ; chaque 2 dégâts physiques non-résistés infligent 1 dégât d'étourdissement. Type P, Portée LOS, Durée I.",
      },
      {
        name: "Lacération",
        cat: "combat",
        drain: "P+3",
        proRatingMin: 2,
        desc: "Variante de zone de Fouet. Crée des fouets de mana frappant toutes les cibles d'une zone. Type P, Portée LOS (A), Durée I.",
      },
      {
        name: "Griffe",
        cat: "combat",
        drain: "P",
        proRatingMin: 2,
        desc: "Sort de combat créant des griffes/éclats de mana tranchant dans la cible, déchirant armure et chair. Réduit les dégâts de 2 mais augmente l'AP de +4. Type P, Portée LOS, Durée I.",
      },
      {
        name: "Criblage",
        cat: "combat",
        drain: "P+3",
        proRatingMin: 2,
        desc: "Variante de zone de Griffe. Projette de nombreuses griffes de mana sur une zone. Type P, Portée LOS (A), Durée I.",
      },
      {
        name: "Rosier",
        cat: "combat",
        drain: "P+3",
        proRatingMin: 2,
        desc: "Variante de zone de Épine (sort de combat indirect). Crée un rosier magique restreignant et blessant toutes les cibles d'une zone. Inflige dégâts chaque tour égaux aux succès nets. Type P, Portée LOS (A), Durée I.",
      },
      {
        name: "Comète",
        cat: "combat",
        drain: "P",
        proRatingMin: 2,
        desc: "Sort de combat créant une boule de feu/terre enflammée qui s'écrase sur une zone, causant dégâts feu et acide. Seuls les effets associés (pas les dégâts eux-mêmes) peuvent être réduits par résistance feu/acide. Type P, Portée LOS (A), Durée I.",
      },
      {
        name: "Mauvais œil",
        cat: "combat",
        drain: "P-3",
        proRatingMin: 2,
        desc: "Sort de combat mental attaque mentale causant confusion et indécision. Chaque succès net réduit le score d'Initiative de la cible de 1 point. La cible ressent une appréhension psychosomatique. Type M, Portée LOS, Durée I.",
      },
      {
        name: "Duplication alimentaire",
        cat: "sante",
        drain: "P-2",
        proRatingMin: 2,
        desc: "Sort de santé (essence) permettant de dupliquer de la nourriture touchée. Chaque succès multiplie la nourriture par dix. Les aliments dupliqués ne peuvent pas être dupliqués à nouveau. Effet permanent. Type P, Portée T, Durée Permanente.",
      },
    ],

    // ----- ANARCHY 2.0 (Shadowrun : Anarchy 2.0, « Lancement de sorts » p.178-185) -----
    // 5 catégories (combat/détection/santé/illusion/manipulation) ; le coût
    // s'appelle « Seuil » (nombre, 0, « variable », ou selon aire/taille/
    // matériau, ou réserve opposée de la cible). Test = Sorcellerie (spé du
    // type) + Volonté. 34 sorts officiels. Le champ `seuil` porte la valeur
    // affichée ; le détail complet est dans `desc`.
    // ----- ANARCHY 1re (Shadowrun : Anarchy V1, « SORTS (ÉVEILLÉS
    // UNIQUEMENT) » p.68-69 + supplément « Anarchistes » p.72) -----
    // En V1, un sort est un Atout dont le coût s'exprime en « niveau »
    // (souvent une plage 2/3/4 ; champ `niveau`, nombre ou chaîne — PAS de
    // `drain` ni de `seuil`, qui n'existent pas en V1). Le livre ne connaît
    // que 2 types (« sort de combat » / « sort d'effet ») ; on aligne ici la
    // taxonomie sur les 5 catégories des autres éditions (combat/détection/
    // santé/illusion/manipulation) pour un filtrage cohérent — la catégorie
    // d'un sort partagé suit celle d'Anarchy 2.0 (ex. Sens du combat →
    // détection, Armure → manipulation). Test V1 = Sorcellerie + Volonté ;
    // pas de VD chiffrée (drainResist reste null). Les 3 statBlocks Éveillés
    // piochent leurs sorts dans leur propre pool `spellOptions`
    // (EditionAnarchy1.generate) enrichi par nom depuis ce catalogue.
    anarchy1: [
      // — Combat (sorts de combat) — connus des autres éditions d'abord —
      {
        name: "Éclair mana",
        cat: "combat",
        niveau: 2,
        proRatingMin: 2,
        desc: "Sort de combat direct : Dommages 6P/CA, Défense FOR + VOL.",
      },
      {
        name: "Éclair étourdissant",
        cat: "combat",
        niveau: 4,
        proRatingMin: 3,
        desc: "Sort de combat direct : Dommages 8E/CA, Défense FOR + VOL. Neutralise sans tuer.",
      },
      {
        name: "Boule de feu",
        cat: "combat",
        niveau: 2,
        proRatingMin: 2,
        desc: "Sort de combat à aire d'effet : Dommages 6P, affecte plusieurs cibles, Défense AGI + LOG.",
      },
      {
        name: "Flot d'acide",
        cat: "combat",
        niveau: 2,
        proRatingMin: 2,
        desc: "Sort de combat : Dommages 6P, Défense AGI + LOG, +2 dommages à l'Armure.",
      },
      {
        name: "Foudre",
        cat: "combat",
        niveau: 3,
        proRatingMin: 3,
        desc: "Sort de combat : Dommages 6P/CA, Défense AGI + LOG, permet de relancer 1 échec sur le test de Sorcellerie.",
      },
      {
        name: "Vague de pollution",
        cat: "combat",
        niveau: "4 / 5 / 6",
        proRatingMin: 3,
        desc: "(Anarchistes) Sort de combat à aire d'effet : Dommages 6/7/8P, Défense AGI + LOG, +2 dommages à l'Armure.",
      },
      {
        name: "Rayon radioactif",
        cat: "combat",
        niveau: "3 / 4 / 5",
        proRatingMin: 3,
        desc: "(Anarchistes) Dommages 6P/CA, Défense FOR + VOL. Dommages continus de 1P (armure ignorée) les 1/2/3 prochaines Narrations.",
      },
      {
        name: "Explosion radioactive",
        cat: "combat",
        niveau: "4 / 5 / 6",
        proRatingMin: 3,
        desc: "(Anarchistes) Aire d'effet : Dommages 6P/CA, Défense FOR + VOL. Dommages continus de 1P (armure ignorée) les 1/2/3 prochaines Narrations.",
      },
      // — Détection —
      {
        name: "Analyse de véracité",
        cat: "detection",
        niveau: 1,
        proRatingMin: 1,
        desc: "Le lanceur détermine si la cible dit la vérité ou non.",
      },
      {
        name: "Détection de la magie",
        cat: "detection",
        niveau: 1,
        proRatingMin: 1,
        desc: "Rend les objets magiques et les sorts actifs brillants aux yeux du lanceur.",
      },
      {
        name: "Détection des ennemis",
        cat: "detection",
        niveau: 1,
        proRatingMin: 1,
        desc: "Localise toute personne à portée intermédiaire ayant des intentions hostiles envers le personnage.",
      },
      {
        name: "Sens du combat",
        cat: "detection",
        niveau: "2 / 3 / 4",
        proRatingMin: 2,
        desc: "Permet d'ajouter 1/2/3 dés sur ses tests de défense en combat tant que le sort est maintenu.",
      },
      {
        name: "Clairvoyance",
        cat: "detection",
        niveau: 1,
        proRatingMin: 1,
        desc: "Permet au lanceur de voir un lieu distant comme s'il s'y trouvait.",
      },
      {
        name: "Diagnostic",
        cat: "detection",
        niveau: 1,
        proRatingMin: 1,
        desc: "Permet de déterminer l'état de santé de la cible.",
      },
      // — Santé —
      {
        name: "Soins",
        cat: "sante",
        niveau: 2,
        proRatingMin: 2,
        desc: "Soigne une case de dommages Physiques ou Étourdissants par succès sur un test simple de Sorcellerie + Volonté (tenir compte de l'Essence de la cible).",
      },
      {
        name: "Augmentation de réflexes",
        cat: "sante",
        niveau: "2 / 3 / 4",
        proRatingMin: 2,
        desc: "Accélère la cible : niveau 2 = +1 point d'Anarchy/Scène ; niveau 3 = +1 attaque par Narration, +1 point d'Anarchy/Scène ; niveau 4 = +1 attaque par Narration, +2 points d'Anarchy/Scène.",
      },
      {
        name: "Antidote",
        cat: "sante",
        niveau: 1,
        proRatingMin: 1,
        desc: "Permet à la cible d'éliminer les effets d'une toxine.",
      },
      {
        name: "Résistance à la douleur",
        cat: "sante",
        niveau: "2 / 3 / 4",
        proRatingMin: 2,
        desc: "Permet d'ignorer les modificateurs de blessure de 1/2/3 dés.",
      },
      // — Illusion —
      {
        name: "Invisibilité",
        cat: "illusion",
        niveau: "2 / 3 / 4",
        proRatingMin: 2,
        desc: "Permet à la cible de relancer 1/2/3 échecs sur ses tests de Furtivité tant que le sort est maintenu.",
      },
      {
        name: "Confusion",
        cat: "illusion",
        niveau: "2 / 3 / 4",
        proRatingMin: 2,
        desc: "La cible est confuse et subit un modificateur de −1/2/3 dés sur tous ses tests tant que le sort est maintenu.",
      },
      {
        name: "Masque",
        cat: "illusion",
        niveau: "2 / 3 / 4",
        proRatingMin: 2,
        desc: "Change l'apparence de la cible et lui permet de relancer 1/2/3 échecs sur ses tests de Comédie tant que le sort est maintenu.",
      },
      {
        name: "Illusion",
        cat: "illusion",
        niveau: "2 / 3 / 4",
        proRatingMin: 2,
        desc: "La cible voit des choses qui n'existent pas et subit un modificateur de −1/2/3 dés sur tous ses tests perturbés par ces visions tant que le sort est maintenu.",
      },
      {
        name: "Invisibilité de masse",
        cat: "illusion",
        niveau: "3 / 4 / 5",
        proRatingMin: 3,
        desc: "Permet à un groupe de personnages de relancer 1/2/3 échecs sur leurs tests de Furtivité tant que le sort est maintenu.",
      },
      {
        name: "Monde chaotique",
        cat: "illusion",
        niveau: "3 / 4 / 5",
        proRatingMin: 3,
        desc: "Rend tous les personnages dans la zone confus et les force à relancer 1/2/3 succès sur tous leurs tests tant que le sort est maintenu.",
      },
      // — Manipulation —
      {
        name: "Armure",
        cat: "manipulation",
        niveau: "2 / 3 / 4",
        proRatingMin: 2,
        desc: "Octroie 3/6/9 cases d'Armure supplémentaires à la cible tant qu'il est maintenu ; le sort est automatiquement interrompu une fois toutes les cases cochées.",
      },
      {
        name: "Contrôle des pensées",
        cat: "manipulation",
        niveau: "2 / 3 / 4",
        proRatingMin: 2,
        desc: "Octroie +1/2/3 dés pour les tests d'Intimidation et de Négociation contre la cible tant que le sort est maintenu.",
      },
      {
        name: "Barrière",
        cat: "manipulation",
        niveau: "2 / 3 / 4",
        proRatingMin: 2,
        desc: "Crée une barrière magique fixe de quelques mètres ayant 3/6/9 cases de Blindage.",
      },
      {
        name: "Armure de flammes",
        cat: "manipulation",
        niveau: 3,
        proRatingMin: 3,
        desc: "Octroie 3 cases d'Armure supplémentaires tant qu'il est maintenu et cause 1 case de dommages à tout personnage qui touche la cible au corps à corps.",
      },
      {
        name: "Accident",
        cat: "manipulation",
        niveau: 3,
        proRatingMin: 3,
        desc: "Lors d'un combat, ajoute un dé de complication sur deux tests de la cible à chaque Tour.",
      },
      {
        name: "Mana corrompu",
        cat: "manipulation",
        niveau: 3,
        proRatingMin: 3,
        desc: "(Anarchistes) Corrompt le mana autour de la cible, qui doit relancer 2 succès sur ses tests de Sorcellerie.",
      },
    ],
    anarchy2: [
      // — Combat (7) — direct = dommages mentaux, indirect = physiques —
      {
        name: "Éclair mana",
        cat: "combat",
        seuil: "selon aire",
        proRatingMin: 1,
        desc: "Sort de combat direct : VD = succès nets, dommages mentaux létaux. Utilisable dans l'astral, sans effet sur objets/drones/véhicules. Instantané.",
      },
      {
        name: "Éclair étourdissant",
        cat: "combat",
        seuil: "selon aire",
        proRatingMin: 1,
        desc: "Sort de combat direct : VD = succès nets, dommages mentaux étourdissants. Neutralise sans tuer. Instantané.",
      },
      {
        name: "Déflagration",
        cat: "combat",
        seuil: "selon aire",
        proRatingMin: 2,
        desc: "Sort de combat indirect : VD = Volonté + succès nets, dommages physiques. Défense Athlétisme/Combat rapproché + Agilité. Effet (1 pt Anarchy) : projette la cible au sol. Instantané.",
      },
      {
        name: "Trait de feu",
        cat: "combat",
        seuil: "selon aire",
        proRatingMin: 2,
        desc: "Sort de combat indirect : VD = Volonté + succès nets, dommages physiques. Effet spécial : enflamme la cible. Instantané.",
      },
      {
        name: "Lance de glace",
        cat: "combat",
        seuil: "selon aire",
        proRatingMin: 2,
        desc: "Sort de combat indirect : VD = Volonté + succès nets, dommages physiques. Effet spécial : ralentit la cible. Instantané.",
      },
      {
        name: "Foudre",
        cat: "combat",
        seuil: "selon aire",
        proRatingMin: 2,
        desc: "Sort de combat indirect : VD = Volonté + succès nets, dommages physiques. Effet spécial : fait perdre une action à la cible. Instantané.",
      },
      {
        name: "Flot acide",
        cat: "combat",
        seuil: "selon aire",
        proRatingMin: 2,
        desc: "Sort de combat indirect : VD = Volonté + succès nets, dommages physiques. Effet spécial : détruit l'armure de la cible. Instantané.",
      },
      // — Détection (8) —
      {
        name: "Analyse de la magie",
        cat: "detection",
        seuil: 4,
        proRatingMin: 2,
        desc: "Identifie n'importe quel phénomène magique (sort, esprit, focus). Instantané.",
      },
      {
        name: "Analyse de véracité",
        cat: "detection",
        seuil: "Volonté + Charisme de la cible",
        proRatingMin: 1,
        desc: "Maintenu : sait si la cible ment ou croit dire la vérité, tant que le sort dure.",
      },
      {
        name: "Détection de la magie",
        cat: "detection",
        seuil: 0,
        proRatingMin: 1,
        desc: "Sens étendu maintenu : détecte les formes astrales et créatures duales. Portée selon les succès (2/15/60/250 m).",
      },
      {
        name: "Détection de la vie",
        cat: "detection",
        seuil: 0,
        proRatingMin: 1,
        desc: "Sens étendu maintenu : détecte toute forme de vie de la taille d'une souris ou plus. Portée selon les succès.",
      },
      {
        name: "Détection des ennemis",
        cat: "detection",
        seuil: 0,
        proRatingMin: 1,
        desc: "Sens étendu maintenu : détecte les êtres vivants aux intentions néfastes envers la cible. Portée selon les succès.",
      },
      {
        name: "Emprunt de sens",
        cat: "detection",
        seuil: 5,
        proRatingMin: 3,
        desc: "Maintenu : percevoir par les sens d'une cible visible au lancement (voir par ses yeux, etc.).",
      },
      {
        name: "Sens du combat",
        cat: "detection",
        seuil: 5,
        proRatingMin: 2,
        desc: "Maintenu : avantage aux tests de Combat rapproché et d'Athlétisme (défense à distance).",
      },
      {
        name: "Sonde mentale",
        cat: "detection",
        seuil: "Volonté + Charisme de la cible",
        proRatingMin: 3,
        desc: "Cherche une information connue de la cible ; un lancement par information. Nécessite de toucher la cible. Instantané.",
      },
      // — Santé (2) — nécessitent de toucher la cible —
      {
        name: "Augmentation de réflexes",
        cat: "sante",
        seuil: "variable",
        proRatingMin: 2,
        desc: "Maintenu, imite les atouts d'augmentation d'initiative (seul le meilleur bonus compte). 3 succès : +1 pt Anarchy/scène, actions suppl. ; 5 : +1 action/narration ; 7 : +2 pts Anarchy/scène + action.",
      },
      {
        name: "Soins",
        cat: "sante",
        seuil: "variable",
        proRatingMin: 1,
        desc: "Instantané : soigne une blessure ou stabilise un mourant. Seuil selon la gravité : légère 3, grave 5, incapacitante 6, stabilisation 3.",
      },
      // — Illusion (6) — indirect = affecte aussi les capteurs techno —
      {
        name: "Chimère",
        cat: "illusion",
        seuil: "selon taille",
        proRatingMin: 2,
        desc: "Illusion indirecte maintenue : crée une illusion multisensorielle à un emplacement donné.",
      },
      {
        name: "Confusion",
        cat: "illusion",
        seuil: "selon aire",
        proRatingMin: 1,
        desc: "Illusion directe maintenue : les cibles dont (Volonté + Logique) ≤ succès nets subissent un désavantage à tous leurs tests. Ne peut être percée à jour.",
      },
      {
        name: "Fantasme",
        cat: "illusion",
        seuil: "selon aire",
        proRatingMin: 2,
        desc: "Illusion directe maintenue : les cibles affectées perçoivent une scène multisensorielle réaliste (n'affecte pas les capteurs technologiques).",
      },
      {
        name: "Invisibilité",
        cat: "illusion",
        seuil: "selon taille",
        proRatingMin: 1,
        desc: "Illusion indirecte maintenue : la cible devient invisible, y compris aux capteurs technologiques.",
      },
      {
        name: "Masque",
        cat: "illusion",
        seuil: "selon taille",
        proRatingMin: 1,
        desc: "Illusion indirecte maintenue : la cible change d'apparence (taille sensiblement conservée).",
      },
      {
        name: "Silence",
        cat: "illusion",
        seuil: "selon taille",
        proRatingMin: 1,
        desc: "Illusion indirecte maintenue : la cible devient inaudible.",
      },
      // — Manipulation (11) —
      {
        name: "Contrôle des pensées",
        cat: "manipulation",
        seuil: "selon aire",
        proRatingMin: 3,
        desc: "Manipulation mentale maintenue : les cibles dont (Volonté + Logique) ≤ succès nets subissent un désavantage social et suivent la suggestion implantée.",
      },
      {
        name: "Armure",
        cat: "manipulation",
        seuil: 0,
        proRatingMin: 1,
        desc: "Manipulation physique maintenue : +1 point d'Armure contre les attaques physiques par tranche entière de 3 succès.",
      },
      {
        name: "Armure astrale",
        cat: "manipulation",
        seuil: 0,
        proRatingMin: 2,
        desc: "Manipulation physique maintenue : +1 point d'Armure contre les attaques magiques par tranche de 3 succès.",
      },
      {
        name: "Armure mystique",
        cat: "manipulation",
        seuil: 0,
        proRatingMin: 2,
        desc: "Manipulation physique maintenue : +1 point d'Armure contre les attaques physiques ET magiques par tranche de 4 succès.",
      },
      {
        name: "Aura élémentaire",
        cat: "manipulation",
        seuil: 0,
        proRatingMin: 2,
        desc: "Manipulation physique maintenue : inflige VD = succès à toute cible touchant le personnage au corps à corps.",
      },
      {
        name: "Barrière physique",
        cat: "manipulation",
        seuil: 0,
        proRatingMin: 2,
        desc: "Manipulation physique maintenue : barrière infranchissable sur le plan physique (Force 1/succès ; section 3×3 m ou dôme Ø 3 m par succès).",
      },
      {
        name: "Barrière astrale",
        cat: "manipulation",
        seuil: 0,
        proRatingMin: 2,
        desc: "Manipulation physique maintenue : barrière infranchissable sur le plan astral (mêmes règles de Force/Taille que la Barrière physique).",
      },
      {
        name: "Barrière duale",
        cat: "manipulation",
        seuil: 2,
        proRatingMin: 3,
        desc: "Manipulation physique maintenue : barrière sur les plans physique ET astral (succès nets alloués à la Force / la Taille).",
      },
      {
        name: "Doigts télékinétiques",
        cat: "manipulation",
        seuil: 3,
        proRatingMin: 2,
        desc: "Manipulation physique maintenue : effectue des manipulations simples à distance.",
      },
      {
        name: "Façonnage",
        cat: "manipulation",
        seuil: "selon matériau",
        proRatingMin: 2,
        desc: "Manipulation physique maintenue : change la forme d'un matériau (ex. créer une ouverture). Seuil : naturel 2, simple 4, haute technologie 6.",
      },
      {
        name: "Lévitation",
        cat: "manipulation",
        seuil: "selon taille",
        proRatingMin: 2,
        desc: "Manipulation physique maintenue : fait léviter la cible à moins d'un mètre du sol, déplacement à vitesse de marche.",
      },
    ],
  },

  /* ========================================================
     FORMES COMPLEXES — technomanciens (T2, chantier Technomanciens)

     Sources : REFERENCE/effects/technomanciens/{formes_sr5_core,
     formes_sr5_datatrails}.md (campagne d'extraction vérifiée au livre,
     2026-07-17, chaque forme tamponnée VÉRIFIÉ). SR5 uniquement pour
     l'instant (Livre de Règles p.254-256, 14 formes + Data Trails p.62,
     +5) — SR6 (39, dont un 3ᵉ régime de coût « Succès ») et Anarchy 1
     (17, régime Atout via anarchyatouts.js) restent au plan.

     Entrée : { name, cat, vt, proRatingMin, desc }.
       vt   = code de Valeur de Drain SR5, relatif au Niveau (« N+2 »…) —
              même patron que `drain: "P-3"` chez les sorts, consommé tel
              quel par Magic.parseDrainMod/Magic.drainValue (aucune
              modification requise, le "N" n'est qu'une lettre, seul le
              modificateur signé est extrait). VT minimum 2 après ce calcul.
       cat  = facette D'INTERFACE, PAS une catégorie du livre : les formes
              complexes n'ont AUCUNE taxonomie officielle (contrairement
              aux 5 catégories de sorts). Regroupement propre au projet
              pour naviguer 19 entrées, à ne jamais présenter comme un
              concept canon.
       proRatingMin = curation éditoriale du projet (comme pour les sorts),
              pas une donnée du livre.
       gen  = omis ici (défaut : générable) — les 19 entrées SR5 (cœur +
              Data Trails) sont toutes dans le pool de génération par
              arbitrage (« cœur + suppléments curés »). Le champ existe
              pour une future curation SR6 (Hacker vaillant, 24 formes,
              périmètre plus large que le cœur).
       attrs = uniquement Dispersion/Injection : la forme regroupe 4
              formes distinctes (une par attribut matriciel), texte du
              livre à l'appui — développée à la sélection, pas 4 entrées
              dupliquées.
       manualTest = uniquement FAQ : seule entrée dont le test EFFECTIF
              n'est pas « Logiciels + Résonance [Niveau] » (ici Informatique
              + Intuition [Niveau], +Niveau/2 dés) — exception nommée au
              livre, pas modélisée dans le moteur de jet pour une seule
              entrée sur 19 (le MJ la lance à la main, comme les formes SR6
              « Édition/Émulation/Marionnettiste » dont le livre ne nomme
              aucun test).
     ======================================================== */
  complexForms: {
    sr5: [
      {
        name: "Bombe d'interférences",
        cat: "furtivite",
        vt: "N+2",
        proRatingMin: 2,
        desc: "Cache le persona des icônes qui l'ont repéré : test opposé contre Intuition + Traitement de données de chaque icône adverse, celles qui échouent perdent le technomancien de vue (sauf si elles l'avaient déjà marké). Cible personnel, durée Immédiate.",
      },
      {
        name: "Canal de résonance",
        cat: "utilitaire",
        vt: "N-1",
        proRatingMin: 1,
        desc: "Ouvre un canal de communication par résonance plutôt que par la Matrice classique. Chaque succès excédentaire réduit de 1 l'indice de bruit dû à la distance. Cible appareil, durée Maintenue.",
      },
      {
        name: "Dispersion de [Attribut matriciel]",
        cat: "attaque",
        vt: "N+1",
        proRatingMin: 2,
        attrs: ["attack", "sleaze", "dataProcessing", "firewall"],
        desc: "Réduit d'un nombre de points égal aux succès excédentaires l'un des quatre attributs matriciels de la cible (au choix, une forme par attribut, jamais sous 1). Test opposé contre Volonté + Firewall. Cible appareil, durée Maintenue.",
      },
      {
        name: "Édition",
        cat: "manipulation",
        vt: "N+2",
        proRatingMin: 1,
        desc: "Imprègne un fichier de résonance pour en manipuler le contenu — ou le protéger (mêmes succès que l'action « éditer un fichier »). Test opposé contre Intuition + Traitement de données du propriétaire. Cible fichier, durée Persistante.",
      },
      {
        name: "Grille transcendante",
        cat: "utilitaire",
        vt: "N-3",
        proRatingMin: 2,
        desc: "Connecte le technomancien à toutes les grilles accessibles depuis sa position, sans pénalité (même publique), pour 1 minute par succès obtenu. Cible personnel, durée Immédiate.",
      },
      {
        name: "Indic",
        cat: "attaque",
        vt: "N-2",
        proRatingMin: 2,
        desc: "Imite des rapports d'activité illégale : augmente le Score de Surveillance de la cible de 1 par succès obtenu (sans effet si elle n'en a pas déjà un). Cible persona, durée Persistante.",
      },
      {
        name: "Injection de [Attribut matriciel]",
        cat: "soutien",
        vt: "N+1",
        proRatingMin: 2,
        attrs: ["attack", "sleaze", "dataProcessing", "firewall"],
        desc: "Booste l'un des quatre attributs matriciels de l'appareil ciblé d'un nombre de points égal aux succès obtenus (plafonné au double de l'indice normal, +4 maximum). Une seule injection à la fois par attribut. Cible appareil, durée Maintenue.",
      },
      {
        name: "Marionnettiste",
        cat: "attaque",
        vt: "N+4",
        proRatingMin: 3,
        desc: "Impose une action matricielle à la cible (1 succès excédentaire pour une gratuite, 2 pour une simple, 3 pour une complexe) : elle l'exécute à sa prochaine action disponible. Test opposé contre Volonté + Firewall. Cible appareil, durée Immédiate.",
      },
      {
        name: "Nettoyeuse",
        cat: "furtivite",
        vt: "N+1",
        proRatingMin: 1,
        desc: "Efface les traces d'activité illégale : réduit le Score de Surveillance de la cible de 1 par succès obtenu. Cible persona, durée Persistante.",
      },
      {
        name: "Pic de résonance",
        cat: "combat",
        vt: "N",
        proRatingMin: 2,
        desc: "Envoie un pic de résonance brute sur la cible : une case de dommage matriciel par succès excédentaire, aucune résistance possible. Test opposé contre Volonté + Firewall. Cible appareil, durée Immédiate.",
      },
      {
        name: "Suture",
        cat: "soutien",
        vt: "N-2",
        proRatingMin: 1,
        desc: "Reconstitue la trame de résonance d'un sprite : efface une case de dommage matriciel par succès obtenu. Cible sprite, durée Persistante.",
      },
      {
        name: "Tempête d'impulsion",
        cat: "attaque",
        vt: "N",
        proRatingMin: 2,
        desc: "Encercle la cible de signaux de résonance : augmente son indice de bruit de 1 par succès excédentaire. Test opposé contre Logique + Traitement de données. Cible persona, durée Maintenue.",
      },
      {
        name: "Voile de résonance",
        cat: "manipulation",
        vt: "N-1",
        proRatingMin: 2,
        desc: "Fait croire à la cible qu'un événement matriciel vient de se produire ; il lui faut un test de perception matricielle (seuil = succès excédentaires) pour percer l'illusion. Test opposé contre Intuition + Traitement de données. Cible appareil, durée Maintenue.",
      },
      {
        name: "Voile d'interférences",
        cat: "furtivite",
        vt: "N-1",
        proRatingMin: 3,
        desc: "Cache le technomancien du DIEU : tant qu'elle est maintenue (et sans changer de grille), son Score de Surveillance n'augmente plus avec le temps — mais continue de monter pour toute action illégale. Seuil 1 en grille publique, 2 sinon. Cible persona, durée Maintenue.",
      },
      {
        name: "Bac à glace",
        cat: "utilitaire",
        vt: "N-3",
        proRatingMin: 2,
        desc: "Scanne le serveur occupé et affiche une liste de CI déployables, aussi longue que le nombre de succès obtenus. Test opposé contre Indice Serveur + Corruption. Cible serveur, durée Immédiate. (Data Trails p.62)",
      },
      {
        name: "Derezz",
        cat: "combat",
        vt: "N-1",
        proRatingMin: 3,
        desc: "Attaque directe façon pic à glace : une case de dommage matriciel par succès excédentaire, plus 1 point de Firewall en moins tant que l'appareil n'est pas rebooté (ne cumule pas entre lancers). Test opposé contre Volonté + Firewall. Cible persona, durée Immédiate. (Data Trails p.62)",
      },
      {
        name: "FAQ",
        cat: "utilitaire",
        vt: "N-3",
        proRatingMin: 1,
        manualTest: true,
        desc: "Scanne la Matrice pour des informations sur l'appareil possédé ou le serveur occupé — le MJ dose les révélations selon les succès (6 pour les plus obscures). Test Informatique + Intuition [Niveau], +Niveau/2 dés (exception au patron habituel, jet non motorisé). Cible appareil, durée Persistante. (Data Trails p.62)",
      },
      {
        name: "Mark leurres",
        cat: "furtivite",
        vt: "N-1",
        proRatingMin: 2,
        desc: "Leurre une CI pendant un nombre de Passes d'Initiative égal aux succès excédentaires : elle ignore le technomancien et traite ses autres marks comme hostiles (sans effet si aucun mark posé). Test opposé contre Volonté + Firewall. Cible CI, durée Persistante. (Data Trails p.62)",
      },
      {
        name: "Redondance",
        cat: "soutien",
        vt: "N-3",
        proRatingMin: 1,
        desc: "Ajoute des cases temporaires au moniteur de dommages matriciels d'un appareil, en nombre égal aux succès obtenus. Cible appareil, durée Maintenue. (Data Trails p.62)",
      },
    ],
    /* SR6 (p.191-193, 15 formes du cœur) + Hacker vaillant (24 formes).
       Trois différences de régime avec SR5, toutes portées par la donnée,
       aucune branche d'édition (le module sr6 interprète `vt` à sa façon) :
       - AUCUN Niveau : le Technodrain est FIXE (nombre) — sauf le 3ᵉ régime
         « succès » de Hacker vaillant, où il vaut le nombre de succès du
         tissage (encart p.63 : total, pas les nets ; plafonnable au choix du
         joueur, laissé au MJ). `vt` porte donc un nombre OU la chaîne "succès".
       - Résistance = Volonté + Logique (posée en generate/recalc), pas RES+VOL.
       - Physique si VD APRÈS résistance > RES (cf. sr6.technoDrainType).
       Curation catalogue/générateur (1ʳᵉ mise en œuvre du prédicat `gen`) : le
       cœur (15) est générable ; les 24 de Hacker vaillant sont `gen: false`
       (catalogue exhaustif, hors pool de génération — un supplément dédié).
       `manualTest` : formes sans jet nommé au livre (Édition/Émulation/
       Marionnettiste), à pool dérogatoire (Accumulation = Électronique+Logique)
       ou à coût contextuel non chiffrable (Détricoter = indice de cryptage) —
       catalogue + ⓘ seuls, comme FAQ en SR5. */
    sr6: [
      {
        name: "Bombe d'interférences",
        cat: "furtivite",
        vt: 6,
        proRatingMin: 2,
        desc: "Effectuée contre toutes les cibles pouvant vous détecter (test opposé contre Intuition + Traitement de données de chacune) : celle qui n'obtient aucun succès net ne vous perçoit plus et doit réussir Percevoir la Matrice pour vous relocaliser avant d'agir contre vous. Durée Instantanée.",
      },
      {
        name: "Canal de Résonance",
        cat: "utilitaire",
        vt: 2,
        proRatingMin: 1,
        desc: "Chaque succès réduit votre niveau de Bruit de 1 point. Durée Maintenue.",
      },
      {
        name: "Dispersion de [Attribut matriciel]",
        cat: "attaque",
        vt: 4,
        proRatingMin: 2,
        attrs: ["attack", "sleaze", "dataProcessing", "firewall"],
        desc: "Chaque succès net réduit de 1 l'attribut matriciel visé (min 1). Test opposé contre Volonté + Firewall. Achetable plusieurs fois, une par attribut. Durée Maintenue.",
      },
      {
        name: "Édition",
        cat: "manipulation",
        vt: 3,
        proRatingMin: 1,
        manualTest: true,
        desc: "Permet d'utiliser l'action « Éditer un fichier » même sans le bon niveau d'accès (le fichier doit avoir été détecté). Le livre ne nomme aucun jet dédié (jet non motorisé). Durée Persistante.",
      },
      {
        name: "Émulation (programme)",
        cat: "utilitaire",
        vt: 0,
        proRatingMin: 1,
        manualTest: true,
        desc: "Fait tourner un cyberprogramme (ou les autosofts d'indice = Traitement de données courant). Achetable plusieurs fois, un programme différent à chaque fois. Aucun jet indiqué (Technodrain 0). Durée Maintenue.",
      },
      {
        name: "Indic",
        cat: "attaque",
        vt: 3,
        proRatingMin: 2,
        desc: "Chaque succès augmente de 1 le Score de Surveillance de la cible. Durée Persistante.",
      },
      {
        name: "Infusion de [Attribut matriciel]",
        cat: "soutien",
        vt: 4,
        proRatingMin: 2,
        attrs: ["attack", "sleaze", "dataProcessing", "firewall"],
        desc: "Test simple (seuil 4) : chaque succès net augmente de 1 l'attribut visé, jusqu'au double du rang normal (max rang + 4). Achetable plusieurs fois, une par attribut. Durée Maintenue.",
      },
      {
        name: "Marionnettiste",
        cat: "attaque",
        vt: 5,
        proRatingMin: 3,
        manualTest: true,
        desc: "Permet d'utiliser l'action « Contrôler un appareil » même sans le bon niveau d'accès (l'appareil doit avoir été détecté). Le livre ne nomme aucun jet dédié. Durée Maintenue.",
      },
      {
        name: "Nettoyeuse",
        cat: "furtivite",
        vt: 2,
        proRatingMin: 1,
        desc: "Chaque succès réduit votre Score de Surveillance de 1. Durée Persistante.",
      },
      {
        name: "Persona miroir",
        cat: "furtivite",
        vt: 3,
        proRatingMin: 2,
        desc: "Crée un persona proxy à votre image ; les succès fixent son indice. Pour percer la supercherie, l'adversaire doit réussir Percevoir la Matrice (seuil = cet indice) ; sinon il cible le proxy. Durée Maintenue.",
      },
      {
        name: "Pic de Résonance",
        cat: "combat",
        vt: 4,
        proRatingMin: 2,
        skill: "Piratage",
        desc: "Chaque succès net inflige une case de dommages matriciels non résistés. Test opposé (Piratage + Résonance) contre Volonté + Firewall — seule forme du chapitre bâtie sur Piratage, pas Électronique (explicite au livre). Durée Instantanée.",
      },
      {
        name: "Suture",
        cat: "soutien",
        vt: 4,
        proRatingMin: 1,
        desc: "Chaque succès net permet à une entité purement matricielle de récupérer 1 case de dommages matriciels. Durée Persistante.",
      },
      {
        name: "Tempête d'impulsions",
        cat: "attaque",
        vt: 3,
        proRatingMin: 2,
        desc: "Chaque succès net augmente le Bruit de la cible de 1. Test opposé contre Logique + Traitement de données. Durée Instantanée.",
      },
      {
        name: "Voile d'interférences",
        cat: "furtivite",
        vt: 3,
        proRatingMin: 3,
        desc: "Tant que maintenue, la cible n'augmente plus son Score de Surveillance en maintenant un accès illégal (le SS continue en revanche de monter pour les actions illégales). Test opposé contre Volonté/Firewall + Firewall du serveur. Durée Maintenue.",
      },
      {
        name: "Voile de Résonance",
        cat: "manipulation",
        vt: 4,
        proRatingMin: 2,
        desc: "Crée l'illusion sensorielle complète d'un élément matriciel ; même en la soupçonnant, la cible doit réussir Percevoir la Matrice (seuil = succès nets) pour ne pas y croire. Test opposé contre Intuition + Traitement de données. Durée Maintenue.",
      },
      {
        name: "Absorbeur de bombe matricielle",
        cat: "soutien",
        vt: 3,
        proRatingMin: 2,
        gen: false,
        desc: "Réduit l'indice d'une bombe matricielle déclenchée pendant la maintenance, du nombre de succès ; à 0 ou moins la bombe est absorbée sans dégât. Durée Maintenue. (Hacker vaillant p.62-63)",
      },
      {
        name: "Accumulation de puissance",
        cat: "utilitaire",
        vt: "succès",
        proRatingMin: 2,
        gen: false,
        manualTest: true,
        desc: "Test Électronique + LOGIQUE (pool dérogatoire, jet non motorisé) : gagne 1 point d'Atout par tranche de 2 succès pleins pour booster la prochaine action/forme ; l'Atout restant est perdu après résolution. Technodrain = succès du test. Durée Maintenue. (Hacker vaillant p.63)",
      },
      {
        name: "Amélioration d'autosofts",
        cat: "soutien",
        vt: "succès",
        proRatingMin: 2,
        gen: false,
        desc: "Ajoute 1 dé bonus par tranche de 2 succès à chaque test réalisé via un autosoft de l'appareil ciblé, tant que la forme est active. Technodrain = succès. Durée Maintenue. (Hacker vaillant p.63)",
      },
      {
        name: "Amplificateur de smartgun",
        cat: "soutien",
        vt: "succès",
        proRatingMin: 2,
        gen: false,
        desc: "Augmente le Score Offensif des armes smartgun / M-TOC ciblés d'un montant égal aux succès, tant que maintenue (mode sans-fil requis). Technodrain = succès. Durée Maintenue. (Hacker vaillant p.63)",
      },
      {
        name: "Analyse de menace",
        cat: "soutien",
        vt: "succès",
        proRatingMin: 2,
        gen: false,
        desc: "Cible un M-TOC : augmente le SD de chaque personnage/drone enregistré de 1 par succès (nécessite IND ou interface RA). Technodrain = succès. Durée Maintenue. (Hacker vaillant p.63)",
      },
      {
        name: "Arc réactif",
        cat: "combat",
        vt: 3,
        proRatingMin: 2,
        gen: false,
        desc: "Si vous subissez des dommages matriciels (Pic de données/Résonance ou CI) pendant la maintenance, renvoie à l'attaquant des dommages matriciels égaux aux succès du test initial ; la forme disparaît ensuite. Durée Maintenue. (Hacker vaillant p.63)",
      },
      {
        name: "Attribution d'Attaque",
        cat: "soutien",
        vt: "succès",
        proRatingMin: 2,
        gen: false,
        desc: "Donne à un persona volontaire un attribut d'Attaque égal aux succès (remplace un attribut moindre) et débloque ses actions matricielles d'Attaque. Incompatible avec Infusion d'Attaque. Technodrain = succès. Durée Maintenue. (Hacker vaillant p.63)",
      },
      {
        name: "Attribution de Corruption",
        cat: "soutien",
        vt: "succès",
        proRatingMin: 2,
        gen: false,
        desc: "Symétrique d'Attribution d'Attaque pour l'attribut Corruption ; débloque les actions illégales liées à la Corruption. Incompatible avec Infusion de Corruption. Technodrain = succès. Durée Maintenue. (Hacker vaillant p.63)",
      },
      {
        name: "Automate illuminé",
        cat: "manipulation",
        vt: "succès",
        proRatingMin: 2,
        gen: false,
        desc: "Augmente l'Autopilote et/ou les Senseurs d'un appareil (max double de l'origine) ; l'appareil devient très réactif et peut se montrer arrogant (Escroquerie/Influence pour le raisonner). Technodrain = succès. Durée Maintenue. (Hacker vaillant p.63-64)",
      },
      {
        name: "BTL IRL",
        cat: "manipulation",
        vt: 4,
        proRatingMin: 3,
        gen: false,
        desc: "Cible augmentée (seuil = 6 − Essence) : bonus de Perception égal aux succès nets mais pénalité en Influence/Escroquerie ; sur complication/échec critique/1 au dé libre, la forme cesse et la cible subit 1D6 dommages Physiques de biofeedback. Durée Maintenue. (Hacker vaillant p.64)",
      },
      {
        name: "Bulle de protection",
        cat: "soutien",
        vt: "succès",
        proRatingMin: 2,
        gen: false,
        desc: "Par tranche de 2 succès, la cible connectée gagne 1 dé bonus pour résister aux formes complexes et pouvoirs de sprite. Détectable seulement via Percevoir la Matrice par une entité à Résonance. Technodrain = succès. Durée Maintenue. (Hacker vaillant p.64)",
      },
      {
        name: "Câbles de Résonance",
        cat: "utilitaire",
        vt: 2,
        proRatingMin: 2,
        gen: false,
        desc: "Établit une connexion directe même avec un appareil au sans-fil coupé (seuil = 2 + niveau de Bruit, contact visuel continu requis) ; sur un personnage, accès à tous ses appareils. Durée Maintenue. (Hacker vaillant p.64)",
      },
      {
        name: "Cyber-saturation",
        cat: "combat",
        vt: "succès",
        proRatingMin: 3,
        gen: false,
        desc: "Cible un personnage à cyberware sans-fil actif : test opposé contre Constitution + Essence, 1 case de dommages Physiques par succès net (réductible par CON) et son cyberware asservi cesse un round. Technodrain = succès. Durée Instantanée. (Hacker vaillant p.64)",
      },
      {
        name: "Détricoter le cryptage",
        cat: "utilitaire",
        vt: "indice de cryptage",
        proRatingMin: 2,
        gen: false,
        manualTest: true,
        desc: "Retire le cryptage d'un fichier détecté sans hausser le Score de Surveillance si le cryptage n'obtient aucun succès net. Test opposé Électronique (Logiciels) + Résonance contre indice de cryptage × 2 ; Technodrain = indice de cryptage (contextuel, jet non motorisé). Durée Persistante. (Hacker vaillant p.64-65)",
      },
      {
        name: "Émulateur de serveur",
        cat: "manipulation",
        vt: 6,
        proRatingMin: 3,
        gen: false,
        desc: "La cible (persona/CI d'un serveur) interagit avec une illusion du serveur et échoue silencieusement ses actions matricielles en croyant réussir, jusqu'à une vérification d'erreurs ou un échec plus net que le test initial. Test opposé contre Intuition + Firewall. Durée Maintenue. (Hacker vaillant p.65)",
      },
      {
        name: "Fusion avec la machine",
        cat: "soutien",
        vt: "succès",
        proRatingMin: 2,
        gen: false,
        desc: "Cible à câblage de contrôle : par tranche de 2 succès, 1 dé bonus à ses tests de Pilotage, Ingénierie et défense tant qu'elle est en plongée et la forme maintenue. Technodrain = succès. Durée Maintenue. (Hacker vaillant p.65-66)",
      },
      {
        name: "Historique",
        cat: "utilitaire",
        vt: 2,
        proRatingMin: 2,
        gen: false,
        desc: "Sur succès nets, liste les actions matricielles de l'appareil sur les dernières 24 h (1 tranche par succès net), cibles identifiées seulement, sans le détail du contenu. Test opposé contre Volonté (ou indice) + Firewall. Durée Instantanée. (Hacker vaillant p.65-66)",
      },
      {
        name: "Maquillage de données",
        cat: "furtivite",
        vt: 2,
        proRatingMin: 2,
        gen: false,
        desc: "Maquille l'apparence/les attributs d'une icône (persona, appareil, CI, fichier, sprite…) ou simule un persona sur un appareil. Percevoir la Matrice ne révèle le maquillage que si son total de succès dépasse le vôtre. Durée Maintenue. (Hacker vaillant p.66)",
      },
      {
        name: "Marionnette",
        cat: "attaque",
        vt: 6,
        proRatingMin: 3,
        gen: false,
        desc: "Prend le contrôle du corps de la cible via son cyberware (test opposé contre Volonté + Firewall) ; chaque action forcée coûte majeure + mineure et réduit d'1 les succès nets restants. Le sans-fil coupé protège. Durée Maintenue. (Hacker vaillant p.66)",
      },
      {
        name: "Overclocking de cyberjack",
        cat: "soutien",
        vt: "succès",
        proRatingMin: 2,
        gen: false,
        desc: "Chaque succès ajoute 1 à l'initiative matricielle de la cible (ajout direct au résultat du jet, pas un dé d'init), tant que maintenue. Technodrain = succès. Durée Maintenue. (Hacker vaillant p.66-67)",
      },
      {
        name: "Pic à glace",
        cat: "combat",
        vt: 4,
        proRatingMin: 3,
        gen: false,
        desc: "Cible une CI : inflige des dommages matriciels égaux à l'attribut Attaque + succès nets (test opposé contre indice serveur × 2). Si la CI plante, la durée passe à Maintenue et le serveur ne peut relancer cet exemplaire tant que la forme est maintenue. Durée Instantanée/Maintenue. (Hacker vaillant p.67)",
      },
      {
        name: "Renforcement du cyberware",
        cat: "soutien",
        vt: 3,
        proRatingMin: 3,
        gen: false,
        desc: "Cible augmentée (seuil = 6 − Essence) : immunise ses augmentations à la suralimentation tant que maintenue, et annule une suralimentation en cours à l'activation. Durée Maintenue. (Hacker vaillant p.67)",
      },
      {
        name: "Rétablissement de la continuité",
        cat: "soutien",
        vt: "succès",
        proRatingMin: 2,
        gen: false,
        desc: "Répare les dommages matriciels des logiciels (agents distants, IA, faune matricielle, CI) — 1 case par succès. Sans effet sur les appareils ou les sprites. Technodrain = succès. Durée Persistante. (Hacker vaillant p.67)",
      },
      {
        name: "Technorégénération",
        cat: "soutien",
        vt: "succès",
        proRatingMin: 2,
        gen: false,
        desc: "Équivalent du sort de Soins pour l'électronique : répare 1 case de dommages matriciels par succès (appareils uniquement). L'appareil réparé fonctionne de façon erratique (1 dé libre en remplacement) jusqu'à réparation matérielle. Technodrain = succès. Durée Persistante. (Hacker vaillant p.67)",
      },
    ],
    /* Anarchy 1re (cœur p.68, 7 formes) + Anarchistes (p.66, +10 +1 gratuite).
       Régime RADICALEMENT différent (arbitrage Kernel confirmé au code) : une
       forme complexe A1 n'est PAS motorisée — elle est un Atout narratif, comme
       les SORTS d'Anarchy (`spellSkill: null` → aucun jet). On la range donc en
       `pnj.complexForms` et on l'affiche, exactement comme les sorts A1 ; la
       « voie via anarchyatouts.js » du plan ne tient pas (ce module ne collecte
       que des RR de dés parsés dans le texte d'un Atout, pas des actions).
       Le coût tokenisé (champ `vt`, comme SR5/SR6) porte ici le NIVEAU D'ATOUT
       à payer (« 2/3/4 », « 1 »…), affiché « Atout … » (anarchy1.technoCostLabel) ;
       `vt: null` pour Marionnettiste, gratuite (aucun Atout requis). Curation :
       cœur générable, Anarchistes `gen: false` (préparé pour T5, la génération
       de technos A1 n'existant pas encore). Coquille tranchée : « Pic de
       résonance » (un N — le livre imprime « résonnance » p.68, faute corrigée
       par Anarchistes lui-même). */
    anarchy1: [
      {
        name: "Dispersion",
        cat: "attaque",
        vt: "2/3/4",
        proRatingMin: 1,
        desc: "Réduit de 1/2/3 dés (selon le niveau d'Atout) la réserve d'un adversaire pour ses tests matriciels liés à la Logique, hors cybercombat. Forme d'effet (Atout, pas de jet à chaque usage).",
      },
      {
        name: "Bombe d'interférences",
        cat: "furtivite",
        vt: "2",
        proRatingMin: 1,
        desc: "Rend invisible dans la Matrice pour deux Narrations, mais les interférences alertent toutes les icônes de la zone. Forme d'effet.",
      },
      {
        name: "Infusion",
        cat: "soutien",
        vt: "2/3/4",
        proRatingMin: 1,
        desc: "Augmente de 1/2/3 dés (selon le niveau d'Atout) la réserve de la cible pour ses tests matriciels liés à la Logique, hors cybercombat (inverse de Dispersion, bénéficie un allié). Forme d'effet.",
      },
      {
        name: "Nettoyeuse",
        cat: "furtivite",
        vt: "2/3/4",
        proRatingMin: 1,
        desc: "Les 1/2/3 prochaines actions matricielles illégales du technomancien ne risquent pas de lui faire gagner de point de surveillance (DIEU). Forme d'effet.",
      },
      {
        name: "Pic de résonance",
        cat: "combat",
        vt: "1",
        proRatingMin: 1,
        desc: "Dommages matriciels 5P, Défense Logique + Firewall (test opposé de cybercombat, succès excédentaires ajoutés aux dommages). Forme de combat. (Le livre imprime « résonnance » p.68 — coquille, graphie corrigée « résonance ».)",
      },
      {
        name: "Suture",
        cat: "soutien",
        vt: "2/3/4",
        proRatingMin: 1,
        desc: "Soigne une case de dommages matriciels par succès (test simple Technomancie + Logique). Niveau 2 : un sprite ; niveau 3 : + agents et IA ; niveau 4 : + les appareils (version étendue, Anarchistes p.66). Forme d'effet.",
      },
      {
        name: "Tempête d'impulsions",
        cat: "attaque",
        vt: "3/4/5",
        proRatingMin: 2,
        desc: "Force les cibles de la zone d'effet à relancer 1/2/3 succès (selon le niveau d'Atout) sur leurs tests de Hacking ou de Technomancie. Forme d'effet.",
      },
      {
        name: "Arc réactif",
        cat: "combat",
        vt: "2/3/4",
        proRatingMin: 2,
        gen: false,
        desc: "Tant que maintenue, inflige 1/2/3 cases de dommages matriciels à tout adversaire qui touche la cible en cybercombat. Forme d'effet. (Anarchistes p.66)",
      },
      {
        name: "BTL IRL",
        cat: "soutien",
        vt: "2",
        proRatingMin: 2,
        gen: false,
        desc: "+3 dés aux tests de Perception basés sur un équipement cybernétique, mais impose de relancer un succès aux tests de Comédie et de Négociation. Forme d'effet. (Anarchistes p.66)",
      },
      {
        name: "Bulle de protection",
        cat: "soutien",
        vt: "2/3/4",
        proRatingMin: 2,
        gen: false,
        desc: "+1/2/3 dés (selon le niveau d'Atout) aux tests de défense contre les formes complexes et de cybercombat contre les sprites. Forme d'effet. (Anarchistes p.66)",
      },
      {
        name: "Ciblage de GLACE",
        cat: "utilitaire",
        vt: "1",
        proRatingMin: 2,
        gen: false,
        desc: "Empêche un serveur de relancer une GLACE qui vient d'être vaincue, tant que la forme est maintenue. Forme d'effet. (Anarchistes p.66)",
      },
      {
        name: "Cyber-saturation",
        cat: "combat",
        vt: "2/3/4",
        proRatingMin: 3,
        gen: false,
        desc: "Dommages 5P/6P/7P CA (selon le niveau d'Atout) à une cible possédant au moins un équipement cybernétique, Défense Logique + Firewall. Forme de combat. (Anarchistes p.66)",
      },
      {
        name: "Historique",
        cat: "utilitaire",
        vt: "1",
        proRatingMin: 2,
        gen: false,
        desc: "Récupère l'historique des actions (pas les données) d'un appareil ; test Technomancie + Logique contre la défense matricielle de l'appareil. Forme d'effet. (Anarchistes p.66)",
      },
      {
        name: "Infusion d'autopilote",
        cat: "soutien",
        vt: "2/3/4",
        proRatingMin: 2,
        gen: false,
        desc: "Augmente l'Autopilote d'un drone/véhicule de 1/2/3 (selon le niveau d'Atout) tant que maintenue. Forme d'effet. (Anarchistes p.66)",
      },
      {
        name: "Infusion de cyberware",
        cat: "soutien",
        vt: "2",
        proRatingMin: 2,
        gen: false,
        desc: "Augmente le niveau d'un Atout cyberware de 1 tant que maintenue. Forme d'effet. (Anarchistes p.66)",
      },
      {
        name: "Maquillage de données",
        cat: "furtivite",
        vt: "2/3/4",
        proRatingMin: 2,
        gen: false,
        desc: "Fait passer une icône pour autre chose ; test Électronique + Logique + 1/2/3 dés (selon le niveau d'Atout) contre la Perception matricielle des cibles. Forme d'effet. (Anarchistes p.66)",
      },
      {
        name: "Overclock",
        cat: "utilitaire",
        vt: "2/3/4",
        proRatingMin: 3,
        gen: false,
        desc: "En VR uniquement : niveau 2 = +1 point d'Anarchy/Scène ; niveau 3 = +1 attaque/Narration et +1 point d'Anarchy/Scène ; niveau 4 = +1 attaque/Narration et +2 points d'Anarchy/Scène. Forme d'effet. (Anarchistes p.66)",
      },
      {
        name: "Marionnettiste",
        cat: "manipulation",
        vt: null,
        proRatingMin: 1,
        gen: false,
        desc: "Forme gratuite — aucun Atout requis, tout Émergé la maîtrise nativement. Effectue une action matricielle sans le niveau d'accès requis (test Technomancie + Logique contre la défense de l'appareil, +3 dés par niveau d'accès manquant) ; indétectable pour le DIEU. Impose 2 dés de complication de technodrain. (Anarchistes p.68)",
      },
    ],
  },

  /* ========================================================
     POUVOIRS D'ADEPTE — SR5 & SR6
     ======================================================== */
  /* Liste complète vérifiée dans les livres officiels (SR6 p.158-161, SR5
     p.311-317). Seuls les pouvoirs dont l'effet est permanent et
     inconditionnel portent un `bonus` (armure, attribut, compétence,
     initiative, limite) ; les pouvoirs conditionnels/situationnels (mêlée
     uniquement, activation temporaire avec Drain, remise d'Atout limitée à
     un contexte précis...) restent en texte descriptif seul, fidèle à
     l'effet réel du livre — pas de bonus chiffré inventé pour eux. */
  pouvoirsAdepte: {
    sr6: [
      {
        name: "Armure mystique",
        desc: "+1 point d'Armure par niveau, cumulable avec l'armure portée, actif aussi en combat astral.",
        proRatingMin: 2,
        forTags: ["magique"],
        bonus: { sd: 1 },
      },
      {
        name: "Attribut physique amélioré",
        desc: "Augmentation permanente de +1 par niveau à un attribut physique choisi (CON/AGI/RÉA/FOR), au-delà du maximum naturel.",
        proRatingMin: 2,
        forTags: ["magique"],
        bonus: { attrChoice: ["CON", "AGI", "RÉA", "FOR"], val: 1 },
      },
      {
        name: "Réflexes améliorés",
        desc: "+1 dé d'initiative et +1 Réaction par niveau, permanent. Le pouvoir signature de l'adepte de combat.",
        proRatingMin: 3,
        forTags: ["magique"],
        bonus: { attr: "RÉA", val: 1, initDice: 1 },
      },
      {
        name: "Compétence améliorée",
        desc: "Augmentation permanente d'une compétence déjà connue, égale au niveau du pouvoir.",
        proRatingMin: 2,
        forTags: ["magique"],
        bonus: { skillChoice: true, val: 1 },
      },
      {
        name: "Mains mortelles",
        desc: "Les attaques à mains nues deviennent magiques (ignorent les protections non-magiques). Combat à mains nues uniquement.",
        proRatingMin: 3,
        forTags: ["magique"],
      },
      {
        name: "Course sur les murs",
        desc: "Permet de courir quelques secondes sur les surfaces verticales. Capacité de mouvement situationnelle.",
        proRatingMin: 2,
        forTags: ["magique"],
      },
      {
        name: "Sens amélioré",
        desc: "Remise d'Atout de 1 sur les tests utilisant un sens choisi (ouïe, odorat, vue...).",
        proRatingMin: 1,
        forTags: ["magique"],
      },
      {
        name: "Perception améliorée",
        desc: "Remise d'Atout de 1 pour observer attentivement ou les tests de Perception. Bonus d'Atout, pas un bonus de dé permanent.",
        proRatingMin: 1,
        forTags: ["magique"],
      },
      {
        name: "Sens du combat",
        desc: "+1 dé par niveau à tous les tests défensifs et de surprise. Uniquement en défense.",
        proRatingMin: 2,
        forTags: ["magique"],
      },
      {
        name: "Sens du danger",
        desc: "Remise d'Atout de 1 sur les tests de surprise.",
        proRatingMin: 1,
        forTags: ["magique"],
      },
      {
        name: "Précision améliorée",
        desc: "+2 au Score Offensif des armes maniées. Uniquement en attaque armée.",
        proRatingMin: 2,
        forTags: ["magique"],
      },
      {
        name: "Coup critique",
        desc: "+1 Valeur de Dommages par niveau aux attaques de mêlée. Combat rapproché uniquement.",
        proRatingMin: 2,
        forTags: ["magique"],
      },
      {
        name: "Résistance à la douleur",
        desc: "Décale d'1 case par niveau le seuil où les modificateurs de blessure s'appliquent (moniteurs physique et étourdissant).",
        proRatingMin: 2,
        forTags: ["magique"],
      },
      {
        name: "Résistance aux sorts",
        desc: "Remise d'Atout de 1 pour résister à un sort qui vous cible. Défense magique uniquement.",
        proRatingMin: 3,
        forTags: ["magique"],
      },
      {
        name: "Décharge d'adrénaline",
        desc: "+2 au score d'Initiative par niveau pendant quelques rounds, puis Drain. Bonus temporaire activé.",
        proRatingMin: 2,
        forTags: ["magique"],
      },
      {
        name: "Guérison rapide",
        desc: "+1 succès par niveau aux tests de guérison effectués sur vous. Uniquement quand on vous soigne.",
        proRatingMin: 1,
        forTags: ["magique"],
      },
      {
        name: "Contrôle corporel",
        desc: "Remise d'Atout de 1 pour résister aux tests sociaux et de perception des émotions/intentions.",
        proRatingMin: 1,
        forTags: ["magique"],
      },
      {
        name: "Contrôle vocal",
        desc: "Remise d'Atout de 1 sur les tests d'Escroquerie/Influence utilisant la voix.",
        proRatingMin: 1,
        forTags: ["magique"],
      },
      {
        name: "Passage sans traces",
        desc: "Ne laisse pas d'empreintes, ne déclenche pas les pièges à pression. Discrétion/pistage situationnel.",
        proRatingMin: 2,
        forTags: ["magique"],
      },
      {
        name: "Sens de la direction",
        desc: "Remise d'Atout de 1 sur les tests de Plein air liés à l'orientation.",
        proRatingMin: 1,
        forTags: ["magique"],
      },
      {
        name: "Perception astrale",
        desc: "Permet de percevoir et interagir avec le plan astral, devient de nature duale. Capacité activable.",
        proRatingMin: 3,
        forTags: ["magique"],
      },
      {
        name: "Augmentation d'attribut",
        desc: "Action majeure : +1 attribut physique par succès, pendant quelques rounds, puis Drain. Bonus temporaire activé.",
        proRatingMin: 2,
        forTags: ["magique"],
      },
      // ----- Smooth Operations (p.110-112) -----
      {
        name: "Ton Autoritaire",
        desc: "Voix infusée d'autorité innée, +1 dé par niveau aux tests Influence (Commandement), confère le statut Suiveur",
        proRatingMin: 2,
        forTags: ["magique"],
      },
      {
        name: "Voix Apaisante",
        desc: "Enforcit une réponse émotionnelle calmante, +1 dé par niveau aux tests Influence, peut enlever plusieurs statuts sociaux",
        proRatingMin: 2,
        forTags: ["magique"],
      },
      {
        name: "Endurance Charismatique",
        desc: "Résistance aux manipulations sociales et aux statuts, Edge temporaire en défense lors de tests sociaux opposés",
        proRatingMin: 2,
        forTags: ["magique"],
      },
      {
        name: "Sculpture Faciale",
        desc: "Modifie l'apparence du visage par manipulation osseuse/musculaire, +1 dé à Dissimuler (Déguisement) par niveau, effet soutenu pour (Magie) heures",
        proRatingMin: 2,
        forTags: ["magique"],
      },
      {
        name: "Détecteur de Mensonges",
        desc: "Détecte les mensonges, +1 par niveau aux tests Évaluer les Intentions ou assensing pour états émotionnels",
        proRatingMin: 2,
        forTags: ["magique"],
      },
      {
        name: "Contrôle des Phéromones",
        desc: "Inflige des statuts sociaux à une cible via test Charisme + Magie vs Charisme + Volonté",
        proRatingMin: 2,
        forTags: ["magique"],
      },
      {
        name: "Langue Acérée",
        desc: "Prononce une pique blessante qui cause des dégâts non résistés, peut étourdir ou donner le statut Étourdi",
        proRatingMin: 2,
        forTags: ["magique"],
      },
      {
        name: "Ventriloquie",
        desc: "Projette sa voix jusqu'à (Magie) mètres, sans apparence évidente de parole",
        proRatingMin: 2,
        forTags: ["magique"],
      },
      {
        name: "Charlatan",
        desc: "Utilise prédisposition et magie de scène pour cacher la magie, ajoute rang Con au rang Magie pour les seuils de détection, pénalité aux tests d'assensing selon rang Con",
        proRatingMin: 2,
        forTags: ["magique"],
      },
    ],
    sr5: [
      {
        name: "Armure mystique",
        desc: "+1 point d'Armure par niveau, cumulatif, ne compte pas dans l'encombrement, protège aussi en combat astral.",
        proRatingMin: 2,
        forTags: ["magique"],
        bonus: { armor: 1 },
      },
      {
        name: "Attribut physique amélioré",
        desc: "+1 par niveau à un attribut physique choisi (AGI/CON/FOR/REA), au-delà du maximum naturel (jusqu'à +4).",
        proRatingMin: 2,
        forTags: ["magique"],
        bonus: { attrChoice: ["CON", "AGI", "REA", "FOR"], val: 1 },
      },
      {
        name: "Réflexes améliorés",
        desc: "+1 Réaction et +1D6 dés d'initiative par niveau (max niveau 3), permanent. Le cœur de l'adepte martial en SR5.",
        proRatingMin: 3,
        forTags: ["magique"],
        bonus: { attr: "REA", val: 1, initDice: 1 },
      },
      {
        name: "Compétence améliorée",
        desc: "+1 par niveau à une compétence déjà connue (doit déjà avoir au moins 1 rang).",
        proRatingMin: 2,
        forTags: ["magique"],
        bonus: { skillChoice: true, val: 1 },
      },
      {
        name: "Perception améliorée",
        desc: "+1 dé par niveau à tous les tests de Perception et d'Observation astrale.",
        proRatingMin: 1,
        forTags: ["magique"],
        bonus: { skill: "Perception", val: 1 },
      },
      {
        name: "Potentiel amélioré",
        desc: "+1 à une Limite naturelle choisie (physique, mentale ou sociale).",
        proRatingMin: 2,
        forTags: ["magique"],
        bonus: { limit: "phys", val: 1 },
      },
      {
        name: "Mains mortelles",
        desc: "Attaques à mains nues magiques, contournent l'Immunité aux armes normales. Combat à mains nues uniquement.",
        proRatingMin: 3,
        forTags: ["magique"],
      },
      {
        name: "Coup critique",
        desc: "+1 Valeur de Dommages aux attaques utilisant une compétence de mêlée choisie.",
        proRatingMin: 2,
        forTags: ["magique"],
      },
      {
        name: "Course sur les murs",
        desc: "Test pour courir sur murs/surfaces verticales. Capacité situationnelle (escalade uniquement).",
        proRatingMin: 2,
        forTags: ["magique"],
      },
      {
        name: "Sens amélioré",
        desc: "Nouvelle capacité sensorielle (vision thermo/nocturne, ouïe étendue...), équivalent bio/cyberware.",
        proRatingMin: 1,
        forTags: ["magique"],
      },
      {
        name: "Sens du combat",
        desc: "+1 dé par niveau en défense contre attaques de mêlée et à distance, plus perception automatique en cas de surprise.",
        proRatingMin: 2,
        forTags: ["magique"],
      },
      {
        name: "Sens du danger",
        desc: "+1 dé par niveau aux tests de Surprise.",
        proRatingMin: 1,
        forTags: ["magique"],
      },
      {
        name: "Parade de projectiles",
        desc: "+1 dé par niveau en défense contre les projectiles lancés (flèches, couteaux, grenades). Peut capturer l'objet.",
        proRatingMin: 2,
        forTags: ["magique"],
      },
      {
        name: "Résistance à la douleur",
        desc: "Décale d'1 case par niveau le seuil des modificateurs de blessure, plus +2 dés/niveau aux tests de résistance à la souffrance.",
        proRatingMin: 2,
        forTags: ["magique"],
      },
      {
        name: "Résistance aux sorts",
        desc: "+1 dé par niveau pour résister aux sorts, magie rituelle et préparations alchimiques. Défense magique uniquement.",
        proRatingMin: 3,
        forTags: ["magique"],
      },
      {
        name: "Immunité naturelle",
        desc: "+1 dé par niveau pour résister aux toxines et maladies.",
        proRatingMin: 1,
        forTags: ["magique"],
      },
      {
        name: "Guérison rapide",
        desc: "+1 dé par niveau à Constitution pour les tests de guérison et de soin effectués sur vous.",
        proRatingMin: 1,
        forTags: ["magique"],
      },
      {
        name: "Contrôle corporel",
        desc: "+1 dé par niveau pour résister aux tests sociaux et tests de perception d'émotions/sincérité visant le personnage.",
        proRatingMin: 1,
        forTags: ["magique"],
      },
      {
        name: "Contrôle vocal",
        desc: "Imite des voix (test opposé) et +1 Limite sociale par niveau.",
        proRatingMin: 1,
        forTags: ["magique"],
      },
      {
        name: "Précision améliorée",
        desc: "+1 à la Précision des armes de la compétence choisie (sauf Combat à mains nues).",
        proRatingMin: 2,
        forTags: ["magique"],
      },
      {
        name: "Passage sans traces",
        desc: "Déplacement sans trace ni bruit, n'active pas les détecteurs de pression. Discrétion/déplacement uniquement.",
        proRatingMin: 2,
        forTags: ["magique"],
      },
      {
        name: "Poids plume",
        desc: "Améliore les tests de saut (Gymnastique) et réduit les dégâts de chute. Sauts/chutes uniquement.",
        proRatingMin: 1,
        forTags: ["magique"],
      },
      {
        name: "Perception astrale",
        desc: "Permet de percevoir et interagir avec le plan astral, devient de nature duale. Capacité activable.",
        proRatingMin: 3,
        forTags: ["magique"],
      },
      {
        name: "Décharge d'adrénaline",
        desc: "+2 au score d'Initiative par niveau pour un tour, puis Drain. Bonus temporaire activé.",
        proRatingMin: 2,
        forTags: ["magique"],
      },
      {
        name: "Augmentation d'attribut",
        desc: "Action simple, test de Magie : chaque succès +1 à un attribut choisi pendant quelques tours, puis Drain. Bonus temporaire activé.",
        proRatingMin: 2,
        forTags: ["magique"],
      },
      // ----- Grimoire des ombres (p.169-175) -----
      {
        name: "Arme élémentaire",
        desc: "Canalise un effet élémentaire (acide, feu, froid, électricité) sur les coups à mains nues. Un élément par achat.",
        proRatingMin: 2,
        forTags: ["magique"],
      },
      {
        name: "Analytique",
        desc: "Bonus par niveau pour analyser motifs, puzzles et codes lors d'un test de Perception.",
        proRatingMin: 1,
        forTags: ["magique"],
      },
      {
        name: "Bélier spirituel",
        desc: "Attaque spirituelle temporaire pour affronter les esprits, comme une Frappe élémentaire dédiée.",
        proRatingMin: 2,
        forTags: ["magique"],
      },
      {
        name: "Combat en aveugle",
        desc: "Combat efficacement même aveuglé ou privé de vision : réduit la pénalité de tir à l'aveugle.",
        proRatingMin: 2,
        forTags: ["magique"],
      },
      {
        name: "Concentration intensifiée",
        desc: "Ignore une distraction en pleine tâche : aucun modificateur sur un test d'attention complexe.",
        proRatingMin: 2,
        forTags: ["magique"],
      },
      {
        name: "Conservation de la chaleur",
        desc: "Ralentit hypothermie et affections liées au froid. Annule les modificateurs météo aux tests de Survie.",
        proRatingMin: 1,
        forTags: ["magique"],
      },
      {
        name: "Contre-attaque",
        desc: "Combat au-delà de ses limites : +score d'initiative par niveau, rend le blocage plus difficile pour l'adversaire.",
        proRatingMin: 3,
        forTags: ["magique"],
      },
      {
        name: "Contrôle de la mélanine",
        desc: "Modifie la couleur de peau et de cheveux (action complexe, dure Magie heures).",
        proRatingMin: 1,
        forTags: ["magique"],
      },
      {
        name: "Contrôle métabolique",
        desc: "Plonge dans un état de repos intense maîtrisant les fonctions métaboliques, deux avantages type hibernation.",
        proRatingMin: 2,
        forTags: ["magique"],
      },
      {
        name: "Corps élémentaire",
        desc: "Version étendue de Frappe élémentaire : champ élémental enveloppant le corps, tous les coups portent l'élément.",
        proRatingMin: 3,
        forTags: ["magique"],
      },
      {
        name: "Coup dévastateur",
        desc: "Concentre sa magie en une frappe à mains nues pour détruire des obstacles : +1 VD contre les obstacles.",
        proRatingMin: 3,
        forTags: ["magique"],
      },
      {
        name: "Dégainement éclair",
        desc: "Dégaine rapidement une arme (pistolet ou autre) en main sans pénalité de rapidité.",
        proRatingMin: 2,
        forTags: ["magique"],
      },
      {
        name: "Détection de mouvements",
        desc: "Détecte avec précision les mouvements à proximité (humains, animaux, objets) dans un rayon métrique.",
        proRatingMin: 2,
        forTags: ["magique"],
      },
      {
        name: "Doigts de fée",
        desc: "Améliore agilité et coordination manuelle : bonus par niveau aux tests d'Escamotage et de prestidigitation.",
        proRatingMin: 1,
        forTags: ["magique"],
      },
      {
        name: "Élasticité",
        desc: "Plie et tord son corps au-delà des normes métahumaines : augmente la distance de chute sans dommages par niveau.",
        proRatingMin: 1,
        forTags: ["magique"],
      },
      {
        name: "Empathie animale",
        desc: "Développe une affinité avec les animaux non-pensants : bonus par niveau aux tests liés aux Animaux.",
        proRatingMin: 1,
        forTags: ["magique"],
      },
      {
        name: "Focus vivant",
        desc: "Maintient un sort comme un focus vivant : un magicien peut le transférer à l'adepte sans plus le maintenir lui-même.",
        proRatingMin: 3,
        forTags: ["magique"],
      },
      {
        name: "Frappe déséquilibrante",
        desc: "Canalise une énergie supplémentaire dans une attaque de mêlée ou à mains nues pour déséquilibrer/immobiliser brièvement l'adversaire.",
        proRatingMin: 2,
        forTags: ["magique"],
      },
      {
        name: "Frappe élémentaire",
        desc: "Enrobe les dommages d'une attaque à mains nues d'un élément spécifique (un seul effet actif à la fois).",
        proRatingMin: 2,
        forTags: ["magique"],
      },
      {
        name: "Frappe toxique",
        desc: "Canalise pollution ou radiation à travers une attaque à mains nues, un effet toxique par achat.",
        proRatingMin: 2,
        forTags: ["magique"],
      },
      {
        name: "Frappe névalgique",
        desc: "Attaque paralysante qui neutralise temporairement l'adversaire en cas d'échec de sa résistance.",
        proRatingMin: 3,
        forTags: ["magique"],
      },
      {
        name: "Frappe pénétrante",
        desc: "Concentre une attaque à mains nues courte portée qui ignore l'armure de la cible.",
        proRatingMin: 1,
        forTags: ["magique"],
      },
      {
        name: "Froide détermination",
        desc: "Reste extrêmement confiant en interaction sociale : bonus par niveau sur les tests sociaux opposés.",
        proRatingMin: 3,
        forTags: ["magique"],
      },
      {
        name: "Glisse",
        desc: "Forme mineure de lévitation : court sur des surfaces incapables de le porter, stable dans les passages étroits.",
        proRatingMin: 3,
        forTags: ["magique"],
      },
      {
        name: "Griffe spirituelle",
        desc: "Crée temporairement une arme d'énergie spirituelle efficace contre les esprits.",
        proRatingMin: 1,
        forTags: ["magique"],
      },
      {
        name: "Contrôle de la kératine",
        desc: "Accélère la croissance de cheveux/ongles, utilisables offensivement ou défensivement.",
        proRatingMin: 2,
        forTags: ["magique"],
      },
      {
        name: "Immobilité",
        desc: "Contrôle accru du corps pour éviter d'être détecté : reste en état méditatif prolongé.",
        proRatingMin: 1,
        forTags: ["magique"],
      },
      {
        name: "Linguistique",
        desc: "Apprend de nouvelles langues plus rapidement grâce à une mémoire/imitation renforcée (coût en Karma réduit).",
        proRatingMin: 1,
        forTags: ["magique"],
      },
      {
        name: "Maîtrise corporelle",
        desc: "Version avancée de Contrôle corporel : deux adeptes communiquent par signaux non verbaux (états mentaux, messages généraux).",
        proRatingMin: 2,
        forTags: ["magique"],
      },
      {
        name: "Maîtrise des projectiles",
        desc: "Transforme des objets du quotidien (bouteilles, cartes, outils) en armes de jet : VD et Précision améliorées.",
        proRatingMin: 3,
        forTags: ["magique"],
      },
      {
        name: "Mémoire tridimensionnelle",
        desc: "Enregistre mentalement une zone visitée pour la remémorer en détail via un test de Perception + Magie.",
        proRatingMin: 2,
        forTags: ["magique"],
      },
    ],
  },

  /* ========================================================
     TRAITS / QUALITÉS
     ======================================================== */
  traits: {
    sr6: [
      {
        name: "Réflexes de combat",
        desc: "Réagit instantanément au danger : bonus aux tests de surprise et d'initiative. Le vétéran qui dégaine en premier.",
        proRatingMin: 2,
        forTags: ["combat", "militaire", "police", "ombre"],
        bonus: { initDice: 1 },
      },
      {
        name: "Sang-froid",
        desc: "Garde son calme sous le feu : résiste à l'intimidation et à la peur. Rien ne le fait flancher.",
        proRatingMin: 1,
        forTags: ["tous"],
        bonus: { stat: "composure", val: 1 },
      },
      {
        name: "Réputation des rues",
        desc: "Connu et respecté dans les Ombres. Ouvre certaines portes et en ferme d'autres.",
        proRatingMin: 2,
        forTags: ["crime", "ombre", "gang", "rue"],
      },
      {
        name: "Contacts haut placés",
        desc: "Dispose de relations dans les corpos ou l'administration. Un atout politique discret.",
        proRatingMin: 3,
        forTags: ["corpo", "crime", "police"],
      },
      {
        name: "Toxicomanie",
        desc: "Dépendant à une substance : à la fois une faiblesse exploitable et un levier de manipulation.",
        proRatingMin: 0,
        forTags: ["rue", "gang", "crime"],
      },
      {
        name: "Code d'honneur",
        desc: "Suit des règles personnelles strictes. Prévisible, mais d'une loyauté à toute épreuve.",
        proRatingMin: 1,
        forTags: ["militaire", "crime", "combat"],
      },
      {
        name: "Paranoïa",
        desc: "Méfiant à l'extrême, ne baisse jamais sa garde. Survit là où les autres tombent.",
        proRatingMin: 1,
        forTags: ["ombre", "crime"],
      },
      {
        name: "Mémoire eidétique",
        desc: "Se souvient de tout avec une précision parfaite. Inestimable pour un planificateur.",
        proRatingMin: 2,
        forTags: ["matrice", "corpo", "magique"],
        bonus: { stat: "memory", val: 1 },
      },
    ],
    sr5: [
      {
        name: "Réflexes de combat",
        desc: "Bonus d'Initiative et de résistance à la surprise. Le réflexe du survivant aguerri.",
        proRatingMin: 2,
        forTags: ["combat", "militaire", "police", "ombre"],
        bonus: { initDice: 1 },
      },
      {
        name: "Volonté de fer",
        desc: "Résistance accrue aux manipulations mentales et à l'intimidation. Un esprit qu'on ne plie pas.",
        proRatingMin: 1,
        forTags: ["tous"],
        bonus: { stat: "composure", val: 2 },
      },
      {
        name: "Célébrité des rues",
        desc: "Réputation établie dans le milieu : facilite les contacts mais attire l'attention.",
        proRatingMin: 2,
        forTags: ["crime", "ombre", "gang", "rue"],
      },
      {
        name: "Relations corpo",
        desc: "Carnet d'adresses dans les hautes sphères corporatistes. Un levier d'influence rare.",
        proRatingMin: 3,
        forTags: ["corpo", "crime", "police"],
      },
      {
        name: "Accoutumance",
        desc: "Dépendance à une substance ou un stimulant : une vulnérabilité que les ennemis exploitent.",
        proRatingMin: 0,
        forTags: ["rue", "gang", "crime"],
      },
      {
        name: "Code d'honneur",
        desc: "Obéit à un code strict qui dicte sa conduite. Fiable, mais lisible par qui le connaît.",
        proRatingMin: 1,
        forTags: ["militaire", "crime", "combat"],
      },
      {
        name: "Prudence maladive",
        desc: "Toujours sur ses gardes, vérifie tout deux fois. La paranoïa qui sauve des vies.",
        proRatingMin: 1,
        forTags: ["ombre", "crime"],
      },
      {
        name: "Esprit analytique",
        desc: "Aptitude remarquable à décortiquer données et situations complexes. L'atout du stratège.",
        proRatingMin: 2,
        forTags: ["matrice", "corpo", "magique"],
        bonus: { stat: "memory", val: 2 },
      },
    ],
  },

  /* ========================================================
     API — sélection cohérente, indexée par édition
     ======================================================== */

  _ed(ed) {
    return App.getEditionModule(ed) ? ed : "sr6";
  },

  _match(item, tags) {
    if (item.forTags && item.forTags.includes("tous")) return true;
    return item.forTags ? item.forTags.some((p) => tags.has(p)) : true;
  },

  _eligible(list, proRating, tags) {
    return (list || []).filter(
      (it) => proRating >= it.proRatingMin && this._match(it, tags),
    );
  },

  _sample(pool, n) {
    const copy = [...pool];
    const out = [];
    const seen = new Set();
    let guard = 0;
    while (out.length < n && copy.length && guard < 200) {
      guard++;
      const idx = Utils.randInt(0, copy.length - 1);
      const item = copy.splice(idx, 1)[0];
      if (item && !seen.has(item.name)) {
        seen.add(item.name);
        out.push(item);
      }
    }
    return out;
  },

  /**
   * Choisit des sorts cohérents forTags un éveillé de l'édition.
   * `preferredCats` (optionnel) : catégories ("combat"/"sante"/"detection"/
   * "illusion"/"manipulation") détectées sur la spécialisation du
   * personnage ou un équipement (focus) qui lui donne RR sur une
   * catégorie de sorts — surclasse le biais générique par tags quand
   * fourni, pour que le tirage colle à ce que le PNJ sait réellement
   * bien faire plutôt qu'à son seul archétype.
   */
  pickSorts(ed, proRating, tags, preferredCats) {
    ed = this._ed(ed);
    const list = this.spells[ed] || [];
    const eligible = list.filter((s) => proRating >= s.proRatingMin);
    if (!eligible.length) return [];
    const n = Utils.clamp(2 + Math.floor(proRating / 2), 2, 6);
    let pool = eligible;
    const preferred =
      preferredCats && preferredCats.length
        ? eligible.filter((s) => preferredCats.includes(s.cat))
        : tags.has("combat") || tags.has("militaire") || tags.has("gang")
          ? eligible.filter((s) => s.cat === "combat")
          : [];
    if (preferred.length) {
      const autres = eligible.filter((s) => !preferred.includes(s));
      pool = preferred.concat(preferred, autres);
    }
    return this._sample(pool, Math.min(n, eligible.length));
  },

  /** Choisit des pouvoirs d'adepte (SR5/SR6 ; Anarchy renvoie vide). */
  pickPouvoirs(ed, proRating, n = 2) {
    ed = this._ed(ed);
    const list = this.pouvoirsAdepte[ed] || [];
    const pool = list.filter((p) => proRating >= p.proRatingMin);
    const picks = this._sample(pool, Math.min(n, pool.length));
    // « Réflexes améliorés » (+1 RÉA, +1D6 initiative) : garanti dès la cote 3
    // pour que l'adepte de combat tire ses dés d'un pouvoir réel, et non de
    // l'ancien +2 codé en dur (supprimé du calcul d'init).
    if (proRating >= 3) {
      const reflexes = pool.find((p) => p.name === "Réflexes améliorés");
      if (reflexes && !picks.includes(reflexes)) {
        if (picks.length >= n) picks[picks.length - 1] = reflexes;
        else picks.push(reflexes);
      }
    }
    return picks;
  },

  /** Choisit des traits cohérents avec l'édition et l'archétype. */
  pickTraits(ed, tags, proRating, n = 1) {
    ed = this._ed(ed);
    const list = this.traits[ed] || [];
    const pool = this._eligible(list, proRating, tags);
    return this._sample(pool, Math.min(n, pool.length));
  },

  /* ========================================================
     API — catalogues de choix manuel (édition d'un PNJ existant),
     distincts des « pick » ci-dessus (tirage aléatoire à la génération).
     Source unique pour les 4 éditions : la taxonomie à 5 catégories de
     sorts est partagée (combat/detection/sante/illusion/manipulation),
     pas de duplication par module d'édition.
     ======================================================== */

  spellCatLabels: {
    combat: "Combat",
    detection: "Détection",
    sante: "Santé",
    illusion: "Illusion",
    manipulation: "Manipulation",
  },

  /** Catalogue de sorts groupé par catégorie, pour un sélecteur manuel
      (EditModal). `null` si l'édition n'a pas de sorts catalogués. */
  spellCatalogFor(ed) {
    ed = this._ed(ed);
    const list = this.spells[ed];
    if (!list || !list.length) return null;
    const byCat = new Map();
    for (const sp of list) {
      if (!byCat.has(sp.cat)) byCat.set(sp.cat, []);
      byCat.get(sp.cat).push({ id: sp.name, label: sp.name });
    }
    return [...byCat.entries()].map(([cat, items]) => ({
      category: this.spellCatLabels[cat] || cat,
      items,
    }));
  },

  /** Ajoute un sort du catalogue à `pnj.spells` par son nom (référence de
      l'objet catalogue, en lecture seule ensuite — cf. diceroller/magicaction
      qui ne font que `.find(s => s.name === ...)`). */
  addSpellItem(pnj, ed, name) {
    ed = this._ed(ed);
    const entry = (this.spells[ed] || []).find((s) => s.name === name);
    if (!entry) return;
    pnj.spells = pnj.spells || [];
    pnj.spells.push(entry);
  },

  /* ---- Formes complexes (technomanciens, T2) — mêmes 3 gestes que les
     sorts (catalogue/pick/add), jumelés ici plutôt qu'éclatés dans le
     fichier pour une nouvelle donnée. Voir le commentaire sur
     `complexForms` plus haut pour le détail des champs. ---- */

  complexFormCatLabels: {
    combat: "Combat",
    attaque: "Attaque",
    furtivite: "Furtivité",
    manipulation: "Manipulation",
    soutien: "Soutien",
    utilitaire: "Utilitaire",
  },

  MATRIX_ATTR_LABELS: {
    attack: "Attaque",
    sleaze: "Corruption",
    dataProcessing: "Traitement de données",
    firewall: "Firewall",
  },

  /** Résout une entrée paramétrée (Dispersion/Injection) vers une forme
      concrète : `attr` fourni (édition manuelle) ou tiré au sort
      (génération). Les entrées non paramétrées passent inchangées. */
  _resolveComplexForm(entry, attr) {
    if (!entry.attrs) return entry;
    const a = entry.attrs.includes(attr) ? attr : entry.attrs[Utils.randInt(0, entry.attrs.length - 1)];
    const label = this.MATRIX_ATTR_LABELS[a] || a;
    // Élision ("d'Attaque", pas "de Attaque") : seul "Attaque" démarre par
    // une voyelle parmi les 4 labels, mais autant traiter le cas plutôt que
    // de le laisser passer en fausse note pour la seule qui l'a.
    const article = /^[aeiouéèêà]/i.test(label) ? `d'${label}` : `de ${label}`;
    return { ...entry, attr: a, name: entry.name.replace("de [Attribut matriciel]", article) };
  },

  /** Catalogue de formes complexes groupé par `cat` (facette d'interface,
      cf. commentaire sur `complexForms`), pour un sélecteur manuel
      (EditModal). `null` si l'édition n'a pas de formes cataloguées
      (SR6/Anarchy 1 : à venir : Anarchy 2 : jamais, verdict d'absence). */
  complexFormCatalogFor(ed) {
    ed = this._ed(ed);
    const list = this.complexForms[ed];
    if (!list || !list.length) return null;
    const byCat = new Map();
    for (const f of list) {
      if (!byCat.has(f.cat)) byCat.set(f.cat, []);
      byCat.get(f.cat).push({ id: f.name, label: f.name, attrs: f.attrs || null });
    }
    return [...byCat.entries()].map(([cat, items]) => ({
      category: this.complexFormCatLabels[cat] || cat,
      items,
    }));
  },

  /** Choisit des formes complexes cohérentes pour un technomancien généré
      (mirroir `pickSorts`). `gen: false` exclut une entrée du tirage sans la
      retirer du catalogue exhaustif — asymétrie catalogue/générateur voulue,
      mise en œuvre d'abord en SR6 (cœur générable, Hacker vaillant catalogue
      seul). */
  pickComplexForms(ed, proRating) {
    ed = this._ed(ed);
    const list = this.complexForms[ed] || [];
    const eligible = list.filter((f) => proRating >= f.proRatingMin && f.gen !== false);
    if (!eligible.length) return [];
    const n = Utils.clamp(2 + Math.floor(proRating / 2), 2, 6);
    return this._sample(eligible, Math.min(n, eligible.length)).map((f) => this._resolveComplexForm(f));
  },

  /** Ajoute une forme du catalogue à `pnj.complexForms` par son nom.
      `attr` requis pour Dispersion/Injection (ignoré sinon). */
  addComplexFormItem(pnj, ed, name, attr) {
    ed = this._ed(ed);
    const entry = (this.complexForms[ed] || []).find((f) => f.name === name);
    if (!entry) return;
    pnj.complexForms = pnj.complexForms || [];
    pnj.complexForms.push(this._resolveComplexForm(entry, attr));
  },

  /** Catalogue plat de pouvoirs d'adepte (pas de catégorie dans
      `pouvoirsAdepte`). `null` pour les éditions sans concept d'adepte
      séparé (Anarchy 1/2 — cf. pickPouvoirs). */
  powerCatalogFor(ed) {
    ed = this._ed(ed);
    const list = this.pouvoirsAdepte[ed];
    if (!list || !list.length) return null;
    return list.map((p) => ({ id: p.name, label: p.name }));
  },

  /** Ajoute un pouvoir d'adepte du catalogue à `pnj.powers` par son nom
      (référence de l'objet catalogue — lu par BonusEngine._sumListBonus,
      jamais muté ensuite). */
  addPowerItem(pnj, ed, name) {
    ed = this._ed(ed);
    const entry = (this.pouvoirsAdepte[ed] || []).find((p) => p.name === name);
    if (!entry) return;
    pnj.powers = pnj.powers || [];
    pnj.powers.push(entry);
  },
};

// Pont couche 2 (migration modules ES) — retiré en fin de migration.
window.Content = Content;
