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
        aspect: "aspect-4/3",
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
        alt: "A children's party table set for the kids banquet",
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
        id: "seafood-platter",
        alt: "A mixed seafood platter with langoustines and shrimp",
        aspect: "aspect-3/2",
        feature: true,
      },
      {
        id: "pickled-tomatoes",
        alt: "House-cured pickled tomatoes on a serving plate",
        aspect: "aspect-square",
      },
      {
        id: "chicken-tabaka",
        alt: "Chalakhach chicken tabaka pressed flat and crisped",
        aspect: "aspect-square",
      },
      {
        id: "roasted-duck",
        alt: "Roasted duck in fruit sauce, carved on a platter",
        aspect: "aspect-square",
      },
      {
        id: "borscht",
        alt: "A bowl of borscht with sour cream and dill",
        aspect: "aspect-square",
      },
      {
        id: "kebabs",
        alt: "Mixed kebabs coming off the grill",
        aspect: "aspect-4/3",
      },
      {
        id: "caviar",
        alt: "Red caviar tower from the banquet table",
        aspect: "aspect-4/3",
      },
      {
        id: "tomahawk",
        alt: "A prime tomahawk steak rested and sliced",
        aspect: "aspect-4/3",
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
