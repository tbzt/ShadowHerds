"use strict";

/* ============================================================
   EMOJIS `:shortcode:` — table locale (aucun réseau) pour
   l'autocomplétion façon Discord dans les notes. Leaf pur : pas de
   dépendance, source unique consommée par Mentions (4e mode `:`).

   Chaque entrée = { char, codes:[…] } ; les codes sont FR + EN pour que
   `:sourire:` comme `:smile:` retombent sur le même emoji. La recherche est
   insensible casse/accents (Utils.searchNorm), bornée à 8 résultats.
   ============================================================ */
import { Utils } from "../../core/utils.js";

const TABLE = [
  { char: "😀", codes: ["grinning", "sourire"] },
  { char: "😄", codes: ["smile", "sourire_content"] },
  { char: "😁", codes: ["grin", "content"] },
  { char: "😂", codes: ["joy", "rire", "mdr", "lol"] },
  { char: "🙂", codes: ["slight_smile", "leger_sourire"] },
  { char: "😉", codes: ["wink", "clin_oeil"] },
  { char: "😊", codes: ["blush", "gene"] },
  { char: "😎", codes: ["sunglasses", "cool", "lunettes"] },
  { char: "😏", codes: ["smirk", "malin"] },
  { char: "😬", codes: ["grimace", "grimacant"] },
  { char: "😅", codes: ["sweat_smile", "transpire"] },
  { char: "🤔", codes: ["thinking", "reflexion", "hmm"] },
  { char: "🙄", codes: ["roll_eyes", "yeux_ciel"] },
  { char: "😐", codes: ["neutral", "neutre"] },
  { char: "😳", codes: ["flushed", "rouge"] },
  { char: "😱", codes: ["scream", "cri", "panique"] },
  { char: "😡", codes: ["rage", "colere", "furieux"] },
  { char: "😤", codes: ["triumph", "vapeur"] },
  { char: "😈", codes: ["smiling_imp", "diable", "demon"] },
  { char: "👿", codes: ["imp", "diablotin"] },
  { char: "💀", codes: ["skull", "mort", "crane"] },
  { char: "☠️", codes: ["skull_crossbones", "danger_mort", "poison"] },
  { char: "👻", codes: ["ghost", "fantome"] },
  { char: "👽", codes: ["alien", "extraterrestre"] },
  { char: "🤖", codes: ["robot", "drone", "ci"] },
  { char: "😢", codes: ["cry", "pleure"] },
  { char: "😭", codes: ["sob", "sanglot"] },
  { char: "😴", codes: ["sleeping", "dodo", "dort"] },
  { char: "🤝", codes: ["handshake", "accord", "deal", "poignee"] },
  { char: "👍", codes: ["thumbsup", "pouce", "ok", "oui"] },
  { char: "👎", codes: ["thumbsdown", "pouce_bas", "non"] },
  { char: "👊", codes: ["fist", "poing"] },
  { char: "✊", codes: ["raised_fist", "poing_leve"] },
  { char: "🖐️", codes: ["hand", "main", "stop"] },
  { char: "👉", codes: ["point_right", "pointe_droite"] },
  { char: "🙏", codes: ["pray", "priere", "merci", "svp"] },
  { char: "💪", codes: ["muscle", "force"] },
  { char: "❤️", codes: ["heart", "coeur", "amour"] },
  { char: "💔", codes: ["broken_heart", "coeur_brise"] },
  { char: "🔥", codes: ["fire", "feu", "flamme", "hot"] },
  { char: "💥", codes: ["boom", "explosion", "impact"] },
  { char: "⚡", codes: ["zap", "eclair", "foudre", "matrice"] },
  { char: "✨", codes: ["sparkles", "etincelles", "magie"] },
  { char: "💫", codes: ["dizzy", "etourdi", "vertige"] },
  { char: "☢️", codes: ["radioactive", "radioactif"] },
  { char: "☣️", codes: ["biohazard", "biorisque"] },
  { char: "💉", codes: ["syringe", "seringue", "injection"] },
  { char: "💊", codes: ["pill", "pilule", "drogue", "medoc"] },
  { char: "🩸", codes: ["blood", "sang"] },
  { char: "🧠", codes: ["brain", "cerveau"] },
  { char: "👁️", codes: ["eye", "oeil", "surveillance"] },
  { char: "🕶️", codes: ["dark_glasses", "lunettes_noires"] },
  { char: "🔫", codes: ["gun", "arme", "flingue", "pistolet"] },
  { char: "🗡️", codes: ["dagger", "dague", "lame"] },
  { char: "⚔️", codes: ["crossed_swords", "epees", "combat"] },
  { char: "🛡️", codes: ["shield", "bouclier", "armure"] },
  { char: "💣", codes: ["bomb", "bombe"] },
  { char: "🧨", codes: ["firecracker", "explosif", "petard"] },
  { char: "💰", codes: ["moneybag", "argent", "nuyen", "fric"] },
  { char: "💵", codes: ["dollar", "billet", "cash"] },
  { char: "💳", codes: ["credit_card", "carte", "credstick"] },
  { char: "💎", codes: ["gem", "diamant", "gemme"] },
  { char: "🔑", codes: ["key", "cle", "acces"] },
  { char: "🔒", codes: ["lock", "verrou", "securise"] },
  { char: "🔓", codes: ["unlock", "deverrouille"] },
  { char: "📡", codes: ["satellite", "antenne", "signal"] },
  { char: "📞", codes: ["phone", "telephone", "appel"] },
  { char: "💻", codes: ["laptop", "ordi", "deck", "cyberdeck"] },
  { char: "🖥️", codes: ["desktop", "serveur", "console"] },
  { char: "📟", codes: ["pager", "commlink", "biper"] },
  { char: "🎯", codes: ["dart", "cible", "objectif"] },
  { char: "🎲", codes: ["die", "de", "des", "jet"] },
  { char: "🏙️", codes: ["cityscape", "ville", "seattle"] },
  { char: "🌃", codes: ["night_city", "ville_nuit"] },
  { char: "🚗", codes: ["car", "voiture", "vehicule"] },
  { char: "🏍️", codes: ["motorcycle", "moto"] },
  { char: "🚁", codes: ["helicopter", "helico"] },
  { char: "⏱️", codes: ["stopwatch", "chrono", "minuteur"] },
  { char: "⚠️", codes: ["warning", "attention", "alerte"] },
  { char: "✅", codes: ["check", "valide", "fait", "ok_vert"] },
  { char: "❌", codes: ["x", "croix", "echec", "faux"] },
  { char: "❓", codes: ["question", "question_mark"] },
  { char: "❗", codes: ["exclamation", "important"] },
  { char: "📌", codes: ["pushpin", "epingle", "punaise"] },
  { char: "📝", codes: ["memo", "note", "ecrire"] },
  { char: "⭐", codes: ["star", "etoile", "fav"] },
];

export const Emoji = {
  /** Emojis dont un shortcode COMMENCE par `prefix` (insensible casse/accents).
      Renvoie `[{ shortcode, char }]` (le shortcode = le premier code qui matche,
      pour l'affichage). Borné à 8. */
  search(prefix) {
    const p = Utils.searchNorm(prefix || "");
    if (!p) return [];
    const out = [];
    for (const e of TABLE) {
      const code = e.codes.find((c) => Utils.searchNorm(c).startsWith(p));
      if (code) out.push({ shortcode: code, char: e.char });
      if (out.length >= 8) break;
    }
    return out;
  },
};

// Pont couche 4 (migration modules ES) — retiré en fin de migration.
window.Emoji = Emoji;
