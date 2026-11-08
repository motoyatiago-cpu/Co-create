export interface Point { x: number; y: number }
export interface OrbitGeometry { width: number; height: number; size: number; samples: Point[]; lengths: number[]; total: number }

export function createGeometry(width: number, height: number, size: number): OrbitGeometry {
  const a = (width - size - 52) / 2;
  const b = (height - size - 56) / 2;
  const samples: Point[] = [], lengths = [0];
  let total = 0;
  for (let i = 0; i <= 1024; i++) {
    const t = i / 1024 * Math.PI * 2;
    const point = { x: width / 2 + a * Math.sin(t), y: height / 2 + b * Math.sin(2 * t) };
    samples.push(point);
    if (i) { total += Math.hypot(point.x - samples[i - 1].x, point.y - samples[i - 1].y); lengths.push(total); }
  }
  return { width, height, size, samples, lengths, total };
}

export function pointAt(geometry: OrbitGeometry, phase: number): Point {
  const distance = ((phase % 1 + 1) % 1) * geometry.total;
  let low = 0, high = geometry.lengths.length - 1;
  while (high - low > 1) { const mid = (low + high) >> 1; if (geometry.lengths[mid] < distance) low = mid; else high = mid; }
  const progress = (distance - geometry.lengths[low]) / (geometry.lengths[high] - geometry.lengths[low] || 1);
  const a = geometry.samples[low], b = geometry.samples[high];
  return { x: a.x + (b.x - a.x) * progress, y: a.y + (b.y - a.y) * progress };
}

// 小规模确定性约束：只计算缓存坐标，不在每帧读取布局，不引入物理引擎。
export function separate(points: Point[], geometry: OrbitGeometry, passes = 32) {
  const gap = geometry.size + 6, pad = geometry.size / 2 + 8;
  for (let pass = 0; pass < passes; pass++) {
    let moved = false;
    for (let i = 0; i < points.length; i++) for (let j = i + 1; j < points.length; j++) {
      const a = points[i], b = points[j], dx = b.x - a.x, dy = b.y - a.y;
      const distance = Math.hypot(dx, dy);
      if (distance >= gap - .01) continue;
      moved = true;
      const push = (gap - distance + .02) / 2;
      const nx = distance > .001 ? dx / distance : 0, ny = distance > .001 ? dy / distance : 1;
      a.x -= nx * push; a.y -= ny * push; b.x += nx * push; b.y += ny * push;
    }
    for (const point of points) {
      point.x = Math.max(pad, Math.min(geometry.width - pad, point.x));
      point.y = Math.max(pad, Math.min(geometry.height - pad, point.y));
    }
    if (!moved) break;
  }
  return points;
}

export function targetsAt(geometry: OrbitGeometry, count: number, phase: number) {
  if (count === 1) return [{ x: geometry.width / 2, y: geometry.height / 2 }];
  // 偶数人数留一个空拍，避免两位成员在交叉点迎面重合。
  const slots = count % 2 ? count : count + 1;
  return Array.from({ length: count }, (_, index) => pointAt(geometry, phase + index / slots));
}

export function pathData(geometry: OrbitGeometry) {
  return geometry.samples.filter((_, index) => index % 4 === 0).map((point, index) => `${index ? 'L' : 'M'}${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' ') + ' Z';
}
