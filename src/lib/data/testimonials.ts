export type Testimonial = {
  id: string;
  /** Quoted verbatim from the guest. Do not edit for grammar or length. */
  quote: string;
  author: string;
  location: string;
};

const testimonials: Testimonial[] = [
  {
    id: "chris-s",
    quote:
      "I'm always searching for a new favorite food spot to call home. My job has me on the road a lot and finding good food is hard. I came across Chateau de Capitaine on a recent NY trip and immediately fell in love with the place — the decor, the atmosphere and staff we're 5 star, and the food… oy vei I couldn't get enough. From the crab salad to the lobster bisque, then I had to try the grilled rainbow trout which I topped with shrimp in cream sauce. Simply delicious. To top it off there was live entertainment with artists that actually sounds good. All I can say is whenever I'm back in NY this is where I will be eating. Next time I'm bringing a crowd.",
    author: "Chris S.",
    location: "Queens, NY",
  },
  {
    id: "mike-r",
    quote:
      "The food and service was great. We had lunch with the whole family. Nurken took great care of us. Borsch and Yxa was really good. Kani salad, avocado salad was great. Grilled salmon was delicious! Will come back soon and tell all my friends!",
    author: "Mike R.",
    location: "Brooklyn, NY",
  },
  {
    id: "fallon-g",
    quote:
      "Excellent food, service, and entertainment! Great for any size party. I came with a group of ~30. The service was excellent. Food was the best of any Russian restaurant in the area. I only wish there was a bigger dance floor!",
    author: "Fallon G.",
    location: "Wayne, NJ",
  },
  {
    id: "raphael-m",
    quote:
      "We gave this place as a recommendation to several of our friends who ended up booking it for various occasions. We love the kitchen here, food is always fresh and well prepared. Dinner time the atmosphere is amazing and the interior decor is a nice touch to the theme of their cuisine specialty. Servers are extremely attentive and friendly.",
    author: "Raphael M.",
    location: "Brooklyn, NY",
  },
  {
    id: "dmitry-d",
    quote:
      "This place is great. Food, atmosphere, servers, food again. Must tried escargot. I been here twice will be back again.",
    author: "Dmitry D.",
    location: "Queens, NY",
  },
  {
    id: "nurken-b",
    quote:
      "I guess this is now my favourite place. I've been here several times and i have never been disappointed. My friends and I had shared everything what was ordered. We had seabass with polenta, scallops with risotto, beef lanquet, lanqustines, kumamoto oysters, baked rockfeller oysters, goose liver, turbot fish, mix fish tartars, lamb chops. Everything was amazing! Our waiter told us that the secret of such a great taste was not only because of skills of chef but also because all the products for food are delivered every day in the morning right from the JFK! When we came 2nd time the owner approached to us and asked about food. We found him as a very nice person. Currently in my opinion Chateau de Capitaine is the best place to gather my friends and relatives to celebrate parties!",
    author: "Nurken B.",
    location: "Brooklyn, NY",
  },
  {
    id: "yana-b",
    quote:
      "My bf and I came here for an anniversary a few months ago and it was perfect. We had the fois gras, calamari and fish and everything was delicious. The decor was beautiful and not overwhelming like most russian restaurants and they had English translations on their menus in case you bring someone who doesn't read/speak russian. We came on a sunday afternoon not expecting any music but there was a wonderful live singer who came on at 5pm.",
    author: "Yana B.",
    location: "Queens, NY",
  },
  {
    id: "ilona-k",
    quote:
      "We celebrated several occasions at Chateau De Capitaine. The food is top notch and people know it. On weekends and holidays it's hard to get a table. Make sure you reserve in advance. For appetizers, I would recommend ordering the burrata salad and the seared tuna. I've never had a better one of these anywhere else. For entrees, I would recommend going with seafood. The salt crusted Dorado was spectacular. For dessert, you can't go wrong. I've had the Napolean, Spartak, and sour cherry dumplings (vareniki s vishney). All excellent. In particular, the cherry dumplings are amazing!!! They're obviously hand made dumplings with a lot of whole cherries. The decor is clearly marine based and it looks beautiful and unique.",
    author: "Ilona K.",
    location: "Brooklyn, NY",
  },
  {
    id: "irina-b",
    quote:
      "My experience at Chateau De Capitaine was excellent! My family and I were celebrating a birthday and could not have been more pleased with the service and quality of food. We ordered a variety of salads, escargot, oysters, as well as fish for entrees. Everything was fresh, flavorful and seasoned exceptionally. The waiters were knowledgeable about how everything is prepared which was very helpful since one person in our party has food allergies and needed certain ingredients to be eliminated or substituted. They were happy to accommodate any changes and did not mess up the order. The desserts are all homemade and ALL of them we're delicious — not overly sweet but just right and full of flavor. We felt so welcomed. Highly recommend!",
    author: "Irina B.",
    location: "New York, NY",
  },
  {
    id: "mila-g",
    quote:
      "Lovely evening with my family. Great food, outstanding service. Thank you for keeping your standards higher. Enjoyed it a lot!!!! Will be back!!!",
    author: "Mila G.",
    location: "Brooklyn, NY",
  },
];

export function getTestimonials(): Testimonial[] {
  return testimonials;
}
