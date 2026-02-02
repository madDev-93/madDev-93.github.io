import { useState, useEffect } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import Header from '../components/Header'
import Hero from '../components/Hero'
import Problem from '../components/Problem'
import Modules from '../components/Modules'
import Testimonials from '../components/Testimonials'
import Bonuses from '../components/Bonuses'
import About from '../components/About'
import FAQ from '../components/FAQ'
import CTA from '../components/CTA'
import EmailCapture from '../components/EmailCapture'
import Footer from '../components/Footer'
import PageLoader from '../components/PageLoader'
import ScrollProgress from '../components/ScrollProgress'
import LiveActivity from '../components/LiveActivity'
import MobileCTA from '../components/MobileCTA'

const PRICE = '$47'
const ORIGINAL_PRICE = '$97'

export default function Home() {
  const [isLoading, setIsLoading] = useState(true)
  const { scrollY } = useScroll()

  const y1 = useTransform(scrollY, [0, 3000], [0, -400])
  const y2 = useTransform(scrollY, [0, 3000], [0, -200])
  const opacity = useTransform(scrollY, [0, 300], [0.5, 0])

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1500)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="relative">
      {/* Skip to main content link for keyboard users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[200] focus:bg-gold focus:text-dark focus:px-4 focus:py-2 focus:rounded-lg focus:font-medium"
      >
        Skip to main content
      </a>
      <PageLoader isLoading={isLoading} />
      <ScrollProgress />
      <div className="grain-overlay" />

      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <motion.div
          style={{ y: y1 }}
          className="absolute top-[10%] right-[10%] w-[500px] h-[500px] bg-gold/[0.02] rounded-full blur-[100px]"
        />
        <motion.div
          style={{ y: y2 }}
          className="absolute top-[60%] left-[5%] w-[400px] h-[400px] bg-gold/[0.015] rounded-full blur-[120px]"
        />
        <motion.div
          style={{ y: y1, opacity }}
          className="absolute top-[30%] left-[50%] w-[300px] h-[300px] bg-white/[0.01] rounded-full blur-[80px]"
        />
      </div>

      <LiveActivity />
      <MobileCTA price={PRICE} />

      <Header />
      <main id="main-content" className="pb-20 md:pb-0" tabIndex={-1}>
        <Hero />
        <Problem />
        <Modules />
        <Testimonials />
        <Bonuses />
        <About />
        <FAQ />
        <CTA price={PRICE} originalPrice={ORIGINAL_PRICE} />
        <EmailCapture />
      </main>
      <Footer />
    </div>
  )
}
