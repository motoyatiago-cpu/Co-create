import { useRef, useState } from 'react';
import type { GalleryImage } from '../data/memberGalleries';
import './member-photos.css';

export function MemberPhotos({ memberId, images, expanded, onExpand }: {
  memberId: string;
  images: readonly GalleryImage[];
  expanded: boolean;
  onExpand: (expanded: boolean) => void;
}) {
  const [index, setIndex] = useState(0);
  const [failed, setFailed] = useState(false);
  const touch = useRef<{ x: number; y: number } | null>(null);
  if (!images.length) return null;
  const image = images[index % images.length];
  const move = (direction: number) => { setIndex(value => (value + direction + images.length) % images.length); setFailed(false); };
  return <section className={`member-photos${expanded ? ' is-expanded' : ''}`} aria-label="个人图片画廊" data-member-id={memberId}>
    <div className="member-photos__heading"><h4>生活里的小片段</h4><span>成员分享</span></div>
    <figure onTouchStart={event => { touch.current = { x: event.touches[0].clientX, y: event.touches[0].clientY }; }} onTouchEnd={event => {
      if (!touch.current || !event.changedTouches.length) return;
      const dx = event.changedTouches[0].clientX - touch.current.x;
      const dy = event.changedTouches[0].clientY - touch.current.y;
      touch.current = null;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.4 && images.length > 1) { event.preventDefault(); move(dx < 0 ? 1 : -1); }
    }}>
      <button type="button" className="member-photos__image" aria-label={expanded ? '收起大图' : '查看大图'} aria-expanded={expanded} onClick={() => onExpand(!expanded)} onKeyDown={event => {
        if (event.key === 'ArrowLeft') { event.preventDefault(); move(-1); }
        if (event.key === 'ArrowRight') { event.preventDefault(); move(1); }
      }}>
        {failed ? <span>此图片暂时无法读取，可切换其他图片。</span> : <img key={image.id} src={image.src} alt={image.alt} width={image.width} height={image.height} loading={index === 0 ? 'eager' : 'lazy'} decoding="async" onError={() => setFailed(true)} />}
      </button>
      <figcaption aria-live="polite">{index + 1} / {images.length}</figcaption>
    </figure>
    <div className="member-photos__controls">
      {images.length > 1 && <><button type="button" onClick={() => move(-1)} aria-label="上一张个人图片">← 上一张</button><button type="button" onClick={() => move(1)} aria-label="下一张个人图片">下一张 →</button></>}
      <span>{expanded ? '按 Escape 收起大图' : images.length > 1 ? '可左右滑动，点击图片放大' : '点击图片放大'}</span>
    </div>
  </section>;
}
