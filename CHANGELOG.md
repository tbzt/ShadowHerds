# Changelog

Toutes les évolutions notables de **Shadow Herds**.
Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/),
numérotation en [gestion sémantique de version](https://semver.org/lang/fr/).

Une entrée correspond à une **capacité visible par le meneur** (version *mineure*)
ou à une rupture (version *majeure*) ; les correctifs et le polish (*correctif*) ne
sont listés que s'ils sont notables. La propriété `App.VERSION` (`js/app.js`) suit
ce fichier : on ne l'incrémente qu'au moment où une capacité est livrée, pas à chaque
commit.

## [1.146.0] — 2026-09-02

### Modifié

- **La scène qui tourne prend le centre du suivi de combat.** Une
  course-poursuite ouverte se voyait offrir la colonne la plus étroite de
  l'écran — 300 px, contre 511 pour la console de combat et 315 pour l'effectif
  — et elle ne grandissait à aucune largeur. Le moteur qui fait avancer la
  scène passe à 771 px, et jusqu'à 869 en Anarchy, où le livre ne fait pas
  tourner l'initiative et laisse donc la piste seule maîtresse. Même chose pour
  une scène Matrice, dont le panneau passe de 320 à 831 px. Le combat garde sa
  colonne quand le livre l'exige : Shadowrun 5 et 6 font tourner l'initiative
  *pendant* la poursuite.
- **La console de combat se replie au lieu de rétrécir.** Pendant qu'un autre
  moteur mène, elle devient un bandeau d'une ligne : qui agit, son initiative,
  son malus de blessure, ses jetons d'action — et un ⛶ qui rouvre la fiche
  entière quand un coup part vraiment. C'est exactement ce que la poursuite
  consomme ; les armes, les seuils et l'encaissement n'ont pas leur place dans
  un round de course. 640 px de haut deviennent 98.
- **Le test de course-poursuite paie son action.** Le prix était écrit au pied
  de la piste depuis toujours — « 1 majeure » en SR6, « 1 action » en
  Anarchy 2.0 — et ne débitait rien : le compteur d'actions vivait dans une
  colonne, la piste dans une autre, et c'est vous qui deviez vous souvenir que
  le pilote avait brûlé sa majeure pour rester en course. Le ⚄ débite
  maintenant le budget du tour, une seule fois par round, et c'est le
  conducteur qui paie quand plusieurs partagent un véhicule. Corriger un ✓ en ✗
  ne repasse pas à la caisse. Si le budget est épuisé, l'app le dit sans
  refuser le dé — vous savez ce que vous faites. Shadowrun 5 et Anarchy 1re ne
  débitent rien : leurs livres n'imposent pas de test par round.

### Ajouté

- **La Matrice a enfin une surface quand elle mène la scène.** Son panneau
  d'intrusion ne vivait que dans un tiroir ou dans une colonne réservée aux
  écrans d'au moins 1100 px : sur un portable ou une tablette, une scène
  Matrice n'affichait *rien* de la Matrice. Le panneau s'installe désormais
  dans la colonne principale, que la liste d'initiative — inutile dans une
  scène qui n'en a pas — lui laisse libre.

### Corrigé

- **La piste de poursuite ne se coupe plus.** Sur un écran de portable, deux
  des cinq bandes de distance, dont « Extrême » et l'issue « Semé », étaient
  invisibles *et* hors d'atteinte : 188 px de ruban rognés sans barre de
  défilement nulle part. La colonne défile désormais pour de bon, « Round
  suivant » reste collé en bas, et l'ancre de la poursuite tient enfin le haut
  de la piste — elle était censée le faire depuis le début.
- **La piste ne déborde plus de l'écran sur téléphone.** Elle élargissait la
  fenêtre de suivi de 52 px, et le nom de la cible s'écrasait à 13 px dans une
  rangée à moitié vide. Le nom de la cible se lit maintenant en entier.
- **Une course-poursuite Anarchy ne se déclare plus « scène Matrice ».** Faute
  d'initiative dans ces livres, l'app en concluait que la scène était
  matricielle et affichait, en plein centre, « le decker infiltre pendant que
  les autres négocient ». Ouvrir une poursuite depuis une scène Matrice ferme
  aussi la Matrice, au lieu de laisser les deux se superposer.
- **Une scène Matrice cache enfin l'ordre du tour.** La liste des combattants
  restait affichée, avec ses scores d'initiative, dans une scène que l'app
  déclare elle-même sans initiative.
- **On peut de nouveau lier un serveur depuis une scène Matrice.** Le bouton
  qui donne accès à la liste des serveurs y était masqué : sans serveur déjà
  lié, la scène était une impasse. Un bouton « Lier un serveur » est proposé
  tant qu'aucun ne l'est.

## [1.145.6] — 2026-09-01

### Modifié

- **Les surfaces redeviennent de la matière colorée.** En les éclaircissant pour
  qu'elles se détachent enfin du fond, la version précédente leur avait pris
  leur couleur : la saturation chute quand on monte la clarté, et Shadowrun 6
  était passé de 40 à 24 %. Le résultat tirait vers le gris beige. Le
  détachement est conservé au centième près, mais chaque édition retrouve son
  chroma — le sang-et-rouille de SR5, le bleu nuit de SR6, le violet d'Anarchy 1,
  la terre brûlée d'Anarchy 2. Les textes y gagnent même en lisibilité, la
  surface étant très légèrement plus sombre.
- **Le suivi de combat cesse d'être à l'étroit sur grand écran.** Il était
  plafonné à 1200px de large et 90 % de la hauteur, sans raison inscrite nulle
  part. Il passe à 1600px et 94 % — et la place gagnée est partagée : elle
  allait entièrement à la liste des combattants, qui n'en manquait pas, alors
  que la console de l'action en cours tenait tout juste. Son nom et ses six
  gestes respirent maintenant. Sur écran étroit, rien ne change.

## [1.145.5] — 2026-09-01

### Corrigé

- **Six libellés étaient devenus illisibles en 1.145.4.** Élargir la surface des
  objets a un revers mécanique : le texte qui y était calibré pour un fond
  sombre ne l'est plus pour un fond clair. Le rang d'un PNJ, sa métavariante,
  les clés de son portrait, le titre du journal des jets, la valeur d'un
  attribut et le nom de la ressource pré-jet (« Chance », « Atout ») tombaient
  à 3,75:1, sous le seuil de lisibilité. Ils repassent au-dessus aux quatre
  éditions, sans changer de registre : l'accent reste l'accent, c'est sa
  clarté qui monte.

### Modifié

- **La matière gagne le reste des écrans.** Le suivi de combat n'était que le
  premier : les lignes de réaction, le bilan de round, l'écran joueur, la ligne
  d'annuaire, le poste de commandement de « Jouer » et la scène de poursuite se
  détachent maintenant du fond par leur surface au lieu de leur contour. Une
  distinction s'est dégagée en chemin et vaut pour la suite — **ce qu'on lit
  prend une masse et perd son filet ; ce qu'on presse prend une masse et garde
  le sien**, parce qu'un contour est l'affordance d'une puce et que le survol
  n'existe pas au doigt.
- **Le survol du menu d'une carte cesse d'éteindre.** Il renvoyait la ligne
  survolée à une teinte plus sombre que son propre repos — un survol qui
  assombrit se lit comme une désactivation.

### Note

- Le rideau des modales consomme enfin `--scrim`, défini de longue date et
  utilisé nulle part. Les tiroirs et feuilles gardent leur voile plus léger,
  qui est une distinction voulue et non un oubli.
- La proposition de sortir le suivi de combat de sa modale est **écartée** :
  trois décisions antérieures et une mesure de performance la contredisent.
  Consigné au § 9 de `DESIGN-SYSTEM.md` pour que la question ne se rouvre pas
  sans ces éléments.

## [1.145.4] — 2026-09-01

### Modifié

- **Le nom de l'écran cède le premier rang à ce qui se passe.** Le premier
  coup d'œil rendait un mot que le meneur connaissait déjà en cliquant : sur le
  suivi de combat, « SUIVI DE COMBAT — ROUND 1 · PASSE 1 » occupait 39 528 px²
  en accent, contre 1 010 px² pour le nom du combattant qui joue — un rapport de
  39 contre 1. Les titres d'écran et de modale descendent d'un cran et rendent
  l'accent ; le nom du combattant actif monte à la taille d'un titre d'objet,
  dans la police d'affichage de son édition. Le rapport tombe à 4,5 contre 1.
- **Une bascule de mode ne ressemble plus à une action.** « Sélectionner »,
  « Réorganiser » et « Annuaire » portaient le même vêtement que « Créer un
  personnage » — cinq boutons de poids égal dans une barre. Elles passent au
  palier discret, et leur état allumé se voit enfin : il était posé dans le code
  depuis toujours mais rien ne le peignait, seul le libellé changeait.
- **La bibliothèque s'ouvre sur un index.** « Ombres portées » répond à
  « retrouve-moi celui-là » et ouvrait pourtant sur des fiches déployées de
  2 000 px de haut — près de trois écrans par entrée. L'annuaire dense devient
  le défaut ; un tap sur un nom ouvre la fiche en coup d'œil sans quitter la
  liste. Un choix déjà fait par le meneur est respecté.
- **Les objets se détachent par leur matière, plus par leur contour.** Les
  quatre surfaces d'élévation tenaient dans 13 pour cent de luminance : le fond
  et l'objet étaient à 1,03 contre 1, et c'étaient les filets qui faisaient tout
  le travail. La surface d'objet s'élargit à 1,45-1,54 contre 1 aux quatre
  éditions ; la ligne de combat, les cartes et les surfaces d'overlay y passent.
  Le filet reste là où il signale un état — tour actif, « a joué », « à terre » —
  et disparaît là où il ne compensait qu'une surface invisible. L'encre
  secondaire est relevée d'autant pour rester lisible.

### Note

- Aucune capacité neuve : ces quatre lots corrigent des inversions de hiérarchie
  visuelle, mesurées écran par écran. `outils/da.py` donne les compteurs et leurs
  cibles ; `outils/servir.py` sert le dépôt sans cache, seul moyen fiable de
  vérifier une feuille ou un module fraîchement modifié.

## [1.145.0] — 2026-09-01

### Ajouté

- **Le moniteur de condition se coche au clavier.** Cocher une case de dégâts
  est le geste le plus fréquent d'une scène — et c'était le seul entièrement
  hors d'atteinte : les cases étaient des `<div>` muets, invisibles au clavier
  comme au lecteur d'écran. Une scène ordinaire en comptait 85. Chaque case
  s'annonce désormais pour ce qu'elle est (« Case 3 sur 10 — physique, palier
  de malus », « Blessure grave 1 sur 1 » en Anarchy 2.0), et un moniteur ne
  coûte **qu'une seule tabulation** : les flèches ← → circulent à l'intérieur,
  Espace coche. Les quatre éditions en profitent, chacune avec son vocabulaire
  — l'échelle de Shadowrun et les crans nommés d'Anarchy 2.0 ne s'annoncent pas
  pareil, parce que les livres ne les décrivent pas pareil.

## [1.144.0] — 2026-08-31

### Ajouté

- **Anarchy 2.0 : l'avantage s'achète enfin, quand il doit se payer.** Le
  panneau de risque savait poser un avantage (4-6 = succès) mais il était
  toujours gratuit — alors que le livre en vend un : « Obtenir un avantage (ou
  annuler un désavantage) : 1 point d'Anarchy — doit être déclaré avant de
  lancer les dés » (p. 77). Vous teniez donc la dépense de tête, ou vous
  l'oubliiez. Une ligne « Payer · Points d'Anarchy −1 » apparaît désormais sous
  le sélecteur, avec le solde restant, et le point part au lancer — pas au tap,
  pour que vous puissiez encore changer d'avis. Le journal note la dépense à
  côté du jet.
  **Le paiement n'est jamais imposé** : le livre accorde aussi des avantages
  gratuits (p. 67, un personnage qui cherche uniquement à se défendre en
  bénéficie), et c'est vous qui savez lequel s'applique.
  La ligne ne s'affiche que pour un combattant qui a des points d'Anarchy —
  ce qui est exactement la distinction du livre entre un premier rôle et un
  figurant, sans aucune case à cocher de plus.

## [1.143.0] — 2026-08-31

### Ajouté

- **La Chance d'Anarchy 1re se dépense enfin AVANT le jet — et se cumule avec le
  dé d'imprévu.** Le livre décrit deux ressources pré-jet sur la même page
  (p. 152) : les Points d'Anarchy, pris sur la réserve du meneur, et la Chance,
  prise sur la fiche du personnage — « en dépensant un point de Chance avant de
  lancer les dés, chaque dé est un succès sur un résultat de 4, 5 ou 6 ».
  L'application n'en connaissait qu'une : le contrat de jet ne pouvait porter
  qu'un seul budget par édition, et la Chance n'avait nulle part où aller. Elle
  n'existait qu'en relance, après le jet. Le panneau d'avant-jet propose
  désormais les deux, et comme rien au livre n'interdit de les dépenser sur un
  même test, **il permet de cocher les deux** : chaque option se coche, le
  bandeau annonce les deux budgets (« 4 Points d'Anarchy · 3 Chance ») et le
  bouton dit ce qu'il va dépenser avant de lancer. Les deux ressources sont
  débitées chacune au bon endroit, ou aucune si l'une des deux manque.
  Shadowrun 5 reste à une seule dépense par test, comme son livre l'impose
  (p. 58, « un seul point de Chance, pas plus »).

## [1.142.0] — 2026-08-30

### Ajouté

- **Les Infectés se jouent enfin : l'Essence descend, et elle se draine.** Un
  vampire qui vidait sa victime, un ghoul qui régénérait entre deux rounds —
  l'app les décrivait sans jamais permettre de le noter. Trois manques
  s'enchaînaient : la carte SR6 **n'affichait pas l'Essence du tout**, aucune
  surface ne permettait de la changer, et les pouvoirs des vingt-deux types
  Infectés restaient du texte.

  L'Essence apparaît désormais sur la carte SR6 — **seulement quand la fiche en
  porte une**, parce qu'un PNJ métahumain n'en a pas dans l'app et qu'écrire
  « ESS 6 » sur sa carte inventerait une donnée. Deux pas **−/+** la font
  bouger en séance, et l'éditeur de fiche accepte les décimales du cyberware
  (5,85). En SR5, la Magie et la Résonance suivent toutes seules : perdre de
  l'Essence les réduit, en revenir les restaure, sans que rien ne s'empile.

- **Le Drain d'Essence, avec sa cible et son seuil.** Depuis le menu d'une
  fiche qui porte le pouvoir : on désigne la victime, l'app annonce le test du
  livre — **Charisme + Magie en test étendu, seuil (10 − Essence de la cible),
  intervalle 1 minute** — puis enregistre le transfert. La victime prend
  l'état **Fatigué** à l'indice des points drainés (SR6), et le draineur
  plafonne au **double de son Essence naturelle** : au-delà, le point est
  perdu, comme le disent les deux livres. Une cible tombée à 0 est refusée
  avec le rappel qu'elle est morte, plutôt que drainée en silence.

  L'app n'invente rien de la fiction : les conditions du livre — cible
  physique, consciente de nature, consentante ou maîtrisée, lien émotionnel
  focalisé sur le draineur — sont **rappelées dans le dialogue avec leur
  page**, jamais vérifiées par du code. Et la victime se choisit dans la scène
  quand une scène tourne, **sinon dans la bibliothèque** : le livre décrit un
  acte lent sur quelqu'un de ligoté, qui se joue le plus souvent hors combat.

- **La Régénération se rappelle à vous à la fin du round.** Le bilan de round
  ne voyait que les états ; la Régénération est un pouvoir permanent, et un
  vampire blessé finissait son tour sans que rien ne le signale. Il porte
  maintenant sa ligne — avec le rappel de ce qui **ne** régénère pas : ni les
  dommages au cerveau sur une attaque ciblée, ni ceux d'un focus d'arme, ni
  ceux d'une Vulnérabilité, ni le Drain, et aucun test tant que la créature
  touche son allergène.

  Chaque édition garde sa règle, parce qu'elles ne se ressemblent pas : SR5 et
  SR6 font lancer **Magie + Constitution** et soignent (Constitution + succès)
  cases ; **Anarchy ne fait lancer aucun dé** — « une blessure légère en 3
  tours, une grave en 10 ». La ligne d'Anarchy n'a donc pas de bouton de jet,
  elle compte. Comme pour les dégâts périodiques, le panneau **propose** : rien
  n'est soigné dans votre dos.

## [1.141.0] — 2026-08-29

### Ajouté

- **Anarchy 2.0 hérite de 172 créatures — le griffon, le kraken, les
  gargouilles.** Le catalogue de créatures d'Anarchy n'a jamais compté que les
  dix du livre de base : un MJ qui voulait autre chose n'avait rien, et devait
  improviser ou basculer d'édition. L'annexe « Nature et Anarchy » de *Nature
  sauvage* (p. 177-240) en convertit 174, une par une, avec leurs compétences,
  leurs Atouts, leurs armes et leurs seuils de blessures. Elles sont là. Le
  bloc passe de **10 à 182 entrées**.

  Le filtre par lieu de rencontre marche dès le premier jour — 39 créatures
  urbaines, 32 de jungle, 29 de montagne, 26 de marécage — parce que la
  description, l'habitat et le portrait sont repris de la fiche SR6 de la même
  bête, déjà écrite et déjà relue. Les armes portent enfin l'effet que le livre
  écrit à leur suite (« détrempe l'ennemi », « perte d'une action si
  blessure ») : cinquante créatures en ont un.

  Deux statblocs ne sont **pas** repris, et c'est délibéré : le Brochet cracheur
  et le Gashadokuro sont décrits en trois forces (« Petit / Moyen / Gros »), ce
  que la fiche ne sait pas dire aujourd'hui. Cinq créatures ont deux moniteurs
  physiques selon qu'on les frappe avec une arme normale ou magique : la fiche
  porte le premier, le second est écrit dans ses Atouts avec sa page.

### Corrigé

- **Les créatures d'Anarchy 2.0 lançaient les mauvaises réserves depuis
  toujours.** Le livre écrit chaque compétence « Athlétisme 3 (5+F) » : le
  nombre de tête est l'indice, mais c'est la **parenthèse** qui donne la réserve
  — 5 dés plus la Force. L'app stockait l'indice et lançait « indice +
  attribut », ce qui donne un autre chiffre dès qu'un modificateur entre en
  jeu. Sur le Chien de garde du livre de base, **cinq réserves sur dix étaient
  fausses** ; sur les 1309 lignes de l'annexe, l'indice ne vaut la parenthèse
  que dans un cas sur trois. Les 88 réserves fausses des dix créatures
  existantes sont corrigées, et l'indice imprimé est conservé à côté.

- **Onze créatures techno passaient pour des Éveillées.** Le Lièvre de Matrice,
  le Coyote chanteur, l'Ibis des déchets et huit autres portent une
  **Résonance** dans *Nature sauvage*, pas une Magie — le catalogue n'avait
  qu'un emplacement et y rangeait tout. Résultat : elles ressortaient
  magiciennes, et surtout **n'ouvraient pas les actions d'Atout matricielles**
  qui les concernent. Le Lièvre de Matrice en propose désormais cinq. Vingt-huit
  autres créatures, elles, étaient générées profanes alors que le livre leur
  chiffre une Magie — le Léviathan, le Kraken, le Mégalodon, les requins.

- **Trois cartes « Quoi de neuf » ne montraient rien du doigt.** Elles visaient
  le badge d'édition et le bouton du bloc-notes, deux boutons qui existent bel
  et bien, mais le balisage ne portait pas la clé que le moteur de visite
  cherche. Elles s'affichaient au centre de l'écran au lieu de désigner leur
  cible.

## [1.140.0] — 2026-08-29

### Ajouté

- **L'état Surpris entre au catalogue SR6.** L'embuscade était la seule
  ouverture de combat que l'app ne savait pas noter : le MJ tenait de tête qui
  ne joue pas le premier round. Surpris rejoint les états en accès direct, avec
  la règle du livre — le personnage prend son rang d'initiative mais n'agit pas
  de son propre chef pendant le premier round, ne dépense pas d'Atout, et se
  défend et encaisse normalement. L'état s'éteint tout seul au changement de
  round.

  Rien n'est grisé sur sa feuille d'actions, et c'est voulu : le livre
  n'interdit aucune action nommée, il dit « ne peut pas agir » avec des
  exceptions. Un rappel s'affiche en tête, le MJ tranche — la même frontière
  que Figé ou Paniqué. Le test qui détermine la surprise (Réaction + Intuition,
  seuil 3) est écrit sur la pastille mais reste à votre table : les embusqués
  ne le lancent même pas.

- **Un run se termine enfin — et c'est le débrief qui le termine.** La
  timeline savait ouvrir un run, jamais le fermer : le débrief racontait la
  fin sans la marquer, si bien que l'index affichait un run joué il y a six
  mois exactement comme celui de ce soir. Faire le débrief clôt désormais le
  run, qui prend la mention **✓ Clos** et s'éteint dans la liste. Aucun geste
  neuf à apprendre : la clôture suit un geste que vous faisiez déjà, au moment
  où vous le faisiez.

  Deux garde-fous. Un débrief **vide** ne clôt rien — ouvrir la modale par
  curiosité ne termine pas votre run. Et clore est **réversible** : le message
  de confirmation propose « Rouvrir » d'un clic, parce qu'on peut débriefer
  trop tôt, ou rouvrir une affaire.

### Corrigé

- **Les créatures de « Nature sauvage » prennent enfin le nom que la VF leur
  donne.** Le catalogue SR6 avait été bâti sur l'édition anglaise, en
  traduisant les noms au jugé : le MJ cherchait « Jackalope » ou « Glouton
  majeur » dans une liste que son livre appelle **Lièvre cornu** et
  **Carcajou géant**. Le PDF français est arrivé, il fait autorité, et
  **96 créatures changent de nom** — Ours chuteur → **Drop bear**,
  Martichoras → **Manticore**, Poisson-diable → **Raie de l'effroi**, Semeur
  de peur → **Croque-mitaine**, Coloniste → **Blatte régente**. Vingt-quatre
  autres corrigent un accent, une casse ou un trait d'union, et les mentions
  « (SR6) » ou « (Wild Life) » disparaissent des libellés : elles ne
  désambiguïsaient rien, deux catalogues d'édition ne se croisent jamais dans
  une même liste.

  **Dix-neuf statblocs étaient faux**, et pas d'un rang : l'Ours cornu jouait
  avec un Seuil de défense de 6 au lieu de 23 et un moniteur de 10 au lieu de
  18, le Piasme avec une Constitution de 4 au lieu de 12, le Carcajou géant
  avec un SD de 5 au lieu de 13. Ces valeurs-là ne correspondaient **ni à la
  VF ni à la VO** : ce sont des erreurs de saisie, pas des divergences entre
  éditions. Les écarts qui opposent réellement les deux livres ont été
  relevés et laissés en l'état — ils demandent un arbitrage, pas un
  correctif.

  Deux créatures récupèrent leur Essence : l'app la fixait à 6 pour tout le
  monde, alors que l'**Arachno-follet** a 4 et le **Mycofundi** 3. Et le
  Mycofundi n'a **pas de Charisme** — c'est un champignon, le livre imprime
  un tiret ; il vaut désormais 0 au lieu du 3 qu'on lui avait prêté.

  Vos fiches déjà rangées gardent leur ancien nom, volontairement : ce sont
  vos fiches, et les renommer casserait les dossiers et les mentions de
  journal qui les citent.

- **Le bouton qui effaçait votre scène survivait dans la liste des runs.** Le
  correctif de la version 1.139.1 n'avait couvert qu'une des deux surfaces :
  le poste de commandement. La rangée de chaque run, elle, proposait toujours
  « Reprendre la scène » pendant qu'une scène tournait — le même chemin qui
  restaure la version rangée et vide la scène en cours. Elle porte maintenant
  la même bascule : **▶ Lancer · ▶ Rouvrir · ⏹ Fermer**.

- **Les 33 actions d'Atout de « Feu Nourri » disent enfin leur seuil.** Elles
  étaient résumées d'un trait — « la cible perd en mobilité », « un malus à
  ses prochaines actions » — ce qui ne permet pas d'arbitrer en séance : il
  manquait chaque fois l'attribut à battre, l'état exact et sa durée. Toutes
  portent désormais le mécanisme du livre : Béquille inflige **Entravé** si
  la VD modifiée dépasse l'Agilité, Coup bas inflige **Confus** au-dessus de
  la Volonté, Neutraliser **Désorienté** au-dessus de la Réaction, chacune
  pour un nombre de rounds égal aux succès nets.

  Deux étaient franchement fausses. **Clouer** annonçait l'état Entravé — le
  livre dit **Immobilisé**, dont on ne se défait qu'en dépensant Ramasser/
  Poser un objet. Et **Enchevêtrer** portait l'effet d'une autre action
  (« Muet », qui appartient à Frappe à la gorge) : elle inflige Entravé, et
  surtout tous ceux qui attaquent la cible entravée gagnent **automatiquement
  un point d'Atout** — une conséquence qui change un tour et que l'app
  passait sous silence. **Parkour** annonçait « jusqu'à 18 mètres », qui est
  le cas particulier d'un adepte avec Course sur les murs, pas la règle.

  Les 33 coûts, eux, étaient déjà exacts : ils reproduisent la table du livre.

- **Les armes du « Bazar de l'Hexagone » portent enfin les chiffres du
  livre.** Ce supplément manquait au disque : une trentaine d'armes
  françaises avaient été transcrites de mémoire, dans une grammaire que le
  parseur ne savait pas lire, puis *reconstruites* — avec un avertissement
  honnête disant qu'un score offensif pouvait rester faux d'un rang. Le
  livre a été retrouvé et tout a été recoupé, ligne à ligne.

  Trois scores étaient effectivement faux d'un rang (Manurhin sniper, Esprit
  Pilum, pistolets Cartier), trois autres avaient perdu leur troisième bande
  de portée (les deux Monobe PMAS-70 et le Lille36), et le Manurhin à canon
  court n'avait ni dégâts ni score du tout. Huit armes étaient rangées dans
  la mauvaise catégorie : l'Esprit Gladius est une **mitraillette** de VD 3P
  en SA/TR, pas une mitrailleuse « VD 5A » — cette valeur n'a jamais existé,
  c'était la colonne voisine. Le Monobe FC-MAS n'avait pas « deux
  configurations indécidables » : c'est un fusil de chasse à trois canons,
  deux de calibre 12 et un de fusil, chacun avec sa ligne. Deux lance-grenades
  affichaient les dégâts de la ligne d'en dessous. Enfin la pelle Décathlon
  est traitée au **Dikote** (et non « Dilacé », qui n'existe pas), et le kit
  de dissimulation coûte 600 € pour une mitraillette, pas 400 €.

## [1.139.2] — 2026-07-31

### Modifié

- **L'onglet « Clôture » raconte enfin votre soirée au lieu de quatre mots.**
  Il promettait « ce que ce run a laissé » et affichait *Paie · Karma ·
  Réputation · Retombées* — quatre étiquettes en dur, identiques sur un run
  joué six heures et sur un run jamais ouvert. Il liste désormais les
  **étapes marquantes réellement traversées**, avec leur bang et leur flèche
  (↑ espoir, ↓ peur) : les mêmes moments que la modale de débrief, mais
  visibles sans l'ouvrir. Rien de neuf n'est calculé ni stocké — c'est la
  trame du run, relue.

  Et les vides disent enfin quelque chose : une trame liée mais pas encore
  parcourue invite à l'avancer depuis « En jeu » ; un run sans trame le dit
  et rappelle les axes du débrief. Le bouton « ✓ Faire le débrief » reste là
  dans tous les cas.

## [1.139.1] — 2026-07-31

### Corrigé

- **Le bouton qui rangeait votre scène a cessé de l'effacer.** Dans « Jouer »,
  pendant qu'une scène tournait, le poste de commandement proposait
  « Reprendre la scène » — un verbe qui **relit la version rangée** de la
  rencontre. Or tant qu'on joue, la version rangée n'est jamais remise à
  jour : sur une scène lancée puis jamais fermée, il n'y en avait tout
  simplement aucune. Mesuré avant correction : trois combattants au round 4,
  un clic, **zéro combattant au round 1**. Ce bouton n'existe plus dans cet
  état.

### Modifié

- **« Jouer » sait enfin refermer une scène, pas seulement l'ouvrir.** Le
  geste existait — au menu ⋯ de la barre de dossiers, et au pied d'une carte
  de topos — mais pas là où la séance se passe. Le bouton du poste de
  commandement devient une bascule franche : **▶ Lancer la scène** quand rien
  n'a été joué, **▶ Rouvrir la rencontre** quand elle est rangée, **⏹ Fermer
  la rencontre** quand elle tourne. Mêmes mots et même glyphe qu'ailleurs, et
  la perche « Débriefer » se tend d'elle-même au rangement. Conduire le tour
  reste au suivi de combat : Jouer est la porte, le tracker est la pièce.

## [1.139.0] — 2026-07-31

### Ajouté

- **On déclare enfin qui est dans quel véhicule — et on en vole un à la
  volée.** La piste ne connaissait que des personnes : le véhicule d'un
  participant était *deviné* (« le premier engin que son équipement a fait
  déployer »), ce qui interdisait les deux situations les plus banales d'une
  poursuite — trois runners dans **le même** taxi, et un engin que
  **personne ne possède**. Désormais un tap sur un nom ouvre sa fiche, et
  « ▣ Monter dans… » propose les montures déjà en scène, le catalogue de
  l'édition (par une saisie filtrante : *americar*, *bulldog*, *roto*…) ou
  une saisie libre. On prend le volant, on change de monture, on descend —
  et descendre repose sur la bande de la voiture, pas ailleurs.

  Ce qui change à l'écran : **un véhicule = un jeton**, comme le livre lui
  donne une position, avec son conducteur en sous-titre et son équipage dans
  sa fiche. Ce qui ne change pas : l'Atout et ses 14 actions restent
  attachés aux **personnes** — un passager reste « poursuivant » et garde
  les siennes. La monture prise au catalogue est une **vraie fiche** avec
  son moniteur de dégâts : dans une poursuite, on se fait tirer dessus.

- **Une piste peut désormais être mixte** — des coureurs et des bagnoles sur
  le même ruban, ce qui arrive dès qu'un PJ saute dans une voiture en pleine
  course-poursuite à pied. Chaque jeton porte alors **son** attribut (« FOR
  5 » pour celui qui court, « IdV 20 » pour la bagnole) et le rappel du bas
  nomme les deux tests. Et l'app **se tait** sur le point d'Atout du round :
  aucun livre du corpus ne compare une Force à un Intervalle de vitesse, donc
  elle le dit et vous laisse trancher — même arbitrage que sur une égalité.

- **Le déplacement à pied est enfin chiffré : marche, course, sprint.**
  Aucune de ces valeurs n'existait dans l'app, alors que le terrain « À pied »
  de la piste affichait un attribut sans jamais dire ce qu'il permettait de
  parcourir. Les livres ne se ressemblent pas, et le contrat le montre au
  lieu de le lisser :
  - **SR5** dérive de l'Agilité (marche ×2, course ×4) et ne fait varier que
    le **gain de sprint** — +1 m par succès pour les nains et les trolls,
    +2 m pour les elfes, les humains et les orks ;
  - **SR6** est **forfaitaire** : 10 m pour Se déplacer, 15 m + 1 m par
    succès pour Sprinter, quels que soient le métatype et l'Agilité ;
  - **Anarchy** ne compte pas en mètres du tout — des portées et des
    Narrations : l'app écrit la phrase du livre plutôt qu'un chiffre.

  Les **17 formes qui ont leur propre déplacement** (centaure, naga, pixie,
  sasquatch, les dix zooanthropes) remplacent celui de leur souche, mode
  secondaire compris — le pixie et le falcin volent, le naga nage. Les états
  qui plafonnent une vitesse (SR6 Fatigué, Entravé) l'emportent en dernier
  **en disant lequel**. Trois surfaces : la fiche du participant sur la
  piste, une pastille « Vitesse » à côté de l'initiative sur la carte, et
  l'infobulle de l'état « En course » de SR5 — qui portait une conséquence
  mécanique sans que rien ne dise à partir de combien de mètres.

## [1.138.1] — 2026-07-31

### Corrigé

- **La piste de poursuite était illisible sur téléphone.** Retour d'usage sans
  appel : *« j'ai ouvert, j'ai regardé, et je suis parti en me disant que
  c'était trop compliqué »*. Le compte donnait raison — **42 boutons** dans une
  piste de 375px, **9 par jeton** (qui passait donc sur deux lignes), et
  **39 % de la hauteur en chrome**, dont huit puces de réglage qu'on ne touche
  qu'une fois par scène. Trois corrections, dans l'ordre où elles répondent au
  problème :
  - **la phrase d'état passe en tête, en taille de lecture, et nomme les
    gens** : « Knight Errant est au contact · 3 n'ont pas encore testé » au
    lieu d'un « Plus proche : Proche · plus loin : Moyenne » en 10px coincé
    entre deux barres de réglage ;
  - **le jeton retombe à trois gestes** — ⚄ tester, ▲▼ déplacer. Ancrer,
    avantage positionnel, réserve, sortie de course et actions d'Atout vivent
    dans la **fiche du participant**, qu'un tap sur son nom ouvre. Aucun geste
    n'est supprimé : ils sont déplacés là où on les cherche ;
  - **les réglages se replient** derrière un bouton qui résume l'état
    (« ⚙ En véhicule · Étroit »), et une **ligne d'amorce** dit les trois
    gestes tant qu'on n'a rien déplacé — puis s'efface.
  Mesuré après : 20 boutons, jeton sur une seule ligne (44px), en-tête de 89 à
  33px, piste de 670 à 552px. **Au-dessus de 640px rien ne change** : la place
  existe, les réglages restent dépliés et le jeton garde ses dix contrôles.

## [1.138.0] — 2026-07-31

### Ajouté

- **La scène de course-poursuite — un troisième moteur, et une piste pour le
  jouer.** Le suivi de combat savait faire tourner l'initiative et une
  intrusion ; il sait maintenant faire tourner une poursuite, à pied ou en
  véhicule. « ⇉ Scène Poursuite » (menu ⋯) ouvre une **piste verticale** : la
  cible de la poursuite est ancrée en haut, l'écart croît vers le bas, et
  chaque bout porte son issue avec la condition du livre — *rattrapé* d'un
  côté, *semé* de l'autre. Les participants s'y posent en un geste, se
  déplacent d'une bande aux chevrons ▲▼, et la piste dit à voix haute ce
  qu'elle sait : « Plus proche : Proche · plus loin : Moyenne · 3 sans test ».
  En SR5 et SR6 la poursuite tourne **avec** l'initiative (les deux livres
  l'exigent) ; en Anarchy elle tourne seule.
- **Le chiffre qui décide le round, sur chaque jeton — et son sens écrit.** Le
  livre SR6 fait dépendre le gain d'Atout d'un attribut **choisi par
  l'environnement** (Intervalle de vitesse en dégagé et étroit, Accélération en
  encombré ; Force ou Agilité à pied). Il est donc porté par le jeton, avec le
  meilleur signalé par l'accent — et la barre dit d'où il vient et **ce qu'il
  fait**, parce que le même nombre ne veut pas dire la même chose d'un livre à
  l'autre : `+1 point d'Atout` en SR6, **`limite du test`** en SR5,
  `avantage au test opposé` en Anarchy 2, `modificateur · règle optionnelle`
  en Anarchy 1<sup>re</sup>. Un chiffre nu aurait été un piège.
- **Le ⚄ du round lance ou pointe, selon qui joue.** Sur un PNJ dont l'app tient
  la réserve, il lance vraiment (« ⚄ 11 », seuil affiché) et tranche ; sur un PJ,
  il enregistre ce que le joueur annonce. Même doctrine que l'initiative : l'app
  ne lance jamais les dés d'un joueur. Ce que l'échec coûte — test d'Accident,
  4E à pied — est **proposé** avec sa réserve prête, jamais appliqué.
- **Les 14 actions d'Atout de course-poursuite de SR6 sont enfin jouables.**
  Elles étaient au catalogue depuis des mois, invisibles faute d'un endroit où
  les proposer : leur hôte, au livre, est *« l'action majeure nécessaire au test
  requis chaque round »* — donc la piste. Le ⇉ d'un jeton les déplie, filtrées
  par le **rôle** que le livre leur donne : *Freinage brutal* et *Fuite !* à la
  cible, *Aspiration* et *Cul-de-sac* aux poursuivants, et le compte des
  écartées dit pourquoi. Une action trop chère se **ternit** au lieu de
  disparaître — le livre écrit un prix, pas une interdiction.
- **Course et filature, sans un écran de plus.** Les deux variantes de
  *À tombeau ouvert* réutilisent la piste : en **course**, l'ancre devient
  « Meneur » et les issues « 1ᵉʳ / Hors course » (le livre : *le premier tient
  le rôle de cible*) ; en **filature**, le rythme passe en phases d'une minute
  avec ses **deux tests**, l'Atout change de camp selon l'environnement, le dé
  libre suit la distance, et la réserve de poursuite disparaît — « elle n'est
  généralement pas accessible lorsque l'on file une cible ».
- **Quatre actions de course-poursuite rendues à SR5** : Cascade, Couper la
  route, Percuter, Rattraper / Prendre de l'avance. Seule « Conduite évasive »
  était au catalogue, et par une autre porte (c'est une interruption).
- **La poursuite suit la scène partout** : elle se range et se rouvre avec elle,
  la sidebar résume l'écart (« 3 en piste · au plus près : Proche ») avec le
  compteur du mode, et l'écran spectateur la projette **sans** les informations
  de gestion — ni tests, ni réserves, ni attributs.

### Modifié

- **Le catalogue de véhicules SR6 récupère deux caractéristiques que le livre
  imprime et que l'app n'avait pas** : l'**Intervalle de vitesse** et la
  **Maniabilité hors route**. Les 49 véhicules et drones du livre de base sont
  complétés (le Chrysler-Nissan Pursuit V, seul absent, a été ajouté au
  passage). Sans elles, la piste aurait été muette sur deux environnements sur
  trois. Les engins venus des autres ouvrages affichent « — » avec la saisie à
  un tap : l'app demande, elle n'invente pas.
- **Le jeton du suivi de combat entre dans les cibles tactiles.** Il n'y avait
  jamais été réglé — un oubli, pas un choix, comme la case de moniteur avant
  lui. La piste en fait le geste le plus fréquent d'une poursuite.

## [1.137.0] — 2026-07-31

### Ajouté

- **Anarchy 1 et 2 reçoivent la limite d'attaques et le Contresort.** Les deux
  éditions étaient restées en dehors du lot précédent ; elles portent pourtant
  la version la plus nette de la règle. Anarchy 1re a même une section qui
  s'appelle littéralement **« Limite d'attaques » (p.155)** : « Un personnage ne
  peut effectuer qu'**une action offensive** durant sa Narration. » Anarchy 2.0
  (p.65) : « Un personnage normal pourra effectuer **une action par narration**,
  et une action supplémentaire **en dépensant un point d'Anarchy**. »
  Le rappel ⚔ nomme donc la règle, ce qu'elle couvre, et ce qui en achète une
  seconde — une **augmentation de réflexes** en A1, un **point d'Anarchy** en
  A2, dont le compteur est déjà juste à gauche dans le bandeau.
- **Le Contresort d'Anarchy, avec ses deux usages.** Comme partout, ils ne se
  jouent pas pareil — et en Anarchy ils ne se **paient** même pas pareil :
  - **A2 (p.184)** — *Contrer au lancement* : test simple Sorcellerie
    (contresort) + Volonté, les succès se retranchent au lancement. *Dissiper
    un sort maintenu* : test **opposé** contre Sorcellerie (type de sort) +
    Volonté, et **les deux magiciens** sont sujets au drain.
  - **A1 (p.158)** — ⚠ **règle optionnelle**, signalée comme telle : *Contrer un
    sort d'effet* consomme l'action offensive de la Narration ; *s'interposer*
    contre un sort de combat coûte **un point d'Anarchy et pas l'action**, et
    c'est toujours la cible d'origine qui subit les effets.

### Modifié

- **Le rappel d'attaques ne compte pas là où il ne peut pas compter.** En SR5 et
  SR6 il affiche un décompte, parce qu'un catalogue d'actions existe et que tout
  passe par un point unique. En Anarchy il affiche la **règle** sans chiffre :
  il n'y a pas de catalogue, les armes passent par le panneau de risque qui ne
  débite rien, et surtout les deux livres définissent l'action offensive bien
  plus largement qu'un coup de feu — lancer un sort d'effet ou engager un
  cybercombat en sont. Annoncer « 1/1 » à un magicien qui en est à sa troisième
  action offensive aurait été pire qu'un silence. Même discipline que les arrêts
  larges : l'app dit la règle, le meneur tranche.

## [1.136.0] — 2026-07-30

### Ajouté

- **Le Contresort, avec ses deux usages — pas seulement la défense contre
  sorts.** La version précédente n'en offrait qu'un bouton et un jet ; les deux
  livres en décrivent **deux**, et ils ne se jouent pas pareil. Le ✦ de la
  console Réagir déplie donc une rangée où chaque usage porte son propre test :
  - **SR6 (p.146)** — *Défense augmentée* : Sorcellerie + Magie sans seuil, les
    succès nets deviennent un bonus de défense pour tout le monde dans une
    sphère de 2 m, pendant un nombre de rounds égal à la Magie. *Dissipation* :
    même réserve, mais contre la **Valeur de Drain du sort × 2**.
  - **SR5 (p.297)** — *Défense contre sorts* : ce n'est pas un jet, c'est une
    **réserve de dés égale à l'indice de Contresort**, qu'on alloue par
    portions et qui se rafraîchit à chaque tour de combat. Elle a donc ses ±
    comme l'Atout, et rien ne se lance : ces dés s'ajoutent au test de défense
    d'un *autre*. *Dissipation* : Contresort + Magie [Astral] contre Puissance
    du sort + Magie de son lanceur, et le magicien qui dissipe encaisse le
    Drain — annoncé, jamais appliqué.

  La compétence exigée reste celle de l'édition : **Contresort** en SR5,
  **Sorcellerie** en SR6, qui n'a pas de Contresort séparé.
- **Le nombre d'attaques portées est visible sur la rangée de jetons.** Un
  repère ⚔ *n/1* apparaît dès la première attaque et vire à l'orange au-delà.
  Il **nomme sa règle**, parce que les deux éditions limitent pour des raisons
  différentes — et qu'aucune ne dit tout à fait « une attaque par tour » :
  - **SR5 (p.178)** — une interdiction explicite, mais son unité est la **phase
    d'action**, pas le tour : un combattant à trois passes attaque trois fois
    dans le tour, réglementairement.
  - **SR6 (p.42)** — aucune interdiction : attaquer coûte la majeure, et il n'y
    en a qu'une. Le livre prévoit d'ailleurs la seconde et la chiffre —
    « 4 actions mineures pour effectuer 1 action majeure (pouvant permettre
    d'effectuer une seconde attaque au cours du même tour) ». L'infobulle le dit,
    à côté du bouton d'échange qui la réalise.

  Comme le reste du cockpit, le repère informe et ne verrouille pas : rien
  n'empêche de dépasser, l'app le compte et le montre.

### Corrigé

- **« Conduite évasive » était proposée à qui n'a pas de véhicule.** Il ne faut
  pas être rigger pour faire un écart au volant, mais il faut un volant : la
  condition est désormais d'avoir un drone ou un véhicule. Une interface de
  contrôle sans engin ne suffit plus ici — elle continue en revanche d'ouvrir la
  rubrique Pilotage, qui répond à une autre question.

## [1.135.0] — 2026-07-30

### Ajouté

- **Contrer un sort rejoint la console Réagir.** Le livre SR6 la note « L » —
  déclarable à n'importe quel moment, donc jamais à son propre tour : on contre
  le sort de quelqu'un d'autre. Dans la feuille d'actions, qui est celle du
  combattant ACTIF, elle ne pouvait littéralement pas servir. Elle est
  maintenant un bouton **✦** sur la ligne du PNJ non actif, entre ⛨ Défense
  totale et ⛊ Encaissement — l'ordre de la séquence que le meneur joue déjà.
  Un tap lance la réserve de Sorcellerie et débite l'action majeure, comme le ⛉
  de défense le fait depuis longtemps.
  **Seulement pour qui a la compétence de son édition** : Sorcellerie en SR6
  (le livre n'y sépare pas le contresort du lancement), et en SR5 c'est
  « Défense contre sorts » qui reste dans la feuille du ⛨ — une INTERRUPTION,
  payée en score d'initiative et non en jetons. Deux éditions, deux mécaniques,
  deux surfaces.

### Corrigé

- **Les états « impayable » et « interdit » rendaient le nom de l'action
  illisible.** Les deux s'appuyaient sur l'opacité, qui atténue le mot autant
  que le décor. Mesuré : le libellé tombait à **2,4:1** pour une action trop
  chère et **~1,9:1** pour une action interdite, très en dessous des 4,5:1 que
  le référentiel exige. Et aucun réglage n'y pouvait rien — même à 0,85
  d'opacité le contraste plafonnait à 4,26:1. Ce n'était pas une valeur trop
  basse, c'était un canal qui ne pouvait pas marcher. **L'atténuation porte
  désormais sur le filet, jamais sur l'encre** : filet tireté et pâli pour un
  coût impayable, pointillé + barré + ⊘ pour une interdiction. Tous les états
  passent maintenant 4,5:1, teinte de domaine comprise (4,81 en magie, 4,58 en
  Matrice), et la teinte survit à l'atténuation — c'était tout l'intérêt d'avoir
  séparé les deux canaux.
- **Le decker était renvoyé vers des chips de sprite qu'il n'a pas.** La
  rubrique « Matrice » confondait deux publics : le decker et le technomancien
  jouent bien les mêmes actions matricielles (SR5 p.252), mais sept d'entre
  elles — compiler, inscrire, décompiler un sprite, lui donner un ordre,
  l'appeler, tisser et tuer une forme complexe — n'appartiennent qu'au second.
  Elles ont leur propre rubrique **Résonance**, ouverte à qui a de la Résonance,
  une forme complexe ou un persona. Un decker SR5 y perd 4 puces et deux renvois
  vers des endroits absents de sa fiche.
- **Un cyberdeck ajouté depuis l'éditeur n'ouvrait pas la rubrique Matrice.**
  Le prédicat cherchait « cyberdeck » dans l'équipement converti par `String`,
  or un objet d'équipement catégorisé y devient « [object Object] ». Seuls les
  items saisis en chaîne nue étaient reconnus.
- **« Défense contre sorts » était proposée à tout le monde en SR5**, molosses
  compris, dans une feuille d'interruptions de neuf puces. Le livre nomme
  pourtant sa réserve — « réserve = Contresort ». La condition était écrite ;
  elle n'était portée par rien. Le filtre passe par le point unique, donc la
  porte fermée à l'écran l'est aussi au clavier.

## [1.134.0] — 2026-07-30

### Corrigé

- **Trois portes du cockpit jouaient gratuitement ce que la feuille faisait
  payer.** Lancer un sort depuis le bloc Sorts, invoquer ou bannir depuis les
  chips ✦, tirer un pic de données depuis le râtelier Matrice : aucune de ces
  surfaces ne touchait au budget d'actions. Les mêmes gestes coûtaient une
  majeure (SR6) ou une complexe (SR5) depuis la feuille d'actions. **Deux
  portes, deux prix, dont un gratuit** — et c'est ce qui rendait impossible de
  refermer les doublons : effacer la puce sans brancher le débit aurait
  supprimé le coût au lieu de le déplacer. Les trois portes débitent
  désormais, et la clé débitée vient toujours du catalogue de l'édition.
- **La ligne du combattant actif avait perdu son fond, sa bordure et sa barre
  d'accent.** Un bloc de commentaire refermé une ligne trop tôt dans la feuille
  du tracker faisait avaler la règle qui suit — précisément celle qui donne au
  tour actif son identité visuelle. Mesuré : la ligne active s'affichait avec
  le fond et le filet d'une ligne ordinaire, sans le liseré de 3 px. Le repère
  le plus important de la piste ne se voyait plus.

### Modifié

- **Les actions qui se jouent ailleurs ont quitté la feuille.** Le catalogue
  savait depuis longtemps que « Attaquer » n'y a pas sa place — on attaque en
  tapant l'arme. Huit autres étaient dans le même cas et personne ne le lisait :
  le rechargement (le panneau de l'arme le porte avec son prix), Lancer un sort,
  Invoquer, Bannir, et les quatre gestes du râtelier Matrice. **9 puces de moins
  en SR6, 15 en SR5.** Rien ne disparaît en silence : un rappel en tête de
  feuille nomme l'endroit — « 4 actions se jouent depuis le râtelier Matrice » —
  et il ne cite que des endroits qui existent pour CE PNJ.
- **Une rubrique « Hors tour » sépare les réactions des actions du tour.**
  Bloquer, Esquiver, Éviter, Intercepter, Assister, Contrer un sort, Défense
  matricielle totale : le livre SR6 les note « L », déclarables à n'importe quel
  moment — c'est-à-dire jamais à son propre tour. Elles étaient mélangées aux
  actions du tour, ce qui obligeait l'œil à retrier à chaque ouverture ce que le
  livre avait déjà trié. Elles ne changent pas de surface, seulement de rangée :
  elles se paient toujours en jetons, donc elles restent là où le budget se
  manipule. **La rubrique traverse les domaines, et chaque puce y garde sa
  teinte** — Contrer un sort reste violet, Défense matricielle totale reste
  verte. SR5 n'a pas cette notation : la rubrique n'y apparaît pas.

**Ce que ça donne, mesuré** (accès direct + « tous… ») :

| | avant | 1.133 | 1.134 |
|---|---|---|---|
| ganger SR6 | 77 | 29 | **27** |
| mage SR6 | 77 | 40 | **35** |
| decker SR6 | 77 | 62 | **56** |
| rigger SR6 | 77 | 33 | **31** |
| ganger SR5 | 70 | 24 | **19** |
| mage SR5 | 70 | 29 | **21** |
| decker SR5 | 70 | 57 | **52** |

## [1.133.0] — 2026-07-30

### Corrigé

- **La feuille d'actions ne montrait plus la magie ni la Matrice à qui n'en a
  pas — sauf chez la quasi-totalité des PNJ.** Le tri par domaine, livré au lot
  F5b, ne s'appliquait que lorsque **deux rubriques au moins** restaient
  ouvertes : c'est-à-dire chez le mage et le decker, et nulle part ailleurs.
  Pour un ganger, un vigile, un molosse — la population que ce tri visait — la
  feuille repartait du catalogue entier. **Mesuré : 69 puces affichées au lieu
  de 21 en SR6, 63 au lieu de 17 en SR5**, avec juste au-dessus le rappel
  « 11 magie masquées · 33 matrice masquées » qui promettait le contraire.
  La ligne qui garantit que rien ne se masque en silence surplombait 44 puces
  qui ne se masquaient pas du tout.
- **En SR5, le domaine « magie » ne fermait rien.** Le prédicat était écrit et
  testé à chaque ouverture de feuille, mais aucune entrée du catalogue ne
  portait le domaine : SR5 n'imprime pas la magie dans une table à part, et le
  rangement en avait conclu qu'il n'y avait rien à faire. Lancer un sort,
  Invoquer, Bannir, Passer en projection astrale et Changer de perception
  restaient donc proposés à tout le monde. **Les cinq entrées portent leur
  domaine.**
- **Un Ares Predator n'est plus un char de combat.** Le catalogue de véhicules
  SR6 reconnaissait l'« Ares Army-Master » au motif `/ARES/i` — le fabricant
  seul. Ares produit le pistolet et le fusil d'assaut les plus répandus du jeu :
  tout ganger armé recevait donc une chip « ▣ Ares Army-Master · déployer »
  dans sa zone Combat. Même défaut sur `/HORIZON/i`, qui captait les commlinks
  Horizon et le drone Horizon Flying Eye pourtant catalogué à part. Les deux
  motifs nomment désormais le véhicule.
- **Trente-trois véhicules SR6 étaient inatteignables, masqués par un homonyme
  de leur propre marque.** `/ARES/i` et `/HORIZON/i` n'étaient pas deux
  accidents : une trentaine d'entrées du catalogue SR6 se reconnaissaient au
  seul nom du fabricant — `/HONDA/i`, `/FORD/i`, `/NISSAN/i`, `/TOYOTA/i`,
  `/CORSAIR/i`, `/MAERSK/i`… Comme le premier motif qui répond l'emporte,
  chaque marque ne pouvait sortir qu'un seul véhicule, toujours le même :
  « Honda Viking 2080 » et « Honda-Gm Diamondback » devenaient un *Honda Rough
  Rider*, les trois fourgons Ford un *Ford Dasher (Sport)*, les **cinq**
  Corsair un *Corsair Elysium*. Un motard sur une Yamaha Nodachi recevait la
  fiche d'une Kaburaya de course — mauvaise vitesse, mauvaise structure,
  mauvais moniteur. **Les 131 motifs du catalogue nomment maintenant le
  véhicule**, et les variantes de carrosserie (« … (Minivan) ») passent avant
  leur modèle de base pour ne plus être avalées par lui. Deux modèles gardent
  leur marque parce que leur nom seul désignait déjà de l'équipement : le
  Centaur (les cyberjambes « Substitut de membres inférieurs - Centaure ») et
  le Gladius (trois armes au catalogue). Vérifié à l'inverse : plus aucun motif
  ne capte le nom d'une autre entrée du catalogue — SR5 n'avait aucun cas et
  n'en a toujours aucun.

### Ajouté

- **Un domaine « Pilotage », pour que les actions de rigger cessent d'être
  proposées à tout le monde.** Commander un drone, Contrôler un drone à
  distance, Plonger (rigger) et Utiliser une CCR (SR6), Plonger dans un
  véhicule (SR5) : le livre les imprime dans la table de combat, mais chacune
  nomme son matériel dans sa propre description — « via une Console de commande
  pour rigger », « avec un câblage de contrôle de véhicule et un véhicule ou
  drone adapté ». La condition était écrite ; aucun prédicat ne la portait.
  **Cinq puces de moins chez qui n'a ni drone, ni véhicule, ni interface.**
- **Les rubriques Magie et Matrice se reconnaissent à l'œil.** Le domaine ne se
  lisait que dans un libellé gris au-dessus de trente puces identiques —
  invisible dès qu'on défile. Chaque rubrique porte désormais son **calque
  teinté**, violet pour la magie, vert pour la Matrice : liseré de bande,
  libellé, filet et fond des puces. Ce n'est pas une cinquième couleur d'accent
  mais le calque transverse que la zone Combat utilise déjà pour ses blocs
  Sorts et Matrice — même recette, aucun jeton nouveau.
  **La disponibilité reste lisible parce qu'elle n'emprunte pas le même
  canal** : la teinte dit le domaine, la forme dit l'état — filet tireté pour
  un coût impayable, pointillé barré et ⊘ pour une action que le livre
  interdit, liseré gauche épais pour une action déclarable hors de son tour.
  Une puce violette tiretée reste violette. L'encre, elle, ne prend jamais la
  teinte : elle doit rester lisible sous atténuation.

**Ce que ça donne, mesuré** (SR6 · SR5, accès direct + « tous… ») :
ganger 77 → **29** · 70 → **24** ; mage 77 → **40** · 70 → **29** ;
decker 77 → **62** · rigger 77 → **33**.

## [1.132.1] — 2026-07-30

### Corrigé

- **Les cases du moniteur de condition se cochent sans viser.** Marquer des
  dégâts est le geste que le meneur répète le plus en combat ; à la souris,
  c'était pourtant la **plus petite cible de toute la fiche** — 16 px, sous le
  plancher d'accessibilité (WCAG 2.5.8 en demande 24). Au doigt le problème
  n'existait pas, les cases y sont à 24 px depuis longtemps : c'est donc l'écran
  de bureau qui était le moins bien servi, là où se prépare l'essentiel des
  parties. **Les cases passent à 24 px partout.** La rangée s'élargit en
  conséquence — vérifié qu'elle tient toujours, y compris les 11 cases d'un
  moniteur SR5 sur téléphone, où le calcul avait déjà été fait.
  Deux moniteurs gardent volontairement leur taille : celui de l'**écran
  spectateur** (il se regarde, il ne se clique pas) et celui de la **vue
  compacte** d'une fiche légère, dont la densité est un choix.

## [1.132.0] — 2026-07-28

### Ajouté

- **Une action qui pose un état le pose vraiment.** Le livre ne sépare pas les
  deux — « Se coucher : il obtient alors l'état À terre », « Se relever : se
  débarrasse de l'état À terre » — mais l'app le faisait en deux gestes, et le
  second s'oubliait. Neuf actions le font désormais d'un tap :
  - **SR6** — Se coucher et Se jeter par terre posent **À terre**, Se relever le
    retire, Se mettre à couvert pose **Couvert**.
  - **SR5** — Se jeter au sol pose **Étendu**, Se relever le retire, Se mettre à
    couvert pose **Couvert**, Courir pose **En course**.
- **Deux actions que seule la prose du livre décrit** entrent au catalogue SR6,
  parce que sans elles deux états n'avaient pas de porte de sortie :
  **Retrouver l'équilibre** (1 mineure, retire Déséquilibré) et **Éteindre les
  flammes** (1 majeure + test Agilité + Réaction (2)). Leur source est citée :
  elles ne figurent pas dans la table p.45.
- **Ce qui dépend d'un jet ou d'un choix reste proposé.** « Éviter » ne pose
  À terre que **si le personnage choisit de se déplacer de plus de 2 mètres** ;
  « Éteindre les flammes » n'éteint le feu que **sur une réussite**. Dans les
  deux cas l'app le rappelle et ne touche à rien — comme le bilan de round, qui
  tend les dés sans jamais lire le résultat.

### Corrigé

- **SR5 : un personnage Surpris ne peut ni se jeter au sol ni se mettre à
  couvert** (p.165, p.193). Les deux puces sont barrées avec le motif, comme
  Sprinter sous Électrocuté en SR6. C'est un manque du lot précédent, trouvé en
  faisant celui-ci.

### Note

Quand le livre laisse le **choix du niveau** — « Couvert I, II, III ou IV » selon
l'abri — l'app pose le **minimum** et vous montez d'un tap sur la pastille. Elle
ne peut jamais accorder plus que le livre, seulement moins.

La règle « l'app ne pose jamais un état d'elle-même » n'est pas enfreinte, elle
est **précisée** : le meneur pose toujours, il le fait maintenant par le nom de
l'action au lieu du nom de l'état. Ce que l'app continue de ne jamais faire,
c'est **déduire** un état d'une situation qu'elle observe.

## [1.131.0] — 2026-07-28

### Ajouté

- **Ce que le livre interdit, l'app le refuse — et elle dit pourquoi.** Trois
  états SR6 nomment une action et la suppriment ; la puce correspondante est
  désormais barrée, avec le motif au survol, et un tap répond au lieu de
  débiter :
  - **Électrocuté** — « il ne peut effectuer une action **Sprinter** » ;
  - **À terre** — « la vitesse de déplacement est réduite à 2 mètres et **il ne
    peut pas Sprinter** » ;
  - **Immobilisé** — « les personnages ne peuvent pas **se déplacer** » :
    Se déplacer et Sprinter tombent tous les deux.
- **Les arrêts larges s'annoncent sans rien bloquer.** **Pétrifié**, **Paniqué**
  et **Figé** disent « aucune action possible » — mais avec des listes blanches
  qui sont des arbitrages (« sauf pour éviter la source de l'état », « sauf
  Perception et communication mentale »). Un bandeau les rappelle en tête de la
  feuille d'actions ; aucune des 76 puces n'est grisée, le tri revient au
  meneur.

### Note

C'est la seule chose que la feuille d'actions désactive, et c'est parce qu'il
n'y a rien à arbitrer : le livre nomme l'action et n'y met aucune condition. Le
précédent est celui du lot E4, où un personnage **Surpris** se voit refuser ses
interruptions avec la raison affichée. Partout ailleurs, l'app informe et le
meneur décide.

Le refus arrive **avant** que quoi que ce soit ne soit consommé : un état qui
interdirait une action de tir n'en laisserait pas partir les balles.

## [1.130.0] — 2026-07-28

### Ajouté

- **Les états qui renchérissent une action la renchérissent vraiment.** Trois
  lignes du catalogue d'états étaient du texte mort depuis le lot E1 — une
  surtaxe ne peut pas s'appliquer à un jeton anonyme. Maintenant que les actions
  ont un nom, elles s'appliquent :
  - **Couvert** (SR6) — « Attaquer à couvert nécessite une action mineure
    supplémentaire afin de se dégager suffisamment pour faire feu ». Poser
    l'état fait passer **Attaquer** à *1 majeure + 1 mineure*, et le coût
    **nomme sa source** : « Attaquer (1 majeure + 1 mineure · Couvert) ». Un
    chiffre ne monte jamais sans qu'on sache d'où ça vient.
  - **Nauséeux** (SR6) — « ils peuvent agir, mais perdent une action mineure » :
    la rangée de jetons rétrécit d'un cran. Ce n'est pas une surtaxe, c'est le
    **tour** qui contient une action de moins.
  - **Estropié I et II** (SR6) — le livre dit « les actions **impliquant le
    membre** », et l'app ne sait pas quel membre une action mobilise. Elle
    **signale** donc la surtaxe et laisse le meneur trancher : un rappel en tête
    de la feuille d'actions, et un ⚠ dans le message de l'action jouée. Elle ne
    l'ajoute jamais toute seule.

### Note

« Attaquer depuis un couvert » ne se cumule pas avec la surtaxe de l'état
Couvert : cette action **est** la mineure supplémentaire que l'état facture. Le
livre écrit la même règle deux fois, d'un côté comme une action, de l'autre
comme un effet d'état — l'app la fait payer une seule.

Le rappel d'Estropié est une bande unique en tête de feuille, pas un ⚠ par
puce : la règle touche potentiellement 75 actions sur 76, et un avertissement
qui s'affiche partout n'avertit de rien. Le ⚠ sur la puce reste réservé aux
surtaxes qui **nomment** leur cible.

Rien ne change en SR5 ni en Anarchy : leurs états ne déclarent aucune surtaxe
d'action, et la surface reste identique.

## [1.129.0] — 2026-07-28

### Ajouté

- **La magie et la Matrice récupèrent leur coût d'action.** Le catalogue passe
  de 32 à **76 actions en SR6** (11 magiques, 33 matricielles) et de 36 à
  **76 en SR5** (40 matricielles). Lancer un sort coûte enfin sa majeure,
  Reconfigurer les attributs matriciels sa mineure, un Pic de données SR5 sa
  complexe — et donc, en SR5, les deux simples avec.
- **La feuille se range en trois rubriques** — Combat, Magie, Matrice —
  plutôt que d'aligner 76 puces. Une rubrique vide ne s'imprime pas : une
  édition sans magie ni Matrice retrouve la liste plate d'avant.
- **SR5 a deux actions à « coût variable »** (Contrôler un appareil, Rechercher
  des données) : le livre refuse de les typer, l'app aussi. Elles s'affichent,
  se jouent, et ne débitent **rien** — inventer un jeton serait pire que de
  n'en poser aucun.

### Corrigé

- **L'interruption manquante de SR5 est trouvée.** Le catalogue en portait huit
  et signalait depuis le lot E4 qu'il en manquait une neuvième — « Passer en
  défense totale matricielle », listée « Interruption » à l'index mais dont le
  coût d'initiative n'avait pas pu être vérifié. Le dépouillement de la Matrice
  l'a rendu : **−10 au score d'initiative** (p.242), et la Volonté s'ajoute à
  toute défense contre une action matricielle — deux fois si elle est déjà dans
  la réserve. Le ⛨ de la console en déplie désormais **neuf**.

### Note

Une contradiction du livre est signalée plutôt que masquée : « Planter un
programme » est donné *complexe* dans la liste d'actions (p.165) et *simple*
dans la table récapitulative par attribut (p.245). L'app retient la liste
d'actions, qui est l'index de référence des types, et le dit en infobulle.

Les quatre actions matricielles offensives que le moteur d'intrusion lance déjà
(Pic de données, Forcer l'accès, Sonder l'accès, Planter un programme) existent
maintenant des deux côtés : là-bas avec leur réserve et leur VD, ici avec leur
coût. Deux facettes du même geste, aucune des deux tables n'ayant vocation à
porter l'autre.

## [1.128.0] — 2026-07-28

### Ajouté

- **Les armes comptent leurs balles, et le rechargement coûte ce que le livre
  dit.** Chaque arme à feu du combattant actif affiche `⦿ 40/40 (c)` et la
  liste des modes que *cette* arme déclare — un pistolet `SA` ne se voit jamais
  proposer le tir automatique. Tirer décompte, débite l'action correspondante
  et lance le jet d'un seul geste. Le ⟳ recharge : en SR5, un chargeur amovible
  coûte **deux actions simples** (« retire *ou* insère », p.169), une seule
  avec un smartgun qui éjecte gratuitement ; en SR6, une **mineure** au
  smartgun et une **majeure** à tout le reste.
- **À court de munitions, l'app donne le chiffre corrigé.** Un tir automatique
  complexe qui n'a que 7 balles sur 10 annonce **défense −6** au lieu de −9
  (SR5 : « réduisez les modificateurs de défense et de recul de 1 par balle
  manquante ») ; en SR6, une rafale ciblée à 3 balles sur 4 passe le Score
  Offensif à −3 et garde son +1 de VD. Rien n'est jamais bloqué : le livre
  autorise le tir court, il le fait seulement payer.
- **Le recul progressif SR5 se suit tout seul** (p.177-178). L'app calcule la
  compensation (1 point gratuit + Force/3 + la CR des armes, désormais relevée
  au livre pour les 19 armes concernées), cumule les balles tirées **pour le
  personnage et non pour l'arme**, retranche le malus de la réserve d'attaque
  et **le nomme** (« Réserve 12 − 3 recul = 9 »). Surtout : le cumul **se remet
  à zéro tout seul** dès qu'une action simple ou complexe n'est pas un tir —
  exactement ce que le livre écrit, et ce que personne ne suit en table. Une
  action *gratuite* ne suffit pas. Un ↺ reste là pour les cas que le livre
  laisse au meneur.
- **Les malus de défense s'annoncent sur le jet** plutôt que d'être injectés
  dans la fiche du défenseur : la ligne du journal porte « Ares Alpha · Tir
  automatique (complexe) · 10 balles · défense −9 », à lire au joueur qui va
  lancer ses dés. Un mode de tir est circonstanciel — il appartient au jet, pas
  au personnage.

### Note

SR6 n'a pas de recul : le Score Offensif l'a remplacé. La ligne de recul
n'existe donc qu'en SR5, et rien n'apparaît en Anarchy ni pour une arme de
mêlée, de jet ou exotique.

## [1.127.0] — 2026-07-28

### Ajouté

- **Les actions ont enfin un nom.** Un ＋ prolonge la rangée de jetons du
  combattant actif et déplie le catalogue de l'édition : **32 actions** en SR6
  (19 mineures, 13 majeures), **36** en SR5 (9 gratuites, 16 simples,
  11 complexes). Un tap joue l'action et **débite son coût** — jusqu'ici, sur
  tout le projet, une seule action se facturait : la Défense totale. Attaquer,
  recharger, sprinter ne coûtaient rien. Les jetons restent tappables un par un
  à côté : le geste manuel n'est jamais retiré.
- **SR5 récupère son « ou ».** Le livre accorde « 2 actions simples **OU**
  1 complexe » (p.164) ; l'app affichait deux rangées étanches, soit trois
  actions payables. Jouer une action complexe noircit désormais la case
  complexe **et** les deux simples — parce que c'est son coût, pas parce que
  l'app arbitre.
- **SR6 avait une catégorie d'action que l'app ignorait.** Le livre note chaque
  action « (I) au moment de l'initiative » ou « **(L) choix libre à n'importe
  quel moment** » (p.45) : neuf actions de combat — Bloquer, Esquiver, Éviter,
  Intercepter, Se jeter par terre, Lâcher un objet, Changer le mode d'un
  appareil, Assister, Défense totale — se déclarent **hors de son tour**, à
  condition qu'il reste une action en réserve. L'app affirmait que SR6 n'avait
  qu'une seule interruption ; elle en a neuf, et elles se paient en jetons, non
  en initiative comme celles de SR5.
- Chaque action porte **ses effets recopiés du livre** en infobulle, son coût
  en clair, et le rappel des cinq mineures SR6 qui « doivent être utilisées
  avec l'action majeure Attaquer ». Une action que le budget ne peut plus payer
  **se ternit sans se désactiver** : l'app informe, le meneur décide.

### Note

Anarchy 1 et 2 ne reçoivent rien : leurs livres n'ont pas de table d'actions
(une action significative + déplacement gratuit), et leur en fabriquer une
serait un contresens. La surface disparaît d'elle-même, comme la ligne d'états.

## [1.126.0] — 2026-07-28

### Ajouté

- **Une fumigène aveugle trois gardes en un geste.** Le suivi de combat gagne
  une action de scène **⊘ État de groupe** : on choisit l'état, on coche les
  combattants, on pose. Le bouton n'apparaît qu'à partir de **deux** cibles —
  à une seule, la feuille de la fiche suffisait déjà.
- **Les scènes mixtes sont gérées.** Le panneau propose l'**union** des états
  connus par les combattants présents, et désactive celles des cibles dont
  l'édition ignore l'état choisi (« état absent de son édition ») au lieu de
  masquer l'état. Poser « Aveuglé » sur une scène SR6+SR5 ne touche que les
  SR6, et le bouton le dit avant d'agir.
- La fiche garde son geste unitaire **inchangé** : le ＋ de la ligne d'états
  pose sur un PNJ, l'action de scène pose sur plusieurs. Deux endroits, deux
  portées — pas de mode à basculer.

## [1.125.0] — 2026-07-27

### Ajouté

- **SR6 : les actions majeures et mineures s'échangent** (p.42). La rangée de
  jetons portait le compte mais pas la monnaie — deux rangées étanches, alors
  que le livre les fait converser. Deux boutons prolongent la rangée :
  **1 majeure → 1 mineure** et **4 mineures → 1 majeure**, ce dernier étant le
  seul moyen d'attaquer deux fois dans un tour. Seuls les échanges **payables
  avec ce qui reste** sont proposés.
- **L'échange est à perte, et l'app le reconnaît** : descendre puis remonter
  coûte 3 mineures, comme dans le livre. Un ↺ **rend** les jetons échangés du
  tour plutôt que de proposer un aller-retour qui les mangerait — et il refuse
  si des actions déjà consommées en dépendent.

## [1.124.0] — 2026-07-27

### Ajouté

- **SR5 récupère sa 4ᵉ catégorie d'action : les interruptions.** L'app n'en
  connaissait que trois (gratuite / simple / complexe) ; le livre en compte
  quatre, et la dernière ne consomme aucun jeton — elle se paie en **score
  d'initiative**. Le bouton ⛨ de la console de réaction déplie désormais les
  **huit** interruptions avec leur coût (Bloquer −5, Esquiver −5, Parer −5,
  Intercepter −5, Manger la poussière −5, Défense contre sorts −5, Passer en
  défense totale −10, Conduite évasive −10). Celles que l'initiative ne peut
  pas payer restent **visibles mais désactivées**, avec la raison au survol.
- **Les deux verrous du livre sont posés** (p.169) : le score doit être
  **strictement supérieur** au coût — à 10 pile, la Défense totale est refusée
  — et un personnage **Surpris** ne peut déclarer aucune interruption avant sa
  première phase d'action. C'est le premier endroit où la table des états et
  celle des actions se parlent.
- **Les défenses multiples se comptent toutes seules** (p.189) : chaque défense
  supplémentaire retire 1 dé, le compteur repart **à la phase d'action du
  personnage** — pas au round, comme l'écrit le livre. La réserve affichée le
  montre (« ⛉ 4−2 ») sur les trois surfaces à la fois.

### Note

En SR6, le geste ne change pas d'un pixel : l'édition n'a qu'une interruption,
le ⛨ reste une bascule directe.

## [1.123.0] — 2026-07-27

### Ajouté

- **Le changement de round dresse le bilan de ce que les états réclament.**
  Un panneau apparaît — et **seulement s'il a quelque chose à dire** — listant
  pour toute la scène : les **dégâts périodiques** avec leur VD du moment
  (« Enflammé 2 · VD 2P ») et le bouton d'encaissement à côté, les **tests de
  round** avec leur réserve et leur seuil (« Nauséeux · CON + VOL (2) »), et
  les **durées échues**, qui se retirent toutes **d'un seul geste** au lieu
  d'un ✕ par état. Les jets partent par le lanceur habituel.
- **Empoisonné s'éteint tout seul**, comme l'écrit le livre (« VD réduite de 1
  par round ») — et le bilan annonce la VD du round qui s'achève, pas celle du
  suivant.
- **Mourant (Anarchy 1) compte ses Tours.** La difficulté monte d'un cran à
  chaque Tour (p.157) : le panneau affiche le seuil courant et le rang du tour
  (« FOR + VOL (6) · 3e tour »). L'app rappelle le test et tend les dés ; elle
  ne le lance pas et ne tue personne.

## [1.122.0] — 2026-07-27

### Ajouté

- **Quatre états SR6 baissent désormais vraiment les réserves, et disent
  pourquoi.** Confus, Électrocuté, Fatigué et Frigorifié — les seuls que le
  livre écrit « à toutes les actions » — entrent dans le calcul de toutes les
  réserves affichées, avec un badge **⊘ −ND** qui nomme ses sources : le
  chiffre ne baisse jamais sans qu'on sache d'où ça vient. Les vingt-quatre
  autres restent affichés et sourcés : « Aveuglé −3 aux tests liés à la
  vision » ne peut pas devenir un −3 global sans être faux la plupart du temps.
  L'**encaissement** reste exempt, comme l'écrit le livre pour Fatigué et
  Frigorifié.
- **L'initiative et l'Atout suivent.** Désorienté retire ses 4 points
  d'initiative et **verrouille le panneau d'Atout** (« ni gain ni dépense »,
  p.55-58) : la pastille disparaît, le tap redevient un lancer immédiat. En
  SR5, **Surpris** retire ses 10 points (p.193-194) — et il se réapplique à
  chaque relance d'initiative tant que l'état est posé, au lieu d'être effacé
  au tour suivant.

## [1.121.0] — 2026-07-27

### Ajouté

- **Anarchy 1 et 2 ont leurs états, eux aussi — et en Anarchy 2 ils changent
  vraiment le jet.** Anarchy 1 reçoit ce que le moniteur ne disait pas :
  **Assommé**, **Mourant** (p.157) — dont l'app rappelle le test de fin de Tour
  sans jamais le résoudre à votre place —, les deux séquelles des options de
  récupération, et les conditions durables **Acide** / **En feu** (p.168).
  « Sonné » n'y est pas : le moniteur le dit déjà. Anarchy 2 reçoit
  **Avantage**, **Désavantage** et **Drain magique** (p.65, p.170) : posé sur
  un PNJ, le désavantage part **dans le jet** — l'avantage et le désavantage se
  cumulent sans jamais dépasser un cran, exactement comme l'écrit le livre.
  Les durées s'y comptent en **Narrations**, pas en rounds.

## [1.120.0] — 2026-07-27

### Ajouté

- **Les états de combat se posent sur un PNJ, et disent d'où ils sortent.**
  Dans la zone Combat d'une fiche **SR5** ou **SR6**, un « ＋ » ouvre la liste
  des états. SR6 apporte ses **28 états** (23 du livre de base p.55-58, 5 des
  suppléments) — huit en accès direct, le reste derrière « tous… ». SR5, qui
  n'a pas d'états mais des **modificateurs de situation**, apporte les sept qui
  sont réellement persistants (Étendu, Couvert, En course, En mêlée, Surpris,
  Visibilité réduite, Défenses multiples), sous **leur nom du livre** et pas
  celui de SR6. Un tap pose, les taps suivants montent d'un cran
  (Aveuglé I → II → III → retiré), le ✕ retire. Chaque état porte **ses effets
  et sa page** en infobulle. La ligne apparaît sur la carte, dans le coup d'œil
  ⛶ et dans les blocs d'offense du cockpit ; le ⛨ « Réinitialiser les
  moniteurs » les retire tous, et le changement de round **signale** ceux dont
  la durée est échue sans jamais les enlever à votre place.

  *L'app les montre et les source ; elle ne les applique pas encore aux
  réserves — ça viendra, et seulement pour la poignée d'états que le livre
  écrit comme globaux.*

## [1.119.0] — 2026-07-25

### Ajouté

- **Les indices de la scène apparaissent au cockpit, et se cochent « révélé ».**
  Dans « Jouer » (En jeu), un tiroir **Indices** liste les indices ancrés à la
  scène en cours — plus les indices **flottants**, révélables partout — avec le
  fait qu'ils dévoilent, un repère **« jet »** s'ils sont derrière un test, et
  l'entremise d'un **contact** le cas échéant. Chaque indice se **coche
  « révélé »** : l'état survit au rechargement (état de partie), le résumé du
  tiroir affiche le compte révélés/total — de quoi tenir la règle des trois
  indices sans quitter la table. Le calque d'enquête de l'atelier n'est plus
  cantonné à la préparation.

## [1.118.0] — 2026-07-25

### Modifié

- **Les trames s'importent et s'exportent comme les PNJ.** « Charger une
  sauvegarde » restaurait déjà les trames scénaristiques, mais l'écran ne les
  comptait pas : une sauvegarde ne contenant que des trames semblait vide (et
  refusait même de s'exporter). Elles sont désormais **comptées** à l'export,
  dans le récapitulatif d'import et dans les messages de confirmation
  (« … N trames »), aux côtés des PNJ, contacts et serveurs.

## [1.117.0] — 2026-07-25

### Modifié

- **Ancrer un indice ne demande plus deux bascules.** Dans l'atelier de
  trame, activer **◇ Indices** arme désormais aussi le tissage (**◈ Relier**
  s'éclaire) : on peut tirer d'une scène vers un fait pour l'ancrer aussitôt,
  sans activer les deux boutons. Le tissage reste ré-éteignable à la main si
  l'on veut réarranger les nœuds en glissant.

## [1.116.0] — 2026-07-25

### Ajouté

- **Style de trait manuel sur les graphes : couleur + motif.** Les
  transitions du graphe de trame se colorent et changent de motif — **plein,
  pointillé, tirets** — comme les liens l'inspecteur d'arête gagne une rangée
  « Motif » et un sélecteur de couleur, pour distinguer d'un coup d'œil un
  passage ferme d'un chemin conditionnel ou hypothétique. Le graphe des Liens
  adopte le même sélecteur de motifs à la place de son ancienne case
  « pointillés » (les liens déjà en pointillés s'affichent en tirets). Une
  transition fermée par une horloge ou une issue de secours reste en tirets
  atténués (l'état de jeu prime sur le style choisi).

## [1.115.0] — 2026-07-25

### Ajouté

- **« Générer la trame » puise dans un répertoire de patterns bien plus large**
  (relevé sur une cinquantaine de suppléments Shadowrun). Un topos peut désormais
  se déplier en de nouveaux mandats — **enquête, filature, escorte, récupération
  d'objet, chasse à la prime, arnaque** —, porter de nouvelles complications — le
  **Johnson qui n'est pas ce qu'il prétend**, l'**équipe jetable**, la **cible
  innocente** —, et affronter des oppositions inédites : **IA renégate, ruche
  d'esprits-insectes, culte des ombres, meute d'Infectés**. Un **objectif
  secondaire** optionnel donne des runs à double objectif, et un nouveau modèle
  **« Enquête (pistes en éventail) »** déroule une investigation non linéaire.

### Modifié

- Prose du générateur de trame resserrée sur le registre **Shadowrun VF** (moins
  d'argot daté, plus de ton « ombres ») ; correction d'élisions (« d'une IA », « d'Ares »).

## [1.114.0] — 2026-07-25

### Ajouté

- **Les portraits IA s'affichent sur la carte des Liens.** Quand un
  personnage a un portrait généré (action « Portrait IA » de sa fiche), son
  nœud sur la carte des Liens l'incruste directement, détouré dans l'anneau —
  un vrai *casting board* : on met un visage sur chaque contact d'un coup
  d'œil. Les entités sans portrait gardent leur pastille + glyphe. Le graphe
  de trame n'est pas concerné (ses nœuds sont des scènes, pas des personnes).

## [1.113.0] — 2026-07-25

### Modifié

- **Le graphe de trame se lit comme des fiches à silhouette.** Chaque étape
  devient une **carte** posée sur le canevas, façon plan de scénario : glyphe
  + badge de type, titre, casting en puces, et (si un lieu est renseigné) une
  ligne de lieu — le tout d'un coup d'œil, sans cliquer pour ouvrir
  l'inspecteur. Le **contour** garde la lecture BPMN par catégorie : rectangle
  arrondi pour les scènes jouables (action · sociale · repérage), pastille pour
  l'accroche, pastille à double liseré pour la retombée, octogone pour la
  décision (l'aiguillage). Les liens se posent toujours sur le bord réel de
  chaque carte. Sur petit écran, l'affichage se replie au glyphe + titre
  compact pour rester lisible. (Remplace l'aperçu sous le nœud de la 1.112.0.)

## [1.112.0] — 2026-07-24

### Ajouté

- **La carte TRAME du cockpit affiche la description et le casting de l'étape
  en cours.** Dans « Jouer » (onglet En jeu), la bande TRAME montre désormais,
  sous le titre de l'étape courante, un aperçu de sa description MJ — plus
  besoin d'ouvrir l'atelier pour se rappeler ce qui se joue.

## [1.111.0] — 2026-07-24

### Ajouté

- **Un topos se déplie en trame jouable complète, d'un clic.** Le bouton
  « Générer la trame » (carte de run, et moment « Avant » de « Jouer »)
  remplace « Générer le casting » et fait bien davantage : à partir des clés du
  topos (mandant, opposition, lieu, objectif, complication), il pose une
  **trame entière** et la **lie au run** — le cockpit de « Jouer » l'affiche
  aussitôt en direct. Chaque génération est différente : le **squelette de
  scènes est tiré au sort** parmi trois modèles narratifs (Donjon en 5 salles,
  Colonne narrative, Cercle narratif). Sont peuplés, corrélés entre eux :
  - **les scènes**, habillées par le **verbe d'objectif** (une extraction, un
    vol de données ou un sabotage ne se jouent pas pareil), avec **beat
    dramatique** — un *choix forcé* au climax et au point de bascule, une
    flèche **↓Peur** sur l'affrontement, **↑Espoir** sur la retombée ;
  - **les factions en lice** : l'opposition (ancrée sur le catalogue canon) et,
    selon la complication, le **commanditaire** (double jeu) ou une **équipe
    rivale** ;
  - **les horloges de pression** : une *alerte* qui, pleine, déclenche
    l'affrontement et **ferme la sortie de secours**, une horloge d'**objectif**
    propre au contrat (Fenêtre d'exfiltration, Traçage de l'intrusion, Compte à
    rebours…), et une horloge de complication (course contre l'équipe rivale…) ;
  - **les fronts** (Dungeon World) : l'opposition réagit + un second front de
    complication, chacun avec ses **présages ordonnés** ;
  - un **calque d'indices** — un à deux **faits cachés** (la vérité derrière le
    run) et leurs indices ancrés sur les scènes, dont un *gaté* pour un
    prérequis ;
  - le **casting** d'opposition, **réparti par rôle** sur les scènes (le fixer
    en scène sociale, le decker au repérage, le muscle au climax) et versé en
    membres de la faction.

  Une trame déjà liée n'est pas dupliquée : le bouton propose de l'ouvrir.
  Nouveau bâtisseur pur `TrameGen` (couche règles, édition-neutre), nourri des
  verbes et complications de *Vise Juste* et du modèle des *Dossiers McCarthy*.

## [1.110.0] — 2026-07-24

### Modifié

- **Le graphe de trame se lit à la forme.** Chaque étape prend une **forme selon
  sa nature**, comme un diagramme de flux : l'**accroche** est un cercle
  (l'entrée), la **retombée** un cercle à double liseré (la sortie), les étapes
  jouables (**action · sociale · repérage**) des rectangles arrondis, la
  **décision** un **losange** (l'aiguillage) et chaque **fait/indice** un
  hexagone. Le glyphe reste au centre. On repère d'un coup d'œil où l'on
  bifurque et où le run peut retomber, sans lire les étiquettes. Les **liens se
  posent élégamment sur le bord réel** de chaque forme — au flanc du losange, à
  l'arête du rectangle — et plus au bord d'un cercle imaginaire. Le graphe des
  entités (personnages, contacts, serveurs) est inchangé.

## [1.109.0] — 2026-07-24

### Modifié

- **Le cockpit de « Jouer » se navigue par onglets.** Le bandeau de jalons
  (Préparation · En jeu · Clôture) devient **cliquable** : on bascule d'un tap
  entre les parties du poste de commandement — le **Briefing** (topos, casting,
  scènes), la scène **En jeu** (Combat ou Matrice, avec le roster, la trame et
  les Horloges/Fronts) et la **Clôture** (le bilan) — chacune affichée en plein,
  avec la couleur d'état qui suit (froid · accent · vert · or). La partie qui
  correspond à l'état réel du run reste l'onglet par défaut ; le meneur peut
  prévisualiser les autres à tout moment.

## [1.108.0] — 2026-07-24

### Modifié

- **Le cockpit de « Jouer » a la gueule d'un vrai poste de pilotage.** Le
  bandeau d'état, jusqu'ici une simple ligne, devient un **header teinté par
  l'accent de l'édition** : le nom de l'état en grand (⚔ Combat · ⚡ Matrice ·
  Préparation), une pastille qui rougeoie à chaud, le run et sa campagne, et des
  **cellules d'horloge** en gros chiffres (Round · Passe · En scène en combat ;
  Tour · CI · Serveurs en Matrice), suivi d'un **bandeau de jalons**
  (Préparation · En jeu · Clôture). Le fil des étapes se **colore par type de
  scène** (accroche · repérage · action · sociale · décision · retombée), et les
  Horloges deviennent des **jauges segmentées** qui rougeoient case par case.
  Zéro couleur en dur, zéro branche d'édition : SR6 / Anarchy héritent, seul
  l'accent change.

## [1.107.0] — 2026-07-24

### Ajouté

- **Le débrief liste les Moments clés que le run a traversés, et le monde s'en
  souvient.** Au débrief, la section « Ce que le run a laissé » affiche désormais
  les **Moments clés** posés sur les scènes que la partie a **réellement
  traversées**, teintés selon leur bascule d'**espoir ↑** ou de **peur ↓**. Et
  quand vous générez un nouveau run dans la même campagne, une ligne **« ◆ Écho »**
  rappelle un moment fort laissé derrière l'équipe — la mémoire du monde garde
  trace de ce qui a compté. Ce sont des rappels : les tirages et les choix ne
  changent pas (informer, jamais décider).

## [1.106.0] — 2026-07-24

### Modifié

- **On se déplace dans les graphes à la main, sans avoir à zoomer d'abord.**
  Sur les deux écrans qui partagent le moteur de graphe — la carte des **Liens**
  et l'atelier de **Trames** — on attrape désormais le fond et on **fait glisser
  la vue à n'importe quelle échelle**, y compris à l'ouverture. Avant, la vue
  restait figée tant qu'on n'avait pas zoomé. Le fond affiche un curseur de
  saisie (main ouverte, puis fermée pendant le glisser) pour signaler le geste,
  et le bouton **⤢ « Vue d'ensemble »** recentre toujours sur le cadre entier si
  l'on s'éloigne.

### Corrigé

- **La liste des modèles de trame s'affiche en entier sur mobile.** Le choix
  d'un modèle (« ＋ Depuis un modèle », « Gérer mes modèles ») empilait ses
  options dans un pied de fenêtre collé qui, dès qu'il dépassait la hauteur de
  l'écran, cachait ses premières entrées derrière l'en-tête, inatteignables au
  défilement. La liste défile maintenant normalement, chaque modèle reste
  accessible.

## [1.105.0] — 2026-07-24

### Modifié

- **Le cockpit de « Jouer » s'étage autour de la trame en combat.** Quand une
  scène de combat tourne, le poste de commandement se réorganise pour que le
  **roster reprenne la première place** : la trame se replie en une **barre
  compacte** — le chemin parcouru, l'étape en cours, son moment clé, et « La
  suite » pour bifurquer — et les **Horloges** et **Fronts** se rangent dans des
  tiroirs qu'on déplie d'un tap. Monter une horloge ou révéler une étape « si on
  ne fait rien… » se fait **sur place** : l'écran ne se reconstruit pas et on ne
  perd pas où l'on en était (les tiroirs ouverts restent ouverts). La première
  rencontre d'un **Front** s'accompagne d'une note qui explique le mot. À froid
  (préparation), la trame reprend les commandes, et le fil des étapes ne montre
  que le **chemin réellement joué**, jamais une ligne imposée d'avance.
- **La visite guidée présente enfin « Jouer ».** Le tour d'accueil faisait le
  tour de toutes les surfaces sauf le poste de commandement de séance : il a
  désormais son étape, entre Topos et Suivi de combat.

## [1.104.0] — 2026-07-24

### Modifié

- **La page Trames devient un écran plein, plus lisible, mieux rangée.**
  L'atelier de trame, jusque-là une fenêtre flottante plafonnée, est promu en
  **panneau plein écran** : il profite enfin de l'espace des grands moniteurs et
  se lit comme le reste du site. Son **en-tête** passe d'une rangée de onze
  boutons à **trois zones** — l'identité de la trame + un menu replié
  (Nouvelle · Depuis un modèle · Renommer · Enregistrer comme modèle ·
  Supprimer), les **lentilles regroupées** en segmented control (Relier ·
  Indices · Horloges · Chronologie), et la Robustesse poussée à droite.
- **Topos et Trames se rangent ensemble sous « Préparer un run ».** La
  navigation montre désormais les **deux rampes vers un run** — l'amorce rapide
  (Topos) et la structure d'avance (Trames) — dans un même groupe distinct de
  « Jouer », avec un **passage direct** de l'une à l'autre. Trames apparaît aussi
  dans la navigation mobile, où elle manquait.
- **Un vocabulaire qui parle sans jargon.** Dans l'atelier comme au cockpit, la
  *Pression* devient des **Horloges**, le *bang* un **Moment clé**, les
  *présages* des **étapes « si on ne fait rien… »**, l'*échéance* une
  **Catastrophe ⚠**, les *sorties de secours* des **issues de secours** — pour
  qu'un meneur sans la théorie narrative comprenne chaque mot d'un coup d'œil.

## [1.103.0] — 2026-07-24

### Ajouté

- **Un atelier de trame scénaristique, jouable en direct.** Le meneur peut
  désormais construire un run comme une **carte de scènes** typées (accroche ·
  repérage · action · sociale · décision · retombée), reliées par des
  transitions (choix exclusif, parallèle, **sortie de secours**), arrangées à la
  main et mémorisées. On part de zéro, d'un **squelette** (Donjon en 5 salles,
  Story Spine, Story Circle) ou d'un **modèle maison** enregistré depuis une
  trame existante. Un **calque d'indices** se superpose aux scènes (faits cachés
  + pistes, ancrées ou flottantes) avec des **alertes de robustesse** (« ce fait
  n'a qu'une seule voie », règle des trois indices, cul-de-sac…). La **pression**
  monte avec des **horloges** (qui ferment une sortie ou activent une scène à un
  seuil) et des **fronts** (une faction + des présages qui escaladent). Chaque
  scène porte son **beat dramatique** (le choix forcé, une flèche espoir/peur qui
  teinte la carte). Et tout est **vivant des deux côtés** : l'atelier de prep et
  le cockpit de « Jouer » éditent la **même trame** — faire monter une horloge ou
  bifurquer à la table se répercute à la volée sur le schéma, et inversement.

## [1.102.0] — 2026-07-24

### Ajouté

- **On peut zoomer et se déplacer sur la carte des Liens.** La carte
  heuristique (vue « Liens » / graphe de relations) n'est plus figée à
  l'échelle de la fenêtre : molette pour zoomer autour du curseur, boutons
  `＋ / ⤢ / −` au coin du canvas (`⤢` ramène à la vue d'ensemble), et
  **pincement à deux doigts** sur écran tactile (le geste consacré mobile),
  avec déplacement qui suit le milieu des doigts. Une fois zoomé, glisser le
  fond déplace la vue. Le glisser d'un nœud, le tissage de liens et l'accroche
  magnétique restent exacts — le zoom pilote le cadrage, pas la vérité.

## [1.101.0] — 2026-07-24

### Ajouté

- **Le casting du Briefing se lit par référence, et se convoque sur place.**
  Dans « Jouer », la bande Casting d'un run ne dissout plus les factions en
  membres anonymes : une faction convoquée reste une seule puce dépliable
  (pastille de couleur, compte de membres, chevron qui déroule ses figures avec
  leur ⚔), une entité convoquée directement est sa propre puce, et ce que la
  campagne parente convoque descend sur le run marqué « hérité ». Un bouton
  « ＋ convoquer » ouvre un sélecteur — factions et recherche d'entités — pour
  bâtir ou ajuster le casting sans quitter le poste de commandement. Dernière
  vue de la peau « Cockpit vivant » (fil « Le Monde et le Jeu »).

## [1.100.0] — 2026-07-24

### Ajouté

- **Le paradigme d'un serveur se déroule sur la narration.** La « sculpture »
  d'un serveur, jusque-là une ligne, se déplie sur les aspects jouables : dans
  « ⛓ Plonger dans les Fondations » (SR5/SR6), chacun des 7 nœuds prend le
  costume du thème (l'Archive d'une cathédrale devient « la crypte aux
  reliques »), une phrase d'arrivée pose l'ambiance, et la Variance se raconte —
  ce qu'« agir hors-thème » signifie ici, en mineure et en extrême. Sur la carte
  du serveur, un bloc dit ce que l'hôte EST dans le monde. Couvre les 32
  sculptures ; un thème maison retombe sur des amorces à compléter. Contenu
  dérivé de *Data Trails* (p. 122-124).
- **Image d'ambiance du paradigme (IA, opt-in).** Quand « Images IA » est actif,
  un bouton « ✨ Image du paradigme » génère, depuis une carte serveur, une vue
  onirique de son thème (grande dans la vue Fondations, en vignette sur la
  carte, cliquable en grand).

### Modifié

- **L'image IA d'un lieu passe du « plan » à l'« ambiance ».** L'IA ne redouble
  plus le plan tactique (déjà tracé en SVG, gratuit et précis) : le bouton
  « ✨ Ambiance » d'un topos génère désormais une image d'ambiance
  cinématographique du lieu, et s'affiche pour toute scène ayant un lieu.
  Principe : le SVG pour la structure, l'IA pour le ressenti.

## [1.99.0] — 2026-07-24

### Modifié

- **Le Monde ne se range plus en dossiers : il se filtre par tags.** La
  bibliothèque (« Ombres portées » et les écrans de génération Contacts /
  Serveurs) présente désormais tout le contenu d'un seul tenant, filtrable par
  **tags** et par type — la colonne « Dossiers » a quitté ces écrans. Un PNJ, un
  contact ou un serveur généré **rejoint directement le Monde**, sans étape de
  rangement obligatoire. La timeline Campagne › Run › Scène, elle, reste dans
  « Jouer » et le générateur de topos.
- **Le casting d'un run se fait par convocation, pas par rangement.** Générer
  l'opposition d'un run **convoque** des acteurs du Monde (par référence) : la
  même figure peut jouer dans plusieurs runs, et convoquer une faction amène
  tout son roster vivant — éditer la faction met à jour tous les runs qui la
  convoquent. « Ramener un visage déjà croisé » et la mémoire du monde suivent
  la même vérité.

## [1.98.0] — 2026-07-23

### Ajouté

- **Le poste « Jouer » devient un cockpit vivant.** La séance se lit d'un coup
  d'œil : une **coquille** dont la couleur d'état informe avant la lecture —
  froide au repos, à l'encre de l'édition **en combat**, verte quand la
  **Matrice** tourne — surmontée d'une barre d'état (« ● En combat — Round 2 »,
  « ◐ Matrice active », « ○ En préparation »). Au repos, le topos se présente
  comme un **vrai briefing** (l'objectif en titre, le mandant et le lieu en
  contexte, la complication en garde), et le CTA **« Lancer la scène » chauffe**
  en accent même dans une coquille froide. Chaque campagne devient un **Pont** :
  un poste d'aiguillage froid où le run vivant est surélevé et pulse. À la
  clôture, le débrief se lit comme un **bilan** (paie · karma · réputation ·
  retombées) en teinte or.
- **Les Factions : regrouper le Monde, transverse aux types.** Une faction
  rassemble PNJ, PJ, contacts et serveurs sous un même toit (une bande
  « Factions » sur chaque fiche). Sur le **graphe des relations**, chaque faction
  devient une **poche colorée** derrière ses membres (bascule « ◇ Poches ») ;
  sélectionnez plusieurs nœuds pour **« en faire une faction »** d'un geste ; et
  le **nom** d'une faction, sur une fiche, ouvre le graphe **scopé** à ses seuls
  membres.
- **Des tags et une épingle pour ranger, sans dossier.** Chaque entité accepte
  des **tags** libres (« corpo », « matrice », « indics »), posés depuis sa
  fiche et réutilisables d'une entité à l'autre. Les **Favoris** deviennent une
  **épingle** (l'étoile de la carte) plutôt qu'un dossier réservé. Dans
  « Ombres portées », deux nouvelles puces de filtre — **★ Épinglés** et
  **Tags** — retrouvent d'un tap toutes les fiches d'un tag (ou les épinglées),
  en s'ajoutant aux filtres Rôle · Milieu · Métatype.

### Modifié

- La **timeline** (fil d'Ariane, sélecteur de contexte, Le Pont) ne montre plus
  que les nœuds de jeu **typés** (campagne · run · scène) : les dossiers de
  simple rangement restent au classement, hors de la ligne du temps.

### Retiré

- Le dossier réservé **« ★ Favoris »** disparaît de la barre de dossiers : son
  rôle est repris par l'épingle-tag (les anciens favoris ne sont pas migrés).

## [1.97.0] — 2026-07-22

### Ajouté

- **Les Fondations d'un serveur deviennent un plan et une Variance vivante.**
  La fiche « ⛓ Plonger dans les Fondations » (SR5/SR6) affiche désormais un
  **plan généré** des 7 nœuds : en SR6, le vrai squelette de pistes du livre
  (Portail↔Archive↔Échafaudage/Sécurité/Régie↔Centre de contrôle↔Nœud vide) ;
  en SR5, les 7 nœuds seuls — le livre n'imprime aucune table de pistes, elles
  restent narratives. Touchez un nœud pour sauter à ses actions. Et pendant un
  run profond, un **tracker de Variance** rejoint le Score de Surveillance
  dans le tiroir Matrice : en SR6, un stepper +1 à +5 avec seuil `80 −
  5×Indice` ; en SR5, un vrai **test de dés** (Firewall ou Indice+Firewall,
  seuil 4) qui déclenche l'alerte sur un succès, ajoute les succès sur un
  échec, retranche 1 sur une complication et divise le décompte par deux sur
  un échec critique — les deux mécaniques du livre, jamais aplaties en une
  seule.

### Corrigé

- **Pied de carte réaligné.** Le pied (★ / 🏷 / actions) débordait sur deux
  lignes : la poignée de réorganisation, invisible au repos, réservait quand
  même sa largeur (`visibility:hidden` au lieu de `display:none`) et le tag de
  groupe étalait son libellé. La poignée ne prend plus de place hors du mode
  réorganisation, et le tag de groupe passe en **icône seule** (le nom du/des
  groupe(s) au survol) — les actions tiennent sur une ligne dès que la carte est
  assez large ; sur les cartes étroites de l'annuaire, le pied retombe
  proprement sur deux lignes au lieu de se briser.

## [1.96.0] — 2026-07-22

### Ajouté

- **Le graphe des relations devient un schéma éditable.** La lentille « ◈ Liens »
  n'est plus réservée aux PJ : elle s'ouvre depuis **n'importe quelle fiche**, PNJ
  compris, pour cartographier et **tisser les relations PNJ↔PNJ**. Quand vous
  touchez un nœud, **sa fiche s'affiche sur le côté** (plus par-dessus) — touchez-en
  un autre, elle s'échange. Et vous stylez le réseau comme un schéma heuristique :
  touchez un **lien** pour lui donner une **couleur**, une **direction** (aucune,
  →, ←, ↔), des **pointillés**, et un **mot sur le trait** (« doit une faveur »,
  « a trahi »…) ; touchez un **nœud** pour lui choisir une **couleur** qui le suit
  partout. Tisser un lien ouvre aussitôt son inspecteur, pour le nommer dans la
  foulée. Le style est de la **fiction de campagne** : une flèche n'est jamais une
  marque de jeu. Sur téléphone, la fiche passe en feuille basse sous le graphe.

## [1.95.0] — 2026-07-22

### Ajouté

- **La mémoire du monde.** Vos topos ne naissent plus vierges : quand vous générez
  dans une campagne, le monde tient compte de ce que l'équipe y a fait. Une corpo
  déjà affrontée revient plus souvent en opposition, annotée « 3ᵉ run contre eux,
  ils vous connaissent » ; un **contact connu** de l'équipe peut se mêler du run ;
  la **réputation** de l'équipe pèse sur la taille des jobs proposés ; et un
  **visage d'ennemi déjà croisé** peut revenir dans le casting, en un tap. Au
  **débrief**, vous marquez qui vous **doit une faveur** (il pourra vous ramener un
  job) ou qui est **grillé** (il ne rappellera plus). Rien n'est imposé : le monde
  propose, vous ratifiez — régénérez à volonté. Tout est **dérivé** de votre
  campagne (runs passés, contacts, réputation), sans aucune saisie ni donnée en
  double. Les éditions sans réputation (Anarchy) l'ignorent proprement.

### Corrigé

- **Le casting généré réapparaît dans son run.** Depuis le passage des dossiers à
  un identifiant interne, « ⚔ Casting » rangeait les PNJ d'opposition sous le *nom*
  du dossier au lieu de son identifiant : ils n'apparaissaient plus dans le poste
  de commandement « Jouer ». Corrigé — le casting se range de nouveau dans son run.

## [1.94.0] — 2026-07-22

### Ajouté

- **Une vue de jeu épurée pour chaque perso.** Un nouveau bouton **◫**, posé
  dans le rail de vues existant (à côté de ☰❝⚔, sans y toucher), déplie la fiche
  en **paysage** selon l'axe SYSTÈME ↔ FICTION. À gauche, le système réduit à
  l'essentiel de jeu : **moniteur en bande horizontale cochable**, la capacité
  **signature** selon l'archétype (sorts pour un mage, formes pour un techno,
  râtelier Matrice pour un decker, pouvoirs pour un adepte, armes pour un
  combattant), les **compétences en puces lançables**, les **augmentations en
  tags**. À droite, la fiction : incarnation (valeurs sous les titres, lisibles)
  + contacts / mentions / dossiers. Scannable d'un coup d'œil, tout reste
  lançable en un tap ; la barre étroite retombe en une colonne. Les vues
  existantes ne changent pas — choisir une lentille sort du paysage.
- **Une grille pour trier.** En mode Annuaire, les fiches compactes ne s'empilent
  plus en une seule colonne : elles s'étalent en **grille responsive** (plusieurs
  de front sur large, une seule en étroit) pour comparer un escadron d'un coup
  d'œil — le moment « prépa à froid ».
- **Le nœud du graphe est la fiche repliée.** Dans le graphe des relations, chaque
  nœud tient son identité (nom, type) du **même contrat** que la carte à son cran
  le plus replié — une entité, une définition, pas deux rendus. Un clic déplie le
  nœud en aperçu de fiche.

## [1.93.0] — 2026-07-22

### Ajouté

- **La Défense totale, motorisée.** Au tour d'un PJ, la console « Réagir » gagne
  un bouton **⛨ Défense totale** (SR5/SR6) : d'un tap, le PNJ ajoute sa Volonté à
  sa réserve de défense pour le round, et le coût d'initiative de l'édition est
  appliqué automatiquement — **−10 au score d'initiative en SR5** (p.170), sans
  coût en SR6 (p.48). Déclaration à sens unique par round.

### Corrigé

- **« Dégâts » déplie de nouveau ses crans.** Le bouton ✸ Dégâts de la console de
  réaction ne réagissait plus (une règle CSS `display` écrasait l'attribut
  `[hidden]`, laissant les crans affichés en permanence et le bouton sans effet) :
  il rouvre les cases numériques (SR5/SR6) ou de gravité (Anarchy).
- **Plus de « bouclier d'encaissement » là où le jeu n'en a pas.** L'Encaissement
  ⛊ disparaît de la console en Anarchy 1re/2.0, dont le combat résout les dommages
  par un seuil et non par un jet (Anarchy 2 p.68).
- **Les crans légère / grave / incapacitante** reprennent les **couleurs du
  moniteur** au lieu d'un rouge uniforme : la couleur porte de nouveau la gravité.

### Modifié

- **La fiche d'un PNJ en réaction s'ouvre en aperçu feuilletable** (⛶, balayage et
  précédent/suivant, comme dans Jouer) plutôt qu'un accordéon vers le bas.
- Dans la console de réaction et la carte active, les combattants portent le
  **même nom compact** (surnom de rue) que dans la file d'attente.

## [1.92.0] — 2026-07-22

### Ajouté

- **Le graphe des relations.** Les liens entre vos personnages, PNJ, contacts et
  serveurs — jusqu'ici épars sur les fiches — se voient enfin **en graphe**. Sur
  la fiche d'un PJ relié à des contacts, un bouton **« ◈ Liens »** ouvre une carte
  des relations : chaque entité est un **nœud** (coloré et marqué d'un glyphe selon
  son type), reliés par leurs liens. On **déplace** les nœuds — ils ont un poids :
  soulevés à la prise, ils glissent avec de l'élan et se recalent en douceur ; on
  **touche** un nœud pour ouvrir sa fiche **en aperçu** sans quitter le graphe ; et
  en activant **« Tisser »**, on **crée un lien** en tirant d'un nœud à l'autre, la
  ligne s'accrochant à la cible valide. Une seule vérité : les liens tissés ici et
  ceux posés sur les fiches vivent au même endroit.

## [1.91.0] — 2026-07-21

### Ajouté

- **La scène devient une entité à part entière.** Un run n'est plus un topo
  plat : il contient des **scènes nommées**, chacune liant — par référence,
  jamais copie — son casting, ses notes et son plan de lieu. Dans **Jouer**, le
  moment « Avant » liste les scènes du run ; chacune montre son propre casting et
  son bloc de notes. Créer, renommer et ordonner les scènes sous un run se fait
  comme pour les dossiers.
- **Chaque scène se joue pour elle-même.** Lancer une scène ouvre **sa** rencontre
  (initiative, moniteurs, intrusion) ; l'état de jeu est mémorisé **par scène**, si
  bien qu'on bascule d'une scène à l'autre sans perdre le round en cours de chacune.
  Les scènes s'**enchaînent** (lien de succession) pour tracer le fil du run.
- **Rejouer une campagne avec une autre équipe.** Une campagne (ou un run) se
  **duplique** : la structure — runs, scènes, ordre, et les **références** aux
  PNJ / plans / hosts — est copiée dans une partie neuve, à l'état de jeu vierge.
  Améliorer un PNJ profite à toutes les parties (Actif partagé) ; qu'une équipe le
  tue n'affecte que sa propre partie (l'état vit dans la scène, jamais sur l'Actif).
- **Un plan de lieu par scène.** Chaque scène peut dessiner son propre plan tactique
  procédural (lieu et graine mémorisés sur la scène), comme le « Plan tactique »
  d'un run.

## [1.90.0] — 2026-07-21

### Ajouté

- **Plonger dans les Fondations (SR5 & SR6).** Le menu ⋯ d'une carte de serveur
  porte, en SR5 et SR6 uniquement, « ⛓ Plonger dans les Fondations » : une fiche
  de référence en lecture seule du donjon interne de sept nœuds (Data Trails
  « De plus en plus profond » p.113-124 ; Hacker Vaillant « Au cœur des serveurs »
  p.137-142). Elle rappelle les 7 nœuds et leurs actions/jets **sourcés**, le
  paradigme (repris de la sculpture du serveur) et le seuil de Variance — chacun
  au régime de son édition : SR5 oppose « Indice + attribut », SR6 « Indice × 2 »
  (le mapping attribut→Fondation et le seuil de Variance diffèrent entre éditions,
  et ne sont jamais aplatis). Anarchy n'a pas de Fondation : l'entrée n'y apparaît
  pas. Générateur de plan des nœuds et suivi de Variance en scène différés.

## [1.89.0] — 2026-07-21

### Ajouté

- **Le plan de serveur.** Un site n'est presque jamais un seul serveur : la
  Matrice mène à un serveur qui en protège d'autres — enchaînés, en arborescence,
  hérissés d'appareils asservis, ou imbriqués les uns dans les autres — jusqu'à
  celui qui tient les données (Anarchy 2 p.222 ; serveurs imbriqués de *Hacker
  Vaillant* p.139 ; réseaux d'appareils asservis / WAN des livres de base
  SR5/SR6). L'écran **Serveurs** porte un bouton **« ▤ Plan du site »** qui dessine
  cette architecture pour le dossier courant — chaîne, arborescence, WAN ou hôtes
  imbriqués selon l'édition —, construite gratuitement et à l'instant, comme le
  « Plan tactique » d'un lieu. En mode édition, chaque serveur se voit désigner un
  **point d'entrée** (Matrice publique ou connexion directe au câble) et, pour l'un
  d'eux, le rôle de **nœud-cible** (celui qui tient les données) ; les deux sont
  rappelés en badges sur sa carte.
- **La Matrice de la scène, en carte navigable.** Quand plusieurs serveurs sont
  piratés en parallèle dans une même rencontre, le tiroir Matrice affiche une
  **mini-carte** de ces serveurs : le serveur affiché y est surligné, le nœud-cible
  marqué, et **toucher un autre nœud** (ou l'activer au clavier) bascule le tiroir
  dessus — la navigation entre serveurs actifs remplace l'ancien menu déroulant.

## [1.88.0] — 2026-07-21

### Ajouté

- **Le dé d'imprévu d'Anarchy 1re.** Dans *Shadowrun : Anarchy* (1re éd.), un
  pool ne « rate » jamais tout seul : la malchance — et la chance — viennent d'un
  **dé d'imprévu** que l'on ajoute avant le jet, le plus souvent en dépensant un
  **Point d'Anarchy** (sran_01 p.157). Il est maintenant motorisé : depuis le
  panneau « Avant de lancer », l'option **Dé d'imprévu** dépense 1 point de la
  réserve de menace et ajoute un dé à la réserve. Sur un **1**, une *complication*
  s'invite ; sur un **5-6**, un *exploit* (le bon côté du destin) — affichés dans
  le tirage et le journal des jets. Le dé compte aussi comme un dé normal (succès
  sur 5-6). *(L'option apparaît quand le mode pré-jet « panneau » est actif dans
  les préférences, comme l'Edge SR5/SR6.)*

### Corrigé

- **Les complications parlent enfin la langue de chaque édition.** SR5 et SR6
  affichaient « Bévue » là où les deux livres VF disent **« Complication »**
  (SR5, § Complications et échecs critiques ; SR6 p.40) — c'est corrigé partout,
  tirage comme journal. Surtout, **Anarchy 1re n'affiche plus de fausse
  complication** : un pool y héritait à tort de la règle SR5 (« plus de la moitié
  des dés sont des 1 »), une règle qui n'existe pas dans Anarchy — sa seule source
  de complication est le dé d'imprévu ci-dessus. Effet de bord réparé au passage :
  la « Seconde chance » n'est plus bloquée par un échec critique fantôme.

## [1.87.0] — 2026-07-21

### Ajouté

- **Les marks matricielles SR5 se suivent dans les deux sens.** Le suivi
  d'intrusion distinguait mal *qui* a marqué *qui* : un compteur unique « Marks du
  serveur ». Il est remplacé par les deux directions que les livres séparent
  (max 3 par cible, p.233). D'un côté, **les marks de l'hôte sur chaque PJ** :
  une ligne par personnage connecté à la scène, car l'hôte peut avoir trois marks
  sur le decker et une seule sur le rigger. Toutes les CI de l'hôte — et son
  spider — **partagent** ce compteur (p.247) : on ne suit pas de marks par CI,
  parce que la règle ne les sépare pas. De l'autre, **les marks de l'équipe sur
  l'hôte**, la monnaie d'accès du decker (trois marks = accès propriétaire). Au
  reboot, les deux repartent à zéro.

## [1.86.1] — 2026-07-21

### Modifié

- **Un seul geste pour maintenir un sort/une forme.** Sur la ligne d'un effet —
  dans le suivi de combat comme sur la fiche — le nombre de succès du dernier jet
  bascule le maintien : clic pour maintenir (`→ N` → `⟳ N`), re-clic pour l'arrêter.
  Le petit `✕` qui doublonnait cet arrêt (il ne servait qu'à *oublier* le dernier
  jet, que le prochain jet réécrit de toute façon) est retiré. Le badge agrégé
  `⟳ ×N · −N` et le malus de −2 dés par effet maintenu (SR5/SR6) sont inchangés.

## [1.86.0] — 2026-07-21

### Ajouté

- **Les écrans que le meneur projette prennent l'identité visuelle de leur
  édition.** L'écran spectateur, le plan de lieu et le poste « Jouer » — les
  surfaces que les joueurs regardent, pas seulement le meneur — deviennent
  *iconiques* au lieu d'être seulement lisibles. Sur l'**écran spectateur**,
  chaque combattant s'inscrit dans le coin coupé signature de l'édition (net en
  SR6), sur un fond à fines lignes de balayage teinté du livre, et son moniteur
  est agrandi à l'échelle du vidéoprojecteur — sa **forme** restant celle du
  livre (la jauge continue de SR5/SR6, les paliers de gravité d'Anarchy 2). Le
  **plan de lieu** dessine sa grille tactique et sa salle-objectif à l'encre de
  l'édition (magenta SR6, rouge SR5, or Anarchy 2, bleu Anarchy 1) au lieu d'un
  cyan unique. Et le poste « Jouer » file ses moments *Avant / Pendant / Après*
  d'un discret repère à l'accent du livre. Rien de neuf à régler : c'est la même
  vérité, habillée pour la table.

## [1.85.0] — 2026-07-21

### Ajouté

- **Une contre-mesure d'intrusion se défend et attaque depuis le suivi de
  combat, dans toutes les éditions.** Quand un PJ decker s'en prend à une CI (bloc
  « Réagir »), la glace montre enfin sa **défense** ; sur sa fiche active, son
  **attaque** devient lisible au lieu d'être noyée dans le texte de son pouvoir.
  Le régime de chaque édition est respecté : **Anarchy 2.0** affiche ses **succès
  fixes** en valeurs (défense/attaque = indice, encaissement = Firewall 1) ;
  **Anarchy 1re** motorise le **statblock du livre** de la GLACE (attaque 8,
  défense 11, perception 10, Tueuse +2 en cybercombat, Noire en dégâts physiques)
  en jets cliquables — là où le tracker n'offrait que des boutons « — » inertes ;
  **SR5/SR6** gardent leurs pastilles de dés. Deux corrections de règles au
  passage : l'encaissement d'une CI **SR6** suit la convention indice×2 (et non
  indice + Firewall, absent du livre p.180/188), et la défense d'une CI **SR5**
  passe à indice + Firewall (l'indice de serveur remplace l'attribut mental
  absent, p.238 ; l'encaissement indice + Firewall reste correct, p.229).

## [1.84.0] — 2026-07-21

### Ajouté

- **Le coup d'œil : consulter une fiche sans quitter « Jouer ».** Cliquer sur un
  PNJ, un PJ ou un contact du casting depuis le poste de commandement ouvre sa
  fiche **en surimpression**, par-dessus la scène, au lieu de basculer vers la
  bibliothèque et de perdre sa place. La fiche est complète et **éditable**
  (Éditer / Supprimer écrivent bien dans la collection propriétaire), et deux
  flèches **‹ ›** feuillettent le reste du casting sans jamais refermer — *N*
  allers-retours deviennent une seule ouverture. On ne quitte plus jamais la
  scène pour jeter un œil. Les serveurs, eux, gardent leur révélation habituelle
  vers la bibliothèque.

## [1.83.0] — 2026-07-21

### Ajouté

- **Un technomancien à générer (SR6).** Le générateur propose deux archétypes
  technomanciens nommés, sourcés d'*Anarchistes* : **« Techno-ganger (émergé) »**
  (chez les gangs) et **« Technomancien de sécurité »** (côté sécurité corpo).
  Toute la machinerie persona / sprites / formes complexes / technodrain existait
  déjà, mais n'avait aucune porte d'entrée de génération : il fallait connaître la
  spécialisation « Technomancien » et la cocher à la main. Elle est désormais
  proposée par son métier, comme un decker ou un chaman.

### Corrigé

- **Un technomancien généré ne reçoit plus d'augmentation qui grignote sa
  Résonance (SR6).** Comme un Éveillé perd de la Magie en perdant de l'Essence, un
  technomancien perd de la Résonance : le générateur ne lui attribue donc plus
  automatiquement de réflexes câblés ni de cyberware de saveur (aux professionnalismes
  élevés). Vaut pour tout technomancien, y compris ceux créés via la spécialisation.

## [1.82.0] — 2026-07-20

### Ajouté

- **Une CI comme combattante à part entière.** Le suivi de combat propose un
  bouton **« ＋ CI »** : on choisit une contre-mesure (CI Noire, Tueuse, Furie…)
  et son indice, elle rejoint l'initiative avec son score du livre (indice×2+4D6
  en SR5, TdD×2+3D6 en SR6, ordre narratif en Anarchy), son moniteur cliquable
  et ses jets d'attaque/défense/encaissement/perception — sans monter de serveur.
  Rend natif le détournement quasi universel de la « ligne libre » nommée
  « CI NOIRE » à l'initiative saisie à la main. La ligne libre (minuteur
  « ALARME », renforts…) reste évidemment inchangée.

### Modifié

- **Le combat et l'intrusion partagent une horloge.** Quand un serveur est lié à
  la scène et en alerte, avancer le **« Round suivant »** du combat déploie
  désormais la CI du tour et la fait rejoindre l'initiative — plus besoin
  d'avancer aussi le tour dans le tiroir Matrice (dont le bouton s'efface alors
  pour éviter tout double déploiement). Au passage, l'intrusion parle le même
  vocabulaire que le combat : son compteur et son avance disent **« Round »**
  (et non plus « Tour », qui désigne le passage au combattant suivant).

## [1.81.0] — 2026-07-20

### Ajouté

- **« Rangé dans » sur la fiche.** Chaque fiche affiche désormais les dossiers
  où elle est classée — le miroir organisationnel de « Mentionné dans » (qui,
  lui, recense les mentions narratives). Un clic sur un dossier le sélectionne
  et ouvre la bibliothèque filtrée dessus ; la pastille ❖/◆ signale campagne
  ou run. Aucune donnée neuve : l'appartenance multi-dossiers existait déjà,
  on ne fait qu'en montrer le sens inverse depuis la fiche.

## [1.80.3] — 2026-07-20

### Modifié

- **Préparer son run sans quitter « Jouer ».** Le moment **Avant** du poste de
  commandement gagne, sous le topos, ses verbes de prépa : **✎ Éditer** le topos,
  **⚔ Générer le casting** d'opposition (quand la cible a un profil de sécurité et
  qu'aucun PNJ n'est encore rangé), **🗺 Plan tactique** (gratuit) et **✨ Ambiance**
  (si les images IA sont activées). Rien de neuf sous le capot : ces actions
  existaient déjà au panneau des topos ; elles viennent juste à la rencontre du MJ
  là où il joue. Troisième étape, par convergence, du chantier « la séance comme
  objet primaire ».

## [1.80.2] — 2026-07-20

### Modifié

- **Le poste de « Jouer » se lit par moments de jeu.** Le poste de commandement
  du run en cours nomme désormais ses zones — **Avant** (le topos et le casting
  préparés), **Pendant** (la scène et l'horloge d'intrusion), **Après** (le
  débrief) — d'un sourcil discret. Quand une scène tourne, *Pendant* passe en
  tête (le vivant garde sa perche) ; à l'arrêt, *Avant* ouvre la lecture. Rien
  de neuf n'est ajouté : les zones existaient, elles sont juste nommées et
  ordonnées, et le bouton « ✓ Débrief » rejoint son moment (*Après*). Deuxième
  étape, par convergence, du chantier « la séance comme objet primaire ».

## [1.80.1] — 2026-07-20

### Modifié

- **« Jouer » devient la maison.** À l'ouverture (et au tap sur le logo),
  l'application atterrit désormais sur le poste de séance « Jouer » plutôt que
  sur « Ombres portées » — le centre de gravité se déplace vers *la partie en
  cours*. Un lien ou un marque-page vers un panneau précis reste souverain, et
  « Ombres portées » demeure à un geste (barre de navigation). Première étape,
  par convergence, du chantier « la séance comme objet primaire ».

## [1.80.0] — 2026-07-20

### Ajouté

- **Débrief de séance — la boucle du run se referme.** À la fin d'un run, un
  bouton « ✓ Débrief » sur le poste de commandement de « Jouer » (et une
  proposition « Débriefer » quand vous rangez la rencontre) ouvre un écran de
  clôture : *« qu'est-ce que ce run a laissé ? »*. Vous **ratifiez** la paie
  (pré-remplie depuis le topos), le karma et la réputation qui bouge — la triade
  Crédibilité/Rumeur/Renommée en SR5, la Réputation et la Pression en SR6, rien
  d'imposé pour Anarchy — appliqués d'un coup à **toute l'équipe** (les PJ rangés
  dans le run et sa campagne). Contact grillé, faveur due, corpo fâchée : notés
  dans le **carnet du run**, datés. Tout **dérive du registre de campagne
  existant** — les soldes des fiches bougent, rien n'est stocké en double, et
  chaque écriture reste annulable depuis la fiche. Le run suivant repart d'un
  état, plus d'une page blanche.

## [1.79.2] — 2026-07-20

### Correctif

- **« Quoi de neuf » ne déverse plus un mur de cartes.** Au retour d'une longue
  absence, le panneau montre les **trois versions les plus récentes** en entier
  et replie le reste dans un « ▸ N nouveautés plus anciennes » (disclosure
  fermée par défaut). Le cas courant — une ou deux versions sautées — est
  inchangé. (VIS-6)

## [1.79.1] — 2026-07-20

### Correctif

- **La légende des symboles reste joignable sur mobile.** L'aide « ? » de la
  barre du haut était masquée sur petit écran, emportant avec les raccourcis
  clavier (sans objet au doigt) la **légende sémantique** des sigles de combat
  (⚄, VD/SD/PA…). Les deux sont désormais découplés : sur mobile, le « ? »
  reste accessible et n'affiche que l'intro et la légende ; les raccourcis
  clavier, eux, ne s'affichent qu'au clavier. (VIS-5)

## [1.79.0] — 2026-07-20

### Votre premier run, guidé

- **« Jouer » enseigne la spine plutôt que de constater le vide.** Quand aucun
  run n'existe encore, le poste « Jouer » n'affiche plus « Rien à jouer » mais
  invite à créer sa première séance : un bouton **« ＋ Créer mon premier run »**
  demande un nom, crée le run et le pose aussitôt en contexte — dès lors, tout ce
  que vous rangez ou générez (PNJ, contacts, notes) s'y range. La colonne
  **Campagne › Run › Scène** prend le relais avec son poste de commandement.
- **« Faire un run » focalise et propose le casting.** Promouvoir un topos en run
  le met désormais directement en contexte (plus besoin d'aller le focaliser à la
  main pour que « Jouer » l'affiche). Si le topos porte un profil de sécurité, le
  message de confirmation offre un bouton **« Générer le casting »** qui produit
  les PNJ d'opposition d'un clic — proposé, jamais imposé.

## [1.78.3] — 2026-07-20

### Le pont « Créer → Retrouver »

- **« Rangé dans Ombres portées », avec le lien.** Quand vous sauvegardez un PNJ
  généré, le message nomme désormais sa destination en toutes lettres — la
  bibliothèque « Ombres portées » — et offre un bouton **Voir** qui vous y mène
  directement. Fini le « où est passé ce que je viens de créer ? ».
- **Le bouton « PNJ » se dit atelier.** Dans la navigation, il porte un
  sous-titre discret « générer » : on crée ici, et le résultat va se ranger dans
  « Ombres portées ».

### Corrections — import Foundry SR5

- **Import Foundry : Magie/Résonance ne sont plus doublement pénalisées par
  l'Essence (CT-5).** Le rating spécial était lu déjà réduit (`natural.value`) et
  reposé en base, puis le recalc ShadowHerds retranchait la pénalité une seconde
  fois. On lit désormais le rating naturel (`natural.base`), comme le fait déjà le
  module SR6 ; la réduction d'Essence n'est appliquée qu'une fois.
- **Import Foundry : la biographie n'inonde plus la ligne du nom.** La
  `description` d'une fiche importée (souvent la flavor d'un trait, ex. « Code
  d'honneur ») était placée dans l'archétype, affiché inline sous le nom. Elle est
  désormais rangée dans les notes ; le header ne montre que métatype et éveil.

## [1.78.2] — 2026-07-20

### Revoir les astuces du co-MJ

- **Bouton « Revoir les astuces ».** Paramètres › Général › Assistant (co-MJ) :
  un bouton réinitialise les astuces contextuelles déjà vues — elles
  réapparaîtront à leur prochain moment utile. Chaque astuce n'apparaissant
  qu'une fois, c'est le moyen de la revoir sans tout réinitialiser.

## [1.78.1] — 2026-07-20

### Le co-MJ explique le maintien de sort

- **Astuce ⟳.** La première fois qu'un personnage maintient un sort ou une forme
  complexe (SR5/SR6), le co-MJ l'explique une fois : chaque effet maintenu coûte
  −2 dés à tous ses tests, cumulatif, et le badge « ⟳ ×N · −N » près du moniteur
  en donne le total. Rien en Anarchy (pas de malus de maintien).

## [1.78.0] — 2026-07-20

### Clarté topos↔run + nom du plan de lieu

- **Badge d'état sur la carte de run.** « Topos » tant qu'il n'est pas encore
  promu (`＋ Faire un run`), « Run » une fois rangé dans un dossier — les deux
  états partageaient jusqu'ici le même gabarit sans rien pour les distinguer
  au premier coup d'œil.
- **Le plan de lieu généré porte enfin un nom.** Plan tactique (mapgen) et
  Ambiance (Pollinations) affichent une légende « Plan tactique — {lieu} » /
  « Ambiance — {lieu} » sous l'image en grand, au lieu d'ouvrir une simple
  image anonyme.

## [1.77.1] — 2026-07-20

### Le co-MJ explique le pré-jet d'Edge

- **Astuce en scène.** Quand une scène compte un personnage capable de dépenser
  sa Chance (SR5) ou son Atout (SR6) avant un jet, le co-MJ l'explique une fois :
  un panneau s'ouvre au lancer depuis sa carte pour repousser une limite ou
  ajouter des dés explosifs, et l'astuce rappelle que c'est désactivable dans
  Paramètres › Lanceur de dés. Rien en Anarchy (pas de pré-jet).

## [1.77.0] — 2026-07-20

### Le calcul des réserves de situation, expliqué à la demande

- **Décompte sur les Jets de situation.** Les réserves Sang-froid, Surprise,
  Intentions, Mémoire et Port (fiches SR5 et SR6) reçoivent la même explication
  décomposée que les pastilles de combat : au survol (ou appui long tactile),
  un panneau montre la source de chaque dé — « Sang-froid 8 = Volonté 5 +
  Charisme 3 » — et le décompte apparaît aussi dans le résultat du jet. Aucune
  nouvelle pastille, aucun changement du lancer : on explique l'existant.
- **Correctif.** Sur ces mêmes pastilles, le curseur affichait un « ? » d'aide
  alors qu'un clic lance le jet ; il indique désormais correctement qu'on peut
  lancer.

## [1.76.0] — 2026-07-20

### Un co-MJ qui souffle la bonne fonction au bon moment

- **Astuces contextuelles.** ShadowHerds commence à vous souffler, une seule fois
  et au moment où ça sert, une fonction déjà présente qu'on ne trouve pas toujours
  — sans jamais décider à votre place. Première astuce : au lancement d'une scène,
  une bulle discrète propose d'**ouvrir l'écran joueurs** (le second écran en
  lecture seule à poser côté table). Elle n'apparaît qu'une fois, ne bloque rien,
  et se ferme d'un geste.
- **Réglable.** Paramètres › Général › « Assistant (co-MJ) » coupe toutes les
  astuces d'un coup (elles sont activées par défaut).

## [1.75.0] — 2026-07-19

### Un plan tactique du lieu, construit et jouable

- **« Plan tactique » : un vrai plan de bâtiment, gratuit et instantané.** Sur un
  topos à lieu jouable, un nouveau bouton 🗺 génère un plan *construit* — murs,
  pièces nommées, couloir central, portes à battant, grille tactique (case ≈ 2 m) —
  au lieu d'une image d'ambiance. L'objectif et l'entrée sont repérés, le mobilier
  varie selon le type de pièce (bureaux, salle serveur, laboratoire, quai…). Le plan
  est propre au run et se régénère à l'identique — rien à stocker.
- **Teinté par l'édition.** Le liseré et l'objectif prennent l'accent de l'édition
  active (sang, magenta, bleu, ambre) ; le corps du plan reste sombre et lisible.
- L'ancien « Plan du lieu » (image d'ambiance générée par IA) reste disponible sous
  « ✨ Ambiance » quand les images IA sont activées dans les paramètres.

## [1.74.0] — 2026-07-19

### La recherche et les notes, façon messagerie

- **La recherche `Ctrl/Cmd+K` montre le contexte.** Quand un résultat vient d'une
  note (bloc-notes ou fiche), la palette affiche désormais la ligne où le terme a
  été trouvé, le mot surligné — plus besoin d'ouvrir pour savoir de quoi il s'agit.
- **Cliquer une mention amène droit dessus.** Ouvrir une note depuis la palette
  fait défiler le carnet jusqu'à la ligne trouvée et la met brièvement en
  surbrillance ; cliquer une puce `@` amène la fiche de l'entité à l'écran, en
  haut, avec un flash — au lieu de seulement poser un filtre.
- **Emojis `:raccourci:`.** Dans une note, taper `:feu`, `:sang`, `:nuyen`… propose
  l'emoji correspondant (raccourcis français et anglais), inséré d'un ↵ — comme sur
  Discord, sans aucune connexion externe.
- **Commandes `/` en début de ligne.** `/date` et `/heure` insèrent l'horodatage ;
  `/scène` et `/run` insèrent le nom du contexte de jeu en cours. Le menu ne surgit
  qu'en début de ligne, pour ne jamais gêner la frappe courante.

## [1.73.1] — 2026-07-19

### Correctifs

- **Le bonus « +1 action par narration » (Anarchy 2.0) est maintenant mécanisé.** Le badge du bandeau
  Points d'Anarchy devient un bouton : activé par le MJ pour le tour en cours, il ajoute un vrai
  jeton au budget d'actions du combattant actif, au lieu d'être un simple rappel textuel. Remis à
  zéro au tour suivant comme le reste du budget.

## [1.73.0] — 2026-07-19

### Créer un run et le lancer, sans détour

- **Le « ＋ » de la barre de dossiers crée un dossier déjà typé.** Il demande
  d'abord le type — ◆ Run, ❖ Campagne ou dossier simple — puis le nom, au lieu de
  créer un dossier neutre à typer ensuite via le menu « ⋯ ». Le run apparaît
  aussitôt dans « Jouer ».
- **« Lancer la scène » depuis « Jouer ».** Un run sans scène en cours offre enfin
  un bouton pour démarrer la rencontre — plus besoin de passer par la bibliothèque.
  Les trois états partagent le même geste : Reprendre (scène vivante), Ouvrir
  (rangée) ou Lancer (aucune encore).

### Des topos cohérents, éditables, et leur casting

- **Le générateur de topos monte un vrai conflit.** Il ne tire plus objectif,
  mandant, lieu et complication indépendamment : un mandant vise un rival dont un
  site est le lieu, d'où découlent la sécurité, l'objectif et la difficulté — le
  tout nourri par le décor de Seattle (districts, factions, rivalités corpo). Fini
  le « Ares embauche mais la sécurité est celle d'un rival ».
- **Éditer un topos, ou en écrire un vierge.** Un bouton « ✎ Éditer » sur la carte
  ouvre une modale sur tous les champs ; « Topos vierge » crée une amorce vide à
  remplir à la main.
- **« ⚔ Casting » peuple le run.** Sur un topos promu en run, un geste génère les
  PNJ d'opposition cohérents avec l'amorce (la sécurité de la cible + le rôle
  imposé par la difficulté, calés sur la menace du lieu) et les range dans le
  dossier du run.

### Un plan de lieu, en image

- **« 🗺 Plan du lieu » sur un topos.** Quand les images IA sont activées
  (Réglages), un topos dont le lieu s'y prête peut générer un plan/blueprint de son
  décor via Pollinations ; une vignette le réaffiche en grand. Portraits et plans
  de lieu partagent désormais le même réglage (« Images IA ») et la même file
  d'attente.

## [1.72.0] — 2026-07-19

### Suivi de combat — le cockpit rezoné (Tracker V7)

- **Le suivi de combat est un écran, plus un tiroir.** Il s'ouvre en grand,
  centré, structuré en quatre surfaces détachées : le bandeau de scène, l'effectif,
  la console du combattant actif et le dock Matrice. Fini le panneau plat bridé à
  720 px sur le côté — chaque zone respire et se lit d'un coup d'œil.
- **L'effectif est une file.** Le combattant qui joue est en tête, la suite du tour
  défile dessous en lignes compactes, les hors-combat en bas. Au « Tour suivant »,
  la file glisse : l'actif descend, le suivant remonte — le réordonnancement animé
  EST le retour visuel de l'avancement. Même règle sur téléphone, où la console
  remonte en tête pour voir les actions de l'actif sans dérouler tout l'effectif.
- **« Agir produit / Réagir subit ».** Au tour d'un PNJ, sa console montre ce qu'il
  PRODUIT — Actions, Armes, Sorts · Matrice · Pouvoirs, Compétences — sans grille de
  moniteur (le malus est déjà dans les réserves, la vie dans l'effectif) ; l'état
  maintenu (⟳) et les drogues restent visibles. Au tour d'un PJ, la console passe au
  froid acier et montre ce que les PNJ SUBISSENT : défense, encaissement, et le
  **brickage** de leur matos (le decker attaque leurs appareils à son tour, plus au
  leur). Compétences triées par ordre alphabétique pour le repérage.

## [1.71.0] — 2026-07-19

### Matrice & Magie
- **Les sprites se battent dans le tracker.** Un sprite compilé ajouté au
  suivi de combat tombe désormais « hors de combat » quand son moniteur
  matriciel est plein (badge ☠, jauge de vie, mise hors de combat), au lieu
  de rester invulnérable — comme n'importe quel combattant.
- **Bannir un esprit / décompiler un sprite.** Nouveau geste offensif, en
  miroir de l'invocation et de la compilation : le magicien bannit un esprit
  adverse (« ✦ Bannir ») et le technomancien décompile un sprite adverse
  (« ◈ Décompiler »), depuis leur carte (choisir la cible) ou depuis le
  tracker sur la cible (choisir le lanceur, menu ⋯). Test opposé vérifié au
  livre par édition (SR5 p.259/303, SR6 p.151/194, Anarchy 1) : chaque succès
  net retire un service/une tâche — à zéro l'entité repart au plan / à la
  Résonance — ou inflige des dégâts matriciels (Anarchy 1) ; le Drain
  éventuel est encaissé automatiquement. Les esprits gagnent un état « lié »
  (SR5 : renforce leur résistance au bannissement).
- **Asymétries de règle du duel matriciel.** SR5 : le tracker d'intrusion
  rappelle que les actions de Résonance d'un technomancien sont hors Score de
  Surveillance et sans mark (p.252). SR6 : quand une intrusion converge alors
  que des sprites sont en jeu, le bandeau de convergence nomme les
  technomanciens dont la position physique est révélée (p.195).

## [1.70.0] — 2026-07-19

### Sauvegarde
- **Reprendre un combat en cours sur un autre appareil.** Exporter puis
  importer une sauvegarde emporte désormais la scène de combat/Matrice
  vivante (round, initiative, combattants) et les runs générées — commencer
  un combat sur l'ordinateur et le finir sur le téléphone n'exigeait
  jusqu'ici aucune de ces deux données. En fusion, la scène importée ne
  remplace jamais un combat déjà engagé sur l'appareil qui reçoit
  l'import ; seul « Remplacer tout » le peut, en connaissance de cause.
- **Correctif : la fusion ne perd plus les rencontres rangées et les
  carnets de notes.** Importer une sauvegarde en mode « Fusionner »
  (le bouton non destructif) ignorait silencieusement les rencontres déjà
  rangées par dossier et les carnets de notes du paquet importé — seul
  « Remplacer tout » les restaurait. Corrigé : la fusion les ajoute
  désormais, dossier par dossier, sans jamais écraser ce qui existe déjà
  localement.

## [1.69.0] — 2026-07-18

### Magie, Résonance & Essence (SR5)
- **La perte d'Essence réduit désormais la Magie et la Résonance.** Quand un
  personnage SR5 descend sous 6 d'Essence (implants, greffes), son attribut de
  Magie — ou de Résonance — baisse en conséquence, exactement comme au livre :
  la Magie perd la totalité de la perte d'Essence *arrondie au supérieur*
  (p.280), la Résonance suit son maximum naturel `⌊Essence⌋` (p.252). La baisse
  est réversible (retirer l'implant restaure l'attribut) et ne descend jamais
  l'attribut sous zéro.
- **Alerte quand un PNJ cumule Magie et Résonance.** Un être est normalement
  soit Éveillé, soit Émergé, jamais les deux : l'éditeur signale désormais le
  cas (à l'ouverture d'une fiche concernée et au moment où on le crée) par un
  avertissement — sans jamais bloquer ni corriger d'office, la coexistence
  restant permise pour les cas particuliers.

## [1.68.0] — 2026-07-18

### Technomanciens (Matrice)
- **Le persona incarné d'un technomancien attaque désormais dans la Matrice.**
  Le module Matrice ⚡ d'un technomancien (SR5/SR6) porte, en zone Combat, un
  râtelier d'actions matricielles offensives — miroir de celui du cyberdeck
  d'un decker (Pic de données, Planter un programme, Effacer une mark, Hacker à
  la volée…). Ce sont les **mêmes** actions matricielles que celles d'un decker,
  jouées **par la Résonance** : leurs réserves de dés sont dérivées du persona
  vivant (Attaque, Corruption, Traitement de données, Firewall), pas d'un
  matériel. Un tap lance le jet ; la valeur de dégâts est affichée mais jamais
  appliquée d'office (le meneur arbitre le test opposé). Anarchy 1re/2.0 : sans
  effet (pas de persona chiffré au livre).

## [1.67.1] — 2026-07-18

### Corrigé
- **Réordonner ses fiches depuis le Hub (« Ombres portées »)** fonctionne à
  nouveau : la poignée ⠿ et les flèches ↑/↓ étaient visibles sur les cartes
  d'Ombres, de contacts et de serveurs affichées dans la vue de consultation,
  mais le glisser et le clavier y restaient inertes (le mécanisme était lié à
  une grille de génération absente de cet écran — les Ombres n'ont même pas de
  grille propre). Le glisser-déposer est désormais délégué sur la page entière,
  comme le reste des interactions de carte, et agit dans n'importe quel
  conteneur où la fiche est rendue.

## [1.67.0] — 2026-07-18

### Jouer
- **« Jouer » devient le poste de commandement du run en cours.** Le run que
  vous jouez (celui de votre contexte) est sorti en tête, en grand, et
  rassemble tout ce qu'il faut sous la main pendant la séance :
  - **la scène vivante** — round (et passe), moteur actif (⚔ Combat / ⚡ Matrice)
    et une barre de vie par combattant, sans ouvrir le tracker ; un run rangé
    affiche un résumé de sa rencontre ;
  - **la présence de chaque participant** — un bouton par combattant dit d'un tap
    s'il est en **RV** ou en **astral** (RA par défaut). Le mode proposé suit la
    capacité : seuls les Éveillés (et les esprits, astraux par nature) peuvent
    passer en astral, les autres en RV ;
  - **l'horloge d'intrusion** — quand un serveur est en jeu, son état de pression
    (alerte, tour, CI déployées) se lit d'un coup d'œil ; un tap ouvre le tiroir
    Matrice pour le détail (Surveillance, marks) ;
  - **le topos condensé** — objectif, complication, mandant, lieu, paie — l'essentiel
    « pourquoi on est là / ce qui peut mal tourner » d'un coup d'œil ;
  - **le casting préparé** — les PNJ, contacts et serveurs rangés dans le run :
    un tap pour consulter une fiche, un bouton ⚔ pour **envoyer un PNJ dans la
    scène**, un bouton ⚡ pour **mettre un serveur en jeu** (moteur Matrice) ;
  - **les notes** — un bouton ouvre votre carnet de séance déjà positionné sur
    ce run.

  Vos autres runs restent listés en dessous. La vue projette et délègue : elle
  ne recopie ni ne modifie aucune donnée.

## [1.66.0] — 2026-07-18

### Système
- **Compiler des sprites (technomanciens SR5 et SR6)** : depuis la carte d'un
  technomancien, un bouton « ◈ Sprite » ouvre le rail de compilation (le même
  que l'invocation d'esprit, en vocabulaire technomancien — Compiler, Niveau,
  tâches). On choisit le Niveau et le type ; l'app **roule le test de
  compilation** (Compilation/Technomancie + Résonance contre la résistance du
  sprite) : les succès nets deviennent les **tâches** dues, et le
  **Technodrain** est résisté et encaissé automatiquement (VD au livre —
  2 × succès du sprite en SR5, succès du sprite en SR6 ; physique selon le
  Niveau/les dégâts et la Résonance). Le sprite apparaît en fiche liée sous le
  technomancien : attributs matriciels (Attaque/Corruption/Traitement de
  données/Firewall), moniteur matriciel, pouvoirs. On marque ses tâches
  rendues, on peut l'**inscrire** (permanent) ou le **renvoyer** à la
  Résonance. En Anarchy 1re édition, les sprites se compilent aussi (par
  palier Mineur/Normal/Majeur), sans jet automatisé — fidèle au ton narratif
  de l'édition. (Anarchy 2 n'a pas de technomanciens.)

## [1.65.0] — 2026-07-18

### Système
- **PNJ technomanciens en Anarchy 1re édition** : le générateur propose deux
  nouveaux profils vérifiés au livre (*Anarchistes* p.147) — le **Techno-ganger**
  (Sbire : Hacking 8, Technomancie 9) et le **Technomancien de sécurité**
  (Antagoniste : Hacking 11, Technomancie 11, Pistage matriciel). Chacun est
  généré avec sa forme complexe signature (**Pic de résonance**) et quelques
  formes du livre de base, et prend sa place cohérente dans les milieux Gangs /
  Sécurité corpo.
- **Sections magiques mieux ciblées en Anarchy (1re et 2e édition)** : dans
  l'édition d'un PNJ, les zones **Sorts** et **Formes complexes** ne s'affichent
  plus, éditables, que sur les personnages concernés — les Éveillés (compétence
  de Sorcellerie/Conjuration) pour les sorts, les Émergés (compétence
  Technomancie) pour les formes complexes. Sur un PNJ mundane, la zone est
  montrée verrouillée avec la raison, plutôt qu'ouverte sur du vide. Un PNJ qui
  possède déjà des sorts ou des formes garde toujours sa zone éditable (aucune
  donnée cachée).

## [1.64.0] — 2026-07-18

### Interface
- **Générateur — polish tactile et lisibilité des filtres.** Le bouton
  « Générer » atteint désormais **44px de hauteur sur écran tactile**
  (mesuré à 35,6px auparavant, sous la cible de 44px) — desktop inchangé.
  Les **9 filtres** du formulaire (Nom, Origine, Métatype, Genre,
  Rang/Professionnalisme, Profession, Spécialisation, Rôle, Milieu) sont
  regroupés sous trois repères de lecture — **Identité · Métier ·
  Composition** — communs aux quatre éditions ; aucune variable de
  génération ajoutée, seulement un repère visuel.

## [1.63.0] — 2026-07-18

### Ajouté
- **Glisser une carte dans un dossier** : en mode **Sélectionner**, tirez une
  fiche (PNJ, PJ, contact, serveur…) vers la gauche — ou toute la sélection si
  la fiche tirée en fait partie. Un rail de dossiers apparaît ; survolez-en un
  pour **déplier ses sous-groupes**, lâchez sur le bon pour y ranger. C'est le
  pendant gestuel du bouton « Déplacer vers » de la barre de sélection, qui
  reste le canal découvrable et clavier.
## [1.62.0] — 2026-07-18

### Ajouté
- **Édition des contacts** : chaque fiche de contact a désormais un bouton
  **« Éditer »** (comme les PNJ, PJ, serveurs et véhicules) ouvrant une modale
  qui regroupe l'édition — nom, rôle, trait, description, Influence/Loyauté (ou
  Niveau/RR en Anarchy 2), et surtout le **métatype**, qui n'était jusqu'ici
  modifiable nulle part une fois le contact créé. En **Anarchy 2**, le **Réseau**
  et la **Portée** sont également éditables : le domaine et le coût d'atout se
  recalculent automatiquement (avec un aperçu en direct dans la modale).

### Modifié
- **Liste de métatypes des contacts complète** : la génération et la création
  de contact proposent maintenant la **liste groupée complète de l'édition**
  (les 5 souches **et toutes les métavariantes** : Troll Cyclope, Ork
  Hobgobelin, métaconsciences…), la même que le générateur de PNJ, au lieu des
  5 souches seules.

## [1.61.0] — 2026-07-18

### Interface
- **Journal des jets — trois textures par édition** : le journal montre désormais
  *ce qui a fait compter le jet*, propre à chaque livre, au lieu d'un tag gris
  uniforme.
  - **SR5** : la **Limite** qui plafonne les succès s'affiche en pastille
    « Précision 6→3 » (à la teinte de l'édition), au lieu d'un simple « Limité ».
  - **SR6** (Atout) et **SR5** (« Repousser les limites », Chance) : la ressource
    dépensée avant le jet s'affiche « +2 Atout · 2×6↯ » (ou « +2 Chance… ») — dés
    ajoutés et six explosifs, jusqu'ici invisibles dans le journal. Le terme suit
    l'édition (Chance en SR5, Atout en SR6).
  - **Anarchy** : la **complication** montre sa gravité sur une échelle
    (◆◇◇ mineure → ◆◆◆ désastre), en ambre puis rouge.
  - L'export texte du journal reprend ces textures. Aucune migration de données :
    les jets déjà enregistrés restent lisibles, la texture n'apparaît que sur les
    nouveaux jets.

## [1.60.0] — 2026-07-18

### Ajouté
- **Progression ésotérique — Initiation (magiciens/adeptes) et Submersion
  (technomanciens).** Un PNJ peut désormais être **initié** ou **submergé** :
  un grade motorisé (coût en Karma SR5/SR6, en niveau d'Atout pour Anarchy 1)
  et des acquis choisis dans un catalogue **exhaustif et vérifié au livre**
  (~105 métamagies + ~55 échos, cœurs + suppléments *Grimoire des ombres*,
  *Voies occultes*, *Data Trails*, *Hacker vaillant*, *Anarchistes*). Un badge
  de grade s'affiche sur la carte (module Magie pour l'Initiation, module
  Matrice pour la Submersion) ; l'édition se fait depuis la fiche (« Devenir
  initié/submergé », stepper de grade, catalogue d'ajout groupé par
  magicien/adepte). La magie du sang/toxique et les échos dissonants sont
  accessibles en **régime PNJ uniquement**, jamais pour un PJ. Le générateur
  produit désormais des initiés/submergés complets (grade + acquis, jamais
  un simple nom) — corrige au passage un vieux défaut de SR5 où l'archétype
  « Initié hermétique » ne portait qu'une étiquette sans aucune mécanique.
  Anarchy 2 n'a ni Initiation ni Submersion (absence assumée du livre).

## [1.59.0] — 2026-07-18

### Interface
- **L'interface prend de la profondeur** : les cartes (PNJ, contacts, serveurs, roster…) se détachent désormais du fond — surface élevée, liseré de lumière, et un soulèvement au survol (qui répare au passage une ombre de survol qui n'apparaissait jamais, rognée par la découpe des cartes). Contraste vérifié aux quatre éditions (AA).
- **Peau « Réalité augmentée » (générateur)** : un chrome cyan constant — grille de scan, tag `//AR` — pose une lecture d'overlay AR, indépendante de l'accent d'édition qui, lui, varie par livre (nouveau jeton `--aro`, décalé vers le teal en Anarchy 1re pour rester distinct de l'accent bleu).
- **Écran de choix d'édition réaligné** : les quatre cartes adoptent enfin les couleurs des livres, comme le reste de l'app depuis la 1.49.0.
- **Apparition des PNJ générés** adoucie : un fondu en place, sans l'à-coup façon glitch de l'ancien glissement.

## [1.58.0] — 2026-07-18

### Système
- **Formes complexes (SR6 et Anarchy 1re édition)** : les technomanciens
  disposent désormais de leurs formes complexes dans les deux éditions qui les
  détaillent, complétant celles déjà livrées pour SR5.
  - **SR6** : 39 formes vérifiées au livre (*Livre de base* p.191-193 +
    *Hacker vaillant*), au catalogue complet ; le cœur (15) est tiré à la
    génération, les 24 de *Hacker vaillant* restent au catalogue. Tisser une
    forme roule le test (Électronique + Résonance ; **Piratage** pour Pic de
    Résonance), résiste au Technodrain (Volonté + Logique) et encaisse les
    dégâts sur le bon moniteur — même flux que le lancer de sort. Le Technodrain
    est fixe ou, pour certaines formes de *Hacker vaillant*, égal au nombre de
    succès du tissage (3ᵉ régime de coût).
  - **Anarchy 1re édition** : 18 formes vérifiées au livre (*Anarchy* p.68 +
    *Anarchistes*), au catalogue complet et éditables sur la fiche comme les
    sorts Anarchy. Fidèle au jeu, ce sont des **Atouts narratifs non chiffrés**
    (pas de jet automatisé — Anarchy reste narratif) : chaque forme affiche son
    niveau d'Atout et son effet.
  - Les formes complexes couvrent désormais les **trois éditions concernées**
    (SR5, SR6, Anarchy 1) — Anarchy 2 en est dépourvue au livre.

## [1.57.0] — 2026-07-18

### Ajouté
- **Anarchy 2.0 — Points d'Anarchy de scène motorisés (atouts p.77, drogues
  p.159).** Les augmentations et drogues qui octroient des Points d'Anarchy
  « par scène » (Amplificateur de réaction, Réflexes câblés Ares/Evo,
  Move-by-wire, Jazz, Kamikaze, Cram, Nitro…) sont désormais reconnues. En
  scène, le bandeau d'économie de la fiche active affiche une rangée **Points
  d'Anarchy** par participant : ajustement ±, et un bouton **« ⟳ Crédit de
  scène »** qui crédite d'un coup le total octroyé par les atouts/drogues
  actives — **une seule fois par scène** (idempotent). Le compteur vit dans la
  scène (propre à la rencontre, remis à zéro à la scène suivante), jamais sur
  le PNJ. Un badge **◆** sur l'augmentation, dans la fiche, rappelle qui en
  génère ; **« +1 action par narration »** est signalé quand un atout
  l'accorde (le meneur prend l'action via le budget d'actions existant).

