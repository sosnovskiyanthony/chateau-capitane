# Restaurant photo sources

Selected from the signed-in Instagram profile on 2026-10-08. The user requires **2026 posts only** for new downloads. Verify visible post/upload dates; listing update dates or copyright years are insufficient. The recent feed mixes promotional artwork, reels, event collaborations, and clean food photography. The selected stills show real dishes without embedded promotional text and retain their full portrait framing. These selections reflect the posts reviewed, not an exhaustive audit of all 1,068 posts.

| Local asset | Source post | Placement | Selection reason |
| --- | --- | --- | --- |
| `public/photos/lobster-platter-instagram.jpg` | [April 28, 2026 lobster platter](https://www.instagram.com/chateau_capitaine/p/DXr35aPETzg/) | Kitchen gallery | Clear whole-lobster presentation, vivid color, no text overlay. |
| `public/photos/caviar-service-instagram.jpg` | [April 20, 2026 caviar service](https://www.instagram.com/chateau_capitaine/p/DXYMj-BjfLh/) | Kitchen gallery and About banquet photo | Shows blini, caviar, and accompaniments in the restaurant's table setting. |

Downloaded through the connected browser and stored locally so the website does not depend on expiring Instagram CDN URLs. Existing unrelated restaurant photos remain in place. A salmon tartare candidate was inspected before the date constraint, but its browser download failed and it was not added. Venue and chef placeholders still require suitable verified photographs.

## Other candidates

- [OpenTable](https://www.opentable.com/r/chateau-de-capitaine-brooklyn): the inspected restaurant-uploaded exterior photo is dated October 1, 2018; excluded.
- [Tripadvisor](https://www.tripadvisor.com/Restaurant_Review-g60827-d7256824-Reviews-Chateau_De_Capitaine-Brooklyn_New_York.html): the interior photo is dated June 2016; excluded.
- [June 23, 2026 event collaboration](https://www.instagram.com/anastasy__events/p/DZ7mS8sDpst/): both inspected carousel stills focus on people rather than a useful restaurant view; neither was downloaded.

## Verification

Gallery and About photos were checked at 375px, 768px, and 1280px. Both loaded and retained full portrait framing. Adding `min-w-0` to the About photo grid fixed mobile overflow. Lint and production build passed.
