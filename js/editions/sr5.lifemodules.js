"use strict";

/* ============================================================
   SR5 — CATALOGUE DES MODULES CHRONOLOGIQUES
   ------------------------------------------------------------
   Source : « sr5_06_run_faster_v1a.pdf » (Run Faster VF, chapitre « Kits de
   construction »), pages imprimées 142 à 158. Relevé le 2026-09-09.

   **51 modules**, tous en confiance VÉRIFIÉ, chacun recoupé à l'image de sa
   page. Relevé détaillé par lot dans REFERENCE/creation-modules-sr5/.

   | Section              | Modules | Karma |
   |----------------------|---------|-------|
   | Nationalités         |    4    |  15   |
   | Enfance              |   10    |  40   |
   | L'adolescence        |   10    |  50   |
   | Études supérieures   |    5    | 40-115, propre à chaque module |
   | La vraie vie         |   22    | 100   |

   ------------------------------------------------------------
   POURQUOI CE CATALOGUE N'A PAS LA FORME DE CELUI DE SR6

   Les modules SR6 sont des listes à puces ; ceux-ci sont des TABLEAUX
   ENCADRÉS à deux colonnes, avec des sous-lignes indentées dont le libellé
   change d'une famille à l'autre — « Régions » pour les nationalités,
   « Démographies » pour le Tìr Tairngire, « Vocation » ou « Disciplines
   scientifiques » en Études supérieures. On ne leur impose donc AUCUN schéma :
   `lignes` et `souslignes` portent les libellés du livre tels quels, et les
   valeurs sont littérales (« Logique +1 », « Connaissances : [Ville] +2 »,
   « SINner (5) » — le nombre entre parenthèses est le coût en karma du trait).

   ------------------------------------------------------------
   CE QUE LE RELEVÉ A COÛTÉ, ET QUI RESSERVIRA

   Trois hypothèses de départ ont été démenties par les agents qui ont relevé,
   chaque fois preuves à l'appui :

   1. **La maquette ouvre chaque section en tête de COLONNE DROITE**, la
      colonne gauche finissant la précédente. Déduire la section d'un module de
      sa position verticale est faux — c'est ainsi que Précepteur et Vie à la
      ferme avaient été mal classés en Études supérieures.
   2. **« Études de troisième cycle » n'est pas une section mais un module** de
      La vraie vie. Le seul discriminant est la COULEUR du titre — rouge sombre
      pour une section, noir pour un module — à taille de police identique.
      Invisible à toute extraction texte.
   3. **Fugitif et Éducation rurale ne sont pas exclusifs entre eux** : la
      règle est imprimée chez École préparatoire, trois pages plus loin, et les
      vise ensemble.

   Contrôles réutilisables : l'ordre alphabétique par section (10 modules
   exactement en Enfance et en Adolescence) ; un coût entre parenthèses dans le
   titre signe un module d'Études supérieures.

   ⚠ **Deux modules HOMONYMES** existent réellement — « Vie à la ferme » et
   « Éducation rurale en zone isolée » figurent chacun dans deux sections avec
   des valeurs différentes. La section fait partie de leur identité, d'où des
   `id` préfixés par elle.

   ⚠ **Cinq entrées portent une troncature DU LIVRE** signalée en `special` :
   une ligne s'y termine par une virgule sans rien après. Ce n'est pas une
   perte d'extraction, c'est un défaut de composition — ne pas « réparer ».
   ============================================================ */
import { EditionSR5 } from "./sr5.js";
import "./sr5.creation.js";

