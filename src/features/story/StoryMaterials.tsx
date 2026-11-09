import { useState } from 'react';
import { useStoryMedia } from '../../hooks/useMemberMedia';

export function StoryMaterials() {
  const [open, setOpen] = useState(false);
  const { available, images } = useStoryMedia(open);
  if (!available) return null;
  return <details className="story-materials" onToggle={event => setOpen(event.currentTarget.open)}>
    <summary>幕后共创记录</summary>
    <p>从手绘草图到概念卡，看看圆桌会里脑洞逐渐成形的过程。</p>
    {images.some(image => image.reviewOnly) && <p className="story-materials__review">本机候选素材 · 公开范围待确认</p>}
    <div>{images.map(image => <figure key={image.id}><a href={image.src} target="_blank" rel="noreferrer" aria-label={`查看大图：${image.alt}`}><img src={image.src} alt={image.alt} width={image.width} height={image.height} loading="lazy" decoding="async" /></a><figcaption>{image.alt}</figcaption></figure>)}</div>
  </details>;
}
