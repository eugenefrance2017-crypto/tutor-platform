import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// ВАЖНО: намеренно НЕ импортируем 'firebase-admin/auth' — именно этот модуль
// тянет за собой jwks-rsa -> jose (ESM-only в новых версиях), что вызывало
// Error [ERR_REQUIRE_ESM] на Vercel. Проверку ID-токена делаем через REST API
// Google напрямую (см. verify-request.ts), Firestore это не затрагивает.

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

export function getAdminDb() {
  if (initError) throw new Error(`Firebase Admin не инициализирован: ${initError}`);
  return getFirestore(app);
}