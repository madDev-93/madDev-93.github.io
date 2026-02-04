# Barber Blueprint - Project Context

## Project Overview
A React-based course platform for barbers with an admin panel for content management. Built with Vite, React, Tailwind CSS, and Firebase.

## Deployment Setup

### IMPORTANT: Deployment Process
The site is hosted on **GitHub Pages** via the parent repo `madDev-93.github.io`.

**To deploy changes:**
```bash
# 1. Build the project
npm run build

# 2. Copy built assets to the assets folder (this is what GitHub Pages serves)
rm -rf assets && cp -r dist/assets .

# 3. Copy the index.html
cp dist/index.html .

# 4. Commit and push from the PARENT directory
cd ..
git add barber-blueprint/
git commit -m "Deploy updates"
git push origin main
```

**DO NOT use `npx gh-pages -d dist`** - this deploys to a separate gh-pages branch that is NOT served by qwota.app.

### URLs
- **Production site**: https://qwota.app/barber-blueprint/
- **Firebase Console**: https://console.firebase.google.com/project/barber-blueprint/
- **GitHub Repo**: https://github.com/madDev-93/madDev-93.github.io

### Domain Configuration
- Custom domain `qwota.app` is configured via CNAME file in parent repo
- Firebase Auth authorized domains must include `qwota.app`
- Google Cloud API key must allow `https://qwota.app/*`

## Firebase Configuration

### Collections
- `blueprint_admins/{uid}` - Admin users (manually managed via Firebase Console)
- `blueprint_users/{uid}` - Regular users
- `blueprint_purchases/{email}` - Purchase records
- `site_content/landing` - Landing page content (hero, about, pricing)
- `testimonials/{id}` - Customer testimonials
- `faqs/{id}` - FAQ items
- `bonuses/{id}` - Bonus items
- `modules/{id}` - Course modules
- `modules/{id}/lessons/{id}` - Lessons within modules
- `admin_audit_log/{id}` - Admin action audit trail
- `email_subscribers/{id}` - Email list subscribers

### Storage Paths
- `/videos/` - Video files (max 500MB)
- `/images/` - Image files (max 10MB)
- `/pdfs/` - PDF files (max 50MB)

### Admin User Setup

**Step 1: Add to Firestore (for admin panel access)**
1. Go to Firestore Database
2. Create document in `blueprint_admins` collection
3. Use the user's Firebase Auth UID as the document ID
4. Add fields: `email`, `name`, `role: "admin"`, `createdAt`

**Step 2: Set Custom Claim (for file uploads)**
```bash
node scripts/setAdminClaim.cjs user-email@example.com
```
Then the user must sign out and sign back in.

Current admin: `jomen12@icloud.com` (UID: `DskWRmLrgKfiV5rS08E1brrF2Tv2`)

## Project Structure

```
barber-blueprint/
├── src/
│   ├── components/
│   │   ├── admin/           # Admin panel components
│   │   │   ├── shared/      # Reusable form components
│   │   │   └── previews/    # Content preview components
│   │   └── ...              # Public site components
│   ├── pages/
│   │   ├── admin/           # Admin panel pages
│   │   └── ...              # Public pages
│   ├── firebase/
│   │   ├── config.js        # Firebase initialization
│   │   ├── AuthContext.jsx  # User authentication
│   │   ├── AdminContext.jsx # Admin authentication
│   │   └── storage.js       # Storage utilities
│   ├── hooks/               # Custom React hooks for data fetching
│   ├── constants/           # Fallback content
│   └── utils/               # Validation, sanitization
├── assets/                  # BUILT files served by GitHub Pages
├── dist/                    # Vite build output (copy to assets/)
├── firestore.rules          # Firestore security rules
└── storage.rules            # Storage security rules
```

## Key Features

### Admin Panel (/admin)
- Dashboard with stats and recent activity
- Landing page editors (Hero, About, Pricing)
- Content managers (Testimonials, FAQs, Bonuses, Modules)
- Media library for file uploads
- Preview mode before publishing

### Authentication Flow
- Regular users → `/dashboard`
- Admin users → `/admin` (checked via `blueprint_admins` collection)
- Admin check happens in `Login.jsx` after successful authentication

### Content Management
- All content supports `draft` and `published` status
- Public site only shows `published` content
- Admins can see both draft and published content
- Changes are logged to `admin_audit_log`

## Environment Variables
Required in `.env.local`:
```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=barber-blueprint
VITE_FIREBASE_STORAGE_BUCKET=barber-blueprint.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_MEASUREMENT_ID=
```

## Common Issues & Solutions

### "No permission" on Storage uploads
- User must have admin custom claim set: `node scripts/setAdminClaim.cjs email@example.com`
- User must sign out and back in after claim is set
- Check Storage rules are deployed: `firebase deploy --only storage`

### Login redirects to wrong page
- Admin check happens in `src/pages/Login.jsx`
- Verify `blueprint_admins/{uid}` document exists

### Site not updating after deploy
- Make sure to copy `dist/assets/*` to `assets/` folder
- Push from the PARENT repo (`madDev-93.github.io`), not from barber-blueprint
- GitHub Pages can take 1-2 minutes to update

### Firebase Auth domain error
- Add domain to Firebase Console → Authentication → Settings → Authorized domains

## Build Commands
```bash
npm run dev      # Start dev server
npm run build    # Build for production
npm run preview  # Preview production build locally
```

## Firebase Deployment
```bash
firebase deploy --only firestore   # Deploy Firestore rules
firebase deploy --only storage     # Deploy Storage rules
firebase deploy --only functions   # Deploy Cloud Functions
```

