"use strict";

/* ============================================================
   CRÉATURES — génération de paranimaux/Infectés autonomes
   depuis le générateur (sélecteur « Type : Créature »).

   Les créatures sont des objets PNJ standards de leur édition :
   les corps de carte existants les rendent tels quels (jets,
   moniteurs, RR). Pouvoirs, faiblesses et attaques naturelles
   vivent dans `traits` (SR5/SR6) ou `edges`/`weapons` (Anarchy).

   Sources : SR5 p.404-407, SR6 p.220-223, Anarchy 2.0 p.256-261.
   Les compétences SR5/SR6 sont stockées en réserves complètes
   (indice du livre + attribut lié), comme partout dans l'app.
   ============================================================ */
const Creatures = {
  /* ---- SR5 : attrs [CON,AGI,REA,FOR,VOL,LOG,INT,CHA,MAG?],
     init/dice, moniteurs phys/étourd, armure, limites,
     skills = réserves complètes, traits texte. ----  */
  SR5: {
    chien: {
      label: "Chien de garde", a: [4, 3, 4, 4, 3, 2, 4, 3, null],
      init: 8, dice: 1, mon: [10, 10], armure: 0, lim: [6, 4, 5],
      skills: { "Combat à mains nues": 8, Course: 9, Intimidation: 7, "Perception (odorat)": 9, Pistage: 10 },
      traits: [["Armes naturelles", "Crocs / Griffes : VD 5P (FOR+1), PA —"], ["Sens accrus", "Odorat, ouïe"]],
    },
    loup: {
      label: "Loup", a: [6, 3, 5, 5, 3, 2, 4, 3, null],
      init: 9, dice: 2, mon: [10, 10], armure: 0, lim: [6, 4, 5],
      skills: { "Combat à mains nues": 10, Course: 10, Discrétion: 8, Intimidation: 7, "Perception (odorat)": 9, Pistage: 10 },
      traits: [["Armes naturelles", "Crocs / Griffes : VD 7P (FOR+2), PA -1"], ["Sens accrus", "Odorat, ouïe"]],
    },
    felin: {
      label: "Grand félin", a: [6, 5, 4, 5, 3, 2, 4, 3, null],
      init: 8, dice: 2, mon: [11, 10], armure: 0, lim: [7, 4, 5],
      skills: { "Combat à mains nues": 12, Course: 10, Discrétion: 11, Perception: 9, Pistage: 8 },
      traits: [["Armes naturelles", "Crocs / Griffes : VD 8P (FOR+3), PA -1"]],
    },
    requin: {
      label: "Requin", a: [5, 4, 5, 5, 3, 1, 4, 1, null],
      init: 9, dice: 1, mon: [11, 10], armure: 2, lim: [7, 3, 4],
      skills: { "Combat à mains nues": 12, Natation: 15, "Perception (odorat)": 10 },
      traits: [["Armes naturelles", "Crocs : VD 7P (FOR+2), PA -2"], ["Armure 2", null]],
    },
    barghest: {
      label: "Barghest", a: [8, 5, 6, 6, 4, 2, 5, 5, 5],
      init: 11, dice: 2, mon: [12, 10], armure: 3, lim: [9, 5, 7],
      skills: { "Combat à mains nues": 13, Course: 11, Intimidation: 12, Perception: 11, Pistage: 11 },
      traits: [
        ["Armes naturelles", "Crocs : VD 8P (FOR+2), PA -1"],
        ["Hurlement paralysant", "Paralyse les proies saisies de terreur"],
        ["Immunité", "Hurlement de barghest"],
        ["Nature duale", null], ["Peur", null],
        ["Sens accrus", "Odorat, ouïe, sonar"],
      ],
    },
    basilic: {
      label: "Basilic", a: [6, 3, 3, 7, 5, 1, 3, 1, 4],
      init: 6, dice: 1, mon: [11, 11], armure: 7, lim: [8, 4, 5],
      skills: { "Combat à mains nues": 9, Course: 9, Discrétion: 6, Natation: 15, Perception: 7 },
      traits: [
        ["Armes naturelles", "Crocs : VD 15P (FOR+8), PA -2"],
        ["Pétrification", "Son regard pétrifie ses proies"],
        ["Vulnérabilité", "Son propre regard (-3 dés au test de résistance)"],
      ],
    },
    chienEnfer: {
      label: "Chien de l'enfer", a: [6, 4, 5, 6, 4, 2, 4, 3, 5],
      init: 10, dice: 3, mon: [11, 10], armure: 2, lim: [8, 4, 5],
      skills: { "Arme à distance exotique (feu)": 8, "Combat à mains nues": 7, Course: 10, Discrétion: 9, Intimidation: 6, Perception: 7, Pistage: 9 },
      traits: [
        ["Armes naturelles", "Crocs : VD 7P (FOR+1), PA -1"],
        ["Attaque élémentaire", "Feu (souffle)"],
        ["Immunité", "Feu"], ["Nature duale", null], ["Peur", null],
        ["Sens accrus", "Odorat, ouïe, vision nocturne"],
      ],
    },
    goule: {
      label: "Goule", a: [7, 3, 5, 6, 5, 2, 4, 1, 1],
      init: 9, dice: 1, mon: [12, 11], armure: 1, lim: [8, 5, 5],
      skills: { "Combat à mains nues": 9, Course: 9, Discrétion: 9, "Observation astrale": 8, Perception: 9 },
      traits: [
        ["Armes naturelles", "Griffes : VD 7P (FOR+1), PA -1"],
        ["Conscience", null], ["Nature duale", null],
        ["Sens accrus", "Odorat, ouïe"],
        ["Faiblesses", "Allergie (lumière solaire, modérée), Exigence alimentaire (chair métahumaine), Sens réduits (aveugle)"],
      ],
    },
    ratDiable: {
      label: "Rat du diable", a: [2, 5, 5, 1, 3, 2, 5, 5, 4],
      init: 10, dice: 1, mon: [9, 10], armure: 0, lim: [3, 4, 7],
      skills: { "Combat à mains nues": 10, Discrétion: 11, Escalade: 6, Perception: 9 },
      traits: [
        ["Armes naturelles", "Crocs : VD 2P (FOR+1), PA —, Allonge -1"],
        ["Contrôle animal", "Rats ordinaires"],
        ["Dissimulation", "Personnelle seulement"],
        ["Immunité", "Toxines"],
        ["Faiblesses", "Allergie (lumière solaire, modérée)"],
      ],
    },
    cocatrix: {
      label: "Cocatrix", a: [4, 5, 4, 4, 4, 2, 3, 1, 4],
      init: 7, dice: 1, mon: [10, 10], armure: 1, lim: [6, 4, 4],
      skills: { "Combat à mains nues": 12, Course: 11, Discrétion: 10, Perception: 6 },
      traits: [
        ["Armes naturelles", "Griffes : VD 4P (FOR), PA -1"],
        ["Armure 1", null],
        ["Immunité", "Son propre toucher"],
        ["Toucher paralysant", "Queue"],
      ],
    },
    sasquatch: {
      label: "Sasquatch", a: [8, 3, 4, 7, 3, 3, 5, 3, 4],
      init: 9, dice: 1, mon: [12, 10], armure: 0, lim: [9, 5, 5],
      skills: {
        Artisanat: 9, Athlétisme: 6, "Cris d'animaux (connaissance professionnelle)": 13,
        Discrétion: 11, "Observation astrale": 11, Perception: 11,
      },
      traits: [
        ["Conscience", null], ["Imitation", null], ["Nature duale", null],
        ["Notes", "Allonge +1 ; peut avoir les traits Adepte, Magicien ou Adepte mystique"],
      ],
    },
    dragonOccidental: {
      label: "Dragon occidental", a: [18, 7, 8, 40, 8, 8, 8, 8, 10],
      init: 16, dice: 2, mon: [17, 12], armure: 18, lim: [36, 11, 12],
      skills: {
        "Arme à distance exotique": 19, "Combat à mains nues": 19, Conjuration: 20,
        Course: 50, "Observation astrale": 22, Perception: 20, Sorcellerie: 22, Vol: 19,
      },
      traits: [
        ["Armes naturelles", "Crocs / Griffes : VD (FOR+2)P, PA -4"],
        ["Armure mystique renforcée", "Volonté (armure mystique 8R en plus de l'armure physique)"],
        ["Armure renforcée", "Constitution"],
        ["Attaque élémentaire", "Feu (souffle)"],
        ["Conscience", null], ["Draconique", null], ["Nature duale", null],
        ["Sens accrus", "Audition à large spectre, odorat, vision nocturne, vision thermographique"],
        ["Notes", "Trait Magicien, connaît la plupart des sorts, Allonge +2. Pouvoir individuel au choix du MJ parmi : Compulsion, Contrôle animal, Influence, Peur, Salive corrosive, Souffle nocif, Venin."],
      ],
    },
    dragonOriental: {
      label: "Dragon oriental", a: [17, 8, 8, 35, 9, 10, 8, 9, 10],
      init: 16, dice: 2, mon: [17, 13], armure: 17, lim: [32, 13, 13],
      skills: {
        "Arme à distance exotique": 20, "Combat à mains nues": 20, Conjuration: 22,
        Course: 45, "Observation astrale": 22, Perception: 20, Sorcellerie: 23, Vol: 20,
      },
      traits: [
        ["Armes naturelles", "Crocs / Griffes : VD (FOR+2)P, PA -4"],
        ["Armure mystique renforcée", "Volonté (armure mystique 9R en plus de l'armure physique)"],
        ["Armure renforcée", "Constitution"],
        ["Attaque élémentaire", "Feu (souffle)"],
        ["Conscience", null], ["Draconique", null], ["Nature duale", null],
        ["Sens accrus", "Audition à large spectre, odorat, vision nocturne, vision thermographique"],
        ["Notes", "Trait Magicien, connaît la plupart des sorts, Allonge +2. Variante Sirrush (Asie mineure) : stats identiques. Pouvoir individuel au choix du MJ parmi : Compulsion, Contrôle animal, Influence, Peur, Salive corrosive, Souffle nocif, Venin."],
      ],
    },
    serpentPlumes: {
      label: "Serpent à plumes", a: [15, 9, 10, 30, 10, 9, 9, 8, 10],
      init: 19, dice: 3, mon: [16, 13], armure: 15, lim: [29, 13, 12],
      skills: {
        "Arme à distance exotique": 21, "Combat à mains nues": 21, Conjuration: 21,
        Course: 40, "Observation astrale": 23, Perception: 21, Sorcellerie: 24, Vol: 21,
      },
      traits: [
        ["Armes naturelles", "Crocs / Griffes : VD (FOR+2)P, PA -4"],
        ["Armure mystique renforcée", "Volonté (armure mystique 10R en plus de l'armure physique)"],
        ["Armure renforcée", "Constitution"],
        ["Attaque élémentaire", "Feu (souffle)"],
        ["Conscience", null], ["Draconique", null], ["Nature duale", null],
        ["Sens accrus", "Audition à large spectre, odorat, vision nocturne, vision thermographique"],
        ["Venin", "Poche à venin liée à un dard caudal ou aux crocs (fréquent chez cette espèce)"],
        ["Notes", "Trait Magicien, connaît la plupart des sorts, Allonge +2. Pouvoir individuel au choix du MJ parmi : Compulsion, Contrôle animal, Influence, Peur, Salive corrosive, Souffle nocif."],
      ],
    },
  },

  /* ---- SR6 : attrs [CON,AGI,RÉA,FOR,VOL,LOG,INT,CHA,MAG?],
     sd, init/dice, moniteur me, réserve d'attaque (Score Offensif
     du livre), skills = réserves indice+attribut. ---- */
  SR6: {
    chien: {
      label: "Chien de garde", a: [3, 2, 3, 2, 2, 2, 3, 3, null],
      sd: 4, init: 6, dice: 1, me: 10, atkPool: 5,
      skills: { Athlétisme: 7, "Combat rapproché": 6, "Influence (intimidation)": 5, "Perception (olfactive)": 8, "Plein air": 9 },
      traits: [["Arme naturelle", "Griffes / Crocs : VD 2P"], ["Armure 1", null], ["Sens accrus", "Ouïe, odorat"]],
    },
    felin: {
      label: "Grand félin", a: [5, 5, 4, 4, 1, 1, 4, 3, null],
      sd: 7, init: 8, dice: 2, me: 11, atkPool: 8,
      skills: { Athlétisme: 11, "Combat rapproché": 12, Furtivité: 11, "Influence (intimidation)": 7, "Perception (visuelle)": 9, "Plein air": 8 },
      traits: [["Arme naturelle", "Griffes / Crocs : VD 3P"], ["Armure 2", null], ["Sens accrus", "Vision nocturne, odorat"]],
    },
    requin: {
      label: "Requin", a: [5, 3, 5, 5, 2, 1, 4, 1, null],
      sd: 11, init: 9, dice: 1, me: 11, atkPool: 10,
      skills: { "Athlétisme (natation)": 9, "Combat rapproché": 11, "Influence (intimidation)": 6, "Perception (olfactive)": 10 },
      traits: [["Arme naturelle", "Crocs : VD 4P"], ["Armure renforcée 6", null], ["Sens accrus", "Odorat"]],
    },
    barghest: {
      label: "Barghest", a: [7, 4, 5, 5, 3, 2, 5, 5, 5],
      sd: 11, init: 10, dice: 2, me: 12, atkPool: 10,
      skills: { Astral: 9, Athlétisme: 9, "Combat rapproché": 12, "Influence (intimidation)": 10, Perception: 11, "Plein air": 11 },
      traits: [
        ["Arme naturelle", "Griffes / Crocs : VD 3P"], ["Armure 4", null],
        ["Hurlement paralysant", null], ["Immunité", "Hurlement du barghest"],
        ["Nature duale", null], ["Peur", null],
        ["Sens accrus", "Ouïe, odorat, sonar"],
      ],
    },
    cocatrix: {
      label: "Cocatrix", a: [3, 4, 3, 3, 3, 1, 2, 1, 5],
      sd: 4, init: 5, dice: 2, me: 10, atkPool: 6,
      skills: { Athlétisme: 11, "Combat rapproché": 11, Furtivité: 9, Perception: 5 },
      traits: [
        ["Arme naturelle", "Griffes : VD 2P"], ["Armure 1", null],
        ["Toucher paralysant", "Queue"], ["Immunité", "Son propre toucher"],
      ],
    },
    goule: {
      label: "Goule", a: [6, 2, 4, 5, 4, 1, 3, 1, 1],
      sd: 7, init: 7, dice: 1, me: 13, atkPool: 9,
      skills: { Astral: 8, Athlétisme: 6, "Combat rapproché": 9, Furtivité: 8, Perception: 8 },
      traits: [
        ["Arme naturelle", "Crocs : VD 4P / Griffes : VD 3P"], ["Armure 1", null],
        ["Conscience", null], ["Nature duale", null], ["Robuste 2", null],
        ["Sens accrus", "Ouïe, odorat"],
        ["Faiblesses", "Allergie (lumière du soleil, modérée), Exigence alimentaire (chair métahumaine), Sens réduit (aveugle)"],
      ],
    },
    ratDiable: {
      label: "Rat du diable", a: [1, 4, 5, 1, 2, 1, 5, 4, 4],
      sd: 1, init: 10, dice: 1, me: 9, atkPool: 6,
      skills: { "Athlétisme (escalade)": 7, "Combat rapproché": 9, Furtivité: 10, Perception: 9 },
      traits: [
        ["Arme naturelle", "Crocs : VD 1P"],
        ["Contrôle animal", "Rats communs"], ["Dissimulation", "Personnelle"],
        ["Immunité", "Toxines"],
        ["Faiblesses", "Allergie (lumière du soleil, faible)"],
      ],
    },
    ratDemon: {
      label: "Rat démon", a: [3, 4, 5, 3, 3, 2, 5, 5, 6],
      sd: 5, init: 10, dice: 2, me: 10, atkPool: 8,
      skills: { "Athlétisme (escalade)": 7, "Combat rapproché": 10, Furtivité: 11, Perception: 10 },
      traits: [
        ["Arme naturelle", "Crocs : VD 2P"], ["Armure 2", null],
        ["Contrôle animal", "Rats communs, rats du diable, rats d'infortune"],
        ["Dissimulation", "Personnelle"], ["Immunité", "Toxines"], ["Venin", null],
        ["Faiblesses", "Allergie (lumière du soleil, grave)"],
      ],
    },
    vampire: {
      label: "Vampire", a: [3, 2, 4, 3, 3, 2, 3, 4, 5],
      sd: 3, init: 7, dice: 2, me: 10, atkPool: 7,
      skills: { Athlétisme: 9, "Combat rapproché": 9, Furtivité: 9, Perception: 11 },
      traits: [
        ["Arme naturelle", "Crocs : VD 2P"],
        ["Conscience", null],
        ["Drain d'Essence", null], ["Forme brumeuse", null],
        ["Immunité", "Vieillissement, pathogènes, toxines"],
        ["Infection", null], ["Nature duale", null], ["Régénération", null],
        ["Sens accrus", "Ouïe, odorat, vision thermographique"],
        ["Faiblesses", "Allergie (bois, grave), Allergie (lumière du soleil, grave), Exigence alimentaire (sang métahumain), Perte d'Essence, Sommeil induit (manque d'air, [Essence] minutes)"],
      ],
    },
    basilic: {
      label: "Basilic", a: [6, 2, 3, 6, 4, 1, 3, 1, 4],
      sd: 13, init: 6, dice: 1, me: 11, atkPool: 9,
      skills: { "Athlétisme (natation)": 7, "Combat rapproché": 8, Furtivité: 5, Perception: 7 },
      traits: [
        ["Arme naturelle", "Griffes / Crocs : VD 3P"], ["Armure 7", null],
        ["Pétrification", null],
        ["Faiblesses", "Vulnérabilité (son propre regard)"],
      ],
    },
    chienEnfer: {
      label: "Chien de l'enfer", a: [6, 4, 5, 4, 3, 2, 4, 3, 5],
      sd: 10, init: 9, dice: 2, me: 11, atkPool: 9,
      skills: { Astral: 9, Athlétisme: 11, "Combat rapproché": 8, Furtivité: 9, "Influence (intimidation)": 7, Perception: 7, "Plein air": 9 },
      traits: [
        ["Arme naturelle", "Crocs : VD 3P"], ["Armure 4", null],
        ["Attaque élémentaire", "Feu"], ["Immunité", "Feu"],
        ["Nature duale", null], ["Peur", null],
        ["Sens accrus", "Ouïe, vision nocturne, odorat"],
      ],
    },
    cerbere: {
      label: "Cerbère", a: [6, 4, 5, 6, 4, 2, 6, 3, 5],
      sd: 12, init: 11, dice: 2, me: 15, atkPool: 11,
      skills: { Athlétisme: 10, "Combat rapproché": 13, "Influence (intimidation)": 8, Perception: 12, "Plein air": 14 },
      traits: [
        ["Arme naturelle", "Griffes / Crocs : VD 4P"], ["Armure 6", null],
        ["Dissimulation", "Personnelle"], ["Immunité", "Froid, feu"],
        ["Mouvement", "Personnelle"], ["Peur", null], ["Recherche", null],
        ["Robuste 4", null], ["Salive corrosive", null],
        ["Sens accrus", "Ouïe, vision nocturne, odorat, vision thermographique"],
      ],
    },
    ratInfortune: {
      label: "Rat d'infortune", a: [1, 3, 4, 0, 2, 1, 3, 2, 6],
      sd: 1, init: 7, dice: 1, me: 9, atkPool: 4,
      skills: { "Athlétisme (escalade)": 6, "Combat rapproché": 6, Furtivité: 6, Perception: 7 },
      traits: [
        ["Arme naturelle", "Crocs : VD 0P"],
        ["Accident", null],
        ["Contrôle animal", "Rats communs"], ["Immunité", "Toxines"],
        ["Infortune", "Capacité unique : portée LdV (L), type M, action majeure. Test opposé de Magie + Réaction contre Atout courant ; un succès net inflige le trait Malchance pendant 1 minute par succès net."],
        ["Faiblesses", "Allergie (lumière du soleil, faible)"],
      ],
    },
  },

  /* ---- Anarchy 2.0 (p.256-261) : statblocks complets du livre.
     skills : {name, val, attr, rr, spec...} ; armes avec vd affiché ;
     moniteurs = seuils du livre. ---- */
  ANARCHY: {
    chienGarde: {
      label: "Chien de garde", tier: "Figurant", threat: "forte",
      attrs: { FOR: 2, AGI: 2, VOL: 1, LOG: 2, CHA: 2 },
      skills: [
        { name: "Athlétisme", val: 3, attr: "FOR", spec: "Course", specVal: 4, specAttr: "FOR" },
        { name: "Combat rapproché", val: 3, attr: "AGI", spec: "Crocs", specVal: 4, specAttr: "AGI" },
        { name: "Furtivité", val: 3, attr: "AGI" },
        { name: "Perception", val: 3, attr: "LOG", spec: "Physique", specVal: 6, specAttr: "LOG", specRR: 2 },
        { name: "Influence", val: 2, attr: "CHA", spec: "Intimidation", specVal: 3, specAttr: "CHA" },
        { name: "Survie", val: 3, attr: "VOL" },
      ],
      edges: ["Sens accrus (trait) : RR 2 aux tests de Perception (physique)"],
      weapons: [{ name: "Crocs", vd: 3, ranges: "[OK/–/–/–]" }],
      phys: [2, 5, 8], ment: [1, 4, 7],
    },
    barghest: {
      label: "Barghest", tier: "Figurant d'élite", threat: "forte",
      attrs: { FOR: 4, AGI: 3, VOL: 2, LOG: 2, CHA: 3 },
      skills: [
        { name: "Athlétisme", val: 5, attr: "FOR", spec: "Course", specVal: 5, specAttr: "FOR" },
        { name: "Athlétisme", val: 5, attr: "FOR", spec: "Défense à distance", specVal: 4, specAttr: "AGI" },
        { name: "Combat rapproché", val: 4, attr: "AGI", spec: "Crocs", specVal: 5, specAttr: "AGI" },
        { name: "Perception", val: 4, attr: "LOG", spec: "Physique", specVal: 6, specAttr: "LOG", specRR: 2 },
        { name: "Influence", val: 3, attr: "CHA", spec: "Intimidation", specVal: 6, specAttr: "CHA", specRR: 2 },
        { name: "Survie", val: 3, attr: "VOL" },
      ],
      edges: [
        "Nature duale (pouvoir) : toujours présent sur les plans physique et astral",
        "Sens accrus (pouvoir) : RR 2 aux tests de Perception (physique)",
        "Peur (pouvoir) : RR 2 aux tests d'Influence (intimidation)",
        "Hurlement paralysant (pouvoir) : Influence (intimidation) + CHA contre Survie (sang-froid) + VOL ; échec = cibles paralysées 1 tour par succès net",
        "Cuir épais (trait) : Armure 3",
      ],
      weapons: [{ name: "Crocs", vd: 5, ranges: "[OK/–/–/–]" }],
      phys: [7, 10, 13], ment: [2, 5, 8],
    },
    chienEnfer: {
      label: "Chien de l'enfer", tier: "Figurant", threat: "forte",
      attrs: { FOR: 3, AGI: 3, VOL: 2, LOG: 2, CHA: 2 },
      skills: [
        { name: "Athlétisme", val: 4, attr: "FOR", spec: "Course", specVal: 5, specAttr: "FOR" },
        { name: "Athlétisme", val: 4, attr: "FOR", spec: "Défense à distance", specVal: 4, specAttr: "AGI" },
        { name: "Armes à distance", val: 3, attr: "AGI", spec: "Souffle enflammé", specVal: 5, specAttr: "AGI", specRR: 1 },
        { name: "Combat rapproché", val: 3, attr: "AGI", spec: "Crocs", specVal: 4, specAttr: "AGI" },
        { name: "Furtivité", val: 4, attr: "AGI" },
        { name: "Perception", val: 3, attr: "LOG", spec: "Physique", specVal: 6, specAttr: "LOG", specRR: 2 },
        { name: "Influence", val: 2, attr: "CHA", spec: "Intimidation", specVal: 4, specAttr: "CHA", specRR: 1 },
        { name: "Survie", val: 3, attr: "VOL" },
      ],
      edges: [
        "Nature duale (pouvoir) : toujours présent sur les plans physique et astral",
        "Sens accrus (trait) : RR 2 aux tests de Perception (physique)",
        "Peur (pouvoir) : RR 1 aux tests d'Influence (intimidation)",
        "Cuir épais (trait) : Armure 3",
        "Résistance au feu (trait) : Armure +3 contre le feu",
      ],
      weapons: [
        { name: "Crocs", vd: 4, ranges: "[OK/–/–/–]" },
        { name: "Souffle enflammé", vd: 5, ranges: "[OK/OK/–/–]" },
      ],
      phys: [6, 9, 12], ment: [2, 5, 8],
    },
    tigreCyber: {
      label: "Tigre cyber-augmenté Shiawase", tier: "Figurant d'élite", threat: "forte",
      attrs: { FOR: 5, AGI: 4, VOL: 2, LOG: 1, CHA: 2 },
      skills: [
        { name: "Athlétisme", val: 5, attr: "FOR", spec: "Défense à distance", specVal: 4, specAttr: "AGI" },
        { name: "Combat rapproché", val: 4, attr: "AGI", spec: "Griffes et crocs", specVal: 6, specAttr: "AGI", specRR: 1 },
        { name: "Furtivité", val: 4, attr: "AGI", spec: "Discrétion physique", specVal: 7, specAttr: "AGI", specRR: 2 },
        { name: "Perception", val: 3, attr: "LOG", spec: "Physique", specVal: 5, specAttr: "LOG", specRR: 1 },
        { name: "Survie", val: 4, attr: "VOL" },
      ],
      edges: [
        "Sens accrus (trait) : RR 1 aux tests de Perception (physique)",
        "Accroissement de réaction (cyberware) : +1 action par narration",
        "Orthoderme ruthénium (cyberware) : Armure 4 ; RR 2 aux tests de Furtivité (discrétion physique)",
        "Ossature renforcée en titane (cyberware) : VD griffes/crocs +1 ; +1 case de blessure grave",
        "Tonification musculaire (bioware) : RR 1 aux tests de Combat rapproché (griffes et crocs)",
      ],
      weapons: [{ name: "Griffes / Crocs", vd: 7, ranges: "[OK/–/–/–]" }],
      phys: [9, 12, 15], ment: [2, 5, 8], graveCapBonus: 1,
    },
    basilic: {
      label: "Basilic", tier: "Figurant d'élite", threat: "forte",
      attrs: { FOR: 4, AGI: 2, VOL: 3, LOG: 2, CHA: 1 },
      skills: [
        { name: "Athlétisme", val: 4, attr: "FOR", spec: "Natation", specVal: 5, specAttr: "FOR" },
        { name: "Athlétisme", val: 4, attr: "FOR", spec: "Défense à distance", specVal: 3, specAttr: "AGI" },
        { name: "Combat rapproché", val: 3, attr: "AGI", spec: "Crocs", specVal: 4, specAttr: "AGI" },
        { name: "Perception", val: 4, attr: "LOG", spec: "Physique", specVal: 4, specAttr: "LOG" },
        { name: "Influence", val: 3, attr: "CHA", spec: "Pétrification", specVal: 5, specAttr: "CHA", specRR: 2 },
        { name: "Survie", val: 4, attr: "VOL" },
      ],
      edges: [
        "Pétrification (pouvoir) : Influence (intimidation) + CHA contre Survie (sang-froid) + VOL sur une cible qui le regarde ; échec = pétrifiée 2 tours par succès net",
        "Cuir épais (trait) : Armure 4",
      ],
      weapons: [{ name: "Crocs", vd: 6, ranges: "[OK/–/–/–]" }],
      phys: [8, 11, 14], ment: [3, 6, 9],
    },
    cocatrix: {
      label: "Cocatrix", tier: "Figurant", threat: "forte",
      attrs: { FOR: 2, AGI: 3, VOL: 2, LOG: 1, CHA: 1 },
      skills: [
        { name: "Athlétisme", val: 4, attr: "FOR", spec: "Course", specVal: 5, specAttr: "FOR" },
        { name: "Athlétisme", val: 4, attr: "FOR", spec: "Défense à distance", specVal: 4, specAttr: "AGI" },
        { name: "Combat rapproché", val: 4, attr: "AGI", spec: "Griffes et queue", specVal: 5, specAttr: "AGI" },
        { name: "Furtivité", val: 4, attr: "AGI" },
        { name: "Perception", val: 2, attr: "LOG", spec: "Physique", specVal: 3, specAttr: "LOG" },
        { name: "Survie", val: 3, attr: "VOL" },
      ],
      edges: [
        "Toucher paralysant (pouvoir) : les attaques qui blessent paralysent la cible 3 tours",
        "Cuir (trait) : Armure 1",
      ],
      weapons: [{ name: "Griffes et queue", vd: 2, ranges: "[OK/–/–/–]" }],
      phys: [3, 6, 9], ment: [2, 5, 8],
    },
    goule: {
      label: "Goule", tier: "Figurant", threat: "forte",
      attrs: { FOR: 4, AGI: 2, VOL: 2, LOG: 1, CHA: 1 },
      skills: [
        { name: "Athlétisme", val: 3, attr: "FOR", spec: "Défense à distance", specVal: 3, specAttr: "AGI" },
        { name: "Combat rapproché", val: 3, attr: "AGI", spec: "Mains nues", specVal: 4, specAttr: "AGI" },
        { name: "Furtivité", val: 3, attr: "AGI" },
        { name: "Perception", val: 3, attr: "LOG", spec: "Ouïe, odorat", specVal: 4, specAttr: "LOG", specRR: 1 },
        { name: "Influence", val: 2, attr: "CHA", spec: "Intimidation", specVal: 3, specAttr: "CHA" },
      ],
      edges: [
        "Aveugle (trait) : insensible à l'environnement visuel ; RR 1 aux tests de Perception (ouïe, odorat)",
        "Nature duale (pouvoir) : toujours présent sur les plans physique et astral",
        "Exigence alimentaire (trait) : chair métahumaine",
        "Infection (trait) : une blessure peut contaminer (à la discrétion du MJ)",
        "Goule (trait) : +1 blessure légère",
      ],
      weapons: [{ name: "Griffes", vd: 4, ranges: "[OK/–/–/–]" }],
      equip: ["Commlink", "Manteau renforcé (Armure 2)"],
      phys: [6, 9, 12], ment: [2, 5, 8], legerCapBonus: 1,
    },
    ratDiable: {
      label: "Rat du diable", tier: "Figurant", threat: "forte",
      attrs: { FOR: 1, AGI: 3, VOL: 1, LOG: 1, CHA: 1 },
      skills: [
        { name: "Athlétisme", val: 3, attr: "FOR", spec: "Défense à distance", specVal: 4, specAttr: "AGI" },
        { name: "Combat rapproché", val: 4, attr: "AGI" },
        { name: "Furtivité", val: 4, attr: "AGI", spec: "Discrétion physique", specVal: 6, specAttr: "AGI", specRR: 1 },
        { name: "Perception", val: 2, attr: "LOG", spec: "Physique", specVal: 3, specAttr: "LOG" },
      ],
      edges: [
        "Contrôle animal (pouvoir) : les rats alentour obéissent aux ordres simples",
        "Dissimulation (pouvoir) : RR 1 aux tests de Furtivité (discrétion physique)",
      ],
      weapons: [{ name: "Griffes et dents", vd: 1, ranges: "[OK/–/–/–]" }],
      phys: [1, 4, 7], ment: [1, 4, 7],
    },
    vampire: {
      label: "Vampire", tier: "Lieutenant", threat: "forte",
      attrs: { FOR: 3, AGI: 4, VOL: 3, LOG: 3, CHA: 3 },
      skills: [
        { name: "Athlétisme", val: 3, attr: "FOR", spec: "Défense à distance", specVal: 4, specAttr: "AGI" },
        { name: "Combat rapproché", val: 4, attr: "AGI", spec: "Mains nues", specVal: 5, specAttr: "AGI" },
        { name: "Furtivité", val: 4, attr: "AGI", spec: "Discrétion physique", specVal: 5, specAttr: "AGI" },
        { name: "Perception", val: 4, attr: "LOG", spec: "Physique", specVal: 6, specAttr: "LOG", specRR: 1 },
        { name: "Sorcellerie", val: 4, attr: "VOL" },
        { name: "Conjuration", val: 4, attr: "LOG" },
        { name: "Influence", val: 3, attr: "CHA", spec: "Intimidation", specVal: 6, specAttr: "CHA", specRR: 2 },
      ],
      edges: [
        "Éveillé (tradition au choix) : perception & projection astrale, Sorcellerie, Conjuration ; sorts au choix du MJ",
        "Nature duale (pouvoir) : toujours présent sur les plans physique et astral",
        "Perte et drain d'Essence, Infection : perd 1 Essence par mois lunaire ; peut drainer une cible (5 min par point, max 12)",
        "Sens accrus (pouvoir) : ouïe, odorat, vision thermo ; RR 1 aux tests de Perception (physique)",
        "Rapidité (pouvoir) : +1 action par combat",
        "Forme brumeuse (pouvoir) : se transforme en brume en une narration",
        "Régénération (pouvoir) : guérit une blessure légère en 3 tours, grave en 10",
        "Peur (pouvoir) : RR 2 aux tests d'Influence (intimidation)",
        "Allergie au soleil (trait) : désavantage à tous les tests en plein jour",
        "Exigence alimentaire (trait) : sang métahumain",
      ],
      weapons: [
        { name: "Mains nues", vd: 3, ranges: "[OK/–/–/–]" },
        { name: "Crocs", vd: 4, ranges: "[OK/–/–/–]" },
      ],
      equip: ["Commlink", "Vêtements blindés (Armure 2)"],
      phys: [5, 8, 11], ment: [3, 6, 9],
    },
    jeuneDragon: {
      label: "Jeune dragon", tier: "Boss", threat: "extrême",
      attrs: { FOR: 10, AGI: 6, VOL: 6, LOG: 6, CHA: 6 },
      skills: [
        { name: "Armes à distance", val: 6, attr: "AGI", spec: "Souffle enflammé", specVal: 8, specAttr: "AGI", specRR: 2 },
        { name: "Athlétisme", val: 7, attr: "FOR", spec: "Vol", specVal: 8, specAttr: "FOR" },
        { name: "Athlétisme", val: 7, attr: "FOR", spec: "Défense à distance", specVal: 6, specAttr: "AGI" },
        { name: "Combat rapproché", val: 6, attr: "AGI", spec: "Griffes et crocs", specVal: 8, specAttr: "AGI", specRR: 2 },
        { name: "Combat astral", val: 6, attr: "VOL" },
        { name: "Furtivité", val: 4, attr: "AGI" },
        { name: "Perception", val: 6, attr: "LOG", spec: "Physique", specVal: 8, specAttr: "LOG", specRR: 2 },
        { name: "Conjuration", val: 6, attr: "LOG" },
        { name: "Sorcellerie", val: 6, attr: "VOL" },
        { name: "Influence", val: 5, attr: "CHA", spec: "Intimidation", specVal: 8, specAttr: "CHA", specRR: 2 },
      ],
      edges: [
        "Nature duale (pouvoir) : toujours présent sur les plans physique et astral",
        "Armure mystique (pouvoir) : Armure 6 (physique et magique)",
        "Souffle enflammé (pouvoir) : RR 2 aux tests d'Armes à distance (souffle enflammé)",
        "Sens accrus (pouvoir) : audition large spectre, odorat, visions nocturne et thermo ; RR 2 aux tests de Perception (physique)",
        "Magie draconique (pouvoir) : accès à tous les sorts utiles",
        "Terreur (pouvoir) : RR 2 aux tests de Combat rapproché (griffes et crocs) et d'Influence (intimidation)",
        "Langue draconique (pouvoir) : parle et se fait comprendre sans langage audible",
      ],
      weapons: [
        { name: "Griffes et crocs", vd: 12, ranges: "[OK/–/–/–]" },
        { name: "Combat astral", vd: 6, ranges: "[OK/–/–/–]" },
        { name: "Souffle enflammé", vd: 8, ranges: "[OK/OK/Dés./–]" },
      ],
      phys: [16, 19, 22], ment: [12, 15, 18],
    },
  },

  catalogFor(edition) {
    return edition === "sr5" ? this.SR5 : edition === "sr6" ? this.SR6 : this.ANARCHY;
  },

  /* ---- Génération d'une créature autonome (objet PNJ standard) ---- */
  spawn(edition, key) {
    const c = this.catalogFor(edition)[key];
    if (!c) return null;
    if (edition === "anarchy") return this._spawnAnarchy(c, key);
    return this._spawnSR(c, key, edition);
  },

  _spawnSR(c, key, edition) {
    const K = edition === "sr6"
      ? ["CON", "AGI", "RÉA", "FOR", "VOL", "LOG", "INT", "CHA"]
      : ["CON", "AGI", "REA", "FOR", "VOL", "LOG", "INT", "CHA"];
    const attrs = {};
    K.forEach((k, i) => (attrs[k] = c.a[i]));
    if (c.a[8] != null) attrs.MAG = c.a[8];
    attrs.ESS = 6;

    const skills = Object.entries(c.skills).map(([name, val]) => ({ name, val }));
    const traits = c.traits.map(([name, desc]) => (desc ? { name, desc } : { name }));

    const pnj = {
      id: Utils.uid(),
      type: "creature",
      edition,
      creatureKey: key,
      name: c.label,
      meta: "Créature",
      gender: "",
      archetype: c.label,
      special: "Aucun",
      proRating: 3,
      attrs,
      skills,
      equip: [],
      augs: [],
      spells: [],
      powers: [],
      traits,
      notes: "",
      physFilled: 0,
      stunFilled: 0,
      initDice: c.dice,
    };
    if (edition === "sr5") {
      pnj.init = c.init;
      pnj.physMon = c.mon[0];
      pnj.stunMon = c.mon[1];
      pnj.limPhys = c.lim[0];
      pnj.limMent = c.lim[1];
      pnj.limSoc = c.lim[2];
      pnj.armure = c.armure;
      pnj.defense = attrs.REA + attrs.INT;
      pnj.damageResist = attrs.CON + (c.armure || 0);
      pnj.composure = attrs.VOL + attrs.CHA;
      pnj.judgeIntentions = attrs.INT + attrs.CHA;
      pnj.memory = attrs.LOG + attrs.VOL;
      pnj.drainResist = null;
    } else {
      pnj.initBase = c.init;
      pnj.me = c.me;
      pnj.sdBase = c.sd;
      pnj.defense = attrs.RÉA + attrs.INT;
      pnj.damageResist = attrs.CON;
      pnj.composure = attrs.VOL + attrs.CHA;
      pnj.judgeIntentions = attrs.INT + attrs.CHA;
      pnj.memory = attrs.LOG + attrs.VOL;
      pnj.drainResist = null;
      pnj.pa = null;
    }
    return pnj;
  },

  _spawnAnarchy(c, key) {
    return {
      id: Utils.uid(),
      type: "creature",
      edition: "anarchy",
      creatureKey: key,
      name: c.label,
      meta: "Créature",
      gender: "",
      archetype: c.label,
      tier: c.tier || "Figurant",
      threatLevel: c.threat || "forte",
      attrs: { ...c.attrs },
      skills: c.skills.map((s) => ({ ...s })),
      edges: [...(c.edges || [])],
      weapons: (c.weapons || []).map((w) => ({
        name: w.name,
        vd: w.vd,
        vdBase: w.vd,
        vdMeta: {},
        ranges: w.ranges,
      })),
      spells: [],
      equip: [...(c.equip || [])],
      notes: "",
      physMonitor: [...c.phys],
      mentMonitor: [...c.ment],
      matrixMonitor: null,
      legerFilled: 0,
      graveFilled: 0,
      incapFilled: 0,
      narcoUsed: 0,
      legerCapBonus: c.legerCapBonus || 0,
      graveCapBonus: c.graveCapBonus || 0,
    };
  },
};
