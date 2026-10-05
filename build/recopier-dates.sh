#!/usr/bin/env bash
# ============================================================
#  RECOPIER LES DATES — ce que fait le workflow du même nom
# ============================================================
#  La base Supabase fait foi ; dates.js en garde une copie, d'où sont
#  tirés dates.ics, les pages spectacle, le sitemap et la carte de la
#  saison. Ce script les remet à jour, en trois temps que le workflow
#  (.github/workflows/recopier-dates.yml) appelle un par un :
#
#    build/recopier-dates.sh exporter    la base → dates.js ; dit s'il a changé
#    build/recopier-dates.sh fabriquer   pages, sitemap, dates.ics, carte
#    build/recopier-dates.sh publier     commit sur main, poussée, publication
#
#  ESSAI=1 : l'essai à blanc des PR qui touchent la copie. dates.js est
#  d'abord vieilli exprès (son bloc généré vidé), puis tout est refait et
#  committé sur place ; rien n'est poussé, rien n'est publié.
#
#  Hors de GitHub (sans GITHUB_OUTPUT ni GITHUB_STEP_SUMMARY), ce qu'il
#  dirait au workflow part dans /dev/null : `ESSAI=1 build/recopier-dates.sh
#  exporter`, puis `fabriquer`, se lancent aussi sur une machine.
# ============================================================
set -euo pipefail
cd "$(dirname "$0")/.."

SORTIE=${GITHUB_OUTPUT:-/dev/null}
RESUME=${GITHUB_STEP_SUMMARY:-/dev/null}
TRAVAIL=${RUNNER_TEMP:-${TMPDIR:-/tmp}}/recopier-dates
mkdir -p "$TRAVAIL"

# Ce qu'un passage a le droit de changer : la copie et ce qui en est tiré.
ATTENDUS='^(dates\.js|dates\.ics|sitemap\.xml|index\.html|spectacles/|galerie/)'
ROBOT='github-actions[bot]'
ROBOT_MAIL='41898282+github-actions[bot]@users.noreply.github.com'

exporter() {
    if [ "${ESSAI:-}" = 1 ]; then
        echo "Essai à blanc : la copie est vidée, pour être refaite."
        node -e '
            const fs = require("fs"), s = fs.readFileSync("dates.js", "utf8");
            const a = s.indexOf("\n", s.indexOf("⇊ GÉNÉRÉ")) + 1, b = s.indexOf("    // ⇈ FIN");
            if (a < 1 || b < a) throw new Error("repères introuvables");
            fs.writeFileSync("dates.js", s.slice(0, a) + s.slice(b));'
    fi
    local code=0
    node build/exporter-dates.js > "$TRAVAIL/export.txt" 2>&1 || code=$?
    cat "$TRAVAIL/export.txt"
    if [ "$code" = 2 ]; then
        # Une panne de la base, pas de la copie : le site garde la sienne,
        # le passage suivant réessaiera. Pas un échec du workflow.
        echo "::warning title=Base injoignable::La base n'a pas répondu : rien n'a été recopié. Le prochain passage réessaiera."
        echo "etat=injoignable" >> "$SORTIE"
        echo "La base n'a pas répondu : rien n'a été recopié, le prochain passage réessaiera." >> "$RESUME"
        return 0
    fi
    [ "$code" = 0 ] || return "$code"
    if git diff --quiet -- dates.js; then
        echo "etat=inchangee" >> "$SORTIE"
        echo "Rien à recopier : la copie du site est déjà celle de la base." >> "$RESUME"
        return 0
    fi
    echo "etat=changee" >> "$SORTIE"
}

