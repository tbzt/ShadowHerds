"use strict";

/* ============================================================
   INFECTÉS (goules, vampires, etc.) — sélectionnables comme un
   métatype/une métavariante.

   Sources vérifiées (voir aussi /home/thomas/Claude/Projects/ShadowHerds/
   INDEX-DONNEES-VERIFIEES.md) :
   - SR6 : Compagnon du Sixième Monde (BBE, fr), chapitre « Personnages
     infectés », p.102-113. 18 types, modificateurs d'attributs (deltas
     ajoutés au maximum du métatype/de la métaconscience de base — voir
     js/metavariants.js pour Centaure/Naga/Sasquatch/Triton).
   - SR5 : Run Faster (BBE, fr), table « Attributs des métatypes Infectés »
     p.105 + fiches p.106-111. 4 types (Goule, Loup-garou, Vampire,
     Wendigo). Le livre imprime des plages absolues par métatype hôte, pas
     des deltas explicites : les modificateurs ci-dessous sont dérivés en
     comparant ces plages à `EditionSR5.attrRange` — vérifiés cohérents sur
     les 5 métatypes standard (même delta quel que soit l'hôte, seul le
     minimum reste celui du métatype de base). Les autres types couverts
     uniquement par Howling Shadows (CAT27008, anglais, sans traduction
     française officielle, fiches à stats absolues plutôt que deltas) ne
     sont pas repris ici : Bandersnatch/Banshee/Gobelin/Grendel/Rongeur/
     Harvester/Mutaqua/Nosferatu/Dzoo-noo-qua/Fomóraig.
   - Anarchy : aucune règle Infecté dans les livres disponibles — non
     couvert.

   Schéma par type :
   - baseMetatypes : métatype(s) ou métaconscience(s) hôte(s) possibles
     (un seul tiré au hasard si plusieurs, ex. Goule = tous)
   - attrMod : deltas ajoutés au maximum de la souche/métaconscience hôte
   - bonus : effet mécanique simple, appliqué comme un bonus de trait
     (voir BonusEngine) — {initDice}, {armor} (SR5, → pnj.armure) et/ou
     {sd} (SR6, → pnj.sdBase) uniquement, le reste des pouvoirs reste
     descriptif
   - powersFixed / powersOptional (1 tiré au hasard) / weaknesses :
     texte affiché tel quel
   - naturalWeapons : chaînes au format arme déjà utilisé par l'édition
   ============================================================ */

