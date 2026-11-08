import { useEffect, useRef } from 'react';
import * as THREE from 'three';

THREE.ColorManagement.enabled = false;

const LAVENDER = new THREE.Color('#a98cf5');
const PINK = new THREE.Color('#f2a9c4');
const CYAN = new THREE.Color('#7ee0e3');
const CREAM = new THREE.Color('#f4e9d4');

const CAMERA_FOV = 38;
const CAMERA_Z = 10;

type Meteor = {
  sprite: THREE.Sprite;
  material: THREE.SpriteMaterial;
  velocity: THREE.Vector2;
  life: number;
  maxLife: number;
  active: boolean;
};

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

function gaussian(random: () => number) {
  const u = Math.max(random(), 1e-6);
  const v = random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function makeGlowTexture() {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.3, 'rgba(255,255,255,0.86)');
  gradient.addColorStop(0.62, 'rgba(255,255,255,0.22)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  return texture;
}

function makeStreakTexture() {
  const width = 256;
  const height = 32;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  const along = ctx.createLinearGradient(0, 0, width, 0);
  along.addColorStop(0, 'rgba(255,255,255,0)');
  along.addColorStop(0.55, 'rgba(255,255,255,0.16)');
  along.addColorStop(0.88, 'rgba(255,255,255,0.9)');
  along.addColorStop(1, 'rgba(255,255,255,1)');
  ctx.fillStyle = along;
  ctx.fillRect(0, 0, width, height);
  const across = ctx.createLinearGradient(0, 0, 0, height);
  across.addColorStop(0, 'rgba(0,0,0,0)');
  across.addColorStop(0.5, 'rgba(0,0,0,1)');
  across.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalCompositeOperation = 'destination-in';
  ctx.fillStyle = across;
  ctx.fillRect(0, 0, width, height);
  ctx.globalCompositeOperation = 'source-over';
  const head = ctx.createRadialGradient(width - 18, height / 2, 0, width - 18, height / 2, 20);
  head.addColorStop(0, 'rgba(255,255,255,0.95)');
  head.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = head;
  ctx.fillRect(width - 40, 0, 40, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  return texture;
}

function createPointsMaterial(texture: THREE.Texture, opacity: number, twinkle: number) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uMap: { value: texture },
      uTime: { value: 0 },
      uPixelRatio: { value: 1 },
      uOpacity: { value: opacity },
      uTwinkle: { value: twinkle },
    },
    vertexShader: `
      uniform float uTime;
      uniform float uPixelRatio;
      uniform float uTwinkle;
      uniform float uOpacity;
      attribute vec3 aColor;
      attribute float aSize;
      attribute float aPhase;
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        float wave = 0.5 + 0.5 * sin(uTime * (1.1 + fract(aPhase) * 2.2) + aPhase * 6.28318);
        float twinkle = mix(1.0, 0.45 + 0.85 * wave, uTwinkle);
        gl_PointSize = aSize * uPixelRatio * (300.0 / max(0.1, -mvPosition.z)) * twinkle;
        vColor = aColor;
        vAlpha = uOpacity * mix(1.0, 0.55 + 0.45 * wave, uTwinkle);
      }
    `,
    fragmentShader: `
      uniform sampler2D uMap;
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        vec4 tex = texture2D(uMap, gl_PointCoord);
        if (tex.a < 0.02) discard;
        gl_FragColor = vec4(vColor, tex.a * vAlpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
  });
}

type NebulaOptions = {
  count: number;
  radius: number;
  radialSpread: number;
  depthSpread: number;
  sizeMin: number;
  sizeMax: number;
  halo: boolean;
};

function buildNebulaGeometry(random: () => number, options: NebulaOptions) {
  const { count, radius, radialSpread, depthSpread, sizeMin, sizeMax, halo } = options;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const phases = new Float32Array(count);
  const color = new THREE.Color();

  let index = 0;
  while (index < count) {
    const theta = random() * Math.PI * 2;
    const density = 0.55 + 0.45 * Math.pow(0.5 + 0.5 * Math.sin(theta * 3 + 0.9), 2);
    if (random() > density) continue;

    const wobble = Math.sin(theta * 3.2 + 0.6) * 0.05 + Math.sin(theta * 7.4 + 2.1) * 0.022;
    const radial = radius + gaussian(random) * radialSpread + wobble;
    const angle = theta + gaussian(random) * 0.02;
    const offset = index * 3;

    positions[offset] = Math.cos(angle) * radial;
    positions[offset + 1] = Math.sin(angle) * radial * 0.86;
    positions[offset + 2] = gaussian(random) * depthSpread;

    const mix = 0.5 + 0.5 * Math.sin(theta * 2 + 0.6 + gaussian(random) * 0.35);
    color.copy(LAVENDER).lerp(PINK, mix);
    const cyanBand = Math.sin(theta * 5 + 2.3);
    if (cyanBand > 0.45) color.lerp(CYAN, (cyanBand - 0.45) * (halo ? 0.5 : 0.7));
    if (random() < (halo ? 0.04 : 0.06)) color.lerp(CREAM, 0.55 + random() * 0.35);
    color.multiplyScalar((halo ? 0.55 : 0.78) + random() * (halo ? 0.45 : 0.55));

    colors[offset] = color.r;
    colors[offset + 1] = color.g;
    colors[offset + 2] = color.b;
    sizes[index] = sizeMin + random() * (sizeMax - sizeMin);
    phases[index] = random() * Math.PI * 2;
    index += 1;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
  return geometry;
}

type SampledOptions = {
  count: number;
  sampleSize: number;
  depth: number;
  sizeMin: number;
  sizeMax: number;
  brightnessBoost: number;
};

function buildSampledGeometry(
  random: () => number,
  image: CanvasImageSource,
  options: SampledOptions,
) {
  const { count, sampleSize, depth, sizeMin, sizeMax, brightnessBoost } = options;
  const canvas = document.createElement('canvas');
  canvas.width = sampleSize;
  canvas.height = sampleSize;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(image, 0, 0, sampleSize, sampleSize);
  const { data } = ctx.getImageData(0, 0, sampleSize, sampleSize);

  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const phases = new Float32Array(count);
  const color = new THREE.Color();

  let index = 0;
  let attempts = 0;
  while (index < count && attempts < count * 40) {
    attempts += 1;
    const u = random();
    const v = random();
    const px = Math.min(sampleSize - 1, Math.floor(u * sampleSize));
    const py = Math.min(sampleSize - 1, Math.floor(v * sampleSize));
    const offset = (py * sampleSize + px) * 4;
    const r = data[offset] / 255;
    const g = data[offset + 1] / 255;
    const b = data[offset + 2] / 255;
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    if (lum < 0.14) continue;
    if (random() > Math.min(1, (lum - 0.14) * 4.5)) continue;

    const point = index * 3;
    positions[point] = u - 0.5;
    positions[point + 1] = 0.5 - v;
    const z = gaussian(random) * depth * (0.5 + lum);
    positions[point + 2] = z;

    const depthT = Math.max(-1, Math.min(1, z / (depth * 1.6)));
    const boost = brightnessBoost * (0.82 + random() * 0.36) * (1 + depthT * 0.22);
    color.setRGB(Math.min(1, r * boost), Math.min(1, g * boost), Math.min(1, b * boost));
    colors[point] = color.r;
    colors[point + 1] = color.g;
    colors[point + 2] = color.b;
    sizes[index] = (sizeMin + random() * (sizeMax - sizeMin)) * (1 + depthT * 0.35);
    phases[index] = random() * Math.PI * 2;
    index += 1;
  }

  if (index === 0) return null;

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
  geometry.setDrawRange(0, index);
  return geometry;
}

function buildStarGeometry(random: () => number, count: number) {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const phases = new Float32Array(count);
  const color = new THREE.Color();

  for (let index = 0; index < count; index += 1) {
    const offset = index * 3;
    positions[offset] = random() * 2 - 1;
    positions[offset + 1] = random() * 2 - 1;
    positions[offset + 2] = -1 - random() * 4;

    color.copy(CREAM);
    const tint = random();
    if (tint > 0.82) color.lerp(LAVENDER, 0.7);
    else if (tint > 0.68) color.lerp(PINK, 0.6);
    else if (tint > 0.58) color.lerp(CYAN, 0.55);
    color.multiplyScalar(0.5 + random() * 0.7);

    colors[offset] = color.r;
    colors[offset + 1] = color.g;
    colors[offset + 2] = color.b;
    sizes[index] = 0.018 + random() * 0.045;
    phases[index] = random() * Math.PI * 2;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
  return geometry;
}

export function NebulaScene() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    const hero = host?.closest<HTMLElement>('.hero');
    const art = hero?.querySelector<HTMLElement>('.hero-art');
    if (!host || !hero || !art) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    } catch {
      return;
    }

    renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.domElement.className = 'hero-nebula__canvas';
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(CAMERA_FOV, 1, 0.1, 100);
    camera.position.set(0, 0, CAMERA_Z);

    const renderFrame = () => renderer.render(scene, camera);
    let pixelRatio = renderer.getPixelRatio();
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let reduceMotion = motionQuery.matches;

    const glowTexture = makeGlowTexture();
    const streakTexture = makeStreakTexture();
    const random = mulberry32(20261108);
    const compactQuery = window.matchMedia('(max-width: 760px)');
    const compact = compactQuery.matches;

    const starGeometry = buildStarGeometry(random, compact ? 520 : 1100);
    const starMaterial = createPointsMaterial(glowTexture, 0.9, 1);
    const starPoints = new THREE.Points(starGeometry, starMaterial);
    starPoints.frustumCulled = false;
    scene.add(starPoints);

    const nebula = new THREE.Group();
    scene.add(nebula);

    const tilt = new THREE.Group();
    const baseTiltX = -0.46;
    const baseTiltY = 0.16;
    tilt.rotation.set(baseTiltX, baseTiltY, 0);
    nebula.add(tilt);

    const spin = new THREE.Group();
    tilt.add(spin);

    const nebulaMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uMap: { value: null },
        uOpacity: { value: 0 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D uMap;
        uniform float uOpacity;
        varying vec2 vUv;
        void main() {
          vec3 color = texture2D(uMap, vUv).rgb;
          float radius = length(vUv - 0.5);
          float alpha = 1.0 - smoothstep(0.40, 0.50, radius);
          gl_FragColor = vec4(color, alpha * uOpacity);
        }
      `,
      transparent: true,
      depthWrite: false,
      depthTest: false,
    });
    const planeGeometry = new THREE.PlaneGeometry(1, 1);
    const plane = new THREE.Mesh(planeGeometry, nebulaMaterial);
    plane.renderOrder = 0;
    spin.add(plane);

    const sparkGeometry = buildNebulaGeometry(random, {
      count: compact ? 800 : 1500,
      radius: 0.375,
      radialSpread: 0.055,
      depthSpread: 0.04,
      sizeMin: 0.018,
      sizeMax: 0.052,
      halo: false,
    });
    const sparkMaterial = createPointsMaterial(glowTexture, 0.6, 0.6);
    const sparks = new THREE.Points(sparkGeometry, sparkMaterial);
    sparks.frustumCulled = false;
    sparks.renderOrder = 2;
    spin.add(sparks);

    let volumeGeometry: THREE.BufferGeometry | null = null;
    let volumeMaterial: THREE.ShaderMaterial | null = null;
    let hazeGeometry: THREE.BufferGeometry | null = null;
    let hazeMaterial: THREE.ShaderMaterial | null = null;

    let disposed = false;
    const textureLoader = new THREE.TextureLoader();
    const nebulaTexture = textureLoader.load(
      `${import.meta.env.BASE_URL}art/nebula.webp`,
      texture => {
        if (disposed) {
          texture.dispose();
          return;
        }
        texture.colorSpace = THREE.LinearSRGBColorSpace;
        texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
        nebulaMaterial.uniforms.uMap.value = texture;
        nebulaMaterial.uniforms.uOpacity.value = 0.52;
        nebulaMaterial.needsUpdate = true;

        const source = texture.image as CanvasImageSource;
        volumeGeometry = buildSampledGeometry(random, source, {
          count: compact ? 10000 : 20000,
          sampleSize: compact ? 220 : 288,
          depth: 0.08,
          sizeMin: 0.03,
          sizeMax: 0.09,
          brightnessBoost: 0.95,
        });
        if (volumeGeometry) {
          volumeMaterial = createPointsMaterial(glowTexture, 0.6, 0.14);
          volumeMaterial.uniforms.uPixelRatio.value = pixelRatio;
          const volume = new THREE.Points(volumeGeometry, volumeMaterial);
          volume.frustumCulled = false;
          volume.renderOrder = 1;
          spin.add(volume);
        }

        hazeGeometry = buildSampledGeometry(random, source, {
          count: compact ? 1800 : 3600,
          sampleSize: compact ? 180 : 220,
          depth: 0.13,
          sizeMin: 0.09,
          sizeMax: 0.2,
          brightnessBoost: 0.8,
        });
        if (hazeGeometry) {
          hazeMaterial = createPointsMaterial(glowTexture, 0.1, 0.12);
          hazeMaterial.uniforms.uPixelRatio.value = pixelRatio;
          const haze = new THREE.Points(hazeGeometry, hazeMaterial);
          haze.frustumCulled = false;
          haze.renderOrder = 1;
          spin.add(haze);
        }

        renderFrame();
        hero.classList.add('nebula-ready');
      },
    );

    const meteors: Meteor[] = [];
    for (let index = 0; index < 6; index += 1) {
      const material = new THREE.SpriteMaterial({
        map: streakTexture,
        color: 0xffffff,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: false,
      });
      const sprite = new THREE.Sprite(material);
      sprite.scale.set(1.4, 0.07, 1);
      sprite.visible = false;
      sprite.renderOrder = 2;
      scene.add(sprite);
      meteors.push({
        sprite,
        material,
        velocity: new THREE.Vector2(),
        life: 0,
        maxLife: 1,
        active: false,
      });
    }

    let worldWidth = 8;
    let worldHeight = 6;

    const updateLayout = () => {
      const heroRect = hero.getBoundingClientRect();
      const artRect = art.getBoundingClientRect();
      const width = Math.max(1, Math.round(heroRect.width));
      const height = Math.max(1, Math.round(heroRect.height));
      const nextRatio = Math.min(window.devicePixelRatio || 1, 2);

      if (nextRatio !== pixelRatio) {
        pixelRatio = nextRatio;
        renderer.setPixelRatio(pixelRatio);
      }
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();

      worldHeight = 2 * Math.tan(THREE.MathUtils.degToRad(CAMERA_FOV / 2)) * CAMERA_Z;
      worldWidth = worldHeight * camera.aspect;
      const pxToWorld = worldHeight / height;

      const artWidth = Math.max(1, artRect.width);
      const artHeight = Math.max(1, artRect.height);
      const centerX = artRect.left - heroRect.left + artRect.width / 2;
      const centerY = artRect.top - heroRect.top + artRect.height / 2;
      nebula.position.set(
        (centerX - width / 2) * pxToWorld,
        (height / 2 - centerY) * pxToWorld,
        0,
      );
      nebula.scale.setScalar(artWidth * pxToWorld);
      plane.scale.set(1, artHeight / artWidth, 1);

      starPoints.scale.set(worldWidth * 0.62, worldHeight * 0.62, 1);
      sparkMaterial.uniforms.uPixelRatio.value = pixelRatio;
      starMaterial.uniforms.uPixelRatio.value = pixelRatio;
      if (volumeMaterial) volumeMaterial.uniforms.uPixelRatio.value = pixelRatio;
      if (hazeMaterial) hazeMaterial.uniforms.uPixelRatio.value = pixelRatio;

      if (!raf) renderFrame();
    };

    const buildMeteor = (meteor: Meteor) => {
      const direction = random() < 0.5 ? -1 : 1;
      const angle = THREE.MathUtils.degToRad(24 + random() * 26);
      const speed = 3.2 + random() * 3.4;
      meteor.velocity.set(direction * Math.cos(angle) * speed, -Math.sin(angle) * speed);
      meteor.sprite.position.set(
        (random() * 2 - 1) * worldWidth * 0.55,
        worldHeight * (0.18 + random() * 0.3),
        1.5,
      );
      meteor.material.rotation = Math.atan2(meteor.velocity.y, meteor.velocity.x);
      meteor.sprite.scale.set(1.1 + random() * 1.1, 0.05 + random() * 0.035, 1);
      meteor.material.opacity = 0;
      meteor.maxLife = 2.1 + random() * 1.5;
      meteor.life = meteor.maxLife;
      meteor.active = true;
      meteor.sprite.visible = true;
    };

    let meteorTimer = 2.2;
    const pointerTarget = new THREE.Vector2();
    const pointer = new THREE.Vector2();
    const onPointerMove = (event: PointerEvent) => {
      pointerTarget.set(
        (event.clientX / window.innerWidth) * 2 - 1,
        (event.clientY / window.innerHeight) * 2 - 1,
      );
    };
    window.addEventListener('pointermove', onPointerMove, { passive: true });

    let visible = true;
    let raf = 0;
    let elapsed = 0;
    let last = performance.now();

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const delta = Math.min((now - last) / 1000, 0.05);
      last = now;
      if (!visible) return;
      elapsed += delta;

      pointer.lerp(pointerTarget, 0.045);
      tilt.rotation.x = baseTiltX + pointer.y * 0.2 + Math.sin(elapsed * 0.22) * 0.12;
      tilt.rotation.y = baseTiltY + pointer.x * 0.28 + Math.cos(elapsed * 0.18) * 0.12;
      spin.rotation.z = elapsed * 0.04;

      sparkMaterial.uniforms.uTime.value = elapsed;
      starMaterial.uniforms.uTime.value = elapsed;
      if (volumeMaterial) volumeMaterial.uniforms.uTime.value = elapsed;
      if (hazeMaterial) hazeMaterial.uniforms.uTime.value = elapsed;

      starPoints.position.set(pointer.x * 0.08, -pointer.y * 0.06, 0);

      meteorTimer -= delta;
      if (meteorTimer <= 0) {
        const meteor = meteors.find(item => !item.active);
        if (meteor) buildMeteor(meteor);
        meteorTimer = 2.6 + random() * 5;
      }

      meteors.forEach(meteor => {
        if (!meteor.active) return;
        meteor.life -= delta;
        if (meteor.life <= 0) {
          meteor.active = false;
          meteor.sprite.visible = false;
          return;
        }
        meteor.sprite.position.x += meteor.velocity.x * delta;
        meteor.sprite.position.y += meteor.velocity.y * delta;
        if (
          meteor.sprite.position.y < -worldHeight * 0.65 ||
          Math.abs(meteor.sprite.position.x) > worldWidth * 0.75
        ) {
          meteor.active = false;
          meteor.sprite.visible = false;
          return;
        }
        const age = 1 - meteor.life / meteor.maxLife;
        meteor.material.opacity = 0.85 * Math.min(1, age / 0.16) * Math.min(1, meteor.life / 0.45);
      });

      renderFrame();
    };

    const start = () => {
      if (reduceMotion || raf) return;
      last = performance.now();
      raf = requestAnimationFrame(tick);
    };

    const stop = () => {
      if (!raf) return;
      cancelAnimationFrame(raf);
      raf = 0;
    };

    const syncMotion = () => {
      if (reduceMotion) {
        stop();
        meteors.forEach(meteor => {
          meteor.active = false;
          meteor.sprite.visible = false;
          meteor.material.opacity = 0;
        });
        renderFrame();
      } else {
        start();
      }
    };

    const onMotionChange = (event: MediaQueryListEvent) => {
      reduceMotion = event.matches;
      syncMotion();
    };
    motionQuery.addEventListener('change', onMotionChange);

    const onVisibilityChange = () => {
      if (document.hidden) stop();
      else if (!reduceMotion) start();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    const resizeObserver = new ResizeObserver(() => updateLayout());
    resizeObserver.observe(hero);
    resizeObserver.observe(art);

    const intersectionObserver = new IntersectionObserver(entries => {
      visible = entries[0]?.isIntersecting ?? true;
      if (visible) last = performance.now();
    });
    intersectionObserver.observe(hero);

    const onContextLost = (event: Event) => {
      event.preventDefault();
      stop();
    };
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);

    updateLayout();
    syncMotion();

    return () => {
      disposed = true;
      stop();
      hero.classList.remove('nebula-ready');
      motionQuery.removeEventListener('change', onMotionChange);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();

      starGeometry.dispose();
      sparkGeometry.dispose();
      planeGeometry.dispose();
      starMaterial.dispose();
      sparkMaterial.dispose();
      nebulaMaterial.dispose();
      if (volumeGeometry) volumeGeometry.dispose();
      if (volumeMaterial) volumeMaterial.dispose();
      if (hazeGeometry) hazeGeometry.dispose();
      if (hazeMaterial) hazeMaterial.dispose();
      nebulaTexture.dispose();
      meteors.forEach(meteor => meteor.material.dispose());
      glowTexture.dispose();
      streakTexture.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div ref={hostRef} className="hero-nebula" aria-hidden="true" />;
}
