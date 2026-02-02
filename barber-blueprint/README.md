# The Barber Blueprint

A high-converting landing page and members area for a digital course targeted at barbers who want to build their personal brand and create income beyond chair time.

**Live Site:** https://qwota.app/barber-blueprint/

## Tech Stack

- **Frontend:** React 19 + Vite 7
- **Styling:** Tailwind CSS 4
- **Animations:** Framer Motion
- **Icons:** Lucide React
- **Auth:** Firebase Authentication
- **Database:** Firestore
- **Payments:** Lemonsqueezy (integration ready)
- **Hosting:** GitHub Pages (temporary) → Custom domain (pending)

## Project Structure

```
barber-blueprint/
├── src/
│   ├── components/       # Reusable UI components
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
│   │   ├── PageLoader.jsx
│   │   ├── ScrollProgress.jsx
│   │   ├── MagneticButton.jsx
│   │   ├── TiltCard.jsx
│   │   ├── LiveActivity.jsx
│   │   ├── MobileCTA.jsx
│   │   ├── ProtectedRoute.jsx
│   │   └── ErrorBoundary.jsx
│   ├── pages/            # Route pages
│   │   ├── Home.jsx      # Landing page
│   │   ├── Login.jsx
│   │   ├── Signup.jsx
│   │   ├── Dashboard.jsx # Members area
│   │   ├── Module.jsx    # Course content
│   │   └── Account.jsx
│   ├── firebase/         # Firebase config
│   │   ├── config.js     # Uses environment variables
│   │   └── AuthContext.jsx
│   ├── utils/            # Utility functions
│   │   ├── validation.js # Form validation
│   │   └── rateLimit.js  # Rate limiting
│   ├── App.jsx           # Router setup
│   ├── main.jsx          # Entry point
│   └── index.css         # Tailwind + custom styles
├── functions/            # Firebase Cloud Functions
│   └── src/
│       └── index.ts      # Lemonsqueezy webhook handler
├── firestore.rules       # Firestore security rules
├── firebase.json         # Firebase deployment config
├── .env.example          # Environment variables template
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
- Page loader animation
- Magnetic buttons
- Parallax background effects
- Live viewer count (simulated)
- Purchase notifications (simulated)

### Members Area
- User authentication (email/password)
- Protected dashboard
- 6 module pages with video placeholders
- Lesson sidebar with progress tracking
- Account management page (change password, update email, delete account)
- Purchase verification via Firestore
- Rate-limited account operations for security

---

## Setup Instructions

### 1. Firebase Configuration

✅ **COMPLETED** - Firebase project `barber-blueprint` is set up.

Credentials are stored in `.env.local` (not committed):

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

### 2. Firestore Database

✅ **COMPLETED** - Firestore created and security rules deployed.

The rules ensure:
- Users can only read/write their own data
- Purchase records can only be written by Cloud Functions (webhook)
- Users cannot modify their own purchase status

To redeploy rules:
```bash
firebase deploy --only firestore:rules --project barber-blueprint
```

### 3. Enable Authentication

✅ **COMPLETED** - Email/Password authentication enabled and working.

### 3.1 API Key Restrictions

✅ **COMPLETED** - API key restricted in Google Cloud Console.

Required HTTP referrer restrictions (APIs & Services → Credentials → API Key):
```
http://localhost/*
https://qwota.app/*
https://maddev-93.github.io/*
```

**Note:** When you get a custom domain, add it here and remove the temporary ones.

### 4. Lemonsqueezy Setup

⏳ **NOT STARTED**

1. Create account at [lemonsqueezy.com](https://lemonsqueezy.com)
2. Create a new **Store**
3. Create a new **Product**:
   - Name: "The Barber Blueprint"
   - Price: $47 (one-time)
   - Add description and images
4. Go to **Settings** → **Webhooks**
5. Add webhook URL:
   ```
   https://us-central1-barber-blueprint.cloudfunctions.net/lemonsqueezyWebhook
   ```
6. Select events: `order_created`
7. Copy the **Signing secret**

### 5. Deploy Cloud Functions

⏳ **NOT STARTED**

```bash
cd functions
npm install

# Set the webhook secret
firebase functions:config:set lemonsqueezy.webhook_secret="YOUR_SECRET"

