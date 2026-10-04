#!/usr/bin/env node
/**
 * ============================================================
 *  L'AGENDA À S'ABONNER — dates.ics
 * ============================================================
 *  POURQUOI CE FICHIER EXISTE
 *  --------------------------
 *  « Ajouter à l'agenda » pose UNE date, UNE fois : que la salle change
 *  l'heure, qu'une date s'ajoute à la tournée, et l'agenda du visiteur
 *  n'en sait rien. dates.ics est un agenda PUBLIÉ : on s'y abonne une fois
 *  (webcal://adrienvada.fr/dates.ics, le lien de l'onglet Dates), et
 *  l'application le relit d'elle-même — une fois par jour, c'est ce que le
 *  fichier lui demande (REFRESH-INTERVAL, X-PUBLISHED-TTL).
 *
 *  CE QU'IL CONTIENT
 *  -----------------
 *    · les représentations PUBLIQUES de dates.js, jamais une séance
 *      scolaire : elle n'est pas ouverte au public, et l'annoncer dans un
 *      agenda promettrait des places qui n'existent pas (la même règle que
 *      les données structurées, voir evenementTheatre) ;
 *    · celles à venir, et celles jouées depuis moins de 60 jours. Un agenda
 *      abonné EFFACE ce que le flux ne contient plus : une date jouée hier
 *      qui disparaîtrait du jour au lendemain ferait douter qu'elle ait
 *      jamais eu lieu. Deux mois, et elle s'en va quand plus personne ne
 *      la cherche ;
 *    · un événement par séance : deux séances le même jour, deux
 *      événements. Une séance sans heure — ou avec un « matin » qui n'en
 *      est pas une — devient un événement d'une journée, « transparent »
 *      (il ne marque pas la journée comme prise).
 *
 *  QUAND IL EST REFAIT
 *  -------------------
 *  À chaque passage de build/generer-pages-spectacles.js, donc à chaque
 *  `npm --prefix build run pages` : c'est déjà la commande qu'on relance
 *  après un export des dates (CLAUDE.md, README-build.md). Un flux à part,
 *  avec sa commande à lui, aurait été oublié au premier export. Seul :
 *
 *      node build/fabriquer-agenda.js
 *
 *  Il lit dates.js (la copie de la base, PAS la base elle-même : comme les
 *  pages spectacle, il retarde jusqu'au prochain export) et univers.js (le
 *  nom du spectacle, sa page, sa durée). La vérification du site le refait
 *  en mémoire et exige l'octet près : un dates.ics en retard sur dates.js
 *  ne passe pas.
 *
 *  LE MÊME FICHIER POUR LA MÊME ENTRÉE
 *  -----------------------------------
 *  Rien ici ne lit la date du jour. Un flux daté du jour de sa fabrication
 *  changerait à chaque passage sans qu'une date ait bougé — et la
 *  vérification ne pourrait plus dire s'il est à jour. Le seul « maintenant »
 *  du fichier est celui de la COPIE : la ligne « Dernier export : … » que
 *  build/exporter-dates.js écrit en tête des dates. Elle borne le passé
 *  (60 jours avant elle) et donne DTSTAMP, que la norme exige sur chaque
 *  événement et qui dit justement quand l'information a été relevée.
 * ============================================================
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Le moteur partagé des univers : la billetterie qui est une vraie adresse
// (lienSur) et la durée annoncée du spectacle (dureeMinutes), les mêmes
// que celles des données structurées.
const MONTAGE = require('../univers-montage.js');

const RACINE = path.resolve(__dirname, '..');
const SITE = 'https://adrienvada.fr';
const FICHIER = 'dates.ics';
const JOURS_GARDES = 60;
// Sans durée annoncée dans l'univers : deux heures, comme la fenêtre
// « Ajouter à l'agenda ».
const DUREE_PAR_DEFAUT = 120;

// ── Lecture ─────────────────────────────────────────────────────────
//  Le même découpage d'univers.js que build/generer-pages-spectacles.js
//  (chargerUnivers) : on n'exécute pas le fichier, qui voudrait un DOM, on
//  évalue sa seule déclaration de données. Les deux partent des mêmes
//  repères ; si l'un casse, l'autre aussi, et tous deux le disent.
function charger(racine) {
    const lire = (f) => fs.readFileSync(path.join(racine, f), 'utf8');
    const source = lire('dates.js');
    const SHOW_DATA = new Function(source + '\nreturn SHOW_DATA;')();
    const u = lire('univers.js');
    const debut = u.indexOf('const SHOW_UNIVERSES = {');
    const fin = u.indexOf('\n(function () {', debut);
    if (debut === -1 || fin === -1) {
        throw new Error('univers.js : SHOW_UNIVERSES introuvable, ou l\'IIFE ne le suit plus ' +
            '(même découpage que build/generer-pages-spectacles.js).');
    }
    const SHOW_UNIVERSES = new Function(u.slice(debut, fin) + '\nreturn SHOW_UNIVERSES;')();
    return { source, SHOW_DATA, SHOW_UNIVERSES };
}

// ── Le jour de la copie ─────────────────────────────────────────────
//  « // Dernier export : 4 octobre 2026 à 22:02 — 25 soirée(s)… », écrit
//  par build/exporter-dates.js (toLocaleString, en français). L'heure est
//  celle de la machine qui a exporté, dont on ignore le fuseau : elle est
//  lue telle quelle, en UTC. Deux heures d'écart n'y changent rien —
//  DTSTAMP date la copie, pas une représentation.
//  Une ligne illisible est une ERREUR, pas un repli : sans elle, le flux
//  ne saurait plus ni quoi oublier ni comment se dater, et mieux vaut que
//  la fabrication le dise que de publier autre chose en silence.
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet',
    'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const deux = (n) => String(n).padStart(2, '0');

function dateDeLaCopie(source) {
    const m = String(source).match(/Dernier export\s*:\s*(\d{1,2})(?:er)?\s+(\S+)\s+(\d{4})(?:\s+à\s+(\d{1,2})[:h](\d{2}))?/);
    const mois = m ? MOIS.indexOf(m[2].toLowerCase()) + 1 : 0;
    if (!m || !mois) return null;
    const [a, j] = [+m[3], +m[1]];
    return {
        jour: `${a}-${deux(mois)}-${deux(j)}`,
        stamp: `${a}${deux(mois)}${deux(j)}T${deux(m[4] || 0)}${deux(m[5] || 0)}00Z`
    };
}

// Un jour AAAA-MM-JJ décalé de n jours, sans fuseau ni heure d'été.
function decaler(jour, n) {
    const [a, m, j] = jour.split('-').map(Number);
    const d = new Date(Date.UTC(a, m - 1, j + n));
    return `${d.getUTCFullYear()}-${deux(d.getUTCMonth() + 1)}-${deux(d.getUTCDate())}`;
}

// ── Le spectacle d'une date ─────────────────────────────────────────
//  La même reconnaissance que l'accueil (universeParTitre, dans
//  univers.js) et que le générateur (normaliserTitre) : la clé exacte,
//  puis à espaces et apostrophes près, puis les autresTitres déclarés.
//  Jamais un rapprochement approximatif.
const normaliserTitre = (t) => String(t || '')
    .replace(/[\s\u00a0\u202f\u2009\u2007\u2060]+/g, ' ')
    .replace(/[\u2019\u02bc\u055a\uff07\u2018\u201b]/g, "'").trim();

function universDe(titre, SHOW_UNIVERSES) {
    if (SHOW_UNIVERSES[titre]) return SHOW_UNIVERSES[titre];
    const vise = normaliserTitre(titre);
    const cles = Object.keys(SHOW_UNIVERSES);
    const cle = cles.find(k => normaliserTitre(k) === vise)
        || cles.find(k => (SHOW_UNIVERSES[k].autresTitres || []).some(t => normaliserTitre(t) === vise));
    return cle ? Object.assign({ cle }, SHOW_UNIVERSES[cle]) : null;
}

// ── Les séances ─────────────────────────────────────────────────────
//  Une par heure : « 14h30 & 19h00 » sur une même ligne fait deux
//  séances, comme dans la fenêtre « Ajouter à l'agenda ». Une heure qu'on
//  ne sait pas lire (« matin », « à confirmer ») laisse la séance à la
//  journée. Exportée pour la vérification, qui en tire ce que le flux doit
//  contenir.
const HEURE = /(\d{1,2})\s*[hH:]\s*(\d{2})?/g;

function seances(SHOW_DATA) {
    const out = [];
    (SHOW_DATA.upcoming || []).forEach(entree => {
        const reps = entree.type === 'series' && Array.isArray(entree.shows) ? entree.shows : [entree];
        reps.forEach(r => {
            const jour = String(r.icsDate || '');
            if (!/^\d{4}-\d{2}-\d{2}$/.test(jour)) return;
            const texte = Array.isArray(r.times) ? r.times.join(' & ') : String(r.time || '');
            const heures = /confirmer/i.test(texte) ? [] : [...texte.matchAll(HEURE)]
                .map(h => ({ h: +h[1], m: +(h[2] || 0) })).filter(h => h.h < 24 && h.m < 60);
            const commun = {
                titre: entree.title || '', lieu: entree.location || '', jour,
                scolaire: Boolean(r.isSchool || entree.isSchool),
                billetterie: r.bookingUrl || entree.bookingUrl || '', texteHeure: texte.trim()
            };
            if (!heures.length) out.push(Object.assign({ heure: null }, commun));
            else heures.forEach(heure => out.push(Object.assign({ heure }, commun)));
        });
    });
    return out;
}

// ── L'identifiant d'un événement (UID) ──────────────────────────────
//  C'est par lui qu'un agenda reconnaît, d'une lecture à l'autre, le même
//  événement. Il est tiré de ce qui FAIT la représentation — le spectacle,
//  le lieu, le jour, l'heure — et non de l'identifiant de la base :
//    · dates.js ne le garde pas, et il change quand une ligne est effacée
//      puis ressaisie, pour corriger une faute, alors que la soirée, elle,
//      n'a pas bougé ;
//    · le lien de billetterie n'en fait pas partie : quand les
//      réservations ouvrent, l'événement se met à jour, il ne se double
//      pas ;
//    · une heure, un jour ou une salle qui change font un AUTRE
//      événement : l'ancien disparaît de l'agenda, le nouveau y paraît.
//      C'est exactement ce qui est arrivé à la soirée ;
//    · la typographie n'y compte pas (accents, apostrophes, espaces,
//      ponctuation) : soigner l'écriture d'une salle ne retire ni ne
//      rajoute rien chez personne ;
//    · deux séances du même jour au même endroit diffèrent par l'heure —
//      ou, sans heure d'horloge, par ce qui en tient lieu : un « matin »
//      et un « après-midi » sont deux séances, deux événements, et non
//      une seule journée.
//  Lisible en tête (le jour, l'heure), une empreinte courte du spectacle
//  et du lieu ensuite : « 20261022T1900-1a2b3c4d5e@adrienvada.fr ».
const pourEmpreinte = (t) => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

function uidDe(s) {
    const sansHeure = s.heure || !s.texteHeure ? '' : `|${pourEmpreinte(s.texteHeure)}`;
    const empreinte = crypto.createHash('sha1')
        .update(`${pourEmpreinte(s.titre)}|${pourEmpreinte(s.lieu)}${sansHeure}`).digest('hex').slice(0, 10);
    const quand = s.jour.replace(/-/g, '') + (s.heure ? `T${deux(s.heure.h)}${deux(s.heure.m)}` : '');
    return `${quand}-${empreinte}@adrienvada.fr`;
}

// ── L'écriture iCalendar (RFC 5545) ─────────────────────────────────
//  Un TEXTE échappe la barre oblique inverse, le point-virgule, la
//  virgule et le retour à la ligne (§ 3.3.11).
function echapper(texte) {
    return String(texte == null ? '' : texte)
        .replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,')
        .replace(/\r\n|\r|\n/g, '\\n').replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '');
}

//  Une ligne ne dépasse pas 75 OCTETS (§ 3.1) — des octets, pas des
//  caractères : « é » en compte deux, « — » trois. Au-delà, elle continue
//  sur la suivante, qui commence par une espace (comptée dans les 75). On
//  coupe entre deux caractères, jamais au milieu d'un caractère UTF-8.
function plier(ligne) {
    const morceaux = [];
    let courant = '', octets = 0, limite = 75;
    for (const car of ligne) {
        const n = Buffer.byteLength(car, 'utf8');
        if (octets + n > limite) {
            morceaux.push(courant);
            courant = '';
            octets = 0;
            limite = 74;
        }
        courant += car;
        octets += n;
    }
    morceaux.push(courant);
    return morceaux.join('\r\n ');
}

//  Le fuseau de Paris, écrit une fois : toutes les représentations sont en
//  France métropolitaine (même hypothèse que decalageParis, dans
//  univers-montage.js). Les heures restent celles de l'affiche — « 20h00 »
//  s'écrit 200000 —, et c'est l'agenda qui les place, heure d'été comprise,
//  selon ces deux règles : le dernier dimanche de mars et celui d'octobre.
//  Rien à calculer ici, donc rien qui dépende des fuseaux de la machine qui
//  fabrique le fichier.
const FUSEAU = [
    'BEGIN:VTIMEZONE',
    'TZID:Europe/Paris',
    'X-LIC-LOCATION:Europe/Paris',
    'BEGIN:DAYLIGHT',
    'TZOFFSETFROM:+0100',
    'TZOFFSETTO:+0200',
    'TZNAME:CEST',
    'DTSTART:19700329T020000',
    'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU',
    'END:DAYLIGHT',
    'BEGIN:STANDARD',
    'TZOFFSETFROM:+0200',
    'TZOFFSETTO:+0100',
    'TZNAME:CET',
    'DTSTART:19701025T030000',
    'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU',
    'END:STANDARD',
    'END:VTIMEZONE'
];

// L'heure locale de la fin : le début, plus la durée. Calculé en UTC pour
// ne dépendre d'aucun fuseau — une soirée qui finit après minuit change
// de jour, et c'est tout.
function finLocale(jour, heure, minutes) {
    const [a, m, j] = jour.split('-').map(Number);
    const f = new Date(Date.UTC(a, m - 1, j, heure.h, heure.m + minutes));
    return `${f.getUTCFullYear()}${deux(f.getUTCMonth() + 1)}${deux(f.getUTCDate())}T${deux(f.getUTCHours())}${deux(f.getUTCMinutes())}00`;
}

function evenement(s, uni, stamp) {
    const page = uni && uni.slug ? `${SITE}/spectacles/${uni.slug}/` : `${SITE}/#page_dates`;
    const billet = MONTAGE.lienSur(s.billetterie);
    // LE NOM QUE LE VISITEUR EMPORTE est celui du spectacle, comme dans la
    // fenêtre d'agenda d'un univers : « Cléophène (d'après Rodogune, de
    // Corneille) », et non la clé de dates.js.
    const titre = (uni && (uni.title || uni.cle)) || s.titre;
    const sommaire = uni && uni.subtitle ? `${titre} (${uni.subtitle})` : titre;
    const jour = s.jour.replace(/-/g, '');
    const lignes = ['BEGIN:VEVENT', `UID:${uidDe(s)}`, `DTSTAMP:${stamp}`];
    if (s.heure) {
        lignes.push(`DTSTART;TZID=Europe/Paris:${jour}T${deux(s.heure.h)}${deux(s.heure.m)}00`,
            `DTEND;TZID=Europe/Paris:${finLocale(s.jour, s.heure, (uni && MONTAGE.dureeMinutes(uni)) || DUREE_PAR_DEFAUT)}`);
    } else {
        lignes.push(`DTSTART;VALUE=DATE:${jour}`, `DTEND;VALUE=DATE:${decaler(s.jour, 1).replace(/-/g, '')}`,
            'TRANSP:TRANSPARENT');
    }
    // La description est COURTE, et porte les deux liens en clair : Google
    // Agenda ne montre pas le champ URL, il ne garde que ce texte.
    const description = [
        'Avec Adrien Vada.',
        s.heure ? '' : (s.texteHeure && !/confirmer/i.test(s.texteHeure) ? `Horaire : ${s.texteHeure}.` : 'Horaire à confirmer.'),
        billet ? `Réservations : ${billet}` : 'Réservations pas encore ouvertes.',
        uni && uni.slug ? `Le spectacle : ${page}` : `Toutes les dates : ${page}`
    ].filter(Boolean).join('\n');
    lignes.push(`SUMMARY:${echapper(sommaire)}`, `LOCATION:${echapper(s.lieu)}`,
        // La billetterie si elle est en https, la page du spectacle sinon.
        `URL:${/^https:\/\//i.test(billet) ? billet : page}`,
        `DESCRIPTION:${echapper(description)}`, 'END:VEVENT');
    return lignes;
}

/**
 * Le flux entier, en texte : CRLF partout, lignes pliées à 75 octets.
 *   donnees : { source (le texte de dates.js), SHOW_DATA, SHOW_UNIVERSES }
 */
