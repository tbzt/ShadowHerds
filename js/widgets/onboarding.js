"use strict";

/* ============================================================
   ONBOARDING (CH-V6-T1.7) — bulle de première présentation de la barre
   du haut. Non-modale (pas de fond opaque, l'app reste utilisable
   dessous) : signale, ne guide pas de force (garde-fou COMITE_TERRAIN
   D4 — « tutoriel intrusif » écarté). Vue UNE SEULE FOIS, jamais
   répétée : flag global (Storage.setGlobal), partagé entre éditions
   (la barre du haut est commune).
   ============================================================ */
const Onboarding = {
  _KEY: "onboardingSeen",

  _ensure() {
    if (document.getElementById("onboarding-bubble")) return;
    const b = document.createElement("div");
    b.id = "onboarding-bubble";
    b.setAttribute("role", "status");
    b.hidden = true;
    b.innerHTML = `
      <p>Ces icônes : <strong>⚔</strong> combat · <strong>📋</strong> journal des jets ·
        <strong>✎</strong> bloc-notes · <strong>⚖</strong> jet opposé ·
        <strong>🔍</strong> palette (<kbd>Ctrl</kbd>/<kbd>⌘</kbd>+<kbd>K</kbd>, retrouver une fiche) ·
        <strong>?</strong> aide.</p>
      <button class="btn-primary btn-small" id="onboarding-dismiss">Compris</button>`;
    document.body.appendChild(b);

    document.getElementById("onboarding-dismiss").addEventListener("click", () => this.dismiss());
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !b.hidden) this.dismiss();
    });
  },

  /** Affiche la bulle si (et seulement si) elle n'a jamais été vue. Appelé
      après chaque selectEdition — sans effet dès la 2e fois. */
  maybeShow() {
    if (Storage.getGlobal(this._KEY, false)) return;
    this._ensure();
    document.getElementById("onboarding-bubble").hidden = false;
  },

  dismiss() {
    Storage.setGlobal(this._KEY, true);
    const b = document.getElementById("onboarding-bubble");
    if (b) b.hidden = true;
  },
};
