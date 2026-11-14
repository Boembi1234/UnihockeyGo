/* Setzt dist/index.html aus src/page.html, src/engine.js, src/world.js, src/scene.js und src/ui.js zusammen: eine einzelne HTML-Datei ohne Server.
   node build.js */
'use strict';
const fs = require('fs'), path = require('path'), r = f => fs.readFileSync(path.join(__dirname, 'src', f), 'utf8');
const out = r('page.html').replace('/*__ENGINE__*/', () => r('engine.js').trim()).replace('/*__WORLD__*/', () => r('world.js').trim()).replace('/*__SCENE__*/', () => r('scene.js').trim()).replace('/*__UI__*/', () => r('ui.js').trim());
fs.mkdirSync(path.join(__dirname, 'dist'), { recursive: true });
fs.writeFileSync(path.join(__dirname, 'dist', 'index.html'), out);
console.log('dist/index.html', out.length, 'Zeichen');
// Testduell unter /lab/: eigene Seite, nutzt Karten und Grundwerte aus engine.js und world.js
const lab = f => fs.readFileSync(path.join(__dirname, 'src', 'lab', f), 'utf8');
const labOut = lab('page.html').replace('/*__ENGINE__*/', () => r('engine.js').trim()).replace('/*__WORLD__*/', () => r('world.js').trim())
  .replace('/*__DUEL__*/', () => lab('duel.js').trim()).replace('/*__FIELD__*/', () => lab('field.js').trim()).replace('/*__LAB__*/', () => lab('ui.js').trim());
fs.mkdirSync(path.join(__dirname, 'dist', 'lab'), { recursive: true });
fs.writeFileSync(path.join(__dirname, 'dist', 'lab', 'index.html'), labOut);
console.log('dist/lab/index.html', labOut.length, 'Zeichen');
// Match mit Schlüsselszenen unter /lab/match/: nutzt die Styles des Testduells
const labCss = lab('page.html').match(/<style>([\s\S]*?)<\/style>/)[1];
const matchOut = lab('match.html').replace('/*__LABCSS__*/', () => labCss).replace('/*__ENGINE__*/', () => r('engine.js').trim()).replace('/*__WORLD__*/', () => r('world.js').trim())
  .replace('/*__MATCH__*/', () => lab('match.js').trim())
  .replace('/*__POOL__*/', () => lab('pool.js').trim()).replace('/*__CLUB__*/', () => lab('club.js').trim()).replace('/*__STORE__*/', () => lab('store-ui.js').trim()).replace('/*__MUI__*/', () => lab('match-ui.js').trim());
fs.mkdirSync(path.join(__dirname, 'dist', 'lab', 'match'), { recursive: true });
fs.writeFileSync(path.join(__dirname, 'dist', 'lab', 'match', 'index.html'), matchOut);
console.log('dist/lab/match/index.html', matchOut.length, 'Zeichen');