## [1.56.0] — 2026-07-18

### Ajouté
- **Maintien des sorts et des formes complexes — état vivant et malus
  automatique.** Le nombre de succès affiché après un lancer devient un
  **contrôle** : on clique dessus pour marquer le sort (ou la forme complexe)
  **maintenu** (pastille `⟳`), on re-clique pour l'arrêter, et le ✕ (fin du
  dernier jet) met fin au maintien du même geste. Chaque effet maintenu impose
  **−2 dés à tous les tests** du PNJ, **cumulatif** (SR5 p.284/p.253, SR6
  p.136/p.129) : les réserves de la carte, du tracker et des panneaux s'ajustent
  automatiquement, et un badge **« ⟳ ×N · −N »** près du moniteur donne le total
  d'un coup d'œil. Sans effet en Anarchy (pas de règle de maintien chiffré).

## [1.55.0] — 2026-07-18

### Ajouté
- **SR6 — gain d'Atout avant le jet (Score Offensif vs Score Défensif).**
  Lancer une attaque à l'arme d'un PNJ SR6 ouvre le panneau « avant de
  lancer » avec une étape de gain : on compare le **SO de l'arme** — par
  **bande de Portée** pour les armes à distance (Contact → Extrême), **SO +
  Force** en mêlée, **Force + Réaction** à mains nues — au **Score Défensif**
  de la cible (saisi à la main, optionnel). Si l'écart atteint 4, le camp le
  plus haut gagne 1 point d'Atout ; le crédit est appliqué **automatiquement à
  l'attaquant** (la symétrie côté cible est affichée mais pas créditée), avec
  **clamp au plafond de réserve** (7). Le SO n'était pas exploité côté carte
  SR6 (la couche de combat était modelée SR5) ; il est désormais lu depuis le
  catalogue et l'étiquette de facette Précision devient **SO** en SR6.
