import { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import type { TStartupConfig } from 'librechat-data-provider';
import { TranslationKeys, useLocalize, useAuthContext } from '~/hooks';
import { useGetStartupConfig } from '~/data-provider';
import AuthLayout from '~/components/Auth/AuthLayout';
import { REDIRECT_PARAM, SESSION_KEY, staffHomePath } from '~/utils';

const headerMap: Record<string, TranslationKeys> = {
  '/login': 'com_auth_welcome_back',
  '/register': 'com_auth_create_account',
  '/forgot-password': 'com_auth_reset_password',
  '/reset-password': 'com_auth_reset_password',
  '/login/2fa': 'com_auth_verify_your_identity',
};

function wantsStaffLogin(search: string): boolean {
  try {
    if (sessionStorage.getItem('lc-staff-login') === '1') {
      return true;
    }
  } catch {
    /* ignore */
  }
  return new URLSearchParams(search).has('staff');
}

export default function StartupLayout({ isAuthenticated }: { isAuthenticated?: boolean }) {
  const [error, setError] = useState<TranslationKeys | null>(null);
  const [headerText, setHeaderText] = useState<TranslationKeys | null>(null);
  const [startupConfig, setStartupConfig] = useState<TStartupConfig | null>(null);
  const {
    data,
    isFetching,
    error: startupConfigError,
  } = useGetStartupConfig({
    enabled: isAuthenticated ? startupConfig === null : true,
  });
  const localize = useLocalize();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthContext();
  const isGuest = user?.provider === 'anonymous';

  useEffect(() => {
    if (isAuthenticated) {
      // Guest sessions must not stick on /login?staff=1 — end guest and show login form.
      if (wantsStaffLogin(location.search) && isGuest) {
        try {
          sessionStorage.setItem('lc-staff-login', '1');
        } catch {
          /* ignore */
        }
        logout('/login?staff=1');
        return;
      }

      const hasPendingRedirect =
        new URLSearchParams(window.location.search).has(REDIRECT_PARAM) ||
        sessionStorage.getItem(SESSION_KEY) != null;
      if (!hasPendingRedirect) {
        const home = isGuest ? '/c/new' : staffHomePath();
        navigate(home, { replace: true });
      }
    }
    if (data) {
      setStartupConfig(data);
    }
  }, [isAuthenticated, isGuest, logout, navigate, data, location.search]);

  useEffect(() => {
    document.title = startupConfig?.appTitle || 'Hotshot AI';
  }, [startupConfig?.appTitle]);

  useEffect(() => {
    setError(null);
    setHeaderText(null);
  }, [location.pathname]);

  const contextValue = {
    error,
    setError,
    headerText,
    setHeaderText,
    startupConfigError,
    startupConfig,
    isFetching,
  };

  return (
    <AuthLayout
      header={headerText ? localize(headerText) : localize(headerMap[location.pathname])}
      isFetching={isFetching}
      startupConfig={startupConfig}
      startupConfigError={startupConfigError}
      pathname={location.pathname}
      error={error}
    >
      <Outlet context={contextValue} />
    </AuthLayout>
  );
}
