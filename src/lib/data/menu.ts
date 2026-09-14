export type MenuItem = {
  name: string;
  description?: string;
  /** Dollars. Omit when the price is seasonal or by market — use `priceNote`. */
  price?: number;
  /** Qualifier shown next to (or instead of) the price: "each", "Seasonal price". */
  priceNote?: string;
};

export type MenuCategory = {
  id: string;
  name: string;
  description?: string;
  items: MenuItem[];
};

export type PrixFixeCourse = {
  label: string;
  options: string[];
};

const categories: MenuCategory[] = [
  {
    id: "vegetable-salads",
    name: "Vegetable Salads",
    items: [
      {
        name: "Green Salad",
        description: "Roman lettuce, cucumber, jalapeños, avocado, scallion",
        price: 18,
      },
      {
        name: "Fresh Salad",
        description: "Tomato, cucumber, red onion, jalapeños",
        price: 14,
      },
      {
        name: "Greek Salad",
        description:
          "Tomato, cucumber, red onion, Bulgarian pepper, feta cheese",
        price: 16,
      },
      {
        name: "Garden Sour Cream Egg Salad",
        description: "Tomato, cucumber, radish, scallion",
        price: 16,
      },
      {
        name: "Arugula Salad",
        description: "Portobello, mushrooms, goat cheese, marinated pepper",
        price: 16,
      },
      {
        name: "Burrata Salad",
        description:
          "Tomato, red onion, jalapeños, balsamic vinegar, olive oil, feta",
        price: 18,
      },
      {
        name: "Caesar Salad",
        description: "Roman lettuce, croutons",
        price: 16,
      },
      {
        name: "Avocado Salad",
        description: "Avocado, cilantro, tomato, onion, olive oil, vinegar",
        price: 16,
      },
      {
        name: "Mix Pickles",
        description: "Tomato, pickles, cabbage, green beans, pepper",
        price: 19,
      },
      { name: "Eggplant Caviar", price: 14 },
    ],
  },
  {
    id: "seafood-fish-salads",
    name: "Seafood and Fish Salads",
    items: [
      { name: "King Crab Legs Salad", price: 22 },
      { name: "Crab and Eel Salad", price: 27 },
      { name: "Crab Olivier", price: 16 },
      { name: "Seafood Salad", price: 20 },
      { name: "Octopus Salad", price: 21 },
      { name: "Tuna Tar Tar", price: 18 },
      { name: "Sesame Tuna", price: 24 },
      { name: "Salmon Tar Tar", price: 16 },
      { name: "Yellowtail Tar Tar", price: 18 },
      { name: "Trio Tar Tar", price: 26 },
      { name: "Shrimp Cocktail", price: 21 },
      { name: "Gefilte Fish", price: 28 },
      { name: "Lobster Salad", price: 24 },
      { name: "Sashimi", price: 24 },
      { name: "Ceviche Capitaine", price: 22 },
    ],
  },
  {
    id: "oysters-tartare-ceviche",
    name: "Oysters, Tartare, Carpaccio, and Ceviche",
    items: [
      { name: "Oysters Blue Point", price: 2.5, priceNote: "each" },
      { name: "Oysters Kumamoto", price: 3.5, priceNote: "each" },
      { name: "Oyster Shooters", price: 4, priceNote: "each" },
      { name: "Tuna Tartare", price: 18 },
      { name: "Salmon Tartare", price: 16 },
      { name: "Yellowtail Tartare", price: 18 },
      {
        name: "Mix Carpaccio",
        description: "Yellowtail, salmon, and tuna",
        price: 24,
      },
      { name: "Ceviche Capitan", price: 22 },
    ],
  },
  {
    id: "salted-smoked-fish",
    name: "Salted and Smoked Fish",
    items: [
      { name: "Lightly Salted Herring", price: 14 },
      { name: "Norwegian Salmon", price: 18 },
      { name: "Hot Smoked Sturgeon", price: 24 },
      { name: "Cold Smoked Sturgeon", price: 20 },
      { name: "Boiled Sturgeon", price: 24 },
      { name: "Smoked Chilean Sea Bass", price: 46 },
      { name: "Semga", price: 8 },
      { name: "Red Caviar", price: 24 },
      { name: "Black Caviar", priceNote: "Seasonal price" },
      { name: "Assorted Fish Platter", price: 48 },
    ],
  },
  {
    id: "meat-salads",
    name: "Meat Salads",
    items: [
      { name: "Assorted Meat Platter", price: 32 },
      { name: "Chicken Pâté", description: "With cherry sauce", price: 16 },
      {
        name: "Beef Tar Tar",
        description: "With pickles, capers, shallots, toasted bread",
        price: 24,
      },
      { name: "Basturma", price: 18 },
      { name: "Beef Tongue", price: 22 },
      { name: "Duck Salad", price: 22 },
      { name: "Steak Salad", price: 26 },
      { name: "Liver Torchon", price: 18 },
      {
        name: "Holodets",
        description: "Veal tongue, or beef feet and rooster",
        price: 22,
      },
    ],
  },
  {
    id: "cold-meat-appetizers",
    name: "Cold Meat Appetizers",
    items: [
      { name: "Liver Pâté", description: "Chicken liver", price: 16 },
      { name: "Beef Tartare", price: 24 },
      {
        name: "Beef Tongue",
        description: "Served with horseradish",
        price: 22,
      },
      { name: "Assorted Meat Platter", price: 32 },
    ],
  },
  {
    id: "hot-appetizers",
    name: "Hot Appetizers",
    items: [
      { name: "Lamb Testicles", price: 18 },
      { name: "Veal Sweetbreads", price: 32 },
      { name: "Veal Brain", price: 28 },
      { name: "Veal Cheeks", price: 29 },
      { name: "Dolma", price: 18 },
      {
        name: "Mushroom Napoleon",
        description: "Red pepper, garlic, stock. Serves 10–12.",
        price: 100,
        priceNote: "half $60",
      },
      { name: "Escargot", price: 18 },
      {
        name: "Calamari",
        description: "Tender steamed or fried, in red or white sauce",
        price: 18,
      },
      { name: "Crab Cakes", price: 22 },
      { name: "Lobster Polenta", price: 22 },
      { name: "Mussels", price: 16 },
      { name: "Risotto with Foie Gras", price: 24 },
    ],
  },
  {
    id: "from-the-sea",
    name: "From the Sea",
    items: [
      {
        name: "Scallops Risotto with Foie Gras and Truffles",
        price: 26,
      },
      { name: "Grilled Langoustines", price: 32 },
      { name: "Shrimps in White Sauce", price: 24 },
      { name: "Shrimps in Garlic Sauce with Pasta", price: 24 },
      { name: "Stuffed Jumbo Shrimps", price: 28 },
      { name: "Soft Shell Crabs", description: "Seasonal", price: 26 },
      { name: "Chilean Sea Bass", price: 42 },
      { name: "Grilled Branzino", price: 32 },
      { name: "Grilled Sturgeon", price: 29 },
      { name: "Turbot", price: 76 },
      {
        name: "Maine Lobster",
        description: "Boiled, steamed, grilled, or lobster tail",
        priceNote: "Seasonal price",
      },
      { name: "King Crab Legs", price: 42 },
      { name: "Seafood Combo", price: 47 },
      { name: "Salmon Papillote", price: 26 },
      { name: "Trout", price: 24 },
      { name: "Tuna Grilled", price: 32 },
    ],
  },
  {
    id: "dough-dishes",
    name: "Dough Dishes",
    items: [
      { name: "Belyash with Meat", price: 7, priceNote: "each" },
      { name: "Chebureki with Meat", price: 7, priceNote: "each" },
      { name: "Gurza", price: 14, priceNote: "each" },
      { name: "Khachapuri", price: 7, priceNote: "each" },
      {
        name: "Kutabi",
        description: "Meat, cheese, or greens",
        price: 4,
        priceNote: "each",
      },
      { name: "Pelmeni Chicken", price: 16 },
      { name: "Vareniki with Cheese", price: 16 },
      { name: "Vareniki with Cherry", price: 16 },
      { name: "Vareniki with Meat", price: 16 },
      { name: "Vareniki with Potato", price: 14 },
      { name: "Rastegay", price: 3, priceNote: "each" },
      {
        name: "Seafood Ravioli",
        description: "White or red cream sauce with cheese",
        price: 16,
      },
      { name: "Beet Ravioli", price: 14 },
      { name: "Siberian Ravioli", price: 14 },
    ],
  },
  {
    id: "soups",
    name: "Soups",
    items: [
      { name: "Borscht", price: 12 },
      { name: "Mushroom Barley", price: 12 },
      { name: "Mini Meatballs", price: 10 },
      { name: "Solyanka", price: 12 },
      { name: "Dushpora", price: 16 },
      { name: "Uha with Salmon or Sturgeon", price: 12 },
      { name: "Sturgeon Soup with Sturgeon Ravioli", price: 28 },
      { name: "Bouillabaisse", price: 42 },
    ],
  },
  {
    id: "fish-seafood-entrees",
    name: "Fish and Seafood Entrées",
    description:
      "Served with your choice of side: grilled vegetables, mashed potato, rice, french fries, or buckwheat.",
    items: [
      {
        name: "Hard-Shell Lobster",
        description: "Steamed or baked",
        priceNote: "Seasonal price",
      },
      {
        name: "Butterfly Lobster Tail, Garlic Sauce",
        description: "Served with corn on the cob and whole grain rice",
        price: 32,
      },
      { name: "Grilled Langoustines", price: 32 },
      {
        name: "Soft-Shell Crabs",
        description: "Served with brown butter and capers sauce",
        price: 28,
      },
      {
        name: "King Crab Legs",
        description: "Steamed or grilled",
        price: 44,
      },
      { name: "Shrimps in White Sauce", price: 24 },
      {
        name: "Stuffed Jumbo Shrimps with Seasonal Mushrooms",
        price: 28,
      },
      { name: "Shrimp Scampi on Toasted Brioche", price: 28 },
      { name: "Salmon en Papillote or Grilled", price: 26 },
      {
        name: "Lobster, U3 Shrimps, Mussels, Scallops",
        price: 47,
      },
      {
        name: "Grilled Rainbow Trout",
        description: "Served with creamy white sauce",
        price: 24,
      },
      { name: "Chilean Sea Bass with Creamy Polenta", price: 42 },
      { name: "Grilled Branzino", price: 32 },
      {
        name: "Dorado (Sea Bream), Salt-Crusted",
        description: "Roasted garlic, leeks, capers, and lemon vinaigrette",
        price: 32,
      },
      { name: "Turbot with Homemade Potatoes", price: 76 },
    ],
  },
  {
    id: "meat-entrees",
    name: "Meat Entrées",
    items: [
      { name: "Prime Rib-Eye Steak with Mushroom Sauce", price: 94 },
      { name: "Prime T-Bone Steak", price: 94 },
      { name: "Prime Tomahawk Steak", price: 120 },
      { name: "Filet Mignon with Mushroom Sauce", price: 54 },
      { name: "Filet Mignon with Madeira Sauce", price: 54 },
      { name: "Languets, Slightly Breaded", price: 38 },
      { name: "Beef Stroganoff", price: 32 },
      { name: "Rack of Veal", price: 42 },
      { name: "Short Ribs Poperechka", price: 28 },
      { name: "Beef Stew Short Ribs", price: 28 },
      { name: "Beef Cutlet", price: 18 },
      { name: "Chicken Cutlet", price: 16 },
      { name: "Rabbit in Sour Cream Mustard Sauce", price: 32 },
      { name: "Duck with Dried Fruits", price: 29 },
      { name: "Chicken Tabaka", price: 18 },
    ],
  },
  {
    id: "meat-on-the-grill",
    name: "Meat on the Grill",
    items: [
      { name: "Colorado Lamb Chops", price: 56 },
      { name: "Colorado Rack of Lamb", price: 56 },
      { name: "Lamb Shish Kebab", description: "Po Karski", price: 27 },
      { name: "Lamb Tenderloin Kebab", description: "Vyrezka", price: 21 },
      { name: "Lamb Rib Kebab", price: 22 },
      { name: "Veal Liver Kebab", price: 22 },
      { name: "Lyulya Kebab", price: 18 },
      { name: "Beef Tenderloin Kebab", price: 36 },
      { name: "Chicken Kebab", price: 18 },
      { name: "Australian Quail Kebab", price: 22 },
    ],
  },
  {
    id: "sides",
    name: "Side Dishes",
    description:
      "Special garnishes — angel hair pasta, mushroom couscous, creamy risotto, home potatoes, creamy polenta, Brussels sprouts — are $6 alongside an entrée.",
    items: [
      { name: "Mushroom Couscous", price: 12 },
      { name: "Risotto", price: 14 },
      { name: "Home Potato", price: 18 },
      { name: "Creamy Polenta", price: 8 },
      { name: "Pasta", price: 10 },
    ],
  },
  {
    id: "desserts",
    name: "Desserts",
    items: [
      {
        name: "Blintz with Cheese and Raisin",
        price: 6,
        priceNote: "each",
      },
      { name: "Chocolate Cake", price: 8 },
      { name: "Napoleon", price: 8 },
      { name: "Honey Sour Cream Cake", price: 8 },
      { name: "Apsheron", price: 8 },
      { name: "Spartak", price: 8 },
      { name: "Vertuta with Apple and Cherry Strudel", price: 14 },
      { name: "Ice Cream", price: 6 },
      { name: "Kartoshka", price: 5 },
      { name: "Tartufo Ice Cream", price: 8 },
      {
        name: "Fruit Plate",
        description: "Small or large",
        priceNote: "Market price",
      },
    ],
  },
  {
    id: "beverages",
    name: "Beverages",
    items: [
      { name: "Espresso", price: 4 },
      { name: "Double Espresso", price: 6 },
      { name: "Cappuccino", price: 6 },
      { name: "Americano Coffee", price: 3 },
      { name: "Assorted Organic Herbal Tea", description: "Teapot", price: 8 },
      { name: "Assorted Tea", price: 3 },
      { name: "Voss", price: 8 },
      { name: "S. Pellegrino", price: 8 },
      { name: "Compote", description: "Bottle", price: 12 },
      { name: "Borjomi", description: "Bottle", price: 6 },
      { name: "Assorted Lemonade", description: "Bottle", price: 6 },
      { name: "Assorted Soda", description: "Bottle", price: 6 },
    ],
  },
];