- **Le panneau « Edge avant le jet » est activé par défaut** (`Panneau`) —
  il ne s'ouvre que quand une dépense d'Edge/Atout est possible ou (SR6)
  quand une attaque permet d'en gagner ; réglable dans **Paramètres ›
  Lanceur de dés** (retour possible à « Désactivé »).

## [1.54.2] — 2026-07-18

### Correctif
- **Fiche véhicule/drone lié : les stats propres de l'engin (Maniabilité,
  Vitesse, Accél, Structure, Blindage, Autopilote, Senseurs) s'affichent en
  grille d'attributs**, avec libellés entiers et valeur mise en avant — le
  même rendu que les attributs d'un PNJ. Elles étaient tronquées à cinq
  lettres dans des pastilles identiques à celles des compétences (« Autop /
  Struc / Mania »…), ce qui les faisait lire comme des jets. Les réserves de
  jet du véhicule (Attaque / Défense / Encaissement) restent des pastilles
  cliquables en dessous.

## [1.54.1] — 2026-07-18

### Correctif
- **Réimporter un PJ Foundry ne le duplique plus en silence.** L'import
  détecte désormais un PJ déjà présent sous le même nom et propose
  d'écraser, ignorer ou dupliquer, au lieu d'empiler une copie à chaque
  réimport (clôt le dédoublonnage PJ homonyme laissé ouvert par l'import
  Foundry 1.54.0).

