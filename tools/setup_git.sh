#!/usr/bin/env bash
# Enregistre le pilote de merge « vbump » dans le git config LOCAL de ce clone.
# À lancer une seule fois après un clone (la config git n'est pas versionnée) :
#   tools/setup_git.sh
#
# Il branche tools/merge_version.py sur les fichiers marqués `merge=vbump`
# dans .gitattributes (index.html, js/app.js) : les conflits de `?v=` de
# cache-busting se résolvent alors tout seuls au merge/rebase.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

git config merge.vbump.name "Neutralise les ?v= de cache-busting avant merge"
git config merge.vbump.driver "python3 tools/merge_version.py %O %A %B"

echo "Pilote de merge 'vbump' enregistré pour ce clone."
echo "Fichiers concernés (.gitattributes) :"
grep -E 'merge=vbump' .gitattributes || echo "  (aucun — vérifie .gitattributes)"
