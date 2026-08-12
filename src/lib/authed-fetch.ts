import { getAuth } from 'firebase/auth';

export async function authedFetch(url: string, body: any) {
  const authInstance = getAuth();
  const token = await authInstance.currentUser?.getIdToken();
  if (!token) throw new Error('Не авторизован');

  return fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
}