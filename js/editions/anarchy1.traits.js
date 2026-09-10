"use strict";

/* ============================================================
   ANARCHY (V1) — TRAITS, relevé du 2026-09-10, p.70-71
   ------------------------------------------------------------
   56 traits : 39 Avantages, 17 Défauts.

   ⚠ TROISIÈME RÉGIME DE RÈGLES, à ne pas aligner sur SR5 ni SR6 : Anarchy ne
   TARIFE PAS ses traits. Vérifié dans les deux livres Anarchy — zéro marqueur
   « Coût/Bonus … Karma ». La règle est un COMPTE, pas un budget : « Chaque
   joueur doit choisir deux Avantages et un Défaut » (p.70). Il n'y a donc ni
   `karma` ni plafond ici, seulement un nom et un effet.

   Le livre invite explicitement à en inventer : « Vous pouvez choisir vos
   Traits depuis la liste suivante, parmi ceux des personnages prétirés ou
   créer les vôtres. » Le catalogue est donc une SUGGESTION, jamais une liste
   fermée — l'écran doit garder la saisie libre.

   Géométrie : en-têtes AVANTAGES / DÉFAUTS à 16,6 pt, début d'entrée à
   11,9 pt (nom en gras), suite à 11,3 pt, colonnes x ≈ 51 et x ≈ 308.
   ⚠ Tout autre titre en capitales FERME la section : sans cette borne, le
   texte d'armure qui suit les Défauts s'y déversait.
   ============================================================ */