## [1.54.0] — 2026-07-18

### Import Foundry VTT
- **L'import Foundry VTT gère désormais les fiches SR6 aussi richement que
  les SR5.** SR6 est un système Foundry distinct de SR5 (rien ne se
  transpose) : l'import lit maintenant, sur une vraie fiche SR6, l'historique
  Karma/Nuyens (registre daté), la réputation (piste signée propre à SR6),
  les contacts (rattachés au carnet), les identités (SIN) avec leurs licences
  et styles de vie, et les véhicules/drones liés (identité seule — les stats
  d'un véhicule SR6 vivent sur un acteur séparé absent de l'export).
- **Correctif : les descriptions d'items ne se perdaient plus en SR6.** Sur
  une vraie fiche SR6, la description d'un sort, pouvoir ou trait est rangée
  sous `info.description` — l'import la cherchait au mauvais endroit et
  l'importait vide. Les effets de jeu sont désormais repris.
- **Descriptions HTML aplaties en texte propre (SR5 et SR6)** : les
  descriptions venues de Foundry arrivaient avec leurs balises HTML et leurs
  entités (`&eacute;`…) ; elles sont maintenant décodées en texte lisible.

## [1.53.0] — 2026-07-18

### Jouer
- **Edge avant le jet — surface « pastille » (SR5/SR6)** — 3ᵉ choix du réglage
  Paramètres › Lanceur de dés (« Pastille sur la carte »), à côté de
  « Panneau ». Là où le panneau intercepte automatiquement chaque jet, la
  pastille ajoute un petit contrôle **distinct** « Edge » à côté d'un jet
  lançable (Défense, Encaissement, Drain, armes) seulement quand le
  personnage a une option d'Edge/Atout abordable. Le tap normal reste un
  lancer immédiat ; toucher « Edge » ouvre le même petit choix qu'en mode
  panneau (« Repousser les limites » SR5, « Prendre un risque » /
  « Ajouter son rang d'Atout » SR6) avant de lancer. Vague 3b du chantier
  Edge pré-jet, différée lors de la livraison de la vague 3a
  (`PLANS/PLAN_LANCEUR_PREJET_EDGE.md`).
## [1.52.0] — 2026-07-17

### Jouer
- **Dépenser son Edge AVANT le jet (SR5 et SR6)** — nouveau, optionnel. À
  activer dans Paramètres › Lanceur de dés (« Edge avant le jet »). Une fois
  activé, lancer un jet depuis une carte SR5/SR6 dont le personnage a de l'Edge
  dépensable ouvre un panneau : en SR5, **« Repousser les limites »** (1 point de
  Chance → ajoute l'indice de Chance en dés à Règle des six **et ignore la
  Limite**, *Livre de Règles* p.58) ; en SR6, **« Prendre un risque »** (1 Atout
  → +1 dé) ou **« Ajouter son rang d'Atout »** (4 Atouts → +rang de dés à 6
  explosifs, core p.50-51). Sinon « Lancer sans Edge ». L'app ne modélisait
  jusqu'ici que l'Edge d'après jet (la seconde chance/relance) ; le panneau
  débite l'Edge du bon personnage et neutralise le plafond de Précision quand
  la règle le prévoit. Le tap reste un lancer immédiat dès qu'il n'y a pas
  d'Edge à dépenser, et Anarchy garde sa prise de risque.

