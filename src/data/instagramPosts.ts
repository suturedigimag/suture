export interface InstagramPost {
  id: string;
  src: string;
  image?: string;
  caption: string;
  permalink: string;
  timestamp: string;
  mediaType?: 'IMAGE' | 'CAROUSEL_ALBUM' | 'VIDEO';
  alt?: string;
  altText?: string;
}

export const OFFICIAL_IG_PROFILE = 'https://www.instagram.com/litclubpsgimsr/';

export const INSTAGRAM_POSTS: InstagramPost[] = [
  {
    id: '18331116538281101',
    src: 'https://behold.pictures/eyJ1IjoiZ1l2ekdPSVlGdWVXanhaUFY2cXpqZWV4dms1MyIsImYiOiJkeURPc3dieWU3Wk83RkhnNTd5RSIsInAiOiIxODMzMTExNjUzODI4MTEwMSIsImgiOiI6bG9sczgifQ.jpg?class=squareLarge',
    alt: 'Jojo Rabbit Movie Screening',
    caption: 'A little boy, enamoured by Adolf Hitler\'s authoritarian personality, aspires to find a place in the Nazi army... The Literature Club of PSGIMSR cordially invites you all to the screening of Jojo Rabbit.',
    permalink: 'https://www.instagram.com/p/DaXkWZfRZFF/',
    timestamp: '2026-07-04T10:51:09+0000',
    mediaType: 'IMAGE'
  },
  {
    id: '17991999590761483-1',
    src: 'https://behold.pictures/eyJ1IjoiZ1l2ekdPSVlGdWVXanhaUFY2cXpqZWV4dms1MyIsImYiOiJkeURPc3dieWU3Wk83RkhnNTd5RSIsInAiOiIxNzk5MTk5OTU5MDc2MTQ4MyIsImgiOiIxMHdreGNuIn0.jpg?class=squareLarge',
    alt: 'Fiction vs Faculty Episode 3',
    caption: '"Fiction vs Faculty" was far too much delight for our faculties! Episode 3 witnessed Dr. Sujaya Menon (Department of Medicine) evince her erudition with remarkable elegance.',
    permalink: 'https://www.instagram.com/p/DVJhCcBiYX1/',
    timestamp: '2026-02-24T17:15:50+0000',
    mediaType: 'CAROUSEL_ALBUM'
  },
  {
    id: '17991999590761483-2',
    src: 'https://behold.pictures/eyJ1IjoiZ1l2ekdPSVlGdWVXanhaUFY2cXpqZWV4dms1MyIsImYiOiJkeURPc3dieWU3Wk83RkhnNTd5RSIsInAiOiIxNzk5MTk5OTU5MDc2MTQ4MyIsImgiOiIxanRjaXRiIiwiYyI6IjE4Mzg2MDkzNzk0MTUyODc2In0.jpg?class=squareLarge',
    alt: 'Dr. Sujaya Menon at Fiction vs Faculty',
    caption: 'Dr. Sujaya Menon from the Department of Medicine analyzing medical accuracy in classic films during Fiction vs Faculty.',
    permalink: 'https://www.instagram.com/p/DVJhCcBiYX1/',
    timestamp: '2026-02-24T17:15:50+0000',
    mediaType: 'IMAGE'
  },
  {
    id: '17991999590761483-3',
    src: 'https://behold.pictures/eyJ1IjoiZ1l2ekdPSVlGdWVXanhaUFY2cXpqZWV4dms1MyIsImYiOiJkeURPc3dieWU3Wk83RkhnNTd5RSIsInAiOiIxNzk5MTk5OTU5MDc2MTQ4MyIsImgiOiIxd3dvNGV5IiwiYyI6IjE3OTMzMzM3MjI1MDM5MTk3In0.jpg?class=squareLarge',
    alt: 'Fiction vs Faculty Student Audience',
    caption: 'Engaged medical students listening intently during the interactive Q&A of Fiction vs Faculty at PSGIMSR.',
    permalink: 'https://www.instagram.com/p/DVJhCcBiYX1/',
    timestamp: '2026-02-24T17:15:50+0000',
    mediaType: 'IMAGE'
  },
  {
    id: '17991999590761483-4',
    src: 'https://behold.pictures/eyJ1IjoiZ1l2ekdPSVlGdWVXanhaUFY2cXpqZWV4dms1MyIsImYiOiJkeURPc3dieWU3Wk83RkhnNTd5RSIsInAiOiIxNzk5MTk5OTU5MDc2MTQ4MyIsImgiOiJsZXg5bGMiLCJjIjoiMTgwNzkyNDA2NTgwNjcyODMifQ.jpg?class=squareLarge',
    alt: 'Fiction vs Faculty Scene Analysis',
    caption: 'Faculty & students dissecting cinematic depictions of emergency healthcare and diagnostic decisions.',
    permalink: 'https://www.instagram.com/p/DVJhCcBiYX1/',
    timestamp: '2026-02-24T17:15:50+0000',
    mediaType: 'IMAGE'
  },
  {
    id: '18111214099680091',
    src: 'https://behold.pictures/eyJ1IjoiZ1l2ekdPSVlGdWVXanhaUFY2cXpqZWV4dms1MyIsImYiOiJkeURPc3dieWU3Wk83RkhnNTd5RSIsInAiOiIxODExMTIxNDA5OTY4MDA5MSIsImgiOiIzM21namwifQ.jpg?class=squareLarge',
    alt: 'Fiction vs Faculty Department of Medicine Announcement',
    caption: 'The Literature Club, in collaboration with Alchemy, presents Fiction vs Faculty featuring Dr. Sujaya Menon from the Department of Medicine.',
    permalink: 'https://www.instagram.com/p/DVFYYIZkVxq/',
    timestamp: '2026-02-23T02:43:13+0000',
    mediaType: 'IMAGE'
  },
  {
    id: '17920925271249239',
    src: 'https://behold.pictures/eyJ1IjoiZ1l2ekdPSVlGdWVXanhaUFY2cXpqZWV4dms1MyIsImYiOiJkeURPc3dieWU3Wk83RkhnNTd5RSIsInAiOiIxNzkyMDkyNTI3MTI0OTIzOSIsImgiOiIxZnB5OHE5In0.jpg?class=squareLarge',
    alt: 'Screening starts sharp 5:05 PM',
    caption: 'Screening starts sharp 5:05 PM! Join us for an evening of literature, cinema, and engaging discussions at PSGIMSR.',
    permalink: 'https://www.instagram.com/p/DUACgBLEds-/',
    timestamp: '2026-01-27T04:26:13+0000',
    mediaType: 'IMAGE'
  },
  {
    id: '17931764427014994-1',
    src: 'https://behold.pictures/eyJ1IjoiZ1l2ekdPSVlGdWVXanhaUFY2cXpqZWV4dms1MyIsImYiOiJkeURPc3dieWU3Wk83RkhnNTd5RSIsInAiOiIxNzkzMTc2NDQyNzAxNDk5NCIsImgiOiJmbm51diIsImMiOiIxNzg1MTgyNzEzMjYwNDExNCJ9.jpg?class=squareLarge',
    alt: 'Debate Roulette Event Overview',
    caption: 'Audience: 😄🎉 Speakers: 😵‍💫💬 Rules: optional Fun: mandatory. Debate Roulette was pure pandemonium! 🎲✨ Photo by @sal.ymf',
    permalink: 'https://www.instagram.com/p/DScql0oEV4l/',
    timestamp: '2025-12-19T14:10:41+0000',
    mediaType: 'CAROUSEL_ALBUM'
  },
  {
    id: '17931764427014994-2',
    src: 'https://behold.pictures/eyJ1IjoiZ1l2ekdPSVlGdWVXanhaUFY2cXpqZWV4dms1MyIsImYiOiJkeURPc3dieWU3Wk83RkhnNTd5RSIsInAiOiIxNzkzMTc2NDQyNzAxNDk5NCIsImgiOiIxaWwyZTJuIiwiYyI6IjE4MDg3MjE3NDQyMDgwNDg8In0.jpg?class=squareLarge',
    alt: 'Debate Roulette Speaker',
    caption: 'Spontaneous 60-second rebuttal round at Debate Roulette. Pure wit and fast thinking on stage.',
    permalink: 'https://www.instagram.com/p/DScql0oEV4l/',
    timestamp: '2025-12-19T14:10:41+0000',
    mediaType: 'IMAGE'
  },
  {
    id: '17931764427014994-3',
    src: 'https://behold.pictures/eyJ1IjoiZ1l2ekdPSVlGdWVXanhaUFY2cXpqZWV4dms1MyIsImYiOiJkeURPc3dieWU3Wk83RkhnNTd5RSIsInAiOiIxNzkzMTc2NDQyNzAxNDk5NCIsImgiOiIxMmUxMjlnIiwiYyI6IjE3OTA0NDk3MDcwMzAyNzU4In0.jpg?class=squareLarge',
    alt: 'Debate Roulette Panel',
    caption: 'Our student panel navigating surprise topics with hilarious enthusiasm.',
    permalink: 'https://www.instagram.com/p/DScql0oEV4l/',
    timestamp: '2025-12-19T14:10:41+0000',
    mediaType: 'IMAGE'
  },
  {
    id: '17931764427014994-4',
    src: 'https://behold.pictures/eyJ1IjoiZ1l2ekdPSVlGdWVXanhaUFY2cXpqZWV4dms1MyIsImYiOiJkeURPc3dieWU3Wk83RkhnNTd5RSIsInAiOiIxNzkzMTc2NDQyNzAxNDk5NCIsImgiOiIxaTUzaXdrIiwiYyI6IjE4MDYzMTI4ODY0NTU0NDkzIn0.jpg?class=squareLarge',
    alt: 'Debate Roulette Audience',
    caption: 'Laughter filling the lecture hall during Debate Roulette at PSGIMSR.',
    permalink: 'https://www.instagram.com/p/DScql0oEV4l/',
    timestamp: '2025-12-19T14:10:41+0000',
    mediaType: 'IMAGE'
  },
  {
    id: '17931764427014994-5',
    src: 'https://behold.pictures/eyJ1IjoiZ1l2ekdPSVlGdWVXanhaUFY2cXpqZWV4dms1MyIsImYiOiJkeURPc3dieWU3Wk83RkhnNTd5RSIsInAiOiIxNzkzMTc2NDQyNzAxNDk5NCIsImgiOiIxMGdyYnE2IiwiYyI6IjE4MDY0NDg4MzE3MTk0NTA1In0.jpg?class=squareLarge',
    alt: 'Debate Roulette Stage Moment',
    caption: 'A victorious moment during the final debate showdown at PSGIMSR.',
    permalink: 'https://www.instagram.com/p/DScql0oEV4l/',
    timestamp: '2025-12-19T14:10:41+0000',
    mediaType: 'IMAGE'
  },
  {
    id: '17931764427014994-6',
    src: 'https://behold.pictures/eyJ1IjoiZ1l2ekdPSVlGdWVXanhaUFY2cXpqZWV4dms1MyIsImYiOiJkeURPc3dieWU3Wk83RkhnNTd5RSIsInAiOiIxNzkzMTc2NDQyNzAxNDk5NCIsImgiOiIxamw3anpsIiwiYyI6IjE4MDA3Njk3ODk0NjY0OTYwIn0.jpg?class=squareLarge',
    alt: 'Debate Roulette Winners',
    caption: 'Celebrating our top speakers at Debate Roulette 2025.',
    permalink: 'https://www.instagram.com/p/DScql0oEV4l/',
    timestamp: '2025-12-19T14:10:41+0000',
    mediaType: 'IMAGE'
  },
  {
    id: '17931764427014994-7',
    src: 'https://behold.pictures/eyJ1IjoiZ1l2ekdPSVlGdWVXanhaUFY2cXpqZWV4dms1MyIsImYiOiJkeURPc3dieWU3Wk83RkhnNTd5RSIsInAiOiIxNzkzMTc2NDQyNzAxNDk5NCIsImgiOiIxNXVydDc5IiwiYyI6IjE4NTQ4MTI5MTY0MDQ4MjkyIn0.jpg?class=squareLarge',
    alt: 'Debate Roulette Team Effort',
    caption: 'The Literature Club team working behind the scenes for an unforgettable night.',
    permalink: 'https://www.instagram.com/p/DScql0oEV4l/',
    timestamp: '2025-12-19T14:10:41+0000',
    mediaType: 'IMAGE'
  }
];

