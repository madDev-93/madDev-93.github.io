# The Barber Blueprint

A high-converting landing page, members area, and admin panel for a digital course targeted at barbers who want to build their personal brand and create income beyond chair time.

**Live Site:** https://barber-blueprint.web.app

## Tech Stack

- **Frontend:** React 19 + Vite 7
- **Styling:** Tailwind CSS 4
- **Animations:** Framer Motion
- **Icons:** Lucide React
- **Auth:** Firebase Authentication
- **Database:** Firestore
- **Storage:** Firebase Storage (videos, images, PDFs)
- **Payments:** Lemonsqueezy (integration ready)
- **Hosting:** Firebase Hosting

## Project Structure

```
barber-blueprint/
├── src/
│   ├── components/
│   │   ├── admin/              # Admin panel components
│   │   │   ├── shared/         # Reusable form components
│   │   │   │   ├── FormField.jsx
│   │   │   │   ├── TextInput.jsx
│   │   │   │   ├── TextArea.jsx
│   │   │   │   ├── NumberInput.jsx
│   │   │   │   ├── ImageUploader.jsx
│   │   │   │   ├── VideoUploader.jsx
│   │   │   │   ├── PDFUploader.jsx
│   │   │   │   ├── DragDropList.jsx
│   │   │   │   ├── IconPicker.jsx
│   │   │   │   ├── SaveButton.jsx
│   │   │   │   └── StatusToggle.jsx
│   │   │   ├── AdminLayout.jsx
│   │   │   ├── AdminSidebar.jsx
│   │   │   ├── AdminHeader.jsx
│   │   │   └── AdminProtectedRoute.jsx
│   │   ├── Header.jsx
│   │   ├── Hero.jsx
│   │   ├── Problem.jsx
│   │   ├── Modules.jsx
│   │   ├── Testimonials.jsx
│   │   ├── Bonuses.jsx
│   │   ├── About.jsx
│   │   ├── FAQ.jsx
│   │   ├── CTA.jsx
│   │   ├── EmailCapture.jsx
│   │   ├── Footer.jsx
│   │   ├── ProtectedRoute.jsx
│   │   └── ErrorBoundary.jsx
│   ├── pages/
│   │   ├── admin/              # Admin panel pages
│   │   │   ├── AdminDashboard.jsx
│   │   │   ├── AdminLogin.jsx
│   │   │   ├── HeroEditor.jsx
│   │   │   ├── AboutEditor.jsx
│   │   │   ├── PricingEditor.jsx
│   │   │   ├── TestimonialsManager.jsx
│   │   │   ├── FAQsManager.jsx
│   │   │   ├── BonusesManager.jsx
│   │   │   ├── ModulesManager.jsx
│   │   │   ├── LessonsManager.jsx
│   │   │   ├── MediaLibrary.jsx
│   │   │   └── PreviewPage.jsx
│   │   ├── Home.jsx            # Landing page
│   │   ├── Login.jsx
│   │   ├── Signup.jsx
│   │   ├── Dashboard.jsx       # Members area
│   │   ├── Module.jsx          # Course content
│   │   └── Account.jsx
│   ├── firebase/
│   │   ├── config.js           # Firebase configuration
│   │   ├── AuthContext.jsx     # User authentication
│   │   ├── AdminContext.jsx    # Admin authentication
│   │   └── storage.js          # Storage utilities
│   ├── hooks/
│   │   ├── useProgress.js      # Lesson progress tracking
│   │   ├── useSiteContent.js   # Landing page content
│   │   ├── useTestimonials.js
│   │   ├── useFAQs.js
│   │   ├── useBonuses.js
│   │   ├── useModules.js
│   │   └── useAuditLog.js
│   ├── utils/
│   │   ├── validation.js       # Form validation
│   │   ├── sanitize.js         # Input sanitization
│   │   └── rateLimit.js        # Rate limiting
│   ├── constants/
│   │   └── fallbackContent.js  # Default content
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── functions/                  # Firebase Cloud Functions
│   └── src/
│       └── index.ts            # Lemonsqueezy webhook
├── firestore.rules             # Firestore security rules
├── storage.rules               # Storage security rules
├── firebase.json
├── .env.example
└── package.json
```

## Features

### Landing Page
- Hero section with animated headline
- Problem/Solution comparison grid
- 6 module cards with 3D tilt effect
- Testimonials carousel
- FAQ accordion (accessible)
- Pricing card with secure payment badges
- Email capture for leads
- Sticky mobile CTA bar
- Scroll progress indicator
- Live viewer count (simulated)
- **Dynamic content from Firestore with fallback**

### Members Area
- User authentication (email/password)
- Protected dashboard with progress overview
- 6 module pages with video placeholders
- Lesson sidebar with progress tracking
- Account management (change password, update email, delete account)
- Purchase verification via Firestore
- Rate-limited account operations

### Admin Panel (`/admin`)
- **Dashboard** - Stats overview, quick links, recent activity
- **Landing Page Editors**
  - Hero section (headline, subheadline, CTA, stats)
  - About section (paragraphs, quote, Instagram)
  - Pricing section (prices, included items)
- **Content Managers** (CRUD with drag-drop reordering)
  - Testimonials
  - FAQs
  - Bonuses
  - Course Modules
  - Lessons (per module)
- **Media Library** - Upload/manage images, videos, PDFs
- **Preview Mode** - Preview draft content before publishing
- **Audit Log** - Track all admin actions
- **Draft/Published** status for all content

---

## Setup Instructions

### 1. Firebase Configuration

```bash
# Copy the example and fill in your values
cp .env.example .env.local
```

