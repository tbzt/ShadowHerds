"use strict";

/* ============================================================
   SKILL EFFECTS — bonus de POOL d'objet sur un jet de COMPÉTENCE
   nommée (refonte acteur, fusion V5 tranche 2).

   Pendant « compétence » de WeaponEffects (scopé à un jet d'arme) et
   d'ActorEffects (modificateur situationnel affiché, jamais appliqué) :
   ici on collecte les effets d'objet qui ajoutent des dés à la réserve
   d'un test de COMPÉTENCE existant sur la carte (Modulateur vocal →
   Imposture, Synthécarde → groupe Athlétisme…). Contrairement à
   ActorEffects, ces bonus SONT cuits dans le pool cliquable de la puce
   de compétence (`_skillsSection`), avec leur source affichée — vraie
   motorisation N2, même vocabulaire `{value, source}` que les `Mod`.

   Un effet déclare :
     { match, skills, perRating?|value, conditional?, source, page }
   - match       : RegExp sur le libellé de l'item porté (equip/augs).
   - skills      : liste LITTÉRALE de noms de compétences visées. Pour un
                   « groupe » SR5 (qui n'a pas de puce dédiée), on liste
                   ses membres exacts transcrits du livre (Canon, jamais
                   une supposition — comme `perRating`).
   - perRating[] : table LITTÉRALE du livre indexée par l'indice ; sinon
                   `value` fixe.
   - conditional : (pnj) => bool, optionnel (ex. sans-fil requis).
   - source/page : provenance affichée + audit de collecte.

   NEUTRE PAR ÉDITION (interdit n°1) : le scoping se fait par le nom de
   compétence propre à la taxonomie d'une édition (« Imposture » n'existe
   qu'en SR5 ; SR6 = « Escroquerie ») — pas de branche `App.edition`.
   Le CATALOG se peuple item par item (fusion V5) sans toucher ce moteur.
   ============================================================ */
const SkillEffects = {
  CATALOG: [
    // SR5 p.455 : « l'indice du modulateur est ajouté à la réserve de
    // dés pour les tests d'Imposture ». Une seule compétence, sans
    // ambiguïté de groupe.
    {
      match: /modulateur vocal/i,
      skills: ["Imposture"],
      perRating: [null, 1, 2, 3, 4, 5, 6],
      source: "Modulateur vocal",
      page: "SR5 p.455",
    },
    // SR5 p.464 : Synthécarde « ajoute son indice à la réserve de dés des
    // tests du groupe Athlétisme ». SR5 ne stocke pas les noms de groupe :
    // on liste les membres du groupe Athlétisme (Gymnastique, Course,
    // Natation) transcrits du livre.
    {
      match: /synthécarde/i,
      skills: ["Gymnastique", "Course", "Natation"],
      perRating: [null, 1, 2, 3],
      source: "Synthécarde",
      page: "SR5 p.464",
    },
  ],

  /** Contributions de pool portées par les objets du PNJ pour une
      compétence NOMMÉE → [{value, source}]. Neutre par édition. Tolérant
      items chaîne/objet (#63). Liste vide si rien ne s'applique. */
  forSkill(pnj, skillName) {
    if (!pnj || !skillName) return [];
    const name = String(skillName).toLowerCase();
    const items = [...(pnj.equip || []), ...(pnj.augs || [])];
    const out = [];
    for (const e of this.CATALOG) {
      if (!e.skills.some((s) => s.toLowerCase() === name)) continue;
      const carrier = items.find((it) => e.match.test(ItemResolver.itemStr(it)));
      if (!carrier) continue;
      if (e.conditional && !e.conditional(pnj)) continue;
      let value = e.value;
      if (e.perRating) {
        const r = ItemResolver.itemRating(carrier);
        if (r == null) continue; // indice non choisi → inactif
        value = e.perRating[r];
      }
      if (!value) continue;
      out.push({ value, source: e.source });
    }
    return out;
  },
};
