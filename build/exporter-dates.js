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
 *  IL TOURNE TOUT SEUL, chaque nuit : le workflow « Recopier les dates »
 *  (.github/workflows/recopier-dates.yml, build/recopier-dates.sh) le
 *  lance, refait les pages, committe et publie si la base a changé.
 *  À la main, c'est la même chose :
 *
 *      node build/exporter-dates.js
 *      npm --prefix build run pages
 *
 *  Il ne touche ni à l'en-tête, ni à `currentSeasonTitle`, ni aux
 *  archives : tout ce qui est hors des repères reste à la main.
 *
 *  LE MÊME FICHIER POUR LA MÊME BASE. Si la base n'a pas changé depuis
 *  la copie, il n'écrit rien — pas même la date de la copie (« Dernier
 *  export »), qui date aussi dates.ics : relancé chaque nuit, il aurait
 *  redaté l'agenda à chaque passage. S'il écrit, il dit quelles
 *  soirées sont arrivées, parties ou ont changé : le workflow en fait le
 *  message de son commit.
 *
 *  CE QU'IL RÉPOND (code de sortie) : 0, la copie est à jour (refaite ou
 *  déjà bonne) ; 2, la base n'a pas répondu — rien n'est modifié, un
 *  prochain passage réessaiera ; 1, autre chose, qu'une personne doit
 *  regarder (repères perdus, table vide, résultat illisible).
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

// Les soirées d'une liste « upcoming », une par séance : de quoi dire
// ce qu'un export change. La clé est la soirée elle-même (jour, heure,
// spectacle, salle) ; le reste (billetterie, scolaire, ville) peut changer
// sous elle.
function soirees(upcoming) {
    const m = new Map();
    (upcoming || []).forEach(e => (e.type === 'series' ? e.shows : [e]).forEach(s => {
        const cle = [s.icsDate, s.time, e.title, e.location].join('|');
        m.set(cle, {
            nom: `${L.jourCourt(s.icsDate)} · ${s.time || 'horaire à confirmer'} · ${e.title} · ${e.location}`.replace(/[\u00a0\u202f]/g, ' '),
            reste: { billetterie: s.bookingUrl || '', scolaire: !!s.isSchool, ville: e.city || '' }
        });
    }));
    return m;
}

function changements(avant, apres) {
    const a = soirees(avant), b = soirees(apres), lignes = [];
    b.forEach((s, cle) => {
        if (!a.has(cle)) { lignes.push(`  + ${s.nom}`); return; }
        const r = a.get(cle).reste;
        const quoi = Object.keys(s.reste).filter(k => s.reste[k] !== r[k]);
        if (quoi.length) lignes.push(`  ~ ${s.nom} (${quoi.join(', ')})`);
    });
    a.forEach((s, cle) => { if (!b.has(cle)) lignes.push(`  - ${s.nom}`); });
    return lignes;
}

// La ligne « Dernier export : … » d'un bloc, pour comparer deux blocs
// sans elle.
const sansDate = bloc => bloc.replace(/^ *\/\/ Dernier export : .*\n/m, '');

const INJOIGNABLE = 2;

async function main() {
    const source = fs.readFileSync(FICHIER, 'utf8');
    const a = source.indexOf(DEBUT), b = source.indexOf(FIN);
    if (a < 0 || b < 0 || b < a) {
        console.error('Repères ⇊ ⇈ introuvables dans dates.js : rien n\'a été modifié.');
        process.exit(1);
    }

    let lignes;
    try {
        const reponse = await fetch(L.ADRESSE_LECTURE, { headers: { apikey: L.SUPABASE_CLE }, signal: AbortSignal.timeout(20000) });
        if (!reponse.ok) throw new Error(`Supabase a répondu ${reponse.status}`);
        lignes = await reponse.json();
    } catch (e) {
        console.error(`La base n'a pas répondu (${e.message || e}) : rien n'a été modifié.`);
        process.exit(INJOIGNABLE);
    }
    if (!Array.isArray(lignes) || !lignes.length) {
        console.error('La table est vide : rien n\'a été modifié, par prudence.');
        process.exit(1);
    }

    const entrees = L.versShowData(lignes);
    const corps = entrees.map(entreeSource).join(',\n\n');
    // CETTE LIGNE EST LUE : l'agenda à s'abonner (build/fabriquer-agenda.js,
    // dateDeLaCopie) en tire le jour de la copie — c'est lui qui borne le
    // passé gardé dans dates.ics et qui le date. En changer la forme, c'est
    // changer celle-là aussi ; la vérification du site le rappellerait.
    const horodatage = new Date().toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' });
    const bloc = `${DEBUT}\n    // Dernier export : ${horodatage} — ${lignes.length} soirée(s), ${entrees.length} entrée(s).\n${corps}\n${FIN}`;

    // La base n'a pas bougé depuis la copie : on n'écrit rien.
    if (sansDate(bloc) === sansDate(source.slice(a, b + FIN.length))) { console.log('dates.js déjà à jour.'); return; }

    const nouveau = source.slice(0, a) + bloc + source.slice(b + FIN.length);

    // Le fichier doit rester du JavaScript valide : on le relit avant d'écrire.
    const verif = new Function(nouveau + '\nreturn SHOW_DATA;')();
    if (!Array.isArray(verif.upcoming) || verif.upcoming.length !== entrees.length) {
        console.error('Le résultat ne se relit pas correctement : rien n\'a été modifié.');
        process.exit(1);
    }

    // Ce qui change, soirée par soirée. L'ancienne copie peut ne plus se
    // relire (retouchée à la main) : on le dit sans s'arrêter.
    let detail;
    try { detail = changements(new Function(source + '\nreturn SHOW_DATA;')().upcoming, entrees); }
    catch (e) { detail = ['  (l\'ancienne copie ne se relisait pas : pas de détail)']; }

    fs.writeFileSync(FICHIER, nouveau);
    console.log(`dates.js régénéré : ${lignes.length} soirée(s), ${entrees.length} entrée(s).`);
    detail.forEach(l => console.log(l));
    console.log('Pensez à relancer : npm --prefix build run pages');
}

main().catch(err => { console.error(err.message || err); process.exit(1); });
