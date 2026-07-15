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
const Vehicles = {
  /* ---- Catalogue SR5/SR6 : stats des tables du livre de base ----
     mania/vitesse/accel/structure/blindage/pilote/senseurs.
     SR6 : vitesse = Vitesse max, accel = Accélération, intervalle
     affiché à titre indicatif dans le titre. */
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
        stats: { mania: 4, vitesse: 140, accel: 15, structure: 2, blindage: 4, pilote: 4, senseurs: 4 } },
      { match: /Crawler/i, name: "Aztechnology Crawler", kind: "drone",
        stats: { mania: 3, vitesse: 30, accel: 8, structure: 6, blindage: 2, pilote: 2, senseurs: 2 } },
      { match: /Doberman/i, name: "GM-Nissan Doberman", kind: "drone",
        stats: { mania: 3, vitesse: 100, accel: 10, structure: 4, blindage: 6, pilote: 2, senseurs: 3 } },
      { match: /Roto-?drone/i, name: "MCT-Nissan Roto-drone", kind: "drone",
        stats: { mania: 3, vitesse: 160, accel: 20, structure: 5, blindage: 6, pilote: 3, senseurs: 2 } },
      { match: /Dalmatian/i, name: "Cyberspace Designs Dalmatian", kind: "drone",
        stats: { mania: 3, vitesse: 130, accel: 13, structure: 6, blindage: 4, pilote: 3, senseurs: 3 } },
      { match: /Steel Lynx/i, name: "Steel Lynx", kind: "drone",
        stats: { mania: 3, vitesse: 80, accel: 15, structure: 12, blindage: 16, pilote: 4, senseurs: 4 } },
      { match: /Americar/i, name: "Ford Americar", kind: "vehicule",
        stats: { mania: 4, vitesse: 160, accel: 9, structure: 11, blindage: 4, pilote: 1, senseurs: 2 } },
      { match: /Westwind/i, name: "Eurocar Westwind X80", kind: "vehicule",
        stats: { mania: 2, vitesse: 250, accel: 24, structure: 6, blindage: 1, pilote: 4, senseurs: 3 } },
      { match: /Bulldog/i, name: "GMC Bulldog Step-Van", kind: "vehicule",
        stats: { mania: 5, vitesse: 140, accel: 10, structure: 16, blindage: 12, pilote: 2, senseurs: 3 } },
      { match: /Roadmaster/i, name: "Ares Roadmaster", kind: "vehicule",
        stats: { mania: 5, vitesse: 120, accel: 8, structure: 18, blindage: 16, pilote: 2, senseurs: 2 } },
      { match: /Gopher/i, name: "Toyota Gopher", kind: "vehicule",
        stats: { mania: 4, vitesse: 150, accel: 15, structure: 12, blindage: 6, pilote: 1, senseurs: 1 } },
      { match: /Dodge\ Scoot/i, name: "Dodge Scoot", kind: "vehicule",
        stats: { mania: 5, vitesse: 80, accel: 4, structure: 2, blindage: 0, pilote: 1, senseurs: 0 } },
      { match: /Harley\-Davidson\ Scorpion/i, name: "Harley-Davidson Scorpion", kind: "vehicule",
        stats: { mania: 3, vitesse: 200, accel: 16, structure: 7, blindage: 6, pilote: 1, senseurs: 1 } },
      { match: /Suzuki\ Mirage/i, name: "Suzuki Mirage", kind: "vehicule",
        stats: { mania: 2, vitesse: 260, accel: 29, structure: 4, blindage: 2, pilote: 1, senseurs: 1 } },
      { match: /Yamaha\ Growler/i, name: "Yamaha Growler", kind: "vehicule",
        stats: { mania: 3, vitesse: 180, accel: 15, structure: 6, blindage: 4, pilote: 1, senseurs: 1 } },
      { match: /Chrysler\-Nissan\ Jackrabbit/i, name: "Chrysler-Nissan Jackrabbit", kind: "vehicule",
        stats: { mania: 3, vitesse: 160, accel: 20, structure: 8, blindage: 4, pilote: 2, senseurs: 1 } },
      { match: /Honda\ Spirit/i, name: "Honda Spirit", kind: "vehicule",
        stats: { mania: 4, vitesse: 150, accel: 15, structure: 10, blindage: 3, pilote: 1, senseurs: 1 } },
      { match: /Hyundai\ Shin\-Hyung/i, name: "Hyundai Shin-Hyung", kind: "vehicule",
        stats: { mania: 3, vitesse: 200, accel: 12, structure: 7, blindage: 1, pilote: 1, senseurs: 1 } },
      { match: /Saeder\-Krupp\-Bentley\ Concordat/i, name: "Saeder-Krupp-Bentley Concordat", kind: "vehicule",
        stats: { mania: 3, vitesse: 180, accel: 18, structure: 14, blindage: 8, pilote: 3, senseurs: 3 } },
      { match: /Mitsubishi\ Nightsky/i, name: "Mitsubishi Nightsky", kind: "vehicule",
        stats: { mania: 4, vitesse: 160, accel: 10, structure: 18, blindage: 10, pilote: 3, senseurs: 4 } },
      { match: /Range\ Rover/i, name: "Range Rover Model 2080", kind: "vehicule",
        stats: { mania: 4, vitesse: 160, accel: 12, structure: 16, blindage: 10, pilote: 4, senseurs: 4 } },
      { match: /Samuvani\ CrisCraft/i, name: "Samuvani CrisCraft Otter", kind: "vehicule",
        stats: { mania: 4, vitesse: 90, accel: 10, structure: 6, blindage: 4, pilote: 2, senseurs: 2 } },
      { match: /Aztechnology\ Sunrunner/i, name: "Aztechnology Sunrunner/Nightrunner", kind: "vehicule",
        stats: { mania: 3, vitesse: 120, accel: 20, structure: 10, blindage: 8, pilote: 3, senseurs: 3 } },
      { match: /GMC\ Riverine/i, name: "GMC Riverine", kind: "vehicule",
        stats: { mania: 4, vitesse: 100, accel: 15, structure: 14, blindage: 12, pilote: 4, senseurs: 4 } },
      { match: /Proteus\ Lamprey/i, name: "Proteus Lamprey/Sea Snake", kind: "vehicule",
        stats: { mania: 3, vitesse: 60, accel: 13, structure: 2, blindage: 1, pilote: 2, senseurs: 1 } },
      { match: /YNT\ Delfin/i, name: "YNT Delfin", kind: "vehicule",
        stats: { mania: 5, vitesse: 70, accel: 18, structure: 6, blindage: 12, pilote: 3, senseurs: 3 } },
      { match: /Artemis\ Industries/i, name: "Artemis Industries Nightwing", kind: "vehicule",
        stats: { mania: 4, vitesse: 150, accel: 15, structure: 2, blindage: 0, pilote: 1, senseurs: 1 } },
      { match: /Cessna\ C750/i, name: "Cessna C750", kind: "vehicule",
        stats: { mania: 5, vitesse: 250, accel: 20, structure: 8, blindage: 2, pilote: 2, senseurs: 1 } },
      { match: /MCT\-Sikorsky\-Bell\ Seahawk/i, name: "MCT-Sikorsky-Bell Seahawk", kind: "vehicule",
        stats: { mania: 5, vitesse: 500, accel: 30, structure: 12, blindage: 4, pilote: 2, senseurs: 2 } },
      { match: /Ares\ Dragon/i, name: "Ares Dragon", kind: "vehicule",
        stats: { mania: 4, vitesse: 260, accel: 10, structure: 22, blindage: 10, pilote: 2, senseurs: 3 } },
      { match: /MCT\-Sikorsky\-Bell\ Wolfhound/i, name: "MCT-Sikorsky-Bell Wolfhound", kind: "vehicule",
        stats: { mania: 3, vitesse: 320, accel: 20, structure: 12, blindage: 14, pilote: 4, senseurs: 4 } },
      { match: /Northrup\ Wasp/i, name: "Northrup Wasp", kind: "vehicule",
        stats: { mania: 3, vitesse: 330, accel: 25, structure: 10, blindage: 8, pilote: 3, senseurs: 3 } },
      { match: /Ares\ Venture/i, name: "Ares Venture", kind: "vehicule",
        stats: { mania: 4, vitesse: 680, accel: 40, structure: 16, blindage: 12, pilote: 2, senseurs: 2 } },
      { match: /GMC\ Banshee/i, name: "GMC Banshee", kind: "vehicule",
        stats: { mania: 3, vitesse: 900, accel: 60, structure: 18, blindage: 18, pilote: 4, senseurs: 4 } },
      { match: /Federated\ Boeing\ Commuter/i, name: "Federated Boeing Commuter", kind: "vehicule",
        stats: { mania: 3, vitesse: 420, accel: 35, structure: 16, blindage: 10, pilote: 2, senseurs: 2 } },
      { match: /Osprey\ X/i, name: "Osprey X", kind: "vehicule",
        stats: { mania: 3, vitesse: 420, accel: 35, structure: 16, blindage: 16, pilote: 4, senseurs: 4 } },
      { match: /GMC\ Micromachine/i, name: "GMC Micromachine", kind: "drone",
        stats: { mania: 3, vitesse: 25, accel: 5, structure: 0, blindage: 0, pilote: 1, senseurs: 1 } },
      { match: /Shiawase\ Kanmushi/i, name: "Shiawase Kanmushi", kind: "drone",
        stats: { mania: 2, vitesse: 15, accel: 4, structure: 0, blindage: 0, pilote: 3, senseurs: 2 } },
      { match: /Sikorsky\-Bell\ Microskimmer/i, name: "Sikorsky-Bell Microskimmer XXS", kind: "drone",
        stats: { mania: 2, vitesse: 35, accel: 6, structure: 0, blindage: 0, pilote: 2, senseurs: 1 } },
      { match: /MCT\ Gnat/i, name: "MCT Gnat", kind: "drone",
        stats: { mania: 3, vitesse: 30, accel: 4, structure: 0, blindage: 0, pilote: 2, senseurs: 1 } },
      { match: /GM\-Nissan\ Flip\-Flop/i, name: "GM-Nissan Flip-Flop", kind: "drone",
        stats: { mania: 2, vitesse: 50, accel: 8, structure: 1, blindage: 0, pilote: 2, senseurs: 1 } },
      { match: /Horizon\ Flying/i, name: "Horizon Flying Eye", kind: "drone",
        stats: { mania: 3, vitesse: 40, accel: 15, structure: 1, blindage: 0, pilote: 2, senseurs: 2 } },
      { match: /MCT\ Hornet/i, name: "MCT Hornet", kind: "drone",
        stats: { mania: 3, vitesse: 35, accel: 20, structure: 1, blindage: 0, pilote: 2, senseurs: 2 } },
      { match: /Shiawase\ Inu/i, name: "Shiawase Inu", kind: "drone",
        stats: { mania: 2, vitesse: 24, accel: 6, structure: 1, blindage: 0, pilote: 2, senseurs: 2 } },
      { match: /Cyberspace\ Designs/i, name: "Cyberspace Designs Quadrotor", kind: "drone",
        stats: { mania: 2, vitesse: 120, accel: 15, structure: 3, blindage: 1, pilote: 3, senseurs: 2 } },
      { match: /Nissan\ Samurai/i, name: "Nissan Samurai/Oni", kind: "drone",
        stats: { mania: 3, vitesse: 30, accel: 10, structure: 6, blindage: 6, pilote: 3, senseurs: 2 } },
      { match: /Federated\ Boeing\ Blackhawk/i, name: "Federated Boeing Blackhawk", kind: "drone",
        stats: { mania: 3, vitesse: 200, accel: 35, structure: 8, blindage: 6, pilote: 3, senseurs: 3 } },
      { match: /Ares\ Black/i, name: "Ares Black Sky", kind: "drone",
        stats: { mania: 2, vitesse: 300, accel: 25, structure: 8, blindage: 10, pilote: 4, senseurs: 4 } },
      { match: /Ares\ Packmule/i, name: "Ares Packmule", kind: "drone",
        stats: { mania: 3, vitesse: 30, accel: 6, structure: 8, blindage: 6, pilote: 2, senseurs: 1 } },
      { match: /EVO\-ECHO/i, name: "Evo-Echo Motors Stiletto", kind: "vehicule",
        stats: { mania: 2, vitesse: 250, accel: 40, structure: 3, blindage: 3, pilote: 2, senseurs: 2 } },
      { match: /HARLEY\-DAVIDSON/i, name: "Harley-Davidson Centaur (Combat)", kind: "vehicule",
        stats: { mania: 3, vitesse: 220, accel: 20, structure: 8, blindage: 7, pilote: 2, senseurs: 2 } },
      { match: /HONDA/i, name: "Honda Rough Rider", kind: "vehicule",
        stats: { mania: 4, vitesse: 160, accel: 15, structure: 5, blindage: 4, pilote: 2, senseurs: 1 } },
      { match: /HONDA\ RIDER/i, name: "Honda Rough Rider (Motoquad)", kind: "vehicule",
        stats: { mania: 4, vitesse: 160, accel: 15, structure: 5, blindage: 4, pilote: 2, senseurs: 1 } },
      { match: /HONDA\ 2080/i, name: "Honda Viking 2080", kind: "vehicule",
        stats: { mania: 3, vitesse: 210, accel: 10, structure: 7, blindage: 6, pilote: 2, senseurs: 1 } },
      { match: /NISSAN/i, name: "Nissan Constellation", kind: "vehicule",
        stats: { mania: 2, vitesse: 90, accel: 10, structure: 3, blindage: 2, pilote: 2, senseurs: 2 } },
      { match: /SUZUKI/i, name: "Suzuki Transit", kind: "vehicule",
        stats: { mania: 2, vitesse: 250, accel: 25, structure: 4, blindage: 1, pilote: 2, senseurs: 1 } },
      { match: /SUZUKI\ \(Course\)/i, name: "Suzuki Transit (Course)", kind: "vehicule",
        stats: { mania: 2, vitesse: 250, accel: 25, structure: 4, blindage: 1, pilote: 2, senseurs: 1 } },
      { match: /YAMAHA/i, name: "Yamaha Kaburaya", kind: "vehicule",
        stats: { mania: 2, vitesse: 280, accel: 32, structure: 3, blindage: 2, pilote: 2, senseurs: 2 } },
      { match: /YAMAHA\ \(Course\)/i, name: "Yamaha Kaburaya (Course)", kind: "vehicule",
        stats: { mania: 2, vitesse: 280, accel: 32, structure: 3, blindage: 2, pilote: 2, senseurs: 2 } },
      { match: /YAMAHA\ NODACHI/i, name: "Yamaha Nodachi", kind: "vehicule",
        stats: { mania: 3, vitesse: 210, accel: 30, structure: 9, blindage: 6, pilote: 2, senseurs: 1 } },
      { match: /BMW\ TSARINA/i, name: "Bmw Tsarina Ii (Coupé)", kind: "vehicule",
        stats: { mania: 3, vitesse: 220, accel: 18, structure: 12, blindage: 4, pilote: 2, senseurs: 3 } },
      { match: /DODGE/i, name: "Dodge Rampart", kind: "vehicule",
        stats: { mania: 3, vitesse: 180, accel: 20, structure: 12, blindage: 4, pilote: 2, senseurs: 2 } },
      { match: /DODGE\ LEV/i, name: "Dodge Rampart Lev", kind: "vehicule",
        stats: { mania: 3, vitesse: 100, accel: 22, structure: 14, blindage: 8, pilote: 2, senseurs: 3 } },
      { match: /EUROCAR/i, name: "Eurocar Northstar 2.0", kind: "vehicule",
        stats: { mania: 3, vitesse: 180, accel: 20, structure: 16, blindage: 10, pilote: 2, senseurs: 3 } },
      { match: /FORD/i, name: "Ford Dasher (Sport)", kind: "vehicule",
        stats: { mania: 3, vitesse: 210, accel: 20, structure: 10, blindage: 6, pilote: 2, senseurs: 2 } },
      { match: /FORD\ INTERCEPTOR/i, name: "Ford Dasher Interceptor", kind: "vehicule",
        stats: { mania: 2, vitesse: 240, accel: 24, structure: 12, blindage: 8, pilote: 2, senseurs: 3 } },
      { match: /MITSUBISHI/i, name: "Mitsubishi Runabout (Coupé)", kind: "vehicule",
        stats: { mania: 3, vitesse: 150, accel: 25, structure: 8, blindage: 2, pilote: 2, senseurs: 2 } },
      { match: /SAAB/i, name: "Saab Javelin 878Ti (Sport)", kind: "vehicule",
        stats: { mania: 1, vitesse: 240, accel: 26, structure: 6, blindage: 4, pilote: 2, senseurs: 4 } },
      { match: /SAAB\ 998TI/i, name: "Saab Gladius 998Ti (Sport)", kind: "vehicule",
        stats: { mania: 2, vitesse: 260, accel: 30, structure: 6, blindage: 4, pilote: 2, senseurs: 4 } },
      { match: /TOYOTA/i, name: "Toyota Daytripper", kind: "vehicule",
        stats: { mania: 4, vitesse: 180, accel: 10, structure: 12, blindage: 6, pilote: 2, senseurs: 2 } },
      { match: /TOYOTA\ \(Limousine\)/i, name: "Toyota Ultra-Elite (Limousine)", kind: "vehicule",
        stats: { mania: 3, vitesse: 180, accel: 15, structure: 16, blindage: 12, pilote: 2, senseurs: 4 } },
      { match: /GAZ\-NIKI/i, name: "Gaz-Niki P-183", kind: "vehicule",
        stats: { mania: 3, vitesse: 160, accel: 16, structure: 14, blindage: 4, pilote: 2, senseurs: 1 } },
      { match: /GAZ\-NIKI\ \(Camionnette\)/i, name: "Gaz-Niki P-183 (Camionnette)", kind: "vehicule",
        stats: { mania: 3, vitesse: 160, accel: 16, structure: 14, blindage: 4, pilote: 2, senseurs: 1 } },
      { match: /GMC\ GRIZZLY/i, name: "Gmc Grizzly", kind: "vehicule",
        stats: { mania: 3, vitesse: 170, accel: 15, structure: 16, blindage: 9, pilote: 2, senseurs: 1 } },
      { match: /GMC\ GRIZZLY\ \(Camionnette/i, name: "Gmc Grizzly (Camionnette Lourd)", kind: "vehicule",
        stats: { mania: 3, vitesse: 170, accel: 15, structure: 16, blindage: 9, pilote: 2, senseurs: 1 } },
      { match: /JEEP/i, name: "Jeep Trailblazer", kind: "vehicule",
        stats: { mania: 3, vitesse: 180, accel: 18, structure: 14, blindage: 6, pilote: 2, senseurs: 3 } },
      { match: /TATA/i, name: "Tata Hotspur", kind: "vehicule",
        stats: { mania: 2, vitesse: 240, accel: 32, structure: 12, blindage: 4, pilote: 2, senseurs: 2 } },
      { match: /FORD\ III/i, name: "Ford Bison Iii", kind: "vehicule",
        stats: { mania: 5, vitesse: 140, accel: 15, structure: 18, blindage: 14, pilote: 2, senseurs: 3 } },
      { match: /FORD\ \(Grand/i, name: "Ford Bison Iii (Grand Fourgon)", kind: "vehicule",
        stats: { mania: 5, vitesse: 140, accel: 15, structure: 18, blindage: 14, pilote: 2, senseurs: 3 } },
      { match: /FORD\ LIFELINE/i, name: "Ford Lifeline", kind: "vehicule",
        stats: { mania: 4, vitesse: 110, accel: 8, structure: 22, blindage: 18, pilote: 2, senseurs: 4 } },
      { match: /GMC\ FORCE/i, name: "Gmc Force", kind: "vehicule",
        stats: { mania: 5, vitesse: 110, accel: 6, structure: 18, blindage: 6, pilote: 2, senseurs: 3 } },
      { match: /NISSAN\ STRIDER/i, name: "Nissan Strider", kind: "vehicule",
        stats: { mania: 3, vitesse: 180, accel: 15, structure: 14, blindage: 10, pilote: 2, senseurs: 2 } },
      { match: /NISSAN\ \(Fourgonnette\)/i, name: "Nissan Strider (Fourgonnette)", kind: "vehicule",
        stats: { mania: 3, vitesse: 180, accel: 15, structure: 14, blindage: 10, pilote: 2, senseurs: 2 } },
      { match: /SUZUKI\ SPORSTER/i, name: "Suzuki Sporster", kind: "vehicule",
        stats: { mania: 3, vitesse: 140, accel: 15, structure: 12, blindage: 6, pilote: 2, senseurs: 1 } },
      { match: /SUZUKI\ \(Minivan\)/i, name: "Suzuki Sporster (Minivan)", kind: "vehicule",
        stats: { mania: 3, vitesse: 140, accel: 15, structure: 12, blindage: 6, pilote: 2, senseurs: 1 } },
      { match: /TOYOTA\ ADVENTURE/i, name: "Toyota Adventure", kind: "vehicule",
        stats: { mania: 5, vitesse: 140, accel: 10, structure: 10, blindage: 6, pilote: 2, senseurs: 1 } },
      { match: /TOYOTA\ \(Minibus\)/i, name: "Toyota Adventure (Minibus)", kind: "vehicule",
        stats: { mania: 5, vitesse: 140, accel: 10, structure: 10, blindage: 6, pilote: 2, senseurs: 1 } },
      { match: /VOLKSWAGEN/i, name: "Volkswagen Superkombi Iv", kind: "vehicule",
        stats: { mania: 4, vitesse: 160, accel: 12, structure: 14, blindage: 8, pilote: 2, senseurs: 1 } },
      { match: /BMW\-KRUPP/i, name: "Bmw-Krupp Demon", kind: "vehicule",
        stats: { mania: 4, vitesse: 270, accel: 30, structure: 5, blindage: 5, pilote: 2, senseurs: 3 } },
      { match: /CHRYSLER\-NISSAN/i, name: "Chrysler-Nissan G12C", kind: "vehicule",
        stats: { mania: 4, vitesse: 160, accel: 12, structure: 12, blindage: 8, pilote: 2, senseurs: 1 } },
      { match: /ESSY/i, name: "Essy Motors Blue Raptor", kind: "vehicule",
        stats: { mania: 6, vitesse: 280, accel: 40, structure: 6, blindage: 2, pilote: 2, senseurs: 3 } },
      { match: /GMC\ VACATIONER/i, name: "Gmc Vacationer Iii", kind: "vehicule",
        stats: { mania: 4, vitesse: 200, accel: 20, structure: 10, blindage: 4, pilote: 2, senseurs: 2 } },
      { match: /GMC\ PATROLLER/i, name: "Gmc Patroller", kind: "vehicule",
        stats: { mania: 3, vitesse: 220, accel: 22, structure: 12, blindage: 8, pilote: 2, senseurs: 2 } },
      { match: /ARES/i, name: "Ares Army-Master", kind: "vehicule",
        stats: { mania: 5, vitesse: 120, accel: 10, structure: 22, blindage: 18, pilote: 3, senseurs: 3 } },
      { match: /BAE\ CENTURION/i, name: "Bae Centurion Ii Mbt", kind: "vehicule",
        stats: { mania: 5, vitesse: 150, accel: 20, structure: 24, blindage: 20, pilote: 3, senseurs: 3 } },
      { match: /FERRARI/i, name: "Ferrari Appaloosa", kind: "vehicule",
        stats: { mania: 3, vitesse: 220, accel: 22, structure: 20, blindage: 18, pilote: 3, senseurs: 4 } },
      { match: /CAS\/GENERAL/i, name: "Cas/General Dynamics Macarthur", kind: "vehicule",
        stats: { mania: 5, vitesse: 160, accel: 25, structure: 26, blindage: 20, pilote: 3, senseurs: 4 } },
      { match: /GENERAL/i, name: "General Dynamics Flyer-90", kind: "vehicule",
        stats: { mania: 3, vitesse: 170, accel: 20, structure: 12, blindage: 6, pilote: 3, senseurs: 1 } },
      { match: /GMC\ CHARIOT/i, name: "Gmc Chariot", kind: "vehicule",
        stats: { mania: 6, vitesse: 100, accel: 10, structure: 16, blindage: 12, pilote: 3, senseurs: 4 } },
      { match: /GMC\ TROOPER/i, name: "Gmc Trooper Gpmv", kind: "vehicule",
        stats: { mania: 3, vitesse: 150, accel: 20, structure: 14, blindage: 10, pilote: 3, senseurs: 1 } },
      { match: /HONDA\-GM/i, name: "Honda-Gm Diamondback", kind: "vehicule",
        stats: { mania: 1, vitesse: 250, accel: 30, structure: 16, blindage: 12, pilote: 3, senseurs: 3 } },
      { match: /THUNDERCLOUD/i, name: "Thundercloud Morgan Vi", kind: "vehicule",
        stats: { mania: 2, vitesse: 220, accel: 32, structure: 8, blindage: 6, pilote: 3, senseurs: 1 } },
      { match: /THUNDERCLOUD\ V2/i, name: "Thundercloud Morgan V2", kind: "vehicule",
        stats: { mania: 3, vitesse: 210, accel: 31, structure: 12, blindage: 10, pilote: 3, senseurs: 2 } },
      { match: /BMW\ SUPER\-BUG/i, name: "Bmw Super-Bug", kind: "vehicule",
        stats: { mania: 1, vitesse: 160, accel: 15, structure: 8, blindage: 6, pilote: 3, senseurs: 5 } },
      { match: /SPINRAD/i, name: "Spinrad Global Street Rocket Ex", kind: "vehicule",
        stats: { mania: 4, vitesse: 90, accel: 10, structure: 3, blindage: 1, pilote: 3, senseurs: 1 } },
      { match: /BAE\ SYSTEMS/i, name: "Bae Systems Atlantic/Pacific 28", kind: "vehicule",
        stats: { mania: 3, vitesse: 60, accel: 15, structure: 8, blindage: 5, pilote: 2, senseurs: 2 } },
      { match: /KAWASAKI/i, name: "Kawasaki Stingray", kind: "vehicule",
        stats: { mania: 4, vitesse: 110, accel: 22, structure: 7, blindage: 3, pilote: 2, senseurs: 1 } },
      { match: /KAWASAKI\ RAY/i, name: "Kawasaki Manta Ray", kind: "vehicule",
        stats: { mania: 5, vitesse: 110, accel: 20, structure: 8, blindage: 3, pilote: 2, senseurs: 1 } },
      { match: /MITSUBISHI\ WATERBUG/i, name: "Mitsubishi Waterbug", kind: "vehicule",
        stats: { mania: 3, vitesse: 80, accel: 15, structure: 5, blindage: 3, pilote: 2, senseurs: 1 } },
      { match: /MITSUBISHI\ WAVESKIPPER/i, name: "Mitsubishi Waveskipper", kind: "vehicule",
        stats: { mania: 4, vitesse: 80, accel: 15, structure: 6, blindage: 3, pilote: 2, senseurs: 1 } },
      { match: /SEA\ RAY/i, name: "Sea Ray Cottonmouth", kind: "vehicule",
        stats: { mania: 5, vitesse: 180, accel: 30, structure: 8, blindage: 4, pilote: 2, senseurs: 3 } },
      { match: /ZODIAC/i, name: "Zodiac Whisper", kind: "vehicule",
        stats: { mania: 3, vitesse: 50, accel: 15, structure: 5, blindage: 4, pilote: 2, senseurs: 0 } },
      { match: /CORSAIR/i, name: "Corsair Elysium", kind: "vehicule",
        stats: { mania: 3, vitesse: 20, accel: 10, structure: 0, blindage: 0, pilote: 2, senseurs: 0 } },
      { match: /CORSAIR\ ELLIPSE/i, name: "Corsair Ellipse", kind: "vehicule",
        stats: { mania: 3, vitesse: 20, accel: 8, structure: 12, blindage: 9, pilote: 2, senseurs: 2 } },
      { match: /CORSAIR\ PANTHER/i, name: "Corsair Panther", kind: "vehicule",
        stats: { mania: 3, vitesse: 30, accel: 10, structure: 14, blindage: 9, pilote: 2, senseurs: 2 } },
      { match: /CORSAIR\ PUMA/i, name: "Corsair Puma", kind: "vehicule",
        stats: { mania: 2, vitesse: 30, accel: 10, structure: 16, blindage: 0, pilote: 2, senseurs: 3 } },
      { match: /CORSAIR\ TRIDENT/i, name: "Corsair Trident", kind: "vehicule",
        stats: { mania: 3, vitesse: 30, accel: 15, structure: 16, blindage: 9, pilote: 2, senseurs: 2 } },
      { match: /CORSAIR\ TRITON/i, name: "Corsair Triton", kind: "vehicule",
        stats: { mania: 3, vitesse: 30, accel: 10, structure: 16, blindage: 0, pilote: 2, senseurs: 2 } },
      { match: /HORIZON/i, name: "Horizon Freedom", kind: "vehicule",
        stats: { mania: 3, vitesse: 10, accel: 7, structure: 4, blindage: 3, pilote: 2, senseurs: 0 } },
      { match: /CUTTY/i, name: "Cutty Sark Ii", kind: "vehicule",
        stats: { mania: 5, vitesse: 30, accel: 10, structure: 36, blindage: 12, pilote: 2, senseurs: 0 } },
      { match: /EVO\ AQUAVIDA/i, name: "Evo Aquavida", kind: "vehicule",
        stats: { mania: 5, vitesse: 20, accel: 2, structure: 14, blindage: 10, pilote: 2, senseurs: 2 } },
      { match: /EVO\ AQUAVIDA\ 2/i, name: "Evo Aquavida 2", kind: "vehicule",
        stats: { mania: 5, vitesse: 20, accel: 2, structure: 16, blindage: 10, pilote: 2, senseurs: 2 } },
      { match: /EVO\ WATERKING/i, name: "Evo Waterking", kind: "vehicule",
        stats: { mania: 4, vitesse: 25, accel: 2, structure: 18, blindage: 10, pilote: 2, senseurs: 3 } },
      { match: /MAERSK/i, name: "Maersk Shipyards Mpac Wavecutter", kind: "vehicule",
        stats: { mania: 4, vitesse: 100, accel: 4, structure: 24, blindage: 20, pilote: 2, senseurs: 2 } },
      { match: /CORVETTE/i, name: "Corvette De Classe Cipactli", kind: "vehicule",
        stats: { mania: 4, vitesse: 0, accel: 15, structure: 54000, blindage: 0, pilote: 3, senseurs: 4 } },
      { match: /CARGO/i, name: "Cargo Super Lourd Maersk (Double L)", kind: "vehicule",
        stats: { mania: 6, vitesse: 40, accel: 4, structure: 70, blindage: 12, pilote: 3, senseurs: 4 } },
      { match: /LURSSEN/i, name: "Lurssen Mobius", kind: "vehicule",
        stats: { mania: 4, vitesse: 50, accel: 10, structure: 36, blindage: 14, pilote: 3, senseurs: 6 } },
      { match: /MV\ POSEIDON'S/i, name: "Mv Poseidon'S Endeavour", kind: "vehicule",
        stats: { mania: 4, vitesse: 50, accel: 12, structure: 40, blindage: 18, pilote: 3, senseurs: 4 } },
      { match: /NAVIRE\-USINE/i, name: "Navire-Usine", kind: "vehicule",
        stats: { mania: 0, vitesse: 20, accel: 0, structure: 90, blindage: 0, pilote: 3, senseurs: 4 } },
      { match: /CROISEUR/i, name: "Croiseur Classe Ranger", kind: "vehicule",
        stats: { mania: 5, vitesse: 70, accel: 12, structure: 60, blindage: 45, pilote: 3, senseurs: 6 } },
      { match: /TRANQUILITY/i, name: "Tranquility Princess", kind: "vehicule",
        stats: { mania: 3, vitesse: 40, accel: 8, structure: 34, blindage: 16, pilote: 3, senseurs: 4 } },
    ],
  },

  /* VD standard des armes embarquées, par édition. V1 (findings §11,
     statblocks §Rigger/Soldat) : pas de PA, VD imprimée directement. */
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

  spawn(owner, itemStr, edition) {
    const parsed = this.matchItem(itemStr, edition);
    if (!parsed) return [];
    const out = [];
    for (let i = 0; i < parsed.count; i++) {
      const v = {
        id: Utils.uid(),
        type: "vehicle",
        kind: parsed.kind,
        edition,
        name: parsed.count > 1 ? `${parsed.name} #${i + 1}` : parsed.name,
        ownerId: owner.id,
        ownerName: owner.name || owner.archetype || "PNJ",
        srcItem: itemStr,
        stats: { ...parsed.stats },
        weapons: parsed.weapons.map((w) => ({ ...w })),
        rrNotes: parsed.rrNotes,
        notes: "",
        deployed: true,
      };
      if (App.getEditionModule(edition).conditionMonitor.vehicleFields === "thresholds") {
        v.legerFilled = 0;
        v.graveFilled = 0;
        v.incapFilled = 0;
      } else {
        v.monTotal = this._monitor(parsed.stats, edition);
        v.monFilled = 0;
      }
      out.push(v);
    }
    return out;
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
