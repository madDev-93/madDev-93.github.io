# The Barber Blueprint

A high-converting landing page and members area for a digital course targeted at barbers who want to build their personal brand and create income beyond chair time.

**Live Site:** https://maddev-93.github.io/barber-blueprint/

## Tech Stack

- **Frontend:** React 18 + Vite
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
│   │   └── ProtectedRoute.jsx
│   ├── pages/            # Route pages
│   │   ├── Home.jsx      # Landing page
│   │   ├── Login.jsx
│   │   ├── Signup.jsx
│   │   ├── Dashboard.jsx # Members area
│   │   ├── Module.jsx    # Course content
│   │   └── Account.jsx
│   ├── firebase/         # Firebase config
│   │   ├── config.js     # ⚠️ NEEDS YOUR CREDENTIALS
│   │   └── AuthContext.jsx
│   ├── App.jsx           # Router setup
│   ├── main.jsx          # Entry point
│   └── index.css         # Tailwind + custom styles
├── functions/            # Firebase Cloud Functions
│   └── src/
│       └── index.ts      # Lemonsqueezy webhook handler
├── public/
│   └── favicon.svg
└── package.json
```

## Features

### Landing Page
- Hero section with animated headline
- Problem/Solution comparison grid
- 6 module cards with 3D tilt effect
- Testimonials carousel
- FAQ accordion
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
- Account management page
- Purchase verification via Firestore

---

## Setup Instructions

### 1. Firebase Configuration

✅ **COMPLETED** - Firebase project `barber-blueprint` is set up with web app configured.

Config file: `src/firebase/config.js`

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "qwota-ai-coach.firebaseapp.com",
  projectId: "qwota-ai-coach",
  storageBucket: "qwota-ai-coach.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
}
```

### 2. Firestore Database

✅ **COMPLETED** - Firestore created in test mode.

**Deploy Firestore security rules:**

```bash
cd barber-blueprint
firebase deploy --only firestore:rules
```

Or manually copy the rules from `firestore.rules` to Firebase Console → Firestore → Rules.

The rules ensure:
- Users can only read/write their own data
- Purchase records can only be written by Cloud Functions (webhook)
- Users cannot modify their own purchase status

### 3. Enable Authentication

✅ **COMPLETED** - Email/Password authentication enabled.

### 4. Lemonsqueezy Setup

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

```bash
cd functions
npm install

# Set the webhook secret
firebase functions:config:set lemonsqueezy.webhook_secret="YOUR_SECRET"

# Deploy
firebase deploy --only functions
```

### 6. Update Button Links

Once you have your Lemonsqueezy checkout URL, update the CTA buttons.

For overlay checkout, add to `index.html`:
```html
<script src="https://app.lemonsqueezy.com/js/lemon.js" defer></script>
```

Then change button links to:
```html
<a href="https://YOUR_STORE.lemonsqueezy.com/checkout/buy/YOUR_PRODUCT_ID?embed=1" class="lemonsqueezy-button">
  Get Access
</a>
```

---

## Security Features

### Implemented
- **Environment Variables**: Firebase credentials stored in `.env.local` (not committed)
- **Input Validation**: Email and password validation with strength indicators
- **Rate Limiting**: Client-side rate limiting on login/signup (5 attempts/minute)
- **Error Message Security**: Generic error messages that don't leak user existence
- **Webhook Validation**: HMAC signature verification on Lemonsqueezy webhooks
- **Firestore Rules**: Secure rules that restrict data access (deploy before launch)
- **Content Security Policy**: CSP headers to prevent XSS attacks
- **Security Headers**: X-Frame-Options, X-Content-Type-Options, Referrer-Policy

### API Key Restrictions (Google Cloud Console)
Restrict the Firebase API key to these domains:
- `qwota.app`
- `*.qwota.app`
- `localhost`
- `127.0.0.1`

---

## TODO List

### High Priority
- [x] Add Firebase web config credentials to `src/firebase/config.js`
- [x] Enable Email/Password auth in Firebase Console
- [x] Create Firestore database
- [x] Add Firestore security rules
- [x] Add rate limiting to auth endpoints
- [x] Add security headers (CSP, X-Frame-Options, etc.)
- [x] Fix error message information leakage
- [ ] Deploy Firestore rules: `firebase deploy --only firestore:rules`
- [ ] Create Lemonsqueezy account and product
- [ ] Deploy Cloud Functions for webhook
- [ ] Update CTA buttons with Lemonsqueezy checkout link

### Medium Priority
- [ ] Purchase and configure custom domain
- [ ] Move site from GitHub Pages subdirectory to own domain
- [ ] Add actual course video content to module pages
- [ ] Create PDF bonuses and add download links
- [ ] Set up email service for EmailCapture (e.g., Mailchimp, ConvertKit)
- [ ] Add Google Analytics or Plausible for tracking

### Nice to Have
- [ ] Add progress tracking (mark lessons as complete)
- [ ] Add real-time viewer count with Firebase
- [ ] Add course completion certificates
- [ ] Add affiliate program integration
- [ ] Add testimonials from real users
- [ ] Add before/after slider component

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

## Deployment to GitHub Pages

```bash
# Build the project
npm run build

# The dist folder contains the built files
# For GitHub Pages subdirectory deployment:
# Copy dist contents to the barber-blueprint folder
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
