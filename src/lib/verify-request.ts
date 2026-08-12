import { adminAuth, adminDb } from './firebase-admin';

type VerifyResult =
  | { ok: true; uid: string }
  | { ok: false; error: string; status: number };

export async function verifyTutorRequest(request: Request): Promise<VerifyResult> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { ok: false, error: 'Нет токена авторизации', status: 401 };
  }

  const idToken = authHeader.slice('Bearer '.length);

  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    const uid = decoded.uid;

    const profileDoc = await adminDb.collection('profiles').doc(uid).get();
    if (!profileDoc.exists) {
      return { ok: false, error: 'Профиль не найден', status: 403 };
    }

    const role = profileDoc.data()?.role;
    if (role !== 'tutor') {
      return { ok: false, error: 'Доступ только для репетиторов', status: 403 };
    }

    return { ok: true, uid };
  } catch (e) {
    console.error('Ошибка верификации токена:', e);
    return { ok: false, error: 'Недействительный токен', status: 401 };
  }
}