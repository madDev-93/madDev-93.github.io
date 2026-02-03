// Fallback content when Firestore data is not available
// This ensures the site still works if Firebase is down or content hasn't been migrated
// These values match the original hardcoded text from before the admin panel

export const fallbackContent = {
  landing: {
    hero: {
      badge: 'For Barbers Ready to Level Up',
      headline: 'Turn Haircuts Into Income, Influence, and Freedom',
      subheadline: 'A step-by-step blueprint for barbers who want to grow income, build a personal brand, and stop relying only on chair time.',
      ctaText: 'Get The Barber Blueprint',
      stats: [
        { value: '6', label: 'Modules' },
        { value: '3', label: 'Bonuses' },
        { value: '∞', label: 'Updates' }
      ]
    },
    about: {
      sectionLabel: 'About The Creator',
      headline: 'Built by a Barber, For Barbers',
      credentials: [
        { icon: 'Scissors', text: 'Working Barber' },
        { icon: 'Camera', text: 'Content Creator' },
        { icon: 'Users', text: 'Father' }
      ],
      paragraphs: [
        "This isn't theory from someone who read about barbering online. This is a system built from years behind the chair, figuring out what actually works to grow a following and create income beyond just cutting hair.",
        "Every module comes from real execution—what I've done to build my brand while still being a full-time barber and father. No fluff, no guru nonsense, just the exact playbook I use every single day."
      ],
      quote: {
        text: "Document the work. The results will follow.",
        attribution: "Real execution, not theory"
      },
      instagram: 'ivan.m.rod'
    },
    pricing: {
      sectionLabel: 'Get Started Today',
      headline: 'Ready to Build Your Barber Brand?',
      subheadline: 'Stop letting content creation overwhelm you. Get the exact system to turn your daily haircuts into income, influence, and freedom.',
      currentPrice: 47,
      originalPrice: 97,
      discount: '50%',
      discountNote: 'Save 50% — Limited Time',
      includedItems: [
        '6 Core Modules',
        'Filming Angles Guide',
        'Equipment Setup Guide',
        'Content Strategy Templates',
        'Posting Schedule Framework',
        'Monetization Roadmap',
        'Weekly Filming Checklist',
        'Daily Posting Framework',
        'Mindset Rules',
        'Lifetime Updates'
      ],
      ctaText: 'Get Instant Access',
      guarantee: '30-day money-back guarantee. No questions asked.'
    },
    status: 'published'
  }
}

// Default testimonials fallback - Original hardcoded testimonials
export const fallbackTestimonials = [
  {
    id: '1',
    name: 'Marcus J.',
    location: 'Atlanta, GA',
    rating: 5,
    text: "Bro I was so lost on what to even post. Like I'd film a cut and just stare at my phone not knowing what to do with it. The posting system alone made this worth it. Finally feel like I know what I'm doing.",
    highlight: 'Finally has a system',
    order: 1,
    status: 'published'
  },
  {
    id: '2',
    name: 'D. Williams',
    location: 'Houston, TX',
    rating: 5,
    text: "Not gonna lie I was skeptical cause there's so much bs out there. But this is actually from someone who cuts hair. You can tell. The angles section helped me see what I was doing wrong with my videos.",
    highlight: 'Improved video quality',
    order: 2,
    status: 'published'
  },
  {
    id: '3',
    name: 'Chris M.',
    location: 'Miami, FL',
    rating: 5,
    text: "I've been cutting for 8 years and always thought content wasn't for me. Tried this cause a homie recommended it. Simple stuff but it works. Getting way more engagement than before.",
    highlight: 'More engagement',
    order: 3,
    status: 'published'
  },
  {
    id: '4',
    name: 'Anthony D.',
    location: 'Chicago, IL',
    rating: 4,
    text: "Good info, wish there was more on TikTok specifically but the Instagram stuff is solid. The mindset part at the beginning was actually what I needed to hear. Started posting consistently for the first time.",
    highlight: 'Posting consistently now',
    order: 4,
    status: 'published'
  }
]

// Default FAQs fallback - Original hardcoded FAQs
export const fallbackFAQs = [
  {
    id: '1',
    question: "I'm not good on camera. Will this still work for me?",
    answer: "Absolutely. The Blueprint focuses on filming your work, not you talking to camera. Most viral barber content is just clean footage of haircuts with good angles. You don't need to be an entertainer—you need to document your skill.",
    order: 1,
    status: 'published'
  },
  {
    id: '2',
    question: "What equipment do I need?",
    answer: "Just your phone. Module 3 covers the exact setup—it's literally a $20 phone holder and natural lighting from your shop window. No ring lights, no expensive cameras. The barbers blowing up right now are using the same phone in their pocket.",
    order: 2,
    status: 'published'
  },
  {
    id: '3',
    question: "How long until I see results?",
    answer: "Most barbers start seeing increased engagement within 2-3 weeks of consistent posting. Your first viral moment could come anytime—some hit it in week one, others in month two. The system works, but you have to actually post.",
    order: 3,
    status: 'published'
  },
  {
    id: '4',
    question: "I barely have time to cut hair. How do I find time for content?",
    answer: "That's exactly why this system exists. You're not creating extra content—you're documenting cuts you're already doing. Set up your phone, hit record, cut hair, done. The posting system takes 15 minutes a day max.",
    order: 4,
    status: 'published'
  },
  {
    id: '5',
    question: "Is this just for fades and tapers?",
    answer: "The principles work for any style—fades, tapers, beards, shears work, textured cuts, even braids and locs. Module 2 covers angles for different cut types. If you're cutting hair, this applies to you.",
    order: 5,
    status: 'published'
  },
  {
    id: '6',
    question: "What if I'm already posting but not growing?",
    answer: "Then you need the system. Random posting doesn't work. The Blueprint covers what content actually performs, when to post for your audience, and how to structure videos that hold attention. Strategy beats volume.",
    order: 6,
    status: 'published'
  },
  {
    id: '7',
    question: "Do I get lifetime access?",
    answer: "Yes. One payment, lifetime access, and every future update included. When we add new modules or strategies, you get them automatically at no extra cost.",
    order: 7,
    status: 'published'
  }
]

// Default bonuses fallback - Original hardcoded bonuses
export const fallbackBonuses = [
  {
    id: '1',
    icon: 'ClipboardList',
    title: 'Weekly Filming Checklist',
    description: 'Never wonder what to film again. A printable checklist to ensure you capture everything you need each week.',
    type: 'PDF',
    order: 1,
    status: 'published'
  },
  {
    id: '2',
    icon: 'Calendar',
    title: 'Daily Posting Framework',
    description: 'The exact posting schedule for maximum reach. Know what to post and when across Instagram and TikTok.',
    type: 'PDF',
    order: 2,
    status: 'published'
  },
  {
    id: '3',
    icon: 'Flame',
    title: 'Mindset Rules',
    description: 'The mental game that separates those who make it from those who quit. Daily disciplines for content creators.',
    type: 'PDF',
    order: 3,
    status: 'published'
  }
]