Required environment variables:
```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

### 2. Deploy Firebase Rules

```bash
# Deploy Firestore and Storage rules
firebase deploy --only firestore:rules,storage:rules --project barber-blueprint
```

### 3. Add Admin Users

Admin users must be manually added via Firebase Console:

1. Go to Firebase Console → Firestore
2. Create collection: `blueprint_admins`
3. Add document with user's UID as document ID:
```json
{
  "email": "your-email@example.com",
  "name": "Your Name",
  "role": "admin",
  "createdAt": "<server timestamp>"
}
```

### 4. Lemonsqueezy Setup

1. Create account at [lemonsqueezy.com](https://lemonsqueezy.com)
2. Create a new **Store** and **Product**
3. Add webhook URL:
   ```
   https://us-central1-barber-blueprint.cloudfunctions.net/lemonsqueezyWebhook
   ```
4. Select events: `order_created`
5. Copy the **Signing secret**

### 5. Deploy Cloud Functions

```bash
cd functions
npm install

# Set the webhook secret
firebase functions:config:set lemonsqueezy.webhook_secret="YOUR_SECRET"

# Deploy
firebase deploy --only functions --project barber-blueprint
```

---

## Security Features

### Implemented
- **Environment Variables**: Firebase credentials in `.env.local` (gitignored)
- **Input Validation**: Form validation with sanitization
- **Input Sanitization**: XSS prevention with text/URL sanitization
- **Rate Limiting**: Session-persistent rate limiting on auth endpoints
- **Error Message Security**: Generic error messages prevent enumeration
- **Webhook Validation**: HMAC-SHA256 signature verification
- **Firestore Rules**: Secure rules - users access own data, admins manage content
- **Storage Rules**: File type and size validation (500MB video, 10MB image, 50MB PDF)
- **Content Security Policy**: CSP headers prevent XSS attacks
- **Security Headers**: X-Frame-Options, X-Content-Type-Options, etc.
- **Admin Authorization**: Double-check with `adminUser` AND `isAdmin` flags
- **Audit Logging**: All admin actions logged to `admin_audit_log` collection
- **Mounted Ref Pattern**: Prevents state updates after component unmount

### Firestore Collections

| Collection | Access |
|------------|--------|
| `blueprint_users` | User reads/writes own data |
| `blueprint_purchases` | Read-only (webhook writes) |
| `blueprint_admins` | Admin read-only (manual setup) |
| `site_content` | Public read, admin write |
| `testimonials` | Public read published, admin CRUD |
| `faqs` | Public read published, admin CRUD |
| `bonuses` | Public read published, admin CRUD |
| `modules` | Public read published, admin CRUD |
| `modules/{id}/lessons` | Public read published, admin CRUD |
| `admin_audit_log` | Admin read, admin create only |

---

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Deployment

```bash
# Build and deploy to Firebase Hosting
npm run build
firebase deploy --only hosting
```

---

## Firestore Schema

### Site Content
```
site_content/landing
├── hero: { badge, headline, subheadline, ctaText, stats[] }
├── about: { headline, paragraphs[], quote, instagram }
├── pricing: { currentPrice, originalPrice, discount, includedItems[] }
├── status: "draft" | "published"
└── lastModified: timestamp
```

### Testimonials
```
testimonials/{id}
├── name, location, rating (1-5), text, highlight
├── order, status, createdAt, updatedAt
```

### FAQs
```
faqs/{id}
├── question, answer
├── order, status, createdAt, updatedAt
```

### Modules & Lessons
```
modules/{id}
├── number, icon, title, shortDescription, fullDescription, duration
├── order, status, createdAt, updatedAt
└── lessons/{id}
    ├── title, duration, description, videoUrl
    ├── order, status, createdAt, updatedAt
```

---

## Color Scheme

```css
--color-gold: #C9A962
--color-gold-dark: #A68B4B
--color-dark: #0D0D0D
--color-dark-secondary: #141414
--color-dark-tertiary: #1A1A1A
```

---

## TODO List

### Completed
- [x] Firebase project setup
- [x] Email/Password auth
- [x] Firestore database & rules
- [x] Storage rules for media uploads
- [x] Rate limiting on auth endpoints
- [x] Security headers (CSP, etc.)
- [x] Accessibility (ARIA labels)
- [x] Performance optimizations
- [x] Login/Signup working
- [x] Account settings
- [x] Lesson progress persistence
- [x] **Admin Panel** - Full CMS for all content
- [x] **Media Library** - Upload videos, images, PDFs
- [x] **Draft/Published workflow**
- [x] **Audit logging**

### Before Launch
- [ ] **Add brother as admin** - When you have his email:
  1. Have him create an account on the site
  2. Get his Firebase Auth UID from Firebase Console → Authentication
  3. Add document to `blueprint_admins` collection in Firestore (use UID as doc ID)
  4. Run: `node scripts/setAdminClaim.cjs brothers-email@example.com`
  5. He signs out and back in (required for custom claim to take effect)
- [ ] Create Lemonsqueezy account and product
- [ ] Deploy Cloud Functions for webhook
- [ ] Update CTA buttons with checkout link
- [ ] Add actual video content

### After Launch
- [ ] **Move to own repo/domain** - Currently hosted under qwota.app via parent repo:
  1. Create new GitHub repo (e.g., `barber-blueprint`)
  2. Update `vite.config.js` base path (remove `/barber-blueprint/`)
  3. Update all hardcoded URLs in `index.html` (canonical, og:url, og:image)
  4. Set up custom domain in GitHub Pages or Firebase Hosting
  5. Update Firebase Auth authorized domains
  6. Update Google Cloud API key restrictions
- [ ] Connect EmailCapture to email service
- [ ] Google Analytics or Plausible
- [ ] Error tracking (Sentry)

---

## Support

For questions about this project, contact the developer.