export async function fetchLiveInstagramPosts(): Promise<InstagramPost[]> {
  try {
    const res = await fetch('https://feeds.behold.so/dyDOswbye7ZO7FHg57yE');
    if (!res.ok) return INSTAGRAM_POSTS;
    const data = await res.json();
    const posts = data.posts || [];
    if (!posts.length) return INSTAGRAM_POSTS;

    const list: InstagramPost[] = [];
    posts.forEach((p: any) => {
      const mainImg = p.sizes?.large?.mediaUrl || p.sizes?.medium?.mediaUrl || p.mediaUrl;
      list.push({
        id: p.id,
        src: mainImg,
        alt: p.prunedCaption || p.caption || 'Instagram Post',
        caption: p.caption || '',
        permalink: p.permalink || OFFICIAL_IG_PROFILE,
        timestamp: p.timestamp || '',
        mediaType: p.mediaType || 'IMAGE'
      });

      // Unpack carousel children images so dome gets many unique high-res photos
      if (p.children && p.children.length) {
        p.children.forEach((c: any, index: number) => {
          const childImg = c.sizes?.large?.mediaUrl || c.sizes?.medium?.mediaUrl || c.mediaUrl;
          if (childImg && childImg !== mainImg) {
            list.push({
              id: `${p.id}-child-${index}`,
              src: childImg,
              alt: p.caption || 'Instagram Gallery Image',
              caption: p.caption || '',
              permalink: p.permalink || OFFICIAL_IG_PROFILE,
              timestamp: p.timestamp || '',
              mediaType: 'IMAGE'
            });
          }
        });
      }
    });

    // Ensure newest Instagram posts are sorted first
    list.sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());

    return list.length ? list : INSTAGRAM_POSTS;
  } catch {
    return INSTAGRAM_POSTS;
  }
}
