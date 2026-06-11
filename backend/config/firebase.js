/**
 * firebase.js  —  backend/config/firebase.js
 *
 * Initialises the Firebase Admin SDK once and exports the `auth` service.
 * Used by auth.controller.js to verify Firebase ID tokens issued by the
 * client SDK (replaces google-auth-library / OAuth2Client).
 *
 * Required env vars (add to backend/.env):
 *   FIREBASE_PROJECT_ID=your-project-id
 *   FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@your-project.iam.gserviceaccount.com
 *   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
 *
 * The private key must be wrapped in double-quotes in .env so the newlines
 * survive dotenv parsing.  The replace('\n', '\n') call below handles both
 * the literal string "\n" that dotenv sometimes produces and real newlines.
 */

const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId:   process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey:  (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    }),
  });
}

module.exports = admin.auth();