import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync, createReadStream } from 'node:fs';
import { resolve, basename } from 'node:path';
import { createHash } from 'node:crypto';

// Explicitly opt-in, loopback-only development middleware. No candidate import,
// public-directory copy, build hook, arbitrary file serving, or production endpoint.
export default defineConfig(({ command }) => {
  if (command !== 'serve') throw new Error('Candidate review is development-only. Use the normal config to build.');
  const root = process.env.MEMBER_REVIEW_DIR;
  if (!root) throw new Error('Set MEMBER_REVIEW_DIR to the extracted candidate pack outside the repository.');
  const manifest = JSON.parse(readFileSync(resolve(root, 'manifest.json'), 'utf8'));
  const assets = new Map();
  const members = new Map();
  for (const member of manifest.members) {
    const id = `member-${member.member_id}`;
    if (!/^member-(0[1-9]|[12]\d|3[0-2])$/.test(id)) throw new Error('Invalid member ID');
    members.set(id, member.gallery_review_only.map((image, index) => {
      const file = basename(image.file);
      if (!new RegExp(`^${id}-\\d{2}\\.webp$`).test(file)) throw new Error('Image/member mismatch');
      const path = resolve(root, 'gallery_review_only', file);
      if (createHash('sha256').update(readFileSync(path)).digest('hex') !== image.sha256) throw new Error('Candidate hash mismatch');
      assets.set(file, path);
      return { id: file, src: `/__local_review__/images/${file}`, alt: `${id} 的个人图片 ${index + 1}`, width: image.webp_dimensions[0], height: image.webp_dimensions[1], reviewOnly: true };
    }));
  }
  const storyTitles = { 'co_create_handdrawn_timeline.webp': '手绘四格时间线 · 共创过程材料', 'a_group_concept_product_card.webp': 'A组产品概念卡 · 圆桌会构想，非全部已实装功能' };
  const story = manifest.story_assets.filter(image => basename(image.file) in storyTitles && !image.requires_manual_review).map(image => {
    const file = basename(image.file); assets.set(file, resolve(root, 'story_review_only', file));
    return { id: file, src: `/__local_review__/images/${file}`, alt: storyTitles[file], width: image.dimensions[0], height: image.dimensions[1], reviewOnly: true };
  });
  return { plugins: [react(), { name: 'private-local-member-review', configureServer(server) {
    server.middlewares.use('/__local_review__', (req, res) => {
      res.setHeader('Cache-Control', 'no-store'); res.setHeader('X-Robots-Tag', 'noindex, nofollow');
      res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
      if (req.headers['sec-fetch-site'] && !['same-origin', 'none'].includes(req.headers['sec-fetch-site'])) { res.statusCode = 403; res.end(); return; }
      const path = (req.url || '').split('?')[0];
      if (path === '/story' || path.startsWith('/members/')) {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify(path === '/story' ? story : members.get(path.slice('/members/'.length)) || [])); return;
      }
      const file = path.startsWith('/images/') ? path.slice('/images/'.length) : '';
      if (!assets.has(file)) { res.statusCode = 404; res.end(); return; }
      res.setHeader('Content-Type', 'image/webp'); createReadStream(assets.get(file)).pipe(res);
    });
  } }], base: './', server: { host: '127.0.0.1', cors: false }, define: { 'import.meta.env.VITE_REVIEW_ASSETS': JSON.stringify('true') } };
});
