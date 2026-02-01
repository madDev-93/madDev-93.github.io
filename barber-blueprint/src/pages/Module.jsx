import { useParams, Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../firebase/AuthContext'
import {
  Scissors,
  ArrowLeft,
  ArrowRight,
  Play,
  Clock,
  CheckCircle,
  Lock,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { useState } from 'react'

const moduleData = {
  1: {
    title: 'The Barber-to-Brand Mindset',
    description: 'Shift from "just a barber" to a content creator with a business.',
    lessons: [
      { id: 1, title: 'Introduction: Why Mindset Matters', duration: '4:32', completed: false },
      { id: 2, title: 'The Content Creator Identity', duration: '5:18', completed: false },
      { id: 3, title: 'Overcoming Camera Anxiety', duration: '4:45', completed: false },
      { id: 4, title: 'Building Your Daily Discipline', duration: '3:52', completed: false },
    ]
  },
  2: {
    title: 'Filming Haircuts',
    description: 'Exact angles for fades, tapers, and beards that get views.',
    lessons: [
      { id: 1, title: 'Essential Camera Angles Overview', duration: '6:15', completed: false },
      { id: 2, title: 'Filming Fades: Step by Step', duration: '7:22', completed: false },
      { id: 3, title: 'Capturing Tapers & Lineups', duration: '5:48', completed: false },
      { id: 4, title: 'Beard Work on Camera', duration: '4:33', completed: false },
      { id: 5, title: 'The Reveal Shot', duration: '3:45', completed: false },
      { id: 6, title: 'Common Mistakes to Avoid', duration: '4:12', completed: false },
    ]
  },
  3: {
    title: 'Simple Equipment Setup',
    description: 'Minimal phone setup that looks professional.',
    lessons: [
      { id: 1, title: 'The Only Gear You Need', duration: '4:22', completed: false },
      { id: 2, title: 'Phone Positioning Secrets', duration: '5:15', completed: false },
      { id: 3, title: 'Lighting Without Equipment', duration: '4:38', completed: false },
    ]
  },
  4: {
    title: 'Content That Grows',
    description: 'Before/afters, lifestyle content, and content pillars.',
    lessons: [
      { id: 1, title: 'The 4 Content Pillars', duration: '5:45', completed: false },
      { id: 2, title: 'Before/After That Convert', duration: '6:12', completed: false },
      { id: 3, title: 'Lifestyle Content Strategy', duration: '5:33', completed: false },
      { id: 4, title: 'Story Content Ideas', duration: '5:18', completed: false },
      { id: 5, title: 'Building a Content Bank', duration: '5:22', completed: false },
    ]
  },
  5: {
    title: 'Posting System',
    description: 'Complete Instagram and TikTok strategy.',
    lessons: [
      { id: 1, title: 'Platform Differences Explained', duration: '4:55', completed: false },
      { id: 2, title: 'Optimal Posting Times', duration: '4:22', completed: false },
      { id: 3, title: 'Hashtag Strategy That Works', duration: '5:15', completed: false },
      { id: 4, title: 'Caption Formulas', duration: '4:48', completed: false },
      { id: 5, title: 'Weekly Content Calendar', duration: '5:33', completed: false },
    ]
  },
  6: {
    title: 'Monetization',
    description: 'Brand deals, education products, and partnerships.',
    lessons: [
      { id: 1, title: 'When You\'re Ready to Monetize', duration: '4:22', completed: false },
      { id: 2, title: 'Landing Your First Brand Deal', duration: '6:45', completed: false },
      { id: 3, title: 'Creating Digital Products', duration: '5:55', completed: false },
      { id: 4, title: 'Building Long-Term Partnerships', duration: '5:18', completed: false },
    ]
  }
}

export default function Module() {
  const { id } = useParams()
  const { hasPurchased } = useAuth()
  const navigate = useNavigate()
  const [activeLesson, setActiveLesson] = useState(1)
  const [showLessons, setShowLessons] = useState(true)

  const moduleId = parseInt(id)
  const module = moduleData[moduleId]

  if (!module) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Module not found</h1>
          <Link to="/dashboard" className="text-gold hover:text-gold-dark">
            Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  if (!hasPurchased) {
    navigate('/dashboard')
    return null
  }

  const currentLesson = module.lessons.find(l => l.id === activeLesson) || module.lessons[0]
  const prevModule = moduleId > 1 ? moduleId - 1 : null
  const nextModule = moduleId < 6 ? moduleId + 1 : null

  return (
    <div className="min-h-screen bg-dark">
      {/* Header */}
      <header className="border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/dashboard" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
              <span className="hidden sm:inline">Back to Dashboard</span>
            </Link>
            <Link to="/" className="flex items-center gap-2">
              <Scissors className="w-5 h-5 text-gold" />
            </Link>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              Module {moduleId}/6
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Video Area */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {/* Video Placeholder */}
              <div className="aspect-video bg-dark-tertiary rounded-xl border border-white/5 flex items-center justify-center mb-6">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gold/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Play className="w-8 h-8 text-gold ml-1" />
                  </div>
                  <p className="text-gray-400 text-sm">Video placeholder</p>
                  <p className="text-gray-600 text-xs mt-1">Upload your content here</p>
                </div>
              </div>

              {/* Lesson Title */}
              <h1 className="text-2xl font-bold mb-2">{currentLesson.title}</h1>
              <div className="flex items-center gap-4 text-sm text-gray-400 mb-6">
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {currentLesson.duration}
                </span>
                <span>Lesson {activeLesson} of {module.lessons.length}</span>
              </div>

              {/* Lesson Navigation */}
              <div className="flex items-center justify-between pt-6 border-t border-white/5">
                <button
                  onClick={() => setActiveLesson(prev => Math.max(1, prev - 1))}
                  disabled={activeLesson === 1}
                  className="flex items-center gap-2 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                  Previous
                </button>
                <button
                  onClick={() => setActiveLesson(prev => Math.min(module.lessons.length, prev + 1))}
                  disabled={activeLesson === module.lessons.length}
                  className="flex items-center gap-2 text-gold hover:text-gold-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-dark-tertiary border border-white/5 rounded-xl overflow-hidden"
            >
              {/* Module Title */}
              <div className="p-4 border-b border-white/5">
                <h2 className="font-semibold">{module.title}</h2>
                <p className="text-sm text-gray-500 mt-1">{module.description}</p>
              </div>

              {/* Lessons Toggle (Mobile) */}
              <button
                onClick={() => setShowLessons(!showLessons)}
                className="w-full p-4 flex items-center justify-between lg:hidden border-b border-white/5"
              >
                <span className="text-sm text-gray-400">
                  {module.lessons.length} lessons
                </span>
                {showLessons ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </button>

              {/* Lessons List */}
              <div className={`${showLessons ? 'block' : 'hidden lg:block'}`}>
                {module.lessons.map((lesson) => (
                  <button
                    key={lesson.id}
                    onClick={() => setActiveLesson(lesson.id)}
                    className={`w-full p-4 flex items-start gap-3 text-left border-b border-white/5 last:border-b-0 transition-colors ${
                      activeLesson === lesson.id
                        ? 'bg-gold/10'
                        : 'hover:bg-white/5'
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      activeLesson === lesson.id
                        ? 'bg-gold text-dark'
                        : 'bg-white/10 text-gray-400'
                    }`}>
                      {lesson.completed ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : (
                        <span className="text-xs">{lesson.id}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm truncate ${
                        activeLesson === lesson.id ? 'text-white' : 'text-gray-300'
                      }`}>
                        {lesson.title}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">{lesson.duration}</p>
                    </div>
                  </button>
                ))}
              </div>

              {/* Module Navigation */}
              <div className="p-4 border-t border-white/5 flex items-center justify-between">
                {prevModule ? (
                  <Link
                    to={`/modules/${prevModule}`}
                    className="text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    ← Module {prevModule}
                  </Link>
                ) : <span />}
                {nextModule ? (
                  <Link
                    to={`/modules/${nextModule}`}
                    className="text-sm text-gold hover:text-gold-dark transition-colors"
                  >
                    Module {nextModule} →
                  </Link>
                ) : <span />}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}
