#!/usr/bin/env node
/**
 * EXPORTER LES DATES — Supabase → dates.js
 * ------------------------------------------------------------------
 *  La table Supabase `representations` fait foi pour les dates à venir
 *  (voir supabase/schema.sql et /admin/). Ce script la recopie dans la
 *  partie « upcoming » de dates.js, entre les deux repères ⇊ ⇈.
 *
 *  POURQUOI GARDER dates.js, alors que le site lit la base en direct :
 *    · c'est le REPLI — si Supabase ne répond pas (projet gratuit en
 *      pause, panne), le visiteur voit cette copie ;
 *    · les pages spectacle (/spectacles/…) sont GÉNÉRÉES et lisent
 *      dates.js à la génération, pas la base ;
 *    · le PDF du CV aussi.
 *
 *  À LANCER avant un commit, dès qu'une date a changé dans /admin/ :
 *
 *      node build/exporter-dates.js
 *      node build/generer-pages-spectacles.js
 *
 *  Il ne touche ni à l'en-tête, ni à `currentSeasonTitle`, ni aux
 *  archives : tout ce qui est hors des repères reste à la main.
 * ------------------------------------------------------------------
 */
'use strict';

const fs = require('fs');
const path = require('path');

const RACINE = path.resolve(__dirname, '..');
const FICHIER = path.join(RACINE, 'dates.js');
const L = require(path.join(RACINE, 'dates-live.js'));

const DEBUT = '    // ⇊ GÉNÉRÉ — build/exporter-dates.js recopie ici la table Supabase. Ne pas éditer à la main. ⇊';
const FIN = '    // ⇈ FIN DE LA PARTIE GÉNÉRÉE ⇈';

// Une chaîne JS entre guillemets doubles, comme le reste du fichier.
const q = s => JSON.stringify(String(s ?? ''));

function soireeSource(r, retrait) {
    const t = ' '.repeat(retrait);
    return [
        `${t}{`,
        `${t}  dateLabel: ${q(r.dateLabel)},`,
        `${t}  time: ${q(r.time)},`,
        `${t}  bookingUrl: ${q(r.bookingUrl)},`,
        `${t}  isSchool: ${r.isSchool ? 'true' : 'false'},`,
        `${t}  icsDate: ${q(r.icsDate)}`,
        `${t}}`
    ].join('\n');
}

function entreeSource(e) {
    const titre = `    // ── ${e.dateLabel} : ${e.title} (${e.city}) [${e.type === 'series' ? 'Série' : 'Date unique'}] ──`;
    if (e.type === 'series') {
        return [
            titre,
            '    {',
            '      type: "series",',
            `      id: ${q(e.id)},`,
            `      dateLabel: ${q(e.dateLabel)},`,
            `      title: ${q(e.title)},`,
            `      location: ${q(e.location)}, city: ${q(e.city)},`,
            '      shows: [',
            e.shows.map(s => soireeSource(s, 8)).join(',\n'),
            '      ]',
            '    }'
        ].join('\n');
    }
    return [
        titre,
        '    {',
        '      type: "single",',
        `      dateLabel: ${q(e.dateLabel)},`,
        `      fullDate: ${q(e.fullDate)},`,
        `      title: ${q(e.title)},`,
        `      location: ${q(e.location)}, city: ${q(e.city)},`,
        `      time: ${q(e.time)},`,
        `      bookingUrl: ${q(e.bookingUrl)},`,
        `      isSchool: ${e.isSchool ? 'true' : 'false'},`,
        `      icsDate: ${q(e.icsDate)}`,
        '    }'
    ].join('\n');
}

async function main() {
    const source = fs.readFileSync(FICHIER, 'utf8');
    const a = source.indexOf(DEBUT), b = source.indexOf(FIN);
    if (a < 0 || b < 0 || b < a) {
        console.error('Repères ⇊ ⇈ introuvables dans dates.js : rien n\'a été modifié.');
        process.exit(1);
    }

    const reponse = await fetch(L.ADRESSE_LECTURE, { headers: { apikey: L.SUPABASE_CLE } });
    if (!reponse.ok) {
        console.error(`Supabase a répondu ${reponse.status} : rien n'a été modifié.`);
        process.exit(1);
    }
    const lignes = await reponse.json();
    if (!Array.isArray(lignes) || !lignes.length) {
        console.error('La table est vide : rien n\'a été modifié, par prudence.');
        process.exit(1);
    }

    const entrees = L.versShowData(lignes);
    const corps = entrees.map(entreeSource).join(',\n\n');
    const horodatage = new Date().toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' });
    const bloc = `${DEBUT}\n    // Dernier export : ${horodatage} — ${lignes.length} soirée(s), ${entrees.length} entrée(s).\n${corps}\n${FIN}`;

    const nouveau = source.slice(0, a) + bloc + source.slice(b + FIN.length);
    if (nouveau === source) { console.log('dates.js déjà à jour.'); return; }

    // Le fichier doit rester du JavaScript valide : on le relit avant d'écrire.
    const verif = new Function(nouveau + '\nreturn SHOW_DATA;')();
    if (!Array.isArray(verif.upcoming) || verif.upcoming.length !== entrees.length) {
        console.error('Le résultat ne se relit pas correctement : rien n\'a été modifié.');
        process.exit(1);
    }

    fs.writeFileSync(FICHIER, nouveau);
    console.log(`dates.js régénéré : ${lignes.length} soirée(s), ${entrees.length} entrée(s).`);
    console.log('Pensez à relancer : node build/generer-pages-spectacles.js');
}

main().catch(err => { console.error(err.message || err); process.exit(1); });
