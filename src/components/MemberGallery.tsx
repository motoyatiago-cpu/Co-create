import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { CSS3DObject, CSS3DRenderer } from 'three/examples/jsm/renderers/CSS3DRenderer.js';
import type { Member } from '../types/member';

type Entry = { member: Member; object: CSS3DObject; root: HTMLButtonElement };

type GalleryState = {
  renderer: CSS3DRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  entries: Map<string, Entry>;
  layout: () => void;
};

const FOV = 50;
const MAX_TILE = 178;

function columnsFor(width: number) {
  if (width >= 1200) return 6;
  if (width >= 1000) return 5;
  if (width >= 820) return 4;
  if (width >= 280) return 3;
  return 2;
}

function buildCard(member: Member, index: number, onOpen: (member: Member, trigger: HTMLButtonElement) => void) {
  const root = document.createElement('button');
  root.type = 'button';
  root.className = `member-tile tone-${member.tone}`;
  root.dataset.memberId = member.id;
  root.setAttribute('aria-label', `打开${member.name}的名片`);
  root.style.setProperty('--tile-delay', `${Math.min(index, 18) * 45}ms`);
  root.style.setProperty('--tile-float-delay', `${-((index % 9) * 0.7)}s`);
  root.style.setProperty('--tile-float-duration', `${5.4 + (index % 5) * 0.6}s`);

  const float = document.createElement('span');
  float.className = 'member-tile__float';
  const inner = document.createElement('span');
  inner.className = 'member-tile__inner';
  const portrait = document.createElement('span');
  portrait.className = 'member-tile__portrait';

  const initial = () => {
    const fallback = document.createElement('span');
    fallback.className = 'member-tile__initial';
    fallback.setAttribute('aria-hidden', 'true');
    fallback.textContent = Array.from(member.name)[0];
    return fallback;
  };

  if (member.avatarUrl) {
    const image = document.createElement('img');
    image.src = member.avatarUrl;
    image.alt = '';
    image.draggable = false;
    image.addEventListener('error', () => { image.remove(); portrait.append(initial()); }, { once: true });
    portrait.append(image);
  } else {
    portrait.append(initial());
  }

  const name = document.createElement('span');
  name.className = 'member-tile__name';
  name.textContent = member.name;
  const caption = document.createElement('span');
  caption.className = 'member-tile__nickname';
  caption.textContent = member.nickname ?? member.keywords[0] ?? '第1组';
  inner.append(portrait, name, caption);
  float.append(inner);
  root.append(float);
  root.addEventListener('click', () => onOpen(member, root));
  return root;
}

export function MemberGallery({ members, visible, paused, onOpen }: {
  members: readonly Member[];
  visible: readonly Member[];
  paused: boolean;
  onOpen: (member: Member, trigger: HTMLButtonElement) => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<GalleryState | null>(null);
  const visibleRef = useRef<readonly Member[]>(visible);
  visibleRef.current = visible;
  const onOpenRef = useRef(onOpen);
  onOpenRef.current = onOpen;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const renderer = new CSS3DRenderer();
    renderer.domElement.className = 'member-gallery__stage';
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(FOV, 1, 1, 8000);
    const entries = new Map<string, Entry>();

    members.forEach((member, index) => {
      const root = buildCard(member, index, (picked, trigger) => onOpenRef.current(picked, trigger));
      const object = new CSS3DObject(root);
      object.visible = false;
      scene.add(object);
      entries.set(member.id, { member, object, root });
    });

    let lastWidth = 0;
    const layout = () => {
      const width = host.clientWidth;
      if (width < 40) return;
      lastWidth = width;
      const current = visibleRef.current;
      const columns = Math.min(columnsFor(width), Math.max(1, current.length));
      const padding = width < 600 ? 6 : 14;
      const gap = width < 600 ? 12 : 18;
      const cardWidth = Math.max(88, Math.min(MAX_TILE, Math.floor((width - padding * 2 - gap * (columns - 1)) / columns)));
      const cardHeight = Math.round(cardWidth * 1.3);
      const rows = Math.max(1, Math.ceil(current.length / columns));
      const height = Math.max(240, padding * 2 + rows * cardHeight + (rows - 1) * gap);

      host.style.height = `${height}px`;
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.position.z = (height / 2) / Math.tan(THREE.MathUtils.degToRad(FOV / 2)) * 0.99;
      camera.updateProjectionMatrix();

      const visibleIds = new Set(current.map(member => member.id));
      entries.forEach(({ object, root }, id) => {
        const show = visibleIds.has(id);
        object.visible = show;
        root.hidden = !show;
        if (!show) return;
        root.style.width = `${cardWidth}px`;
        root.style.height = `${cardHeight}px`;
      });

      current.forEach((member, index) => {
        const entry = entries.get(member.id);
        if (!entry) return;
        const column = index % columns;
        const row = Math.floor(index / columns);
        const x = (column - (columns - 1) / 2) * (cardWidth + gap);
        const y = ((rows - 1) / 2 - row) * (cardHeight + gap);
        entry.object.position.set(x, y, -Math.abs(x) * 0.16);
        entry.object.rotation.set(0, -x * 0.0005, 0);
      });

      renderer.render(scene, camera);
    };

    const state: GalleryState = { renderer, scene, camera, entries, layout };
    stateRef.current = state;

    // 自身会改高度，只在宽度变化时重排，并推迟到下一帧，避免 ResizeObserver 自触发循环。
    let frame = 0;
    const scheduleLayout = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        if (host.clientWidth >= 40 && host.clientWidth !== lastWidth) layout();
      });
    };
    const observer = new ResizeObserver(scheduleLayout);
    observer.observe(host);
    layout();

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      stateRef.current = null;
      entries.clear();
      renderer.domElement.remove();
    };
  }, [members]);

  useEffect(() => {
    stateRef.current?.layout();
  }, [visible]);

  return <div ref={hostRef} className="member-gallery" data-paused={paused || undefined} />;
}
