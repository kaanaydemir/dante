/**
 * Entry point. Fonts are bundled locally by @fontsource (no network).
 */

import '@fontsource/im-fell-english/400.css';
import '@fontsource/im-fell-english/400-italic.css';
import '@fontsource/pixelify-sans/400.css';
import '@fontsource/pixelify-sans/600.css';
import { bootstrap } from './app/bootstrap';

const parent = document.getElementById('game');
if (!parent) {
  throw new Error('index.html must contain <div id="game">');
}
bootstrap(parent);
