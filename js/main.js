/**
 * Qwota Website - Main JavaScript
 * Handles theme toggle, animations, and interactions
 */

// ==========================================================================
// Theme Toggle
// ==========================================================================
const ThemeManager = {
  init() {
    this.toggle = document.querySelector('.theme-toggle');
    this.prefersDark = window.matchMedia('(prefers-color-scheme: dark)');

    // Check for saved preference, otherwise use system preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      this.setTheme(savedTheme);
    } else if (this.prefersDark.matches) {
      this.setTheme('dark');
    }

    // Listen for toggle clicks
    if (this.toggle) {
      this.toggle.addEventListener('click', () => this.toggleTheme());
    }

    // Listen for system preference changes
    this.prefersDark.addEventListener('change', (e) => {
      if (!localStorage.getItem('theme')) {
        this.setTheme(e.matches ? 'dark' : 'light');
      }
    });
  },

  setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    this.updateToggleIcon(theme);
  },

  toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const newTheme = current === 'dark' ? 'light' : 'dark';
    this.setTheme(newTheme);
  },

  updateToggleIcon(theme) {
    if (!this.toggle) return;
    const sunIcon = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>`;
    const moonIcon = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>`;
    this.toggle.innerHTML = theme === 'dark' ? sunIcon : moonIcon;
  }
};

// ==========================================================================
// Mobile Navigation
// ==========================================================================
const MobileNav = {
  init() {
    this.menuBtn = document.querySelector('.mobile-menu-btn');
    this.nav = document.querySelector('.nav');

    if (this.menuBtn && this.nav) {
      this.menuBtn.addEventListener('click', () => this.toggle());

      // Close menu when clicking a link
      this.nav.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => this.close());
      });
    }
  },

  toggle() {
    this.nav.classList.toggle('active');
    this.menuBtn.classList.toggle('active');
  },

  close() {
    this.nav.classList.remove('active');
    this.menuBtn.classList.remove('active');
  }
};

// ==========================================================================
// Scroll Animations
// ==========================================================================
const ScrollAnimations = {
  init() {
    this.elements = document.querySelectorAll('[data-animate], [data-animate-stagger]');

    if (this.elements.length === 0) return;

    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            // Optionally unobserve after animation
            // this.observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
      }
    );

    this.elements.forEach(el => this.observer.observe(el));
  }
};

// ==========================================================================
// FAQ Accordion
// ==========================================================================
const FAQ = {
  init() {
    this.items = document.querySelectorAll('.faq-item');

    this.items.forEach(item => {
      const question = item.querySelector('.faq-item__question');
      if (question) {
        question.addEventListener('click', () => this.toggle(item));
      }
    });
  },

  toggle(item) {
    const isActive = item.classList.contains('active');

    // Close all items
    this.items.forEach(i => i.classList.remove('active'));

    // Open clicked item if it wasn't active
    if (!isActive) {
      item.classList.add('active');
    }
  }
};

// ==========================================================================
// Smooth Scroll for Anchor Links
// ==========================================================================
const SmoothScroll = {
  init() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', (e) => {
        const targetId = anchor.getAttribute('href');
        if (targetId === '#') return;

        const target = document.querySelector(targetId);
        if (target) {
          e.preventDefault();
          const headerHeight = document.querySelector('.header')?.offsetHeight || 0;
          const targetPosition = target.getBoundingClientRect().top + window.scrollY - headerHeight - 20;

          window.scrollTo({
            top: targetPosition,
            behavior: 'smooth'
          });
        }
      });
    });
  }
};

// ==========================================================================
// Header Scroll Effect
// ==========================================================================
const HeaderScroll = {
  init() {
    this.header = document.querySelector('.header');
    if (!this.header) return;

    let lastScroll = 0;

    window.addEventListener('scroll', () => {
      const currentScroll = window.scrollY;

      if (currentScroll > 100) {
        this.header.classList.add('scrolled');
      } else {
        this.header.classList.remove('scrolled');
      }

      lastScroll = currentScroll;
    });
  }
};

// ==========================================================================
// Initialize Everything
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  ThemeManager.init();
  MobileNav.init();
  ScrollAnimations.init();
  FAQ.init();
  SmoothScroll.init();
  HeaderScroll.init();
});
