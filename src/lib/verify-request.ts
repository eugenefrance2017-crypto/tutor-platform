import { getAdminDb } from './firebase-admin';

type VerifyResult =
  | { ok: true; uid: string }
  | { ok: false; error: string; status: number };

// Проверяем ID-токен через официальный REST-эндпоинт Google Identity Toolkit —
// вместо firebase-admin/auth (см. firebase-admin.ts почему).
// Документация: https://firebase.google.com/docs/reference/rest/auth#section-verify-custom-token
async function verifyIdTokenViaRest(idToken: string): Promise<{ uid: string } | null> {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey) {
    throw new Error('NEXT_PUBLIC_FIREBASE_API_KEY не задан');
  }

  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    }
  );

  const data = await res.json();

  if (!res.ok || !data.users || data.users.length === 0) {
    return null;
  }

  return { uid: data.users[0].localId };
}

export async function verifyTutorRequest(request: Request): Promise<VerifyResult> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { ok: false, error: 'Нет токена авторизации', status: 401 };
  }

  const idToken = authHeader.slice('Bearer '.length);

  try {
    const verified = await verifyIdTokenViaRest(idToken);
    if (!verified) {
      return { ok: false, error: 'Недействительный токен', status: 401 };
    }
    const uid = verified.uid;

    const adminDb = getAdminDb();
    const profileDoc = await adminDb.collection('profiles').doc(uid).get();
    if (!profileDoc.exists) {
      return { ok: false, error: 'Профиль не найден', status: 403 };
    }

    const role = profileDoc.data()?.role;
    if (role !== 'tutor') {
      return { ok: false, error: 'Доступ только для репетиторов', status: 403 };
    }

    return { ok: true, uid };
  } catch (e: any) {
    console.error('Ошибка верификации токена:', e);
    return { ok: false, error: `Ошибка проверки токена: ${e?.message || e}`, status: 401 };
  }
}