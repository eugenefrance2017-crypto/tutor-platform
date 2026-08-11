"use client";

import { useState, useEffect } from "react";
import { getAuth, onAuthStateChanged, type User } from "firebase/auth";
import { type FirebaseApp } from "firebase/app";

interface UseFirebaseUidResult {
  uid: string;              // "" пока не готово или если не залогинен
  authUser: User | null;    // полный объект пользователя от Firebase Auth
  authReady: boolean;       // true, когда Firebase Auth уже проверил сессию
                             // (не путать с "залогинен" — может быть true и uid == "")
}

// app нужно передать тот же инстанс Firebase, что используется в остальном
// проекте (initializeApp(firebaseConfig) уже вызван в каждом файле).
export function useFirebaseUid(app: FirebaseApp): UseFirebaseUidResult {
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const auth = getAuth(app);
    const unsub = onAuthStateChanged(auth, (user) => {
      setAuthUser(user);
      setAuthReady(true);
    });
    return () => unsub();
  }, [app]);

  return {
    uid: authUser?.uid || "",
    authUser,
    authReady,
  };
}