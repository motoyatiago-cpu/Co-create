import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useAmbientMotion, useMedia } from './motion/preferences';

THREE.ColorManagement.enabled = false;

const CARD_TINTS = ['#f2a9c4', '#a98cf5', '#7ee0e3', '#f4e9d4', '#f2a9c4'];

const CARD_SPOTS = [
  { x: -4.8, y: 2.4, z: -2.4, ry: 0.52, rx: 0.14 },
  { x: 4.6, y: 1.5, z: -4, ry: -0.48, rx: -0.1 },
  { x: -4.1, y: -1.1, z: -6, ry: 0.42, rx: 0.08 },
  { x: 3.8, y: -2.3, z: -8, ry: -0.4, rx: -0.06 },
  { x: 0, y: 0.3, z: -11, ry: 0.1, rx: 0.04 },
];

const GLOW_SPOTS = [
  { color: '#f2a9c4', x: -4.6, y: 1.8, z: -5, scale: 9, opacity: 0.1 },
  { color: '#a98cf5', x: 4.2, y: -1.2, z: -7, scale: 11, opacity: 0.09 },
  { color: '#7ee0e3', x: 0, y: 3.4, z: -9, scale: 8, opacity: 0.06 },
];

const STAR_VERTEX = `
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uWarp;
  attribute vec3 aColor;
  attribute float aSize;
  attribute float aPhase;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    float wave = 0.5 + 0.5 * sin(uTime * (0.8 + fract(aPhase) * 1.6) + aPhase * 6.28318);
    gl_PointSize = aSize * uPixelRatio * (300.0 / max(0.1, -mvPosition.z)) * (0.8 + wave * 0.5) * (1.0 + uWarp * 2.2);
    vColor = aColor * (1.0 + uWarp * 0.9);
    vAlpha = (0.28 + wave * 0.5) * (1.0 + uWarp * 0.6);
  }
`;

const STAR_FRAGMENT = `
  uniform sampler2D uMap;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vec4 tex = texture2D(uMap, gl_PointCoord);
    if (tex.a < 0.02) discard;
    gl_FragColor = vec4(vColor, tex.a * vAlpha);
  }
`;

const CARD_VERTEX = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const CARD_FRAGMENT = `
  uniform vec3 uColor;
  uniform float uActive;
  uniform float uTime;
  varying vec2 vUv;

  float sdRoundBox(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + r;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
  }

  void main() {
    vec2 p = (vUv - 0.5) * vec2(1.62, 1.0);
    float d = sdRoundBox(p, vec2(0.72, 0.4), 0.07);
    float border = smoothstep(0.012, 0.0, abs(d));
    float glow = exp(-abs(d) * 15.0) * 0.5;
    float fill = smoothstep(0.0, -0.38, d) * 0.05;
    float sweep = 0.5 + 0.5 * sin((vUv.y + uTime * 0.05) * 18.0);
    float alpha = (border * 0.9 + glow * 0.65 + fill * (0.6 + sweep * 0.8)) * (0.16 + uActive * 0.84);
    gl_FragColor = vec4(uColor * (0.6 + uActive * 0.7), alpha);
  }
`;

