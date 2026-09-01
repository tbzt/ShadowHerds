#!/usr/bin/env python3
"""Serveur de vérification locale — le seul qui ne mente pas sur ce qu'il sert.

    python3 outils/servir.py [port]        (défaut : 8800)

`python -m http.server` n'envoie AUCUN en-tête de cache. Le navigateur applique
alors son cache heuristique, et sert des fichiers périmés sans le dire. Sur ce
dépôt, ça produit trois symptômes déjà rencontrés, tous coûteux parce qu'ils
ressemblent à des bugs de code :

  · une règle CSS absente du CSSOM alors qu'elle est bien sur le disque
    (mesuré : forms.css rendu à 67 règles au lieu de 71) ;
  · un module ES qui exécute l'ancienne version — et les imports d'un module
    sont relatifs, donc INBUSTABLES par un ?v= sur la balise <script> ;
  · le même mensonge sur un AUTRE PORT : le cache du navigateur n'est pas
    toujours partitionné par origine, donc « changer de port » ne suffit pas.

Ici, `Cache-Control: no-store` sur chaque réponse. Ce qui est servi est ce qui
est sur le disque, toujours, sans Ctrl+Shift+R et sans réécrire d'URL.

À n'utiliser QUE pour vérifier : `no-store` désactive tout cache, la page est
donc plus lente à charger qu'en conditions réelles. Pour mesurer des temps de
chargement, prendre `python -m http.server`.
"""
import functools
import http.server
import os
import sys

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8800


class SansCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def log_message(self, *a):
        pass  # le bruit de requêtes noie la sortie utile pendant une vérif


if __name__ == "__main__":
    srv = http.server.ThreadingHTTPServer(
        ("", PORT), functools.partial(SansCache, directory=RACINE))
    print(f"\n  ShadowHerds servi SANS CACHE sur http://localhost:{PORT}/")
    print(f"  racine : {RACINE}")
    print("  Ctrl+C pour arrêter.\n")
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        print("  arrêté.\n")
