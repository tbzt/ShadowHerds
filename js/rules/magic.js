"use strict";

/* ============================================================
   MAGIC — Traditions magiques & Esprits mentors, par édition.

   Deux systèmes distincts, pour donner de la saveur aux Éveillés :

   • traditions : effet MÉCANIQUE = l'attribut de Résistance au Drain
     (Volonté + X, où X varie selon la tradition). Chaque édition câble
     `pnj.drainResist = attrs.VOL + attrs[tradition.drainAttr]`.
     - SR5 : chaque tradition a son propre attribut (Livre de Règles
       p.281-282 + Grimoire des ombres p.41-52).
     - SR6 : « Voies Occultes » ne définit mécaniquement que 2 familles —
       Foi → Charisme (p.104), Logique → Logique (p.111). Les traditions
       nommées ci-dessous sont du lore qui hérite de l'attribut de sa
       famille (donc drainAttr = "CHA" ou "LOG" uniquement pour SR6).
     - Anarchy : le livre de base n'a pas de mécanique de tradition à
       attribut de Drain (juste un type d'esprit invocable, narratif) →
       pas de table de traditions ici pour Anarchy.

   • mentorSpirits : un esprit mentor accorde des bonus PERMANENTS
     (SR5 Livre de Règles p.323-327 + Grimoire des ombres p.199-200 ;
     SR6 livre de base p.165-170 ; Anarchy livre de base p.70-72, 8 Atouts).
     Le bonus « Tous » (une compétence) est appliqué mécaniquement par
     BonusEngine QUAND le PNJ possède cette compétence ; les bonus de
     magicien (dés de sorts/conjuration) et d'adepte (pouvoir offert)
     restent en description cliquable, faute de hook chiffrable propre.
     Le désavantage du mentor est conditionnel → reste descriptif.

   • originPools : CURATION MAISON. Les livres soulignent au contraire que
     les archétypes de mentors sont volontairement génériques et « ne
     s'appliquent pas à toutes les cultures » — aucune table officielle ne
     mappe tradition/mentor → culture. Ce champ ne sert qu'à un biais DOUX
     (jamais exclusif) pour coller à l'origine du nom généré. Une entrée
     sans `originPools` est neutre (tirable pour toute origine).
   ============================================================ */

import { Actor } from "./actor.js";
import { SkillEffects } from "./skilleffects.js";
import { Utils } from "../core/utils.js";

