/**
 * Script to set admin custom claims on Firebase Auth users
 *
 * Usage:
 *   1. Make sure you have a service account key:
 *      - Go to Firebase Console → Project Settings → Service Accounts
 *      - Click "Generate new private key"
 *      - Save as 'serviceAccountKey.json' in the scripts folder
 *
 *   2. Run: node scripts/setAdminClaim.js <user-email>
 *
 *   Example: node scripts/setAdminClaim.js jomen12@icloud.com
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');

try {
  const serviceAccount = require(serviceAccountPath);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
} catch (error) {
  console.error('\n❌ Error: Could not find serviceAccountKey.json');
  console.error('\nTo get your service account key:');
  console.error('1. Go to Firebase Console → Project Settings → Service Accounts');
  console.error('2. Click "Generate new private key"');
  console.error('3. Save the file as: scripts/serviceAccountKey.json\n');
  process.exit(1);
}

async function setAdminClaim(email) {
  try {
    // Get user by email
    const user = await admin.auth().getUserByEmail(email);
    console.log(`Found user: ${user.uid} (${user.email})`);

    // Set custom claim
    await admin.auth().setCustomUserClaims(user.uid, { admin: true });
    console.log(`✅ Successfully set admin claim for ${email}`);

    // Verify the claim was set
    const updatedUser = await admin.auth().getUser(user.uid);
    console.log('Custom claims:', updatedUser.customClaims);

    console.log('\n⚠️  Important: The user must sign out and sign back in for the claim to take effect.\n');
  } catch (error) {
    console.error(`❌ Error setting admin claim: ${error.message}`);
    process.exit(1);
  }
}

// Get email from command line
const email = process.argv[2];

if (!email) {
  console.error('\nUsage: node scripts/setAdminClaim.js <user-email>\n');
  console.error('Example: node scripts/setAdminClaim.js jomen12@icloud.com\n');
  process.exit(1);
}

setAdminClaim(email).then(() => process.exit(0));
