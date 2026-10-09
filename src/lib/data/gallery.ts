export type PhotoGroup = {
  id: string;
  name: string;
  description?: string;
  photos: Photo[];
};

export type Photo = {
  id: string;
  /** Specific alt text — used as the placeholder label until a photo exists. */
  alt: string;
  aspect: string;
  /** Spans two columns on wide screens, for visual rhythm. */
  feature?: boolean;
  /**
   * Path under /public. While undefined, the grid renders a labelled
   * placeholder at the same aspect ratio — add the path and the photo appears
   * with no other change.
   */
  src?: string;
};

const groups: PhotoGroup[] = [
  {
    id: "rooms",
    name: "The rooms",
    description:
      "The dining room, the bar, and the spaces we set aside for parties.",
    photos: [
      {
        id: "dining-room-full",
        alt: "The main dining room with tables set for dinner service",
        aspect: "aspect-3/2",
        feature: true,
      },
      {
        id: "bar",
        alt: "The bar with bottles lit from behind",
        aspect: "aspect-3/4",
      },
      {
        id: "dining-room-detail",
        alt: "A set table with linen, glassware, and bread",
        aspect: "aspect-3/4",
      },
      {
        id: "entrance",
        alt: "The entrance on Coney Island Avenue at dusk",
        // Portrait: the source photo is a tall storefront shot, not shot for a 4:3 crop.
        aspect: "aspect-3/4",
        src: "/photos/entrance-night.jpg",
      },
    ],
  },
  {
    id: "private-events",
    name: "Private events",
    description:
      "Banquet tables laid for birthdays, anniversaries, and family gatherings.",
    photos: [
      {
        id: "banquet-long-table",
        alt: "A long banquet table laid with the full cold course",
        aspect: "aspect-3/2",
        feature: true,
      },
      {
        id: "private-room",
        alt: "The private dining room arranged for a seated party",
        aspect: "aspect-4/3",
      },
      {
        id: "cold-table",
        alt: "Cold appetizers and salads covering a banquet table",
        aspect: "aspect-4/3",
      },
      {
        id: "kids-party",
        alt: "A children’s party table set for the kids banquet",
        aspect: "aspect-4/3",
      },
      {
        id: "toast",
        alt: "Guests raising a toast at a banquet",
        aspect: "aspect-4/3",
      },
    ],
  },
  {
    id: "kitchen",
    name: "From the kitchen",
    description: "What comes out of it.",
    photos: [
      {
        id: "lobster-platter",
        alt: "Whole lobster with red caviar, greens, and lemon on a white platter",
        aspect: "aspect-4/5",
        src: "/photos/lobster-platter-instagram.jpg",
      },
      {
        id: "pickled-tomatoes",
        alt: "House-cured pickled tomatoes on a serving plate",
        aspect: "aspect-square",
        src: "/photos/mixed-pickles.jpg",
      },
      {
        id: "chicken-tabaka",
        alt: "Chalakhach chicken tabaka pressed flat and crisped",
        aspect: "aspect-square",
        src: "/photos/chicken-tabaka.jpg",
      },
      {
        id: "roasted-duck",
        alt: "Roasted duck in fruit sauce, carved on a platter",
        aspect: "aspect-square",
        src: "/photos/roasted-duck.jpg",
      },
      {
        id: "borscht",
        alt: "A bowl of borscht with sour cream and dill",
        aspect: "aspect-square",
        src: "/photos/borscht.jpg",
      },
      {
        id: "kebabs",
        alt: "Mixed kebabs coming off the grill",
        aspect: "aspect-4/3",
        src: "/photos/kebabs-grill.jpg",
      },
      {
        id: "caviar",
        alt: "Red caviar served with blini and accompaniments at a banquet table",
        aspect: "aspect-4/5",
        src: "/photos/caviar-service-instagram.jpg",
      },
      {
        id: "tomahawk",
        alt: "A prime tomahawk steak rested and sliced",
        aspect: "aspect-4/3",
        src: "/photos/tomahawk-steak.jpg",
      },
      {
        id: "napoleon-cake",
        alt: "A slice of Napoleon cake",
        aspect: "aspect-4/3",
      },
    ],
  },
];

export function getPhotoGroups(): PhotoGroup[] {
  return groups;
}

export function hasGalleryPhotos(): boolean {
  return groups.some((group) =>
    group.photos.some((photo) => photo.src !== undefined),
  );
}
