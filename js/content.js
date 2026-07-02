"use strict";

/* ============================================================
   CONTENT — base d'aléas cohérents pour les PNJ, INDEXÉE PAR
   ÉDITION (sr5, sr6, anarchy). Chaque édition a ses propres
   listes et ses propres descriptifs, fidèles à ses livres.

   Sources :
     SR6 : livre de base (Grimoire de sorts BBESR6A03, p.136-172)
     SR5 : livre de base (Sorcellerie p.283-301) + Grimoire des ombres
     Anarchy : livre de base (catalogue de sorts p.68-69) — système à
       2 types (sort d'effet / sort de combat) et Niveau variable, pas
       de Drain numérique fixe ni de 5 catégories comme SR5/SR6. Le champ
       `cat` reste une classification maison (pas dans le livre) utilisée
       pour le tirage cohérent avec la spécialisation/l'archétype du PNJ.

   Entrée : { nom, desc, profMin, pour[], (drain|level), cat }
   profMin = professionnalisme minimum (cohérence). "tous" = universel.
   Tags : combat, corpo, police, crime, militaire, rue, ombre,
          magique, matrice, tech, gang, civil.
   ============================================================ */

const Content = {
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
    ],

    // ----- ANARCHY (livre de base, catalogue de sorts p.68-69) -----
    // Système à 2 types (sort d'effet / sort de combat), pas de Drain
    // numérique : le lanceur choisit un Niveau (2 à 5 selon l'ampleur
    // souhaitée pour les sorts variables). `cat` est une classification
    // maison (le livre n'a que 2 types) utilisée pour le tirage cohérent
    // avec la spécialisation Sorcellerie / les focus du PNJ.
    anarchy: [
      {
        name: "Boule de feu",
        cat: "combat",
        type: "combat",
        level: "2",
        proRatingMin: 1,
        desc: "Sort de combat indirect en zone : 6P, Défense Agilité+Logique. Embrase une zone et tout ce qui s'y trouve.",
      },
      {
        name: "Éclair mana",
        cat: "combat",
        type: "combat",
        level: "2",
        proRatingMin: 1,
        desc: "Sort de combat direct sur une cible unique : 6P, Défense Force+Volonté. Le sort de base de tout mago des rues.",
      },
      {
        name: "Flot d'acide",
        cat: "combat",
        type: "combat",
        level: "2",
        proRatingMin: 1,
        desc: "Sort de combat indirect : 6P, Défense Agilité+Logique, +2 dommages contre l'Armure de la cible.",
      },
      {
        name: "Foudre",
        cat: "combat",
        type: "combat",
        level: "3",
        proRatingMin: 2,
        desc: "Sort de combat indirect : 6P, Défense Agilité+Logique, relance un échec au jet d'attaque.",
      },
      {
        name: "Éclair étourdissant",
        cat: "combat",
        type: "combat",
        level: "4",
        proRatingMin: 2,
        desc: "Sort de combat direct : 8E, Défense Force+Volonté. Neutralise sans tuer.",
      },
      {
        name: "Sens du combat",
        cat: "combat",
        type: "effet",
        level: "2/3/4",
        proRatingMin: 1,
        desc: "Sort d'effet maintenu : +1/2/3 dés en défense au combat selon le niveau choisi.",
      },
      {
        name: "Soins",
        cat: "sante",
        type: "effet",
        level: "2",
        proRatingMin: 1,
        desc: "Le seul sort de santé instantané : referme les blessures d'une cible touchée (Sorcellerie+Volonté). Les autres soins se maintiennent dans le temps.",
      },
      {
        name: "Antidote",
        cat: "sante",
        type: "effet",
        level: "1",
        proRatingMin: 0,
        desc: "Élimine les effets d'une toxine présente dans l'organisme de la cible.",
      },
      {
        name: "Augmentation de réflexes",
        cat: "sante",
        type: "effet",
        level: "2/3/4",
        proRatingMin: 1,
        desc: "Maintenu, imite les atouts d'augmentation d'initiative. À 3 : +1 point d'Anarchy par scène d'action ; à 5 : une action de plus par narration.",
      },
      {
        name: "Résistance à la douleur",
        cat: "sante",
        type: "effet",
        level: "2/3/4",
        proRatingMin: 1,
        desc: "Sort d'effet maintenu : permet d'ignorer 1/2/3 dés de modificateur de blessure selon le niveau.",
      },
      {
        name: "Diagnostic",
        cat: "detection",
        type: "effet",
        level: "1",
        proRatingMin: 0,
        desc: "Révèle l'état de santé d'une cible d'un coup d'œil magique.",
      },
      {
        name: "Détection de la magie",
        cat: "detection",
        type: "effet",
        level: "1",
        proRatingMin: 0,
        desc: "Rend visible toute magie active à proximité : focus, sorts maintenus, réactifs.",
      },
      {
        name: "Détection des ennemis",
        cat: "detection",
        type: "effet",
        level: "1",
        proRatingMin: 0,
        desc: "Localise les intentions hostiles dirigées vers le sujet, à portée intermédiaire. Gare aux barrières mana qui bloquent la détection sans le signaler.",
      },
      {
        name: "Clairvoyance",
        cat: "detection",
        type: "effet",
        level: "1",
        proRatingMin: 0,
        desc: "Permet de voir un lieu distant comme si on y était.",
      },
      {
        name: "Analyse de véracité",
        cat: "detection",
        type: "effet",
        level: "1",
        proRatingMin: 0,
        desc: "Détecte si la cible ment consciemment pendant qu'elle parle.",
      },
      {
        name: "Invisibilité",
        cat: "illusion",
        type: "effet",
        level: "2/3/4",
        proRatingMin: 1,
        desc: "Sort d'illusion maintenu : relance 1/2/3 échecs sur les tests de Furtivité de la cible selon le niveau.",
      },
      {
        name: "Invisibilité de masse",
        cat: "illusion",
        type: "effet",
        level: "3/4/5",
        proRatingMin: 2,
        desc: "Comme Invisibilité, mais protège tout un groupe à la fois.",
      },
      {
        name: "Masque",
        cat: "illusion",
        type: "effet",
        level: "2/3/4",
        proRatingMin: 1,
        desc: "Altère l'apparence de la cible pour la faire passer pour une autre : relance 1/2/3 échecs de Comédie selon le niveau.",
      },
      {
        name: "Confusion",
        cat: "illusion",
        type: "effet",
        level: "2/3/4",
        proRatingMin: 1,
        desc: "Déferlement d'images perturbatrices : -1/2/3 dés à tous les tests de la cible selon le niveau.",
      },
      {
        name: "Illusion",
        cat: "illusion",
        type: "effet",
        level: "2/3/4",
        proRatingMin: 1,
        desc: "Crée une illusion crédible qui perturbe les tests visés : -1/2/3 dés selon le niveau, tant qu'elle reste plausible.",
      },
      {
        name: "Monde chaotique",
        cat: "illusion",
        type: "effet",
        level: "3/4/5",
        proRatingMin: 2,
        desc: "Plonge une zone entière dans la confusion : force la cible à relancer des succès déjà obtenus.",
      },
      {
        name: "Armure",
        cat: "manipulation",
        type: "effet",
        level: "2/3/4",
        proRatingMin: 1,
        desc: "Sort de manipulation maintenu : +3/6/9 cases d'Armure selon le niveau choisi.",
      },
      {
        name: "Armure de flammes",
        cat: "manipulation",
        type: "effet",
        level: "3",
        proRatingMin: 2,
        desc: "Comme Armure (+3), mais brûle quiconque touche la cible en corps à corps.",
      },
      {
        name: "Barrière",
        cat: "manipulation",
        type: "effet",
        level: "2/3/4",
        proRatingMin: 1,
        desc: "Crée une barrière magique de Blindage 3/6/9 selon le niveau, pour bloquer ou se protéger.",
      },
      {
        name: "Contrôle des pensées",
        cat: "manipulation",
        type: "effet",
        level: "2/3/4",
        proRatingMin: 1,
        desc: "Insinue des suggestions dans l'esprit de la cible : +1/2/3 dés en Intimidation ou Négociation contre elle selon le niveau.",
      },
      {
        name: "Accident",
        cat: "manipulation",
        type: "effet",
        level: "3",
        proRatingMin: 2,
        desc: "Impose un dé de complication sur 2 tests de la cible par Tour, par petites malchances magiquement provoquées.",
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
    anarchy: [
      {
        name: "Réflexes de tueur",
        desc: "Toujours prêt à frapper le premier. Avantage narratif au combat et dans les situations tendues.",
        proRatingMin: 2,
        forTags: ["combat", "militaire", "police", "ombre"],
      },
      {
        name: "Nerfs d'acier",
        desc: "Garde la tête froide quand tout part en vrille. Résiste à la pression et à la peur.",
        proRatingMin: 1,
        forTags: ["tous"],
      },
      {
        name: "Réputation",
        desc: "Un nom qui résonne dans les Ombres : ouvre des portes, mais ne passe jamais inaperçu.",
        proRatingMin: 2,
        forTags: ["crime", "ombre", "gang", "rue"],
      },
      {
        name: "Carnet d'adresses",
        desc: "Connaît les bonnes personnes dans les bons milieux. Un atout social qui sert souvent.",
        proRatingMin: 3,
        forTags: ["corpo", "crime", "police"],
      },
      {
        name: "Vice tenace",
        desc: "Une dépendance qui le ronge : faille de caractère qui colore le personnage et l'expose.",
        proRatingMin: 0,
        forTags: ["rue", "gang", "crime"],
      },
      {
        name: "Loyauté farouche",
        desc: "Une parole donnée est sacrée. Prévisible pour ses proches, dangereux pour ceux qui le trahissent.",
        proRatingMin: 1,
        forTags: ["militaire", "crime", "combat"],
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
    return this._sample(pool, Math.min(n, pool.length));
  },

  /** Choisit des traits cohérents avec l'édition et l'archétype. */
  pickTraits(ed, tags, proRating, n = 1) {
    ed = this._ed(ed);
    const list = this.traits[ed] || [];
    const pool = this._eligible(list, proRating, tags);
    return this._sample(pool, Math.min(n, pool.length));
  },
};
