#!/usr/bin/env node
/**
 * ============================================================
 *  LA CARTE DE LA SAISON — le bloc CARTE-SAISON d'index.html
 * ============================================================
 *  POURQUOI
 *  --------
 *  La saison d'un regard (onglet Dates) dit QUAND Adrien joue ; la
 *  carte dit OÙ : la Normandie, les villes de tournée, et ce qui en
 *  sort (Saint-Quentin, Guyancourt). En SVG, dans la page, sans aucun
 *  service de carte externe — ni tuiles, ni clé, ni adresse IP envoyée.
 *
 *  CE QU'IL FAIT
 *  -------------
 *  Il relit le fond préparé une fois pour toutes
 *  (build/donnees/carte-base.json, voir preparer-fond-de-carte.py) et
 *  dates.js, puis écrit entre les repères CARTE-SAISON d'index.html un
 *  bloc JSON : les contours des trois régions, projetés et tracés, et la
 *  place de chaque ville de la saison. La page (dlCarte, dans index.html)
 *  y pose ses points avec les dates du moment, celles de Supabase
 *  comprises : une ville déjà connue de la table s'affiche aussitôt ; une
 *  ville nouvelle attend la prochaine régénération (comme dates.ics).
 *
 *  QUAND IL TOURNE
 *  ---------------
 *  À chaque `npm run pages` (le générateur des pages l'appelle), donc à
 *  chaque date ajoutée selon CLAUDE.md. Seul :
 *
 *      node build/fabriquer-carte.js
 *
 *  Déterministe : même dates.js, même bloc, octet pour octet.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const RACINE = path.join(__dirname, '..');
const BASE = path.join(__dirname, 'donnees', 'carte-base.json');
const INDEX = path.join(RACINE, 'index.html');
const DEBUT = '<!-- CARTE-SAISON:DEBUT -->';
const FIN = '<!-- CARTE-SAISON:FIN -->';
const LARGEUR = 400;

// La même clé que le site (dlCleVille, index.html) : sans accents, en
// minuscules, la ponctuation réduite à des espaces.
function cle(nom) {
    return String(nom || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
        .replace(/œ/g, 'oe').replace(/[^a-z0-9]+/g, ' ').trim();
}

// « Tribunal judiciaire de Rouen (76) » → « 76 ».
function departement(lieu) {
    const m = String(lieu || '').match(/\((\d{2,3}|2[AB])\)\s*$/);
    return m ? m[1].padStart(2, '0') : '';
}

function chargerDates() {
    const src = fs.readFileSync(path.join(RACINE, 'dates.js'), 'utf8');
    return new Function(src + '\nreturn SHOW_DATA;')();
}

// La commune, dans la table de son département : le nom exact, sinon le
// début d'un nom plus long (« Cherbourg » → « Cherbourg-en-Cotentin »,
// la commune nouvelle de 2016).
function trouver(communes, dep, ville) {
    const table = communes[dep];
    if (!table) return null;
    const k = cle(ville);
    if (table[k]) return table[k];
    const debut = Object.keys(table).filter((n) => n.startsWith(k + ' ')).sort((a, b) => a.length - b.length)[0];
    return debut ? table[debut] : null;
}

function bloc() {
    const base = JSON.parse(fs.readFileSync(BASE, 'utf8'));
    // L'emprise des trois régions, en projection équirectangulaire posée
    // sur le 49,5e parallèle : à cette échelle, la Normandie garde sa forme.
    const tous = base.regions.flatMap((r) => r.points);
    const lonMin = Math.min(...tous.map((p) => p[0])), lonMax = Math.max(...tous.map((p) => p[0]));
    const latMin = Math.min(...tous.map((p) => p[1])), latMax = Math.max(...tous.map((p) => p[1]));
    const k = Math.cos(49.5 * Math.PI / 180);
    const echelle = LARGEUR / ((lonMax - lonMin) * k);
    const hauteur = Math.round((latMax - latMin) * echelle);
    const projeter = ([lon, lat]) => [+(((lon - lonMin) * k * echelle).toFixed(1)), +(((latMax - lat) * echelle).toFixed(1))];
    const regions = base.regions.map((r) => ({
        nom: r.nom,
        d: 'M' + r.points.map(projeter).map(([x, y]) => `${x} ${y}`).join('L') + 'Z'
    }));
    const villes = {};
    const manquantes = [];
    (chargerDates().upcoming || []).forEach((e) => {
        const dep = departement(e.location);
        const ville = e.city || '';
        if (!dep || !ville) return;
        const point = trouver(base.communes, dep, ville);
        if (point) villes[`${cle(ville)}|${dep}`] = projeter(point);
        else manquantes.push(`${ville} (${dep})`);
    });
    const tri = Object.fromEntries(Object.entries(villes).sort(([a], [b]) => (a < b ? -1 : 1)));
    const donnees = { l: LARGEUR, h: hauteur, regions, villes: tri, source: 'IGN, Admin Express — Licence ouverte' };
    return { donnees, manquantes };
}

function ecrire() {
    const { donnees, manquantes } = bloc();
    const html = fs.readFileSync(INDEX, 'utf8');
    const i = html.indexOf(DEBUT), j = html.indexOf(FIN);
    if (i === -1 || j === -1) throw new Error(`index.html : repères ${DEBUT} / ${FIN} introuvables`);
    // Le JSON est écrit dans un <script type="application/json"> : « </ »
    // y est échappé, comme dans les données structurées (voir jsonLd).
    const json = JSON.stringify(donnees).replace(/</g, '\\u003c');
    const nouveau = `${DEBUT}\n    <script type="application/json" id="carte-saison">${json}</script>\n    `;
    const sortie = html.slice(0, i) + nouveau + html.slice(j);
    const change = sortie !== html;
    if (change) fs.writeFileSync(INDEX, sortie);
    const n = Object.keys(donnees.villes).length;
    console.log(`  carte de la saison : ${n} ville(s)${manquantes.length ? `, introuvable(s) : ${manquantes.join(', ')}` : ''}${change ? '' : ' (inchangée)'}`);
    return { n, manquantes };
}

module.exports = { bloc, ecrire, cle };

if (require.main === module) {
    try {
        ecrire();
    } catch (e) {
        console.error('  ARRÊT —', e.message);
        process.exit(1);
    }
}
