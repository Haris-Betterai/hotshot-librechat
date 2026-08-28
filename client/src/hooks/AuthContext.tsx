import {
  useRef,
  useMemo,
  useState,
  useEffect,
  useContext,
  useCallback,
  createContext,
} from 'react';
import { debounce } from 'lodash';
import { useRecoilState, useSetRecoilState } from 'recoil';
import { useNavigate } from 'react-router-dom';
import {
  apiBaseUrl,
  SystemRoles,
  setTokenHeader,
  isSystemRoleName,
  buildLoginRedirectUrl,
} from 'librechat-data-provider';
import type * as t from 'librechat-data-provider';
import type { ReactNode } from 'react';
import {
  useGetRole,
  useGetUserQuery,
  useGuestSessionMutation,
  useGuestEmbedSessionMutation,
  useLoginUserMutation,
  useLogoutUserMutation,
  useRefreshTokenMutation,
  useGetStartupConfig,
} from '~/data-provider';
import { TAuthConfig, TUserContext, TAuthContext, TResError } from '~/common';
import { SESSION_KEY, isSafeRedirect, getPostLoginRedirect, markEmbedWidget, isStaffPath, staffHomePath, wantsStaffLogin, markStaffLoginIntent, clearStaffLoginIntent } from '~/utils';
import useTimeout from './useTimeout';
import store from '~/store';

const AuthContext = (import.meta.hot?.data?.__AuthContext ??
  createContext<TAuthContext | undefined>(undefined)) as React.Context<TAuthContext | undefined>;
if (import.meta.hot) {
  import.meta.hot.data.__AuthContext = AuthContext;
}

