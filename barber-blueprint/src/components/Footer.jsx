import { Scissors } from 'lucide-react'

export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="py-12 border-t border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <Scissors className="w-4 h-4 text-gold" />
            <span className="font-medium text-sm tracking-wide uppercase">Barber Blueprint</span>
          </div>

          {/* Links */}
          <nav className="flex items-center gap-6 text-sm text-gray-400" aria-label="Footer navigation">
            <a href="#" className="hover:text-white transition-colors focus:outline-none focus:text-gold">
              Privacy Policy
            </a>
            <a href="#" className="hover:text-white transition-colors focus:outline-none focus:text-gold">
              Terms of Service
            </a>
            <a href="#" className="hover:text-white transition-colors focus:outline-none focus:text-gold">
              Contact
            </a>
          </nav>

          {/* Copyright */}
          <p className="text-sm text-gray-400">
            © {currentYear} Barber Blueprint
          </p>
        </div>
      </div>
    </footer>
  )
}