export const Magic = {
  /* ========================================================
     TRADITIONS
     ======================================================== */
  traditions: {
    // ----- SR5 : un attribut de Drain propre par tradition -----
    sr5: [
      {
        name: "Hermétique",
        drainAttr: "LOG",
        desc: "Approche scientifique et rigoureuse de la magie. Résistance au Drain : Volonté + Logique. Invoque des esprits élémentaires (Feu/Air/Eau/Terre) et de l'Homme.",
      },
      {
        name: "Chamanique",
        drainAttr: "CHA",
        desc: "Magie vécue et ressentie, guidée par un esprit totem. Résistance au Drain : Volonté + Charisme. Invoque des esprits des Bêtes, de la nature et de l'Homme.",
      },
      {
        name: "Aztèque",
        drainAttr: "CHA",
        originPools: ["latino"],
        desc: "Tradition des prêtres nahualli d'Aztlan, teintée de sacrifice. Résistance au Drain : Volonté + Charisme. Esprits Gardiens, du Feu, des Bêtes.",
      },
      {
        name: "Bouddhisme",
        drainAttr: "INT",
        originPools: ["asiacentral", "chinois", "coreen"],
        desc: "Voie de l'illumination et du détachement. Résistance au Drain : Volonté + Intuition. Le mentor prend souvent la forme d'un yidam.",
      },
      {
        name: "Théurgie chrétienne",
        drainAttr: "CHA",
        originPools: ["euro", "latino"],
        desc: "Magie de foi puisée dans le divin. Résistance au Drain : Volonté + Charisme. Invoque des esprits du Feu, de l'Eau, de l'Air et des Guides.",
      },
      {
        name: "Islam",
        drainAttr: "LOG",
        originPools: ["arabe"],
        desc: "Tradition savante puisant dans le soufisme et l'étude. Résistance au Drain : Volonté + Logique. Invoque rarement les esprits (Gardiens, Terre, Air, Feu).",
      },
      {
        name: "Shintoïsme",
        drainAttr: "CHA",
        originPools: ["japonais"],
        desc: "Vénération des kami par les prêtres kannushi. Résistance au Drain : Volonté + Charisme. Esprits de l'Air, de l'Eau, des Bêtes et de l'Homme.",
      },
      {
        name: "Wuxing",
        drainAttr: "LOG",
        originPools: ["chinois"],
        desc: "Tradition des wujens fondée sur les cinq phases (taoïsme). Résistance au Drain : Volonté + Logique. Prisée en milieu corpo asiatique.",
      },
      {
        name: "Hindouisme",
        drainAttr: "LOG",
        originPools: ["asiacentral"],
        desc: "Voie des brahmanes et des sãdhus. Résistance au Drain : Volonté + Logique. Esprits des Bêtes, de l'Eau, des Plantes.",
      },
      {
        name: "Vaudou",
        drainAttr: "CHA",
        originPools: ["africain", "latino"],
        desc: "Tradition de possession : les loa investissent des réceptacles. Résistance au Drain : Volonté + Charisme. Esprits Gardiens, de l'Eau, Guides.",
      },
      {
        name: "Tradition Sioux",
        drainAttr: "INT",
        originPools: ["amerindien"],
        desc: "Tradition amérindienne des Nations Souveraines (mythes d'Iktomi, Coyote, Oiseau-Tonnerre). Résistance au Drain : Volonté + Intuition.",
      },
      {
        name: "Druidisme",
        drainAttr: "INT",
        originPools: ["euro"],
        desc: "Communion avec la terre et les cycles naturels. Résistance au Drain : Volonté + Intuition. Esprits des Bêtes, de l'Eau, des Plantes.",
      },
      {
        name: "Voie de la Roue",
        drainAttr: "CHA",
        originPools: ["euro"],
        desc: "Tradition de la nation elfe de Tír na nÓg. Résistance au Drain : Volonté + Charisme. Esprits de la Terre, de l'Eau, des Guides.",
      },
      {
        name: "Wicca",
        drainAttr: "INT",
        originPools: ["euro"],
        desc: "Néo-paganisme dévoué à la Déesse Mère et au Dieu Cornu. Résistance au Drain : Volonté + Intuition. Esprits du Feu, de l'Eau, des Plantes.",
      },
      {
        name: "Zoroastrisme",
        drainAttr: "LOG",
        originPools: ["arabe", "asiacentral"],
        desc: "Dualisme perse d'Ahura Mazdâ contre Angra Mainyu. Résistance au Drain : Volonté + Logique. Esprits de l'Homme, de l'Eau, du Feu.",
      },
      {
        name: "Magie du chaos",
        drainAttr: "INT",
        desc: "Pragmatisme magique sans dogme : tout ce qui marche est bon. Résistance au Drain : Volonté + Intuition.",
      },
      {
        name: "Magie noire",
        drainAttr: "CHA",
        desc: "Magie tournée vers la domination et l'égoïsme. Résistance au Drain : Volonté + Charisme. Esprits du Feu, de l'Eau, de la Terre.",
      },
      {
        name: "Cabalisme",
        drainAttr: "LOG",
        originPools: ["arabe", "euro"],
        desc: "Tradition de possession fondée sur la Kabbale et les sephiroth. Résistance au Drain : Volonté + Logique.",
      },
    ],

    // ----- SR6 : lore nommé, mais drainAttr = CHA (Foi) ou LOG (Logique) -----
    sr6: [
      {
        name: "Hermétisme",
        drainAttr: "LOG",
        desc: "Tradition scientifique et académique (famille « Logique »). Résistance au Drain : Volonté + Logique. Invoque des esprits élémentaires.",
      },
      {
        name: "Chamanisme",
        drainAttr: "CHA",
        originPools: ["amerindien", "africain", "polynesien"],
        desc: "Tradition animiste guidée par un esprit totem (famille « Foi »). Résistance au Drain : Volonté + Charisme. Esprits animaux.",
      },
      {
        name: "Traditions nordiques",
        drainAttr: "CHA",
        originPools: ["euro"],
        desc: "Panthéon nordique (Odin, Loki, Fenrir). Famille « Foi ». Résistance au Drain : Volonté + Charisme.",
      },
      {
        name: "Panthéon égyptien",
        drainAttr: "CHA",
        originPools: ["africain", "arabe"],
        desc: "Dieux de l'Égypte antique invoqués comme mentors. Famille « Foi ». Résistance au Drain : Volonté + Charisme.",
      },
      {
        name: "Panthéon gréco-romain",
        drainAttr: "CHA",
        originPools: ["euro"],
        desc: "Divinités de Rome et de la Grèce antiques. Famille « Foi ». Résistance au Drain : Volonté + Charisme.",
      },
      {
        name: "Vaudou",
        drainAttr: "CHA",
        originPools: ["africain", "latino"],
        desc: "Tradition de possession : les loa investissent des réceptacles. Famille « Foi ». Résistance au Drain : Volonté + Charisme.",
      },
      {
        name: "Bouddhisme",
        drainAttr: "CHA",
        originPools: ["asiacentral", "chinois", "coreen"],
        desc: "Tradition du Karma (devas, asuras). Famille « Foi ». Résistance au Drain : Volonté + Charisme.",
      },
      {
        name: "Shintoïsme",
        drainAttr: "CHA",
        originPools: ["japonais"],
        desc: "Vénération animiste des kami. Famille « Foi ». Résistance au Drain : Volonté + Charisme.",
      },
      {
        name: "Wuxing",
        drainAttr: "CHA",
        originPools: ["chinois"],
        desc: "Voie taoïste de Gaïa (Wujen, cinq phases). Famille « Foi ». Résistance au Drain : Volonté + Charisme.",
      },
      {
        name: "Théurgie chrétienne",
        drainAttr: "CHA",
        originPools: ["euro", "latino"],
        desc: "Tradition abrahamique (Élohim, anges). Famille « Foi ». Résistance au Drain : Volonté + Charisme.",
      },
      {
        name: "Théurgie musulmane",
        drainAttr: "CHA",
        originPools: ["arabe"],
        desc: "Tradition abrahamique invoquant djinns et éfrits. Famille « Foi ». Résistance au Drain : Volonté + Charisme.",
      },
      {
        name: "Wicca",
        drainAttr: "CHA",
        originPools: ["euro"],
        desc: "Néo-paganisme de Gaïa (Déesse Mère). Famille « Foi ». Résistance au Drain : Volonté + Charisme.",
      },
      {
        name: "Tradition Sioux",
        drainAttr: "CHA",
        originPools: ["amerindien"],
        desc: "Chamanisme amérindien (esprit Oiseau-tonnerre). Famille « Foi ». Résistance au Drain : Volonté + Charisme.",
      },
      {
        name: "Chaosmagie",
        drainAttr: "LOG",
        desc: "Théorie magique unifiée, pragmatique et sans dogme. Famille « Logique ». Résistance au Drain : Volonté + Logique.",
      },
      {
        name: "Magie noire",
        drainAttr: "LOG",
        desc: "Voie hédoniste inspirée de Thelema (« Fais ce qui te plaît »). Famille « Logique ». Résistance au Drain : Volonté + Logique.",
      },
      {
        name: "Tradition rom",
        drainAttr: "LOG",
        originPools: ["euro"],
        desc: "Tradition folklorique du peuple rom. Famille « Logique ». Résistance au Drain : Volonté + Logique.",
      },
    ],

    // Anarchy : pas de mécanique de tradition à attribut de Drain dans le
    // livre de base (seul le type d'esprit invocable change, narratif).
    // V1 : idem — 4 traditions supplémentaires listées en Anarchistes
    // (Hindouisme, Animisme, Magie du chaos, Traditions du peuple) sont
    // purement narratives, pas de mécanique de Drain propre
    // à motoriser ici.
    anarchy1: [],
    anarchy2: [],
  },

  /* ========================================================
     ESPRITS MENTORS
     `bonus` = bonus « Tous » (compétence), appliqué par BonusEngine si
     le PNJ a la compétence. Les autres bonus (magicien/adepte) sont dans
     `desc`. `bonus: null` = mentor sans bonus de compétence chiffrable.
     ======================================================== */
  mentorSpirits: {
    // ----- SR5 (Livre de Règles p.323-327 + Grimoire des ombres p.199-200) -----
    sr5: [
      {
        name: "Aigle",
        bonus: { skill: "Perception", val: 2 },
        desc: "Défenseur de la nature. Tous : +2 Perception. Magicien : +2 dés pour invoquer les esprits de l'Air. Adepte : Sens du combat niv.1 offert. Ombre : allergie aux polluants.",
      },
      {
        name: "Chatte",
        bonus: { skill: "Discrétion", val: 2 },
        desc: "Gardienne des secrets. Tous : +2 Gymnastique ou Discrétion. Magicien : +2 dés sorts d'Illusion. Adepte : 2 niveaux de Poids plume. Ombre : ne peut achever un ennemi sans test au 1er round.",
      },
      {
        name: "Chien",
        bonus: { skill: "Pistage", val: 2 },
        desc: "Loyauté et protection. Tous : +2 Pistage. Magicien : +2 dés sorts de Détection. Adepte : 2 niveaux de Sens améliorés. Ombre : ne peut abandonner un allié sans test.",
      },
      {
        name: "Corbeau",
        bonus: { skill: "Escroquerie", val: 2 },
        desc: "Malicieux messager. Tous : +2 Escroquerie. Magicien : +2 dés sorts de Manipulation. Adepte : Passage sans trace + Contrôle vocal niv.1. Ombre : ne peut résister à une farce sans test.",
      },
      {
        name: "Loup",
        bonus: { skill: "Pistage", val: 2 },
        desc: "Chasseur fidèle à la meute. Tous : +2 Pistage. Magicien : +2 dés sorts de Combat. Adepte : 2 niveaux d'Agilité augmentée. Ombre : ne peut battre en retraite sans test.",
      },
      {
        name: "Mer",
        bonus: { skill: "Natation", val: 2 },
        originPools: ["polynesien"],
        desc: "Berceau changeant de la vie. Tous : +2 Natation. Magicien : +2 dés pour invoquer les esprits de l'Eau. Adepte : 1 niveau de groupe Athlétisme. Ombre : ne peut être charitable sans test.",
      },
      {
        name: "Montagne",
        bonus: { skill: "Survie", val: 2 },
        desc: "Endurance inébranlable. Tous : +2 Survie. Magicien : +2 dés Contresort et rituels ancrés. Adepte : 1 niveau d'Armure mystique. Ombre : ne peut dévier d'un plan sans test.",
      },
      {
        name: "Oiseau-tonnerre",
        bonus: { skill: "Intimidation", val: 2 },
        originPools: ["amerindien"],
        desc: "Créature de la tempête de la mythologie amérindienne. Tous : +2 Intimidation. Magicien : +2 dés pour invoquer les esprits de l'Air. Adepte : 1 niveau de Coup critique. Ombre : doit répondre en personne à une insulte.",
      },
      {
        name: "Ours",
        bonus: null,
        desc: "Guérisseur féroce. Tous : +2 dés de résistance aux dommages (hors Drain). Magicien : +2 dés sorts de Soins. Adepte : 1 niveau de Guérison rapide. Ombre : rage berserk possible si blessé.",
      },
      {
        name: "Porteur du feu",
        bonus: { skill: "Artisanat", val: 2 },
        desc: "Prométhée qui offrit le feu. Tous : +2 Artisanat ou Alchimie. Magicien : +2 dés sorts de Manipulation. Adepte : 1 niveau d'une compétence hors combat. Ombre : ne peut refuser une demande d'aide sincère.",
      },
      {
        name: "Rat",
        bonus: { skill: "Discrétion", val: 2 },
        desc: "Survivant de l'ombre. Tous : +2 Discrétion. Magicien : +2 dés Alchimie (réactifs, toutes traditions). Adepte : 2 niveaux d'Immunité naturelle. Ombre : doit fuir ou se couvrir en combat sans test.",
      },
      {
        name: "Requin",
        bonus: { skill: "Combat à mains nues", val: 2 },
        desc: "Chasseur implacable. Tous : +2 Combat à mains nues. Magicien : +2 dés sorts de Combat. Adepte : Mains mortelles offert. Ombre : rage berserk si blessé.",
      },
      {
        name: "Sage guerrière",
        bonus: { skill: "Leadership", val: 2 },
        desc: "Code d'honneur du guerrier (mentor Wicca du Dieu Cornu). Tous : +2 Enseignement ou Leadership. Magicien : +2 dés sorts de Combat. Adepte : 1 niveau d'une compétence de combat. Ombre : -1 dé jusqu'à réparation d'un déshonneur.",
      },
      {
        name: "Séducteur",
        bonus: { skill: "Escroquerie", val: 2 },
        desc: "Incarnation du désir. Tous : +2 Escroquerie. Magicien : +2 dés sorts d'Illusion. Adepte : 1 niveau de groupe Comédie/Influence. Ombre : doit céder à un vice si possible.",
      },
      {
        name: "Serpent",
        bonus: { skill: "Arcanes", val: 2 },
        desc: "Gardien de la sagesse ancienne. Tous : +2 Arcanes. Magicien : +2 dés sorts de Détection. Adepte : 2 niveaux de Contrôle corporel. Ombre : doit poursuivre un secret découvert.",
      },
      {
        name: "Tueur de dragons",
        bonus: { skill: "Négociation", val: 2 },
        desc: "Héros protecteur des siens. Tous : +2 à une compétence sociale. Magicien : +2 dés sorts de Combat. Adepte : Précision améliorée + Sens du combat niv.1. Ombre : -1 dé tant qu'une promesse rompue n'est pas honorée.",
      },
      {
        name: "Chaos",
        bonus: { skill: "Escroquerie", val: 2 },
        desc: "Semeur de désordre (Grimoire des ombres). Tous : +2 Escroquerie. Magicien : +2 dés sorts d'Illusion. Adepte : 2 niveaux de Potentiel amélioré. Ombre : ne peut garder un secret.",
      },
      {
        name: "Conciliateur",
        bonus: { skill: "Négociation", val: 2 },
        desc: "Mentor Wicca de la Déesse Mère (Grimoire des ombres). Tous : +2 Négociation. Magicien : +2 dés sorts de Détection. Adepte : 2 niveaux de Perception améliorée. Ombre : ne peut infliger de dommages sans test.",
      },
      {
        name: "Oracle",
        bonus: { skill: "Arcanes", val: 2 },
        desc: "Voyant obsédé par les mystères (Grimoire des ombres). Tous : +2 Arcanes. Magicien : +2 dés sorts de Détection. Adepte : Perception astrale offerte. Ombre : doit choisir Divination comme 1re métamagie.",
      },
    ],

    // ----- SR6 (livre de base p.165-170) : bonus « Tous » = +1 dé -----
    sr6: [
      {
        name: "Aigle",
        bonus: { skill: "Perception", val: 1 },
        desc: "Noblesse et défense de la nature. Tous : +1 Perception. Magicien : +1 dé invoquer les esprits de l'Air. Adepte : Sens du combat niv.1. Ombre : allergie aux polluants.",
      },
      {
        name: "Chat",
        bonus: { skill: "Furtivité", val: 1 },
        desc: "Gardien des secrets mystiques. Tous : +1 Athlétisme ou Furtivité. Magicien : +1 dé sorts d'Illusion. Adepte : Passage sans traces. Ombre : joue avec sa proie avant de l'achever.",
      },
      {
        name: "Chien",
        bonus: { skill: "Plein air", val: 1 },
        desc: "Loyauté et protection du foyer. Tous : +1 Plein air. Magicien : +1 dé sorts de Détection. Adepte : 2 Sens amélioré. Ombre : ne peut abandonner un allié.",
      },
      {
        name: "Coyote",
        bonus: { skill: "Escroquerie", val: 1 },
        originPools: ["amerindien"],
        desc: "Trickster maître des ruses. Tous : +1 Escroquerie. Magicien : +1 dé sorts de Manipulation. Adepte : Contrôle vocal. Ombre : ne peut refuser une arnaque ou une farce.",
      },
      {
        name: "Loup",
        bonus: { skill: "Plein air", val: 1 },
        desc: "Chasseur fidèle à la meute. Tous : +1 Plein air. Magicien : +1 dé sorts de Combat. Adepte : +2 niveaux Augmentation d'attribut (Agilité). Ombre : ne peut battre en retraite.",
      },
      {
        name: "Montagne",
        bonus: { skill: "Plein air", val: 1 },
        desc: "Force et endurance illimitées. Tous : +1 Plein air. Magicien : +1 dé Contresort et rituels ancrés. Adepte : 2 niveaux d'Armure mystique. Ombre : ne peut dévier d'un plan.",
      },
      {
        name: "Océan",
        bonus: { skill: "Athlétisme", val: 1 },
        originPools: ["polynesien"],
        desc: "Berceau changeant de la vie. Tous : +1 Athlétisme (natation). Magicien : +1 dé invoquer les esprits de l'Eau. Adepte : Compétence améliorée Athlétisme. Ombre : ne peut faire de don sincère.",
      },
      {
        name: "Oiseau-tonnerre",
        bonus: { skill: "Influence", val: 1 },
        originPools: ["amerindien"],
        desc: "Créature de la tempête amérindienne. Tous : +1 Influence. Magicien : +1 dé invoquer les esprits de l'Air. Adepte : Coup critique niv.1. Ombre : doit répondre à toute insulte.",
      },
      {
        name: "Ours",
        bonus: null,
        desc: "Guérisseur féroce et protecteur. Tous : +1 dé de résistance aux dommages (hors Drain). Magicien : +1 dé sorts de Santé. Adepte : Guérison rapide niv.1. Ombre : peut devenir enragé si blessé.",
      },
      {
        name: "Porteur du feu",
        bonus: { skill: "Ingénierie", val: 1 },
        desc: "Prométhée qui vola le feu aux dieux. Tous : +1 Ingénierie ou Enchantement. Magicien : +1 dé sorts de Manipulation. Adepte : Compétence améliorée (hors combat). Ombre : ne peut refuser une demande d'aide sincère.",
      },
      {
        name: "Rat",
        bonus: { skill: "Furtivité", val: 1 },
        desc: "Charognard survivant de l'ombre. Tous : +1 Furtivité. Magicien : +1 dé Enchantement (réactifs, toutes traditions). Adepte : Résistance à la douleur niv.1. Ombre : doit fuir ou se cacher en combat.",
      },
      {
        name: "Requin",
        bonus: { skill: "Combat rapproché", val: 1 },
        desc: "Chasseur froid et implacable. Tous : +1 combat mains nues ou arme tranchante. Magicien : +1 dé sorts de Combat. Adepte : Mains mortelles. Ombre : peut devenir enragé si blessé en combat.",
      },
      {
        name: "Sage guerrière",
        bonus: { skill: "Influence", val: 1 },
        originPools: ["japonais", "chinois"],
        desc: "Art du combat et code d'honneur. Tous : +1 Influence. Magicien : +1 dé sorts de Combat. Adepte : Compétence améliorée (combat). Ombre : -1 dé tant qu'un acte déshonorant n'est pas expié.",
      },
      {
        name: "Séducteur",
        bonus: { skill: "Escroquerie", val: 1 },
        desc: "Incarnation du désir. Tous : +1 Escroquerie. Magicien : +1 dé sorts d'Illusion. Adepte : Compétence améliorée Escroquerie/Influence. Ombre : ne peut résister à un vice.",
      },
      {
        name: "Serpent",
        bonus: null,
        desc: "Gardien de la sagesse, marchand de savoir. Tous : 2 Connaissances liées à la magie. Magicien : +1 dé sorts de Détection. Adepte : Contrôle corporel. Ombre : doit chercher un secret découvert.",
      },
      {
        name: "Tueur de dragons",
        bonus: { skill: "Influence", val: 1 },
        originPools: ["euro"],
        desc: "Chevalier héroïque, tient toujours ses serments. Tous : +1 Influence. Magicien : +1 dé sorts de Combat. Adepte : Sens du danger. Ombre : -1 dé tant qu'une promesse rompue n'est pas honorée.",
      },
    ],

    // ----- Anarchy 2.0 (p.173-175) : 8 esprits mentors -----
    // Mécanique V2 : chaque mentor accorde une Relance (RR 1) au choix parmi
    // une liste (on en tire `pick`), plus un Comportement imposé. Résolu par
    // Magic._resolveRrMentor() qui fixe les relances tirées (`chosen`) et
    // construit la description. Les relances sont appliquées par BonusEngine.
    // ----- Anarchy 1re édition : 6 esprits mentors
    // cités (Aigle, Chat, Chien, Corbeau, Loup, Ours), mécanique simple
    // (comme SR5 : bonus « Tous » chiffrable ou null, pas de RR à choix).
    anarchy1: [
      {
        name: "Aigle",
        bonus: null,
        desc: "Défenseur des cieux, messager. Tous : vision perçante (avantage narratif en Perception). Magicien : +1 dé Conjuration (esprits de l'Air).",
      },
      {
        name: "Chat",
        bonus: { skill: "Furtivité", val: 2 },
        desc: "Gardienne des secrets. Tous : +2 Furtivité. Magicien : +1 dé Sorcellerie (sorts d'illusion/manipulation).",
      },
      {
        name: "Chien",
        bonus: { skill: "Pistage", val: 2 },
        desc: "Loyauté et protection. Tous : +2 Pistage. Magicien : +1 dé Conjuration (esprits protecteurs).",
      },
      {
        name: "Corbeau",
        bonus: { skill: "Comédie", val: 2 },
        desc: "Messager malicieux. Tous : +2 Comédie. Magicien : +1 dé Sorcellerie (sorts de manipulation).",
      },
      {
        name: "Loup",
        bonus: { skill: "Corps à corps", val: 2 },
        desc: "Chasseur fidèle à la meute. Tous : +2 Corps à corps. Magicien : +1 dé Sorcellerie (sorts de combat).",
      },
      {
        name: "Ours",
        bonus: null,
        desc: "Guérisseur féroce. Tous : résistance accrue aux dommages (avantage narratif). Magicien : +1 dé Sorcellerie (sorts de soins).",
      },
    ],
    anarchy2: [
      {
        name: "Chat",
        behavior: "Cruel",
        pick: 2,
        rrOptions: [
          { skill: "Athlétisme", subspec: "parkour" },
          { skill: "Furtivité", subspec: "discrétion physique" },
          { skill: "Sorcellerie", subspec: "sorts d'illusion" },
        ],
      },
      {
        name: "Chien",
        behavior: "Loyal",
        pick: 2,
        rrOptions: [
          { skill: "Perception", subspec: "physique" },
          { skill: "Survie", subspec: "orientation" },
          { skill: "Sorcellerie", subspec: "sorts de détection" },
        ],
      },
      {
        name: "Coyote",
        behavior: "Malicieux",
        pick: 2,
        originPools: ["amerindien"],
        rrOptions: [
          { skill: "Influence", subspec: "imposture" },
          { skill: "Influence", subspec: "étiquette" },
          { skill: "Sorcellerie", subspec: "sorts de manipulation" },
        ],
      },
      {
        name: "Loup",
        behavior: "Acharné",
        pick: 2,
        originPools: ["euro", "amerindien"],
        rrOptions: [
          { skill: "Survie", subspec: "orientation" },
          { skill: "Combat rapproché", subspec: "mains nues" },
          { skill: "Combat rapproché", subspec: "lames" },
          { skill: "Sorcellerie", subspec: "sorts de combat" },
        ],
      },
      {
        name: "Oiseau-tonnerre",
        behavior: "Susceptible",
        pick: 2,
        originPools: ["amerindien"],
        rrOptions: [
          { skill: "Influence", subspec: "intimidation" },
          { skill: "Combat rapproché", subspec: "mains nues" },
          { skill: "Conjuration", subspec: "esprits de l'air" },
        ],
      },
      {
        name: "Ours",
        behavior: "Rage",
        pick: 2,
        rrOptions: [
          { skill: "Survie", subspec: "premiers soins" },
          { skill: "Combat rapproché", subspec: "mains nues" },
          { skill: "Sorcellerie", subspec: "sorts de santé" },
        ],
      },
      {
        name: "Raton laveur",
        behavior: "Curieux",
        pick: 2,
        originPools: ["amerindien"],
        rrOptions: [
          { skill: "Furtivité", subspec: "escamotage" },
          { skill: "Influence", subspec: "bluff" },
          { skill: "Sorcellerie", subspec: "sorts de manipulation" },
        ],
      },
      {
        name: "Tueur de dragons",
        behavior: "Honneur",
        pick: 2,
        originPools: ["euro"],
        rrOptions: [
          { skill: "Influence", subspec: "intimidation" },
          { skill: "Combat rapproché", subspec: "spécialisation au choix" },
          { skill: "Sorcellerie", subspec: "sorts de combat" },
        ],
      },
    ],
  },

  /* ========================================================
     Sélection avec biais doux vers l'origine culturelle du nom.
     ======================================================== */

  /** Tire une entrée dans `list` en favorisant (65 %) celles dont
      `originPools` contient `originPool`, si au moins une correspond.
      Sinon tirage uniforme. `originPool` peut être null/"Aléatoire". */
  _biasedPick(list, originPool) {
    if (!list || !list.length) return null;
    if (originPool && originPool !== "Aléatoire") {
      const matches = list.filter(
        (e) => e.originPools && e.originPools.includes(originPool),
      );
      if (matches.length && Utils.randBool(0.65)) return Utils.rand(matches);
    }
    return Utils.rand(list);
  },

  /** Tradition de l'édition, biaisée par l'origine et cohérente avec le
      profil (`hint` = special + archetype) : un chaman ne reçoit pas une
      tradition hermétique, et inversement. null si l'édition n'en a pas
      (Anarchy). */
  pickTradition(ed, originPool, special, archetype) {
    let list = this.traditions[ed] || [];
    if (!list.length) return null;
    // Le `special` explicite prime ; sinon on déduit de l'archétype.
    const s = String(special || "").toLowerCase();
    const explicit = /chaman|herm|mage|aztech/.test(s);
    const h = explicit ? s : String(archetype || "").toLowerCase();
    if (h.includes("aztech")) {
      const az = list.find((t) => t.name === "Aztèque");
      if (az) return az;
    }
    if (h.includes("chaman")) {
      // Chamanique / animiste : familles de foi (Charisme/Intuition).
      list = list.filter((t) => t.drainAttr !== "LOG");
    } else if (h.includes("herm") || h.includes("mage")) {
      // Hermétique / scientifique : famille de la logique.
      list = list.filter((t) => t.drainAttr === "LOG");
    }
    if (!list.length) list = this.traditions[ed]; // garde-fou
    return this._biasedPick(list, originPool);
  },

  /** Esprit mentor (ou null — optionnel en canon). La probabilité dépend de
      la sensibilité de la tradition : les esprits mentors sont surtout le
      fait des traditions chamaniques/de foi, rarement des hermétiques.
      `kind` : "shamanic" (foi) | "hermetic" | "adept" | null. */
  MENTOR_CHANCE: { shamanic: 0.65, hermetic: 0.12, adept: 0.35 },

  pickMentor(ed, originPool, kind) {
    const chance = this.MENTOR_CHANCE[kind] ?? 0.4;
    if (!Utils.randBool(chance)) return null;
    const base = this._biasedPick(this.mentorSpirits[ed] || [], originPool);
    if (!base) return null;
    // Anarchy 2.0 : mentor à relances au choix → résoudre les 2 tirées.
    return base.rrOptions ? this._resolveRrMentor(base) : base;
  },

  /** Résout un esprit mentor Anarchy 2.0 : tire `pick` relances parmi
      `rrOptions`, et renvoie un clone {name, behavior, chosen, desc} sans
      muter la donnée partagée. */
  _resolveRrMentor(base) {
    const pool = [...base.rrOptions];
    const chosen = [];
    const n = Math.min(base.pick || 2, pool.length);
    for (let i = 0; i < n; i++) {
      chosen.push(pool.splice(Utils.randInt(0, pool.length - 1), 1)[0]);
    }
    const fmt = (o) => `${o.skill}${o.subspec ? ` (${o.subspec})` : ""}`;
    const desc =
      `Comportement : ${base.behavior}. ` +
      `Relances (RR 1) : ${chosen.map(fmt).join(", ")}. ` +
      `(Au choix parmi : ${base.rrOptions.map(fmt).join(" ; ")}.)`;
    return { name: base.name, behavior: base.behavior, chosen, desc };
  },

  /** Sensibilité aux esprits mentors d'une tradition (par attribut de Drain :
      LOG = hermétique/scientifique, CHA/INT = foi/chamanique). */
  mentorKind(tradition, special) {
    if (tradition) return tradition.drainAttr === "LOG" ? "hermetic" : "shamanic";
    if (String(special || "").toLowerCase().includes("adepte")) return "adept";
    return null;
  },

  /* ========================================================
     DRAIN — calcul générique, sans lecture d'édition :
     le code de sort SR5 (« P-3 », « P+2 »…) est relatif à la Puissance,
     la VD SR6 est déjà une valeur fixe par sort (Content.spells.sr6).
     Chaque module d'édition décide ce qu'il passe en `base`.
     ======================================================== */

  /** Modificateur signé d'un code de Drain SR5 (ex. « P-3 » → -3, « P » → 0).
      Ignore les valeurs déjà numériques (SR6 : VD fixe, pas de code à parser). */
  parseDrainMod(code) {
    if (typeof code !== "string") return 0;
    const m = code.match(/([+-]\d+)/);
    return m ? parseInt(m[1], 10) : 0;
  },

  /** Valeur de Drain = base (Puissance en SR5, VD fixe en SR6) + modificateur,
      jamais inférieure à 2 (Livre de Règles SR5 p.283). */
  drainValue(base, mod = 0) {
    return Math.max(2, (base || 0) + (mod || 0));
  },

  /** Dommages de Drain après résistance : un point par succès de VD restant
      (SR5 p.280 / SR6 p.150). */
  resolveDrainDamage(dv, hits) {
    return Math.max(0, (dv || 0) - (hits || 0));
  },

  /** Réserve d'une action magique : compétence de Sorcellerie /
      Conjuration + Magie − malus de blessure. L'attribut est toujours Magie
      pour Lancement de sorts / Invocation / Conjuration (pas besoin de
      SkillCatalog). `skillName` vient du contrat d'édition (spellSkill /
      conjureSkill) ; s'il est absent du PNJ, seule la Magie compte. */
  actionPool(pnj, skillName, edition) {
    if (!skillName) return 0;
    const sk = (pnj.skills || []).find((s) => s && s.name === skillName);
    const skillVal = sk ? Number(sk.val) || 0 : 0;
    const mag = Actor.attr(pnj, "MAG");
    const malus = Utils.dicePenalty(pnj, edition);
    // Bonus de pool d'objet sur la compétence magique (foci d'incantation /
    // d'invocation / de contresort / de puissance) — MÊME source que la puce
    // de compétence de la carte (SkillEffects.forSkill), pour que le JET réel
    // inclue ce que la carte affiche. Neutre par édition (scopé au nom de
    // compétence). Sans SkillEffects (contexte de test isolé), 0.
    const foci =
      typeof SkillEffects !== "undefined"
        ? SkillEffects.forSkill(pnj, skillName).reduce((sum, e) => sum + (e.value || 0), 0)
        : 0;
    return Math.max(0, skillVal + mag + foci - malus);
  },
};

// Pont couche 2 (migration modules ES) — retiré en fin de migration.
window.Magic = Magic;