fabriquer() {
    # Les générateurs n'ont besoin que de Node : rien à installer.
    npm --prefix build run pages 2>&1 | tee "$TRAVAIL/pages.txt"
    local villes inattendus
    villes=$(sed -n 's/.*introuvable(s) : \(.*\)$/\1/p' "$TRAVAIL/pages.txt" | sed 's/ (inchangée)$//')
    if [ -n "$villes" ]; then
        echo "::warning title=Carte de la saison::Sans place sur la carte : $villes. Faute de frappe dans la base, ou ville hors des trois régions : la date est en ligne, seule la carte ne la montre pas."
        printf 'Sans place sur la carte de la saison : %s.\n\n' "$villes" >> "$RESUME"
    fi
    inattendus=$(git -c core.quotePath=false status --porcelain --untracked-files=all | cut -c4- | sed 's/^"//' | grep -v -E "$ATTENDUS" || true)
    if [ -n "$inattendus" ]; then
        echo "::error title=Fichiers inattendus::La copie a changé autre chose que les dates et ce qui en est tiré : $(echo "$inattendus" | tr '\n' ' ')"
        return 1
    fi
    git status --short
}

publier() {
    local detail titre n morceaux=() depart
    detail=$(grep -E '^  [-+~] ' "$TRAVAIL/export.txt" || true)
    n=$(grep -c '^  + ' <<< "$detail" || true)
    [ "$n" -gt 0 ] && morceaux+=("$n ajoutée$([ "$n" -gt 1 ] && echo s)")
    n=$(grep -c '^  ~ ' <<< "$detail" || true)
    [ "$n" -gt 0 ] && morceaux+=("$n modifiée$([ "$n" -gt 1 ] && echo s)")
    n=$(grep -c '^  - ' <<< "$detail" || true)
    [ "$n" -gt 0 ] && morceaux+=("$n retirée$([ "$n" -gt 1 ] && echo s)")
    titre="Dates : copie de la base"
    if [ ${#morceaux[@]} -gt 0 ]; then
        titre="$titre ($(printf '%s, ' "${morceaux[@]}" | sed 's/, $//'))"
    fi

    depart=$(git rev-parse HEAD)
    git add -A -- dates.js dates.ics sitemap.xml index.html spectacles galerie
    GIT_AUTHOR_NAME=$ROBOT GIT_AUTHOR_EMAIL=$ROBOT_MAIL GIT_COMMITTER_NAME=$ROBOT GIT_COMMITTER_EMAIL=$ROBOT_MAIL \
        git commit -q -m "$titre" -m "${detail:-(sans détail)}" \
        -m "Recopié par le workflow « Recopier les dates » : la base Supabase fait foi ; cette copie sert l'agenda à s'abonner (dates.ics), la version sans JavaScript, le référencement et la carte de la saison."
    git --no-pager show --stat --format='%s%n%n%b' HEAD

    {
        echo "### $titre"
        echo
        echo '```'
        echo "${detail:-(sans détail)}"
        echo '```'
        echo
    } >> "$RESUME"

    if [ "${ESSAI:-}" = 1 ]; then
        echo "Essai à blanc : rien n'est poussé, rien n'est publié."
        echo "Essai à blanc : committé sur place, ni poussé ni publié." >> "$RESUME"
        return 0
    fi

    if ! git push -q origin HEAD:main; then
        git fetch -q origin main
        if [ "$(git rev-parse origin/main)" != "$depart" ]; then
            # Une PR fusionnée pendant la copie : le passage suivant la
            # refera, par-dessus. Rien de cassé, pas d'échec.
            echo "::warning title=Copie remise au prochain passage::main a bougé pendant la copie : le prochain passage la refera, par-dessus."
            echo "main a bougé pendant la copie : le prochain passage la refera." >> "$RESUME"
            return 0
        fi
        return 1
    fi
    # Une poussée faite avec le jeton d'un workflow ne déclenche pas les
    # autres workflows : la publication est lancée ici, nommément.
    gh workflow run publier.yml --ref main
    echo "Poussé sur main ; publication lancée." >> "$RESUME"
}

case "${1:-}" in
    exporter | fabriquer | publier) "$1" ;;
    *) echo "usage : $0 exporter|fabriquer|publier" >&2; exit 64 ;;
esac
