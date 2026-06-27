'use strict';

/* ============================================================
   CONTACTS GENERATOR
   ============================================================ */
const Contacts = {
  professions: [
    'Fixer','Médecin de rue','Receleur','Hacker','Pilote',
    'Avocat','Informateur corpo','Journaliste d\'investigation',
    'Dealer','Trafiquant d\'armes','Mage de rue','Mécanicien',
    'Tailleur d\'identités','Dresseur de bestioles','Prêtre',
    'Contrebandier','Chef de gang','Technicien matriciel',
    'Chimiste de rue','Runner à la retraite',
  ],

  lieux: [
    'Barrens','Zone corpo','Port industriel','Downtown',
    'Sprawl industriel','Tir','Favelas','Zone franche',
    'Quartier elfe','Enclave ork','Barrens souterrains',
    'Centre commercial corpo','Marina privée',
  ],

  traits: [
    'Discret','Bavard','Paranoïaque','Loyal mais cher',
    'A des dettes','Travaille pour plusieurs J',
    'Drogué fonctionnel','Ancien runner','Informateur de la KE',
    'Pratique le troc','Exige du cash','Curieux de tout',
  ],

  generate() {
    return {
      id:         Utils.uid(),
      name:       Utils.genName(),
      profession: Utils.rand(this.professions),
      lieu:       Utils.rand(this.lieux),
      loyaute:    Utils.randInt(1, 6),
      connexion:  Utils.randInt(1, 6),
      trait:      Utils.rand(this.traits),
      notes:      '',
    };
  },

  /** Initialise le panel si pas encore fait */
  initPanel() {
    const zone = document.getElementById('contacts-panel-content');
    if (zone.dataset.init) return;
    zone.dataset.init = '1';

    zone.innerHTML = `
      <div class="gen-actions">
        <button class="btn-primary" onclick="Contacts.addOne()">Générer un contact</button>
        <button class="btn-secondary" onclick="Contacts.clearAll()">Effacer tout</button>
      </div>
      <div class="cards-zone" id="contacts-list"></div>`;
  },

  addOne() {
    const c   = this.generate();
    const el  = ContactRenderer.render(c);
    document.getElementById('contacts-list').prepend(el);
  },

  clearAll() {
    document.getElementById('contacts-list').innerHTML = '';
  },
};

/* ============================================================
   RUN GENERATOR
   ============================================================ */
const RunGen = {
  types: [
    'Extraction','Livraison discrète','Sabotage industriel',
    'Vol de données','Assassinat','Escorte','Récupération d\'objet',
    'Contre-espionnage','Infiltration','Nettoyage','Protection de convoi',
    'Coup de main pour un runner','Récupération d\'otage','Mise en scène',
  ],

  clients: [
    'Johnson anonyme','Grande corpo — Ares Macrotechnology',
    'Grande corpo — Aztechnology','Grande corpo — Saeder-Krupp',
    'Grande corpo — Horizon','Crime organisé — Vory v Zakone',
    'Crime organisé — Yakuza','Crime organisé — Triade',
    'Gouvernement','Runner indépendant','Ombre politique',
    'Éco-terroristes (Halloweeners)','Esprit libre','Mégacorporation inconnue',
  ],

  lieux: [
    'Siège corpo en hauteur','Entrepôt des docks',
    'Laboratoire souterrain','Zone de guerre urbaine',
    'Résidence sécurisée','Serveur matriciel fortifié',
    'Véhicule en mouvement','Zone astrale instable',
    'Base militaire abandonnée','Centre commercial corpo',
    'Port spatial','Bateau cargo','Aquaplex submersible',
  ],

  complications: [
    'Double trahison du Johnson','Présence d\'un rival runner',
    'Cible protégée magiquement','Sécurité renforcée à mi-run',
    'Civil pris en otage','Virus dans les systèmes matriciels',
    'Patrouille surprise Knight Errant','Dégâts collatéraux inévitables',
    'Contact compromis','Minuterie activée','Fuite d\'info sur le team',
    'Cible déjà morte à l\'arrivée','Trahison interne à l\'équipe',
    'Second Johnson en compétition',
  ],

  difficulties: ['Facile','Standard','Difficile','Très difficile','Cauchemar'],

  generate() {
    const diff    = Utils.rand(this.difficulties);
    const payMult = { Facile:0.5, Standard:1, Difficile:1.5, 'Très difficile':2.5, Cauchemar:4 }[diff] || 1;
    const baseK   = (Utils.randInt(8, 30)) * 1000;
    const pay     = Math.round(baseK * payMult / 1000) * 1000;

    return {
      type:        Utils.rand(this.types),
      client:      Utils.rand(this.clients),
      lieu:        Utils.rand(this.lieux),
      complication:Utils.rand(this.complications),
      payment:     `${pay.toLocaleString('fr-FR')}¥ par runner`,
      difficulte:  diff,
    };
  },

  initPanel() {
    const zone = document.getElementById('run-panel-content');
    if (zone.dataset.init) return;
    zone.dataset.init = '1';

    zone.innerHTML = `
      <div class="gen-actions">
        <button class="btn-primary" onclick="RunGen.addOne()">Générer une run</button>
        <button class="btn-secondary" onclick="RunGen.clearAll()">Effacer tout</button>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:1rem;" id="run-list"></div>`;
  },

  addOne() {
    const r  = this.generate();
    const el = RunRenderer.render(r);
    document.getElementById('run-list').prepend(el);
  },

  clearAll() {
    document.getElementById('run-list').innerHTML = '';
  },
};
