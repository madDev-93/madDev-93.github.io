import { Scissors, Camera, Users, Quote, Instagram } from 'lucide-react'

const credentials = [
  { icon: Scissors, text: 'Working Barber' },
  { icon: Camera, text: 'Content Creator' },
  { icon: Users, text: 'Father' },
]

export default function AboutPreview({ data }) {
  const { photo, headline, paragraphs, quote, instagram } = data

  // Parse headline for styling (split by newline, second line is gold)
  const renderHeadline = () => {
    const text = headline || 'Built by a Barber,\nFor Barbers'
    const lines = text.split('\n')
    if (lines.length >= 2) {
      return (
        <>
          {lines[0]}
          <br />
          <span className="text-gold">{lines[1]}</span>
        </>
      )
    }
    return text
  }

  return (
    <section className="py-24 bg-dark">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Creator Photo */}
          <div className="relative">
            <div className="aspect-[4/5] bg-dark-tertiary rounded-2xl border border-white/5 overflow-hidden">
              {photo ? (
                <img
                  src={photo}
                  alt="Course creator"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-dark-secondary flex items-center justify-center">
                  <div className="text-center">
                    <Scissors className="w-12 h-12 text-white/10 mx-auto mb-4" />
                    <span className="text-white/20 text-sm">Creator Photo</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Content */}
          <div>
            <span className="text-gold text-sm font-medium tracking-widest uppercase mb-4 block">
              About The Creator
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6 tracking-tight">
              {renderHeadline()}
            </h2>

            <div className="flex flex-wrap gap-3 mb-6">
              {credentials.map((cred) => (
                <div
                  key={cred.text}
                  className="flex items-center gap-2 bg-white/5 border border-white/5 rounded-full px-4 py-2"
                >
                  <cred.icon className="w-4 h-4 text-gold" />
                  <span className="text-sm text-gray-300">{cred.text}</span>
                </div>
              ))}
            </div>

            <div className="space-y-4 text-gray-400 mb-8">
              {paragraphs && paragraphs.length > 0 ? (
                paragraphs.map((p, i) => (
                  <p key={i}>{p}</p>
                ))
              ) : (
                <p className="text-gray-500 italic">No paragraphs added yet.</p>
              )}
            </div>

            {/* Quote */}
            {quote?.text && (
              <div className="bg-dark-tertiary border-l-2 border-gold rounded-r-xl p-6 mb-8">
                <Quote className="w-6 h-6 text-gold/50 mb-3" />
                <p className="text-lg text-white mb-2">
                  "{quote.text}"
                </p>
                {quote.attribution && (
                  <span className="text-sm text-gray-400">— {quote.attribution}</span>
                )}
              </div>
            )}

            {/* Instagram Follow */}
            {instagram && (
              <a
                href={`https://www.instagram.com/${instagram}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-4 bg-dark-tertiary border border-white/5 hover:border-gold/30 rounded-xl p-4 transition-all"
              >
                <div className="w-12 h-12 bg-gold/10 border border-gold/20 rounded-full flex items-center justify-center group-hover:bg-gold/20 transition-colors">
                  <Instagram className="w-6 h-6 text-gold" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-white group-hover:text-gold transition-colors">@{instagram}</p>
                  <p className="text-sm text-gray-400">Follow the journey on Instagram</p>
                </div>
                <span className="text-gold text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  Follow →
                </span>
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
