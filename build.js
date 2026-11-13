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
