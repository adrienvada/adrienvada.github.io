/** Configuration Tailwind — sert à générer styles.css (voir README-build.md) */
module.exports = {
    content: ['./index.html', './404.html', './dates.js', './galerie.js'],
    theme: {
        extend: {
            fontFamily: {
                cinzel: ['Cinzel', 'serif'],
                inter: ['Inter', 'sans-serif'],
                montserrat: ['Montserrat', 'sans-serif'],
            },
            colors: {
                luxury: {
                    lightBg: '#FAF9F5',
                    cardBg: 'rgba(255, 255, 255, 0.8)',
                    textMain: '#1A1A1F',
                    textMuted: '#575761',
                    gold: '#967e5b',
                    goldLight: '#bfa98a',
                    // Nuance plus foncée réservée aux PETITS textes : l'or de marque
                    // ne passe pas le contraste AA (3.67:1) sous 18px. #826c4a = 4.75:1.
                    goldInk: '#826c4a',
                    // État survolé des boutons dorés : on FONCE (éclaircir ferait
                    // passer le texte blanc sous le seuil de contraste).
                    goldDeep: '#6b5839',
                }
            }
        }
    },
    plugins: [],
}