function agenda(donnees) {
    const { source, SHOW_DATA, SHOW_UNIVERSES } = donnees;
    const copie = dateDeLaCopie(source);
    if (!copie) {
        throw new Error('dates.js : la ligne « Dernier export : … » est introuvable ou illisible. ' +
            'C\'est elle qui date dates.ics : relancez npm --prefix build run dates.');
    }
    const depuis = decaler(copie.jour, -JOURS_GARDES);
    const vues = new Set();
    const choisies = seances(SHOW_DATA)
        .filter(s => !s.scolaire && s.jour >= depuis)
        .map(s => Object.assign({ uid: uidDe(s) }, s))
        // L'ordre du calendrier — l'heure, puis l'identifiant —, et non
        // celui de la saisie : le fichier ne bouge pas si la base rend ses
        // lignes dans un autre ordre.
        .sort((x, y) => (x.uid < y.uid ? -1 : x.uid > y.uid ? 1 : 0))
        .filter(s => !vues.has(s.uid) && vues.add(s.uid));
    const lignes = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Adrien Vada//Dates des représentations//FR',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'X-WR-CALNAME:Adrien Vada — dates',
        'NAME:Adrien Vada — dates',
        `X-WR-CALDESC:${echapper(`Les représentations publiques d’Adrien Vada, comédien. Toutes les dates : ${SITE}/#page_dates`)}`,
        'X-WR-TIMEZONE:Europe/Paris',
        // Relu une fois par jour : la première est la règle (RFC 7986), la
        // seconde ce qu'Outlook et les anciens agendas comprennent.
        'REFRESH-INTERVAL;VALUE=DURATION:P1D',
        'X-PUBLISHED-TTL:P1D',
        ...FUSEAU
    ];
    choisies.forEach(s => lignes.push(...evenement(s, universDe(s.titre, SHOW_UNIVERSES), copie.stamp)));
    lignes.push('END:VCALENDAR');
    return { texte: lignes.map(plier).join('\r\n') + '\r\n', evenements: choisies.length, depuis };
}

// Ce que le fichier doit être, d'après le dépôt tel qu'il est.
function fabriquer(racine) {
    return agenda(charger(racine || RACINE));
}

function ecrire(racine) {
    const r = racine || RACINE;
    const fait = fabriquer(r);
    const cible = path.join(r, FICHIER);
    let avant = null;
    try { avant = fs.readFileSync(cible, 'utf8'); } catch (e) { /* premier passage */ }
    if (avant !== fait.texte) fs.writeFileSync(cible, fait.texte);
    return Object.assign({ change: avant !== fait.texte }, fait);
}

module.exports = { fabriquer, ecrire, agenda, charger, seances, uidDe, dateDeLaCopie, decaler, plier, echapper, FICHIER, JOURS_GARDES };

if (require.main === module) {
    const r = ecrire(RACINE);
    console.log(`  ${FICHIER} : ${r.evenements} représentation(s) publique(s), depuis le ${r.depuis}${r.change ? '' : ' (inchangé)'}`);
}