# Deploy
firebase deploy --only functions --project barber-blueprint
```

### 6. Update Button Links

⏳ **NOT STARTED**

Once you have your Lemonsqueezy checkout URL, update the CTA buttons in `src/components/CTA.jsx`.

For overlay checkout, add to `index.html`:
```html
<script src="https://app.lemonsqueezy.com/js/lemon.js" defer></script>
```

---

## Security Features

### Implemented ✅
- **Environment Variables**: Firebase credentials stored in `.env.local` (gitignored)
- **Input Validation**: Email and password validation with strength indicators
- **Rate Limiting**: Session-persistent rate limiting (5 login attempts/min, 3 reset attempts/5min)
- **Error Message Security**: Generic error messages prevent user enumeration
- **Webhook Validation**: HMAC-SHA256 signature verification with timing-safe comparison
- **Firestore Rules**: Secure rules deployed - users can only access their own data
- **Content Security Policy**: CSP headers prevent XSS attacks
- **Security Headers**: X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy
- **API Key Restrictions**: Firebase API key restricted to specific domains in Google Cloud Console

### API Key Restrictions (Google Cloud Console)
Firebase API key is restricted to these HTTP referrers:
- `http://localhost/*`
- `https://qwota.app/*`
- `https://maddev-93.github.io/*`

**Important:** The format must include the protocol (`http://` or `https://`) and end with `/*`.

---

## Accessibility Features

### Implemented ✅
- **ARIA Labels**: All interactive elements have proper aria-label attributes
- **Keyboard Navigation**: Mobile menu, FAQ accordion, and lesson navigation are keyboard accessible
- **Screen Reader Support**: Proper role attributes (banner, navigation, list, listitem)
- **Focus Management**: aria-expanded and aria-controls for expandable elements
- **Semantic HTML**: Proper heading hierarchy and landmark regions

---

## Performance Optimizations

### Implemented ✅
- **Scroll Debouncing**: requestAnimationFrame throttling on scroll handlers
- **React.memo**: Memoized lesson list items to prevent unnecessary re-renders
- **Passive Event Listeners**: Scroll events use `{ passive: true }`
- **Code Splitting**: Vite automatic chunking (future: add lazy loading for routes)

---

## TODO List

### Before Launch (Required)
- [x] Firebase project setup
- [x] Email/Password auth enabled
- [x] Firestore database created
- [x] Firestore security rules deployed
- [x] Rate limiting on auth endpoints
- [x] Security headers (CSP, X-Frame-Options, etc.)
- [x] Accessibility improvements (ARIA labels)
- [x] Performance optimizations (scroll debouncing)
- [x] API key restrictions configured
- [x] Login/Signup working
- [ ] Create Lemonsqueezy account and product
- [ ] Deploy Cloud Functions for webhook
- [ ] Update CTA buttons with Lemonsqueezy checkout link
- [ ] Add actual video content to module pages

### After Launch (Recommended)
- [ ] Purchase and configure custom domain
- [ ] Connect EmailCapture to email service (Mailchimp/ConvertKit)
- [ ] Create PDF bonuses and add download links
- [ ] Add Google Analytics or Plausible for tracking
- [ ] Add error tracking (Sentry)
- [ ] Add real testimonials from customers

### Nice to Have (Future)
- [ ] Lesson progress persistence to Firestore
- [ ] Real-time viewer count with Firebase
- [ ] Course completion certificates
- [ ] Affiliate program integration
- [x] Account settings (change email/password) ✅

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

The site is deployed via GitHub Pages as a subdirectory of the main madDev-93.github.io repo.

```bash
# Build the project
npm run build

# Copy built files to root for GitHub Pages
rm -rf assets
cp -r dist/assets .
cp dist/index.html .
cp dist/index.html 404.html

# Commit and push
cd ..
git add barber-blueprint/
git commit -m "Deploy updates"
git push origin main
```

## Moving to Custom Domain

When you acquire a domain:

1. Update `vite.config.js`:
   ```javascript
   base: '/'  // Remove '/barber-blueprint/'
   ```

2. Update `src/main.jsx`:
   ```javascript
   <BrowserRouter>  // Remove basename prop
   ```

3. Create new repo or update hosting settings
4. Add CNAME file with your domain
5. Configure DNS with your domain registrar

---

## Price Configuration

Price is set in `src/pages/Home.jsx`:
```javascript
const PRICE = '$47'
const ORIGINAL_PRICE = '$97'
```

Update this to match your Lemonsqueezy product price.

---

## Color Scheme

The site uses a professional dark theme with gold accents:

```css
--color-gold: #C9A962
--color-gold-dark: #A68B4B
--color-dark: #0D0D0D
--color-dark-secondary: #141414
--color-dark-tertiary: #1A1A1A
```

Customize in `src/index.css`.

---

## Support

For questions about this project, contact the developer.