const lunchSpecialCourses: PrixFixeCourse[] = [
  {
    label: "Soup",
    options: [
      "Borsh",
      "Pea",
      "Mushroom",
      "Okroshka",
      "Solyanka",
      "Uha salmon",
    ],
  },
  {
    label: "Salad",
    options: [
      "Kani",
      "Caesar",
      "Pickled cabbage",
      "Avocado",
      "Fresh",
      "Sour cream egg garden",
    ],
  },
  {
    label: "Entrée",
    options: [
      "Beef pelmeni",
      "Beef cutlets",
      "Chicken cutlets",
      "Grilled salmon",
      "Trout fillet",
      "Lyulya kebab",
      "Chicken kebab",
      "Chicken stroganoff",
      "Beef stew",
      "Chicken tabaka",
      "Dolma",
      "Vareniki with cherry",
      "Vareniki with potato",
    ],
  },
  {
    label: "Beverage",
    options: ["Still or sparkling water", "Tea", "Coffee", "Soda", "Compot"],
  },
];

/** House policies shown alongside the menu. */
export const menuNotes = [
  "$100 minimum charge per person on Friday and Saturday.",
  "Corkage fee $20, Saturdays only. No corkage fee for banquets.",
] as const;

export function getMenuCategories(): MenuCategory[] {
  return categories;
}

export function getLunchSpecialCourses(): PrixFixeCourse[] {
  return lunchSpecialCourses;
}
