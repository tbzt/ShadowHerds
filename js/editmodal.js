'use strict';

/* ============================================================
   EDIT MODAL — édition avancée d'un PNJ sauvegardé
   ============================================================ */
const EditModal = {
  currentId: null,

  open(id) {
    const pnj = Shadows.data.all.find(p => p.id === id);
    if (!pnj) { toast('PNJ introuvable.'); return; }
    this.currentId = id;

    document.querySelector('.modal-title').textContent = `Édition — ${pnj.name}`;
    const body = document.getElementById('modal-form-body');
    body.innerHTML = this._buildForm(pnj);

    document.getElementById('edit-modal').classList.add('open');
  },

  close() {
    document.getElementById('edit-modal').classList.remove('open');
    this.currentId = null;
  },

  save() {
    const pnj = Shadows.data.all.find(p => p.id === this.currentId);
    if (!pnj) { this.close(); return; }

    this._readForm(pnj);

    // Recalcul des dérivés
    const edModule = App.getEditionModule(pnj.edition);
    if (edModule && edModule.recalc) edModule.recalc(pnj);

    Shadows.save();
    Shadows.render();
    this.close();
    toast(`${pnj.name} mis à jour.`);
  },

  /* ---- Construction du formulaire ---- */
  _buildForm(pnj) {
    let html = '';

    // Section : Identité
    html += `<div class="modal-section">
      <div class="modal-section-title">Identité</div>
      <div class="modal-grid wide">
        <div class="form-group full">
          <label>Nom</label>
          <input type="text" id="em-name" value="${CardRenderer._esc(pnj.name)}">
        </div>
        <div class="form-group">
          <label>Métatype</label>
          <select id="em-meta">
            ${['Humain','Elfe','Nain','Ork','Troll'].map(m =>
              `<option${pnj.meta === m ? ' selected' : ''}>${m}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Genre</label>
          <select id="em-gender">
            ${['M','F','NB'].map(g =>
              `<option${pnj.gender === g ? ' selected' : ''}>${g}</option>`).join('')}
          </select>
        </div>`;

    if (pnj.edition === 'anarchy') {
      html += `<div class="form-group">
        <label>Rang</label>
        <select id="em-rang">
          ${['Figurant','Lieutenant','Boss'].map(r =>
            `<option${pnj.rang === r ? ' selected' : ''}>${r}</option>`).join('')}
        </select>
      </div>`;
    } else {
      html += `<div class="form-group">
        <label>Professionnalisme</label>
        <input type="number" id="em-prof" value="${pnj.prof}" min="0" max="6">
      </div>`;
    }

    html += '</div></div>';

    // Section : Attributs
    html += `<div class="modal-section">
      <div class="modal-section-title">Attributs</div>
      <div class="modal-grid">`;

    const attrKeys = ['CON','AGI','REA','FOR','VOL','LOG','INT','CHA'];
    for (const k of attrKeys) {
      html += `<div class="form-group">
        <label>${k}</label>
        <input type="number" id="em-attr-${k}" value="${pnj.attrs[k]}" min="1" max="12">
      </div>`;
    }
    if (pnj.attrs.MAG !== undefined) {
      html += `<div class="form-group">
        <label>MAG</label>
        <input type="number" id="em-attr-MAG" value="${pnj.attrs.MAG}" min="1" max="12">
      </div>`;
    }
    html += '</div></div>';

    // Section Anarchy : Clichés
    if (pnj.edition === 'anarchy') {
      html += `<div class="modal-section">
        <div class="modal-section-title">Clichés</div>`;
      pnj.cliches.forEach((c, i) => {
        html += `<div class="modal-grid wide" style="margin-bottom:0.5rem;">
          <div class="form-group">
            <label>Cliché ${i + 1}</label>
            <input type="text" id="em-cliche-name-${i}" value="${CardRenderer._esc(c.name)}">
          </div>
          <div class="form-group">
            <label>Dés</label>
            <input type="number" id="em-cliche-dice-${i}" value="${c.dice}" min="1" max="20">
          </div>
        </div>`;
      });
      html += '</div>';
    }

    // Section : Équipement
    if (pnj.equip && pnj.equip.length) {
      html += `<div class="modal-section">
        <div class="modal-section-title">Équipement</div>
        <div class="form-group">
          <label>Un élément par ligne</label>
          <textarea id="em-equip" rows="4">${pnj.equip.join('\n')}</textarea>
        </div>
      </div>`;
    }

    // Section SR5 : Compétences (édition simplifiée)
    if ((pnj.edition === 'sr5' || pnj.edition === 'sr6') && pnj.skills) {
      html += `<div class="modal-section">
        <div class="modal-section-title">Compétences</div>
        <div class="modal-grid">`;
      pnj.skills.forEach((s, i) => {
        html += `<div class="form-group">
          <label>${CardRenderer._esc(s.name)}</label>
          <input type="number" id="em-skill-${i}" value="${s.val}" min="1" max="12">
        </div>`;
      });
      html += '</div></div>';
    }

    // Section : Notes
    html += `<div class="modal-section">
      <div class="modal-section-title">Notes</div>
      <div class="form-group">
        <textarea id="em-notes" rows="3" placeholder="Notes libres…">${CardRenderer._esc(pnj.notes || '')}</textarea>
      </div>
    </div>`;

    return html;
  },

  /* ---- Lecture du formulaire → mise à jour du PNJ ---- */
  _readForm(pnj) {
    const val  = id => document.getElementById(id)?.value ?? '';
    const num  = (id, fallback) => parseInt(val(id), 10) || fallback;

    pnj.name   = val('em-name').trim() || pnj.name;
    pnj.meta   = val('em-meta')   || pnj.meta;
    pnj.gender = val('em-gender') || pnj.gender;

    if (pnj.edition === 'anarchy') {
      pnj.rang = val('em-rang') || pnj.rang;
      pnj.cliches.forEach((c, i) => {
        const nameEl = document.getElementById(`em-cliche-name-${i}`);
        const diceEl = document.getElementById(`em-cliche-dice-${i}`);
        if (nameEl) c.name = nameEl.value.trim() || c.name;
        if (diceEl) c.dice = parseInt(diceEl.value, 10) || c.dice;
      });
    } else {
      pnj.prof = num('em-prof', pnj.prof);
    }

    // Attributs
    for (const k of ['CON','AGI','REA','FOR','VOL','LOG','INT','CHA','MAG']) {
      const el = document.getElementById(`em-attr-${k}`);
      if (el && pnj.attrs[k] !== undefined) {
        pnj.attrs[k] = Utils.clamp(parseInt(el.value, 10) || pnj.attrs[k], 1, 12);
      }
    }

    // Équipement
    const equipEl = document.getElementById('em-equip');
    if (equipEl) {
      pnj.equip = equipEl.value.split('\n').map(s => s.trim()).filter(Boolean);
    }

    // Compétences
    if (pnj.skills) {
      pnj.skills.forEach((s, i) => {
        const el = document.getElementById(`em-skill-${i}`);
        if (el) s.val = Utils.clamp(parseInt(el.value, 10) || s.val, 1, 12);
      });
    }

    // Notes
    const notesEl = document.getElementById('em-notes');
    if (notesEl) pnj.notes = notesEl.value;
  },
};
