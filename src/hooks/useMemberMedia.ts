import { useEffect, useState } from 'react';
import { approvedMemberGalleries, approvedStoryMaterials, type GalleryImage } from '../data/memberGalleries';

const localReview = import.meta.env.DEV && import.meta.env.VITE_REVIEW_ASSETS === 'true';
export function useMemberMedia(memberId: string) {
  const approved = approvedMemberGalleries[memberId] ?? [];
  const [review, setReview] = useState<readonly GalleryImage[]>([]);
  useEffect(() => {
    setReview([]);
    if (!localReview) return;
    const controller = new AbortController();
    fetch(`/__local_review__/members/${memberId}`, { signal: controller.signal })
      .then(response => response.ok ? response.json() : [])
      .then(images => { if (!controller.signal.aborted) setReview(images); })
      .catch(() => {});
    return () => controller.abort();
  }, [memberId]);
  return approved.length ? approved : review;
}

export function useStoryMedia(open: boolean) {
  const [review, setReview] = useState<readonly GalleryImage[]>([]);
  useEffect(() => {
    if (!localReview || !open) return;
    const controller = new AbortController();
    fetch('/__local_review__/story', { signal: controller.signal })
      .then(response => response.ok ? response.json() : [])
      .then(images => { if (!controller.signal.aborted) setReview(images); })
      .catch(() => {});
    return () => controller.abort();
  }, [open]);
  return { available: localReview || approvedStoryMaterials.length > 0, images: approvedStoryMaterials.length ? approvedStoryMaterials : review };
}
