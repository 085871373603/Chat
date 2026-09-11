# Arinex Chat — Final

Static PWA for Vercel/GitHub Pages using Firebase Authentication and Realtime Database.

## Deploy
1. Upload the contents of this folder to your GitHub repository.
2. Import the repository into Vercel.
3. In Firebase Authentication enable Email/Password.
4. Add your Vercel domain under Authentication → Settings → Authorized domains.
5. In Realtime Database → Rules paste `firebase-rules.json`.
6. Deploy. On first deploy, clear old service-worker/site data if an older Arinex Chat version was installed.

## Important
This app is not end-to-end encrypted. Firebase Rules protect database access; they do not make message contents E2EE.
The `emailIndex` lookup is exact-hash lookup and should be moved server-side/Cloud Functions for a higher-security production deployment.