const AuthContextProvider = ({
  authConfig,
  children,
}: {
  authConfig?: TAuthConfig;
  children: ReactNode;
}) => {
  const MAX_REFRESH_FAILURES = 2;
  const isExternalRedirectRef = useRef(false);
  const [user, setUser] = useRecoilState(store.user);
  const logoutRedirectRef = useRef<string | undefined>(undefined);
  const [token, setToken] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const setQueriesEnabled = useSetRecoilState<boolean>(store.queriesEnabled);
  const embedGuestInitAttemptedRef = useRef(false);
  const currentEmbedIdRef = useRef<string | null>(null);
  const refreshFailureCountRef = useRef(0);
  const refreshHaltedRef = useRef(false);

  const userRoleName = user?.role ?? '';
  const isCustomRole = isAuthenticated && !!user?.role && !isSystemRoleName(user.role);

  const { data: userRole = null } = useGetRole(SystemRoles.USER, {
    enabled: !!(isAuthenticated && (user?.role ?? '')),
  });
  const { data: adminRole = null } = useGetRole(SystemRoles.ADMIN, {
    enabled: !!(isAuthenticated && user?.role === SystemRoles.ADMIN),
  });
  const { data: customRole = null } = useGetRole(isCustomRole ? userRoleName : '_', {
    enabled: isCustomRole,
  });

  const navigate = useNavigate();

  const setUserContext = useMemo(
    () =>
      debounce((userContext: TUserContext) => {
        const { token, isAuthenticated, user, redirect } = userContext;
        setUser(user);
        setToken(token);
        setTokenHeader(token);
        setIsAuthenticated(isAuthenticated);
        if (isAuthenticated) {
          setQueriesEnabled(true);
        }

        const searchParams = new URLSearchParams(window.location.search);
        const postLoginRedirect = getPostLoginRedirect(searchParams);

        const logoutRedirect = logoutRedirectRef.current;
        logoutRedirectRef.current = undefined;

        const finalRedirect =
          logoutRedirect ??
          postLoginRedirect ??
          (redirect && isSafeRedirect(redirect) ? redirect : null);

        if (finalRedirect == null) {
          return;
        }

        navigate(finalRedirect, { replace: true });
      }, 50),
    [navigate, setUser, setQueriesEnabled],
  );
  const doSetError = useTimeout({ callback: (error) => setError(error as string | undefined) });
  const { mutate: refreshToken } = useRefreshTokenMutation();
  const { mutate: createGuestSession } = useGuestSessionMutation();
  const { mutate: createGuestEmbedSession } = useGuestEmbedSessionMutation();
  const { data: startupConfig } = useGetStartupConfig();

  const loginUser = useLoginUserMutation({
    onSuccess: (data: t.TLoginResponse) => {
      const { user, token, twoFAPending, tempToken } = data;
      if (twoFAPending) {
        navigate(`/login/2fa?tempToken=${tempToken}`, { replace: true });
        return;
      }
      // Staff is authenticated now — clear the flag so a later logout returns to guest.
      try {
        clearStaffLoginIntent();
      } catch {
        /* ignore */
      }
      refreshFailureCountRef.current = 0;
      refreshHaltedRef.current = false;
      setError(undefined);
      setUserContext({ token, isAuthenticated: true, user, redirect: staffHomePath() });
    },
    onError: (error: TResError | unknown) => {
      const resError = error as TResError;
      doSetError(resError.message);
      // Preserve a valid redirect_to across login failures so the deep link survives retries.
      // Cannot use buildLoginRedirectUrl() here — it reads the current pathname (already /login)
      // and would return plain /login, dropping the redirect_to destination.
      const redirectTo = new URLSearchParams(window.location.search).get('redirect_to');
      const loginPath =
        redirectTo && isSafeRedirect(redirectTo)
          ? `/login?redirect_to=${encodeURIComponent(redirectTo)}`
          : '/login';
      navigate(loginPath, { replace: true });
    },
  });
  const logoutUser = useLogoutUserMutation({
    onSuccess: (data) => {
      if (data.redirect) {
        /** data.redirect is the IdP's end_session_endpoint URL — an absolute URL generated
         * server-side from trusted IdP metadata (not user input), so isSafeRedirect is bypassed.
         * setUserContext is debounced (50ms) and won't fire before page unload, so clear the
         * axios Authorization header synchronously to prevent in-flight requests. */
        isExternalRedirectRef.current = true;
        setTokenHeader(undefined);
        window.location.replace(data.redirect);
        return;
      }
      const staffLogout =
        typeof logoutRedirectRef.current === 'string' &&
        logoutRedirectRef.current.includes('staff=1');
      if (!staffLogout) {
        try {
          clearStaffLoginIntent();
        } catch {
          /* ignore */
        }
      }
      // Prefer guest home unless we know public guest mode is disabled.
      const guestHome = startupConfig?.publicGuestMode === false ? '/login' : '/';
      setUserContext({
        token: undefined,
        isAuthenticated: false,
        user: undefined,
        redirect: guestHome,
      });
    },
    onError: (error) => {
      doSetError((error as Error).message);
      const staffLogout =
        typeof logoutRedirectRef.current === 'string' &&
        logoutRedirectRef.current.includes('staff=1');
      if (!staffLogout) {
        try {
          clearStaffLoginIntent();
        } catch {
          /* ignore */
        }
      }
      const guestHome = startupConfig?.publicGuestMode === false ? '/login' : '/';
      setUserContext({
        token: undefined,
        isAuthenticated: false,
        user: undefined,
        redirect: guestHome,
      });
    },
  });

  const getEmbedIdFromPath = useCallback((): string | null => {
    const match = window.location.pathname.match(/(?:^|\/)embed\/([^/]+)/);
    return match?.[1] ?? null;
  }, []);

  const startEmbedGuestSession = useCallback(() => {
    const embedId = getEmbedIdFromPath();
    if (!embedId) {
      return;
    }

    if (currentEmbedIdRef.current !== embedId) {
      currentEmbedIdRef.current = embedId;
      embedGuestInitAttemptedRef.current = false;
    }

    if (embedGuestInitAttemptedRef.current) {
      return;
    }

    embedGuestInitAttemptedRef.current = true;

    createGuestEmbedSession(embedId, {
      onSuccess: ({ user, token, agent_id }) => {
        markEmbedWidget();
        setUserContext({
          user,
          token,
          isAuthenticated: true,
          redirect: `/c/new?agent_id=${encodeURIComponent(agent_id)}&embed=1`,
        });
      },
      onError: () => {
        navigate('/login', { replace: true });
      },
    });
  }, [
    createGuestEmbedSession,
    getEmbedIdFromPath,
    navigate,
    setUserContext,
  ]);

  const logout = useCallback(
    (redirect?: string) => {
      if (redirect) {
        logoutRedirectRef.current = redirect;
      }
      logoutUser.mutate(undefined);
    },
    [logoutUser],
  );

  const userQuery = useGetUserQuery({ enabled: !!(token ?? '') });

  const login = (data: t.TLoginUser) => {
    loginUser.mutate(data);
  };

  const fallbackToGuestMode = useCallback(() => {
    refreshHaltedRef.current = true;
    setTokenHeader(undefined);
    setToken(undefined);
    setIsAuthenticated(false);
    setQueriesEnabled(false);
    setUser(undefined);

    if (getEmbedIdFromPath() != null) {
      startEmbedGuestSession();
      return;
    }

    const staffLoginRequested = wantsStaffLogin();
    if (staffLoginRequested || isStaffPath()) {
      navigate('/login?staff=1', { replace: true });
      return;
    }
    if (startupConfig?.publicGuestMode === false) {
      navigate('/login', { replace: true });
      return;
    }

    createGuestSession(undefined, {
      onSuccess: ({ user, token }) => {
        refreshFailureCountRef.current = 0;
        refreshHaltedRef.current = false;
        setUserContext({ user, token, isAuthenticated: true, redirect: '/c/new' });
      },
      onError: () => {
        navigate('/login', { replace: true });
      },
    });
  }, [
    createGuestSession,
    getEmbedIdFromPath,
    navigate,
    setQueriesEnabled,
    setUser,
    setUserContext,
    startEmbedGuestSession,
    startupConfig?.publicGuestMode,
  ]);

  const startGuestSession = useCallback(() => {
    // If we're on an admin-generated embed widget URL, initialize the
    // authorized embed guest session instead of relying on PUBLIC_GUEST_MODE.
    if (getEmbedIdFromPath() != null) {
      startEmbedGuestSession();
      return;
    }

    const params = new URLSearchParams(window.location.search);
    if (params.has('guest')) {
      try {
        clearStaffLoginIntent();
      } catch {
        /* ignore */
      }
    }

    const pathname = window.location.pathname;
    const staffWall = wantsStaffLogin() || isStaffPath();
    if (staffWall) {
      markStaffLoginIntent();
      navigate('/login?staff=1', { replace: true });
      return;
    }

    const isOtherAuthPage =
      /^\/(register|forgot-password|reset-password)(\/|$)/.test(pathname) ||
      /^\/login\/2fa(\/|$)/.test(pathname);
    if (isOtherAuthPage) {
      return;
    }

    if (/^\/login\/?$/.test(pathname)) {
      try {
        clearStaffLoginIntent();
      } catch {
        /* ignore */
      }
    }

    // Only auto-guest when the server enables public guest mode.
    if (startupConfig != null && startupConfig.publicGuestMode !== true) {
      navigate(buildLoginRedirectUrl());
      return;
    }

    createGuestSession(undefined, {
      onSuccess: ({ user, token }) => {
        setUserContext({ user, token, isAuthenticated: true, redirect: '/c/new' });
      },
      onError: () => {
        navigate(buildLoginRedirectUrl());
      },
    });
  }, [
    createGuestSession,
    navigate,
    setUserContext,
    startupConfig,
    startEmbedGuestSession,
    getEmbedIdFromPath,
  ]);

  const silentRefresh = useCallback(() => {
    if (authConfig?.test === true) {
      console.log('Test mode. Skipping silent refresh.');
      return;
    }
    if (isExternalRedirectRef.current) {
      return;
    }
    refreshToken(undefined, {
      onSuccess: (data: t.TRefreshTokenResponse | undefined) => {
        if (isExternalRedirectRef.current) {
          return;
        }
        const { user, token = '' } = data ?? {};
        if (token) {
          refreshFailureCountRef.current = 0;
          refreshHaltedRef.current = false;
          const storedRedirect = sessionStorage.getItem(SESSION_KEY);
          sessionStorage.removeItem(SESSION_KEY);
          const baseUrl = apiBaseUrl();
          const rawPath = window.location.pathname;
          const strippedPath =
            baseUrl && (rawPath === baseUrl || rawPath.startsWith(baseUrl + '/'))
              ? rawPath.slice(baseUrl.length) || '/'
              : rawPath;
          const currentUrl = `${strippedPath}${window.location.search}`;
          const fallbackRedirect = isSafeRedirect(currentUrl) ? currentUrl : '/c/new';
          const redirect =
            storedRedirect && isSafeRedirect(storedRedirect) ? storedRedirect : fallbackRedirect;
          setUserContext({ user, token, isAuthenticated: true, redirect });
          return;
        }
        console.log('Token is not present. User is not authenticated.');
        if (authConfig?.test === true) {
          return;
        }
        refreshFailureCountRef.current += 1;
        if (refreshFailureCountRef.current >= MAX_REFRESH_FAILURES) {
          fallbackToGuestMode();
          return;
        }
        startGuestSession();
      },
      onError: (error) => {
        if (isExternalRedirectRef.current) {
          return;
        }
        console.log('refreshToken mutation error:', error);
        if (authConfig?.test === true) {
          return;
        }
        refreshFailureCountRef.current += 1;
        if (refreshFailureCountRef.current >= MAX_REFRESH_FAILURES) {
          fallbackToGuestMode();
          return;
        }
        startGuestSession();
      },
    });
  }, [
    authConfig?.test,
    refreshToken,
    setUserContext,
    startGuestSession,
    fallbackToGuestMode,
  ]);

  useEffect(() => {
    if (isExternalRedirectRef.current) {
      return;
    }
    if (userQuery.data) {
      setUser(userQuery.data);
    } else if (userQuery.isError && startupConfig?.publicGuestMode !== true) {
      doSetError((userQuery.error as Error).message);
      navigate(buildLoginRedirectUrl(), { replace: true });
    }
    if (error != null && error && isAuthenticated) {
      doSetError(undefined);
    }
    if (!refreshHaltedRef.current && (token == null || !token || !isAuthenticated)) {
      silentRefresh();
    }
  }, [
    token,
    isAuthenticated,
    userQuery.data,
    userQuery.isError,
    userQuery.error,
    error,
    setUser,
    navigate,
    silentRefresh,
    setUserContext,
    startupConfig?.publicGuestMode,
  ]);

  useEffect(() => {
    const handleTokenUpdate = (event: CustomEvent<string>) => {
      console.log('tokenUpdated event received event');
      setUserContext({
        token: event.detail,
        isAuthenticated: true,
        user: user,
      });
    };

    window.addEventListener('tokenUpdated', handleTokenUpdate as EventListener);

    return () => {
      window.removeEventListener('tokenUpdated', handleTokenUpdate as EventListener);
    };
  }, [setUserContext, user]);

  const memoedValue = useMemo(
    () => ({
      user,
      token,
      error,
      login,
      logout,
      setError,
      roles: {
        [SystemRoles.USER]: userRole,
        [SystemRoles.ADMIN]: adminRole,
        ...(isCustomRole && customRole ? { [userRoleName]: customRole } : {}),
      },
      isAuthenticated,
    }),

    [
      user,
      error,
      isAuthenticated,
      token,
      userRole,
      adminRole,
      isCustomRole,
      userRoleName,
      customRole,
    ],
  );

  return <AuthContext.Provider value={memoedValue}>{children}</AuthContext.Provider>;
};

const useAuthContext = () => {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuthContext should be used inside AuthProvider');
  }

  return context;
};

export { AuthContextProvider, useAuthContext, AuthContext };
