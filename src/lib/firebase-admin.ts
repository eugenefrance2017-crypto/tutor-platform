import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

let app: App;
let initError: string | null = null;

try {
  if (!getApps().length) {
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!projectId || !clientEmail || !privateKey) {
      throw new Error(
        `Отсутствует переменная окружения: ${[
          !projectId && 'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
          !clientEmail && 'FIREBASE_CLIENT_EMAIL',
          !privateKey && 'FIREBASE_PRIVATE_KEY',
        ].filter(Boolean).join(', ')}`
      );
    }

    app = initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
  } else {
    app = getApps()[0]!;
  }
} catch (e: any) {
  initError = e?.message || String(e);
  console.error('Firebase Admin init failed:', initError);
}

export function getAdminAuth() {
  if (initError) throw new Error(`Firebase Admin не инициализирован: ${initError}`);
  return getAuth(app);
}

export function getAdminDb() {
  if (initError) throw new Error(`Firebase Admin не инициализирован: ${initError}`);
  return getFirestore(app);
}