import { Brain, Video, Smartphone, TrendingUp, Calendar, Banknote } from 'lucide-react'

// Base module data shared across the app
export const modules = [
  {
    id: 1,
    number: '01',
    icon: Brain,
    title: 'The Barber-to-Brand Mindset',
    shortDescription: 'Mental frameworks that separate hobbyists from professionals',
    fullDescription: 'Shift from "just a barber" to a content creator with a business. The mental frameworks that separate hobbyists from professionals.',
    duration: '18 min',
    lessons: 4,
  },
  {
    id: 2,
    number: '02',
    icon: Video,
    title: 'Filming Haircuts',
    shortDescription: 'Exact angles for fades, tapers, and beards',
    fullDescription: 'Exact angles for fades, tapers, and beards. Learn which shots get views and how to capture them without disrupting your workflow.',
    duration: '32 min',
    lessons: 6,
  },
  {
    id: 3,
    number: '03',
    icon: Smartphone,
    title: 'Simple Equipment Setup',
    shortDescription: 'Minimal phone setup that looks professional',
    fullDescription: 'Minimal phone setup that looks professional. No expensive gear required—just strategic positioning and natural lighting.',
    duration: '14 min',
    lessons: 3,
  },
  {
    id: 4,
    number: '04',
    icon: TrendingUp,
    title: 'Content That Grows',
    shortDescription: 'Before/afters, lifestyle content, and content pillars',
    fullDescription: 'Before/afters that convert, lifestyle content that builds connection, and the content pillars that attract followers who become clients.',
    duration: '28 min',
    lessons: 5,
  },
  {
    id: 5,
    number: '05',
    icon: Calendar,
    title: 'Posting System',
    shortDescription: 'Complete Instagram and TikTok strategy',
    fullDescription: 'Complete Instagram and TikTok strategy. When to post, how often, hashtags, captions, and the algorithm hacks that actually work.',
    duration: '24 min',
    lessons: 5,
  },
  {
    id: 6,
    number: '06',
    icon: Banknote,
    title: 'Monetization',
    shortDescription: 'Brand deals, education products, and partnerships',
    fullDescription: 'Turn followers into income through brand deals, education products, and partnerships. The roadmap from content to cash.',
    duration: '22 min',
    lessons: 4,
  },
]

// Bonus materials
export const bonuses = [
  { title: 'Weekly Filming Checklist', type: 'PDF' },
  { title: 'Daily Posting Framework', type: 'PDF' },
  { title: 'Mindset Rules', type: 'PDF' },
]
