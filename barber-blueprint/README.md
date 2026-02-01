# The Barber Blueprint

A high-converting landing page and members area for a digital course targeted at barbers who want to build their personal brand and create income beyond chair time.

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

You need to add a **Web App** to your Firebase project and get the config.

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: `qwota-ai-coach`
3. Go to **Project Settings** → **General**
4. Scroll to **Your apps** → Click **Add app** → Select **Web** (</>)
5. Register the app (name: "Barber Blueprint")
6. Copy the config object

Then update `src/firebase/config.js`:

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

### 2. Firestore Rules

Add these rules to your Firestore (in Firebase Console → Firestore → Rules):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Existing Qwota rules...

    // Blueprint users - users can read their own data
    match /blueprint_users/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if request.auth != null && request.auth.uid == userId;
    }

    // Blueprint purchases - only server can write (webhook)
    match /blueprint_purchases/{email} {
      allow read: if request.auth != null &&
                    request.auth.token.email.lower() == email;
      allow write: if false; // Only Cloud Functions can write
    }
  }
}
```

### 3. Enable Authentication

1. Go to Firebase Console → Authentication
2. Click **Get started** (if not already enabled)
3. Go to **Sign-in method** tab
4. Enable **Email/Password**

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
   https://us-central1-qwota-ai-coach.cloudfunctions.net/lemonsqueezyWebhook
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

## TODO List

### High Priority
- [ ] Add Firebase web config credentials to `src/firebase/config.js`
- [ ] Enable Email/Password auth in Firebase Console
- [ ] Add Firestore security rules for blueprint collections
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
