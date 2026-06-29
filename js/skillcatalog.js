"use strict";

/* ============================================================
   SKILL CATALOG — listes de compétences et spécialités issues
   des livres de base, pour l'édition manuelle des PNJ.

   Sources :
   - SR5  : Livre de Règles (BBE, fr), Compétences actives p.130-150
   - SR6  : Livre de Règles (BBE, fr), 18 compétences regroupées p.106+
   - Anarchy 2.0 : Compétences p.62+ (extraites des profils du jeu)

   Chaque compétence est rattachée à son attribut canonique (utile
   pour calculer le pool en SR6/Anarchy). Les spécialités courantes
   sont proposées par compétence ; en SR5/SR6 elles restent libres,
   en Anarchy elles suivent la liste des règles.
   ============================================================ */
const SkillCatalog = {
  /* ---- SR5 : compétences actives (Livre de Règles p.130-150) ---- */
  sr5: {
    "Acrobaties": "AGI",
    "Armes à feu": "AGI",
    "Armes automatiques": "AGI",
    "Armes contondantes": "AGI",
    "Armes de jet": "AGI",
    "Armes exotiques": "AGI",
    "Armes lourdes": "AGI",
    "Armes tranchantes": "AGI",
    "Arts martiaux": "AGI",
    "Athlétisme": "AGI",
    "Aviation": "REA",
    "Biotechnologie": "LOG",
    "Chimie": "LOG",
    "Combat à mains nues": "AGI",
    "Conduite": "REA",
    "Conjuration": "MAG",
    "Connaissance ésotérique": "INT",
    "Contrefaçon": "AGI",
    "Contresort": "MAG",
    "Course": "REA",
    "Crochetage": "AGI",
    "Cybercombat": "LOG",
    "Déguisement": "INT",
    "Discrétion": "AGI",
    "Électronique": "LOG",
    "Enquête": "LOG",
    "Étiquette": "CHA",
    "Explosifs": "AGI",
    "Filature": "AGI",
    "Guérison": "MAG",
    "Gymnastique": "AGI",
    "Hacking": "LOG",
    "Hardware": "LOG",
    "Imposition": "CHA",
    "Industrie": "LOG",
    "Informatique": "LOG",
    "Ingénierie": "LOG",
    "Intimidation": "CHA",
    "Lancer de sorts": "MAG",
    "Leadership": "CHA",
    "Magie rituelle": "MAG",
    "Maîtrise des animaux": "CHA",
    "Maintien de l'ordre": "AGI",
    "Mécanique aéronautique": "LOG",
    "Mécanique automobile": "LOG",
    "Mécanique industrielle": "LOG",
    "Mécanique nautique": "LOG",
    "Métamorphose": "MAG",
    "Natation": "FOR",
    "Navigation": "INT",
    "Négociation": "CHA",
    "Observation astrale": "INT",
    "Parachutisme": "REA",
    "Perception": "INT",
    "Pilotage drones": "REA",
    "Pilotage exotiques": "REA",
    "Pistolets": "AGI",
    "Premiers soins": "LOG",
    "Procédures de sécurité": "INT",
    "Psychologie": "LOG",
    "Récupération de données": "LOG",
    "Reliure": "MAG",
    "Résistance aux sorts": "MAG",
    "Sciences appliquées": "LOG",
    "Survie": "VOL",
  },

  /* ---- SR6 : 18 compétences regroupées (Livre de Règles p.106) ---- */
  sr6: {
    "Armes à feu": "AGI",
    "Astral": "INT",
    "Athlétisme": "AGI",
    "Biotech": "LOG",
    "Combat rapproché": "AGI",
    "Conjuration": "MAG",
    "Discrétion": "AGI",
    "Électronique": "LOG",
    "Enchantement": "MAG",
    "Escroquerie": "CHA",
    "Furtivité": "AGI",
    "Influence": "CHA",
    "Ingénierie": "LOG",
    "Intimidation": "CHA",
    "Leadership": "CHA",
    "Perception": "INT",
    "Pilotage": "REA",
    "Piratage": "LOG",
    "Sorcellerie": "MAG",
    "Survie": "VOL",
  },

  /* ---- Anarchy 2.0 : compétences (extraites des profils du jeu) ---- */
  anarchy: {
    "Armes à distance": "AGI",
    "Astral": "LOG",
    "Athlétisme": "FOR",
    "Combat rapproché": "FOR",
    "Conjuration": "VOL",
    "Course": "FOR",
    "Cybercombat": "LOG",
    "Électronique": "LOG",
    "Furtivité": "AGI",
    "Influence": "CHA",
    "Ingénierie": "LOG",
    "Intimidation": "CHA",
    "Matricielle": "LOG",
    "Négociation": "CHA",
    "Perception": "LOG",
    "Pilotage": "AGI",
    "Piratage": "LOG",
    "Réseau": "CHA",
    "Sociale": "CHA",
    "Sorcellerie": "VOL",
    "Survie": "VOL",
  },

  /* ---- Spécialités Anarchy 2.0 (liste des règles de base) ---- */
  anarchySpecs: [
    "Arme principale",
    "Armes contondantes",
    "Armes contrôlées à distance",
    "Bluff",
    "Cybercombat",
    "Défense à distance",
    "Discrétion physique",
    "Esprits des aînés",
    "Esprits du feu",
    "Force brute",
    "Fusils",
    "Gouvernemental",
    "Intimidation",
    "Lames",
    "Mains nues",
    "Mitraillettes",
    "Mitraillettes / Shotguns",
    "Motos",
    "Physique",
    "Pistolets",
    "Premiers soins",
    "Protection matricielle",
    "Recherche matricielle",
    "Sorts de combat",
    "Véhicule sélectionné",
  ],

  /* Liste des noms de compétences pour une édition donnée. */
  skillsFor(edition) {
    const map =
      edition === "sr5"
        ? this.sr5
        : edition === "sr6"
          ? this.sr6
          : this.anarchy;
    return Object.keys(map).sort((a, b) => a.localeCompare(b, "fr"));
  },

  /* Attribut canonique d'une compétence (ou null). */
  attrFor(edition, skillName) {
    const map =
      edition === "sr5"
        ? this.sr5
        : edition === "sr6"
          ? this.sr6
          : this.anarchy;
    // Tolère un suffixe de spécialisation entre parenthèses.
    const base = String(skillName).replace(/\s*\(.*\)\s*$/, "").trim();
    return map[base] || map[skillName] || null;
  },
};
