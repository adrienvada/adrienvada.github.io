#!/usr/bin/env node
/**
 * ============================================================
 *  LES ONDES DE LA VOIX — MP3 → data-onde (index.html)
 * ============================================================
 *  Chaque démo voix montre la forme de son enregistrement : on voit
 *  la voix monter, respirer, se poser, avant même d'écouter. La forme
 *  n'est PAS calculée chez le visiteur — il faudrait télécharger et
 *  décoder chaque fichier (jusqu'à 3 Mo) pour dessiner une barre. Elle
 *  l'est ici, une fois, par le Chromium des vérifications, qui décode
 *  les MP3 exactement comme un navigateur.
 *
 *  Pour chaque <audio id="audio-…"> de l'onglet Démos voix, le script
 *  écrit sur sa barre de lecture ([data-audio-seek="audio-…"]) :
 *    · data-onde  : 200 niveaux, un caractère chacun (0-9 puis a-z,
 *                   de 0 à 35) — l'énergie de la voix, tranche par
 *                   tranche, adoucie (puissance 0,8) pour que les
 *                   passages murmurés restent visibles ;
 *    · data-duree : la durée, en secondes — la barre peut dire le
 *                   temps au survol avant que le fichier soit chargé.
 *  200 octets par démo. Relancé, il réécrit les mêmes attributs.
 *
 *  À LANCER quand une démo voix est ajoutée ou remplacée :
 *
 *      node build/ondes.js        (ou npm --prefix build run ondes)
 *
 *  Voir README-build.md, « Démos voix — les ondes ».
 * ============================================================
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { servir } = require('./serveur-local');

const RACINE = path.resolve(__dirname, '..');
const INDEX = path.join(RACINE, 'index.html');
const NIVEAUX = 200;
const CHIFFRES = '0123456789abcdefghijklmnopqrstuvwxyz';

async function main() {
    const { chromium } = require('playwright');
    let html = fs.readFileSync(INDEX, 'utf8');

    // Les démos : chaque <audio id="audio-…" src="…">, attributs sur une
    // ou plusieurs lignes.
    const demos = [...html.matchAll(/<audio\s+id="(audio-[^"]+)"\s+src="([^"]+)"/g)]
        .map(m => ({ id: m[1], src: m[2] }));
    if (!demos.length) throw new Error('aucune démo voix trouvée dans index.html');

    const { serveur, base } = await servir(RACINE);
    const navigateur = await chromium.launch();
    try {
        const page = await navigateur.newPage();
        await page.goto(base + '/404.html');
        for (const d of demos) {
            const r = await page.evaluate(async ([src, n]) => {
                const donnees = await (await fetch('/' + src)).arrayBuffer();
                const ctx = new OfflineAudioContext(1, 44100, 44100);
                const son = await ctx.decodeAudioData(donnees);
                const canaux = [];
                for (let c = 0; c < son.numberOfChannels; c++) canaux.push(son.getChannelData(c));
                const pas = Math.floor(son.length / n);
                const rms = [];
                for (let i = 0; i < n; i++) {
                    let s = 0;
                    for (const ch of canaux) for (let j = i * pas; j < (i + 1) * pas; j++) s += ch[j] * ch[j];
                    rms.push(Math.sqrt(s / (pas * canaux.length)));
                }
                return { duree: son.duration, rms };
            }, [d.src, NIVEAUX]);
            const max = Math.max(...r.rms) || 1;
            d.onde = r.rms.map(v => CHIFFRES[Math.round(Math.pow(v / max, 0.8) * 35)]).join('');
            d.duree = r.duree.toFixed(1);
        }
    } finally {
        await navigateur.close();
        serveur.close();
    }

    for (const d of demos) {
        const re = new RegExp(`<div data-audio-seek="${d.id}"([^>]*)>`);
        const m = html.match(re);
        if (!m) throw new Error(`pas de barre de lecture pour ${d.id}`);
        const attrs = m[1].replace(/\s+data-onde="[^"]*"/, '').replace(/\s+data-duree="[^"]*"/, '');
        html = html.replace(re, `<div data-audio-seek="${d.id}" data-duree="${d.duree}"\n                                    data-onde="${d.onde}"${attrs}>`);
        console.log(`  ${d.id.padEnd(24)} ${d.duree.padStart(6)} s`);
    }
    fs.writeFileSync(INDEX, html);
    console.log(`${demos.length} onde(s) écrite(s) dans index.html`);
}

main().catch(e => { console.error(e); process.exit(1); });