const Infected = {
  sr6: {
    Bandersnatch: {
      baseMetatypes: ["Sasquatch"],
      attrMod: { CON: 1, AGI: 0, RÉA: 1, FOR: 2, VOL: 2, LOG: -1, INT: 2, CHA: -2 },
      powersFixed: ["Arme naturelle (Griffes, Crocs)", "Coloration adaptative", "Conscience"],
      powersOptional: ["Armes naturelles acérées (Griffes)", "Biosonar", "Course sur les murs"],
      weaknesses: ["Allergie (lumière du soleil, Légère)", "Charisme -1", "Exigence alimentaire (chair métahumaine)", "Logique -1"],
      naturalWeapons: [
        "Griffes [VD 3P, SO 7+FOR/–/–/–/–]",
        "Crocs [VD 4P, SO 6+FOR/–/–/–/–, Infection]",
      ],
    },
    Banshee: {
      baseMetatypes: ["Elfe"],
      attrMod: { CON: 1, AGI: 2, RÉA: 1, FOR: 1, VOL: 1, LOG: 0, INT: 1, CHA: 1 },
      bonus: { initDice: 1 },
      powersFixed: ["Arme naturelle (Crocs)", "Conscience", "Drain d'Essence", "Immunité (vieillissement)", "Infection", "Nature duale", "+2 à la vitesse de déplacement de base"],
      powersOptional: ["Forme brumeuse", "Hurlement paralysant", "Immunité (pathogènes, toxines)", "Peur", "Régénération", "Sens accrus (ouïe, odorat)"],
      weaknesses: ["Allergie (lumière du soleil, Grave)", "Exigence alimentaire (sang métahumain)", "Perte d'Essence", "Vulnérabilité (argent)", "Vulnérabilité (bois)"],
      naturalWeapons: ["Crocs [VD 4P, SO 6+FOR/–/–/–/–, Infection]"],
    },
    Chiron: {
      baseMetatypes: ["Centaure"],
      attrMod: { CON: 1, AGI: 0, RÉA: 0, FOR: 1, VOL: 0, LOG: 0, INT: 0, CHA: -1 },
      bonus: { initDice: 1 },
      powersFixed: ["Arme naturelle (Crocs)", "Compulsion", "Conscience", "Drain d'Essence", "Infection", "Influence", "Nature duale", "Régénération"],
      powersOptional: ["Armes naturelles acérées (sabots)", "Immunité (pathogènes, toxines, vieillissement)", "Sort inné (Contrôle des pensées des foules)"],
      weaknesses: ["Allergie (lumière du soleil, Grave)", "Exigence alimentaire (chair métahumaine)", "Perte d'Essence", "Vulnérabilité (venin d'hydre)"],
      naturalWeapons: ["Crocs [VD 4P, SO 6+FOR/–/–/–/–, Infection]"],
    },
    "Dzoo-noo-qua": {
      baseMetatypes: ["Troll"],
      attrMod: { CON: 2, AGI: 0, RÉA: 2, FOR: 2, VOL: 1, LOG: 0, INT: 2, CHA: 0 },
      bonus: { initDice: 1, sd: 1 },
      powersFixed: ["Arme naturelle (Griffes, Crocs)", "Armure 1", "Conscience", "Drain d'Essence", "Immunité (vieillissement)", "Infection", "Nature duale", "+2 à la vitesse de déplacement de base"],
      powersOptional: ["Armes naturelles acérées (Griffes)", "Armure +1", "Garde magique (personnelle uniquement)", "Immunité (toxines)", "Régénération", "Résistance aux sorts", "Sens accrus (ouïe)"],
      weaknesses: ["Allergie (lumière du soleil, Modérée)", "Exigence alimentaire (chair métahumaine)", "Perte d'Essence", "Logique -1", "Charisme -1"],
      naturalWeapons: [
        "Griffes [VD 3P, SO 7+FOR/–/–/–/–]",
        "Crocs [VD 4P, SO 6+FOR/–/–/–/–, Infection]",
      ],
    },
    Faucheur: {
      baseMetatypes: ["Elfe"],
      attrMod: { CON: 2, AGI: 0, RÉA: 3, FOR: 3, VOL: 1, LOG: -2, INT: 2, CHA: -4 },
      bonus: { initDice: 1, sd: 2 },
      powersFixed: ["Arme naturelle (Griffes, Crocs)", "Armure 2", "Conscience", "Mouvement (personnelle uniquement)", "Nature duale", "Sens accrus (vision thermographique)", "+2 à la vitesse de déplacement de base"],
      powersOptional: ["Sort inné (Fantasme supérieur)"],
      weaknesses: ["Allergie (argent, Modérée)", "Allergie (lumière du soleil, Modérée)", "Exigence alimentaire (chair métahumaine)", "Logique -1", "Charisme -1"],
      naturalWeapons: [
        "Griffes [VD 4P, SO 7+FOR/–/–/–/–]",
        "Crocs [VD 4P, SO 6+FOR/–/–/–/–, Infection]",
      ],
    },
    Fomóraig: {
      baseMetatypes: ["Troll"],
      attrMod: { CON: 3, AGI: 0, RÉA: 1, FOR: 3, VOL: -2, LOG: -1, INT: 2, CHA: 0 },
      bonus: { sd: 1 },
      powersFixed: ["Arme naturelle (Griffes, Crocs)", "Armure 1", "Conscience", "Garde magique (personnelle uniquement)", "Nature duale", "Sécrétion corrosive"],
      powersOptional: ["Armure +1", "Branchies (eau douce, eau de mer)", "Crachat corrosif"],
      weaknesses: ["Allergie (lumière du soleil, Modérée)", "Allergie (pollution atmosphérique, Modérée)", "Exigence alimentaire (chair métahumaine)", "Logique -1"],
      naturalWeapons: [
        "Griffes [VD 3P, SO 7+FOR/–/–/–/–]",
        "Crocs [VD 4P, SO 6+FOR/–/–/–/–, Infection]",
      ],
    },
    Gobelin: {
      baseMetatypes: ["Nain"],
      attrMod: { CON: 1, AGI: 0, RÉA: 2, FOR: 1, VOL: 1, LOG: -2, INT: 2, CHA: -1 },
      bonus: { initDice: 1 },
      powersFixed: ["Arme naturelle (Griffes, Crocs)", "Conscience", "Drain d'Essence", "Immunité (vieillissement)", "Infection", "Nature duale", "+2 à la vitesse de déplacement de base"],
      powersOptional: ["Immunité (feu, toxines)", "Régénération", "Sens accrus (odorat, goût)"],
      weaknesses: ["Allergie (lumière du soleil, Modérée)", "Exigence alimentaire (chair métahumaine)", "Perte d'Essence", "Vulnérabilité (fer)", "Logique -1", "Charisme -1"],
      naturalWeapons: [
        "Griffes [VD 4P, SO 7+FOR/–/–/–/–]",
        "Crocs [VD 4P, SO 6+FOR/–/–/–/–, Infection]",
      ],
    },
    Goule: {
      baseMetatypes: ["Humain", "Elfe", "Nain", "Ork", "Troll"],
      attrMod: { CON: 4, AGI: 0, RÉA: 2, FOR: 3, VOL: 2, LOG: -1, INT: 1, CHA: -2 },
      bonus: { sd: 1 },
      powersFixed: ["Arme naturelle (Griffes, Crocs)", "Armure 1", "Conscience", "Nature duale", "Robuste 2", "Sens accrus (ouïe, odorat)"],
      powersOptional: [],
      weaknesses: ["Allergie (lumière du soleil, Modérée)", "Exigence alimentaire (chair métahumaine)", "Sens réduit (aveugle)", "Logique -1", "Charisme -1"],
      naturalWeapons: [
        "Griffes [VD 3P, SO 7+FOR/–/–/–/–]",
        "Crocs [VD 4P, SO 6+FOR/–/–/–/–, Infection]",
      ],
    },
    Grendel: {
      baseMetatypes: ["Ork"],
      attrMod: { CON: 2, AGI: 0, RÉA: 1, FOR: 3, VOL: 1, LOG: -1, INT: 1, CHA: -1 },
      powersFixed: ["Arme naturelle (Griffes, Crocs)", "Conscience", "Contrôle animal (créatures souterraines)", "Dissimulation (personnelle uniquement)", "Nature duale", "Sens accrus (odorat, vision thermographique)", "Toucher paralysant"],
      powersOptional: [],
      weaknesses: ["Allergie (lumière du soleil, Modérée)", "Exigence alimentaire (chair métahumaine)", "Logique -1", "Charisme -1"],
      naturalWeapons: [
        "Griffes [VD 3P, SO 7+FOR/–/–/–/–]",
        "Crocs [VD 4P, SO 6+FOR/–/–/–/–, Infection]",
      ],
    },
    Jabberwock: {
      baseMetatypes: ["Sasquatch"],
      attrMod: { CON: 0, AGI: 0, RÉA: 1, FOR: 1, VOL: 2, LOG: 0, INT: 2, CHA: 0 },
      powersFixed: ["Arme naturelle (Griffes, Crocs)", "Conscience", "Dissimulation (personnelle uniquement)", "Drain d'Essence", "Imitation", "Infection", "Nature duale", "Peur", "Régénération", "Sens accrus (ouïe, odorat)"],
      powersOptional: [],
      weaknesses: ["Allergie (lumière du soleil, Grave)", "Allergie (plastique, Grave)", "Exigence alimentaire (sang métahumain)"],
      naturalWeapons: [
        "Griffes [VD 3P, SO 7+FOR/–/–/–/–]",
        "Crocs [VD 4P, SO 6+FOR/–/–/–/–, Infection]",
      ],
    },
    Lamia: {
      baseMetatypes: ["Naga"],
      attrMod: { CON: 1, AGI: 0, RÉA: 0, FOR: 1, VOL: 0, LOG: 0, INT: 0, CHA: 0 },
      bonus: { sd: 6 },
      powersFixed: ["Arme naturelle (Crocs)", "Armure 6 (remplace l'Armure 4 de la Naga)", "Compulsion (luxure)", "Conscience", "Drain d'Essence", "Immunité (vieillissement, pathogènes, toxines)", "Infection", "Nature duale", "Reflet du désir", "Régénération"],
      powersOptional: [],
      weaknesses: ["Allergie (lumière du soleil, Grave)", "Exigence alimentaire (chair métahumaine)", "Perte d'Essence", "Vulnérabilité (argent)"],
      naturalWeapons: ["Crocs [VD 4P, SO 6+FOR/–/–/–/–, Infection]"],
    },
    "Loup-garou": {
      baseMetatypes: ["Humain"],
      attrMod: { CON: 1, AGI: 0, RÉA: 2, FOR: 4, VOL: 1, LOG: -1, INT: 2, CHA: -2 },
      bonus: { initDice: 1, sd: 2 },
      powersFixed: ["Arme naturelle (Griffes, Crocs)", "Armure 2", "Conscience", "Nature duale", "Sens accrus (ouïe, vision nocturne, odorat, vision thermographique)", "+2 à la vitesse de déplacement de base"],
      powersOptional: ["Course sur les murs"],
      weaknesses: ["Allergie (aconit tue-loup, Modérée)", "Allergie (lumière du soleil, Grave)", "Exigence alimentaire (chair métahumaine)", "Logique -1", "Charisme -1"],
      naturalWeapons: [
        "Griffes [VD 4P, SO 7+FOR/–/–/–/–]",
        "Crocs [VD 5P, SO 6+FOR/–/–/–/–, Infection]",
      ],
    },
    Mutaqua: {
      baseMetatypes: ["Troll"],
      attrMod: { CON: 2, AGI: 1, RÉA: 2, FOR: 3, VOL: 2, LOG: 0, INT: 2, CHA: 1 },
      bonus: { initDice: 1, sd: 1 },
      powersFixed: ["Arme naturelle (Crocs, Griffes)", "Armure 1", "Conscience", "Drain d'Essence", "Immunité (vieillissement)", "Infection", "Nature duale", "+2 à la vitesse de déplacement de base"],
      powersOptional: ["Armure +1", "Garde magique (personnelle uniquement)", "Immunité (toxines)", "Peur", "Régénération", "Sens accrus (ouïe, vision nocturne)"],
      weaknesses: ["Allergie (bois, Grave)", "Allergie (lumière du soleil, Extrême)", "Exigence alimentaire (chair métahumaine)", "Perte d'Essence", "Vulnérabilité (feu)"],
      naturalWeapons: [
        "Griffes [VD 3P, SO 7+FOR/–/–/–/–]",
        "Crocs [VD 4P, SO 6+FOR/–/–/–/–, Infection]",
      ],
    },
    Nibiinaabe: {
      baseMetatypes: ["Triton"],
      attrMod: { CON: 0, AGI: 0, RÉA: 3, FOR: 0, VOL: 6, LOG: 6, INT: 6, CHA: 6 },
      bonus: { sd: 4 },
      powersFixed: ["Arme naturelle (Queue, Crocs)", "Armure 4", "Conscience", "Drain d'Essence", "Immunité (pathogènes, toxines)", "Infection", "Nature duale", "Régénération", "Silence supérieur", "Sort inné (Ténèbres)"],
      powersOptional: ["Sens accrus (ouïe, vision thermographique)"],
      weaknesses: ["Allergie (lumière du soleil, Grave)", "Exigence alimentaire (sang métahumain)", "Perte d'Essence", "Vulnérabilité (attaques soniques)"],
      naturalWeapons: [
        "Queue [VD 3P, SO 7+FOR/–/–/–/–]",
        "Crocs [VD 4P, SO 6+FOR/–/–/–/–, Infection]",
      ],
      // Le livre imprime VOL/LOG/INT/CHA sans signe +/- (contrairement à
      // toutes les autres lignes de cette table) — probable coquille
      // d'édition. Reproduit fidèlement comme delta +6, cf. rapport de
      // recherche.
    },
    Nosferatu: {
      baseMetatypes: ["Humain"],
      attrMod: { CON: 1, AGI: 1, RÉA: 1, FOR: 1, VOL: 2, LOG: 2, INT: 2, CHA: 2 },
      bonus: { initDice: 1 },
      powersFixed: ["Arme naturelle (Crocs)", "Conscience", "Drain d'Essence", "Immunité (vieillissement)", "Infection", "Nature duale", "+2 à la vitesse de déplacement de base"],
      powersOptional: ["Compulsion", "Immunité (pathogènes, toxines)", "Influence", "Peur", "Régénération", "Sens accrus (ouïe, vision nocturne, vision thermographique)"],
      weaknesses: ["Allergie (bois, Grave)", "Allergie (lumière du soleil, Extrême)", "Exigence alimentaire (sang métahumain)", "Perte d'Essence", "Sommeil induit (manque d'air)"],
      naturalWeapons: ["Crocs [VD 4P, SO 6+FOR/–/–/–/–, Infection]"],
    },
    Rongeur: {
      baseMetatypes: ["Nain"],
      attrMod: { CON: 1, AGI: 0, RÉA: 2, FOR: 2, VOL: 1, LOG: -1, INT: 2, CHA: -1 },
      bonus: { sd: 1 },
      powersFixed: ["Arme naturelle (Crocs)", "Armure 1", "Conscience", "Immunité (toxines)", "Nature duale", "Souffle nocif", "Toucher paralysant"],
      powersOptional: ["Armure +1", "Contrôle animal (créatures souterraines)"],
      weaknesses: ["Allergie (lumière du soleil, Modérée)", "Exigence alimentaire (ossements métahumains)"],
      naturalWeapons: ["Crocs [VD 4P, SO 6+FOR/–/–/–/–, Infection]"],
    },
    Vampire: {
      baseMetatypes: ["Humain"],
      attrMod: { CON: 1, AGI: 0, RÉA: 2, FOR: 1, VOL: 1, LOG: 0, INT: 1, CHA: 2 },
      bonus: { initDice: 1 },
      powersFixed: ["Arme naturelle (Crocs)", "Conscience", "Drain d'Essence", "Immunité (vieillissement)", "Infection", "Nature duale", "+2 à la vitesse de déplacement de base"],
      powersOptional: ["Forme brumeuse", "Immunité (pathogènes, toxines)", "Régénération", "Sens accrus (odorat, ouïe, vision thermographique)"],
      weaknesses: ["Allergie (bois, Grave)", "Allergie (lumière du soleil, Grave)", "Exigence alimentaire (sang métahumain)", "Perte d'Essence", "Sommeil induit (manque d'air)"],
      naturalWeapons: ["Crocs [VD 4P, SO 6+FOR/–/–/–/–, Infection]"],
    },
    Wendigo: {
      baseMetatypes: ["Ork"],
      attrMod: { CON: 2, AGI: 0, RÉA: 2, FOR: 1, VOL: 1, LOG: 1, INT: 1, CHA: 2 },
      bonus: { initDice: 1 },
      powersFixed: ["Arme naturelle (Griffes, Crocs)", "Conscience", "Drain d'Essence", "Immunité (vieillissement)", "Infection", "Nature duale", "+2 à la vitesse de déplacement de base"],
      powersOptional: ["Immunité (pathogènes, toxines)", "Influence", "Peur", "Régénération", "Sens accrus (amplification visuelle, odorat, ouïe)"],
      weaknesses: ["Allergie (lumière du soleil, Grave)", "Allergie (métaux ferreux, Modérée)", "Exigence alimentaire (chair métahumaine)", "Perte d'Essence"],
      naturalWeapons: [
        "Griffes [VD 3P, SO 7+FOR/–/–/–/–]",
        "Crocs [VD 4P, SO 6+FOR/–/–/–/–, Infection]",
      ],
    },
  },

  /* SR5 — deux sources :
     1) Run Faster (BBE, fr) p.105-111, table « Attributs des métatypes
        Infectés » p.105 + fiches p.106-111 : Goule, Loup-garou, Vampire,
        Wendigo. Le livre imprime des plages absolues par métatype hôte,
        pas des deltas explicites : les modificateurs (`attrMod`) sont
        dérivés en comparant ces plages à `attrRange` (table p.68) —
        vérifiés indépendamment sur les 5 métatypes standard, cohérents à
        chaque fois (même delta quel que soit l'hôte, seul le minimum
        reste celui du métatype de base, jamais modifié).
     2) Howling Shadows (CAT27008, anglais, pas de traduction française
        officielle) p.81-90 : Bandersnatch, Banshee, Gobelin (VO Goblin),
        Grendel, Rongeur (VO Gnawer, pas de nom officiel connu — même
        traduction non-officielle que le Rongeur SR6, créature distincte),
        Moissonneur (VO Harvester, pas de nom officiel connu), Mutaqua,
        Nosferatu, Dzoo-noo-qua, Fomóraig. Ce livre donne des **fiches PNJ
        à stats absolues** (`attrFixed`), pas des deltas de chargen —
        Howling Shadows n'a pas de fiche pour Goule/Vampire (renvoie vers
        le Livre de Règles) ni pour Loup-garou/Wendigo dans ce format
        (couverts par Run Faster à la place). Les VD d'armes naturelles
        sont imprimées, la Précision (PRE) ne l'est pas dans ce livre —
        fixée à 6 par cohérence avec les autres armes naturelles SR5 du
        projet (valeur de la Goule/Vampire imprimée au Livre de Règles). */
  sr5: {
    Goule: {
      baseMetatypes: ["Humain", "Elfe", "Nain", "Ork", "Troll", "Sasquatch"],
      attrMod: { CON: 4, AGI: 0, REA: 2, FOR: 3, VOL: 2, LOG: -1, INT: 1, CHA: -2 },
      bonus: { armor: 1 },
      powersFixed: ["Arme naturelle (Crocs)", "Arme naturelle (Griffes)", "Nature duale", "Sens accrus (Ouïe, Odorat)"],
      powersOptional: ["Armure +1"],
      weaknesses: ["Allergie (Soleil, Modérée)", "Exigence alimentaire (Chair métahumaine)", "Sens réduit (Aveugle)", "Logique -1", "Charisme -1"],
      naturalWeapons: [
        "Crocs [PRE 6, Allonge -1, VD (FOR+1)P, PA -1]",
        "Griffes [PRE 6, Allonge —, VD (FOR+1)P, PA -1]",
      ],
    },
    "Loup-garou": {
      baseMetatypes: ["Humain"],
      attrMod: { CON: 1, AGI: 0, REA: 2, FOR: 4, VOL: 1, LOG: -1, INT: 2, CHA: -2 },
      bonus: { initDice: 1, armor: 2 },
      powersFixed: ["Arme naturelle (Crocs)", "Arme naturelle (Griffes)", "Armure 2", "Nature duale", "Sens accrus (Ouïe, Vision nocturne, Odorat, Vision thermographique)", "+1 à la vitesse de déplacement de base"],
      powersOptional: [],
      weaknesses: ["Allergie (Aconit, Modérée)", "Allergie (Soleil, Grave)", "Exigence alimentaire (Chair métahumaine)", "Logique -1", "Charisme -1"],
      naturalWeapons: [
        "Crocs [PRE 6, Allonge -1, VD (FOR+2)P, PA -2]",
        "Griffes [PRE 6, Allonge —, VD (FOR+3)P, PA -2]",
      ],
    },
    Vampire: {
      baseMetatypes: ["Humain"],
      attrMod: { CON: 1, AGI: 0, REA: 2, FOR: 1, VOL: 1, LOG: 0, INT: 1, CHA: 2 },
      bonus: { initDice: 1 },
      powersFixed: ["Arme naturelle (Crocs)", "Drain d'Essence", "Immunité (Âge)", "Infection", "Nature duale", "+1 à la vitesse de déplacement de base"],
      powersOptional: ["Forme brumeuse", "Immunité (Pathogènes, Toxines)", "Régénération", "Sens accrus (Ouïe, Odorat, Vision thermographique)"],
      weaknesses: ["Allergie (Soleil, Grave)", "Allergie (Bois, Grave)", "Exigence alimentaire (Sang métahumain)", "Perte d'Essence", "Sommeil induit (manque d'air)"],
      naturalWeapons: ["Crocs [PRE 6, Allonge -1, VD (FOR+1)P, PA -1]"],
    },
    Wendigo: {
      baseMetatypes: ["Ork"],
      attrMod: { CON: 2, AGI: 0, REA: 2, FOR: 1, VOL: 1, LOG: 1, INT: 1, CHA: 2 },
      bonus: { initDice: 1 },
      powersFixed: ["Arme naturelle (Crocs)", "Arme naturelle (Griffes)", "Drain d'Essence", "Immunité (Âge)", "Infection", "Nature duale", "+1 à la vitesse de déplacement de base"],
      powersOptional: ["Immunité (Pathogènes, Toxines)", "Influence", "Peur", "Régénération", "Sens accrus (Ouïe, Odorat, Acuité visuelle)"],
      weaknesses: ["Allergie (Métaux ferreux, Modérée)", "Allergie (Soleil, Grave)", "Exigence alimentaire (Chair métahumaine)", "Perte d'Essence"],
      naturalWeapons: [
        "Crocs [PRE 6, Allonge -1, VD (FOR+1)P, PA -1]",
        "Griffes [PRE 6, Allonge —, VD (FOR+2)P, PA -1]",
      ],
    },
    Bandersnatch: {
      baseMetatypes: ["Sasquatch"],
      attrFixed: { CON: 9, AGI: 3, REA: 5, FOR: 9, VOL: 5, LOG: 2, INT: 6, CHA: 1 },
      powersFixed: ["Coloration adaptative", "Nature duale", "Mimétisme", "Sapience", "Arme naturelle (Morsure)", "Arme naturelle (Griffes)"],
      powersOptional: [],
      weaknesses: ["Allergie (Soleil, Légère)", "Exigence alimentaire (Chair métahumaine)"],
      naturalWeapons: [
        "Morsure [PRE 6, Allonge -1, VD (FOR+1)P, PA -1]",
        "Griffes [PRE 6, Allonge —, VD (FOR+2)P, PA -1]",
      ],
    },
    Banshee: {
      baseMetatypes: ["Elfe"],
      attrFixed: { CON: 4, AGI: 4, REA: 5, FOR: 4, VOL: 4, LOG: 3, INT: 4, CHA: 6 },
      powersFixed: ["Nature duale", "Sens accrus (Ouïe, Vision basse lumière, Odorat)", "Drain d'Essence", "Peur", "Immunité (Âge, Pathogènes, Toxines)", "Infection", "Forme brumeuse", "Régénération", "Sapience", "Arme naturelle (Morsure)"],
      powersOptional: ["Hurlement paralysant"],
      weaknesses: ["Allergie (Soleil, Sévère)", "Exigence alimentaire (Sang métahumain)", "Perte d'Essence", "Vulnérabilité (Argent)", "Vulnérabilité (Bois)"],
      naturalWeapons: ["Morsure [PRE 6, Allonge -1, VD (FOR+1)P, PA -1]"],
    },
    Gobelin: {
      baseMetatypes: ["Nain"],
      attrFixed: { CON: 6, AGI: 3, REA: 4, FOR: 6, VOL: 5, LOG: 2, INT: 5, CHA: 2 },
      powersFixed: ["Nature duale", "Sens accrus (Odorat, Goût, Vision thermique)", "Drain d'Essence", "Immunité (Âge, Feu, Toxines)", "Infection", "Régénération", "Sapience", "Arme naturelle (Morsure)", "Arme naturelle (Griffes)"],
      powersOptional: [],
      weaknesses: ["Allergie (Soleil, Modérée)", "Exigence alimentaire (Chair métahumaine)", "Perte d'Essence", "Vulnérabilité (Fer)"],
      naturalWeapons: [
        "Morsure [PRE 6, Allonge -1, VD (FOR+1)P, PA -1]",
        "Griffes [PRE 6, Allonge —, VD (FOR+2)P, PA -1]",
      ],
    },
    Grendel: {
      baseMetatypes: ["Ork"],
      attrFixed: { CON: 8, AGI: 3, REA: 4, FOR: 8, VOL: 4, LOG: 1, INT: 4, CHA: 1 },
      powersFixed: ["Contrôle animal (Vermine)", "Nature duale", "Sens accrus (Vision basse lumière, Odorat, Vision thermique)", "Dissimulation (personnelle uniquement)", "Toucher paralysant", "Sapience", "Arme naturelle (Morsure)", "Arme naturelle (Griffes)"],
      powersOptional: [],
      weaknesses: ["Allergie (Soleil, Modérée)", "Exigence alimentaire (Chair métahumaine)"],
      naturalWeapons: [
        "Morsure [PRE 6, Allonge -1, VD (FOR+1)P, PA -1]",
        "Griffes [PRE 6, Allonge —, VD (FOR+1)P, PA -1]",
      ],
    },
    Rongeur: {
      baseMetatypes: ["Nain"],
      attrFixed: { CON: 6, AGI: 3, REA: 4, FOR: 7, VOL: 5, LOG: 2, INT: 5, CHA: 2 },
      bonus: { armor: 2 },
      powersFixed: ["Contrôle animal (Vermine)", "Armure 2", "Nature duale", "Sens accru (Vision thermique)", "Immunité (Toxines)", "Souffle nocif", "Toucher paralysant", "Sapience", "Arme naturelle (Morsure)"],
      powersOptional: [],
      weaknesses: ["Allergie (Soleil, Modérée)", "Exigence alimentaire (Os métahumains)"],
      naturalWeapons: ["Morsure [PRE 6, Allonge -1, VD (FOR+2)P, PA —]"],
    },
    Moissonneur: {
      baseMetatypes: ["Elfe"],
      attrFixed: { CON: 5, AGI: 4, REA: 6, FOR: 6, VOL: 4, LOG: 1, INT: 5, CHA: 1 },
      bonus: { armor: 2 },
      powersFixed: ["Armure 2", "Nature duale", "Sens accrus (Vision basse lumière, Vision thermique)", "Mouvement (personnel uniquement)", "Sapience", "Arme naturelle (Morsure)", "Arme naturelle (Griffes)"],
      powersOptional: [],
      weaknesses: ["Allergie (Argent, Modérée)", "Allergie (Soleil, Modérée)"],
      naturalWeapons: [
        "Morsure [PRE 6, Allonge -1, VD (FOR+1)P, PA -1]",
        "Griffes [PRE 6, Allonge —, VD (FOR+3)P, PA -3]",
      ],
    },
    Mutaqua: {
      baseMetatypes: ["Troll"],
      attrFixed: { CON: 9, AGI: 3, REA: 5, FOR: 10, VOL: 5, LOG: 2, INT: 4, CHA: 1 },
      bonus: { armor: 5 },
      powersFixed: ["Armure 5", "Nature duale", "Sens accrus (Ouïe, Vision basse lumière, Vision thermique)", "Drain d'Essence", "Peur", "Immunité (Âge, Toxines)", "Infection", "Garde magique (personnelle uniquement)", "Régénération", "Sapience", "Arme naturelle (Morsure)", "Arme naturelle (Griffes)"],
      powersOptional: [],
      weaknesses: ["Allergie (Soleil, Extrême)", "Allergie (Bois, Sévère)", "Exigence alimentaire (Chair métahumaine)", "Perte d'Essence", "Vulnérabilité (Feu)"],
      naturalWeapons: [
        "Morsure [PRE 6, Allonge -1, VD (FOR+1)P, PA -1]",
        "Griffes [PRE 6, Allonge —, VD (FOR+2)P, PA -1]",
      ],
    },
    Nosferatu: {
      baseMetatypes: ["Humain"],
      attrFixed: { CON: 4, AGI: 4, REA: 4, FOR: 4, VOL: 5, LOG: 5, INT: 5, CHA: 5 },
      powersFixed: ["Compulsion", "Nature duale", "Sens accrus (Ouïe, Vision basse lumière, Vision thermique)", "Drain d'Essence", "Peur", "Immunité (Âge, Pathogènes, Toxines)", "Infection", "Influence", "Régénération", "Sapience", "Arme naturelle (Morsure)"],
      powersOptional: [],
      weaknesses: ["Allergie (Soleil, Extrême)", "Allergie (Bois, Sévère)", "Exigence alimentaire (Sang métahumain)", "Perte d'Essence", "Dormance induite (manque d'air)"],
      naturalWeapons: ["Morsure [PRE 6, Allonge -1, VD (FOR+1)P, PA -1]"],
    },
    "Dzoo-noo-qua": {
      baseMetatypes: ["Troll"],
      attrFixed: { CON: 9, AGI: 2, REA: 5, FOR: 9, VOL: 4, LOG: 2, INT: 4, CHA: 1 },
      bonus: { armor: 4 },
      powersFixed: ["Armure 4", "Nature duale", "Sens accrus (Ouïe, Vision thermique)", "Drain d'Essence", "Immunité (Âge, Toxines)", "Infection", "Garde magique (personnelle uniquement)", "Régénération", "Sapience", "Arme naturelle (Morsure)", "Arme naturelle (Griffes)"],
      powersOptional: [],
      weaknesses: ["Allergie (Soleil, Modérée)", "Exigence alimentaire (Chair métahumaine)", "Perte d'Essence"],
      naturalWeapons: [
        "Morsure [PRE 6, Allonge -1, VD (FOR+1)P, PA -1]",
        "Griffes [PRE 6, Allonge —, VD (FOR+2)P, PA -1]",
      ],
    },
    Fomóraig: {
      baseMetatypes: ["Troll"],
      attrFixed: { CON: 10, AGI: 2, REA: 4, FOR: 10, VOL: 4, LOG: 1, INT: 3, CHA: 1 },
      bonus: { armor: 3 },
      powersFixed: ["Armure 3", "Sécrétions corrosives", "Nature duale", "Garde magique (personnelle uniquement)", "Sapience", "Arme naturelle (Morsure)", "Arme naturelle (Griffes)"],
      powersOptional: [],
      weaknesses: ["Allergie (Pollution atmosphérique, Modérée)", "Allergie (Soleil, Modérée)", "Exigence alimentaire (Chair métahumaine)"],
      naturalWeapons: [
        "Morsure [PRE 6, Allonge -1, VD (FOR+1)P, PA -1]",
        "Griffes [PRE 6, Allonge —, VD (FOR+2)P, PA -1]",
      ],
    },
  },

  _edition: "sr6",

  /** Sélectionne le jeu de données actif ("sr5" | "sr6"). Anarchy : vide. */
  use(edition) {
    this._edition = edition === "sr5" ? "sr5" : edition === "sr6" ? "sr6" : null;
    return this;
  },

  _data() {
    return this[this._edition] || {};
  },

  /** Structure pour ajouter un groupe "Infectés" au sélecteur Métatype. */
  groupedOptions() {
    const items = Object.keys(this._data());
    return items.length ? [{ cat: "Infectés", items }] : [];
  },

  /** true si `name` est un type Infecté dans l'édition active. */
  is(name) {
    return !!this._data()[name];
  },

  /**
   * Résout un type Infecté choisi. Tire au hasard le métatype hôte si
   * plusieurs sont possibles, et un pouvoir optionnel (souvent présenté
   * comme "choix gratuit" dans les livres). Renvoie null si `name` n'est
   * pas un type Infecté connu dans l'édition active.
   */
  resolve(name) {
    const d = this._data()[name];
    if (!d) return null;
    const baseMetatype =
      d.baseMetatypes.length > 1 ? Utils.rand(d.baseMetatypes) : d.baseMetatypes[0];
    const optionalPower =
      d.powersOptional && d.powersOptional.length ? Utils.rand(d.powersOptional) : null;
    return {
      name,
      baseMetatype,
      attrMod: d.attrMod || null,
      attrFixed: d.attrFixed || null,
      bonus: d.bonus || null,
      powersFixed: d.powersFixed || [],
      optionalPower,
      weaknesses: d.weaknesses || [],
      naturalWeapons: d.naturalWeapons || [],
    };
  },
};
