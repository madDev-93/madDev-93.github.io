import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Play,
  Clock,
  CheckCircle,
  Check,
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Scissors
} from 'lucide-react'

export default function LessonPreview({ module, lessons, initialLessonIndex = 0 }) {
  const [activeIndex, setActiveIndex] = useState(initialLessonIndex)
  const [showLessons, setShowLessons] = useState(true)
  const [completedLessons, setCompletedLessons] = useState([])

  const currentLesson = lessons[activeIndex]
  const progressPercentage = lessons.length > 0
    ? Math.round((completedLessons.length / lessons.length) * 100)
    : 0

  const handleMarkComplete = () => {
    if (!completedLessons.includes(activeIndex)) {
      setCompletedLessons(prev => [...prev, activeIndex])
    }
  }

  const isLessonComplete = (index) => completedLessons.includes(index)

  return (
    <div className="min-h-[600px] bg-dark">
      {/* Header */}
      <header className="border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2 text-gray-400">
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm">Back to Dashboard</span>
            </div>
            <div className="flex items-center gap-2">
              <Scissors className="w-5 h-5 text-gold" />
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              Module {module?.number || '01'}/6
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
              {/* Video Player */}
              <div className="aspect-video bg-dark-tertiary rounded-xl border border-white/5 flex items-center justify-center mb-6 overflow-hidden">
                {currentLesson?.videoUrl ? (
                  <video
                    key={currentLesson.videoUrl}
                    src={currentLesson.videoUrl}
                    controls
                    className="w-full h-full object-contain"
                    poster=""
                  >
                    Your browser does not support the video tag.
                  </video>
                ) : (
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gold/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Play className="w-8 h-8 text-gold ml-1" />
                    </div>
                    <p className="text-gray-400 text-sm">No video uploaded</p>
                    <p className="text-gray-500 text-xs mt-1">Upload a video in the lesson editor</p>
                  </div>
                )}
              </div>

              {/* Lesson Title */}
              <h1 className="text-2xl font-bold mb-2">
                {currentLesson?.title || 'No lessons available'}
              </h1>
              <div className="flex items-center gap-4 text-sm text-gray-400 mb-4">
                {currentLesson && (
                  <>
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {currentLesson.duration}
                    </span>
                    <span>Lesson {activeIndex + 1} of {lessons.length}</span>
                  </>
                )}
              </div>

              {/* Lesson Description */}
              {currentLesson?.description && (
                <p className="text-gray-400 mb-6">{currentLesson.description}</p>
              )}

              {/* Mark Complete Button */}
              <div className="mb-6">
                {isLessonComplete(activeIndex) ? (
                  <div className="flex items-center gap-2 text-green-400">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-medium">Lesson Completed</span>
                  </div>
                ) : (
                  <button
                    onClick={handleMarkComplete}
                    className="flex items-center gap-2 bg-gold hover:bg-gold-dark text-dark font-semibold px-6 py-3 rounded-lg transition-colors"
                  >
                    <Check className="w-5 h-5" />
                    Mark as Complete
                  </button>
                )}
              </div>

              {/* Lesson Navigation */}
              <nav className="flex items-center justify-between pt-6 border-t border-white/5">
                <button
                  onClick={() => setActiveIndex(prev => Math.max(0, prev - 1))}
                  disabled={activeIndex === 0}
                  className="flex items-center gap-2 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                  Previous
                </button>
                <button
                  onClick={() => setActiveIndex(prev => Math.min(lessons.length - 1, prev + 1))}
                  disabled={activeIndex === lessons.length - 1}
                  className="flex items-center gap-2 text-gold hover:text-gold-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                  <ArrowRight className="w-5 h-5" />
                </button>
              </nav>
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
                <h2 className="font-semibold">{module?.title || 'Module'}</h2>
                <p className="text-sm text-gray-400 mt-1">
                  {module?.shortDescription || module?.fullDescription || ''}
                </p>
                {/* Progress Bar */}
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                    <span>Progress</span>
                    <span>{progressPercentage}%</span>
                  </div>
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progressPercentage}%` }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                      className="h-full bg-gold rounded-full"
                    />
                  </div>
                </div>
              </div>

              {/* Lessons Toggle (Mobile) */}
              <button
                onClick={() => setShowLessons(!showLessons)}
                className="w-full p-4 flex items-center justify-between lg:hidden border-b border-white/5"
              >
                <span className="text-sm text-gray-400">
                  {lessons.length} lessons
                </span>
                {showLessons ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </button>

              {/* Lessons List */}
              <div className={`${showLessons ? 'block' : 'hidden lg:block'}`}>
                {lessons.map((lesson, index) => (
                  <button
                    key={lesson.id}
                    onClick={() => setActiveIndex(index)}
                    className={`w-full p-4 flex items-start gap-3 text-left border-b border-white/5 last:border-b-0 transition-colors ${
                      activeIndex === index ? 'bg-gold/10' : 'hover:bg-white/5'
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      isLessonComplete(index)
                        ? 'bg-green-500 text-white'
                        : activeIndex === index
                          ? 'bg-gold text-dark'
                          : 'bg-white/10 text-gray-400'
                    }`}>
                      {isLessonComplete(index) ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : (
                        <span className="text-xs">{index + 1}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm truncate ${
                        activeIndex === index ? 'text-white' : 'text-gray-300'
                      }`}>
                        {lesson.title}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">{lesson.duration}</p>
                    </div>
                  </button>
                ))}
              </div>

              {lessons.length === 0 && (
                <div className="p-8 text-center text-gray-500">
                  <p>No lessons in this module yet</p>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}
