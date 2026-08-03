/** Configuration Tailwind — sert à générer styles.css (voir README-build.md)
 *
 *  THÈMES : toutes les couleurs pointent vers des variables CSS définies dans
 *  le <style> de index.html, en triplets « R V B » (et non en #hex) afin que
 *  les modificateurs d'opacité de Tailwind — border-stone-200/60, bg-black/25… —
 *  continuent de fonctionner via la syntaxe rgb(... / <alpha-value>).
 *
 *  L'échelle `stone` est elle-même redéfinie : le site l'utilisait partout en
 *  dur (bordures, surfaces, texte). En la faisant passer par des variables,
 *  le basculement clair/sombre se fait sans toucher au balisage. En thème
 *  sombre, l'échelle s'inverse : stone-50 devient la surface la plus sombre
 *  et stone-800 le texte le plus clair.
 */
const c = (v) => `rgb(var(${v}) / <alpha-value>)`;

module.exports = {
    content: ['./index.html', './404.html', './dates.js', './galerie.js', './intro.js', './mask-points.js'],
    theme: {
        extend: {
            fontFamily: {
                cinzel: ['Cinzel', 'serif'],
                inter: ['Inter', 'sans-serif'],
                montserrat: ['Montserrat', 'sans-serif'],
            },
            colors: {
                stone: {
                    50: c('--c-s50'),
                    100: c('--c-s100'),
                    200: c('--c-s200'),
                    300: c('--c-s300'),
                    400: c('--c-s400'),
                    500: c('--c-s500'),
                    600: c('--c-s600'),
                    700: c('--c-s700'),
                    800: c('--c-s800'),
                },
                luxury: {
                    bg: c('--c-bg'),
                    surface: c('--c-surface'),
                    textMain: c('--c-text'),
                    textMuted: c('--c-muted'),
                    gold: c('--c-gold'),
                    goldLight: c('--c-gold-light'),
                    // Nuance foncée reservee aux PETITS textes en theme clair :
                    // l'or de marque n'y passe pas le contraste AA sous 18px.
                    goldInk: c('--c-gold-ink'),
                    // Etat survole des boutons dores
                    goldDeep: c('--c-gold-deep'),
                    // Texte posé SUR un aplat doré : blanc en clair, quasi noir
                    // en sombre (l'or y est plus lumineux).
                    onGold: c('--c-on-gold'),
                    // Rayure une ligne sur deux des listes
                    stripe: 'var(--c-stripe)',
                    // Avertissements (réservations non ouvertes, séances scolaires)
                    warn: c('--c-warn'),
                },
            },
        },
    },
    plugins: [],
}
