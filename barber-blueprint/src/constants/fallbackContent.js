// Fallback content when Firestore data is not available
// This ensures the site still works if Firebase is down or content hasn't been migrated

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
      headline: 'From Chair Renter to Content Creator',
      paragraphs: [
        "I know what it's like to post and hear nothing.",
        "Four years ago, I was renting a chair, spending hours filming and editing, and getting maybe 50 likes. I almost gave up on content completely.",
        "But I didn't. Instead, I started testing everything—different angles, posting times, caption hooks, hashtag strategies. I tracked what actually worked versus what \"gurus\" said should work.",
        "What I discovered changed everything. It wasn't about going viral or dancing on camera. It was about systems that consistently turn viewers into paying clients.",
        "Today, content brings me more clients than I can handle, brand deals I never pitched for, and income streams I couldn't have imagined from that rental chair."
      ],
      quote: {
        text: "What makes this different: I'm not selling dreams. I'm giving you the exact playbook I wish existed when I started.",
        attribution: "Your instructor"
      },
      instagram: 'barberblueprint'
    },
    pricing: {
      currentPrice: 47,
      originalPrice: 97,
      discount: '50%',
      includedItems: [
        '6 Comprehensive Modules',
        '27 Actionable Video Lessons',
        '2.5+ Hours of Content',
        'Lifetime Access',
        'Weekly Filming Checklist',
        'Daily Posting Framework',
        'Mindset Rules',
        'Future Updates Included'
      ]
    },
    status: 'published'
  }
}

// Default testimonials fallback
export const fallbackTestimonials = [
  {
    id: '1',
    name: 'Marcus J.',
    location: 'Atlanta, GA',
    rating: 5,
    text: 'This course completely changed how I approach content. The filming techniques alone are worth 10x what I paid.',
    highlight: 'Worth 10x what I paid',
    order: 1,
    status: 'published'
  },
  {
    id: '2',
    name: 'David R.',
    location: 'Houston, TX',
    rating: 5,
    text: 'I went from struggling to get views to having clients DM me daily. The posting system is simple but incredibly effective.',
    highlight: 'Clients DM me daily',
    order: 2,
    status: 'published'
  },
  {
    id: '3',
    name: 'Carlos M.',
    location: 'Los Angeles, CA',
    rating: 5,
    text: 'Finally, a course that gets it. No fluff, no dancing on camera BS. Just real strategies that work for barbers.',
    highlight: 'No fluff, just real strategies',
    order: 3,
    status: 'published'
  }
]

// Default FAQs fallback
export const fallbackFAQs = [
  {
    id: '1',
    question: 'How long do I have access to the course?',
    answer: 'Lifetime access! Once you purchase, the content is yours forever. This includes any future updates I add to the course.',
    order: 1,
    status: 'published'
  },
  {
    id: '2',
    question: 'Do I need expensive equipment?',
    answer: 'Not at all. Everything in this course can be done with just your smartphone. I\'ll show you exactly how to position it and what settings to use for professional-looking content.',
    order: 2,
    status: 'published'
  },
  {
    id: '3',
    question: 'What if I\'m camera shy?',
    answer: 'Perfect—you don\'t need to be on camera! Most of my highest-performing content focuses on the haircut, not me. I\'ll show you exactly how to create engaging content without ever showing your face.',
    order: 3,
    status: 'published'
  },
  {
    id: '4',
    question: 'How is this different from free YouTube tutorials?',
    answer: 'This is a complete system, not random tips. Every module builds on the previous one, taking you from filming basics to monetization. Plus, it\'s specifically designed for barbers—not generic "content creator" advice that doesn\'t apply to our industry.',
    order: 4,
    status: 'published'
  },
  {
    id: '5',
    question: 'Is this only for Instagram?',
    answer: 'The core strategies work across platforms—Instagram, TikTok, YouTube Shorts. I focus on the principles that work everywhere, then show you how to adapt for each platform\'s algorithm.',
    order: 5,
    status: 'published'
  }
]

// Default bonuses fallback
export const fallbackBonuses = [
  {
    id: '1',
    icon: 'FileText',
    title: 'Weekly Filming Checklist',
    description: 'Never miss a shot with this simple checklist that ensures you capture everything you need.',
    type: 'PDF',
    order: 1,
    status: 'published'
  },
  {
    id: '2',
    icon: 'Calendar',
    title: 'Daily Posting Framework',
    description: 'Know exactly what to post and when with this proven content calendar template.',
    type: 'PDF',
    order: 2,
    status: 'published'
  },
  {
    id: '3',
    icon: 'Brain',
    title: 'Mindset Rules',
    description: 'The mental frameworks that separate struggling creators from successful ones.',
    type: 'PDF',
    order: 3,
    status: 'published'
  }
]
