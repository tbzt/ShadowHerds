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
  /* ---- SR5 : compétences actives (Livre de Règles p.130-150) ----
     Liste canonique de la « Liste des compétences » p.149-150, classée
     par attribut lié. Ne contient QUE des compétences actives : ni
     groupes (Armes à feu, Athlétisme, Conjuration…), ni connaissances
     (voir sr5Knowledges), ni spécialisations. Noms VF officiels. */
  sr5: {
    // Agilité
    "Arme à distance exotique": "AGI",
    "Arme de mêlée exotique": "AGI",
    "Armes automatiques": "AGI",
    "Armes contondantes": "AGI",
    "Armes de jet": "AGI",
    "Armes de trait": "AGI",
    "Armes de véhicule": "AGI",
    "Armes lourdes": "AGI",
    "Armes tranchantes": "AGI",
    "Combat à mains nues": "AGI",
    "Discrétion": "AGI",
    "Escamotage": "AGI",
    "Évasion": "AGI",
    "Fusils": "AGI",
    "Gymnastique": "AGI",
    "Pistolets": "AGI",
    "Serrurerie": "AGI",
    // Charisme
    "Animaux": "CHA",
    "Enseignement": "CHA",
    "Escroquerie": "CHA",
    "Étiquette": "CHA",
    "Imposture": "CHA",
    "Intimidation": "CHA",
    "Leadership": "CHA",
    "Négociation": "CHA",
    "Représentation": "CHA",
    // Constitution
    "Chute libre": "CON",
    "Plongée": "CON",
    // Force
    "Course": "FOR",
    "Natation": "FOR",
    // Intuition
    "Artisanat": "INT",
    "Déguisement": "INT",
    "Observation astrale": "INT",
    "Orientation": "INT",
    "Perception": "INT",
    "Pistage": "INT",
    // Logique
    "Arcanes": "LOG",
    "Armurerie": "LOG",
    "Biotechnologie": "LOG",
    "Chimie": "LOG",
    "Cybercombat": "LOG",
    "Cybertechnologie": "LOG",
    "Explosifs": "LOG",
    "Falsification": "LOG",
    "Guerre électronique": "LOG",
    "Hacking": "LOG",
    "Informatique": "LOG",
    "Logiciels": "LOG",
    "Matériel électronique": "LOG",
    "Mécanique aéronautique": "LOG",
    "Mécanique automobile": "LOG",
    "Mécanique industrielle": "LOG",
    "Mécanique nautique": "LOG",
    "Médecine": "LOG",
    "Premiers soins": "LOG",
    // Magie
    "Alchimie": "MAG",
    "Bannissement": "MAG",
    "Contresort": "MAG",
    "Création d'artefact": "MAG",
    "Désenchantement": "MAG",
    "Invocation": "MAG",
    "Lancement de sorts": "MAG",
    "Lien d'esprit": "MAG",
    "Magie rituelle": "MAG",
    // Réaction
    "Appareils spatiaux": "REA",
    "Appareils volants": "REA",
    "Marcheurs": "REA",
    "Véhicule exotique": "REA",
    "Véhicules aquatiques": "REA",
    "Véhicules terrestres": "REA",
    // Résonance
    "Compilation": "RES",
    "Décompilation": "RES",
    "Inscription": "RES",
    // Volonté
    "Combat astral": "VOL",
    "Survie": "VOL",
  },

  /* ---- SR5 : compétences de connaissances (Livre de Règles p.150-152) ----
     En SR5 les connaissances sont LIBRES : il n'existe pas de liste
     fermée comme pour les compétences actives. Cette map n'est qu'une
     réserve de suggestions courantes (celles jadis mêlées à tort aux
     compétences actives), tenue à part et NON exposée par skillsFor(). */
  sr5Knowledges: {
    "Connaissance ésotérique": "INT",
    "Enquête": "LOG",
    "Maintien de l'ordre": "INT",
    "Procédures de sécurité": "INT",
    "Psychologie": "LOG",
    "Sciences appliquées": "LOG",
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

  /* ---- Anarchy 2.0 : compétences (extraites des statBlocks du jeu) ---- */
  anarchy2: {
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

  /* ---- Anarchy 1re édition : ~25 compétences (base p.60-61) ----
     Spécialisation = +2 dés (comme SR5, pas de RR) — pas de liste de
     spécialités fermée comme anarchySpecs (V2) : texte libre en V1. */
  anarchy1: {
    // Force
    "Athlétisme": "FOR",
    // Agilité
    "Acrobaties": "AGI",
    "Armes à feu": "AGI",
    "Armes à projectiles": "AGI",
    "Armes de véhicules": "AGI",
    "Armes lourdes": "AGI",
    "Corps à corps": "AGI",
    "Furtivité": "AGI",
    "Véhicules divers": "AGI",
    "Véhicules terrestres": "AGI",
    // Volonté (Éveillés pour Combat astral/Conjuration/Sorcellerie)
    "Combat astral": "VOL",
    "Conjuration": "VOL",
    "Sorcellerie": "VOL",
    "Survie": "VOL",
    // Logique (Technomancie réservée aux Émergés)
    "Biotech": "LOG",
    "Électronique": "LOG",
    "Hacking": "LOG",
    "Ingénierie": "LOG",
    "Pistage": "LOG",
    "Technomancie": "LOG",
    // Charisme
    "Animaux": "CHA",
    "Comédie": "CHA",
    "Étiquette": "CHA",
    "Intimidation": "CHA",
    "Négociation": "CHA",
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
    const map = this[edition] || this.anarchy2;
    return Object.keys(map).sort((a, b) => a.localeCompare(b, "fr"));
  },

  /* Attribut canonique d'une compétence — cherche d'abord dans les
     compétences actives, puis dans les connaissances de l'édition (ex.
     sr5Knowledges). Renvoie null si inconnu. */
  attrFor(edition, skillName) {
    const map = this[edition] || this.anarchy2;
    const knowMap = this[`${edition}Knowledges`] || {};
    // Tolère un suffixe de spécialisation entre parenthèses.
    const base = String(skillName).replace(/\s*\(.*\)\s*$/, "").trim();
    return map[base] || map[skillName] || knowMap[base] || knowMap[skillName] || null;
  },
};