function mulberry32(seed: number) {
  let value = seed >>> 0;
  return () => {
    value = (value + 0x6d2b79f5) >>> 0;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeGlowTexture() {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.28, 'rgba(255,255,255,0.85)');
  gradient.addColorStop(0.6, 'rgba(255,255,255,0.2)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.LinearSRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  return texture;
}

type CardPlane = {
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  base: (typeof CARD_SPOTS)[number];
  active: number;
};

export function ChapterField({ active }: { active: number }) {
  const { paused } = useAmbientMotion();
  const coarse = useMedia('(pointer: coarse)');
  const hostRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef(active);
  activeRef.current = active;

  useEffect(() => {
    if (paused || coarse) return;
    const host = hostRef.current;
    if (!host) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
    } catch {
      return;
    }

    renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.className = 'chapter-field__canvas';
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 100);
    camera.position.set(0, 0, 10);

    const glowTexture = makeGlowTexture();
    const compact = window.matchMedia('(max-width: 760px)').matches;
    const random = mulberry32(20261109);

    const starCount = compact ? 380 : 760;
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);
    const starSizes = new Float32Array(starCount);
    const starPhases = new Float32Array(starCount);
    const starColor = new THREE.Color();

    for (let index = 0; index < starCount; index += 1) {
      const offset = index * 3;
      starPositions[offset] = (random() * 2 - 1) * 11;
      starPositions[offset + 1] = (random() * 2 - 1) * 7.5;
      starPositions[offset + 2] = -16 + random() * 20;

      const tint = random();
      starColor.setRGB(0.96, 0.91, 0.83);
      if (tint > 0.84) starColor.lerp(new THREE.Color('#a98cf5'), 0.7);
      else if (tint > 0.7) starColor.lerp(new THREE.Color('#f2a9c4'), 0.6);
      else if (tint > 0.6) starColor.lerp(new THREE.Color('#7ee0e3'), 0.55);
      starColor.multiplyScalar(0.45 + random() * 0.7);

      starColors[offset] = starColor.r;
      starColors[offset + 1] = starColor.g;
      starColors[offset + 2] = starColor.b;
      starSizes[index] = 0.018 + random() * 0.055;
      starPhases[index] = random() * Math.PI * 2;
    }

    const starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeometry.setAttribute('aColor', new THREE.BufferAttribute(starColors, 3));
    starGeometry.setAttribute('aSize', new THREE.BufferAttribute(starSizes, 1));
    starGeometry.setAttribute('aPhase', new THREE.BufferAttribute(starPhases, 1));

    const starMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uMap: { value: glowTexture },
        uTime: { value: 0 },
        uPixelRatio: { value: 1 },
        uWarp: { value: 0 },
      },
      vertexShader: STAR_VERTEX,
      fragmentShader: STAR_FRAGMENT,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
    });

    const stars = new THREE.Points(starGeometry, starMaterial);
    stars.frustumCulled = false;
    scene.add(stars);

    const glows = GLOW_SPOTS.map(spec => {
      const material = new THREE.SpriteMaterial({
        map: glowTexture,
        color: new THREE.Color(spec.color),
        transparent: true,
        opacity: spec.opacity,
        depthWrite: false,
        depthTest: false,
        blending: THREE.AdditiveBlending,
      });
      const sprite = new THREE.Sprite(material);
      sprite.position.set(spec.x, spec.y, spec.z);
      sprite.scale.setScalar(spec.scale);
      scene.add(sprite);
      return sprite;
    });

    const cardGeometry = new THREE.PlaneGeometry(4.2, 2.6);
    const planes: CardPlane[] = CARD_SPOTS.map((base, index) => {
      const material = new THREE.ShaderMaterial({
        uniforms: {
          uColor: { value: new THREE.Color(CARD_TINTS[index]) },
          uActive: { value: 0 },
          uTime: { value: 0 },
        },
        vertexShader: CARD_VERTEX,
        fragmentShader: CARD_FRAGMENT,
        transparent: true,
        depthWrite: false,
        depthTest: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(cardGeometry, material);
      mesh.position.set(base.x, base.y, base.z);
      mesh.rotation.set(base.rx, base.ry, 0);
      scene.add(mesh);
      return { mesh, base, active: 0 };
    });

    let raf = 0;
    let lastTime = 0;
    let lastActive = -1;
    let warp = 0;
    let scrollT = 0;

    const updateScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      scrollT = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    };

    const resize = () => {
      const width = host.clientWidth || window.innerWidth;
      const height = host.clientHeight || window.innerHeight;
      const ratio = Math.min(window.devicePixelRatio || 1, 1.6);
      renderer.setPixelRatio(ratio);
      renderer.setSize(width, height, false);
      camera.aspect = width / Math.max(1, height);
      camera.updateProjectionMatrix();
      starMaterial.uniforms.uPixelRatio.value = ratio;
      if (!raf) renderer.render(scene, camera);
    };

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (!lastTime) lastTime = now;
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      const elapsed = now / 1000;

      const activeIndex = activeRef.current;
      if (activeIndex !== lastActive) {
        lastActive = activeIndex;
        warp = 1;
      }
      warp *= Math.exp(-dt * 2.6);

      starMaterial.uniforms.uTime.value = elapsed;
      starMaterial.uniforms.uWarp.value = warp;
      stars.rotation.y = -0.08 + scrollT * 0.7;
      stars.rotation.x = scrollT * 0.18;
      stars.position.z = -warp * 1.2;

      planes.forEach((plane, index) => {
        const target = index === activeIndex ? 1 : 0;
        plane.active += (target - plane.active) * Math.min(1, dt * 5);
        const { mesh, base } = plane;
        mesh.material.uniforms.uTime.value = elapsed;
        mesh.material.uniforms.uActive.value = plane.active;
        mesh.position.x = base.x + Math.sin(elapsed * 0.2 + index * 1.7) * 0.16;
        mesh.position.y = base.y + Math.cos(elapsed * 0.17 + index) * 0.18;
        mesh.position.z = base.z + plane.active * 1.9 + warp * 0.3;
        mesh.rotation.y = base.ry + Math.sin(elapsed * 0.16 + index) * 0.07;
        mesh.rotation.x = base.rx;
        mesh.scale.setScalar(1 + plane.active * 0.18);
      });

      glows.forEach((sprite, index) => {
        const spec = GLOW_SPOTS[index];
        sprite.position.x = spec.x + Math.sin(elapsed * 0.12 + index) * 0.35;
        sprite.position.y = spec.y + Math.cos(elapsed * 0.1 + index * 1.3) * 0.28;
        (sprite.material as THREE.SpriteMaterial).opacity =
          spec.opacity * (0.7 + 0.3 * Math.sin(elapsed * 0.25 + index)) + warp * 0.03;
      });

      renderer.render(scene, camera);
    };

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const syncMotion = () => {
      if (motionQuery.matches || document.hidden) {
        if (raf) {
          cancelAnimationFrame(raf);
          raf = 0;
        }
        renderer.render(scene, camera);
        return;
      }
      if (!raf) {
        lastTime = 0;
        raf = requestAnimationFrame(tick);
      }
    };

    resize();
    updateScroll();
    syncMotion();
    window.addEventListener('resize', resize);
    window.addEventListener('scroll', updateScroll, { passive: true });
    document.addEventListener('visibilitychange', syncMotion);
    motionQuery.addEventListener('change', syncMotion);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('scroll', updateScroll);
      document.removeEventListener('visibilitychange', syncMotion);
      motionQuery.removeEventListener('change', syncMotion);
      starGeometry.dispose();
      starMaterial.dispose();
      cardGeometry.dispose();
      planes.forEach(plane => plane.mesh.material.dispose());
      glows.forEach(sprite => (sprite.material as THREE.SpriteMaterial).dispose());
      glowTexture.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, [paused, coarse]);

  return <div ref={hostRef} className="chapter-field" aria-hidden="true" />;
}
