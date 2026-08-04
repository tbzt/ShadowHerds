"use strict";

/* ============================================================
   VÉHICULES & DRONES — fiches liées déployables depuis
   l'équipement d'un PNJ (carte sœur à côté du propriétaire).

   - SR5/SR6 : catalogue de stats (tables des livres de base).
     Attaque autonome : SR5 Autopilote + autosoft [Précision],
     SR6 autosoft + Senseurs (Riggers p.203-208 SR6 / p.265-272 SR5).
     Moniteur : ⌈Structure/2⌉ + 8 (les deux éditions).
   - Anarchy 2.0 : les libellés d'équipement/atout sont
     auto-descriptifs et parsés tels quels ("Autopilote 6,
     Structure 1, Maniabilité 9, ..."). Autonome : Autopilote
     seul en réserve (p.230). Moniteur : 2 légères / 1 grave /
     1 incapacitante, seuils S+B / 2S+B / 3S+B (p.68 & 230).

   L'entité créée est un objet du même pool que les PNJ
   (Gen.pool / Shadows.data.all) avec type:"vehicle" et ownerId.
   ============================================================ */
import { ItemResolver } from "../rules/itemresolver.js";
import { Utils } from "../core/utils.js";

export const Vehicles = {
  /* ---- Catalogue SR5/SR6 : stats des tables du livre de base ----
     mania/vitesse/accel/structure/blindage/pilote/senseurs.
     SR6 : vitesse = Vitesse max, accel = Accélération.

     ── Deux champs SR6 seulement (lot P0 du chantier ⇉ course-poursuite) ──
     `intervalle` (Intervalle de vitesse) et `maniaHors` (Maniabilité hors
     route) : le livre SR6 donne CINQ caractéristiques de mouvement (Man
     route / Man hors route / Accél / Intervalle / Vitesse max) là où ce
     catalogue n'en portait que trois et demie — la table de la p. 206 les
     imprime toutes. Ils manquaient parce que rien ne les consommait ;
     la course-poursuite les consomme :
       · l'Intervalle de vitesse est l'attribut COMPARÉ en environnement
         dégagé et étroit (le plus haut gagne 1 point d'Atout), et le seuil
         du raccourci « 3× ⇒ avantage automatique sans jet » ;
       · la Maniabilité HORS ROUTE est celle qui compte dès qu'on quitte le
         bitume — l'exemple du livre repose entièrement dessus.
     Hors poursuite, `intervalle` sert aussi au malus de conduite (−1 dé
     par intervalle franchi).

     ⚠ Renseignés pour les **49 véhicules et drones du LIVRE DE BASE**
     seulement. Les entrées venues des autres ouvrages ne les portent pas :
     la cellule ne s'affiche alors pas (le rendu filtre `!= null`) et la
     piste de poursuite écrit « — » avec une saisie à un tap, plutôt que
     de dériver un chiffre que le livre n'a pas donné.
     `maniaHors` est absent quand le livre ne donne qu'une Maniabilité
     (bateaux, sous-marins, aéronefs, une partie des drones) : le lecteur
     retombe alors sur `mania`. */
  CATALOG: {
    sr5: [
      { match: /Optic-X2/i, name: "Lockheed Optic-X2", kind: "drone",
        stats: { mania: 4, vitesse: 4, accel: 3, structure: 2, blindage: 2, pilote: 3, senseurs: 3 } },
      { match: /Crawler/i, name: "Aztechnology Crawler", kind: "drone",
        stats: { mania: 4, vitesse: 3, accel: 1, structure: 3, blindage: 3, pilote: 3, senseurs: 3 } },
      { match: /Doberman/i, name: "GM-Nissan Doberman", kind: "drone",
        stats: { mania: 5, vitesse: 3, accel: 1, structure: 4, blindage: 4, pilote: 3, senseurs: 3 } },
      { match: /Roto-?drone/i, name: "MCT-Nissan Roto-drone", kind: "drone",
        stats: { mania: 4, vitesse: 4, accel: 2, structure: 4, blindage: 4, pilote: 3, senseurs: 3 } },
      { match: /Dalmatian/i, name: "Cyberspace Designs Dalmatian", kind: "drone",
        stats: { mania: 5, vitesse: 5, accel: 3, structure: 5, blindage: 5, pilote: 3, senseurs: 3 } },
      { match: /Steel Lynx/i, name: "Steel Lynx", kind: "drone",
        stats: { mania: 5, vitesse: 4, accel: 2, structure: 6, blindage: 12, pilote: 3, senseurs: 3 } },
      { match: /Americar/i, name: "Ford Americar", kind: "vehicule",
        stats: { mania: 4, vitesse: 3, accel: 2, structure: 11, blindage: 6, pilote: 1, senseurs: 2 } },
      { match: /Westwind/i, name: "Eurocar Westwind 3000", kind: "vehicule",
        stats: { mania: 6, vitesse: 7, accel: 3, structure: 10, blindage: 8, pilote: 3, senseurs: 5 } },
      { match: /Bulldog/i, name: "GMC Bulldog", kind: "vehicule",
        stats: { mania: 3, vitesse: 3, accel: 1, structure: 16, blindage: 12, pilote: 1, senseurs: 2 } },
      { match: /Roadmaster/i, name: "Ares Roadmaster", kind: "vehicule",
        stats: { mania: 3, vitesse: 3, accel: 1, structure: 18, blindage: 18, pilote: 3, senseurs: 3 } },
      { match: /Gopher/i, name: "Toyota Gopher", kind: "vehicule",
        stats: { mania: 5, vitesse: 4, accel: 2, structure: 14, blindage: 10, pilote: 1, senseurs: 2 } },
      { match: /Dodge\ Scoot/i, name: "Dodge Scoot", kind: "vehicule",
        stats: { mania: 4, vitesse: 3, accel: 1, structure: 4, blindage: 4, pilote: 1, senseurs: 1 } },
      { match: /Harley\-Davidson\ Scorpion/i, name: "Harley-Davidson Scorpion", kind: "vehicule",
        stats: { mania: 4, vitesse: 4, accel: 2, structure: 8, blindage: 9, pilote: 1, senseurs: 2 } },
      { match: /Suzuki\ Mirage/i, name: "Suzuki Mirage", kind: "vehicule",
        stats: { mania: 5, vitesse: 6, accel: 3, structure: 5, blindage: 6, pilote: 1, senseurs: 2 } },
      { match: /Yamaha\ Growler/i, name: "Yamaha Growler", kind: "vehicule",
        stats: { mania: 4, vitesse: 3, accel: 1, structure: 5, blindage: 5, pilote: 1, senseurs: 1 } },
      { match: /C\-N\ Jackrabbit/i, name: "C-N Jackrabbit", kind: "vehicule",
        stats: { mania: 4, vitesse: 3, accel: 2, structure: 8, blindage: 4, pilote: 1, senseurs: 2 } },
      { match: /Honda\ Spirit/i, name: "Honda Spirit", kind: "vehicule",
        stats: { mania: 3, vitesse: 4, accel: 2, structure: 8, blindage: 6, pilote: 1, senseurs: 2 } },
      { match: /Hyundai\ Shin\-Hyung/i, name: "Hyundai Shin-Hyung", kind: "vehicule",
        stats: { mania: 5, vitesse: 6, accel: 3, structure: 10, blindage: 6, pilote: 1, senseurs: 2 } },
      { match: /Mitsubishi\ Nightsky/i, name: "Mitsubishi Nightsky", kind: "vehicule",
        stats: { mania: 4, vitesse: 4, accel: 2, structure: 15, blindage: 15, pilote: 3, senseurs: 5 } },
      { match: /SK\-Bentley\ Concordat/i, name: "SK-Bentley Concordat", kind: "vehicule",
        stats: { mania: 5, vitesse: 5, accel: 2, structure: 12, blindage: 12, pilote: 2, senseurs: 4 } },
      { match: /Rover\ Model/i, name: "Rover Model 2072", kind: "vehicule",
        stats: { mania: 5, vitesse: 4, accel: 2, structure: 15, blindage: 12, pilote: 2, senseurs: 4 } },
      { match: /Morgan\ Cutlass/i, name: "Morgan Cutlass", kind: "vehicule",
        stats: { mania: 5, vitesse: 4, accel: 2, structure: 16, blindage: 10, pilote: 3, senseurs: 5 } },
      { match: /Samuvani\ Criscraft/i, name: "Samuvani Criscraft Otter", kind: "vehicule",
        stats: { mania: 4, vitesse: 3, accel: 2, structure: 12, blindage: 6, pilote: 2, senseurs: 2 } },
      { match: /Yongkang\ Gala/i, name: "Yongkang Gala Trinity", kind: "vehicule",
        stats: { mania: 5, vitesse: 6, accel: 3, structure: 10, blindage: 6, pilote: 1, senseurs: 1 } },
      { match: /Proteus\ Lamprey/i, name: "Proteus Lamprey", kind: "vehicule",
        stats: { mania: 3, vitesse: 2, accel: 1, structure: 6, blindage: 6, pilote: 1, senseurs: 3 } },
      { match: /Vulkan\ Electronaut/i, name: "Vulkan Electronaut", kind: "vehicule",
        stats: { mania: 3, vitesse: 3, accel: 1, structure: 12, blindage: 10, pilote: 4, senseurs: 4 } },
      { match: /Artemis\ Nightwing/i, name: "Artemis Nightwing", kind: "vehicule",
        stats: { mania: 6, vitesse: 3, accel: 1, structure: 4, blindage: 0, pilote: 1, senseurs: 1 } },
      { match: /Cessna\ C750/i, name: "Cessna C750", kind: "vehicule",
        stats: { mania: 3, vitesse: 5, accel: 3, structure: 18, blindage: 4, pilote: 2, senseurs: 2 } },
      { match: /Renault\-Fiat\ Fokker/i, name: "Renault-Fiat Fokker Tundra-9", kind: "vehicule",
        stats: { mania: 3, vitesse: 4, accel: 3, structure: 20, blindage: 10, pilote: 3, senseurs: 3 } },
      { match: /Ares\ Dragon/i, name: "Ares Dragon", kind: "vehicule",
        stats: { mania: 4, vitesse: 4, accel: 3, structure: 22, blindage: 8, pilote: 3, senseurs: 3 } },
      { match: /Nissan\ Hound/i, name: "Nissan Hound", kind: "vehicule",
        stats: { mania: 5, vitesse: 4, accel: 3, structure: 16, blindage: 16, pilote: 2, senseurs: 4 } },
      { match: /Northrup\ Wasp/i, name: "Northrup Wasp", kind: "vehicule",
        stats: { mania: 5, vitesse: 5, accel: 3, structure: 10, blindage: 8, pilote: 3, senseurs: 3 } },
      { match: /Ares\ Venture/i, name: "Ares Venture", kind: "vehicule",
        stats: { mania: 5, vitesse: 7, accel: 4, structure: 16, blindage: 14, pilote: 4, senseurs: 4 } },
      { match: /Federated\ Boeing/i, name: "Federated Boeing Commuter", kind: "vehicule",
        stats: { mania: 3, vitesse: 3, accel: 3, structure: 16, blindage: 8, pilote: 3, senseurs: 3 } },
      { match: /GMC\ Banshee/i, name: "GMC Banshee", kind: "vehicule",
        stats: { mania: 6, vitesse: 8, accel: 4, structure: 20, blindage: 18, pilote: 4, senseurs: 6 } },
      { match: /Shiawase\ Kanmushi/i, name: "Shiawase Kanmushi", kind: "drone",
        stats: { mania: 4, vitesse: 2, accel: 1, structure: 0, blindage: 0, pilote: 3, senseurs: 3 } },
      { match: /Sikorsky\-Bell\ Microskimmer/i, name: "Sikorsky-Bell Microskimmer", kind: "drone",
        stats: { mania: 3, vitesse: 3, accel: 1, structure: 0, blindage: 0, pilote: 3, senseurs: 3 } },
      { match: /Horizon\ Flying/i, name: "Horizon Flying Eye", kind: "drone",
        stats: { mania: 4, vitesse: 3, accel: 2, structure: 1, blindage: 0, pilote: 3, senseurs: 3 } },
      { match: /MCT\ Fly\-Spy/i, name: "MCT Fly-Spy", kind: "drone",
        stats: { mania: 4, vitesse: 3, accel: 2, structure: 1, blindage: 0, pilote: 3, senseurs: 3 } },
      { match: /Ares\ Duelist/i, name: "Ares Duelist", kind: "drone",
        stats: { mania: 3, vitesse: 3, accel: 1, structure: 4, blindage: 4, pilote: 3, senseurs: 3 } },
    ],
    sr6: [
      { match: /Optic-X2/i, name: "Lockheed Optic-X2", kind: "drone",
        stats: { mania: 4, vitesse: 140, intervalle: 30, accel: 15, structure: 2, blindage: 4, pilote: 4, senseurs: 4 } },
      { match: /Crawler/i, name: "Aztechnology Crawler", kind: "drone",
        stats: { mania: 3, maniaHors: 4, vitesse: 30, intervalle: 10, accel: 8, structure: 6, blindage: 2, pilote: 2, senseurs: 2 } },
      { match: /Doberman/i, name: "GM-Nissan Doberman", kind: "drone",
        stats: { mania: 3, maniaHors: 5, vitesse: 100, intervalle: 15, accel: 10, structure: 4, blindage: 6, pilote: 2, senseurs: 3 } },
      { match: /Roto-?drone/i, name: "MCT-Nissan Roto-drone", kind: "drone",
        stats: { mania: 3, vitesse: 160, intervalle: 30, accel: 20, structure: 5, blindage: 6, pilote: 3, senseurs: 2 } },
      { match: /Dalmatian/i, name: "Cyberspace Designs Dalmatian", kind: "drone",
        stats: { mania: 3, vitesse: 130, intervalle: 20, accel: 13, structure: 6, blindage: 4, pilote: 3, senseurs: 3 } },
      { match: /Steel Lynx/i, name: "Steel Lynx", kind: "drone",
        stats: { mania: 3, maniaHors: 5, vitesse: 80, intervalle: 15, accel: 15, structure: 12, blindage: 16, pilote: 4, senseurs: 4 } },
      { match: /Americar/i, name: "Ford Americar", kind: "vehicule",
        stats: { mania: 4, maniaHors: 5, vitesse: 160, intervalle: 20, accel: 9, structure: 11, blindage: 4, pilote: 1, senseurs: 2 } },
      { match: /Westwind/i, name: "Eurocar Westwind X80", kind: "vehicule",
        stats: { mania: 2, maniaHors: 6, vitesse: 250, intervalle: 30, accel: 24, structure: 6, blindage: 1, pilote: 4, senseurs: 3 } },
      { match: /Bulldog/i, name: "GMC Bulldog Step-Van", kind: "vehicule",
        stats: { mania: 5, maniaHors: 7, vitesse: 140, intervalle: 10, accel: 10, structure: 16, blindage: 12, pilote: 2, senseurs: 3 } },
      { match: /Roadmaster/i, name: "Ares Roadmaster", kind: "vehicule",
        stats: { mania: 5, maniaHors: 7, vitesse: 120, intervalle: 10, accel: 8, structure: 18, blindage: 16, pilote: 2, senseurs: 2 } },
      { match: /Gopher/i, name: "Toyota Gopher", kind: "vehicule",
        stats: { mania: 4, maniaHors: 4, vitesse: 150, intervalle: 15, accel: 15, structure: 12, blindage: 6, pilote: 1, senseurs: 1 } },
      { match: /Dodge\ Scoot/i, name: "Dodge Scoot", kind: "vehicule",
        stats: { mania: 5, maniaHors: 7, vitesse: 80, intervalle: 10, accel: 4, structure: 2, blindage: 0, pilote: 1, senseurs: 0 } },
      { match: /Harley\-Davidson\ Scorpion/i, name: "Harley-Davidson Scorpion", kind: "vehicule",
        stats: { mania: 3, maniaHors: 5, vitesse: 200, intervalle: 30, accel: 16, structure: 7, blindage: 6, pilote: 1, senseurs: 1 } },
      { match: /Suzuki\ Mirage/i, name: "Suzuki Mirage", kind: "vehicule",
        stats: { mania: 2, maniaHors: 6, vitesse: 260, intervalle: 30, accel: 29, structure: 4, blindage: 2, pilote: 1, senseurs: 1 } },
      { match: /Yamaha\ Growler/i, name: "Yamaha Growler", kind: "vehicule",
        stats: { mania: 3, maniaHors: 3, vitesse: 180, intervalle: 20, accel: 15, structure: 6, blindage: 4, pilote: 1, senseurs: 1 } },
      { match: /Chrysler\-Nissan\ Jackrabbit/i, name: "Chrysler-Nissan Jackrabbit", kind: "vehicule",
        stats: { mania: 3, maniaHors: 5, vitesse: 160, intervalle: 15, accel: 20, structure: 8, blindage: 4, pilote: 2, senseurs: 1 } },
      { match: /Honda\ Spirit/i, name: "Honda Spirit", kind: "vehicule",
        stats: { mania: 4, maniaHors: 5, vitesse: 150, intervalle: 20, accel: 15, structure: 10, blindage: 3, pilote: 1, senseurs: 1 } },
      { match: /Hyundai\ Shin\-Hyung/i, name: "Hyundai Shin-Hyung", kind: "vehicule",
        stats: { mania: 3, maniaHors: 5, vitesse: 200, intervalle: 25, accel: 12, structure: 7, blindage: 1, pilote: 1, senseurs: 1 } },
      { match: /Saeder\-Krupp\-Bentley\ Concordat/i, name: "Saeder-Krupp-Bentley Concordat", kind: "vehicule",
        stats: { mania: 3, maniaHors: 5, vitesse: 180, intervalle: 30, accel: 18, structure: 14, blindage: 8, pilote: 3, senseurs: 3 } },
      { match: /Mitsubishi\ Nightsky/i, name: "Mitsubishi Nightsky", kind: "vehicule",
        stats: { mania: 4, maniaHors: 6, vitesse: 160, intervalle: 10, accel: 10, structure: 18, blindage: 10, pilote: 3, senseurs: 4 } },
      { match: /Range\ Rover/i, name: "Range Rover Model 2080", kind: "vehicule",
        stats: { mania: 4, maniaHors: 5, vitesse: 160, intervalle: 20, accel: 12, structure: 16, blindage: 10, pilote: 4, senseurs: 4 } },
      { match: /Samuvani\ CrisCraft/i, name: "Samuvani CrisCraft Otter", kind: "vehicule",
        stats: { mania: 4, vitesse: 90, intervalle: 15, accel: 10, structure: 6, blindage: 4, pilote: 2, senseurs: 2 } },
      { match: /Aztechnology\ Sunrunner/i, name: "Aztechnology Sunrunner/Nightrunner", kind: "vehicule",
        stats: { mania: 3, vitesse: 120, intervalle: 20, accel: 20, structure: 10, blindage: 8, pilote: 3, senseurs: 3 } },
      { match: /GMC\ Riverine/i, name: "GMC Riverine", kind: "vehicule",
        stats: { mania: 4, vitesse: 100, intervalle: 15, accel: 15, structure: 14, blindage: 12, pilote: 4, senseurs: 4 } },
      { match: /Proteus\ Lamprey/i, name: "Proteus Lamprey/Sea Snake", kind: "vehicule",
        stats: { mania: 3, vitesse: 60, intervalle: 10, accel: 13, structure: 2, blindage: 1, pilote: 2, senseurs: 1 } },
      { match: /YNT\ Delfin/i, name: "YNT Delfin", kind: "vehicule",
        stats: { mania: 5, vitesse: 70, intervalle: 10, accel: 18, structure: 6, blindage: 12, pilote: 3, senseurs: 3 } },
      { match: /Nightwing/i, name: "Artemis Industries Nightwing", kind: "vehicule",
        stats: { mania: 4, vitesse: 150, intervalle: 25, accel: 15, structure: 2, blindage: 0, pilote: 1, senseurs: 1 } },
      { match: /Cessna\ C750/i, name: "Cessna C750", kind: "vehicule",
        stats: { mania: 5, vitesse: 250, intervalle: 25, accel: 20, structure: 8, blindage: 2, pilote: 2, senseurs: 1 } },
      { match: /MCT\-Sikorsky\-Bell\ Seahawk/i, name: "MCT-Sikorsky-Bell Seahawk", kind: "vehicule",
        stats: { mania: 5, vitesse: 500, intervalle: 50, accel: 30, structure: 12, blindage: 4, pilote: 2, senseurs: 2 } },
      { match: /Ares\ Dragon/i, name: "Ares Dragon", kind: "vehicule",
        stats: { mania: 4, vitesse: 260, intervalle: 30, accel: 10, structure: 22, blindage: 10, pilote: 2, senseurs: 3 } },
      { match: /MCT\-Sikorsky\-Bell\ Wolfhound/i, name: "MCT-Sikorsky-Bell Wolfhound", kind: "vehicule",
        stats: { mania: 3, vitesse: 320, intervalle: 40, accel: 20, structure: 12, blindage: 14, pilote: 4, senseurs: 4 } },
      { match: /Northrup\ Wasp/i, name: "Northrup Wasp", kind: "vehicule",
        stats: { mania: 3, vitesse: 330, intervalle: 30, accel: 25, structure: 10, blindage: 8, pilote: 3, senseurs: 3 } },
      { match: /Ares\ Venture/i, name: "Ares Venture", kind: "vehicule",
        stats: { mania: 4, vitesse: 680, intervalle: 60, accel: 40, structure: 16, blindage: 12, pilote: 2, senseurs: 2 } },
      { match: /GMC\ Banshee/i, name: "GMC Banshee", kind: "vehicule",
        stats: { mania: 3, vitesse: 900, intervalle: 90, accel: 60, structure: 18, blindage: 18, pilote: 4, senseurs: 4 } },
      { match: /Federated\ Boeing\ Commuter/i, name: "Federated Boeing Commuter", kind: "vehicule",
        stats: { mania: 3, vitesse: 420, intervalle: 60, accel: 35, structure: 16, blindage: 10, pilote: 2, senseurs: 2 } },
      { match: /Osprey\ X/i, name: "Osprey X", kind: "vehicule",
        stats: { mania: 3, vitesse: 420, intervalle: 80, accel: 35, structure: 16, blindage: 16, pilote: 4, senseurs: 4 } },
      { match: /GMC\ Micromachine/i, name: "GMC Micromachine", kind: "drone",
        stats: { mania: 3, maniaHors: 6, vitesse: 25, intervalle: 5, accel: 5, structure: 0, blindage: 0, pilote: 1, senseurs: 1 } },
      { match: /Shiawase\ Kanmushi/i, name: "Shiawase Kanmushi", kind: "drone",
        stats: { mania: 2, maniaHors: 3, vitesse: 15, intervalle: 5, accel: 4, structure: 0, blindage: 0, pilote: 3, senseurs: 2 } },
      { match: /Sikorsky\-Bell\ Microskimmer/i, name: "Sikorsky-Bell Microskimmer XXS", kind: "drone",
        stats: { mania: 2, vitesse: 35, intervalle: 10, accel: 6, structure: 0, blindage: 0, pilote: 2, senseurs: 1 } },
      { match: /MCT\ Gnat/i, name: "MCT Gnat", kind: "drone",
        stats: { mania: 3, vitesse: 30, intervalle: 10, accel: 4, structure: 0, blindage: 0, pilote: 2, senseurs: 1 } },
      { match: /GM\-Nissan\ Flip\-Flop/i, name: "GM-Nissan Flip-Flop", kind: "drone",
        stats: { mania: 2, maniaHors: 4, vitesse: 50, intervalle: 15, accel: 8, structure: 1, blindage: 0, pilote: 2, senseurs: 1 } },
      { match: /Horizon\ Flying/i, name: "Horizon Flying Eye", kind: "drone",
        stats: { mania: 3, vitesse: 40, intervalle: 15, accel: 15, structure: 1, blindage: 0, pilote: 2, senseurs: 2 } },
      { match: /MCT\ Hornet/i, name: "MCT Hornet", kind: "drone",
        stats: { mania: 3, vitesse: 35, intervalle: 15, accel: 20, structure: 1, blindage: 0, pilote: 2, senseurs: 2 } },
      { match: /Shiawase\ Inu/i, name: "Shiawase Inu", kind: "drone",
        stats: { mania: 2, maniaHors: 3, vitesse: 24, intervalle: 8, accel: 6, structure: 1, blindage: 0, pilote: 2, senseurs: 2 } },
      { match: /Quadrotor/i, name: "Cyberspace Designs Quadrotor", kind: "drone",
        stats: { mania: 2, vitesse: 120, intervalle: 20, accel: 15, structure: 3, blindage: 1, pilote: 3, senseurs: 2 } },
      // Manquait au catalogue : seul drone du livre de base absent, relevé en
      // recomptant les 9 tables p. 304-311 pour le lot P0. Drone de petite
      // taille, et accessoirement le plus rapide d'entre eux.
      { match: /Pursuit\ V/i, name: "Chrysler-Nissan Pursuit V", kind: "drone",
        stats: { mania: 3, maniaHors: 6, vitesse: 280, intervalle: 50, accel: 30, structure: 4, blindage: 2, pilote: 4, senseurs: 3 } },
      { match: /Nissan\ Samurai/i, name: "Nissan Samurai/Oni", kind: "drone",
        // Le livre donne DEUX modèles sur une ligne (Samurai / Oni) : intervalle
        // 10/8, Résistance 6/9, Blindage 6/10. Les stats portées ici sont celles
        // du Samurai, comme avant ce lot — l'Oni reste à saisir à la main.
        stats: { mania: 3, maniaHors: 4, vitesse: 30, intervalle: 10, accel: 10, structure: 6, blindage: 6, pilote: 3, senseurs: 2 } },
      { match: /Federated\ Boeing\ Blackhawk/i, name: "Federated Boeing Blackhawk", kind: "drone",
        stats: { mania: 3, vitesse: 200, intervalle: 40, accel: 35, structure: 8, blindage: 6, pilote: 3, senseurs: 3 } },
      { match: /Ares\ Black/i, name: "Ares Black Sky", kind: "drone",
        stats: { mania: 2, vitesse: 300, intervalle: 50, accel: 25, structure: 8, blindage: 10, pilote: 4, senseurs: 4 } },
      { match: /Ares\ Packmule/i, name: "Ares Packmule", kind: "drone",
        stats: { mania: 3, maniaHors: 4, vitesse: 30, intervalle: 5, accel: 6, structure: 8, blindage: 6, pilote: 2, senseurs: 1 } },
      /* ⚠ Suite du lot F6 — tout le bloc importé qui commence ici ne nommait
         QUE le fabricant : /HONDA/i, /FORD/i, /NISSAN/i, /CORSAIR/i… Comme
         `matchItem` retient le PREMIER motif qui répond, 33 véhicules SR6
         distincts étaient captés par un homonyme de la même marque et ne
         pouvaient jamais être identifiés : « Honda Viking 2080 » sortait en
         « Honda Rough Rider », les cinq Corsair en « Corsair Elysium ». Même
         défaut qu'`/ARES/i` et `/HORIZON/i`, corrigés plus bas au lot F6.

         Règle appliquée : le motif nomme le VÉHICULE — « fabricant + modèle »
         quand la marque tient en un mot, modèle seul quand la raison sociale
         est longue (Cyberspace Designs, Essy Motors, Maersk Shipyards…). Il
         reste tolérant à la saisie : casse libre, trait d'union optionnel.

         Deux modèles gardent leur marque parce que leur seul nom désignait
         déjà de l'ÉQUIPEMENT : Centaur (les cyberjambes « Substitut de
         membres inférieurs - Centaure ») et Gladius (trois armes au
         catalogue) — c'est le piège d'`/ARES/i`, reproduit un cran plus bas.

         Enfin les variantes de carrosserie (« … (Minivan) ») passent AVANT
         leur modèle de base, sinon le motif de base les capterait : le plus
         spécifique d'abord, comme /CAS\/GENERAL/i devant /GENERAL/i.

         ⚠ 11 divergences catalogue/livre relevées à l'image sur *À Tombeau
         Ouvert*, tranchées le 2026-08-04 (le livre fait autorité) : un import
         antérieur avait par endroits rangé l'Intervalle de vitesse dans
         l'Accélération, ou recopié un chiffre voisin. Corrigés ici (`accel`
         sauf mention) : Evo-Echo Stiletto 40→35, Honda Viking 2080 10→15,
         Yamaha Nodachi 30→20, Saab Gladius 998Ti 30→22, Sea Ray Cottonmouth
         30→50, Horizon Freedom 7→2, Mv Poseidon'S Endeavour 12→8 ·
         `blindage` des deux entrées Gmc Grizzly 9→6 · `structure`+`blindage`
         de Bmw-Krupp Demon 5→4. */
      { match: /Stiletto/i, name: "Evo-Echo Motors Stiletto", kind: "vehicule",
        stats: { mania: 2, intervalle: 40, maniaHors: 5, vitesse: 250, accel: 35, structure: 3, blindage: 3, pilote: 2, senseurs: 2 } },
      { match: /HARLEY\-?DAVIDSON\ CENTAUR/i, name: "Harley-Davidson Centaur (Combat)", kind: "vehicule",
        stats: { mania: 3, intervalle: 30, maniaHors: 3, vitesse: 220, accel: 20, structure: 8, blindage: 7, pilote: 2, senseurs: 2 } },
      { match: /HONDA\ ROUGH\ RIDER.*MOTOQUAD/i, name: "Honda Rough Rider (Motoquad)", kind: "vehicule",
        stats: { mania: 4, intervalle: 20, maniaHors: 3, vitesse: 160, accel: 15, structure: 5, blindage: 4, pilote: 2, senseurs: 1 } },
      { match: /HONDA\ ROUGH\ RIDER/i, name: "Honda Rough Rider", kind: "vehicule",
        stats: { mania: 4, intervalle: 20, maniaHors: 3, vitesse: 160, accel: 15, structure: 5, blindage: 4, pilote: 2, senseurs: 1 } },
      { match: /HONDA\ VIKING/i, name: "Honda Viking 2080", kind: "vehicule",
        stats: { mania: 3, intervalle: 30, maniaHors: 4, vitesse: 210, accel: 15, structure: 7, blindage: 6, pilote: 2, senseurs: 1 } },
      { match: /NISSAN\ CONSTELLATION/i, name: "Nissan Constellation", kind: "vehicule",
        stats: { mania: 2, intervalle: 15, maniaHors: 2, vitesse: 90, accel: 10, structure: 3, blindage: 2, pilote: 2, senseurs: 2 } },
      { match: /SUZUKI\ TRANSIT.*COURSE/i, name: "Suzuki Transit (Course)", kind: "vehicule",
        stats: { mania: 2, intervalle: 30, maniaHors: 5, vitesse: 250, accel: 25, structure: 4, blindage: 1, pilote: 2, senseurs: 1 } },
      { match: /SUZUKI\ TRANSIT/i, name: "Suzuki Transit", kind: "vehicule",
        stats: { mania: 2, intervalle: 30, maniaHors: 5, vitesse: 250, accel: 25, structure: 4, blindage: 1, pilote: 2, senseurs: 1 } },
      { match: /YAMAHA\ KABURAYA.*COURSE/i, name: "Yamaha Kaburaya (Course)", kind: "vehicule",
        stats: { mania: 2, intervalle: 30, maniaHors: 4, vitesse: 280, accel: 32, structure: 3, blindage: 2, pilote: 2, senseurs: 2 } },
      { match: /YAMAHA\ KABURAYA/i, name: "Yamaha Kaburaya", kind: "vehicule",
        stats: { mania: 2, intervalle: 30, maniaHors: 4, vitesse: 280, accel: 32, structure: 3, blindage: 2, pilote: 2, senseurs: 2 } },
      { match: /YAMAHA\ NODACHI/i, name: "Yamaha Nodachi", kind: "vehicule",
        stats: { mania: 3, intervalle: 30, maniaHors: 3, vitesse: 210, accel: 20, structure: 9, blindage: 6, pilote: 2, senseurs: 1 } },
      { match: /BMW\ TSARINA/i, name: "Bmw Tsarina Ii (Coupé)", kind: "vehicule",
        stats: { mania: 3, intervalle: 25, maniaHors: 5, vitesse: 220, accel: 18, structure: 12, blindage: 4, pilote: 2, senseurs: 3 } },
      { match: /DODGE\ RAMPART\ LEV/i, name: "Dodge Rampart Lev", kind: "vehicule",
        stats: { mania: 3, vitesse: 100, accel: 22, structure: 14, blindage: 8, pilote: 2, senseurs: 3 } },
      { match: /DODGE\ RAMPART/i, name: "Dodge Rampart", kind: "vehicule",
        stats: { mania: 3, intervalle: 20, maniaHors: 4, vitesse: 180, accel: 20, structure: 12, blindage: 4, pilote: 2, senseurs: 2 } },
      { match: /EUROCAR\ NORTHSTAR/i, name: "Eurocar Northstar 2.0", kind: "vehicule",
        stats: { mania: 3, vitesse: 180, accel: 20, structure: 16, blindage: 10, pilote: 2, senseurs: 3 } },
      { match: /FORD\ DASHER\ INTERCEPTOR/i, name: "Ford Dasher Interceptor", kind: "vehicule",
        stats: { mania: 2, intervalle: 28, maniaHors: 3, vitesse: 240, accel: 24, structure: 12, blindage: 8, pilote: 2, senseurs: 3 } },
      { match: /FORD\ DASHER/i, name: "Ford Dasher (Sport)", kind: "vehicule",
        stats: { mania: 3, intervalle: 22, maniaHors: 4, vitesse: 210, accel: 20, structure: 10, blindage: 6, pilote: 2, senseurs: 2 } },
      { match: /MITSUBISHI\ RUNABOUT/i, name: "Mitsubishi Runabout (Coupé)", kind: "vehicule",
        stats: { mania: 3, intervalle: 15, maniaHors: 6, vitesse: 150, accel: 25, structure: 8, blindage: 2, pilote: 2, senseurs: 2 } },
      { match: /SAAB\ JAVELIN/i, name: "Saab Javelin 878Ti (Sport)", kind: "vehicule",
        stats: { mania: 1, intervalle: 34, maniaHors: 5, vitesse: 240, accel: 26, structure: 6, blindage: 4, pilote: 2, senseurs: 4 } },
      { match: /SAAB\ GLADIUS/i, name: "Saab Gladius 998Ti (Sport)", kind: "vehicule",
        stats: { mania: 2, intervalle: 30, maniaHors: 6, vitesse: 260, accel: 22, structure: 6, blindage: 4, pilote: 2, senseurs: 4 } },
      { match: /TOYOTA\ DAYTRIPPER/i, name: "Toyota Daytripper", kind: "vehicule",
        stats: { mania: 4, vitesse: 180, accel: 10, structure: 12, blindage: 6, pilote: 2, senseurs: 2 } },
      { match: /TOYOTA\ ULTRA\-?ELITE/i, name: "Toyota Ultra-Elite (Limousine)", kind: "vehicule",
        stats: { mania: 3, intervalle: 20, maniaHors: 5, vitesse: 180, accel: 15, structure: 16, blindage: 12, pilote: 2, senseurs: 4 } },
      { match: /GAZ\-?NIKI\ P\-?183.*CAMIONNETTE/i, name: "Gaz-Niki P-183 (Camionnette)", kind: "vehicule",
        stats: { mania: 3, intervalle: 20, maniaHors: 4, vitesse: 160, accel: 16, structure: 14, blindage: 4, pilote: 2, senseurs: 1 } },
      { match: /GAZ\-?NIKI\ P\-?183/i, name: "Gaz-Niki P-183", kind: "vehicule",
        stats: { mania: 3, intervalle: 20, maniaHors: 4, vitesse: 160, accel: 16, structure: 14, blindage: 4, pilote: 2, senseurs: 1 } },
      { match: /GMC\ GRIZZLY.*CAMIONNETTE/i, name: "Gmc Grizzly (Camionnette Lourd)", kind: "vehicule",
        stats: { mania: 3, intervalle: 20, maniaHors: 3, vitesse: 170, accel: 15, structure: 16, blindage: 6, pilote: 2, senseurs: 1 } },
      { match: /GMC\ GRIZZLY/i, name: "Gmc Grizzly", kind: "vehicule",
        stats: { mania: 3, intervalle: 20, maniaHors: 3, vitesse: 170, accel: 15, structure: 16, blindage: 6, pilote: 2, senseurs: 1 } },
      { match: /JEEP\ TRAILBLAZER/i, name: "Jeep Trailblazer", kind: "vehicule",
        stats: { mania: 3, intervalle: 20, maniaHors: 2, vitesse: 180, accel: 18, structure: 14, blindage: 6, pilote: 2, senseurs: 3 } },
      { match: /TATA\ HOTSPUR/i, name: "Tata Hotspur", kind: "vehicule",
        stats: { mania: 2, intervalle: 35, maniaHors: 2, vitesse: 240, accel: 32, structure: 12, blindage: 4, pilote: 2, senseurs: 2 } },
      { match: /FORD\ BISON.*FOURGON/i, name: "Ford Bison Iii (Grand Fourgon)", kind: "vehicule",
        stats: { mania: 5, intervalle: 25, maniaHors: 5, vitesse: 140, accel: 15, structure: 18, blindage: 14, pilote: 2, senseurs: 3 } },
      { match: /FORD\ BISON/i, name: "Ford Bison Iii", kind: "vehicule",
        stats: { mania: 5, intervalle: 25, maniaHors: 5, vitesse: 140, accel: 15, structure: 18, blindage: 14, pilote: 2, senseurs: 3 } },
      { match: /FORD\ LIFELINE/i, name: "Ford Lifeline", kind: "vehicule",
        stats: { mania: 4, intervalle: 10, maniaHors: 5, vitesse: 110, accel: 8, structure: 22, blindage: 18, pilote: 2, senseurs: 4 } },
      { match: /GMC\ FORCE/i, name: "Gmc Force", kind: "vehicule",
        stats: { mania: 5, intervalle: 8, maniaHors: 7, vitesse: 110, accel: 6, structure: 18, blindage: 6, pilote: 2, senseurs: 3 } },
      { match: /NISSAN\ STRIDER.*FOURGONNETTE/i, name: "Nissan Strider (Fourgonnette)", kind: "vehicule",
        stats: { mania: 3, intervalle: 25, maniaHors: 4, vitesse: 180, accel: 15, structure: 14, blindage: 10, pilote: 2, senseurs: 2 } },
      { match: /NISSAN\ STRIDER/i, name: "Nissan Strider", kind: "vehicule",
        stats: { mania: 3, intervalle: 25, maniaHors: 4, vitesse: 180, accel: 15, structure: 14, blindage: 10, pilote: 2, senseurs: 2 } },
      { match: /SUZUKI\ SPORSTER.*MINIVAN/i, name: "Suzuki Sporster (Minivan)", kind: "vehicule",
        stats: { mania: 3, intervalle: 20, maniaHors: 4, vitesse: 140, accel: 15, structure: 12, blindage: 6, pilote: 2, senseurs: 1 } },
      { match: /SUZUKI\ SPORSTER/i, name: "Suzuki Sporster", kind: "vehicule",
        stats: { mania: 3, intervalle: 20, maniaHors: 4, vitesse: 140, accel: 15, structure: 12, blindage: 6, pilote: 2, senseurs: 1 } },
      { match: /TOYOTA\ ADVENTURE.*MINIBUS/i, name: "Toyota Adventure (Minibus)", kind: "vehicule",
        stats: { mania: 5, intervalle: 15, maniaHors: 6, vitesse: 140, accel: 10, structure: 10, blindage: 6, pilote: 2, senseurs: 1 } },
      { match: /TOYOTA\ ADVENTURE/i, name: "Toyota Adventure", kind: "vehicule",
        stats: { mania: 5, intervalle: 15, maniaHors: 6, vitesse: 140, accel: 10, structure: 10, blindage: 6, pilote: 2, senseurs: 1 } },
      { match: /VOLKSWAGEN\ SUPERKOMBI/i, name: "Volkswagen Superkombi Iv", kind: "vehicule",
        stats: { mania: 4, intervalle: 15, maniaHors: 5, vitesse: 160, accel: 12, structure: 14, blindage: 8, pilote: 2, senseurs: 1 } },
      { match: /BMW\-?KRUPP\ DEMON/i, name: "Bmw-Krupp Demon", kind: "vehicule",
        stats: { mania: 4, intervalle: 40, maniaHors: 4, vitesse: 270, accel: 30, structure: 4, blindage: 4, pilote: 2, senseurs: 3 } },
      { match: /CHRYSLER\-?NISSAN\ G12C/i, name: "Chrysler-Nissan G12C", kind: "vehicule",
        stats: { mania: 4, intervalle: 20, maniaHors: 4, vitesse: 160, accel: 12, structure: 12, blindage: 8, pilote: 2, senseurs: 1 } },
      { match: /BLUE\ RAPTOR/i, name: "Essy Motors Blue Raptor", kind: "vehicule",
        stats: { mania: 6, intervalle: 60, maniaHors: 6, vitesse: 280, accel: 40, structure: 6, blindage: 2, pilote: 2, senseurs: 3 } },
      { match: /GMC\ VACATIONER/i, name: "Gmc Vacationer Iii", kind: "vehicule",
        stats: { mania: 4, intervalle: 25, maniaHors: 4, vitesse: 200, accel: 20, structure: 10, blindage: 4, pilote: 2, senseurs: 2 } },
      { match: /GMC\ PATROLLER/i, name: "Gmc Patroller", kind: "vehicule",
        stats: { mania: 3, intervalle: 30, maniaHors: 3, vitesse: 220, accel: 22, structure: 12, blindage: 8, pilote: 2, senseurs: 2 } },
      // ⚠ F6 — était `/ARES/i`, c'est-à-dire LE FABRICANT SEUL. Ares fabrique
      // le pistolet le plus répandu du jeu (Predator), le fusil d'assaut le
      // plus répandu (Alpha) et une gamme d'armures : tout ganger portant un
      // Predator était donc identifié comme propriétaire d'un char de combat,
      // et recevait une chip « ▣ Ares Army-Master · déployer » dans sa zone
      // Combat. Trouvé en branchant le domaine « pilotage » de la feuille
      // d'actions dessus (F6) : le ganger d'essai voyait les quatre actions de
      // rigger. Le motif nomme désormais le VÉHICULE, comme ses voisins.
      { match: /ARMY\-MASTER/i, name: "Ares Army-Master", kind: "vehicule",
        stats: { mania: 5, vitesse: 120, accel: 10, structure: 22, blindage: 18, pilote: 3, senseurs: 3 } },
      { match: /BAE\ CENTURION/i, name: "Bae Centurion Ii Mbt", kind: "vehicule",
        stats: { mania: 5, intervalle: 30, maniaHors: 5, vitesse: 150, accel: 20, structure: 24, blindage: 20, pilote: 3, senseurs: 3 } },
      { match: /FERRARI\ APPALOOSA/i, name: "Ferrari Appaloosa", kind: "vehicule",
        stats: { mania: 3, vitesse: 220, accel: 22, structure: 20, blindage: 18, pilote: 3, senseurs: 4 } },
      { match: /MACARTHUR/i, name: "Cas/General Dynamics Macarthur", kind: "vehicule",
        stats: { mania: 5, intervalle: 30, maniaHors: 5, vitesse: 160, accel: 25, structure: 26, blindage: 20, pilote: 3, senseurs: 4 } },
      { match: /FLYER\-?90/i, name: "General Dynamics Flyer-90", kind: "vehicule",
        stats: { mania: 3, vitesse: 170, accel: 20, structure: 12, blindage: 6, pilote: 3, senseurs: 1 } },
      { match: /GMC\ CHARIOT/i, name: "Gmc Chariot", kind: "vehicule",
        stats: { mania: 6, vitesse: 100, accel: 10, structure: 16, blindage: 12, pilote: 3, senseurs: 4 } },
      { match: /GMC\ TROOPER/i, name: "Gmc Trooper Gpmv", kind: "vehicule",
        stats: { mania: 3, intervalle: 25, maniaHors: 4, vitesse: 150, accel: 20, structure: 14, blindage: 10, pilote: 3, senseurs: 1 } },
      { match: /HONDA\-?GM\ DIAMONDBACK/i, name: "Honda-Gm Diamondback", kind: "vehicule",
        stats: { mania: 1, intervalle: 30, maniaHors: 4, vitesse: 250, accel: 30, structure: 16, blindage: 12, pilote: 3, senseurs: 3 } },
      { match: /THUNDERCLOUD\ MORGAN\ VI/i, name: "Thundercloud Morgan Vi", kind: "vehicule",
        stats: { mania: 2, vitesse: 220, accel: 32, structure: 8, blindage: 6, pilote: 3, senseurs: 1 } },
      { match: /THUNDERCLOUD\ MORGAN\ V2/i, name: "Thundercloud Morgan V2", kind: "vehicule",
        stats: { mania: 3, intervalle: 30, maniaHors: 3, vitesse: 210, accel: 31, structure: 12, blindage: 10, pilote: 3, senseurs: 2 } },
      { match: /BMW\ SUPER\-BUG/i, name: "Bmw Super-Bug", kind: "vehicule",
        stats: { mania: 1, intervalle: 20, maniaHors: 1, vitesse: 160, accel: 15, structure: 8, blindage: 6, pilote: 3, senseurs: 5 } },
      { match: /STREET\ ROCKET/i, name: "Spinrad Global Street Rocket Ex", kind: "vehicule",
        stats: { mania: 4, intervalle: 30, maniaHors: 4, vitesse: 90, accel: 10, structure: 3, blindage: 1, pilote: 3, senseurs: 1 } },
      { match: /ATLANTIC\/PACIFIC/i, name: "Bae Systems Atlantic/Pacific 28", kind: "vehicule",
        stats: { mania: 3, vitesse: 60, accel: 15, structure: 8, blindage: 5, pilote: 2, senseurs: 2 } },
      { match: /KAWASAKI\ STINGRAY/i, name: "Kawasaki Stingray", kind: "vehicule",
        stats: { mania: 4, intervalle: 40, vitesse: 110, accel: 22, structure: 7, blindage: 3, pilote: 2, senseurs: 1 } },
      { match: /KAWASAKI\ MANTA\ RAY/i, name: "Kawasaki Manta Ray", kind: "vehicule",
        stats: { mania: 5, intervalle: 35, vitesse: 110, accel: 20, structure: 8, blindage: 3, pilote: 2, senseurs: 1 } },
      { match: /MITSUBISHI\ WATERBUG/i, name: "Mitsubishi Waterbug", kind: "vehicule",
        stats: { mania: 3, vitesse: 80, accel: 15, structure: 5, blindage: 3, pilote: 2, senseurs: 1 } },
      { match: /MITSUBISHI\ WAVESKIPPER/i, name: "Mitsubishi Waveskipper", kind: "vehicule",
        stats: { mania: 4, intervalle: 20, vitesse: 80, accel: 15, structure: 6, blindage: 3, pilote: 2, senseurs: 1 } },
      { match: /SEA\ RAY\ COTTONMOUTH/i, name: "Sea Ray Cottonmouth", kind: "vehicule",
        stats: { mania: 5, intervalle: 40, vitesse: 180, accel: 50, structure: 8, blindage: 4, pilote: 2, senseurs: 3 } },
      { match: /ZODIAC\ WHISPER/i, name: "Zodiac Whisper", kind: "vehicule",
        stats: { mania: 3, vitesse: 50, accel: 15, structure: 5, blindage: 4, pilote: 2, senseurs: 0 } },
      { match: /CORSAIR\ ELYSIUM/i, name: "Corsair Elysium", kind: "vehicule",
        stats: { mania: 3, vitesse: 20, accel: 10, structure: 0, blindage: 0, pilote: 2, senseurs: 0 } },
      { match: /CORSAIR\ ELLIPSE/i, name: "Corsair Ellipse", kind: "vehicule",
        stats: { mania: 3, vitesse: 20, accel: 8, structure: 12, blindage: 9, pilote: 2, senseurs: 2 } },
      { match: /CORSAIR\ PANTHER/i, name: "Corsair Panther", kind: "vehicule",
        stats: { mania: 3, vitesse: 30, accel: 10, structure: 14, blindage: 9, pilote: 2, senseurs: 2 } },
      { match: /CORSAIR\ PUMA/i, name: "Corsair Puma", kind: "vehicule",
        stats: { mania: 2, vitesse: 30, accel: 10, structure: 16, blindage: 0, pilote: 2, senseurs: 3 } },
      { match: /CORSAIR\ TRIDENT/i, name: "Corsair Trident", kind: "vehicule",
        stats: { mania: 3, intervalle: 10, maniaHors: 5, vitesse: 30, accel: 15, structure: 16, blindage: 9, pilote: 2, senseurs: 2 } },
      { match: /CORSAIR\ TRITON/i, name: "Corsair Triton", kind: "vehicule",
        stats: { mania: 3, vitesse: 30, accel: 10, structure: 16, blindage: 0, pilote: 2, senseurs: 2 } },
      // ⚠ F6 — était `/HORIZON/i` : même défaut qu'`/ARES/i` ci-dessus. Horizon
      // édite des commlinks et de l'électronique grand public, et le motif
      // captait au passage le drone « Horizon Flying Eye », pourtant catalogué
      // à part vingt lignes plus haut (le premier motif qui répond gagne).
      { match: /HORIZON\ FREEDOM/i, name: "Horizon Freedom", kind: "vehicule",
        stats: { mania: 3, intervalle: 3, vitesse: 10, accel: 2, structure: 4, blindage: 3, pilote: 2, senseurs: 0 } },
      { match: /CUTTY\ SARK/i, name: "Cutty Sark Ii", kind: "vehicule",
        stats: { mania: 5, intervalle: 10, vitesse: 30, accel: 10, structure: 36, blindage: 12, pilote: 2, senseurs: 0 } },
      { match: /EVO\ AQUAVIDA\ ?2/i, name: "Evo Aquavida 2", kind: "vehicule",
        stats: { mania: 5, vitesse: 20, accel: 2, structure: 16, blindage: 10, pilote: 2, senseurs: 2 } },
      { match: /EVO\ AQUAVIDA/i, name: "Evo Aquavida", kind: "vehicule",
        stats: { mania: 5, vitesse: 20, accel: 2, structure: 14, blindage: 10, pilote: 2, senseurs: 2 } },
      { match: /EVO\ WATERKING/i, name: "Evo Waterking", kind: "vehicule",
        stats: { mania: 4, vitesse: 25, accel: 2, structure: 18, blindage: 10, pilote: 2, senseurs: 3 } },
      { match: /WAVECUTTER/i, name: "Maersk Shipyards Mpac Wavecutter", kind: "vehicule",
        stats: { mania: 4, vitesse: 100, accel: 4, structure: 24, blindage: 20, pilote: 2, senseurs: 2 } },
      { match: /CIPACTLI/i, name: "Corvette De Classe Cipactli", kind: "vehicule",
        stats: { mania: 4, vitesse: 0, accel: 15, structure: 54000, blindage: 0, pilote: 3, senseurs: 4 } },
      { match: /CARGO\ SUPER\ LOURD/i, name: "Cargo Super Lourd Maersk (Double L)", kind: "vehicule",
        stats: { mania: 6, intervalle: 8, vitesse: 40, accel: 4, structure: 70, blindage: 12, pilote: 3, senseurs: 4 } },
      { match: /LURSSEN\ MOBIUS/i, name: "Lurssen Mobius", kind: "vehicule",
        stats: { mania: 4, intervalle: 10, vitesse: 50, accel: 10, structure: 36, blindage: 14, pilote: 3, senseurs: 6 } },
      { match: /MV\ POSEIDON'S/i, name: "Mv Poseidon'S Endeavour", kind: "vehicule",
        stats: { mania: 4, intervalle: 12, vitesse: 50, accel: 8, structure: 40, blindage: 18, pilote: 3, senseurs: 4 } },
      { match: /NAVIRE\-USINE/i, name: "Navire-Usine", kind: "vehicule",
        stats: { mania: 0, vitesse: 20, accel: 0, structure: 90, blindage: 0, pilote: 3, senseurs: 4 } },
      { match: /CROISEUR.*RANGER/i, name: "Croiseur Classe Ranger", kind: "vehicule",
        stats: { mania: 5, vitesse: 70, accel: 12, structure: 60, blindage: 45, pilote: 3, senseurs: 6 } },
      { match: /TRANQUILITY\ PRINCESS/i, name: "Tranquility Princess", kind: "vehicule",
        stats: { mania: 3, intervalle: 10, vitesse: 40, accel: 8, structure: 34, blindage: 16, pilote: 3, senseurs: 4 } },
    ],
  },

  /* VD standard des armes embarquées, par édition : pas de PA, VD
     imprimée directement. */
  MOUNTED_WEAPONS: {
    "fusil d'assaut": { sr5: "10P, PA -2", sr6: "VD 5P", anarchy2: "VD 7", anarchy1: "VD 8P" },
    "mitrailleuse":   { sr5: "9P, PA -2",  sr6: "VD 5P", anarchy2: "VD 9", anarchy1: "VD 8P" },
  },

  /* ---- Détection : un item d'équipement (ou atout Anarchy)
     correspond-il à un véhicule/drone déployable ? ---- */
  matchItem(rawItem, edition) {
    const item = ItemResolver.itemStr(rawItem); // #63 : item chaîne OU objet
    if (!item) return null;
    if (App.getEditionModule(edition)?.usesRiskPanel) return this._parseAnarchy(item);
    const table = this.CATALOG[edition] || [];
    const entry = table.find((e) => e.match.test(item));
    if (!entry) return null;
    return {
      name: entry.name,
      kind: entry.kind,
      count: 1,
      stats: { ...entry.stats },
      weapons: this._parseMounted(item, edition),
      rrNotes: null,
    };
  },

  /* ---- Parseur Anarchy : libellés auto-descriptifs ----
     "2 MCT-Nissan Roto-drone (drones volants moyens) : Autopilote 6,
      Structure 2, Maniabilité 7, Vitesse 6, Blindage 2, avec fusil d'assaut"
     Seuls les libellés (drone/véhicule) portant un indice Autopilote
     sont déployables — les items purement narratifs (« Moto
     personnalisée (véhicule) : RR 1 aux tests... ») restent des tags. */
  _parseAnarchy(item) {
    const head = item.match(/^(\d+)?\s*([^(]+?)\s*\(([^)]*)\)/);
    if (!head) return null;
    const paren = head[3].toLowerCase();
    const isDrone = /drone/.test(paren);
    const isVehicule = /véhicule/.test(paren);
    if (!isDrone && !isVehicule) return null;
    const num = (re) => {
      const m = item.match(re);
      return m ? parseInt(m[1], 10) : 0;
    };
    const autopilote = num(/Autopilote\s*(\d+)/i);
    if (!autopilote) return null; // pas de stats → simple effet narratif
    const rrM = item.match(/RR\s*\d+\s+aux tests[^.;]*/i);
    return {
      name: head[2].trim(),
      kind: isDrone ? "drone" : "vehicule",
      count: head[1] ? parseInt(head[1], 10) : 1,
      stats: {
        autopilote,
        structure: num(/Structure\s*(\d+)/i),
        mania: num(/Maniabilité\s*(\d+)/i),
        vitesse: num(/Vitesse\s*\.?\s*(\d+)/i),
        blindage: num(/Blindage\s*(\d+)/i),
      },
      weapons: this._parseMounted(item, "anarchy2"),
      rrNotes: rrM ? rrM[0].trim() : null,
    };
  },

  /** Arme embarquée mentionnée dans le libellé (« avec fusil d'assaut »,
      « avec mitrailleuse en tourelle »). */
  _parseMounted(item, edition) {
    const m = item.match(/avec\s+(fusil d.assaut|mitrailleuse)[^,;.\]]*/i);
    if (!m) return [];
    const key = /mitrailleuse/i.test(m[1]) ? "mitrailleuse" : "fusil d'assaut";
    const vd = (this.MOUNTED_WEAPONS[key] || {})[edition] || "";
    return [{ name: m[0].replace(/^avec\s+/i, "").trim(), vd }];
  },

  /* ---- Création de l'entité liée ---- */
  _monitor(stats, edition) {
    // SR5 & SR6 : ⌈Structure/2⌉ + 8 (Riggers, les deux livres)
    return Math.ceil((stats.structure || 0) / 2) + 8;
  },

  /** Préfixe d'`srcItem` des montures prises EN POURSUITE (bagnole volée,
      taxi, van du fixer). Il sert deux fois :
        · `linkedTo(ownerId, srcItem)` compare des chaînes exactes — sans lui,
          une monture volée écraserait l'engin d'équipement homonyme de son
          conducteur (et « Ranger » les rangerait tous les deux) ;
        · `UI._vehicleItems` ne lit que l'ÉQUIPEMENT, donc une monture ainsi
          nommée ne fabrique aucune chip parasite sur la carte du
          propriétaire — elle n'y a rien à faire, il ne la possède pas. */
  CHASE_SRC: "⇉ ",

  /** Le seul constructeur d'entité `type:"vehicle"` du fichier. Trois
      appelants : le déploiement depuis l'équipement (`spawn`), la prise au
      catalogue (`spawnFromCatalog`) et la saisie libre (`spawnCustom`) —
      un moniteur qui diverge d'un chemin à l'autre serait invisible et
      faux. */
  _entity(owner, spec, edition) {
    const v = {
      id: Utils.uid(),
      type: "vehicle",
      kind: spec.kind || "vehicule",
      edition,
      name: spec.name,
      ownerId: owner.id,
      ownerName: owner.name || owner.archetype || "PNJ",
      srcItem: spec.srcItem,
      stats: { ...(spec.stats || {}) },
      weapons: (spec.weapons || []).map((w) => ({ ...w })),
      rrNotes: spec.rrNotes || null,
      notes: "",
      deployed: true,
    };
    if (App.getEditionModule(edition).conditionMonitor.vehicleFields === "thresholds") {
      v.legerFilled = 0;
      v.graveFilled = 0;
      v.incapFilled = 0;
    } else {
      v.monTotal = this._monitor(v.stats, edition);
      v.monFilled = 0;
    }
    return v;
  },

  spawn(owner, itemStr, edition) {
    const parsed = this.matchItem(itemStr, edition);
    if (!parsed) return [];
    const out = [];
    for (let i = 0; i < parsed.count; i++)
      out.push(
        this._entity(
          owner,
          { ...parsed, name: parsed.count > 1 ? `${parsed.name} #${i + 1}` : parsed.name, srcItem: itemStr },
          edition,
        ),
      );
    return out;
  },

  /* ========================================================
     PRENDRE UN VÉHICULE À LA VOLÉE (lot P6)

     Jusqu'ici un engin n'entrait dans l'app que par l'ÉQUIPEMENT de
     quelqu'un — ce qui suppose qu'il lui appartienne. Une course-poursuite
     ne suppose rien de tel : on saute dans un taxi, on vole une bagnole,
     on monte dans le van du fixer. Les deux entrées ci-dessous ouvrent ce
     geste sans toucher au chemin de l'équipement.
     ======================================================== */

  /** Le catalogue de l'édition, à plat et trié, pour un sélecteur.

      VIDE en Anarchy, et c'est normal : cette édition n'a pas de table de
      véhicules — ses engins se lisent dans le libellé d'équipement, qui est
      auto-descriptif (`_parseAnarchy`). Le sélecteur n'offre alors que la
      saisie libre, et il le dit plutôt que de présenter une liste vide. */
  catalogList(edition) {
    return (this.CATALOG[edition] || [])
      .map((e) => ({ name: e.name, kind: e.kind, stats: { ...e.stats } }))
      .sort((a, b) => a.name.localeCompare(b.name, "fr"));
  },

  /** Monture prise au catalogue. On construit l'entité DEPUIS l'entrée
      retenue, sans repasser par `matchItem` : un aller-retour par le motif
      exposerait au piège du « premier motif qui répond » corrigé au lot F6
      (`Honda Rough Rider` ressortant en `… (Motoquad)`, les cinq Corsair en
      `Corsair Elysium`). Le nom choisi est celui qu'on obtient. */
  spawnFromCatalog(owner, name, edition) {
    const entry = (this.CATALOG[edition] || []).find((e) => e.name === name);
    if (!entry || !owner) return null;
    return this._entity(
      owner,
      { name: entry.name, kind: entry.kind, stats: entry.stats, srcItem: this.CHASE_SRC + entry.name },
      edition,
    );
  },

  /** Monture dont aucun livre chargé ne donne les stats : le MJ saisit ce
      qu'il a sous les yeux, et ce qu'il laisse vide reste vide — la piste
      écrira « — » avec sa saisie à un tap, elle ne dérivera rien. */
  spawnCustom(owner, { name, kind, stats } = {}, edition) {
    if (!owner || !name) return null;
    return this._entity(
      owner,
      { name, kind: kind || "vehicule", stats: stats || {}, srcItem: this.CHASE_SRC + name },
      edition,
    );
  },

  /** Entités liées à un item source précis d'un propriétaire. */
  linkedTo(ownerId, srcItem) {
    const pools = [Gen.pool || [], Shadows.data ? Shadows.data.all : []];
    const out = [];
    for (const pool of pools) {
      for (const e of pool) {
        if (e.type === "vehicle" && e.ownerId === ownerId &&
            (srcItem == null || e.srcItem === srcItem)) {
          out.push(e);
        }
      }
    }
    return out;
  },

  /* ---- Réserves de dés affichées sur la fiche ----
     Autosoft par défaut = indice d'Autopilote (simplification MJ,
     éditable via la modale). */
  pools(v) {
    return App.getEditionModule(v.edition).vehicleModel.pools(v);
  },

  /** Seuils de blessures Anarchy (p.68) : léger / grave / incap. */
  anarchyThresholds(v) {
    const s = v.stats || {};
    const base = (s.structure || 0) + (s.blindage || 0);
    return [base, 2 * (s.structure || 0) + (s.blindage || 0), 3 * (s.structure || 0) + (s.blindage || 0)];
  },

  /** Initiative autonome SR5/SR6 : Autopilote × 2 + 4D6. Neutre `null`
      en Anarchy (pas d'initiative autonome distincte, cf. vehicleModel). */
  initiative(v) {
    const fn = App.getEditionModule(v.edition).vehicleModel.initiative;
    return fn ? fn(v) : null;
  },
};

// Pont couche 2 (migration modules ES) — retiré en fin de migration.
window.Vehicles = Vehicles;
