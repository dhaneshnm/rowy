import { useEffect, useCallback } from "react";
import { useAtom, useSetAtom } from "jotai";
import { useAtomCallback } from "jotai/utils";
import { useErrorHandler } from "react-error-boundary";
import { getIdTokenResult } from "firebase/auth";

import {
  globalScope,
  currentUserAtom,
  userRolesAtom,
  updateUserSettingsAtom,
} from "@src/atoms/globalScope";
import { firebaseAuthAtom } from "./init";

/**
 * Sets currentUser and userRoles based on Firebase Auth user
 */
export function useAuthUser() {
  const elevateError = useErrorHandler();
  // Get current user and store in atoms
  const [firebaseAuth] = useAtom(firebaseAuthAtom, globalScope);
  const setCurrentUser = useSetAtom(currentUserAtom, globalScope);
  const setUserRoles = useSetAtom(userRolesAtom, globalScope);
  // Must use `useAtomCallback`, otherwise `useAtom(updateUserSettingsAtom)`
  // will cause infinite re-render
  const updateUserSettings = useAtomCallback(
    useCallback((get) => get(updateUserSettingsAtom), []),
    globalScope
  );

  useEffect(() => {
    // Suspend when currentUser has not been read yet
    (setCurrentUser as any)(new Promise(() => {}));

    const unsubscribe = firebaseAuth.onAuthStateChanged(async (user) => {
      setCurrentUser(user);

      try {
        if (user) {
          // Get user roles
          const tokenResult = await getIdTokenResult(user);
          const roles = (tokenResult.claims.roles as string[]) ?? [];
          setUserRoles(roles);

          // Update user settings doc with roles for User Management page
          const _updateUserSettings = await updateUserSettings();
          if (_updateUserSettings) _updateUserSettings({ roles });
        } else {
          setUserRoles([]);
        }
      } catch (e) {
        elevateError(e);
      }
    }, elevateError);

    return () => {
      unsubscribe();
    };
  }, [
    firebaseAuth,
    setCurrentUser,
    setUserRoles,
    updateUserSettings,
    elevateError,
  ]);
}