export const TraitsAnarchy1 = [
  { id: "acrobate_ne", nom: "Acrobate né", type: "avantage", effet: "+2 dés pour les tests d’Acrobaties." },
  { id: "affinite_avec_les_esprits", nom: "Affinité avec les esprits", type: "avantage", effet: "+2 dés pour les tests de Conjura- tion avec un type d’esprit spécifique." },
  { id: "ambidextre", nom: "Ambidextre", type: "avantage", effet: "+2 dés en cas d’utilisation de deux armes de mêlée." },
  { id: "as_de_la_gachette", nom: "As de la gâchette", type: "avantage", effet: "+2 dés pour les tests d’Armes à feu." },
  { id: "athlete_ne", nom: "Athlète né", type: "avantage", effet: "+2 dés pour les tests d’Athlétisme." },
  { id: "attribut_exceptionnel", nom: "Attribut exceptionnel", type: "avantage", effet: "augmentez de 1 la valeur maxi- male d’un attribut au choix." },
  { id: "beau_parleur", nom: "Beau parleur", type: "avantage", effet: "permet de relancer 2 échecs sur les tests de Charisme si le personnage parle." },
  { id: "biocompatibilite", nom: "Biocompatibilité", type: "avantage", effet: "ignorez un point de perte d’Essence lié à des Atouts." },
  { id: "bon_codeur", nom: "Bon codeur", type: "avantage", effet: "+2 dés pour les tests de Hacking (hors cybercombat)." },
  { id: "celui_a_qui_murmurent_les_esprits", nom: "Celui à qui murmurent les esprits", type: "avantage", effet: "permet de relancer 2 échecs sur les tests de Conjuration." },
  { id: "chanceux", nom: "Chanceux", type: "avantage", effet: "augmentez votre Chance de 1." },
  { id: "chef_de_meute", nom: "Chef de meute", type: "avantage", effet: "ajoutez un groupe, une organisation ou un gang à votre liste de contacts." },
  { id: "cogneur", nom: "Cogneur", type: "avantage", effet: "+2 dés pour les tests d’Intimidation. +2 dés pour les tests de Hacking (cy- bercombat uniquement)." },
  { id: "celebrite_raison_et_lieu_au_choix", nom: "Célébrité (raison et lieu au choix)", type: "avantage", effet: "+2 dés sur les tests liés au Charisme si vous êtes reconnus." },
  { id: "dur_a_cuire", nom: "Dur à cuire", type: "avantage", effet: "tous les dommages subis sont réduits de 1." },
  { id: "empathie_animale", nom: "Empathie animale", type: "avantage", effet: "+2 dés sur les tests pour tenter d’in- fluencer ou de contrôler un animal." },
  { id: "endurance_a_la_douleur", nom: "Endurance à la douleur", type: "avantage", effet: "ignorez la première ligne de dommages remplie pour calculer les modificateurs de blessure." },
  { id: "esprit_mentor_aigle", nom: "Esprit mentor (Aigle)", type: "avantage", effet: "+1 dé pour les tests de Perception, peut relancer 1 échec sur les tests de Conjuration." },
  { id: "esprit_mentor_chat", nom: "Esprit mentor (Chat)", type: "avantage", effet: "+1 dé pour les tests d’Athlétisme ou de Furtivité (au choix), peut relancer 1 échec sur les tests pour lancer des sorts d’effet." },
  { id: "esprit_mentor_chien", nom: "Esprit mentor (Chien)", type: "avantage", effet: "+1 dé pour les tests de Survie, peut effectuer une action S’interposer par Scène sans dépenser de point d’Anarchy." },
  { id: "esprit_mentor_corbeau", nom: "Esprit mentor (Corbeau)", type: "avantage", effet: "+1 dé sur les tests de Comédie, peut effectuer une action Prise de risque par Scène sans dépenser de point d’Anarchy." },
  { id: "esprit_mentor_coyote", nom: "Esprit mentor (Coyote)", type: "avantage", effet: "+1 dé pour les tests d’Étiquette, peut relancer 1 échec sur les tests pour lancer des sorts d’effet." },
  { id: "esprit_mentor_loup", nom: "Esprit mentor (Loup)", type: "avantage", effet: "+1 dé pour les tests de Pistage, peut relancer 1 échec sur les tests pour lancer des sorts de combat." },
  { id: "esprit_mentor_ours", nom: "Esprit mentor (Ours)", type: "avantage", effet: "Dommages +1 au corps à corps, peut effectuer un Premiers secours par Scène sans dé- penser de point d’Anarchy." },
  { id: "esprit_mentor_rat", nom: "Esprit mentor (Rat)", type: "avantage", effet: "+1 dé sur les tests de Furtivité, peut relancer 1 échec sur les tests pour lancer des sorts d’effet." },
  { id: "fou_du_volant", nom: "Fou du volant", type: "avantage", effet: "+2 dés sur les tests de Véhicules terrestres et Véhicules divers quand vous tentez des manœuvres difficiles et que vous poussez le véhicule dans ses der- niers retranchements." },
  { id: "felin", nom: "Félin", type: "avantage", effet: "+2 dés pour les tests de Furtivité." },
  { id: "guerison_rapide", nom: "Guérison rapide", type: "avantage", effet: "+2 dés pour tous les tests pour soigner ce personnage." },
  { id: "loyaute_a_une_marque_corporation_au_choix", nom: "Loyauté à une marque (corporation au choix)", type: "avantage", effet: "+1 dé aux tests effectués en utilisant un équipement produit par la corporation choisie, –2 dés si le principal équipement utilisé est produit par une autre corporation." },
  { id: "mieux_vaut_etre_craint_que_d_etre_aime", nom: "Mieux vaut être craint que d’être aimé", type: "avantage", effet: "vous avez de l’in- fluence sur quelqu’un d’important en le faisant chanter. Ajoutez cette personne à vos contacts." },
  { id: "pilote_de_course", nom: "Pilote de course", type: "avantage", effet: "+2 dés pour les tests de Véhicules terrestres." },
  { id: "pilote_d_elite", nom: "Pilote d’élite", type: "avantage", effet: "+2 dés pour les tests de Véhicules divers." },
  { id: "renfort_naturel", nom: "Renfort naturel", type: "avantage", effet: "réduit de 2 les dommages matriciels su- bis (réservé aux technomanciens)" },
  { id: "sans_limites", nom: "Sans limites", type: "avantage", effet: "permet de relancer 2 échecs sur les tests d’attaque avec une compétence au choix." },
  { id: "solide_comme_un_roc", nom: "Solide comme un roc", type: "avantage", effet: "+1 case au moniteur de condition physique ou étourdissant." },
  { id: "territoire", nom: "Territoire", type: "avantage", effet: "gagne un point d’Anarchy en entrant ou en se réveillant sur le territoire choisi." },
  { id: "tripes", nom: "Tripes", type: "avantage", effet: "permet de relancer 2 échecs sur les tests pour ré- sister à la peur ou à l’intimidation. +2 dés pour les tests de Biotech." },
  { id: "volonte_d_acier", nom: "Volonté d’acier", type: "avantage", effet: "permet de relancer 2 échecs sur les tests de Sorcellerie." },
  { id: "il_de_lynx", nom: "Œil de lynx", type: "avantage", effet: "+2 dés pour les tests de Perception." },
  { id: "accro_au_combat", nom: "Accro au combat", type: "defaut", effet: "vous devez utiliser un point d’Anarchy pour ne pas utiliser la violence comme première réponse à un problème." },
  { id: "allergie", nom: "Allergie", type: "defaut", effet: "–4 dés à tous vos tests quand vous êtes affectés par l’allergie, à la discrétion du MJ." },
  { id: "asocial", nom: "Asocial", type: "defaut", effet: "vous devez relancer 1 succès sur tous vos tests sociaux." },
  { id: "attachement_emotionnel", nom: "Attachement émotionnel", type: "defaut", effet: "vous devez dépenser un point d’Anarchy pour ne pas donner la priorité absolue à l’objet de votre attachement." },
  { id: "degout_de_la_violence", nom: "Dégoût de la violence", type: "defaut", effet: "toutes vos attaques causent 2 cases de dommage de moins." },
  { id: "gremlins", nom: "Gremlins", type: "defaut", effet: "vous ajoutez un dé de complication lors de tous vos tests en relation avec un objet high-tech." },
  { id: "kleptomane", nom: "Kleptomane", type: "defaut", effet: "vous devez dépenser un point d’Anarchy pour ne pas donner la priorité à un vol mesquin (ou gran- diose) plutôt qu’à vos autres objectifs." },
  { id: "loyaute_obstinee", nom: "Loyauté obstinée", type: "defaut", effet: "–2 dés quand vous utilisez un drone ou un véhicule qui n’est pas produit par une corporation spécifique, ou que vous n’avez pas modifié vous-même." },
  { id: "mauvais_codeur", nom: "Mauvais codeur", type: "defaut", effet: "–2 dés à tous les tests de Hacking (hors cybercombat)." },
  { id: "paralysie_en_combat", nom: "Paralysie en combat", type: "defaut", effet: "vous effectuez votre Narration en dernier lors du premier Tour de chaque combat (à moins que vous ne montiez personnellement une embuscade)." },
  { id: "phobie", nom: "Phobie", type: "defaut", effet: "–2 dés à tous vos tests quand vous êtes en pré- sence de la source de votre phobie, à la discrétion du MJ." },
  { id: "poseur_elfe", nom: "Poseur elfe", type: "defaut", effet: "vous ajoutez un dé de complication lors de tous vos tests sociaux en rapport avec les elfes." },
  { id: "sinner_corporatiste", nom: "SINner, Corporatiste", type: "defaut", effet: "vous êtes un citoyen à part entière d’une corporation au choix, vos données biométriques sont disponibles dans le registre mondial SIN." },
  { id: "sinner_criminel", nom: "SINner, Criminel", type: "defaut", effet: "vous êtes connus des forces de l’ordre et disposez d’un SIN criminel, vos données biométriques sont disponibles dans le registre mondial SIN." },
  { id: "sinner_national", nom: "SINner, National", type: "defaut", effet: "vous êtes un citoyen à part entière d’un état au choix, vos données biométriques sont disponibles dans le registre mondial SIN." },
  { id: "sensibilite_a_la_douleur", nom: "Sensibilité à la douleur", type: "defaut", effet: "augmentez les pénalités de bles- sure de 1." },
  { id: "style_distinctif", nom: "Style distinctif", type: "defaut", effet: "vous arborez toujours le style choisi, ce qui octroie un bonus de +2 dés à toutes les tentatives de vous reconnaître ou de se souvenir de vous." },
];
