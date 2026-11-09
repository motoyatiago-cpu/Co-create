export interface GalleryImage {
  id: string;
  src: string;
  alt: string;
  width: number;
  height: number;
  reviewOnly?: boolean;
}

// Publication authorized by user's explicit instruction to publish local images (2026-11-09).
// Only mapped gallery assets and the two locally previewed story materials; raw workbook and excluded screenshots remain private.
export const approvedMemberGalleries: Readonly<Record<string, readonly GalleryImage[]>> = {
  "member-01": [
    {
      "id": "member-01-01.webp",
      "src": "/team/gallery/member-01-01.webp",
      "alt": "member-01 的个人图片 1",
      "width": 1079,
      "height": 1118
    },
    {
      "id": "member-01-02.webp",
      "src": "/team/gallery/member-01-02.webp",
      "alt": "member-01 的个人图片 2",
      "width": 959,
      "height": 1280
    }
  ],
  "member-02": [
    {
      "id": "member-02-01.webp",
      "src": "/team/gallery/member-02-01.webp",
      "alt": "member-02 的个人图片 1",
      "width": 1200,
      "height": 1600
    }
  ],
  "member-03": [],
  "member-04": [
    {
      "id": "member-04-01.webp",
      "src": "/team/gallery/member-04-01.webp",
      "alt": "member-04 的个人图片 1",
      "width": 1080,
      "height": 1440
    }
  ],
  "member-05": [
    {
      "id": "member-05-01.webp",
      "src": "/team/gallery/member-05-01.webp",
      "alt": "member-05 的个人图片 1",
      "width": 1203,
      "height": 1600
    },
    {
      "id": "member-05-02.webp",
      "src": "/team/gallery/member-05-02.webp",
      "alt": "member-05 的个人图片 2",
      "width": 960,
      "height": 1280
    }
  ],
  "member-06": [
    {
      "id": "member-06-01.webp",
      "src": "/team/gallery/member-06-01.webp",
      "alt": "member-06 的个人图片 1",
      "width": 1280,
      "height": 1315
    },
    {
      "id": "member-06-02.webp",
      "src": "/team/gallery/member-06-02.webp",
      "alt": "member-06 的个人图片 2",
      "width": 1200,
      "height": 1600
    }
  ],
  "member-07": [
    {
      "id": "member-07-01.webp",
      "src": "/team/gallery/member-07-01.webp",
      "alt": "member-07 的个人图片 1",
      "width": 1200,
      "height": 1600
    }
  ],
  "member-08": [
    {
      "id": "member-08-01.webp",
      "src": "/team/gallery/member-08-01.webp",
      "alt": "member-08 的个人图片 1",
      "width": 1200,
      "height": 1600
    }
  ],
  "member-09": [
    {
      "id": "member-09-01.webp",
      "src": "/team/gallery/member-09-01.webp",
      "alt": "member-09 的个人图片 1",
      "width": 1200,
      "height": 1600
    },
    {
      "id": "member-09-02.webp",
      "src": "/team/gallery/member-09-02.webp",
      "alt": "member-09 的个人图片 2",
      "width": 1200,
      "height": 1600
    }
  ],
  "member-10": [
    {
      "id": "member-10-01.webp",
      "src": "/team/gallery/member-10-01.webp",
      "alt": "member-10 的个人图片 1",
      "width": 1600,
      "height": 726
    }
  ],
  "member-11": [
    {
      "id": "member-11-01.webp",
      "src": "/team/gallery/member-11-01.webp",
      "alt": "member-11 的个人图片 1",
      "width": 1200,
      "height": 1600
    },
    {
      "id": "member-11-02.webp",
      "src": "/team/gallery/member-11-02.webp",
      "alt": "member-11 的个人图片 2",
      "width": 1200,
      "height": 1600
    },
    {
      "id": "member-11-03.webp",
      "src": "/team/gallery/member-11-03.webp",
      "alt": "member-11 的个人图片 3",
      "width": 1600,
      "height": 1200
    }
  ],
  "member-12": [
    {
      "id": "member-12-01.webp",
      "src": "/team/gallery/member-12-01.webp",
      "alt": "member-12 的个人图片 1",
      "width": 1200,
      "height": 1600
    }
  ],
  "member-13": [
    {
      "id": "member-13-01.webp",
      "src": "/team/gallery/member-13-01.webp",
      "alt": "member-13 的个人图片 1",
      "width": 1600,
      "height": 1200
    },
    {
      "id": "member-13-02.webp",
      "src": "/team/gallery/member-13-02.webp",
      "alt": "member-13 的个人图片 2",
      "width": 1600,
      "height": 1200
    },
    {
      "id": "member-13-03.webp",
      "src": "/team/gallery/member-13-03.webp",
      "alt": "member-13 的个人图片 3",
      "width": 1200,
      "height": 1600
    },
    {
      "id": "member-13-04.webp",
      "src": "/team/gallery/member-13-04.webp",
      "alt": "member-13 的个人图片 4",
      "width": 1600,
      "height": 1200
    },
    {
      "id": "member-13-05.webp",
      "src": "/team/gallery/member-13-05.webp",
      "alt": "member-13 的个人图片 5",
      "width": 1600,
      "height": 1200
    }
  ],
  "member-14": [
    {
      "id": "member-14-01.webp",
      "src": "/team/gallery/member-14-01.webp",
      "alt": "member-14 的个人图片 1",
      "width": 1200,
      "height": 1600
    }
  ],
  "member-15": [],
  "member-16": [
    {
      "id": "member-16-01.webp",
      "src": "/team/gallery/member-16-01.webp",
      "alt": "member-16 的个人图片 1",
      "width": 1600,
      "height": 718
    },
    {
      "id": "member-16-02.webp",
      "src": "/team/gallery/member-16-02.webp",
      "alt": "member-16 的个人图片 2",
      "width": 1600,
      "height": 766
    },
    {
      "id": "member-16-03.webp",
      "src": "/team/gallery/member-16-03.webp",
      "alt": "member-16 的个人图片 3",
      "width": 1600,
      "height": 720
    }
  ],
  "member-17": [
    {
      "id": "member-17-01.webp",
      "src": "/team/gallery/member-17-01.webp",
      "alt": "member-17 的个人图片 1",
      "width": 1198,
      "height": 1600
    }
  ],
  "member-18": [
    {
      "id": "member-18-01.webp",
      "src": "/team/gallery/member-18-01.webp",
      "alt": "member-18 的个人图片 1",
      "width": 1200,
      "height": 1600
    }
  ],
  "member-19": [
    {
      "id": "member-19-01.webp",
      "src": "/team/gallery/member-19-01.webp",
      "alt": "member-19 的个人图片 1",
      "width": 900,
      "height": 1600
    },
    {
      "id": "member-19-02.webp",
      "src": "/team/gallery/member-19-02.webp",
      "alt": "member-19 的个人图片 2",
      "width": 1200,
      "height": 1600
    }
  ],
  "member-20": [
    {
      "id": "member-20-01.webp",
      "src": "/team/gallery/member-20-01.webp",
      "alt": "member-20 的个人图片 1",
      "width": 720,
      "height": 1558
    }
  ],
  "member-21": [
    {
      "id": "member-21-01.webp",
      "src": "/team/gallery/member-21-01.webp",
      "alt": "member-21 的个人图片 1",
      "width": 559,
      "height": 559
    }
  ],
  "member-22": [
    {
      "id": "member-22-01.webp",
      "src": "/team/gallery/member-22-01.webp",
      "alt": "member-22 的个人图片 1",
      "width": 1003,
      "height": 1496
    }
  ],
  "member-23": [
    {
      "id": "member-23-01.webp",
      "src": "/team/gallery/member-23-01.webp",
      "alt": "member-23 的个人图片 1",
      "width": 1201,
      "height": 1600
    },
    {
      "id": "member-23-02.webp",
      "src": "/team/gallery/member-23-02.webp",
      "alt": "member-23 的个人图片 2",
      "width": 1200,
      "height": 1600
    },
    {
      "id": "member-23-03.webp",
      "src": "/team/gallery/member-23-03.webp",
      "alt": "member-23 的个人图片 3",
      "width": 1200,
      "height": 1600
    }
  ],
  "member-24": [
    {
      "id": "member-24-02.webp",
      "src": "/team/gallery/member-24-02.webp",
      "alt": "member-24 的个人图片 1",
      "width": 1079,
      "height": 1372
    }
  ],
  "member-25": [
    {
      "id": "member-25-01.webp",
      "src": "/team/gallery/member-25-01.webp",
      "alt": "member-25 的个人图片 1",
      "width": 828,
      "height": 842
    },
    {
      "id": "member-25-02.webp",
      "src": "/team/gallery/member-25-02.webp",
      "alt": "member-25 的个人图片 2",
      "width": 828,
      "height": 485
    }
  ],
  "member-26": [
    {
      "id": "member-26-01.webp",
      "src": "/team/gallery/member-26-01.webp",
      "alt": "member-26 的个人图片 1",
      "width": 1600,
      "height": 1200
    }
  ],
  "member-27": [
    {
      "id": "member-27-01.webp",
      "src": "/team/gallery/member-27-01.webp",
      "alt": "member-27 的个人图片 1",
      "width": 1200,
      "height": 1600
    }
  ],
  "member-28": [],
  "member-29": [
    {
      "id": "member-29-02.webp",
      "src": "/team/gallery/member-29-02.webp",
      "alt": "member-29 的个人图片 1",
      "width": 1200,
      "height": 1600
    }
  ],
  "member-30": [
    {
      "id": "member-30-01.webp",
      "src": "/team/gallery/member-30-01.webp",
      "alt": "member-30 的个人图片 1",
      "width": 1422,
      "height": 1600
    },
    {
      "id": "member-30-02.webp",
      "src": "/team/gallery/member-30-02.webp",
      "alt": "member-30 的个人图片 2",
      "width": 1260,
      "height": 1600
    },
    {
      "id": "member-30-03.webp",
      "src": "/team/gallery/member-30-03.webp",
      "alt": "member-30 的个人图片 3",
      "width": 1200,
      "height": 1600
    }
  ],
  "member-31": [
    {
      "id": "member-31-01.webp",
      "src": "/team/gallery/member-31-01.webp",
      "alt": "member-31 的个人图片 1",
      "width": 1440,
      "height": 1080
    },
    {
      "id": "member-31-02.webp",
      "src": "/team/gallery/member-31-02.webp",
      "alt": "member-31 的个人图片 2",
      "width": 722,
      "height": 1600
    },
    {
      "id": "member-31-03.webp",
      "src": "/team/gallery/member-31-03.webp",
      "alt": "member-31 的个人图片 3",
      "width": 1599,
      "height": 1600
    },
    {
      "id": "member-31-04.webp",
      "src": "/team/gallery/member-31-04.webp",
      "alt": "member-31 的个人图片 4",
      "width": 1600,
      "height": 773
    },
    {
      "id": "member-31-05.webp",
      "src": "/team/gallery/member-31-05.webp",
      "alt": "member-31 的个人图片 5",
      "width": 719,
      "height": 1600
    },
    {
      "id": "member-31-06.webp",
      "src": "/team/gallery/member-31-06.webp",
      "alt": "member-31 的个人图片 6",
      "width": 1080,
      "height": 1456
    },
    {
      "id": "member-31-07.webp",
      "src": "/team/gallery/member-31-07.webp",
      "alt": "member-31 的个人图片 7",
      "width": 1002,
      "height": 1600
    },
    {
      "id": "member-31-08.webp",
      "src": "/team/gallery/member-31-08.webp",
      "alt": "member-31 的个人图片 8",
      "width": 1600,
      "height": 1599
    },
    {
      "id": "member-31-09.webp",
      "src": "/team/gallery/member-31-09.webp",
      "alt": "member-31 的个人图片 9",
      "width": 719,
      "height": 1600
    }
  ],
  "member-32": [
    {
      "id": "member-32-01.webp",
      "src": "/team/gallery/member-32-01.webp",
      "alt": "member-32 的个人图片 1",
      "width": 1200,
      "height": 1600
    }
  ]
};
export const approvedStoryMaterials: readonly GalleryImage[] = [
  {
    "id": "co_create_handdrawn_timeline.webp",
    "src": "/story/materials/co_create_handdrawn_timeline.webp",
    "alt": "手绘四格时间线 · 共创过程材料",
    "width": 1920,
    "height": 1675
  },
  {
    "id": "a_group_concept_product_card.webp",
    "src": "/story/materials/a_group_concept_product_card.webp",
    "alt": "A组产品概念卡 · 圆桌会构想，非全部已实装功能",
    "width": 1344,
    "height": 1038
  }
];
