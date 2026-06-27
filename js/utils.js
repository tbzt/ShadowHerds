'use strict';

/* ============================================================
   UTILS
   ============================================================ */
const Utils = {
  rand(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  },

  randInt(min, max) {
    return min + Math.floor(Math.random() * (max - min + 1));
  },

  randBool(p = 0.5) {
    return Math.random() < p;
  },

  clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  },

  uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  },

  /** Nom aléatoire générique (prénom + surnom runner) */
  genName() {
    const prenoms = [
      'Aiko','Britta','Carlos','Dasha','Erik','Fatou','Gao','Hemi','Irina',
      'Jomo','Kenji','Lupe','Marco','Nadia','Omar','Petra','Quin','Reza',
      'Sara','Tova','Ulric','Vera','Wren','Xia','Yara','Zed','Aya','Brek',
      'Cass','Dev','Erin','Femi','Gus','Hana','Ivan','Jade','Kira','Leo',
      'Maya','Nick','Oksana','Piet','Rosa','Sven','Tae','Uma','Vito','Yuki'
    ];
    const surnoms = [
      'Lame','Fantôme','Tonnerre','Acier','Ombre','Braise','Spectre','Faucille',
      'Vif','Cobalt','Poing','Dard','Griffe','Gris','Néon','Pire','Serpent',
      'Calme','Hex','Toxique','Zéro','Brume','Forge','Marteau','Circuit','Loup',
      'Tigre','Corbeau','Vipère','Lynx','Câble','Feu','Vent','Rouille','Pixel',
      'Ghost','Chrome','Déclic','Frisson','Sabre'
    ];
    return `${this.rand(prenoms)} "${this.rand(surnoms)}"`;
  },

  /** Métatype aléatoire avec pondération réaliste SR */
  randMeta() {
    const pool = [
      'Humain','Humain','Humain','Humain','Humain',
      'Elfe','Elfe',
      'Ork','Ork',
      'Nain',
      'Troll'
    ];
    return this.rand(pool);
  },

  /** Genre aléatoire */
  randGender() {
    return this.rand(['M','F','F','M','NB']);
  }
};

/* ============================================================
   TOAST
   ============================================================ */
function toast(msg, duration = 2400) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.remove('show'), duration);
}

/* ============================================================
   DICE ROLLER
   ============================================================ */
const Dice = {
  mode: 'normal',

  init() {
    document.getElementById('dice-roll-btn').addEventListener('click', () => this.roll());
    document.getElementById('dice-count').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.roll();
    });
  },

  setMode(mode, btn) {
    this.mode = mode;
    document.querySelectorAll('.dice-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  },

  roll() {
    const input = document.getElementById('dice-count');
    const n = Utils.clamp(parseInt(input.value) || 6, 1, 40);
    input.value = n;

    let totalDice = n;
    let hits = 0;
    let ones = 0;
    const allRolls = [];

    // Premier jet
    for (let i = 0; i < totalDice; i++) {
      const r = Utils.randInt(1, 6);
      allRolls.push(r);
      if (r >= 5) hits++;
      if (r === 1) ones++;
    }

    // Dés explosifs : on relance les succès
    if (this.mode === 'explosive') {
      let toReroll = hits;
      let safetyBreak = 0;
      while (toReroll > 0 && safetyBreak < 6) {
        let newHits = 0;
        for (let i = 0; i < toReroll; i++) {
          if (Utils.randInt(1, 6) >= 5) newHits++;
        }
        hits += newHits;
        toReroll = newHits;
        safetyBreak++;
      }
    }

    const glitch = ones > Math.floor(n / 2);
    const critGlitch = glitch && hits === 0;

    let result = `${hits} succès`;
    if (critGlitch) result += ' — ÉCHEC CRITIQUE';
    else if (glitch) result += ' — Bévue';

    const el = document.getElementById('dice-result');
    el.textContent = result;
    el.style.color = critGlitch
      ? '#c0392b'
      : glitch
        ? 'var(--accent2)'
        : 'var(--accent)';
  }
};
