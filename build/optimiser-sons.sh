#!/usr/bin/env bash
#
# OPTIMISATION DES DÉMOS VOIX
# ===========================
# Les fichiers livrés par les studios sont des masters : 320 kbps CBR, stéréo,
# 48 kHz. C'est ce qu'il faut pour archiver, pas pour écouter dans un couloir
# de théâtre en 4G. Ce script produit la version web, et rien d'autre —
# GARDE TES MASTERS AILLEURS QUE DANS CE DÉPÔT.
#
# Deux traitements, selon ce que le fichier contient réellement :
#
#   MONO      pour les enregistrements dont les deux canaux sont identiques
#             (voix seule, sans habillage). Les garder en stéréo, c'est
#             transporter deux fois la même chose. Vérifié avant, pas supposé :
#               ffmpeg -i f.mp3 -af "pan=mono|c0=0.5*c0-0.5*c1,volumedetect" -f null -
#             Un max_volume sous -80 dB = les canaux sont jumeaux.
#
#   STÉRÉO    pour les publicités et les documentaires, qui ont une nappe
#             musicale et un placement dans l'espace. Les replier en mono
#             abîmerait le travail du studio. On baisse le débit, on garde
#             l'image stéréo.
#
# Le VBR (-q:a) est préféré au débit fixe : il dépense là où ça s'entend
# (les attaques de consonnes) et économise sur les silences — ce dont une
# démo voix est largement faite.
#
# Usage : bash build/optimiser-sons.sh
#
set -euo pipefail
cd "$(dirname "$0")/.."

# Un fichier par ligne. Le préfixe dit le traitement.
# mono|chemin      → repli mono, 96 kbps
# stereo|chemin    → stéréo conservée, VBR ~130 kbps
FICHIERS=(
  "mono|ressources/sons/Coachs_associes/VADA - Audiobook Les enfants du fleuve.mp3"
  "stereo|ressources/sons/Coachs_associes/VADA - Play Off NBA Jeunes.mp3"
  "stereo|ressources/sons/Coachs_associes/VADA - Publicité espoir espiegle Se Loger.mp3"
  "stereo|ressources/sons/Coachs_associes/VADA - Publicité intime droit UBER.mp3"
  "stereo|ressources/sons/Docu animalier.mp3"
  "stereo|ressources/sons/VADA - Publicité L'Oréal.mp3"
  "stereo|ressources/sons/VADA - Publicité Nexity.mp3"
)

total_avant=0
total_apres=0

for entree in "${FICHIERS[@]}"; do
  mode="${entree%%|*}"
  fichier="${entree#*|}"

  if [ ! -f "$fichier" ]; then
    echo "  ABSENT — $fichier" >&2
    continue
  fi

  avant=$(stat -c%s "$fichier")
  tmp="${fichier%.mp3}.tmp.mp3"

  if [ "$mode" = "mono" ]; then
    ffmpeg -nostdin -v error -y -i "$fichier" \
      -ac 1 -c:a libmp3lame -b:a 96k \
      -map_metadata 0 -id3v2_version 3 "$tmp"
  else
    ffmpeg -nostdin -v error -y -i "$fichier" \
      -c:a libmp3lame -q:a 5 \
      -map_metadata 0 -id3v2_version 3 "$tmp"
  fi

  mv -f "$tmp" "$fichier"
  apres=$(stat -c%s "$fichier")

  total_avant=$((total_avant + avant))
  total_apres=$((total_apres + apres))
  printf '  %-7s %5.1f Mo → %4.1f Mo   %s\n' \
    "$mode" "$(echo "scale=2;$avant/1048576" | bc)" \
    "$(echo "scale=2;$apres/1048576" | bc)" "$(basename "$fichier")"
done

printf '\n  TOTAL  %.1f Mo → %.1f Mo  (%.0f %% en moins)\n' \
  "$(echo "scale=2;$total_avant/1048576" | bc)" \
  "$(echo "scale=2;$total_apres/1048576" | bc)" \
  "$(echo "scale=2;100-100*$total_apres/$total_avant" | bc)"
