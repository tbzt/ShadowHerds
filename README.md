# Shadow Herds

**Générateur de PNJ et gestionnaire de campagne pour Shadowrun**

SPA (Single Page Application) sans dépendances externes ni serveur — fonctionne directement depuis le navigateur via GitHub Pages ou en local.

→ [shadowherds.github.io](https://tbzt.github.io/ShadowHerds) _(à ajuster selon l'URL réelle du dépôt)_

---

## Éditions supportées

| Édition          | Source principale                      | Métavariantes    | Profils PNJ                 |
| ---------------- | -------------------------------------- | ---------------- | --------------------------- |
| **Shadowrun 5e** | LdB BBE (p.68–396)                     | —                | 48 professions, 5 métatypes |
| **Shadowrun 6e** | LdB SR6 + Feu Nourri + Compagnon (BBE) | 19 métavariantes | 50+ professions             |
| **Anarchy 2e**   | LdB Anarchy 2e (p.244–257)             | —                | 25 profils officiels        |

---

## Fonctionnalités

### Générateur de PNJ

Génère des PNJ complets à la volée pour peupler le monde à la demande du MJ. Chaque édition a ses propres mécaniques :

**SR5** — 8 attributs, 3 Limites naturelles (Physique / Mental / Social), Essence, deux moniteurs (physique + étourdissement), initiative, résistance au Drain. Profils calés sur les 6 niveaux de Professionnalisme du livre (p.382–388).

**SR6** — 8 attributs, Score Défensif (SD), Potentiel d'Actions (PA), Moniteur d'état unique (ME = 8 + CON/2), initiative. Professionnalisme 0–10 calé sur les 20 PNJ de référence (p.212–220). Armes avec Scores Offensifs (Feu Nourri). 19 métavariantes du Compagnon (Hobgobelin, Oni, Ogre, Satyre, Cyclope, Fomori, Géant, Minotaure, Nocturna, Wakyambi, Dalakitnon, Dryade, Xapiri thëpë, Nartaki, Valkyrie, Duende, Gnome, Hanuman, Koborokuru, Menehune).

**Anarchy 2e** — 5 attributs (FOR / AGI / VOL / LOG / CHA), compétences avec indice + attribut associé + RR, seuils de blessures (Physiques / Mentales / Matricielles), atouts fixes et au choix tirés dans les pools officiels, variantes métatype sur chaque valeur. 25 profils officiels du livre.

### Ombres portées

Bibliothèque de PNJ sauvegardés, persistante entre les sessions (localStorage). Layout en deux colonnes : sidebar de groupes à gauche, grille de cards à droite.

- Création et gestion de groupes nommés (renommer, supprimer)
- Sélecteur de groupe à la sauvegarde depuis le générateur
- Déplacement d'un PNJ entre groupes via un `<select>` sur chaque card
- Moniteurs de blessures cliquables sur chaque card

### Contacts

Contacts persistants avec le même layout sidebar+groupes que les Ombres portées.

- **SR5 / SR6** : 24 types de contacts, Influence (1–12), Loyauté (1–6), lieu, trait de personnalité
- **Anarchy 2e** : 30 types de contacts calés sur le catalogue officiel (p.164), niveau 0–6, domaine de Réseau, coût en ¥
- Édition inline : nom, rôle, trait, Influence/Loyauté/Niveau modifiables directement sur la card
- Champ **Notes** libre par contact
- Organisation par groupes (même logique que les Ombres portées)

### Générateur de run

Ébauche de scénario en un clic : type de mission, client (faction nommée), lieu, complication, objectif secondaire, paiement. Tables adaptées à chaque édition — les runs Anarchy utilisent des lieux nommés de Seattle et des types de missions courts.

### Navigation et persistance

- Sélecteur d'édition accessible depuis le badge `SR5 ⇄` / `SR6 ⇄` / `ANARCHY 2E ⇄` en haut à gauche
- URL hash routing : `#sr5/generator`, `#sr6/shadows`, `#anarchy/contacts` etc.
- F5 restaure l'édition et le panel sans repasser par l'écran de sélection
- Thème visuel différent par édition (SR5 : vert, SR6 : bleu-cyan, Anarchy : jaune)

---

## Structure du dépôt

```
index.html                  — point d'entrée unique
css/
  base.css                  — layout, composants, styles partagés
  theme-sr5.css             — variables couleur SR5
  theme-sr6.css             — variables couleur SR6
  theme-anarchy.css         — variables couleur Anarchy
js/
  app.js                    — bootstrap, routing, sélecteur d'édition
  generator.js              — formulaire PNJ, pool de génération
  shadows.js                — Ombres portées (PNJ persistants + groupes)
  extras.js                 — Contacts (catalogue + ContactsBook) + RunGen
  ui.js                     — CardRenderer, ContactRenderer, RunRenderer
  editmodal.js              — modal d'édition des PNJ sauvegardés
  storage.js                — wrapper localStorage préfixé par édition
  utils.js                  — Utils (noms, hasard, bassins culturels)
  settings.js               — panneau de paramètres
  editions/
    sr5.js                  — données et logique SR5
    sr6.js                  — données et logique SR6
    anarchy.js              — données et logique Anarchy 2e
```

---

## Sources

Les données de jeu sont extraites et calibrées sur les sources officielles suivantes (édition française, Black Book Éditions) :

- _Shadowrun 5e — Livre de Base_ (BBE) : attributs p.68, archétypes p.382–396, contacts p.388–396
- _Shadowrun 6e — Livre de Base_ (BBE) : attributs p.69, PNJ p.212–220, contacts p.243–249, armures p.274–275
- _Shadowrun 6e — Feu Nourri_ (BBE) : armes avec Scores Offensifs p.16–29
- _Shadowrun 6e — Compagnon du Sixième Monde_ (BBE) : métavariantes p.75–90
- _Shadowrun : Anarchy 2e_ (BBE) : profils PNJ p.244–257, contacts p.164

---

## Mentions légales

Shadowrun et Matrix sont des marques déposées de The Topps Company, Inc.
La version française est éditée par Black Book Éditions.
Cet outil est non-commercial, à usage personnel pour les tables de jeu.
Aucune donnée n'est transmise — tout est stocké localement dans le navigateur (localStorage).
