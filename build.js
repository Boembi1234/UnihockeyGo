/* Setzt dist/index.html aus src/page.html, src/engine.js, src/scene.js und src/ui.js zusammen: eine einzelne HTML-Datei ohne Server.
   node build.js */
'use strict';
const fs = require('fs'), path = require('path'), r = f => fs.readFileSync(path.join(__dirname, 'src', f), 'utf8');
const out = r('page.html').replace('/*__ENGINE__*/', () => r('engine.js').trim()).replace('/*__SCENE__*/', () => r('scene.js').trim()).replace('/*__UI__*/', () => r('ui.js').trim());
fs.mkdirSync(path.join(__dirname, 'dist'), { recursive: true });
fs.writeFileSync(path.join(__dirname, 'dist', 'index.html'), out);
console.log('dist/index.html', out.length, 'Zeichen');
