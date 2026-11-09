export interface GalleryImage {
  id: string;
  src: string;
  alt: string;
  width: number;
  height: number;
  reviewOnly?: boolean;
}

// Only explicitly approved images belong here and in public/team/gallery/.
// The candidate ZIP stays outside this repository and outside production builds.
export const approvedMemberGalleries: Readonly<Record<string, readonly GalleryImage[]>> = {};
export const approvedStoryMaterials: readonly GalleryImage[] = [];
