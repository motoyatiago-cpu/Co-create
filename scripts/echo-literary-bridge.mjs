// Minimal, reversible edits against the user-approved single-file baseline aa4aace.
// Abort if that baseline changes; never heuristically rewrite the compiled Vue bundle.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const target = new URL('../public/experiences/echo-knot/index.html', import.meta.url);
const baseHash = '4e402bcaeae6afeb532ee8ec794d380fce6a4d4372e80950a56d56e672a688b0';
export const patches = [
  ['module references', '<script type="module" crossorigin>',
    '<link rel="stylesheet" href="./literary/panel.css" />\n    <script type="module" src="./literary/panel.js"></script>\n    <script type="module" crossorigin>import { readPreferences, writePreferences } from "./literary/preferences.js";'],
  ['explicit persona-ID mount', 'W(`div`,KE,[W(`div`,{class:`chat-messages`',
    'W(`div`,KE,[W(`echo-literary-chat`,{"persona-id":f.value.id},null,8,[`persona-id`]),W(`div`,{class:`chat-messages`'],
  ['legacy key migration and persistence',
    'function Wb(){try{let e=localStorage.getItem(Hb);if(!e)return structuredClone(Ub);let t=JSON.parse(e);return{...structuredClone(Ub),...t,external:{...Ub.external,...t.external||{}}}}catch{return structuredClone(Ub)}}var Q=jt(Wb());Ln(Q,e=>{try{localStorage.setItem(Hb,JSON.stringify(e))}catch{}},{deep:!0});',
    'function Wb(){return readPreferences(Hb,Ub)}var Q=jt(Wb());Ln(Q,e=>{writePreferences(Hb,e)},{deep:!0});'],
  ['accurate legacy key notice', '密钥只保存在这台设备的浏览器里。', '密钥只在当前页面内存中使用，刷新需重填。'],
  ['accurate autosave notice', '改动会自动留在这台设备上，不需要另外保存。', '偏好自动保存在本机；API密钥例外，仅当前页面内存使用。'],
];
const hash = value => createHash('sha256').update(value).digest('hex');
function replaceOnce(source, oldText, newText, label) {
  if (source.split(oldText).length !== 2) throw new Error(`Bridge anchor mismatch: ${label}`);
  return source.replace(oldText, newText);
}
let source = readFileSync(target, 'utf8').replace(/\r\n/g, '\n');
if (process.argv.includes('--apply')) {
  if (hash(source) !== baseHash) throw new Error('Baseline hash mismatch; inspect the newer HTML before applying.');
  for (const [label, before, after] of patches) source = replaceOnce(source, before, after, label);
  writeFileSync(target, source);
} else {
  let original = source;
  for (const [label, before, after] of [...patches].reverse()) original = replaceOnce(original, after, before, label);
  if (hash(original) !== baseHash) throw new Error('Non-bridge changes detected in compiled HTML.');
  if (process.argv.includes('--rollback')) writeFileSync(target, original);
}
console.log(`Echo bridge ${process.argv.includes('--rollback') ? 'rolled back' : 'verified'}: ${patches.length} exact patches; baseline ${baseHash.slice(0, 12)}`);
