"use strict";

/* ============================================================
   CONTENT — base d'aléas cohérents pour les PNJ, INDEXÉE PAR
   ÉDITION (sr5, sr6, anarchy). Chaque édition a ses propres
   listes et ses propres descriptifs, fidèles à ses livres.

   Sources :
     SR6 : livre de base + Grimoire de sorts + Voies occultes
     SR5 : livre de base + Grimoire des ombres + Run & Gun
     Anarchy : Shadowrun Anarchy 2.0 (système simplifié, sans Drain)

   Entrée : { nom, desc, profMin, pour[], (drain|seuil), cat }
   profMin = professionnalisme minimum (cohérence). "tous" = universel.
   Tags : combat, corpo, police, crime, militaire, rue, ombre,
          magique, matrice, tech, gang, civil.
   ============================================================ */

const Content = {
  /* ========================================================
     SORTS
     ======================================================== */
  sorts: {
    // ----- SR6 (Grimoire de sorts BBESR6A03) -----
    sr6: [
      {
        nom: "Éclair étourdissant",
        cat: "combat",
        drain: 3,
        profMin: 1,
        desc: "Canalise le mana pour étourdir une cible à distance (dommages E). Idéal pour neutraliser sans tuer. Portée LdV, Type M, durée Instantanée.",
      },
      {
        nom: "Sphère étourdissante",
        cat: "combat",
        drain: 4,
        profMin: 2,
        desc: "Version à effet de zone : assomme tout un groupe d'un coup. Portée LdV (Z), Type M, durée Instantanée.",
      },
      {
        nom: "Éclair de force",
        cat: "combat",
        drain: 4,
        profMin: 2,
        desc: "Version extrême de Frappe à distance, inflige des dommages physiques à une cible. Portée LdV, Type P.",
      },
      {
        nom: "Toucher mortel",
        cat: "combat",
        drain: 3,
        profMin: 1,
        desc: "Canalise une puissance destructrice dans la cible au contact, dommages physiques par le mana pur. Type M, Instantané.",
      },
      {
        nom: "Éclair mana",
        cat: "combat",
        drain: 4,
        profMin: 2,
        desc: "Modèle le mana pour briser les crânes à distance. N'affecte qu'une cible vivante. Type M, Portée LdV.",
      },
      {
        nom: "Trait de feu",
        cat: "combat",
        drain: 5,
        profMin: 2,
        desc: "Un classique : projette du feu, dommages élémentaires de Feu et état Enflammé. Type P, Portée LdV.",
      },
      {
        nom: "Sphère de feu",
        cat: "combat",
        drain: 6,
        profMin: 3,
        desc: "Trait de feu en zone : embrase toute une aire et impose Enflammé. Gare aux matériaux combustibles. Type P, LdV (Z).",
      },
      {
        nom: "Explosion infernale",
        cat: "combat",
        drain: 8,
        profMin: 4,
        desc: "Même potentiel qu'une Sphère de feu, mais peut aussi imposer Corrodé. Le sort de combat le plus dévastateur. Type P, LdV (Z).",
      },
      {
        nom: "Lance de glace",
        cat: "combat",
        drain: 5,
        profMin: 2,
        desc: "Frappe d'un froid glacial : dommages de Froid et état Frigorifié. Pour les ennemis en sous-vêtements ignifuges. Type P, LdV.",
      },
      {
        nom: "Foudre",
        cat: "combat",
        drain: 5,
        profMin: 2,
        desc: "Ce que Zeus et Thor réservaient aux imprudents : dommages d'Électricité et état Électrocuté. Type P, Portée LdV.",
      },
      {
        nom: "Coup de tonnerre",
        cat: "combat",
        drain: 6,
        profMin: 3,
        desc: "Onde de choc sonore : dommages plus Désorienté et Assourdi pour les créatures alentour. Type P, Portée LdV.",
      },
      {
        nom: "Soins",
        cat: "sante",
        drain: 3,
        profMin: 1,
        desc: "La méthode la plus rapide pour refermer bosses et blessures par balle : 1 case de dommages récupérée par succès net. Type P, Permanente.",
      },
      {
        nom: "Stabilisation",
        cat: "sante",
        drain: 2,
        profMin: 1,
        desc: "Quand quelqu'un a encaissé du surplus : récupère 1 case de surplus par succès net et stabilise le mourant. Type P.",
      },
      {
        nom: "Augmentation de réflexes",
        cat: "sante",
        drain: 5,
        profMin: 2,
        desc: "Accélère la cible : Réaction et dés d'initiative en hausse (jusqu'à +5 dés), donc des actions mineures en plus. Type P.",
      },
      {
        nom: "Augmentation d'attribut",
        cat: "sante",
        drain: 3,
        profMin: 2,
        desc: "Le toucher du mage renforce temporairement un attribut (max +4). N'affecte ni Atout, ni Essence, ni Magie. Type P.",
      },
      {
        nom: "Antidote",
        cat: "sante",
        drain: 5,
        profMin: 2,
        desc: "Du mana parcourt le corps pour purger les toxines : chaque succès réduit la Virulence d'un point. Type P.",
      },
      {
        nom: "Résistance à la douleur",
        cat: "sante",
        drain: 3,
        profMin: 1,
        desc: "Ne soigne pas mais permet d'ignorer les dommages : réduit le malus de blessures. Type M, durée Maintenue.",
      },
      {
        nom: "Détection de la vie",
        cat: "detection",
        drain: 3,
        profMin: 1,
        desc: "Des gens cachés derrière ces décombres ? Ce sort le dit : détecte les êtres conscients à portée. Type M, Maintenue.",
      },
      {
        nom: "Clairvoyance",
        cat: "detection",
        drain: 3,
        profMin: 1,
        desc: "Le sujet voit à distance, à travers murs et obstacles, dans une zone qu'il peut déplacer. Type M, Maintenue.",
      },
      {
        nom: "Sonde mentale",
        cat: "detection",
        drain: 5,
        profMin: 3,
        desc: "Pénètre l'esprit d'une cible pour lire pensées et souvenirs ; avec assez de succès, atteint l'inconscient. Type P.",
      },
      {
        nom: "Analyse de la véracité",
        cat: "detection",
        drain: 3,
        profMin: 1,
        desc: "Le sujet sent si la cible dit la vérité, ou croit la dire. Il doit entendre directement les paroles. Type M.",
      },
      {
        nom: "Détection de la magie",
        cat: "detection",
        drain: 4,
        profMin: 2,
        desc: "Alerte dès qu'une magie active est à portée : focus, sorts, réactifs, esprits, rituels. Type M, Maintenue.",
      },
      {
        nom: "Invisibilité",
        cat: "illusion",
        drain: 3,
        profMin: 2,
        desc: "La cible devient transparente : état Invisible, seuil à atteindre pour la voir. N'affecte que les êtres vivants. Type M.",
      },
      {
        nom: "Masque",
        cat: "illusion",
        drain: 3,
        profMin: 2,
        desc: "Modifie apparence, odeur et voix d'une personne. Parfait pour usurper une identité. N'affecte que le vivant. Type M.",
      },
      {
        nom: "Confusion",
        cat: "illusion",
        drain: 3,
        profMin: 1,
        desc: "Déferlement d'images et d'émotions : la cible subit l'état Confus et un malus à ses tests. Type M, Portée LdV.",
      },
      {
        nom: "Silence",
        cat: "illusion",
        drain: 3,
        profMin: 1,
        desc: "La cible ne peut plus émettre le moindre bruit, même volontairement. Idéal pour l'infiltration. Type M, Maintenue.",
      },
      {
        nom: "Armure",
        cat: "manipulation",
        drain: 4,
        profMin: 2,
        desc: "Imprègne le corps de la cible : ajoute les succès nets au Score Défensif. Type P, durée Maintenue.",
      },
      {
        nom: "Lévitation",
        cat: "manipulation",
        drain: 6,
        profMin: 3,
        desc: "Pas tout à fait voler, mais un défi à la gravité : 50 kg levés par succès. La cible doit rester en LdV. Type P.",
      },
      {
        nom: "Contrôle des pensées",
        cat: "manipulation",
        drain: 4,
        profMin: 4,
        desc: "Entre dans la tête de la cible pour lui imposer sa volonté, de façon insidieuse. Type M, durée Limitée.",
      },
      {
        nom: "Barrière physique",
        cat: "manipulation",
        drain: 6,
        profMin: 3,
        desc: "Crée un mur d'indice de Structure égal à Magie + succès. Pour bloquer ou se protéger. Type P, LdV (Z).",
      },
      {
        nom: "Poings de pierre",
        cat: "manipulation",
        drain: 5,
        profMin: 2,
        desc: "Les poings de la cible deviennent durs comme la pierre : dommages 3P et Score Offensif augmenté. Type P, Maintenue.",
      },
    ],

    // ----- SR5 (livre de base + Grimoire des ombres) -----
    sr5: [
      {
        nom: "Boule étourdissante",
        cat: "combat",
        drain: 3,
        profMin: 1,
        desc: "Sort de « sommeil » : canalise un pouvoir destructeur directement dans la cible, dommages étourdissants pour assommer sans tuer. Direct, Type M, Drain P.",
      },
      {
        nom: "Manaboule",
        cat: "combat",
        drain: 3,
        profMin: 2,
        desc: "Canalise une puissance destructrice dans les cibles d'une zone, dommages physiques par mort cellulaire. N'affecte que le vivant. Direct, Type M.",
      },
      {
        nom: "Éclair mana",
        cat: "combat",
        drain: 2,
        profMin: 1,
        desc: "Trait de mana destructeur sur une cible : dommages physiques par mort cellulaire. S'agissant d'un sort mana, n'affecte que le vivant. Direct, Type M.",
      },
      {
        nom: "Boule de feu",
        cat: "combat",
        drain: 5,
        profMin: 3,
        desc: "Projette une boule de flammes dans une zone : dommages élémentaires de Feu pouvant tout enflammer. Indirect, élémentaire, Type P, CDV (Z).",
      },
      {
        nom: "Lance-flammes",
        cat: "combat",
        drain: 4,
        profMin: 2,
        desc: "Jaillissement de feu sur une cible unique : dommages élémentaires de Feu avec risque d'embrasement. Indirect, élémentaire, Type P, CDV.",
      },
      {
        nom: "Éclair",
        cat: "combat",
        drain: 3,
        profMin: 2,
        desc: "Décharge électrique : dommages élémentaires d'Électricité, peut faire chuter et perturber l'électronique. Indirect, élémentaire, Type P.",
      },
      {
        nom: "Flot acide",
        cat: "combat",
        drain: 3,
        profMin: 2,
        desc: "Projette de l'acide corrosif : dommages physiques et corrosion de l'armure et de l'équipement. Indirect, élémentaire, Type P, CDV.",
      },
      {
        nom: "Frappe",
        cat: "combat",
        drain: 1,
        profMin: 0,
        desc: "Coup d'air comprimé au contact : dommages étourdissants par pure force concussive. Indirect, Type P, Drain P-6.",
      },
      {
        nom: "Soins",
        cat: "sante",
        drain: 3,
        profMin: 1,
        desc: "Soigne les blessures physiques : récupère des cases de dommages selon les succès. Sans effet sur l'étourdissant. Santé, Type M, Permanente.",
      },
      {
        nom: "Augmentation de réflexes",
        cat: "sante",
        drain: 4,
        profMin: 2,
        desc: "Augmente l'Initiative (un dé d'Initiative par paire de succès). Un seul sort de ce type à la fois. Santé, Type M, Maintenue.",
      },
      {
        nom: "Stabilisation",
        cat: "sante",
        drain: 3,
        profMin: 1,
        desc: "Maintient les fonctions vitales et empêche de mourir : la Puissance doit égaler le surplus encaissé. Santé, Maintenue puis Permanente.",
      },
      {
        nom: "Soins purificateurs",
        cat: "sante",
        drain: 4,
        profMin: 2,
        desc: "Neutralise maladies et infections en plus de soigner. Une magie de guérison plus exigeante. Santé, Type M.",
      },
      {
        nom: "Détection de la vie",
        cat: "detection",
        drain: 3,
        profMin: 1,
        desc: "Révèle la présence des êtres vivants conscients à portée sensorielle, même cachés. Actif, directionnel, Type M, Maintenue.",
      },
      {
        nom: "Clairvoyance",
        cat: "detection",
        drain: 3,
        profMin: 1,
        desc: "Le sujet voit des scènes distantes comme s'il y était, depuis un point déplaçable à portée. Passif, directionnel, Type M.",
      },
      {
        nom: "Sonde mentale",
        cat: "detection",
        drain: 3,
        profMin: 3,
        desc: "Sonde l'esprit d'une cible pour en extraire pensées et souvenirs, couche par couche selon les succès. Type M.",
      },
      {
        nom: "Analyse de la vérité",
        cat: "detection",
        drain: 2,
        profMin: 1,
        desc: "Permet de savoir si la cible ment consciemment. Le sujet doit entendre directement les déclarations. Passif, psychique, Type M.",
      },
      {
        nom: "Agonie",
        cat: "illusion",
        drain: 3,
        profMin: 2,
        desc: "Favori des magiciens en difficulté : inflige l'illusion d'une terrible douleur, chaque succès ajoutant un malus paralysant. Réaliste, unisensorielle, Type M.",
      },
      {
        nom: "Invisibilité",
        cat: "illusion",
        drain: 3,
        profMin: 2,
        desc: "Rend le sujet invisible aux yeux des observateurs vivants : la perception devient un test opposé. Réaliste, unisensorielle, Type M, CDV.",
      },
      {
        nom: "Fantasme tridéo",
        cat: "illusion",
        drain: 4,
        profMin: 2,
        desc: "Crée une illusion plurisensorielle convaincante d'un objet, d'une créature ou d'une scène, dans une zone. Réaliste, Type P, CDV (Z).",
      },
      {
        nom: "Silence physique",
        cat: "illusion",
        drain: 3,
        profMin: 2,
        desc: "Crée une zone qui amortit les sons, réduisant aussi les attaques soniques. Indispensable à une infiltration discrète. Réaliste, Type P, CDV (Z).",
      },
      {
        nom: "Armure",
        cat: "manipulation",
        drain: 3,
        profMin: 2,
        desc: "Crée un champ d'énergie magique étincelante autour du sujet, le protégeant contre les dommages physiques. Physique, Type P, Maintenue, Drain P-2.",
      },
      {
        nom: "Lévitation",
        cat: "manipulation",
        drain: 4,
        profMin: 3,
        desc: "Soulève et déplace une cible ou un objet dans les airs ; la victime peut résister par un test opposé. Physique, Type P, Maintenue.",
      },
      {
        nom: "Contrôle des pensées",
        cat: "manipulation",
        drain: 5,
        profMin: 4,
        desc: "Soumet l'esprit de la cible à la volonté du magicien : elle résiste chaque tour par Logique + Volonté. Mental, Type M, Maintenue.",
      },
      {
        nom: "Éclair physique",
        cat: "manipulation",
        drain: 4,
        profMin: 3,
        desc: "Manipule l'environnement pour projeter de la matière comme une arme contondante télékinétique. Physique, Type P.",
      },
    ],

    // ----- ANARCHY (Shadowrun Anarchy 2.0) : seuil au lieu de Drain -----
    anarchy: [
      {
        nom: "Boule de feu",
        cat: "combat",
        seuil: 3,
        profMin: 2,
        desc: "Sort de combat indirect : embrase une zone et tout ce qui s'y trouve. Esprits et créatures résistantes aux armes physiques n'y échappent pas. Test simple, seuil selon l'ampleur.",
      },
      {
        nom: "Manaboule",
        cat: "combat",
        seuil: 3,
        profMin: 2,
        desc: "Sort de combat direct : le mana frappe les formes vivantes et astrales d'une zone, inutile contre véhicules et structures. Utilisable dans l'astral.",
      },
      {
        nom: "Éclair",
        cat: "combat",
        seuil: 2,
        profMin: 1,
        desc: "Décharge électrique sur une cible unique. Sort de combat direct rapide, parfait pour neutraliser un adversaire isolé.",
      },
      {
        nom: "Flèche de mana",
        cat: "combat",
        seuil: 2,
        profMin: 1,
        desc: "Trait de mana sur une cible vivante : dommages directs ignorant l'armure physique. Le sort de base de tout mago des rues.",
      },
      {
        nom: "Soins",
        cat: "sante",
        seuil: 2,
        profMin: 1,
        desc: "Le seul sort de santé instantané : referme les blessures d'une cible touchée. Les autres soins se maintiennent dans le temps.",
      },
      {
        nom: "Augmentation de réflexes",
        cat: "sante",
        seuil: 3,
        profMin: 2,
        desc: "Maintenu, il imite les atouts d'augmentation d'initiative. À 3 succès : +1 point d'Anarchy par scène d'action ; à 5 succès : une action de plus par narration.",
      },
      {
        nom: "Détection de la vie",
        cat: "detection",
        seuil: 2,
        profMin: 1,
        desc: "Repère les êtres vivants conscients alentour. Gare aux barrières mana, qui bloquent la détection sans le signaler clairement.",
      },
      {
        nom: "Sonde mentale",
        cat: "detection",
        seuil: 3,
        profMin: 3,
        desc: "Fouille les tréfonds de l'âme d'une cible consciente pour y trouver n'importe quelle information. Si désagréable que beaucoup l'assimilent à de la torture.",
      },
      {
        nom: "Invisibilité",
        cat: "illusion",
        seuil: 3,
        profMin: 2,
        desc: "Sort d'illusion qui masque la cible aux sens des observateurs. Une illusion crédible doit rester plausible pour tromper vraiment.",
      },
      {
        nom: "Silence",
        cat: "illusion",
        seuil: 2,
        profMin: 1,
        desc: "Masque la cible au sens de l'ouïe : plus aucun bruit ne la trahit. Indispensable pour une approche discrète.",
      },
      {
        nom: "Masque",
        cat: "illusion",
        seuil: 3,
        profMin: 2,
        desc: "Altère l'apparence de la cible pour la faire passer pour une autre. Plus l'illusion est plausible, plus elle dure face à un public méfiant.",
      },
      {
        nom: "Armure",
        cat: "manipulation",
        seuil: 2,
        profMin: 2,
        desc: "Sort de manipulation maintenu : renforce la cible d'un champ protecteur qui encaisse une partie des dommages.",
      },
      {
        nom: "Lévitation",
        cat: "manipulation",
        seuil: 3,
        profMin: 3,
        desc: "Soulève une cible ou un objet dans les airs et le déplace. Sort de manipulation maintenu, très utile pour franchir les obstacles.",
      },
    ],
  },

  /* ========================================================
     ARMES
     ======================================================== */
  /* Les armes portent un champ `stats` (VD + caractéristiques classiques),
     pas de description : pickArme renvoie une chaîne « Nom [stats] » affichée
     telle quelle, sans modale. */
  armes: {
    sr6: {
      legere: [
        {
          nom: "Fichetti Security 600",
          stats: "VD 2P, SA, 30(c)",
          profMin: 0,
          pour: ["tous"],
        },
        {
          nom: "Ares Light Fire 75",
          stats: "VD 2P, SA, silencieux, 16(c)",
          profMin: 1,
          pour: ["ombre", "corpo", "crime"],
        },
      ],
      lourde: [
        {
          nom: "Ares Predator VI",
          stats: "VD 3P, SA, smartgun, 15(c)",
          profMin: 1,
          pour: ["combat", "ombre", "crime", "militaire", "police"],
        },
        {
          nom: "Colt Manhunter",
          stats: "VD 3P, SA, 16(c)",
          profMin: 1,
          pour: ["corpo", "police", "militaire"],
        },
        {
          nom: "Ruger Super Warhawk",
          stats: "VD 3P, CA, 6(cy)",
          profMin: 2,
          pour: ["combat", "crime", "gang"],
        },
      ],
      fusil: [
        {
          nom: "AK-97",
          stats: "VD 3P, SA/RC/FA, 38(c)",
          profMin: 2,
          pour: ["militaire", "gang", "combat", "crime"],
        },
        {
          nom: "Ares Alpha",
          stats: "VD 3P, SA/RC/FA, lance-grenades, 42(c)",
          profMin: 4,
          pour: ["militaire", "combat"],
        },
        {
          nom: "Ingram Smartgun X",
          stats: "VD 2P, RC/FA, smartgun, 32(c)",
          profMin: 3,
          pour: ["ombre", "militaire", "crime"],
        },
      ],
      melee: [
        {
          nom: "Couteau de combat",
          stats: "VD (FOR+1)P",
          profMin: 0,
          pour: ["tous"],
        },
        {
          nom: "Katana",
          stats: "VD (FOR+3)P",
          profMin: 2,
          pour: ["combat", "crime", "ombre", "militaire"],
        },
        {
          nom: "Matraque télescopique",
          stats: "VD (FOR+2)E",
          profMin: 0,
          pour: ["police", "corpo", "rue"],
        },
      ],
    },

    sr5: {
      legere: [
        {
          nom: "Fichetti Security 600",
          stats: "PRE 6(7), VD 7P, PA —, SA, 30(c)",
          profMin: 0,
          pour: ["tous"],
        },
        {
          nom: "Colt America L36",
          stats: "VD 7P, PA —, SA, 11(c)",
          profMin: 0,
          pour: ["rue", "gang", "civil"],
        },
      ],
      lourde: [
        {
          nom: "Ares Predator V",
          stats: "PRE 5(7), VD 8P, PA -1, SA, 15(c)",
          profMin: 1,
          pour: ["combat", "ombre", "crime", "militaire", "police"],
        },
        {
          nom: "Remington Roomsweeper",
          stats: "VD 9P (flêchette), PA -1, SA, 8(m)",
          profMin: 2,
          pour: ["gang", "crime", "combat"],
        },
      ],
      fusil: [
        {
          nom: "AK-97",
          stats: "VD 10P, PA -6, SA/TR/TA, 38(c)",
          profMin: 2,
          pour: ["militaire", "gang", "combat", "crime"],
        },
        {
          nom: "Ares Alpha",
          stats: "PRE 5(7), VD 11P, PA -2, SA/TR/TA, 42(c)",
          profMin: 4,
          pour: ["militaire", "combat"],
        },
        {
          nom: "Ingram Smartgun X",
          stats: "PRE 4(5), VD 8P, PA —, SA/TR, 32(c)",
          profMin: 3,
          pour: ["ombre", "militaire", "crime"],
        },
      ],
      melee: [
        {
          nom: "Couteau de combat",
          stats: "PRE 6, Allonge —, VD (FOR+2)P, PA -2",
          profMin: 0,
          pour: ["tous"],
        },
        {
          nom: "Katana",
          stats: "PRE 6, Allonge 1, VD (FOR+3)P, PA -3",
          profMin: 2,
          pour: ["combat", "crime", "ombre", "militaire"],
        },
        {
          nom: "Aiguillon",
          stats: "VD 9S(e), PA -5, étourdissant, 10 charges",
          profMin: 1,
          pour: ["police", "corpo", "rue"],
        },
      ],
    },

    anarchy: {
      legere: [
        {
          nom: "Pistolet léger",
          stats: "VD 4, [OK/OK/Dés./–]",
          profMin: 0,
          pour: ["tous"],
        },
      ],
      lourde: [
        {
          nom: "Pistolet lourd",
          stats: "VD 5, [OK/OK/Dés./–]",
          profMin: 1,
          pour: ["combat", "ombre", "crime", "militaire", "police"],
        },
        {
          nom: "Revolver lourd",
          stats: "VD 5, [OK/OK/Dés./–]",
          profMin: 2,
          pour: ["combat", "crime", "gang"],
        },
      ],
      fusil: [
        {
          nom: "Fusil d'assaut",
          stats: "VD 6, [Dés./OK/OK/–]",
          profMin: 2,
          pour: ["militaire", "gang", "combat", "crime"],
        },
        {
          nom: "Pistolet-mitrailleur",
          stats: "VD 5, [OK/OK/Dés./–]",
          profMin: 3,
          pour: ["ombre", "militaire", "crime"],
        },
      ],
      melee: [
        {
          nom: "Couteau",
          stats: "VD 4, [OK/–/–/–]",
          profMin: 0,
          pour: ["tous"],
        },
        {
          nom: "Katana",
          stats: "VD 5, [OK/–/–/–]",
          profMin: 2,
          pour: ["combat", "crime", "ombre", "militaire"],
        },
      ],
    },
  },

  /* ========================================================
     POUVOIRS D'ADEPTE — SR5 & SR6
     ======================================================== */
  pouvoirsAdepte: {
    sr6: [
      {
        nom: "Réflexes améliorés",
        desc: "Augmente Réaction et dés d'initiative. Le pouvoir signature de l'adepte de combat : agir avant tout le monde.",
        profMin: 3,
        pour: ["magique"],
      },
      {
        nom: "Frappe mortelle",
        desc: "Décuple les dégâts à mains nues : l'adepte devient une arme létale sans rien tenir.",
        profMin: 3,
        pour: ["magique"],
      },
      {
        nom: "Course sur les murs",
        desc: "Permet de courir quelques secondes sur les surfaces verticales. Mobilité acrobatique surhumaine.",
        profMin: 2,
        pour: ["magique"],
      },
      {
        nom: "Sens accru",
        desc: "Affûte un sens (ouïe, odorat, vue) au-delà du possible métahumain. Idéal pour percevoir l'imperceptible.",
        profMin: 1,
        pour: ["magique"],
      },
      {
        nom: "Carrure imposante",
        desc: "Renforce la Force pour les exploits athlétiques. Puissance brute canalisée par le mana.",
        profMin: 2,
        pour: ["magique"],
      },
      {
        nom: "Pare-balles",
        desc: "Le corps de l'adepte encaisse les impacts comme une armure vivante. Pouvoir de haut niveau coûteux.",
        profMin: 4,
        pour: ["magique"],
      },
      {
        nom: "Visage caméléon",
        desc: "Modifie subtilement les traits pour se fondre dans une foule. Précieux pour l'infiltration.",
        profMin: 2,
        pour: ["magique"],
      },
      {
        nom: "Voix de velours",
        desc: "Charisme magnétique qui facilite chaque manipulation sociale. L'adepte de la persuasion.",
        profMin: 1,
        pour: ["magique"],
      },
    ],
    sr5: [
      {
        nom: "Réflexes adeptes",
        desc: "Augmente l'Initiative et offre des passes d'action supplémentaires. Le cœur de l'adepte martial en SR5.",
        profMin: 3,
        pour: ["magique"],
      },
      {
        nom: "Frappe meurtrière",
        desc: "Augmente la Valeur de Dommages des attaques à mains nues. Le poing de l'adepte vaut une arme.",
        profMin: 3,
        pour: ["magique"],
      },
      {
        nom: "Course sur les murs",
        desc: "Défie la gravité en courant sur les parois verticales sur de courtes distances. Mobilité de prédateur urbain.",
        profMin: 2,
        pour: ["magique"],
      },
      {
        nom: "Perception accrue",
        desc: "Améliore tous les tests de Perception : l'adepte remarque ce que les autres ratent.",
        profMin: 1,
        pour: ["magique"],
      },
      {
        nom: "Augmentation d'attribut (AGI)",
        desc: "Élève l'Agilité au-delà de la limite métahumaine naturelle. Vitesse et précision décuplées.",
        profMin: 2,
        pour: ["magique"],
      },
      {
        nom: "Peau de pierre",
        desc: "Renforce la résistance aux dommages comme une armure naturelle. Pouvoir défensif coûteux.",
        profMin: 4,
        pour: ["magique"],
      },
      {
        nom: "Masque mystique",
        desc: "Brouille les souvenirs des témoins sur l'apparence de l'adepte. Parfait pour disparaître.",
        profMin: 2,
        pour: ["magique"],
      },
      {
        nom: "Magnétisme",
        desc: "Aura de charisme surnaturel qui facilite l'influence sociale. L'adepte qui séduit les foules.",
        profMin: 1,
        pour: ["magique"],
      },
    ],
  },

  /* ========================================================
     TRAITS / QUALITÉS
     ======================================================== */
  traits: {
    sr6: [
      {
        nom: "Réflexes de combat",
        desc: "Réagit instantanément au danger : bonus aux tests de surprise et d'initiative. Le vétéran qui dégaine en premier.",
        profMin: 2,
        pour: ["combat", "militaire", "police", "ombre"],
      },
      {
        nom: "Sang-froid",
        desc: "Garde son calme sous le feu : résiste à l'intimidation et à la peur. Rien ne le fait flancher.",
        profMin: 1,
        pour: ["tous"],
      },
      {
        nom: "Réputation des rues",
        desc: "Connu et respecté dans les Ombres. Ouvre certaines portes et en ferme d'autres.",
        profMin: 2,
        pour: ["crime", "ombre", "gang", "rue"],
      },
      {
        nom: "Contacts haut placés",
        desc: "Dispose de relations dans les corpos ou l'administration. Un atout politique discret.",
        profMin: 3,
        pour: ["corpo", "crime", "police"],
      },
      {
        nom: "Toxicomanie",
        desc: "Dépendant à une substance : à la fois une faiblesse exploitable et un levier de manipulation.",
        profMin: 0,
        pour: ["rue", "gang", "crime"],
      },
      {
        nom: "Code d'honneur",
        desc: "Suit des règles personnelles strictes. Prévisible, mais d'une loyauté à toute épreuve.",
        profMin: 1,
        pour: ["militaire", "crime", "combat"],
      },
      {
        nom: "Paranoïa",
        desc: "Méfiant à l'extrême, ne baisse jamais sa garde. Survit là où les autres tombent.",
        profMin: 1,
        pour: ["ombre", "crime"],
      },
      {
        nom: "Mémoire eidétique",
        desc: "Se souvient de tout avec une précision parfaite. Inestimable pour un planificateur.",
        profMin: 2,
        pour: ["matrice", "corpo", "magique"],
      },
    ],
    sr5: [
      {
        nom: "Réflexes de combat",
        desc: "Bonus d'Initiative et de résistance à la surprise. Le réflexe du survivant aguerri.",
        profMin: 2,
        pour: ["combat", "militaire", "police", "ombre"],
      },
      {
        nom: "Volonté de fer",
        desc: "Résistance accrue aux manipulations mentales et à l'intimidation. Un esprit qu'on ne plie pas.",
        profMin: 1,
        pour: ["tous"],
      },
      {
        nom: "Célébrité des rues",
        desc: "Réputation établie dans le milieu : facilite les contacts mais attire l'attention.",
        profMin: 2,
        pour: ["crime", "ombre", "gang", "rue"],
      },
      {
        nom: "Relations corpo",
        desc: "Carnet d'adresses dans les hautes sphères corporatistes. Un levier d'influence rare.",
        profMin: 3,
        pour: ["corpo", "crime", "police"],
      },
      {
        nom: "Accoutumance",
        desc: "Dépendance à une substance ou un stimulant : une vulnérabilité que les ennemis exploitent.",
        profMin: 0,
        pour: ["rue", "gang", "crime"],
      },
      {
        nom: "Code d'honneur",
        desc: "Obéit à un code strict qui dicte sa conduite. Fiable, mais lisible par qui le connaît.",
        profMin: 1,
        pour: ["militaire", "crime", "combat"],
      },
      {
        nom: "Prudence maladive",
        desc: "Toujours sur ses gardes, vérifie tout deux fois. La paranoïa qui sauve des vies.",
        profMin: 1,
        pour: ["ombre", "crime"],
      },
      {
        nom: "Esprit analytique",
        desc: "Aptitude remarquable à décortiquer données et situations complexes. L'atout du stratège.",
        profMin: 2,
        pour: ["matrice", "corpo", "magique"],
      },
    ],
    anarchy: [
      {
        nom: "Réflexes de tueur",
        desc: "Toujours prêt à frapper le premier. Avantage narratif au combat et dans les situations tendues.",
        profMin: 2,
        pour: ["combat", "militaire", "police", "ombre"],
      },
      {
        nom: "Nerfs d'acier",
        desc: "Garde la tête froide quand tout part en vrille. Résiste à la pression et à la peur.",
        profMin: 1,
        pour: ["tous"],
      },
      {
        nom: "Réputation",
        desc: "Un nom qui résonne dans les Ombres : ouvre des portes, mais ne passe jamais inaperçu.",
        profMin: 2,
        pour: ["crime", "ombre", "gang", "rue"],
      },
      {
        nom: "Carnet d'adresses",
        desc: "Connaît les bonnes personnes dans les bons milieux. Un atout social qui sert souvent.",
        profMin: 3,
        pour: ["corpo", "crime", "police"],
      },
      {
        nom: "Vice tenace",
        desc: "Une dépendance qui le ronge : faille de caractère qui colore le personnage et l'expose.",
        profMin: 0,
        pour: ["rue", "gang", "crime"],
      },
      {
        nom: "Loyauté farouche",
        desc: "Une parole donnée est sacrée. Prévisible pour ses proches, dangereux pour ceux qui le trahissent.",
        profMin: 1,
        pour: ["militaire", "crime", "combat"],
      },
    ],
  },

  /* ========================================================
     API — sélection cohérente, indexée par édition
     ======================================================== */

  _ed(ed) {
    return ed === "sr5" || ed === "sr6" || ed === "anarchy" ? ed : "sr6";
  },

  _match(item, tags) {
    if (item.pour && item.pour.includes("tous")) return true;
    return item.pour ? item.pour.some((p) => tags.has(p)) : true;
  },

  _eligible(list, prof, tags) {
    return (list || []).filter(
      (it) => prof >= it.profMin && this._match(it, tags),
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
      if (item && !seen.has(item.nom)) {
        seen.add(item.nom);
        out.push(item);
      }
    }
    return out;
  },

  /** Choisit une arme cohérente pour l'édition, l'archétype et le prof. */
  pickArme(ed, tags, prof) {
    ed = this._ed(ed);
    const armes = this.armes[ed] || {};
    let cats;
    if (tags.has("militaire") || tags.has("combat"))
      cats = ["fusil", "lourde", "melee"];
    else if (tags.has("gang")) cats = ["lourde", "fusil", "melee"];
    else if (tags.has("ombre") || tags.has("crime"))
      cats = ["lourde", "legere", "melee"];
    else if (tags.has("police") || tags.has("corpo"))
      cats = ["lourde", "fusil", "melee"];
    else if (tags.has("magique")) cats = ["legere", "melee"];
    else cats = ["legere", "melee"];

    let pool = [];
    for (const c of cats) {
      pool = pool.concat(this._eligible(armes[c] || [], prof, tags));
    }
    if (!pool.length) pool = this._eligible(armes.legere || [], prof, tags);
    if (!pool.length) return null;
    const arme = Utils.rand(pool);
    // Renvoie une chaîne « Nom [stats] » affichée telle quelle dans
    // l'Équipement (pas de modale, VD directement lisible).
    return arme.stats ? `${arme.nom} [${arme.stats}]` : arme.nom;
  },

  /** Choisit des sorts cohérents pour un éveillé de l'édition. */
  pickSorts(ed, prof, tags) {
    ed = this._ed(ed);
    const list = this.sorts[ed] || [];
    const eligible = list.filter((s) => prof >= s.profMin);
    if (!eligible.length) return [];
    const n = Utils.clamp(2 + Math.floor(prof / 2), 2, 6);
    const combat = eligible.filter((s) => s.cat === "combat");
    const autres = eligible.filter((s) => s.cat !== "combat");
    let pool = eligible;
    if (
      (tags.has("combat") || tags.has("militaire") || tags.has("gang")) &&
      combat.length
    ) {
      pool = combat.concat(combat, autres);
    }
    return this._sample(pool, Math.min(n, eligible.length));
  },

  /** Choisit des pouvoirs d'adepte (SR5/SR6 ; Anarchy renvoie vide). */
  pickPouvoirs(ed, prof, n = 2) {
    ed = this._ed(ed);
    const list = this.pouvoirsAdepte[ed] || [];
    const pool = list.filter((p) => prof >= p.profMin);
    return this._sample(pool, Math.min(n, pool.length));
  },

  /** Choisit des traits cohérents avec l'édition et l'archétype. */
  pickTraits(ed, tags, prof, n = 1) {
    ed = this._ed(ed);
    const list = this.traits[ed] || [];
    const pool = this._eligible(list, prof, tags);
    return this._sample(pool, Math.min(n, pool.length));
  },
};
