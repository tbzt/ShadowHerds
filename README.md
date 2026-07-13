# Shadow Herds

**Assistant de meneur de jeu pour Shadowrun — génère PNJ, contacts, runs, et pilote combat & Matrice.**

Application web à page unique, **100 % locale** : aucun serveur, aucune dépendance externe, aucune donnée transmise. Tout tourne dans le navigateur et se range dans son `localStorage`. Pensée pour la table de jeu — ordinateur, tablette ou téléphone.

→ [tbzt.github.io/ShadowHerds](https://tbzt.github.io/ShadowHerds)

Éditions prises en charge : **Shadowrun 5**, **Shadowrun 6**, **Anarchy 1re édition** et **Anarchy 2e édition** — quatre identités visuelles et quatre jeux de règles distincts, pas des variantes l'une de l'autre. L'édition se change à tout moment via le badge en haut à gauche ; chaque édition a ses propres règles, son thème visuel et son export.

---

## Fonctionnalités

### Générer
- **PNJ** complets à la volée (attributs, compétences, connaissances, armes, augmentations, équipement, réserves MJ, fiche d'ambiance), à l'unité ou en **bande**.
- **Contacts**, **serveurs & CI** (Matrice), et **runs** (ébauche de mission : mandant, lieu, complication, objectif, paiement).
- **Entités liées** : drones/véhicules, esprits invoqués (services), créatures et esprits libres.
- Composition cohérente **Rôle × Milieu × Professionnalisme**, ou profession nommée.

### Créer
- **Personnages joueurs** via un assistant de création (CharGen) pas à pas.

### Consulter & organiser — « Ombres portées »
- Bibliothèque transverse (PNJ, contacts, serveurs, PJ) persistante entre les sessions.
- **Dossiers hiérarchiques**, appartenance **multi-groupes** par fiche, **recherche** par nom/archétype.
- Moniteurs de blessures cliquables, portraits IA optionnels.

### Jouer
- **Suivi de combat** : initiative groupée, tri auto, passes SR5, CI intégrées à l'initiative, console de réaction, Atout/réserve de menace, compteur d'actions, fiche du combattant actif, moniteurs, **raccourcis clavier** (Espace/N = tour, R = init, ↑/↓ = réordonner).
- **L'équipe** : personnages joueurs référencés (un PJ = un nom), persistants entre les scènes.
- **Intrusion Matrice** : déploiement de CI, jets calculés, Score de Surveillance, marks (SR5) / accès illégaux (SR6) / DIEU (Anarchy), tiroir dédié depuis le suivi de combat.
- **Lanceur de dés** + journal des jets (filtres, regroupement par tour, épingles, notes) ; sur une fiche, chaque réserve `⚄` est cliquable et lance sa pile pré-calculée.
- **Réserve de Menace** (Anarchy 2).

### Système
- **Export Foundry VTT**, par fiche ou par dossier.
- **Impression fidèle au livre**, par édition.
- **Sauvegarde / import-export** (fichier ou URL) — 100 % local par défaut ; **synchro cloud optionnelle** (Gist secret ou WebDAV/NAS) pour qui la veut, jamais activée par défaut.
- Raccourcis clavier (`1`–`7`, `G`, `R`, `/`, `?`), aide et légende sensibles à l'édition, palette de commandes (Ctrl/Cmd+K) pour retrouver une fiche.

---

## Lancer en local

Site statique : servez le dossier avec n'importe quel serveur HTTP.

```bash
python3 -m http.server 8000
# puis ouvrir http://localhost:8000
```

---

## Mentions légales

Outil **non-officiel** de fans, sans but lucratif, à usage personnel pour les tables de jeu. *Shadowrun* est une marque de The Topps Company, Inc. ; droits d'édition Catalyst Game Labs ; version française Black Book Éditions. Aucune donnée n'est transmise — tout est stocké localement dans le navigateur.