### Corrigé
- **Scroll mono-ligne à barre cachée retiré (6 sites)** : un choix caché derrière un
  défilement n'existe pas, et un fil d'Ariane qui se coupe en silence ment sur sa
  seule fonction (nouvelle loi 5 de la grammaire d'interaction). Fil d'Ariane
  (`#topbar-locator`) : au-delà de 3 échelles, les maillons intermédiaires se replient
  derrière un `…` visible et cliquable au lieu de défiler hors champ. Puces
  « personnage » du journal des jets (`.dice-log-filters`) : triées par activité,
  seules les 5 plus actives restent visibles d'emblée, une puce `+N` déplie le reste.
  `.hub-type-chips`, `.encounter-rail` : barre de défilement rendue visible (plus de
  scrollbar masquée).

## [1.51.0] — 2026-07-17

### Système
- **Formes complexes (SR5)** : les technomanciens connaissent et tissent
  désormais des formes complexes (19 formes vérifiées au livre — *Livre de
  Règles* p.254-256 + *Data Trails* p.62), au catalogue complet et motorisées
  au tirage comme les sorts. Tisser une forme roule le test (Logiciels +
  Résonance), résiste au Technodrain et encaisse les dégâts sur le bon
  moniteur — même flux que le lancer de sort, chiffres vérifiés au livre.
  SR6 et Anarchy 1re édition restent au plan (chantier Technomanciens T2,
  suite).

## [1.50.1] — 2026-07-17

### Corrigé
- **Sélecteur de Puissance/Niveau (sorts, invocations)** : au-delà de 8 crans (mage
  Magie ≥ 5), la rangée de puces qui débordait devient un stepper compact
  (`AmplitudeSelector`, seuil décidé sur le nombre de crans, jamais sur la largeur
  d'écran). Corrige au passage un bug latent d'Anarchy 1re édition : le sélecteur de
  puissance d'esprit rendait des boutons vides (chaînes nues au lieu de `{value,
  label}`), la Puissance choisie ne pouvait pas atteindre l'invocation.

## [1.50.0] — 2026-07-17

### Système
- **Anarchy 2e édition : la mini-jauge de moniteur suit la gravité, plus le
  nombre de cases.** La barre de vie (tracker de combat et écran joueur)
  additionnait des paliers hétérogènes (légère / grave / incapacitante) : deux
  blessures légères paraissaient plus alarmantes qu'une blessure grave, alors
  que le livre (p.68) classe par gravité. La jauge suit désormais le **palier le
  plus grave atteint** — une grave alarme plus que deux légères, une
  incapacitante passe au rouge. Sur l'écran joueur, les cases retrouvent leurs
  **paliers segmentés** (2 légères │ 1 grave │ 1 incapacitante) au lieu d'une
  rangée aplatie. Les moniteurs en échelle (Shadowrun 5, 6, Anarchy 1re) ne
  changent pas.
- Dette technique résorbée en même temps : `conditionMonitor.gauge()` renvoie
  désormais un descripteur **par forme** (échelle / seuils) que chaque édition
  remplit et que les affichages dessinent sans le comprendre ; les deux barres
  de vie dupliquées (fiche d'annuaire et tracker) convergent sur un seul rendu.

## [1.49.0] — 2026-07-17

### Système
- **Les 4 identités visuelles sont réalignées sur la couverture de leur livre**
  (relevé PDF, pas d'interprétation) : Shadowrun 5 passe de l'ambre au
  **rouge sang**, Shadowrun 6 du cyan au **magenta**, Anarchy 1re éd. du
  duotone magenta/vert au **duotone bleu/or**. Anarchy 2e éd. passe du rouge
  punk à l'**ambre**, sa vraie couleur de marque (le rouge du livre est celui
  des blessures). Les motifs, la typo et les coupes de coin ne changent pas —
  seule la teinte d'accent bouge, remontée en luminosité là où le livre est
  trop sombre pour un écran (accents mesurés, jamais estimés).
- Dette technique résorbée en même temps : les 4 thèmes ne portent plus de
  couleurs recopiées en dur — tout passe par les tokens `--accent`/
  `--accent2`/`--border` du thème, qui suivent désormais une seule source par
  édition.
- **La case de moniteur de condition passe à 24px au doigt** (20px ne
  franchissait pas le minimum de cible tactile) et sa bordure au repos est
  désormais visible sur la carte (contraste ≥3:1, nouveau token
  `--border-ui`) — le MJ voit la piste, pas seulement les cases déjà cochées.
  Cocher une case ne reconstruit plus toute la carte : la transition joue
  enfin, et franchir un palier de blessure déclenche un discret pulse (+
  vibration sur Android).

## [1.48.0] — 2026-07-17

### Import Foundry VTT
- **L'import Foundry VTT (SR5) devient réellement fidèle aux fiches réelles.**
  La vague 1 avait été validée sur un aller-retour de notre propre export et
  tombait sur de vraies fiches SR5 : identité, métatype, magie spéciale et
  sorts/traits en HTML brut ne se lisaient pas. Corrigé en confrontant le
  code à des exports réels — le système Foundry SR5 range l'identité sous
  des champs préfixés (`character*`) distincts du système SR6.
- **Correctif de règle silencieux (SR5 et SR6)** : l'attribut de résistance
  au Drain d'un mage importé n'était jamais posé (une chamane résistait en
  Volonté + Logique au lieu de Volonté + Charisme). Il se dérive désormais
  de l'item de tradition, avec reconnaissance par motif du nom de tradition
  plutôt qu'égalité stricte (le catalogue Foundry SR5 nomme « Chamanisme »
  ce que notre canon appelle « Chamanique »).
- **Nouvelles données importées** : identités (SIN) avec licences et styles
  de vie, contacts (rattachés au carnet de contacts), véhicules liés,
  historique Karma/Nuyens et solde de réputation de départ, traits
  positifs/négatifs, sous-groupement de l'équipement porté.

## [1.47.0] — 2026-07-17

### Fiche PNJ
- **Les identités (SIN) deviennent une zone à part entière**, promue en haut de
  la carte juste après Incarnation — « qui je prétends être » se lit désormais
  avec « qui je suis », au lieu d'être enterré en bas des Détails et de
  disparaître avec eux. En-tête repliable, résumé qui annonce l'identité jouée
  et le nombre de SIN, pli mémorisé par carte ; ouverte en vue Fiche et
  Incarner, fermée en Combat.
- **Les identités sont entièrement éditables** depuis la section « Identités
  (SIN) » du mode édition : nom, nationalité, niveau, identité jouée (●),
  ajout et suppression — ainsi que les licences (nom + indice) et les styles de
  vie (nom + ville) portés par chaque SIN. Un style de vie peut être rattaché à
  une autre identité ou passé « sans SIN », ce qui permet enfin de réparer à la
  main un lien resté pendant à l'import Foundry. Supprimer une identité ne
  détruit jamais ses styles de vie : ils redeviennent « sans SIN ».
  La zone n'apparaît sur une carte que si le personnage a des identités, mais
  la section d'édition est toujours offerte — c'est là qu'on crée la première.
  Correctif au passage : l'identité jouée était référencée **par son nom**, si
  bien que la renommer aurait fait afficher silencieusement la mauvaise
  identité comme active.

## [1.46.1] — 2026-07-17

### Jouer
- **Modificateur de blessure corrigé** (SR5, SR6, Anarchy 1) : il était calculé
  sur la **somme** des deux moniteurs, alors que les trois livres comptent
  **par moniteur, puis cumulent** (SR5 chap. Dommages : « -1 par tranche de
  trois cases dans l'un des moniteurs […] les modificateurs issus de chacun se
  cumulent » ; SR6 p.43 ; Anarchy 1 p.156). L'app sur-pénalisait dès que les
  deux restes s'additionnaient : un PNJ avec 2 cases physiques et 2
  étourdissantes subissait −1 au lieu de 0. Tous les jets d'un PNJ blessé — armes,
  magie, initiative — sont concernés. Le **Compensateur de dommages** est
  désormais traité comme le livre le décrit (SR5 p.464) : un stock de cases
  réparti entre les deux moniteurs, l'app retenant la répartition la plus
  favorable au porteur. Anarchy 2 n'est pas concerné (moniteur à seuils).

## [1.46.0] — 2026-07-17

### Fiche PNJ
- **Persona incarné du technomancien** (SR5/SR6) : le module Matrice ⚡
  affiche enfin les attributs matriciels d'un technomancien — Attaque,
  Corruption, Traitement de données, Firewall — calculés depuis ses
  attributs mentaux et son indice de Résonance. En SR6, un pool de points
  bonus égal à la Résonance se répartit entre les 4 attributs (bouton de
  reconfiguration, comme pour un cyberdeck). Les dommages matriciels
  encaissés par un persona rejoignent le moniteur étourdissant du
  personnage, comme au livre. Correctif au passage : la génération SR5
  bornait mal l'indice de Résonance, désormais plafonné à l'Essence du
  personnage (p.252).

## [1.45.0] — 2026-07-16

### Bibliothèque
- **Import Foundry VTT (PJ et PNJ)** : le menu ⋯ du hub propose
  « Importer depuis Foundry VTT ». Chargez un ou plusieurs fichiers
  d'acteur exportés de Foundry (SR5, SR6, Anarchy 2) : Shadow Herds
  crée les fiches en peuplant les bons champs — attributs, compétences
  (avec spécialités), armes, armure, équipement, augmentations, sorts,
  pouvoirs, connaissances, atouts. L'édition est détectée
  automatiquement d'après la forme de l'acteur ; un PJ Foundry rejoint
  vos Personnages, un grunt vos Ombres portées. Miroir de l'export
  Foundry existant ; les champs sans équivalent dans le modèle
  Shadow Herds sont signalés en console plutôt que perdus en silence.

## [1.44.2] — 2026-07-16

### Table
- **Explication décomposée des réserves (ⓘ)** : sur Défense, Encaissement
  et Drain, un bouton ⓘ séparé du geste de lancer ouvre un panneau qui
  décompose la valeur, source nommée + chiffre (« Défense 7 = Réaction 3 +
  Intuition 4 »), au lieu du survol figé natif. Le même décompte apparaît
  désormais dans le résultat du jet. En SR5, l'Encaissement montre en plus
  le détail de l'armure pièce par pièce (« Armure 18 = Armure corporelle
  intégrale 15 + Casque 3 ») quand elle est reconstituable depuis
  l'équipement. Popover ancré au clic/survol sur desktop, plein écran
  glissé du bas sur mobile.

## [1.44.0] — 2026-07-15

### Générer
- **Équipement SR6 plus cohérent, et riggers correctement équipés** :
  même refonte qu'en SR5 côté génération — l'arsenal reflète mieux le
  niveau et le rôle du PNJ. Un archétype rigger (même sans le mot
  « Rigger » dans son nom) reçoit désormais ses compétences (Pilotage,
  Ingénierie) et son câblage de contrôle. Les mages et chamanes
  reçoivent un **focus de pouvoir**, absent jusqu'ici : il augmente
  réellement leurs jets de Sorcellerie et de Conjuration.

## [1.43.0] — 2026-07-15

### Table
- **L'édition avancée reflète la carte, zones repliables** : la modale
  d'édition PNJ suit désormais le même ordre que la carte (Identité →
  Attributs → Magie/Matrice → Compétences → Équipement → Suivi → Notes),
  les sections lourdes (Sorts, Pouvoirs, Compétences, Armes,
  Augmentations…) sont repliées par défaut avec un résumé (« 4 sorts »)
  au lieu de dérouler onze sections d'un coup.
- **MAG toujours éditable, magie verrouillée à 0** : l'indice de Magie
  (SR5/SR6) est désormais toujours affiché dans l'édition, y compris à 0
  — vous pouvez faire naître un magicien depuis un mondain. Tant que MAG
  vaut 0, les sections Sorts/Pouvoirs restent visibles mais grisées et
  verrouillées (leur catalogue n'apparaît qu'une fois de la Magie posée).
- **Connaissances éditables (SR5/SR6)** : nouvelle section « Connaissances »
  dans l'édition — ajout à la main d'une connaissance libre (aucune liste
  fermée au livre) avec sa catégorie (Rue, Académique, Professionnelle,
  Hobbies), qui câble automatiquement le bon attribut (Intuition ou
  Logique) pour le calcul de la réserve.

## [1.42.0] — 2026-07-15

### Générer
- **Riggers SR5 correctement équipés** : un archétype dont le rôle est
  rigger (même sans le mot « Rigger » dans son nom, ex. *Go-ganger*)
  reçoit désormais les compétences (Pilotage, Ingénierie drones,
  Hardware, Cybercombat drones) et le matériel de contrôle (câblage,
  console rigger) attendus — jusqu'ici seuls les drones étaient corrects,
  le reste restait silencieusement absent.

## [1.41.0] — 2026-07-15

### Table
- **Navigation « Créer » / « Jouer » + espace Jouer** : la barre latérale se
  lit désormais en deux mondes — **Créer** (vos actifs : Personnages, PNJ,
  Contacts, Serveurs, Topos) et **Jouer** (un nouvel écran listant vos
  campagnes et runs, avec la scène en cours signalée « ● En cours » et un geste
  pour la reprendre, focaliser un run dans la bibliothèque, ou voir son topos).
- **Le générateur de missions devient « Topos »** : il produit des *amorces*
  de mission ; « Faire un run » promeut un topos en run (le mot canon « run »
  reste réservé à la mission jouée). Désambiguïse « générer » vs « jouer ».

## [1.40.0] — 2026-07-15

### Générer
- **Équipement plus cohérent en SR5** : un PNJ généré porte désormais un
  arsenal qui reflète vraiment son niveau et son rôle — un grouille n'hérite
  plus d'un fusil Gauss par hasard, un flic penche vers l'électromatraque,
  un adepte vers la lame. Les mages, chamanes et adeptes reçoivent enfin un
  **focus magique**, absent jusqu'ici : il augmente réellement leurs jets de
  sort, d'invocation ou d'attaque selon son type.

## [1.39.0] — 2026-07-15

### Table
- **La scène en cours ne se perd plus** : une pastille pulsée signale
  désormais « Combat » dans la sidebar **et** dans la barre du bas mobile dès
  qu'une scène tourne — pas seulement le petit bouton de la barre du haut.
  Une scène **Matrice seule** (decker en intrusion, pas encore de CI
  déployée) l'allume aussi, elle qui ne se signalait nulle part avant.

## [1.38.0] — 2026-07-15

### Table
- **Sélecteur de contexte partout** : un même sélecteur permet de sauter d'une
  campagne / run / scène à l'autre en un geste — depuis le fil d'Ariane (en haut
  de l'écran) comme depuis le bloc-notes. Dans le **bloc-notes**, le titre
  devient ce sélecteur : on change de carnet (celui d'un autre run, le carnet
  global…) **sans fermer** le panneau. La scène en cours est signalée, le
  contexte courant coché.

## [1.37.0] — 2026-07-15

### Table
- **Fil d'Ariane « Campagne › Run › Scène »** : un repère de localisation
  apparaît en haut de l'écran dès qu'un dossier est en focus, et affiche la
  hiérarchie campagne › run, plus une pastille **« En cours »** quand une scène
  tourne. Chaque niveau est cliquable pour y revenir ; la pastille rouvre la
  scène vivante. Fini le « j'ai créé un combat / une note, je ne les retrouve
  plus ».

## [1.36.0] — 2026-07-15

### Table
- **Bricking d'appareil plus fiable** : dans le suivi de combat, les mains
  nues n'apparaissent plus comme cible matricielle « brickable » (seules les
  vraies armes/appareils le sont) ; un appareil hors service peut être remis
  en marche d'un geste, sans perdre son indice réglé.

## [1.35.0] — 2026-07-15

### Table
- **Cyberdecks et programmes matriciels à l'édition** : l'édition avancée
  permet désormais d'**ajouter un cyberdeck depuis le catalogue d'équipement**
  (SR5, SR6, Anarchy 1 & 2) — l'ajout renseigne directement les attributs du
  deck (Attaque/Corruption/Traitement/Firewall selon l'édition), plus besoin de
  les saisir à la main. On peut aussi équiper des **programmes matriciels**
  tirés des livres (26 en SR5, 20 en SR6, 8 en Anarchy 1re) via un sélecteur à
  cases : ceux qui relèvent un attribut/limite du deck ou infligent plus de
  dégâts sont **motorisés** (ils augmentent automatiquement les réserves de dés
  et la Valeur de Dégâts des actions Matrice), les autres restent listés pour
  mémoire. Un programme « maison » hors catalogue reste saisissable librement.

## [1.34.0] — 2026-07-15

### Table
- **Édition sans perte : enregistrement automatique + annulation** :
  l'édition avancée (PNJ, contact, PJ, véhicule…) enregistre désormais les
  modifications **automatiquement à la fermeture** — plus besoin de cliquer
  sur « Sauvegarder », et plus de saisie perdue faute de l'avoir fait. Un
  indicateur « ⟳ Enregistrement automatique » le rappelle dans la fenêtre, et
  un bouton **« Annuler les modifications »** rétablit la fiche telle qu'elle
  était à l'ouverture.

## [1.33.0] — 2026-07-15

### Table
- **Toutes les métavariantes à l'édition PNJ (#66)** : le champ Métatype de
  l'édition avancée n'est plus limité aux 5 souches — il propose désormais
  toutes les métavariantes jouables (ex. Troll Cyclope), métaconsciences et
  zoocanthropes de l'édition, dans un picker filtrable groupé par souche
  (SR5, SR6, Anarchy 1re — Anarchy 2.0 reste aux 5 souches, sans
  métavariantes motorisées).

## [1.32.0] — 2026-07-15

### Table
- **Cyberware/bioware rangés en Augmentations (#63)** : un implant ajouté
  depuis le catalogue (SR5/SR6) atterrit désormais dans la section
  **Augmentations** de la fiche et de la vue d'impression — plus en
  « Équipement » générique. Toujours modifiable/retirable depuis l'édition
  avancée.

## [1.31.0] — 2026-07-14

### Table
- **Écran spectateur — on sait qui est qui** : chaque combattant y affiche
  désormais son **portrait** (s'il en a un) et un **badge de type** (PJ / PNJ /
  CI…) à côté de son nom, avant ses moniteurs. Fini l'alignement de cases
  anonymes côté joueurs.

## [1.30.0] — 2026-07-14

### Table
- **Recherche plein-texte** (#61) : la palette de commandes (Ctrl/Cmd+K)
  trouve désormais aussi ce qui est écrit dans le bloc-notes de séance et
  les carnets — plus besoin d'un `#mot-clé` exact. Activer un résultat
  ouvre directement le bon carnet, plus jamais celui du dossier courant.

## [1.29.0] — 2026-07-14

### Organiser
- **La carte contact converge sur la fiche PNJ** : Incarnation devient une
  zone repliable (même vocabulaire, même repli animé que le PNJ), onglets
  ☰ Fiche / ❝ Incarner en haut de carte, et un module **◈ Relation** (Influence/
  Loyauté ou Niveau/RR/Atout selon l'édition, + « Connu de ») remplace les
  anciennes stats figées.
- **Fini la carte imbriquée** : un contact déployé en PNJ affiche directement
  sa fiche complète (Combat, capacités, module Relation) — plus de carte
  dans la carte, plus de double pied de carte.

## [1.28.0] — 2026-07-14

### Table
- **Actions et réactions en combat narratif** (Anarchy) : touchez une ligne
  du tracker pour mettre ce combattant « en focus » — sa fiche et son budget
  d'actions s'affichent aussitôt, comme au tour actif des autres éditions ;
  si c'est un PJ qui agit, la console de réaction des PNJ (défense,
  encaissement) prend sa place. Marquer « joué » passe sur l'anneau ✓ et la
  pastille, séparés du focus. Fini l'écran vide où « rien ne s'affichait ».

## [1.27.0] — 2026-07-14

### Table
- **Résumé de séance** : en tête du Journal des jets, un bandeau repliable
  agrège toute la partie — nombre de jets, taux de réussite, alarmes
  (échecs critiques et bévues) et le personnage le plus « chanceux » (MVP).
  Un coup d'œil pour raconter la séance à la fin, sans rien à saisir.

## [1.26.0] — 2026-07-14

### Table
- **Écran spectateur** (#59) : dans Paramètres, « Ouvrir l'écran spectateur »
  lance un second onglet en lecture seule — ordre d'initiative et moniteurs
  de condition de la rencontre en cours, sans rien d'éditable ni de fiche
  secrète. À poser côté joueurs ; se met à jour en direct pendant le combat.

## [1.25.0] — 2026-07-14

### Table
- **Suivi de campagne repensé** : sur la fiche d'un PJ, chaque ressource
  (nuyens, Karma, réputation, compteurs libres) est maintenant une ligne
  cliquable avec son solde toujours visible — toucher la ligne déplie
  montant + motif + ✓ sur place. Fini la rangée de boutons-glyphes ambiguë.
  Onglet ❖ dédié pour ouvrir directement le Suivi.
- **Anarchy 2 — fiche PJ réorganisée** : mots-clés, comportements et
  répliques rejoignent l'Incarnation ; le budget de création rejoint
  Détails. Un seul solde de nuyens visible (le portefeuille vivant, dans le
  Suivi) au lieu de deux compteurs qui se répondaient mal.
- **Signature visuelle du PJ** (couleur + initiale) désormais visible sur
  toutes les cartes de personnage, pas seulement les fiches allégées.

## [1.24.0] — 2026-07-14

### Jouer
- **Vues de carte** : trois onglets glyphes (☰ Fiche, ❝ Incarner, ⚔ Combat)
  en haut de chaque carte PNJ/PJ changent en un tap ce qui est déplié —
  Incarner ne montre que l'habillage, Combat déplie Combat/Capacités/modules
  et replie le reste. Un pli individuel fait sur une carte garde toujours la
  main sur la vue.

## [1.23.0] — 2026-07-14

### Jouer
- **Module Matrice** : le bloc cyberdeck d'un decker (attributs, réallocation,
  moniteur, programmes, cible) vit désormais dans sa propre section « Matrice »
  ⚡, juste après Combat — sorti de Détails où il était noyé.
- **Module Magie** : tradition, esprit mentor et pouvoirs d'adepte se
  regroupent dans une section « Magie » ✦ après Combat, au lieu d'être
  éparpillés en bas de carte et dans Capacités. La Résistance au Drain reste
  en Combat (un jet actif de combat doit rester à 1 tap).
- Ces sections n'apparaissent que si le PNJ les concerne (un PNJ sans deck ni
  don magique n'a ni l'une ni l'autre).

## [1.22.0] — 2026-07-14

### Jouer
- **Incarnation en haut de carte** : âge, style, attitude, manie et motivation
  se lisent maintenant juste après l'identité, avant le combat — au lieu
  d'être relégués en bas de fiche.
- **Râtelier Attaques unifié** : l'arsenal matriciel d'un decker (pic de
  données…) rejoint les armes et sorts en zone Combat, au lieu de rester
  tapi dans Détails.
- **Inventaire consolidé** : équipement porté et augmentations tiennent
  désormais dans une seule section « Équipement » au lieu de deux blocs
  séparés.
- **« Jets de situation »** (SR5/SR6) : nouveau nom des réserves MJ
  (Sang-froid, Surprise, Intentions, Mémoire…), plus clair que « Réserves
  MJ ».

## [1.21.0] — 2026-07-14

### Jouer
- **Zones repliables sur les cartes** : Combat, Capacités et Incarnation se
  replient désormais comme Détails, chacune avec sa propre mémoire (un pli
  manuel sur une carte reste tel quel). Une zone repliée affiche un résumé
  (ex. « Init 11+3D6 », « 6 compétences ») pour ne rien perdre du coup d'œil.
  Repli animé, jamais de scrollbar imbriquée.

## [1.20.0] — 2026-07-14

### Organiser
- **La rencontre se range et se rouvre** : depuis le menu « ⋯ » d'un dossier
  Run (ou sa carte de prep), « Ouvrir la rencontre » restaure combattants,
  initiative et serveur lié tels qu'ils étaient ; « Fermer » range tout dans
  le dossier. Le journal des jets peut se filtrer sur la rencontre en cours.
  Chaque dossier a aussi son propre carnet de notes (fini le bloc-notes
  unique qui se mélange d'une campagne à l'autre).

## [1.19.0] — 2026-07-14

### Jouer
- **Attributs lançables** : sur une carte, chaque attribut (et Magie/Résonance/
  Atout selon l'édition) se clique désormais pour lancer un test à ce nombre de
  dés — comme les compétences et les réserves MJ. Les limites (SR5) et
  l'Essence restent de simples valeurs de référence, non lançables.
- **Affordance de lancer toujours visible** : le petit dé ⚄ qui signale
  qu'une pastille est cliquable ne dépend plus du survol (absent au tactile) —
  il est désormais visible en permanence sur les attributs, les Jets de
  situation et les pastilles combat sans glyphe dédié (ex. Résistance au
  Drain).

## [1.18.0] — 2026-07-14

### Jouer
- **Écriture directe dans les notes** : dans le bloc-notes de séance et les
  notes de fiche, cliquez n'importe où dans le texte affiché pour écrire —
  plus besoin de viser le crayon ✎.
- **Mise en forme légère** : `**gras**`, `_italique_` et `` `code` `` sont
  désormais rendus dans toutes les notes (bloc-notes, journal, fiches).

## [1.17.0] — 2026-07-14

### Jouer
- **Journal vivant** : dans les notes (bloc-notes, journal, fiches), tapez `@`
  pour mentionner n'importe quel PNJ/PJ/contact/serveur par son nom (lien
  ancré par son identifiant — renommer l'entité met à jour tous ses liens) et
  `#` pour un mot-clé libre retrouvable partout. Chaque fiche affiche désormais
  « Mentionné dans » : ses apparitions dans le reste des notes.

### Système
- **Visite guidée** : neuf étapes présentent l'outil au premier lancement, un
  parcours court « fait faire » mène au premier PNJ généré. Le bouton Aide
  (`?`) la relance à tout moment et ouvre un bandeau « Quoi de neuf » cumulé
  qui résume les capacités ajoutées depuis votre dernière visite.

## [1.16.0] — 2026-07-14

### Personnaliser
- **Couleur PJ libre** : la palette de 6 teintes préréglées d'un personnage
  garde une 7ᵉ pastille pour choisir n'importe quelle couleur (sélecteur
  natif du navigateur).

## [1.15.0] — 2026-07-14

### Organiser
- **Réorganiser à la main** : bouton « ⠿ Réorganiser » sur les personnages,
  contacts et serveurs — glisser une fiche à sa place (souris ou doigt) ou
  la déplacer au clavier (flèches ↑/↓). L'ordre choisi est sauvegardé. La
  réorganisation des PNJ (Ombres portées) n'est pas couverte — reportée,
  le Hub affichant une vue toujours reconstruite et potentiellement filtrée.

## [1.14.0] — 2026-07-14

### Jouer
- **Arsenal matriciel du decker** : le bouton unique « Piratage » devient un
  râtelier d'actions offensives nommées (Pic de données, Force brute/Sonder
  l'accès, Planter un programme, Effacer une mark selon l'édition), chacune
  avec son pool et — pour le pic de données — sa VD (SR5 p.242, SR6 p.184).
  Anarchy 2.0 : verbes narratifs (Cybercombat, Pirater la Matrice). Anarchy
  1re : pas de râtelier (Firewall seul, pas d'attribut Attaque). Loadout curé
  par decker (EditModal), prep hors scène — le MJ garde la main sur chaque jet.

## [1.13.0] — 2026-07-14

### Générer
- **DA du sélecteur « ＋ Catalogue »** : il utilise désormais le même composant que
  « ＋ Ajouter une compétence » (au lieu d'un `<select>` natif détonnant).
- **Catalogue de Sorts** (4 éditions) et **Pouvoirs d'adepte** (SR5/SR6) dans la fiche
  d'édition : plus besoin de taper un sort ou un pouvoir à la main.
- **Catalogue d'Atouts** (Anarchy 1re/2.0) : agrégé depuis tous les archétypes du livre.
  Comme il n'existe pas de liste unique et canonique des Atouts, un même Atout peut
  apparaître en plusieurs variantes proches selon l'archétype d'origine (ex. Essence
  différente) — ce n'est pas un bug, juste l'absence de liste maîtresse dans le livre.

## [1.12.0] — 2026-07-14

### Jouer
- **Bruit matriciel** : réglage ± de scène (SR5 p.232), retranché des jets
  Matrice du decker (Piratage, duel decker↔decker, défense protégée) — la
  distance/l'environnement restent à la main du MJ, pas trackés par l'app.
- Légende du cockpit (Aide « ? ») complétée avec `🔗` (lier à la scène) et
  `🛡️` (protection Firewall d'un allié).

## [1.11.0] — 2026-07-14

### Organiser
- **Campagnes et runs** : un dossier peut désormais être marqué « Campagne »
  ou « Run » (menu « ⋯ » de la barre de dossiers, ou automatiquement via
  « Ranger la run »). Un run affiche un raccourci vers sa prep générée ;
  une campagne, le nombre de runs qu'elle contient. Purement organisationnel
  — un dossier non marqué se comporte exactement comme avant.

## [1.10.0] — 2026-07-14

### Jouer
- **Duel decker↔decker** : en combat, un decker peut viser un autre decker
  présent dans la scène et lancer « ⚔ Piratage » contre lui — les dégâts se
  résolvent sur le moniteur de son propre cyberdeck (déjà affiché sur sa
  carte).
- **Protéger un allié avec son Firewall** : un appareil ciblé (M4) peut être
  désigné comme protégé par un decker présent — badge 🛡️ + jet de
  **Défense** dédié (SR5 p.236, Indice de l'appareil + Firewall du
  protecteur ; Anarchy 2.0 « Protection active », p.216-217, Firewall +
  Logique du protecteur). SR6 n'a pas cette règle au livre — approximée par
  la même formule que SR5.

## [1.9.0] — 2026-07-14

### Table
- **Suivi de campagne sur la fiche d'un PJ** : chaque personnage-joueur peut
  désormais tenir ses **nuyens** et son **Karma** dans le temps — un registre
  daté où chaque gain/dépense porte un motif (« Run Aztechnology +8 000 ¥ »),
  le solde étant recalculé à partir de l'historique. Réglage rapide sur la
  fiche (déplié « Progression ») ou dans l'édition. Entièrement **optionnel** :
  invisible tant qu'on ne s'en sert pas.
- **Réputation par édition** : **SR5** suit les trois scores canon (Crédibilité,
  Rumeur, Renommée), **SR6** la Réputation (négative possible) et la Pression ;
  **Anarchy** n'en a pas et n'affiche donc rien.
- **Compteurs personnalisés** : ajoutez vos propres lignes de suivi (mois de
  style de vie payés, faveurs dues…), avec le même historique daté.

## [1.8.0] — 2026-07-14

### Générer
- **Éditer un PNJ avant de le sauvegarder** : le bouton « Éditer » est
  disponible dès le générateur, sur un PNJ pas encore rangé en bibliothèque —
  plus besoin de sauvegarder d'abord pour corriger un détail.
- **Catalogue d'équipement** : la fiche d'édition propose désormais un
  sélecteur « ＋ Catalogue » (armes, armures, commlinks, cyberware…) au lieu
  de tout taper à la main. **Anarchy 2.0** : les armes ajoutées sont
  structurées (VD et portées calculées), donc jouables immédiatement au tour
  du PNJ.

## [1.7.0] — 2026-07-14

### Jouer
- **Bricker les armes adverses** : en combat, quand une scène Matrice est active
  (serveur lié ou decker présent), les armes d'un combattant deviennent des
  cibles matricielles. **SR5/SR6** : chaque arme a un moniteur matriciel
  (9 cases à l'Indice d'appareil 2 « Moyen », ajustable ±) qui se remplit sous
  les dégâts ; plein → **hors service** (la fonction électronique tombe, le
  mécanique reste — la lame coupe encore). **Anarchy 2.0** : le verbe canon
  (« rendre les Smartguns inopérants », p.210) est motorisé en une bascule
  « hors service » d'un tap dans le tracker narratif, sans moniteur ni chiffre.
  Anarchy 1re n'a pas ce système (rien affiché). L'état est propre à la scène
  (jamais écrit sur la fiche permanente).

## [1.6.0] — 2026-07-14

### Organiser
- **Ajouter un contact depuis un PJ, hors édition** : sur la fiche d'un
  personnage-joueur, la section « Contacts » gagne un bouton « ＋ » qui ouvre une
  liste — « ＋ Créer un contact » en tête, puis les contacts existants du carnet.
  Cliquer un contact le lie immédiatement ; « Créer » ouvre un mini-formulaire où
  seul le nom est requis (métatype, rôle, Influence/Loyauté ou Niveau/RR selon
  l'édition sont facultatifs) et fait vivre le contact dans le carnet, éditable
  ensuite sur sa fiche. Plus besoin de passer par « Éditer ».

## [1.5.0] — 2026-07-14

### Organiser
- **Lier un contact à toute l'équipe active** : les sélecteurs de PJ (menu
  « ＋ Lier un PJ » d'une fiche contact et « 🔗 Lier à un PJ » de la sélection
  multiple) offrent en tête une entrée « ★ L'équipe » qui rattache le ou les
  contacts à chaque membre de l'équipe active d'un seul geste — plus besoin de
  lier PJ par PJ. « L'équipe » vaut tous les PJ quand aucun dossier n'est
  désigné comme équipe.

## [1.4.0] — 2026-07-13

### Jouer
- **Le decker vise un serveur** : depuis la carte d'un PNJ (hub/biblio, en
  combat comme hors combat), le bloc Cyberdeck propose un serveur cible
  (picker) puis « ⚡ Ouvrir la Matrice » (ouvre le tracker d'intrusion de ce
  serveur) et, en SR5/SR6/Anarchy 2.0, « ⚔ Piratage » (jet du pool Attaque du
  deck). En combat, si le serveur ciblé diffère du serveur lié à la scène, un
  bouton « 🔗 Lier à la scène » l'y promeut en un tap.

## [1.3.0] — 2026-07-13

### Jouer
- **Cyberdeck en vie** : le deck a désormais son propre moniteur matriciel
  (rangées de 3 cases, malus en marge) et, en SR5/SR6, une **réallocation ASDF/
  ACTF en un tap** (échange de 2 attributs — action gratuite en SR5, mineure en
  SR6). Masqué en Anarchy 1/2, sans réallocation dans leur modèle ; le
  biofeedback d'Anarchy 2.0 continue d'encaisser sur la Volonté du decker, pas
  sur un moniteur de deck séparé.

## [1.2.0] — 2026-07-13

### Consulter & organiser
- **Cyberdeck structuré** : le cyberdeck d'un decker (SR5/SR6/Anarchy 1/2) n'est
  plus qu'une ligne de texte dans l'équipement — attributs matriciels lisibles et
  éditables sur la carte (ASDF/ACTF en SR5/SR6, Firewall + relance en Anarchy 1,
  Attaque + Firewall + filtre de biofeedback en Anarchy 2.0), programmes en liste.
  Migration automatique et sans perte depuis l'ancienne chaîne libre (le texte
  d'origine reste visible en note de secours).

## [1.1.0] — 2026-07-13

### Jouer
- **Suivi de combat — dégâts nets** : la console de réaction (tour d'un PJ) peut
  désormais appliquer un résultat *net* (déjà résisté) au moniteur d'un PNJ —
  bouton ✸ Dégâts par ligne, cases Physique/Étourdissant (SR5/SR6) ou cran de
  gravité (Anarchy 2), boucle Défense → Encaisser → Dégâts sans quitter l'écran.
- Légende du cockpit (Aide « ? ») complétée avec le glyphe ✸.

## [1.0.0] — 2026-07-13

Première version applicative étiquetée. Socle complet, 100 % local.

### Générer
- PNJ complets à l'unité ou en bande (attributs, compétences, armes, augmentations,
  réserves MJ, fiche d'ambiance), composition cohérente Rôle × Milieu ×
  Professionnalisme.
- Contacts, serveurs & CI (Matrice), ébauches de run.
- Entités liées : drones/véhicules, esprits invoqués (services), créatures et
  esprits libres.

### Créer & organiser
- Assistant de création de personnage-joueur (CharGen) pas à pas.
- Bibliothèque transverse « Ombres portées » : dossiers hiérarchiques, appartenance
  multi-groupes, recherche, moniteurs de blessures cliquables, portraits IA
  optionnels.

### Jouer
- Suivi de combat : initiative groupée, fiche du combattant actif, moniteurs,
  raccourcis clavier, tiroir Matrice contextuel.
- Intrusion Matrice (déploiement de CI, Score de Surveillance, marks / accès /
  DIEU selon l'édition).
- Lanceur de dés, journal des jets (filtres, épingles, regroupement par tour),
  réserve de menace (Anarchy).

### Système
- Quatre éditions à identité visuelle distincte : Shadowrun 5, Shadowrun 6,
  Anarchy 1, Anarchy 2.
- Export Foundry VTT, sauvegarde / import-export (fichier ou URL), synchronisation
  opt-in (Gist / WebDAV).
- Versionnage des schémas (migrations exécutées au démarrage), numéro de build
  unifié.

[Non publié]: https://github.com/tbzt/ShadowHerds/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/tbzt/ShadowHerds/releases/tag/v1.0.0
