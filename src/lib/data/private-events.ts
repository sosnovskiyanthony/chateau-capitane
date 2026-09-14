export type BanquetCourse = {
  label: string;
  items: string[];
};

export type BanquetTier = {
  id: string;
  name: string;
  pricePerPerson: number;
  /** Who the package suits — written for the site, not lifted from the old one. */
  summary: string;
  /** Unconfirmed by the restaurant; omitted rather than guessed. */
  minGuests?: number;
  courses: BanquetCourse[];
};

const tiers: BanquetTier[] = [
  {
    id: "kids",
    name: "Kids Banquet",
    pricePerPerson: 75,
    summary: "Built for children's parties, with food kids actually eat.",
    courses: [
      {
        label: "Cold appetizers & salad",
        items: [
          "Caesar salad",
          "Fresh salad",
          "Kani salad",
          "Avocado salad",
          "Lox",
        ],
      },
      {
        label: "Hot entrées",
        items: [
          "Burgers",
          "Chicken nuggets with french fries",
          "Chicken kebab with rice",
          "Chicken pelmeni",
        ],
      },
      {
        label: "Dessert & beverages",
        items: [
          "Mixed dessert cakes",
          "Juice and tea",
          "Sparkling Pellegrino",
          "Still Saratoga",
        ],
      },
    ],
  },
  {
    id: "memorial",
    name: "Memorial Banquet",
    pricePerPerson: 90,
    summary:
      "A quieter table for remembrance gatherings, with traditional dishes.",
    courses: [
      {
        label: "Cold appetizers & salad",
        items: [
          "Fresh garden salad",
          "Beef tongue",
          "Duck salad",
          "Avocado salad",
          "Arugula salad",
          "Assorted marinated vegetables",
          "Herring served with onion",
          "Chicken liver pâté with bruschetta & cherry sauce",
          "Salmon tartar",
          "Feta cheese",
        ],
      },
      {
        label: "Hot appetizers",
        items: [
          "Homemade potatoes",
          "Kutabi (spinach or meat)",
          "Vareniki with meat",
        ],
      },
      {
        label: "Hot entrées",
        items: [
          "Grilled salmon served with mashed potatoes or vegetables",
          "Mixed kebab — kebab po karski, lyulya kebab, chicken kebab with french fries",
        ],
      },
    ],
  },
  {
    id: "sunday-brunch",
    name: "Sunday Brunch",
    pricePerPerson: 100,
    summary: "A midday spread for family gatherings and christenings.",
    courses: [
      {
        label: "Cold appetizers & salad",
        items: [
          "Fresh garden salad",
          "Beef tongue",
          "Chicken Olivier salad",
          "Avocado salad",
          "Assorted marinated vegetables",
          "Herring served with onion",
          "Chicken liver pâté with bruschetta & cherry sauce",
          "Arugula salad",
          "Feta cheese",
        ],
      },
      {
        label: "Hot appetizers",
        items: [
          "Homemade potatoes",
          "Kutabi (spinach or meat)",
          "Vareniki with meat",
        ],
      },
      {
        label: "Hot entrées",
        items: [
          "Grilled salmon served with vegetables",
          "Lyulya kebab",
          "Chicken cutlets",
          "French fries",
        ],
      },
      {
        label: "Dessert & beverages",
        items: [
          "Mixed dessert cakes",
          "Coffee & tea",
          "Sparkling Pellegrino",
          "Still Saratoga",
        ],
      },
    ],
  },
  {
    id: "banquet-140",
    name: "Banquet",
    pricePerPerson: 140,
    summary:
      "The standard celebration menu — duck, seafood, and a mixed grill.",
    courses: [
      {
        label: "Cold appetizers & salad",
        items: [
          "Greek salad",
          "Arugula salad",
          "Kani salad",
          "Avocado salad",
          "Assorted marinated vegetables",
          "Olivier salad",
          "Seafood salad",
          "Salmon tartar",
          "Assorted fish platter",
          "Assorted meat platter",
          "Chicken liver pâté with bruschetta & cherry sauce",
        ],
      },
      {
        label: "Hot appetizers",
        items: [
          "Homemade potatoes served with mushrooms",
          "Kutabi (spinach or meat)",
        ],
      },
      {
        label: "Hot entrées",
        items: [
          "Duck served with couscous and sweet dried fruit",
          "Shrimp & salmon served with rice & Brussels sprouts",
          "Mixed kebab — kebab po karski, lyulya kebab, chicken kebab with french fries",
        ],
      },
      {
        label: "Dessert & beverages",
        items: [
          "Mixed fruit platter",
          "Mixed dessert cakes",
          "Coffee & tea",
          "Sparkling Pellegrino",
          "Still Saratoga",
        ],
      },
    ],
  },
  {
    id: "banquet-170",
    name: "Banquet",
    pricePerPerson: 170,
    summary: "Adds carpaccio, calamari and mussels, and a lamb-chop grill.",
    courses: [
      {
        label: "Cold appetizers & salad",
        items: [
          "Greek salad",
          "Duck salad",
          "Olivier salad",
          "Avocado salad",
          "Assorted marinated vegetables",
          "Seafood salad",
          "Trio tartar",
          "Assorted fish platter",
          "Assorted meat platter",
          "Chicken liver pâté with bruschetta & cherry sauce",
          "Mixed carpaccio",
        ],
      },
      {
        label: "Hot appetizers",
        items: [
          "Homemade potatoes served with mushrooms",
          "Kutabi or khachapuri",
          "Fried calamari",
          "Mussels",
        ],
      },
      {
        label: "Hot entrées",
        items: [
          "Short ribs poperechka with beans",
          "Shrimp & sturgeon served with pasta",
          "Mixed kebab — lamb chops, lyulya kebab, chicken kebab with french fries",
        ],
      },
      {
        label: "Dessert & beverages",
        items: [
          "Vareniki with cherry",
          "Mixed fruit platter",
          "Mixed dessert cakes",
          "Coffee & tea",
          "Sparkling Pellegrino",
          "Still Saratoga",
        ],
      },
    ],
  },
  {
    id: "banquet-185",
    name: "Banquet",
    pricePerPerson: 185,
    summary:
      "Lobster, oysters, and foie gras, with rib eye and a grilled meat platter.",
    courses: [
      {
        label: "Cold appetizers & salad",
        items: [
          "Greek salad",
          "Eel kani salad",
          "Trio tartar",
          "Octopus salad",
          "Assorted marinated vegetables",
          "Assorted fish platter — sea bass, sturgeon, semga",
          "Assorted meat platter",
          "Lobster salad served with mango sauce",
          "Oysters & shrimp cocktail",
          "Chicken liver pâté with bruschetta & cherry sauce",
          "Burrata cheese salad",
          "Skirt steak salad",
          "Mixed carpaccio — tuna, salmon, yellowtail",
        ],
      },
      {
        label: "Hot appetizers",
        items: [
          "Homemade potatoes served with mushrooms",
          "Kutabi — spinach & meat",
          "Goose liver foie gras topped with house-made berry sauce",
        ],
      },
      {
        label: "Hot entrées",
        items: [
          "Mixed seafood platter — langoustines, sturgeon and U3 shrimp with lobster polenta",
          "Prime rib eye steak served with mushroom couscous",
          "Grilled meat platter — lamb chops, Australian quail kebab, lyulya kebab, chicken kebab with french fries",
        ],
      },
      {
        label: "Dessert & beverages",
        items: [
          "Vareniki with cherry",
          "Mixed fruit platter",
          "Mixed dessert cakes",
          "Coffee & tea",
          "Sparkling Pellegrino",
          "Still Saratoga",
        ],
      },
    ],
  },
  {
    id: "banquet-230",
    name: "Banquet",
    pricePerPerson: 230,
    summary:
      "The full table — caviar, omakase sushi, whole lobster, and tomahawk steak.",
    courses: [
      {
        label: "Cold appetizers & salad",
        items: [
          "Sesame tuna salad",
          "Ogorod salad",
          "King crab legs salad",
          "Sushi, omakase style",
          "Whole lobster salad",
          "Assorted marinated vegetables",
          "Mixed tartar — tuna, salmon, yellowtail",
          "Oysters & shrimp cocktail",
          "Assorted fish platter — sea bass, sturgeon, semga",
          "Baked filet of sturgeon with black caviar",
          "Red caviar tower",
          "Pastrami tapas",
          "Foie gras torchon pâté",
        ],
      },
      {
        label: "Hot appetizers",
        items: [
          "Grilled octopus salad with grilled asparagus",
          "Homemade potatoes served with chanterelle mushrooms",
          "Mushroom Napoleon",
          "Foie gras with marmalade blinchiki",
        ],
      },
      {
        label: "Hot entrées",
        items: [
          "Mixed seafood platter — langoustines, jumbo shrimp in garlic sauce with lobster polenta",
          "Veal cheeks & veal sweetbreads served with sweet plov",
          "Prime tomahawk steak",
          "Grilled meat platter — lamb chops, lamb ribs, lyulya kebab with crispy thin fries",
        ],
      },
      {
        label: "Dessert & beverages",
        items: [
          "Vareniki with cherry",
          "Mixed fruit platter",
          "Mixed dessert cakes",
          "Coffee & tea",
          "Sparkling Pellegrino",
          "Still Saratoga",
        ],
      },
    ],
  },
];

export function getPrivateEventTiers(): BanquetTier[] {
  return tiers;
}