EditionSR5.creation.lifeModules.catalogue = [
  { id: "nationalites_nationalite_cas", nom: "NATIONALITÉ : CAS", section: "Nationalités", page: 142, karma: 15,
    lignes: [
      { label: "Langue principale", valeur: "Anglais (N)" },
      { label: "Langues secondaires (choisir une langue, rang 1)", valeur: "Espagnol, Allemand, Polonais, Yiddish" },
      { label: "Compétences universelles", valeur: "Étiquette +1, Connaissances : Histoire +1, Connaissances : CAS +1" },
      { label: "Régions", valeur: "" },
    ],
    souslignes: [
      { label: "CAS, général", valeur: "Charisme +1, Informatique +2, SINner (5)" },
      { label: "Denver", valeur: "Intuition +1, Connaissances : Denver +2, Négociation +1, Informatique +1, SINner (5)" },
      { label: "SINless", valeur: "Constitution +1, Connaissances : [Ville] +1" },
    ],
    special: "l'encadré ne mentionne aucun coût ; la prose d'ouverture du système (p. 142, col. gauche) dit « Puis vous devez choisir votre nationalité et votre région d'origine dans cette nation. Chacun de ces modules coûte 15 points de Karma. » — Trois sous-lignes seulement (pas de Canada, pas de Seattle), et « Denver » sans qualificatif de secteur, contrairement à l'UCAS. La liste de langues secondaires n'en compte que quatre.",
  },
  { id: "nationalites_nationalite_ucas", nom: "NATIONALITÉ : UCAS", section: "Nationalités", page: 143, karma: 15,
    lignes: [
      { label: "Langue principale", valeur: "Anglais (N)" },
      { label: "Langues secondaires (choisir une langue, rang 1)", valeur: "Espagnol, Allemand, Italien, Français, Mandarin, Polonais, Yiddish" },
      { label: "Compétences universelles", valeur: "Informatique +1, Connaissances : Histoire +1, Connaissances : UCAS +1" },
      { label: "Régions", valeur: "" },
    ],
    souslignes: [
      { label: "UCAS, général", valeur: "Logique +1, Étiquette +1, Connaissances : [Ville] +2, Langue +2, SINner (5)" },
      { label: "Canada", valeur: "Constitution +1, Orientation +1, Survie +1, Étiquette +1, SINner (5)" },
      { label: "Denver (secteur sous contrôle UCAS)", valeur: "Intuition +1, Connaissances : Denver +2, Négociation +1, Étiquette +1, SINner (5)" },
      { label: "Seattle", valeur: "Réaction +1, Perception +1, Intimidation +1, Connaissances : Seattle +2, SINner (5)" },
      { label: "SINless", valeur: "Agilité +1, Connaissances : [Ville] +1" },
    ],
    special: "même règle des 15 points de Karma (prose p. 142) ; l'encadré ne la répète pas.",
  },
  { id: "nationalites_nationalite_nao", nom: "NATIONALITÉ : NAO", section: "Nationalités", page: 143, karma: 15,
    lignes: [
      { label: "Langue principale", valeur: "Choisir l'une des langues listées dans la section Région." },
      { label: "Langues secondaires (choisir une langue, rang 1)", valeur: "Voir la section Région : quand disponible, choisir une langue secondaire, rang 1. L'Anglais peut aussi être choisi, rang 1." },
      { label: "Compétences universelles", valeur: "Armes de trait +2, Connaissance : Histoire +1, Connaissances : NAO +1" },
      { label: "Régions", valeur: "" },
    ],
    souslignes: [
      { label: "Conseil algonkin-manitou", valeur: "Langues : Athabaskan, Anishinaabe, Iroquois, Plein air (GC) +1, Perception +1, Armes tranchantes +1, Combat à mains nues +1, Connaissances de la rue : [Tribu] +1, SINner (5)" },
      { label: "Conseil athabaskan", valeur: "Constitution +1, Orientation +1, Survie +1, Étiquette +1, SINner (5)" },
      { label: "Conseil corporatif pueblo", valeur: "Intuition +1, Connaissances : Denver +2, Négociation +1, Étiquette +1, SINner (5)" },
      { label: "Conseil salish-shidhe", valeur: "Réaction +1, Perception +1, Intimidation +1, Connaissances : Seattle +2, SINner (5)" },
      { label: "Nation sioux", valeur: "Agilité +1, Connaissances : [Ville] +1" },
      { label: "Nation transpolaire aléoute", valeur: "Langues : Eskimo-aléoute, Arme de mêlée exotique (Harpon) +2, Perception +1, Survie +1, Connaissances professionnelles : Milieu polaire +2, SINner (5)" },
      { label: "Nation tsimshiane", valeur: "Langues : Athabaskan, Tlingit, Tsimshian, Sioux, Force +1, Armes tranchantes +1, Allergie (Rare/Légère) (5)" },
      { label: "Denver", valeur: "Langues : Anglais, Espagnol, Hopi, Sioux, Zuni, Intuition +1, Informatique +1, SINner (5)" },
      { label: "Las Vegas", valeur: "Langues : n'importe quelle langue tribale américaine, Perception +1, Constitution +2, Étiquette +1, Connaissances de la rue : Jeux d'argent +2, SINner (5)" },
      { label: "Salt Lake City", valeur: "Langues : Anglais, Espagnol, Hopi, Zuni, Artisanat +1, Informatique +1, Étiquette +1, Négociation +1, Perception +1, Connaissances de la rue : Mormons +2, SINner (5)" },
    ],
    special: "même règle des 15 points de Karma (prose p. 142). Le module renvoie ses deux lignes de langues à la sous-ligne de Région choisie : il n'est pas jouable sans elle. Quatre sous-lignes reprennent mot pour mot des lignes de l'UCAS (Conseil athabaskan = Canada, Conseil corporatif pueblo = Denver UCAS, Conseil salish-shidhe = Seattle, Nation sioux = SINless) : relevé tel quel, sans correction. « Nation tsimshiane » est la seule sous-ligne de tout le lot à ne pas porter SINner et à porter un défaut à la place.",
  },
  { id: "nationalites_nationalite_tir_tairngire", nom: "NATIONALITÉ : TÌR TAIRNGIRE", section: "Nationalités", page: 143, karma: 15,
    lignes: [
      { label: "Langue principale", valeur: "Sperethiel (N)" },
      { label: "Langues secondaires (choisir une langue, rang 1)", valeur: "Anglais 2" },
      { label: "Compétences universelles", valeur: "Étiquette, Connaissances : Histoire +1, Connaissances de la rue : Tìr Tairngire +1" },
      { label: "Démographies", valeur: "" },
    ],
    souslignes: [
      { label: "Elfes/Humains", valeur: "Charisme +1, Informatique +2, SINner (5)" },
      { label: "Orks/Trolls/Nains", valeur: "Constitution +2, Déguisement +1, Intimidation +1, Discrétion +1, Perception +1, Connaissances de la rue : Contre-cultures +2, SINner (5)" },
    ],
    special: "même règle des 15 points de Karma (prose p. 142). Seul module de la section à écrire **Démographies** au lieu de **Régions**. Deux irrégularités d'impression relevées telles quelles : « Anglais 2 » (les autres modules écrivent « rang 1 » ou « +N »), et « Étiquette » sans valeur en tête des Compétences universelles.",
  },
  { id: "enfance_cols_blancs", nom: "COLS BLANCS", section: "Enfance", page: 144, karma: 40,
    lignes: [
      { label: "Attributs", valeur: "Charisme +1, Logique +1" },
      { label: "Compétences", valeur: "Connaissances (hobbies) : [1 au choix] +3, Langue +3, Négociation +1, Spécialisation Étiquette (profession)" },
    ],
    special: "l'encadré ne porte pas de coût ; l'introduction de la section ENFANCE (p. 144) dit « Tous ces modules coûtent 40 points de Karma. » Le titre de prose est **COL BLANC** (singulier), le titre de l'encadré **COLS BLANCS** (pluriel). Seul module d'Enfance sans ligne Traits. La dernière entrée est une spécialisation, pas un rang.",
  },
  { id: "enfance_drone_corpo", nom: "DRONE CORPO", section: "Enfance", page: 144, karma: 40,
    lignes: [
      { label: "Attributs", valeur: "Charisme +1, Logique +1" },
      { label: "Compétences", valeur: "Connaissances académiques : [Corporation] +3, Électronique (GC) +2, Étiquette +2, Perception +1" },
    ],
    special: "40 points de Karma d'après l'intro d'ENFANCE (p. 144) ; l'encadré ne le répète pas. Pas de ligne Traits.",
  },
  { id: "enfance_education_rurale_en_zone_isolee", nom: "ÉDUCATION RURALE EN ZONE ISOLÉE", section: "Enfance", page: 144, karma: 40,
    lignes: [
      { label: "Attributs", valeur: "Constitution +1, Force +1" },
      { label: "Traits", valeur: "Asocial (14), Dur à cuire (9), Illettré (8)" },
      { label: "Compétences", valeur: "Armes tranchantes +1, Combat à mains nues +1, Connaissances : Agriculture +2, Course +1, Plein air (GC) +2" },
    ],
    special: "40 points de Karma d'après l'intro d'ENFANCE (p. 144) ; l'encadré ne le répète pas. **Aucune exclusion n'est imprimée ici ni dans la prose de la p. 144.** La seule contrainte que le chapitre attache à ce module est énoncée plus loin, dans la prose du module ÉCOLE PRÉPARATOIRE (L'adolescence, p. 146) : « Vous ne pouvez pas choisir ce module si vous avez choisi les modules Fugitif ou Éducation rurale en zone isolée. » Ce module n'est donc pas exclusif de Fugitif : les deux sont, ensemble, exclusifs d'École préparatoire. ⚠ Un **second** module homonyme, « ÉDUCATION RURALE EN ZONE ISOLÉE », existe dans L'adolescence (p. 147) avec des valeurs différentes : ne pas les fusionner.",
  },
  { id: "enfance_fugitif", nom: "FUGITIF", section: "Enfance", page: 144, karma: 40,
    lignes: [
      { label: "Attributs", valeur: "Charisme +1, Logique +1" },
      { label: "Traits", valeur: "Mauvaise réputation (7), Paranoïa (7), SIN criminel (10)" },
      { label: "Compétences", valeur: "Comédie (GC) +2, Perception +1, Discrétion +1, Connaissance de la rue : [Ville] +2" },
    ],
    special: "40 points de Karma d'après l'intro d'ENFANCE (p. 144) ; l'encadré ne le répète pas. **Aucune exclusion imprimée dans l'encadré ni dans la prose** : la seule contrainte du chapitre citant ce module est celle d'ÉCOLE PRÉPARATOIRE (L'adolescence, p. 146), « Vous ne pouvez pas choisir ce module si vous avez choisi les modules Fugitif ou Éducation rurale en zone isolée. » Fugitif et Éducation rurale ne sont donc pas exclusifs entre eux. Irrégularité : « Connaissance de la rue » au singulier, alors que les autres encadrés écrivent « Connaissances de la rue ».",
  },
  { id: "enfance_gamin_des_rues", nom: "GAMIN DES RUES", section: "Enfance", page: 144, karma: 40,
    lignes: [
      { label: "Attributs", valeur: "Constitution +1, Volonté +1" },
      { label: "Traits", valeur: "Dur à cuire (9), Flashbacks (7), Illettré (8), Paranoïa (7)," },
      { label: "Compétences", valeur: "Combat rapproché (GC) +2, Connaissances de la rue : [Ville] +3, Course +1, Discrétion +1, Perception +1" },
    ],
    special: "40 points de Karma d'après l'intro d'ENFANCE (p. 144) ; l'encadré ne le répète pas. ⚠ La ligne Traits se termine par une **virgule finale imprimée** (« …, Paranoïa (7), ») : rien ne suit dans l'encadré, vérifié à l'image ET dans la couche texte. Le livre a vraisemblablement perdu un trait à la composition ; la valeur est reproduite telle qu'imprimée, virgule comprise.",
  },
  { id: "enfance_gosse_de_riche", nom: "GOSSE DE RICHE", section: "Enfance", page: 144, karma: 40,
    lignes: [
      { label: "Attributs", valeur: "Charisme +1" },
      { label: "Traits", valeur: "Placements (10), Préjugés : Pauvres -7" },
      { label: "Compétences", valeur: "Artisanat +1, Connaissances (hobbies) : [1 au choix] +3, Informatique +2, Langue +3, Leadership +2" },
    ],
    special: "40 points de Karma d'après l'intro d'ENFANCE (p. 144) ; l'encadré ne le répète pas. Deux irrégularités relevées telles quelles : un seul attribut sur la ligne Attributs (tous les autres modules d'Enfance en ont deux), et un coût de trait écrit **« -7 »** sans parenthèses ni signe positif — vérifié à 600 dpi — là où tous les autres coûts du chapitre s'écrivent « (N) ».",
  },
  { id: "enfance_morveux_militaire", nom: "MORVEUX MILITAIRE", section: "Enfance", page: 145, karma: 40,
    lignes: [
      { label: "Attributs", valeur: "Force +1, Réaction +1" },
      { label: "Traits", valeur: "Asocial (14)" },
      { label: "Compétences", valeur: "Combat rapproché (GC) +2, Connaissance hobbies : Histoire militaire +2, Connaissance professionnelles : Armées +3, Négociation +1, Perception +1" },
    ],
    special: "le livre écrit « Connaissance hobbies » (sans parenthèses, au singulier) et « Connaissance professionnelles » (singulier + pluriel), là où le reste du chapitre écrit « Connaissances (hobbies) : » et « Connaissances professionnelles : ». Conservé littéralement.",
  },
  { id: "enfance_orphelin", nom: "ORPHELIN", section: "Enfance", page: 145, karma: 40,
    lignes: [
      { label: "Attributs", valeur: "Volonté +1" },
      { label: "Compétences", valeur: "Connaissances de la rue : [Ville] +3, Connaissances professionnelles : Système de placement familial +3, Discrétion +2, Informatique +1, Perception +2, Survie +1" },
    ],
    special: "pas de ligne « Traits » dans l'encadré. Le module figure dans la colonne gauche de la p. 145, donc avant le titre L'ADOLESCENCE (colonne droite) — voir l'avertissement de découpage.",
  },
  { id: "enfance_vie_a_la_ferme", nom: "VIE À LA FERME", section: "Enfance", page: 145, karma: 40,
    lignes: [
      { label: "Attributs", valeur: "Constitution +1, Force +1" },
      { label: "Traits", valeur: "Illettré (8), Dur à cuire (9)" },
      { label: "Compétences", valeur: "Connaissances professionnelles : Agriculture +5, Mécanique industrielle +1" },
    ],
    special: "**homonyme** — un second module VIE À LA FERME, entièrement différent, existe dans L'ADOLESCENCE (p. 148, voir annexe). Même remarque de section que pour ORPHELIN.",
  },
  { id: "enfance_vie_en_arcologie", nom: "VIE EN ARCOLOGIE", section: "Enfance", page: 145, karma: 40,
    lignes: [
      { label: "Attributs", valeur: "Charisme +1, Logique +1" },
      { label: "Traits", valeur: "SIN corporatiste limité (15)" },
      { label: "Compétences", valeur: "Connaissances académiques : [Corporation] +3, Électronique (GC) +2, Étiquette +2, Perception +1, Spécialisation Pistolets (Tasers)*" },
    ],
    special: "note en bas d'encadré, en italique, sous un filet : « * obtenue dès que le personnage a la compétence Pistolets ». Dernier module de la section Enfance : le titre L'ADOLESCENCE suit immédiatement dans la même colonne.",
  },
  { id: "l_adolescence_ecole_militaire", nom: "ÉCOLE MILITAIRE", section: "L'adolescence", page: 145, karma: 50,
    lignes: [
      { label: "Attributs", valeur: "Charisme +1, Constitution +1" },
      { label: "Traits", valeur: "Code d'honneur (15), Rang militaire (5)" },
      { label: "Compétences", valeur: "Armes à feu (GC) +1, Armes tranchantes +1, Combat à mains nues +1, Connaissances académiques : Histoire militaire +1, Connaissances académiques : [1 au choix] +1, Connaissances professionnelles : Armées +3, Connaissances professionnelles : Stratégie +1 Course +1, Électronique (GC) +1, Leadership +1, Natation +1, Premiers soins +1" },
    ],
    special: "**virgule manquante dans le livre** entre « Stratégie +1 » et « Course +1 » (vérifié au zoom 300 dpi). Lecture attendue : « … : Stratégie +1, Course +1, … ». Conservé littéralement.",
  },
  { id: "l_adolescence_ecole_preparatoire", nom: "ÉCOLE PRÉPARATOIRE", section: "L'adolescence", page: 146, karma: 50,
    lignes: [
      { label: "Attributs", valeur: "Charisme +1, Logique +1" },
      { label: "Traits", valeur: "Première impression (11)" },
      { label: "Compétences", valeur: "Connaissances académiques : [2 au choix] +1, Chimie +1, Étiquette +1, Informatique +1, Langue [1 au choix] +1" },
    ],
    special: "**EXCLUSION** (dans la prose, hors encadré) : « Vous ne pouvez pas choisir ce module si vous avez choisi les modules **Fugitif** ou **Éducation rurale en zone isolée.** » Les deux noms sont en gras dans le livre. Attention : « Éducation rurale en zone isolée » désigne deux modules (Enfance p. 144 et Adolescence p. 147) ; le livre ne précise pas lequel.",
  },
  { id: "l_adolescence_education_corpo", nom: "ÉDUCATION CORPO", section: "L'adolescence", page: 146, karma: 50,
    lignes: [
      { label: "Attributs", valeur: "Charisme +1, Logique +1" },
      { label: "Compétences", valeur: "Chimie +1, Connaissances académiques : [2 au choix] +1, Connaissance professionnelles : [Corporation] +2, Connaissance professionnelles : [Travail] +2, Électronique (GC) +1, Gymnastique +1" },
    ],
    special: "pas de ligne « Traits ». Le livre écrit deux fois « Connaissance professionnelles » (singulier + pluriel) ; conservé littéralement.",
  },
  { id: "l_adolescence_education_magique", nom: "ÉDUCATION MAGIQUE", section: "L'adolescence", page: 146, karma: 50,
    lignes: [
      { label: "Attributs", valeur: "Charisme +1, Volonté +1" },
      { label: "Traits", valeur: "SIN corporatiste limité" },
      { label: "Compétences", valeur: "**Magicien :** Ajoutez 1 rang à 2 des groupes de compétences suivants : Conjuration, Enchantement, Sorcellerie. **Adepte :** Ajoutez 1 rang à 2 des groupes de compétences suivants : Armes à feu (GC), Combat rapproché (GC), Furtivité (GC). **Magicien spécialisé :** Ajoutez 1 rang à 1 des groupes de compétences suivants : Conjuration, Enchantement, Sorcellerie ; ajoutez 2 à 2 des compétences suivantes : Arcanes, Combat astral, Observation astrale, Combat astral. **Adepte mystique :** Ajoutez 1 rang à n'importe lequel des deux groupes mentionnés pour Magicien ou Adepte." },
      { label: "Compétences (2ᵉ bande, sans libellé)", valeur: "**Pour tous :** Arcanes +2, Connaissances académiques : Magie théorique +5, Connaissances académiques : [1 au choix] +4, Connaissances académiques : [1 au choix] +4, Connaissances académiques : [1 au choix] +3, Langue [1 au choix] +2" },
    ],
  },
  { id: "l_adolescence_education_rurale_en_zone_isolee", nom: "ÉDUCATION RURALE EN ZONE ISOLÉE", section: "L'adolescence", page: 147, karma: 50,
    lignes: [
      { label: "Attributs", valeur: "Constitution +1, Volonté +1" },
      { label: "Traits", valeur: "Incompétent : Électronique (5)" },
      { label: "Compétences", valeur: "Armes tranchantes +1, Connaissance de la rue : Créatures +2, Discrétion +1, Fusils +1, Gymnastique +1, Perception +2, Plein air (GC) +1, Premiers soins +1" },
    ],
    special: "**homonyme** — un module ÉDUCATION RURALE EN ZONE ISOLÉE existe aussi dans l'Enfance (p. 144, lot 1), avec des valeurs différentes. Le titre de l'encadré est sur deux lignes (« ÉDUCATION RURALE / EN ZONE ISOLÉE »). Le livre écrit « Connaissance de la rue » au singulier ici, contre « Connaissances de la rue » ailleurs ; conservé.",
  },
  { id: "l_adolescence_enfant_des_rues", nom: "ENFANT DES RUES", section: "L'adolescence", page: 147, karma: 50,
    lignes: [
      { label: "Attributs", valeur: "Constitution +1, Volonté +1" },
      { label: "Traits", valeur: "Mauvaise réputation (7), Vendetta (10)" },
      { label: "Compétences", valeur: "Armes contondantes +1, Connaissances de la rue : [Ville] +1, Comédie (GC) +2, Course +1, Étiquette +1, Furtivité (GC) +1, Gymnastique +1, Intimidation +1, Négociation +1, Perception +1, Premiers soins +1" },
    ],
    special: "l'exemple de création (Trainwreck, p. 159) confirme le coût de 50 Karma pour ce module (695 → 645) mais y désigne la compétence comme « Connaissances de la rue : [1 au choix] +1 » alors que l'encadré écrit « [Ville] +1 ». Divergence dans la prose, pas dans le tableau.",
  },
  { id: "l_adolescence_guerre_des_gangs", nom: "GUERRE DES GANGS", section: "L'adolescence", page: 147, karma: 50,
    lignes: [
      { label: "Attributs", valeur: "Constitution +1, Réaction +1, Volonté +1" },
      { label: "Traits", valeur: "Canaux de marché noir (10), Paranoïa (7), Illettré (8), SIN criminel (10)" },
      { label: "Compétences", valeur: "Armes à feu (GC) +1, Armes tranchantes +2, Connaissances de la rue : [Ville] +2, Course +1, Discrétion +1, Leadership +1, Négociation +1, Perception +1, Premier soins +1, Survie +1" },
    ],
    special: "**coquille du livre** : « Premier soins +1 » (au lieu de « Premiers soins »), vérifiée au zoom 300 dpi. Conservée littéralement. Les Traits ne sont pas dans l'ordre alphabétique, contrairement à l'usage du chapitre.",
  },
  { id: "l_adolescence_lycee", nom: "LYCÉE", section: "L'adolescence", page: 147, karma: 50,
    lignes: [
      { label: "Attributs", valeur: "Charisme +1, Logique +1" },
      { label: "Compétences", valeur: "Athlétisme +1, Chimie +1, Connaissances académiques : [2 au choix] +1, Connaissance de la rue : [Ville de résidence] +1, Informatique +1, Langue +1, Logiciels +2" },
    ],
    special: "pas de ligne « Traits ». « Athlétisme » est un groupe de compétences dans SR5, mais l'encadré ne porte pas la marque « (GC) » ; relevé tel quel, sans l'ajouter. Le libellé de zone est ici « [Ville de résidence] », alors que les autres modules écrivent « [Ville] ». « Connaissance de la rue » au singulier.",
  },
  { id: "l_adolescence_precepteur", nom: "PRÉCEPTEUR", section: "L'adolescence", page: 148, karma: 50,
    lignes: [
      { label: "Attributs", valeur: "Logique +1, Volonté +1" },
      { label: "Traits", valeur: "Traumatisme (8)" },
      { label: "Compétences", valeur: "Connaissances académiques : [2 au choix] +3, Chimie +1, Informatique +3, Langue +2, Logiciels +2" },
    ],
    special: "la prose du module (« Au lieu de sortir et de vous mélanger aux autres pour suivre vos études… ») est en tête de colonne gauche, en vis-à-vis du titre ÉTUDES SUPÉRIEURES — piège de maquette.",
  },
  { id: "l_adolescence_vie_a_la_ferme", nom: "VIE À LA FERME", section: "L'adolescence", page: 148, karma: 50,
    lignes: [
      { label: "Attributs", valeur: "Constitution +1, Intuition +1" },
      { label: "Traits", valeur: "Empathie animale (3)" },
      { label: "Compétences", valeur: "Connaissances professionnelles : Agriculture +1, Connaissances (hobbies) : [1 au choix] +1, Fusils +1, Mécanique industrielle +2, Véhicules terrestres +2, Pistolets +1" },
    ],
    special: "**homonyme** du module VIE À LA FERME de l'Enfance (p. 145) — valeurs entièrement différentes. Les compétences ne sont pas dans l'ordre alphabétique (Pistolets en fin de liste).",
  },
  { id: "etudes_superieures_academies_militaires", nom: "ACADÉMIES MILITAIRES", section: "Études supérieures", page: 149, karma: 115,
    lignes: [
      { label: "Attributs", valeur: "Constitution +1, Force +1, Réaction +1" },
      { label: "Traits", valeur: "Rang militaire (20)" },
      { label: "Compétences universelles", valeur: "Armes à feu (GC) +1, Connaissances académiques : Histoire militaire +2, Connaissances professionnelles : Armées +3, Combat à mains nues +1, Leadership +1, Natation+1, Orientation +1, Premiers soins +1" },
    ],
    souslignes: [
      { label: "Disciplines scientifiques", valeur: "" },
      { label: "Architecture", valeur: "Connaissances académiques : Construction +5, Mécanique industrielle +1, Premiers soins +1, Spécialisation Artisanat (Dessin)" },
      { label: "Commerce", valeur: "Connaissances académiques : Économie +5, Escroquerie +1, Étiquette +1, Négociation +2" },
      { label: "Droit", valeur: "Connaissances académiques : Lois +5, Étiquette +1, Négociation +2, Représentation +1" },
      { label: "Ingénierie", valeur: "Chimie +1, Connaissances académiques : Ingénierie +5, Matériel électronique +1, Mécanique industrielle +2" },
      { label: "Magie", valeur: "Connaissances académiques : Théorie Magique ou Métaplans +5, Sorcellerie (GC) +1" },
      { label: "Mathématiques", valeur: "Connaissances académiques : Mathématiques +5, Étiquette +1, Informatique +1, Logiciels +2" },
      { label: "Médecine", valeur: "Biotechnologie (GC) +2, Chimie +1, Connaissances académiques : Médecine +6" },
      { label: "Science informatique", valeur: "Connaissances académiques : Conception matricielle +6, Cybercombat +1, Électronique (GC) +1, Hacking +1" },
      { label: "Sciences naturelles", valeur: "Connaissances académiques : [Chimie/Physique/Biologie au choix] +5, Informatique +1, Logiciel +2, Premiers soins +1" },
      { label: "Disciplines artistiques", valeur: "" },
      { label: "Art", valeur: "Artisanat +3, Connaissances académiques : Histoire de l’art +3" },
      { label: "Histoire", valeur: "Connaissances académiques : Histoire [Nationale ou Mondiale] +5, Informatique +1, logiciels +2" },
      { label: "Langues", valeur: "Étiquette +1, Négociation +1, Langue [1 au choix] +6, Langue [1 au choix] +5" },
      { label: "Littérature", valeur: "Connaissances académiques : Littérature +5 Informatique +1, Spécialisation Artisanat (Écriture)" },
      { label: "Métahumanités", valeur: "Connaissances académiques : [Langue ancienne/Philosophie/Religion au choix] +13 (à répartir dans les trois sujets, maximum 7 rangs par sujet), Informatique +1" },
      { label: "Sciences sociales", valeur: "Connaissances académiques : [Sociologie/Psychologie/Archéologie/Criminologie/Politique] +13 (à répartir dans au moins 3 de ces sujets, maximum 6 rangs par sujet), Informatique +1" },
    ],
    special: "Post-requis explicite — « Une fois que vous en avez terminé avec ce module, vous devez choisir l'un des modules Période de service (pour l'une ou l'autre des forces armées). Si vous êtes assez jeune vous pouvez être réserviste pendant trois ans de plus. À moins que vous ne repreniez une Période de service, c'est fini. » La prose liste aussi six académies nord-américaines (CAS/Atlanta, USMA/West-Point, USNA/Annapolis, USCGA/New London, NAO/Colorado Springs, USMMA/Kings Point) : décor, aucune incidence chiffrée. Irrégularités typographiques du livre conservées telles quelles : « Natation+1 » sans espace ; « Spécialisation Artisanat (Dessin) » sans rang alors que Facultés écrit « (Dessin) +1 » ; « Littérature +5 Informatique +1 » sans virgule ; « logiciels +2 » en minuscule (ligne Histoire) alors que la ligne Mathématiques du même encadré écrit « Logiciels +2 » ; « Logiciel +2 » au singulier (ligne Sciences naturelles) ; « Théorie Magique » avec M capitale alors que Centre universitaire écrit « Théorie magique ».",
  },
  { id: "etudes_superieures_centre_universitaire", nom: "CENTRE UNIVERSITAIRE", section: "Études supérieures", page: 149, karma: 55,
    lignes: [
      { label: "Attributs", valeur: "Logique +1, Volonté +1" },
    ],
    souslignes: [
      { label: "Disciplines scientifiques", valeur: "" },
      { label: "Architecture", valeur: "Connaissances académiques : Construction +5, Mécanique industrielle +1, Spécialisation Artisanat (Dessin), Premiers soins +1" },
      { label: "Commerce", valeur: "Connaissances académiques : Économie +5, Escroquerie +1, Étiquette +1, Négociation +2" },
      { label: "Droit", valeur: "Étiquette +1, Négociation +2, Représentation +1, Connaissances académiques : Lois +5" },
      { label: "Ingénierie", valeur: "Chimie +1, Connaissances académiques : Ingénierie +5, Matériel électronique +1, Mécanique industrielle +2" },
      { label: "Magie", valeur: "Connaissances académiques : Théorie magique ou Métaplans +5, Sorcellerie (GC) +1" },
      { label: "Mathématiques", valeur: "Connaissances académiques : Mathématiques +5, Étiquette +1, Informatique +1, Logiciels +1" },
      { label: "Médecine", valeur: "Biotechnologie (GC) +2, Connaissances académiques : Médecine +6" },
      { label: "Science informatique", valeur: "Connaissances académiques : Conception matricielle +6, Cybercombat +1, Électronique (GC) +1, Hacking +1" },
      { label: "Sciences naturelles", valeur: "Chimie +1, Connaissances académiques : [Chimie/Physique/Biologie] +5, Informatique +1, Premiers soins +1" },
      { label: "Disciplines artistiques", valeur: "" },
      { label: "Art", valeur: "Artisanat +3, Connaissances académiques : Histoire de l’art +3" },
      { label: "Histoire", valeur: "Connaissances académiques : Histoire [Nationale ou Mondiale] +2, Informatique +1, Logiciels +2" },
      { label: "Langues", valeur: "Étiquette +1, Langue [1 au choix] +6, Langue [1 au choix] +5, Négociation +1" },
      { label: "Littérature", valeur: "Connaissances académiques : Littérature +5, Étiquette +1, Spécialisation Artisanat (Écriture)" },
      { label: "Métahumanités", valeur: "Connaissances académiques : [Langue ancienne/Philosophie/Religion] +13 (à répartir dans les trois sujets, minimum : trois rangs par sujet), Informatique +1" },
      { label: "Sciences sociales", valeur: "Connaissances académiques : [Sociologie/Psychologie/Archéologie/Criminologie/Politique] +13 (à répartir dans au moins trois sujets, minimum 3 rangs par sujet), Informatique +1" },
    ],
    special: "Seul encadré de la section sans ligne `Traits` **et** sans ligne `Compétences universelles` : il passe directement d'`Attributs` à `Disciplines scientifiques`. Enchaînement autorisé, donné par la prose (fin page 149) : « Après ce module, vous pouvez toujours choisir le module **Facultés ou universités d'État**. » Les études y durent 2 ans (personnage à 19 ans), contre 4 pour une université (21 ans). À noter, relevé tel quel : la ligne Histoire donne « +2 » là où les trois autres encadrés de la section donnent « +5 » à la même compétence ; et Métahumanités / Sciences sociales disent **minimum** de rangs par sujet là où Académies militaires et Facultés disent **maximum**.",
  },
  { id: "etudes_superieures_ecoles_de_commerce_ecoles_tec", nom: "ÉCOLES DE COMMERCE / ÉCOLES TECHNIQUES", section: "Études supérieures", page: 150, karma: 40,
    lignes: [
      { label: "Attributs", valeur: "Logique +1" },
    ],
    souslignes: [
      { label: "Vocation", valeur: "" },
      { label: "Architecte", valeur: "Connaissances académiques : Construction+6, Mécanique industrielle +1, Premiers soins +1" },
      { label: "Avocat", valeur: "Connaissances professionnelles : Lois +4, Étiquette +1, Négociation +1, Représentation +1" },
      { label: "Étude de communication", valeur: "Connaissances professionnelles : Émissions tridéo +6, Étiquette +1, Négociation +1" },
      { label: "Graphiste", valeur: "Connaissances professionnelles : Logos corporatistes +4, Spécialisation Artisanat (Dessin) +1" },
      { label: "Infirmière", valeur: "Biotechnologie (GC) +1, Connaissances professionnelles : Médecine +3, Étiquette +1" },
      { label: "Journaliste", valeur: "Connaissances professionnelles : Politique +4, Escroquerie +1, Étiquette +1, Négociation +1" },
      { label: "Marchand", valeur: "Connaissances professionnelles : DIY (Do It Yourself) +4, Mécanique automobile +1, Mécanique industrielle +1, Premiers soins +1" },
      { label: "Mécanicien", valeur: "Connaissances professionnelles : Mécanique +3, Ingénierie (GC) +1, Premiers soins +1" },
    ],
    special: "Titre de l'encadré sur deux lignes, « ÉCOLES DE COMMERCE / » puis « ÉCOLES TECHNIQUES ». Le titre de prose diffère : « ÉCOLES DE COMMERCE, ÉCOLES TECHNIQUES (40) » — virgule au lieu de la barre oblique. Seul encadré de la section dont l'en-tête de groupe s'appelle **Vocation** (et non Disciplines scientifiques / artistiques) : c'est le cas prévu par l'introduction de section, « ceux d'une discipline (ou vocation) au choix ». Pas de ligne `Traits`, pas de ligne `Compétences universelles`. Aucun prérequis ni exclusion dans la prose. Irrégularité conservée : « Construction+6 » sans espace avant le +.",
  },
  { id: "etudes_superieures_facultes_universites_detat", nom: "FACULTÉS / UNIVERSITÉS D’ÉTAT", section: "Études supérieures", page: 150, karma: 65,
    lignes: [
      { label: "Attributs", valeur: "Logique +1, Volonté +1" },
      { label: "Compétences universelles", valeur: "Connaissances académiques : [1 au choix] +4, Étiquette +1, Informatique +1, Perception +1," },
    ],
    souslignes: [
      { label: "Disciplines scientifiques", valeur: "" },
      { label: "Architecture", valeur: "Connaissances académiques : Construction +5, Mécanique industrielle +1, Premiers soins +1, Spécialisation Artisanat (Dessin) +1" },
      { label: "Commerce", valeur: "Connaissances académiques : Économie +5, Escroquerie +1, Étiquette +1, Négociation +2" },
      { label: "Droit", valeur: "Connaissances académiques : Lois +5, Étiquette +1, Négociation +2, Représentation +1" },
      { label: "Ingénierie", valeur: "Chimie +1, Connaissances académiques : Ingénierie +5, Matériel électronique +1, Mécanique industrielle +2" },
      { label: "Magie", valeur: "Connaissances académiques : Métaplans +5, Sorcellerie (GC) +1" },
      { label: "Mathématiques", valeur: "Connaissances académiques : Mathématiques +5, Étiquette +1, Informatique +1, Logiciels +2" },
      { label: "Médecine", valeur: "Biotech (GC) +2, Biotechnologie +1, Chimie +1, Connaissances académiques : Médecine +6" },
      { label: "Science informatique", valeur: "Connaissances académiques : Conception matricielle +6, Cybercombat +1, Électronique (GC) +1, Hacking +1" },
      { label: "Sciences naturelles", valeur: "Connaissances académiques : [Chimie/Physique/Biologie] +5, Informatique +1, Logiciel +2, Premiers soins +1" },
      { label: "Disciplines artistiques", valeur: "" },
      { label: "Art", valeur: "Artisanat +3, Connaissances académiques : Histoire de l’art +3" },
      { label: "Histoire", valeur: "Connaissances académiques : Histoire [Nationale ou Mondiale] +5, Informatique +1, logiciels +2" },
      { label: "Langues", valeur: "Étiquette +1, Langue [1 au choix] +6, Langue [1 au choix] +5, Négociation +1" },
      { label: "Littérature", valeur: "Connaissances académiques : Littérature +5, Enseignement +1, Informatique +1, Spécialisation Artisanat (Écriture)" },
      { label: "Métahumanités", valeur: "Connaissances académiques : [Langue ancienne/Philosophie/Religion] +13 (à répartir dans les trois sujets, maximum 7 rangs par sujet), Informatique +1" },
      { label: "Sciences sociales", valeur: "Connaissances académiques : [Sociologie/Psychologie/Archéologie/Criminologie/Politique] +13 (à répartir dans ces sujets, maximum 6 rangs par sujet), Informatique +1" },
    ],
    special: "Titre de l'encadré sur deux lignes, « FACULTÉS / » puis « UNIVERSITÉS D'ÉTAT » ; titre de prose « FACULTÉS OU UNIVERSITÉS D'ÉTAT (65) » — « ou » au lieu de la barre oblique. **Défaut d'impression avéré** : la ligne `Compétences universelles` se termine par « Perception +1**,** » — virgule finale suivie de rien, la ligne est tronquée dans le livre. Le même bloc dans l'encadré Ivy League se termine par « Perception +1 » sans virgule ; il manque donc vraisemblablement un item, non imprimé et **impossible à reconstituer**. Conservé tel quel, virgule comprise. Autres irrégularités : la ligne Médecine cumule « Biotech (GC) +2 » et « Biotechnologie +1 », deux libellés pour ce qui semble la même compétence (les trois autres encadrés n'écrivent que « Biotechnologie (GC) ») ; ligne Magie sans « Théorie magique ou », seulement « Métaplans +5 » ; « logiciels +2 » en minuscule ligne Histoire ; « Logiciel +2 » au singulier ligne Sciences naturelles. C'est le module accessible en enchaînement après Centre universitaire. Aucun prérequis dans sa propre prose.",
  },
  { id: "etudes_superieures_universite_de_livy_league", nom: "UNIVERSITÉ DE L’IVY LEAGUE", section: "Études supérieures", page: 151, karma: 80,
    lignes: [
      { label: "Attributs", valeur: "Charisme +1, Logique +1, Volonté +1" },
      { label: "Compétences universelles", valeur: "Connaissances académiques : [1 au choix] +4, Étiquette +1, Informatique +1, Perception +1" },
    ],
    souslignes: [
      { label: "Disciplines scientifiques", valeur: "" },
      { label: "Architecture", valeur: "Connaissances académiques : Building +6, Mécanique industrielle +1, Premiers soins +1" },
      { label: "Commerce", valeur: "Connaissances académiques : Économie +6, Étiquette +1, Négociation +2" },
      { label: "Droit", valeur: "Connaissances académiques : Lois +6, Négociation +1, Représentation +1" },
      { label: "Ingénierie", valeur: "Chimie +1, Connaissances académiques : Ingénierie +6, Mécanique industrielle +2" },
      { label: "Magie", valeur: "Connaissances académiques : Théorie Magique ou Métaplans +5, Sorcellerie (GC) +1" },
      { label: "Mathématiques", valeur: "Connaissances académiques : Mathématiques +6, Étiquette +1, Logiciels +1" },
      { label: "Médecine", valeur: "Biotechnologie (GC) +1, Connaissances académiques : Médecine +5" },
      { label: "Science informatique", valeur: "Connaissances académiques : Conception matricielle +5, Électronique (GC) +1" },
      { label: "Sciences naturelles", valeur: "Connaissances académiques : [Chimie/Physique/Biologie] +6, Informatique +1, Logiciel +1" },
      { label: "Disciplines artistiques", valeur: "" },
      { label: "Art", valeur: "Artisanat +2, Connaissances académiques : Histoire de l’art +4" },
      { label: "Histoire", valeur: "Connaissances académiques : Histoire +6, Informatique +1, Logiciels +1" },
      { label: "Langues", valeur: "Étiquette +1, Langue [1 au choix] +4, Langue [1 au choix] +2, Langue [1 au choix] +2" },
      { label: "Littérature", valeur: "Connaissances académiques : Littérature +4, Spécialisation Artisanat (Écriture) +1" },
      { label: "Métahumanités", valeur: "Connaissances académiques : [Langue ancienne/Philosophie/Religion] +10 (à répartir dans les trois sujets, minimum : deux rangs par sujet)" },
      { label: "Sciences sociales", valeur: "Connaissances académiques : [Sociologie/Psychologie/Archéologie/Criminologie/Politique] +10 (à répartir dans au moins trois sujets, maximum 6 rangs par sujet)" },
    ],
    special: "**Traduction non faite** ligne Architecture : « Connaissances académiques : **Building** +6 » — le mot anglais est resté ; les trois autres encadrés écrivent « Construction ». Relevé tel quel. Seul encadré où la ligne Histoire n'a pas de qualificatif entre crochets (« Histoire +6 » et non « Histoire [Nationale ou Mondiale] »), et le seul où Langues donne **trois** langues (+4, +2, +2) au lieu de deux. Métahumanités et Sciences sociales sont les seules à ne pas s'achever par « Informatique +1 ». Le module coûte le plus cher de la section après Académies militaires alors qu'il donne des rangs globalement plus bas : relevé tel quel, ce n'est pas une erreur de lecture. Aucun prérequis ni exclusion dans la prose (celle-ci ne fait que décrire les huit Ivy et les Sept sœurs). Dernier module de la section : la page 151 enchaîne ensuite sur la section LA VRAIE VIE (lot 4).",
  },
  { id: "la_vraie_vie_activiste_politique", nom: "ACTIVISTE POLITIQUE", section: "La vraie vie", page: 151, karma: 100,
    lignes: [
      { label: "Attributs", valeur: "Charisme +1, Volonté +1" },
      { label: "Traits", valeur: "SIN criminel (10)" },
      { label: "Compétences", valeur: "Connaissances de la rue : [Ville] +3, Connaissances de la rue : procédures policières +3 Connaissances hobbies : [Policlub] +4, Déguisement +1, Escamotage +2, Escroquerie +1, Étiquette +2, Falsification +2, Instruction +1, Leadership +2, Négociation +2, Perception +2, Pistolets +2, Véhicules terrestres +1" },
    ],
    special: "virgule manquante dans le livre entre « procédures policières +3 » et « Connaissances hobbies : [Policlub] +4 » — relevé littéralement ; la coupure logique est sans ambiguïté (deux connaissances distinctes, +3 puis +4).",
  },
  { id: "la_vraie_vie_agent_gouvernemental", nom: "AGENT GOUVERNEMENTAL", section: "La vraie vie", page: 152, karma: 100,
    lignes: [
      { label: "Attributs", valeur: "Intuition +1, Réaction +1" },
      { label: "Traits", valeur: "SINner (5)" },
      { label: "Compétences", valeur: "Connaissances professionnelles : Procédures gouvernementales +5, Connaissances professionnelles : Procédures des forces de l'ordre +5, Connaissances professionnelles : Menaces nationales +4, Course +1, Influence (GC) +2, Perception +3, Pistage +1, Pistolets +2, Premiers soins +1, Véhicules terrestres +1" },
    ],
    special: "cité par *Détective privé* comme l'un des modules dont l'achèvement débloque celui-ci.",
  },
  { id: "la_vraie_vie_agent_secret", nom: "AGENT SECRET", section: "La vraie vie", page: 152, karma: 100,
    lignes: [
      { label: "Attributs", valeur: "Intuition +1, Volonté +1" },
      { label: "Traits", valeur: "Lien ténu (8), Œil de lynx (3)" },
      { label: "Compétences", valeur: "Chimie +1, Combat à mains nues +1, Connaissance : [1 au choix] +3, Connaissances professionnelles : Codes +2, Connaissance de la rue : [Ville] +3, Discrétion +2, Escroquerie +1, Étiquette +1, Évasion +1, Gymnastique +1, Langue : [1 au choix] +3, Orientation +1, Perception +1, Pistolets +1, Survie +1" },
    ],
    special: "cité par *Détective privé* comme l'un des modules dont l'achèvement débloque celui-ci. Deux singuliers isolés dans la ligne Compétences (« Connaissance : [1 au choix] », « Connaissance de la rue : [Ville] ») là où le reste du chapitre écrit « Connaissances » — relevés tels quels.",
  },
  { id: "la_vraie_vie_celebrite", nom: "CÉLÉBRITÉ", section: "La vraie vie", page: 152, karma: 100,
    lignes: [
      { label: "Attributs", valeur: "Charisme +1, +1 à deux attributs de votre choix (deux attributs différents, autre que Charisme)" },
      { label: "Traits", valeur: "Célébrité (8)" },
      { label: "Compétences", valeur: "Connaissances professionnelles : [Sports/Musique/Film] +3, Escroquerie +1, Évasion +1, +6 pour n'importe quelles compétences qui conviendraient à une célébrité (pas plus de 3 rangs dans une compétence individuelle ; des rangs supplémentaires en Escroquerie et Évasion peuvent être achetés de cette manière), Correspondant de guerre" },
    ],
    special: "**défaut de maquette confirmé à l'image** — la cellule Compétences se termine par « , Correspondant de guerre », qui est le titre du module suivant tombé dans le tableau. Ce n'est ni une compétence ni un trait. Relevé littéralement comme l'exige le brief, mais à retirer en aval.",
  },
  { id: "la_vraie_vie_correspondant_de_guerre", nom: "CORRESPONDANT DE GUERRE", section: "La vraie vie", page: 152, karma: 100,
    lignes: [
      { label: "Attributs", valeur: "Charisme +1, Volonté +1" },
      { label: "Traits", valeur: "tripes (10)" },
      { label: "Compétences", valeur: "Connaissances professionnelles : Journalisme +5, Électronique (GC) +2, Langue : [1 au choix] +3, Langue : [1 au choix] +1, Négociation +2, Orientation +1, Perception +2, Survie +1" },
    ],
    special: "le trait est imprimé **en minuscule** — « tripes (10) » — seul nom de trait non capitalisé de tout le lot (partout ailleurs : « SINner (5) », « Endetté (5) », « Esprit analytique (5) »). Relevé tel quel. Le mot revient dans la prose de *Chasseur de primes* (« vous vous découvrirez des tripes »).",
  },
  { id: "la_vraie_vie_chasseur_de_primes", nom: "CHASSEUR DE PRIMES", section: "La vraie vie", page: 152, karma: 100,
    lignes: [
      { label: "Attributs", valeur: "Constitution +1, Intuition +1, Volonté +1" },
      { label: "Compétences", valeur: "Athlétisme (GC) +1, Combat rapproché (GC) +1, Connaissances de la rue : Procédures Lone Star +3, Connaissances de la rue : Repaires d'escrocs +3, Fusils +1, Intimidation +1, Perception +1, Pistage +1, Pistolets +1, Premiers soins +1, Survie +1" },
    ],
    special: "**pas de ligne Traits** dans l'encadré (l'un des deux seuls cas du lot avec *Crime organisé*, qui lui n'a pas de ligne Attributs).",
  },
  { id: "la_vraie_vie_corporatiste", nom: "CORPORATISTE", section: "La vraie vie", page: 153, karma: 100,
    lignes: [
      { label: "Attributs", valeur: "Intuition +1, Logique +1" },
      { label: "Traits", valeur: "SIN corporatiste limité (15)" },
      { label: "Compétences Universelles", valeur: "Connaissances professionnelles : [Corporation] +3, Étiquette +1" },
      { label: "Travails spécifiques", valeur: "(ligne d'en-tête, sans valeur)" },
    ],
    souslignes: [
      { label: "Agent corpo", valeur: "Armes à feu (GC) +3, Combat à mains nues +2, Démolition +2, Discrétion +3, Véhicules terrestres +2" },
      { label: "Esclave Corpo", valeur: "Charisme +1, Connaissances professionnelles : Administration +6, Escroquerie +1, Étiquette +2, Négociation +2, Volonté +1" },
      { label: "Garde de sécurité", valeur: "Armes à feu (GC) +2, Athlétisme (GC) +2, Connaissances professionnelles : Procédures de sécurité +5, Connaissances professionnelles : Procédures des forces de l'ordre +4, Combat rapproché +2, Perception +2" },
      { label: "Hacker/Decker", valeur: "Connaissances académiques : Physique +3, Connaissances professionnelles : Conception matricielle +6, Électronique (GC) +3, Piratage (GC) +2, Premiers soins +2" },
      { label: "Mage corpo", valeur: "Arcane +2, Combat astral +2, Conjuration (GC) +2, Connaissances professionnelles : Loi magique +1, Enchantement (GC) + 1, Observation astrale +3, Sorcellerie (GC) +2" },
      { label: "Rigger de sécurité", valeur: "Armes de véhicules +3, Anthropomorphes +2, Appareils volants +2, Connaissances professionnelles : Drones +3, Électronique (GC) +2, Perception +2, Véhicules terrestres +3" },
    ],
  },
  { id: "la_vraie_vie_crime_organise", nom: "CRIME ORGANISÉ", section: "La vraie vie", page: 153, karma: 100,
    lignes: [
      { label: "Traits", valeur: "Homme de main (5), SIN criminel (10)" },
      { label: "Compétences", valeur: "Armes à feu (GC) +3, Armes tranchantes +1, Combat à mains nue +2, Connaissance de la rue : [Syndicat du crime] +4, Connaissances de la rue : [Ville] +3, Démolition +1, Escroquerie +2, Étiquette +1, Évasion +1, Falsification +1, Intimidation +2, Leadership +1, Matériel électronique +1, Négociation +1, Perception +2, Véhicules terrestres +1, Furtivité (GC) +1" },
    ],
    special: "**pas de ligne Attributs** — seul module du lot qui n'accorde aucun bonus d'attribut. Deux fautes du livre relevées telles quelles : « Combat à mains **nue** +2 » (singulier) et « **Connaissance** de la rue : [Syndicat du crime] » (singulier) juste avant « **Connaissances** de la rue : [Ville] ». La liste n'est pas alphabétique jusqu'au bout : « Furtivité (GC) +1 » est rejetée après « Véhicules terrestres +1 ».",
  },
  { id: "la_vraie_vie_detective_prive", nom: "DÉTECTIVE PRIVÉ", section: "La vraie vie", page: 153, karma: 100,
    lignes: [
      { label: "Attributs", valeur: "Intuition +1, Logique +1, Volonté +1" },
      { label: "Traits", valeur: "Endetté (5)" },
      { label: "Compétences", valeur: "Athlétisme (GC) +1, Combat à mains nues +1, Connaissances de la rue : procédures policières +3, Connaissances de la rue : [Ville] +2, Influence (GC) +1, Perception +2, Premiers soins +1, Pistage +1, Pistolets +2, Véhicules terrestres +1" },
    ],
    special: "**PRÉREQUIS explicite, dans la prose** (p. 153, hors encadré) : « Vous ne pouvez pas choisir ce module tant que vous n'avez pas terminé l'un des modules suivants : **Agent secret, Agent gouvernemental, Corporatiste, Forces de l'ordre, Période de service, Travail dans les Ombres.** » (les six noms sont en gras dans le livre). *Période de service* et *Travail dans les Ombres* sont hors de ce lot — ils tombent plus loin dans La vraie vie.",
  },
  { id: "la_vraie_vie_etudes_de_troisieme_cycle", nom: "ÉTUDES DE TROISIÈME CYCLE", section: "La vraie vie", page: 153, karma: 100,
    lignes: [
      { label: "Attributs", valeur: "Charisme +1, Intuition +1, Logique +1" },
      { label: "Compétences", valeur: "Connaissances académiques : [Majeure], Connaissances académiques : [1 au choix] +2, Instruction +2, +10 aux compétences de votre module d'éducation (pas plus de +4 par compétence)" },
    ],
  },
  { id: "la_vraie_vie_forces_de_l_ordre", nom: "FORCES DE L'ORDRE", section: "La vraie vie", page: 154, karma: 100,
    lignes: [
      { label: "Attributs", valeur: "Constitution +1, Réaction +1, Volonté +1" },
      { label: "Entraînements de base (bonus communs)", valeur: "Armes contondantes +1, Connaissances professionnelles : Procédures policières +3, Étiquette +1, Leadership +1, Perception +1, Pistolets +1, Premiers soins +1" },
    ],
    souslignes: [
      { label: "Cyber crime", valeur: "Connaissances professionnelles : Criminels de la Matrice +5, Électronique (GC) +1, Piratage (GC) +1" },
      { label: "Cyber division", valeur: "Armes à feu (GC) +1, Armes lourdes +2, Combat à mains nues +1, Cybertechnologie +1" },
      { label: "Flic des rues", valeur: "Connaissances professionnelles : [Ville] +5, Intimidation +2, Orientation +1, Véhicules terrestres +1," },
      { label: "Mage division", valeur: "Arcanes +1, Connaissances professionnelles : Menaces magiques +2, Observation astrale +2, Sorcellerie (GC) +1" },
      { label: "Rigger", valeur: "Anthropomorphes +1, Appareils volants +1, Armes de véhicules +1, Connaissances professionnelles : Drones +1, Mécanique automobile +1, Véhicules terrestres +2" },
      { label: "SWAT", valeur: "Armes à feu (GC) +1, Armes de jet +2, Armurerie +1, Gymnastique +1" },
    ],
  },
  { id: "la_vraie_vie_ganger", nom: "GANGER", section: "La vraie vie", page: 154, karma: 100,
    lignes: [
      { label: "Attributs", valeur: "Constitution +1, Force +1" },
      { label: "Traits", valeur: "SIN criminel (10)" },
      { label: "Compétences", valeur: "Armes à feu (GC) +2, Armes lourdes +1, Armes tranchantes +3, Électronique (GC) +1, Course +1, Évasion +1, Explosifs +1, Furtivité (GC) +1, Perception +1, Piratage (GC) +1, Survie +1, Véhicules terrestres +1" },
    ],
    special: "le titre de module « GANGER » se trouve en bas de la colonne gauche p. 154, son encadré en haut de la colonne droite de la **même** page, à hauteur du titre d'encadré « ÉTUDES DE TROISIÈME CYCLE » — les deux titres sont côte à côte mais appartiennent à deux modules différents (voir § Corrections de méthode).",
  },
  { id: "la_vraie_vie_groupes_de_reflexion", nom: "GROUPES DE RÉFLEXION", section: "La vraie vie", page: 154, karma: 100,
    lignes: [
      { label: "Attributs", valeur: "Logique +1, Volonté +1" },
      { label: "Traits", valeur: "Esprit analytique (5)" },
      { label: "Compétences", valeur: "Connaissances académiques : [1 au choix] +6, Connaissances académiques : [1 au choix] +3, Connaissances académiques : [1 au choix] +3 (il faut choisir trois compétences de connaissances académiques différentes), Étiquette +2" },
    ],
  },
  { id: "la_vraie_vie_magie_de_rue", nom: "MAGIE DE RUE", section: "La vraie vie", page: 155, karma: 100,
    lignes: [
      { label: "Attributs", valeur: "Volonté +1" },
      { label: "Rôle", valeur: "(aucune valeur — libellé chapeau des sous-lignes)" },
    ],
    souslignes: [
      { label: "Chaman des rues", valeur: "Armes tranchantes +1, Conjuration (GC) +3, Connaissances de la rue : Foyers +5, Connaissances de la rue : [Ville] +4, Discrétion +1, Escamotage +1, Observation astrale +2, Perception +1, Sorcellerie (GC) +2, Survie +1" },
      { label: "Détective de l'occulte", valeur: "Arcanes +1, Conjuration (GC) +1, Connaissances de la rue : [Ville] +4, Connaissances professionnelles : Police scientifique +5, Influence (GC) +1, Observation astrale +3, Perception +3, Pistage +2, Pistolets +1, Serrurerie +1, Sorcellerie (GC) +2" },
      { label: "Eco-chaman", valeur: "Combat astral +2, Conjuration (GC) +2, Connaissances de la rue : Lois des mégacorporations +5, Connaissances de la rue : Théorie magique +3, Démolition +1, Étiquette +1, Falsification +1, Observation astrale +2, Perception +2, Pistolets +1, Premiers soins +1, Sorcellerie (GC) +2" },
      { label: "Mage des rues", valeur: "Armes tranchantes +1, Conjuration (GC) +2, Connaissances de la rue : Foyers +5, Connaissances de la rue : [Ville] +4, Discrétion +1, Escamotage +1, Observation astrale +2, Perception +1, Sorcellerie (GC) +3, Survie +1" },
      { label: "Magicien spécialisé", valeur: "Ajoutez +1 au Groupe de compétences Alchimie, Conjuration ou Sorcellerie, Armes tranchantes +1, Arcanes +2, Connaissances professionnelles : Sécurité magique +3, Connaissances professionnelles : Tactiques d'escouade +2, Connaissances de la rue : Théorie magique +1, Observation astrale +2, Premiers soins +1, Survie +1" },
      { label: "Marchand de talismans", valeur: "Chimie +1, Connaissances professionnelles : Telesma +2, Connaissances professionnelles : Alchimie +5, Enchantement (GC) +3, Étiquette +2, Négociations +2, Observation astrale +3, Pistolets +1, Premiers soins +1" },
    ],
    special: "Le libellé chapeau est « Rôle » au singulier ici, alors que TRAVAIL DANS LES OMBRES (même structure) écrit « Rôles ». « Eco-chaman » est imprimé sans accent (pas « Éco- »), la coupure de ligne tombant sur le trait d'union. « Tactiques d'escouade » porte une apostrophe droite (') là où le reste de la page utilise l'apostrophe courbe (').",
  },
  { id: "la_vraie_vie_periode_de_service_mercenaire", nom: "PÉRIODE DE SERVICE (MERCENAIRE)", section: "La vraie vie", page: 155, karma: 100,
    lignes: [
      { label: "Attributs", valeur: "Constitution +1, Force +1, Réaction +1" },
      { label: "Entraînements de base (bonus communs)", valeur: "Armes à feu (GC) +1, Connaissances professionnelles : Armées étrangères +3, Orientation +1, Premier soins +1" },
      { label: "Branches", valeur: "(aucune valeur — libellé chapeau des sous-lignes)" },
    ],
    souslignes: [
      { label: "Air Force", valeur: "Armes de véhicules +1, Armes tranchantes +1, Armurerie +1, Appareils volants +2, Chute libre +1, Mécanique aéronautique +1, Survie +1" },
      { label: "Armée", valeur: "Armurerie +1, Armes tranchantes +1, Chute libre +1, Armes lourdes +1, Véhicules terrestres +1, Course +1, Survie +1, Natation +1, Armes de jet +1" },
      { label: "Corps des mages", valeur: "Arcanes +1, Conjuration (GC) +1, Observation astrale +2, Sorcellerie (GC) +1" },
      { label: "Corps médical", valeur: "Biotechnologie (GC) +2" },
      { label: "Corps des riggers", valeur: "Anthropomorphes +1, Armes de véhicules +2, Appareils volants +1, Guerre électronique +2, Véhicules terrestres +1" },
      { label: "Forces spéciales", valeur: "Armes tranchantes +1, Armurerie +1, Chute libre +1, Démolition +1, Discrétion +1, Perception +1, Survie +1, Véhicules terrestres +1, Véhicules aquatiques +1" },
      { label: "Génie", valeur: "Armes de véhicules +1, Armurerie +2, Connaissances professionnelles : Véhicules militaires +3, Démolition +1, Ingénierie (GC) +1" },
      { label: "Navy", valeur: "Armes de véhicules +1, Armes tranchantes +1, Armurerie +1, Natation +1, Perception +1, Survie +1, Véhicules aquatiques +2" },
    ],
    special: "**PRÉREQUIS** (prose, fin p. 155 / suite en haut de p. 156) : « Ce module ne peut être choisi qu'après avoir pris l'un des autres modules **Agent corpo** ou **Période de service** ou **Travail dans les Ombres**. » — Seul module « Période de service » sans ligne « Traits » (les trois autres donnent SINner (5)). Voir aussi la note de section « Période de service » en tête de fichier (engagement de cinq ans, Rang 5 = sous-officier, Rang 20 = officier). « Premier soins » est imprimé au singulier (idem dans les trois autres Périodes de service).",
  },
  { id: "la_vraie_vie_periode_de_service_nao", nom: "PÉRIODE DE SERVICE (NAO)", section: "La vraie vie", page: 156, karma: 100,
    lignes: [
      { label: "Attributs", valeur: "Constitution +1, Force +1, Intuition +1" },
      { label: "Traits", valeur: "SINner (5)" },
      { label: "Entraînements de base (bonus communs)", valeur: "Armes à feu (GC) +1, Combat à mains nues +1, Connaissances professionnelles : Armées des NAO +3, Orientation +1, Premier soins +1" },
      { label: "Branches", valeur: "(aucune valeur — libellé chapeau des sous-lignes)" },
    ],
    souslignes: [
      { label: "Air Force", valeur: "Armes de véhicules +1, Armes tranchantes +1, Appareils volants +2, Chute libre +1, Pistage +1, Survie +1" },
      { label: "Armée", valeur: "Armes de jet +1, Armes lourdes +1, Armes tranchantes +1, Armurerie +1, Survie +2, Véhicules terrestres +1" },
      { label: "Corps des mages", valeur: "Armes tranchantes +1, Conjuration (GC) +1, Observation astrale +1, Sorcellerie (GC) +1, Survie +1" },
      { label: "Corps médical", valeur: "Biotechnologie (GC) +2" },
      { label: "Corps des riggers", valeur: "Anthropomorphes +1, Armes de trait +1, Armes de véhicules +1, Armes tranchantes +1, Appareils volants +1, Guerre électronique +1, Véhicules terrestres +1, Survie +1" },
      { label: "Forces spéciales", valeur: "Armes tranchantes +1, Armurerie +1, Chute libre +1, Démolition +1, Discrétion +1, Survie +1, Véhicules aquatiques +1, Véhicules terrestres +1" },
      { label: "Génie", valeur: "Armes de véhicules +1, Armurerie +2, Démolition +1, Ingénierie (GC) +1" },
      { label: "Marine", valeur: "Armes tranchantes +1, Armes de véhicules +1, Armurerie +1, Natation +1, Survie +2, Véhicules aquatiques +1" },
    ],
    special: "Voir la note de section « Période de service » en tête de fichier. La branche navale s'appelle ici « Marine » (elle s'appelle « Navy » dans MERCENAIRE et dans UCAS, CAS, CFS). Le titre de l'encadré tient sur une seule ligne ; le titre en prose aussi.",
  },
  { id: "la_vraie_vie_periode_de_service_tir_tairngire", nom: "PÉRIODE DE SERVICE (TÌR TAIRNGIRE)", section: "La vraie vie", page: 156, karma: 100,
    lignes: [
      { label: "Attributs", valeur: "Agilité +1, Force +1" },
      { label: "Traits", valeur: "SINner (5)" },
      { label: "Entraînements de base (bonus communs)", valeur: "Armes à feu (GC) +1, Premier soins +1, Orientation +1, Combat à mains nues +1, Connaissances professionnelles : Gardiens de la paix +4" },
      { label: "Branches", valeur: "(aucune valeur — libellé chapeau des sous-lignes)" },
    ],
    souslignes: [
      { label: "Air Force", valeur: "Armurerie +1, Armes tranchantes +1, Chute libre +1, Armes de véhicules +1, Appareils volants +2, Survie +1" },
      { label: "Corps des garde-frontières", valeur: "Armes de jet +1, Armes lourdes +1, Armes tranchantes +1, Armurerie +1, Perception +1, Charisme +1, Discrétion +1, Natation +1, Survie +1, Véhicules terrestres +1" },
      { label: "Corps des mages", valeur: "Arcane +1, Conjuration (GC) +1, Logique +1, Observation astrale +2, Sorcellerie (GC) +1" },
      { label: "Corps médical", valeur: "Biotechnologie (GC) +2, Logique +1" },
      { label: "Corps des riggers", valeur: "Guerre électroniques +2, Appareils volants +1, Anthropomorphes +1, Armes de véhicules +2, Réaction +1, Véhicules terrestres +1" },
      { label: "Génie", valeur: "Armes de véhicules +1, Armurerie +2, Connaissances professionnelles : Véhicules militaires de Tìr +3, Démolition +1, Ingénierie (GC) +1, Logique +1" },
      { label: "Ghosts", valeur: "Armes tranchantes +1, Armurerie +1, Chute libre +1, Démolition +1, Discrétion +1, Perception +1, Survie +1, Véhicules aquatiques +1, Véhicules terrestres +1, Volonté +1" },
      { label: "Marine", valeur: "Armes de véhicules +1, Armes tranchantes +1, Armurerie +1, Constitution +1, Natation +1, Perception +1, Survie +1, Véhicules aquatiques +2" },
      { label: "Netwatch", valeur: "Connaissances professionnelles : Menace matricielles +6, Électronique (GC) +1, Intuition +1, Perception +1, Piratage (GC) +1," },
      { label: "Peace Keepers", valeur: "Armes contendantes +1, Armes de jet +1, Armes lourdes +1, Armes tranchantes +1, Armurerie +1, Chute libre +1, Constitution +1, Perception +1, Survie +1, Véhicules terrestres +1" },
    ],
    special: "Le titre de l'encadré est sur **deux lignes** (« PÉRIODE DE SERVICE » / « (TÌR TAIRNGIRE) »), de même que le titre en prose (coupé après « (TÌR »). Voir la note de section « Période de service » en tête de fichier. **Anomalies typographiques du livre relevées telles quelles** : « Arcane +1 » au singulier (ailleurs « Arcanes ») ; « Guerre électroniques +2 » (ailleurs « Guerre électronique ») ; « Menace matricielles +6 » (accord fautif) ; la ligne *Netwatch* se **termine par une virgule** après « Piratage (GC) +1, » — la ligne semble tronquée dans le livre, aucune entrée ne suit ; « Armes contendantes » (pour « contondantes ») ; « Véhicules militaires de Tìr » (avec accent grave, comme le titre) alors que la prose écrit « Tir Tairngire » sans accent.",
  },
  { id: "la_vraie_vie_periode_de_service_ucas_cas_cfs", nom: "PÉRIODE DE SERVICE (UCAS, CAS, CFS)", section: "La vraie vie", page: 157, karma: 100,
    lignes: [
      { label: "Attributs", valeur: "Constitution +1, Force +1, Réaction +1" },
      { label: "Traits", valeur: "SINner (5)" },
      { label: "Entraînements de base (bonus communs)", valeur: "Armes à feu (GC) +1, Combat à mains nues +1, Connaissances professionnelles : Armées +4, Orientation +1, Premier soins +1" },
      { label: "Branches", valeur: "(aucune valeur — libellé chapeau des sous-lignes)" },
    ],
    souslignes: [
      { label: "Air Force", valeur: "Appareils volants +2, Armes de véhicules +1, Armes tranchantes +1, Armurerie +2, Chute libre +1, Survie +1" },
      { label: "Armée", valeur: "Armes de jet +2, Armes lourdes +1, Armes tranchantes +1, Armurerie +1, Chute libre +1, Véhicules terrestres +1, Survie +1" },
      { label: "Corps des mages", valeur: "Conjuration (GC) +1, Observation astrale +2, Perception +1, Sorcellerie (GC) +1" },
      { label: "Corps médical", valeur: "Biotechnologie (GC) +2, Connaissances professionnelles : Médecine +3" },
      { label: "Corps des riggers", valeur: "Anthropomorphes +1, Appareils volants +1, Armes de véhicules +2, Guerre électronique +2, Véhicules terrestres +1" },
      { label: "Forces spéciales", valeur: "Armes tranchantes +1, Armurerie +1, Chute libre +1, Démolition +1, Discrétion +1, Perception +1, Pistage +1, Survie +1, Véhicules aquatiques +1, Véhicules terrestres +1" },
      { label: "Génie", valeur: "Armes de véhicules +1, Armurerie +2, Connaissances professionnelles : Véhicules militaires +5, Démolition +1, Ingénierie (GC) +1" },
      { label: "Navy", valeur: "Armes de véhicules +2, Armes tranchantes +1, Armurerie +1, Natation +1, Survie +1, Véhicules aquatiques +2" },
    ],
    special: "**Le titre en prose et le titre de l'encadré divergent** : la prose annonce « PÉRIODE DE SERVICE (UCAS, CAS, **ELC**) », l'encadré porte « PÉRIODE DE SERVICE (UCAS, CAS, **CFS**) » (les deux vérifiés au zoom). Le nom du module retenu ici est celui de l'encadré, conformément à la règle « le bloc doit se lire comme le tableau ». Titre de l'encadré sur deux lignes. Voir la note de section « Période de service » en tête de fichier.",
  },
  { id: "la_vraie_vie_terroriste", nom: "TERRORISTE", section: "La vraie vie", page: 157, karma: 100,
    lignes: [
      { label: "Attributs", valeur: "Logique +1, Volonté +1" },
      { label: "Traits", valeur: "SIN criminel (10)" },
      { label: "Compétences", valeur: "Armes à feu (GC) +2, Connaissances de la rue : [Ville] +3, Connaissances de la rue : Procédures des forces de l'ordre +2, Déguisement +2, Démolition +3, Escamotage +2, Escroquerie +1, Leadership +2, Perception +2, Véhicules terrestres +1" },
    ],
  },
  { id: "la_vraie_vie_travail_dans_les_ombres", nom: "TRAVAIL DANS LES OMBRES", section: "La vraie vie", page: 157, karma: 100,
    lignes: [
      { label: "Attributs", valeur: "Constitution +1" },
      { label: "Rôles", valeur: "(aucune valeur — libellé chapeau des sous-lignes)" },
    ],
    souslignes: [
      { label: "Contrebandier", valeur: "Armes de véhicules +2, Appareils volants +2, Connaissances de la rue : Planques des contrebandiers +6, Connaissances de la rue : Itinéraires de contrebande +6, Connaissances de la rue : Tactiques des patrouilles aux frontières +6, Étiquette +1, Guerre électronique +2, Mécanique [Aéronautique/Automobile/Nautique] +2, Négociation +1, Orientation +1, Perception +2, Véhicules aquatiques +2, Véhicules terrestres +2" },
      { label: "Decker", valeur: "Connaissances de la rue : Mesures de sécurité matricielles +4, Trait : Bon codeur (10), Électronique (GC) +2, Falsification +1, Intuition +1, Perception +1, Piratage (GC) +2, Pistolets +1" },
      { label: "Face", valeur: "Charisme +1, Escroquerie +1, Influence (GC) +3, Perception +1, Pistolets +1, Trait : Première impression (11), Véhicules terrestres +1" },
      { label: "Samouraï des rues", valeur: "Agilité +1, Armes à feu (GC) +2, Armes lourdes +1, Armes tranchantes +2, Athlétisme (GC) +1, Combat à mains nues +1, Connaissances de la rue : Planques +3, Trait : Code d'honneur (15), Discrétion +1, Négociation +1, Perception +2, Réaction +1, Véhicules terrestres +1" },
      { label: "Spécialiste des armes", valeur: "Armes à feu (GC) +2, Armes de jet +1, Armes de trait +1, Armes lourdes +1, Armurerie +1, Chimie +2, Combat rapproché (GC) +2, Connaissances professionnelles : Conception des armes tranchantes +4, Connaissances professionnelles : Conception des armes à feu +5, Connaissance hobbies : Culture générale des armes à feu +3, Démolition +1, Négociations +1" },
    ],
    special: "**TABLEAU COUPÉ SUR DEUX PAGES — UN SEUL MODULE.** L'encadré « TRAVAIL DANS LES OMBRES » commence p. 157 (rôles *Contrebandier*, *Decker*) et se poursuit p. 158 dans un second encadré titré « TRAVAIL DANS LES OMBRES (SUITE) » (rôles *Face*, *Samouraï des rues*, *Spécialiste des armes*). Les deux encadrés sont fusionnés ci-dessus ; « (SUITE) » n'est pas un module distinct et les lignes « Attributs » / « Rôles » ne sont imprimées que dans le premier. — **Le titre en prose diffère de celui de l'encadré** : prose « TRAVAIL DANS LES OMBRES (SHADOWRUNNER) », encadré « TRAVAIL DANS LES OMBRES ». Nom retenu : celui de l'encadré. — Renvoi de la prose : « les mages sont décrits dans un module précédent » (soit MAGIE DE RUE, p. 155) : le module ne propose donc pas de rôle magicien. — Le mot « Trait : » précède ici les traits, qui sont mélangés à la liste des compétences au lieu d'avoir leur propre ligne « Traits ». — Irrégularité orthographique : « Connaissance hobbies » au singulier chez *Spécialiste des armes*.",
  },
  { id: "la_vraie_vie_travail_regulier", nom: "TRAVAIL RÉGULIER", section: "La vraie vie", page: 158, karma: 100,
    lignes: [
      { label: "Attributs", valeur: "Charisme +1, Logique +1, Volonté +1" },
      { label: "Compétences", valeur: "Connaissances hobbies : [1 au choix] +1, Connaissances professionnelle : [Travail] +1, Connaissances professionnelle : [Travail] +1, +6 à répartir dans des compétences en rapport avec votre travail (pas plus de 3 rangs par compétence), Étiquette +1, Leadership +1, Négociation +1" },
    ],
    special: "**PRÉREQUIS / CONTRAINTE** (prose) : « À ce moment de la création de votre perso, le travail que vous choisissez doit être compatible avec votre éducation. » — **Irrégularité du livre relevée telle quelle** : la ligne « Connaissances professionnelle : [Travail] +1 » est imprimée **deux fois** (vérifié au zoom : ce n'est pas un artefact d'extraction), avec « professionnelle » au singulier les deux fois. Il peut s'agir d'une répétition fautive ou de deux Connaissances professionnelles distinctes liées au travail.",
  },
  { id: "la_vraie_vie_vagabond", nom: "VAGABOND", section: "La vraie vie", page: 158, karma: 100,
    lignes: [
      { label: "Attributs", valeur: "+1 à deux attributs différents" },
      { label: "Traits", valeur: "Endurance à la douleur (7), Sens de l'orientation (3)" },
      { label: "Compétences", valeur: "Combat à mains nues +1, Connaissance de la rue : Marché gris +3, Connaissance de la rue : Marché noir +3, Connaissance de la rue : [Ville] +5, Connaissance de la rue : [1 au choix] +3, Course +1, Discrétion +1, Escroquerie +2, Évasion +1, Négociation +1, Survie +2" },
    ],
    special: "Seul module du lot dont les attributs sont **au choix du joueur** (« +1 à deux attributs différents ») plutôt que nommés. **Irrégularité orthographique** : « Connaissance de la rue » au singulier, cinq fois, alors que tout le reste du chapitre écrit « Connaissances de la rue ». Mise en page : l'encadré VAGABOND est remonté en haut de la colonne de droite, au-dessus de sa propre prose introductive restée en bas de la colonne de gauche.",
  },
];
