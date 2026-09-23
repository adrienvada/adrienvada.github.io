/**
 * ============================================================
 *  UN SERVEUR, PARCE QUE file:// N'EST PAS LE SITE
 * ============================================================
 *  Ouvrir index.html en file:// donnerait une page privée d'origine :
 *  ni sessionStorage, ni fetch, ni polices chargées de la même façon.
 *  Ce qu'un script veut voir « comme un visiteur » — le CV à imprimer,
 *  les pages à vérifier — doit donc être servi en HTTP.
 *
 *  Il était écrit deux fois (generer-cv-pdf.js, alleger-publication.js)
 *  et allait l'être une troisième (verifier-site.js) : le voici écrit
 *  une fois, pour les trois. Quarante lignes, sans dépendance.
 *
 *      const { servir } = require('./serveur-local');
 *      const { serveur, port, base } = await servir('/chemin/du/site');
 *      …
 *      serveur.close();
 * ============================================================
 */
'use strict';

const fs = require('fs');
const http = require('http');
const path = require('path');

const TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.xml': 'application/xml; charset=utf-8',
    '.txt': 'text/plain; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.avif': 'image/avif',
    '.gif': 'image/gif',
    '.ico': 'image/x-icon',
    '.woff2': 'font/woff2',
    '.woff': 'font/woff',
    '.ttf': 'font/ttf',
    '.mp3': 'audio/mpeg',
    '.m4a': 'audio/mp4',
    '.pdf': 'application/pdf',
    '.webmanifest': 'application/manifest+json'
};

function servir(racine) {
    const RACINE = path.resolve(racine);
    const serveur = http.createServer((req, res) => {
        let rel;
        try {
            rel = decodeURIComponent(req.url.split('?')[0].split('#')[0]);
        } catch (e) {
            res.writeHead(400).end();
            return;
        }
        if (rel.endsWith('/')) rel += 'index.html';

        // Une adresse ne sort pas du dossier servi : `path.resolve` avale
        // les « .. » avant qu'on ne vérifie où l'on a atterri.
        const cible = path.resolve(RACINE, '.' + rel);
        if (!cible.startsWith(RACINE + path.sep)) {
            res.writeHead(403).end();
            return;
        }

        fs.readFile(cible, (err, buf) => {
            if (err) {
                res.writeHead(404, { 'Content-Type': 'text/plain' }).end('404');
                return;
            }
            res.writeHead(200, { 'Content-Type': TYPES[path.extname(cible).toLowerCase()] || 'application/octet-stream' });
            res.end(buf);
        });
    });

    return new Promise((resolve) => {
        // Port 0 : le système en choisit un de libre. Deux exécutions
        // simultanées ne peuvent donc pas se marcher dessus.
        serveur.listen(0, '127.0.0.1', () => {
            const port = serveur.address().port;
            resolve({ serveur, port, base: `http://127.0.0.1:${port}` });
        });
    });
}

module.exports = { servir };
