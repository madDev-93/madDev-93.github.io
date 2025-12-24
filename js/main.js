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
// Counter Animation
// ==========================================================================
const CounterAnimation = {
  init() {
    this.counters = document.querySelectorAll('[data-count]');
    if (this.counters.length === 0) return;

    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting && !entry.target.classList.contains('counted')) {
            this.animateCounter(entry.target);
            entry.target.classList.add('counted');
          }
        });
      },
      { threshold: 0.5 }
    );

    this.counters.forEach(counter => this.observer.observe(counter));
  },

  animateCounter(el) {
    const target = parseInt(el.getAttribute('data-count'));
    const duration = 2000;
    const startTime = performance.now();

    const formatNumber = (num) => {
      if (num >= 1000000) {
        return (num / 1000000).toFixed(0) + 'M+';
      } else if (num >= 1000) {
        return num.toLocaleString() + '+';
      }
      return num.toString() + '+';
    };

    const easeOutQuart = (t) => 1 - Math.pow(1 - t, 4);

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutQuart(progress);
      const current = Math.floor(easedProgress * target);

      el.textContent = formatNumber(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        el.textContent = formatNumber(target);
      }
    };

    requestAnimationFrame(animate);
  }
};

// ==========================================================================
// Animated Progress Bars (Quota Theme)
// ==========================================================================
const QuotaProgress = {
  init() {
    this.bars = document.querySelectorAll('.quota-progress__fill');
    if (this.bars.length === 0) return;

    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const fill = entry.target;
            const target = fill.getAttribute('data-progress');
            fill.style.width = target + '%';
          }
        });
      },
      { threshold: 0.3 }
    );

    this.bars.forEach(bar => this.observer.observe(bar));
  }
};

// ==========================================================================
// Floating Cards Animation
// ==========================================================================
const FloatingCards = {
  init() {
    const cards = document.querySelectorAll('.floating-card');
    if (cards.length === 0) return;

    cards.forEach((card, index) => {
      card.style.animationDelay = `${index * 0.3}s`;
    });
  }
};

// ==========================================================================
// Hero Stack Autoplay
// ==========================================================================
const HeroStackAutoplay = {
  init() {
    this.cards = document.querySelectorAll('.hero-stack__card');
    if (this.cards.length === 0) return;

    this.currentIndex = 0;
    this.interval = null;
    this.isPaused = false;

    // Wait for initial slide-in animation to complete
    setTimeout(() => {
      this.startAutoplay();
    }, 1500);

    // Pause on hover
    this.cards.forEach(card => {
      card.addEventListener('mouseenter', () => {
        this.isPaused = true;
        this.clearActive();
        card.classList.add('active');
      });

      card.addEventListener('mouseleave', () => {
        this.isPaused = false;
        card.classList.remove('active');
      });
    });
  },

  startAutoplay() {
    this.interval = setInterval(() => {
      if (!this.isPaused) {
        this.showNext();
      }
    }, 2500);
  },

  showNext() {
    this.clearActive();
    this.cards[this.currentIndex].classList.add('active');
    this.currentIndex = (this.currentIndex + 1) % this.cards.length;
  },

  clearActive() {
    this.cards.forEach(card => card.classList.remove('active'));
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
  CounterAnimation.init();
  QuotaProgress.init();
  FloatingCards.init();
  HeroStackAutoplay.init();
});
