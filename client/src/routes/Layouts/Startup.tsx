import { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import type { TStartupConfig } from 'librechat-data-provider';
import { TranslationKeys, useLocalize, useAuthContext } from '~/hooks';
import { useGetStartupConfig } from '~/data-provider';
import AuthLayout from '~/components/Auth/AuthLayout';
import { REDIRECT_PARAM, SESSION_KEY, staffHomePath, wantsStaffLogin, markStaffLoginIntent } from '~/utils';

const headerMap: Record<string, TranslationKeys> = {
  '/login': 'com_auth_welcome_back',
  '/register': 'com_auth_create_account',
  '/forgot-password': 'com_auth_reset_password',
  '/reset-password': 'com_auth_reset_password',
  '/login/2fa': 'com_auth_verify_your_identity',
};

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
  const { user } = useAuthContext();
  const isGuest = user?.provider === 'anonymous';

  useEffect(() => {
    if (data) {
      setStartupConfig(data);
    }

    const staffWall = wantsStaffLogin(location.search, location.pathname);
    const onLoginPage = /^\/login\/?$/.test(location.pathname);

    if (!isAuthenticated) {
      if (data?.publicGuestMode === true && onLoginPage && !staffWall) {
        try {
          sessionStorage.removeItem(SESSION_KEY);
        } catch {
          /* ignore */
        }
        navigate('/c/new', { replace: true });
      }
      return;
    }

    if (staffWall && isGuest) {
      markStaffLoginIntent();
      return;
    }

    const storedRedirect = sessionStorage.getItem(SESSION_KEY);
    const hasPendingRedirect =
      new URLSearchParams(window.location.search).has(REDIRECT_PARAM) || storedRedirect != null;

    if (isGuest) {
      try {
        sessionStorage.removeItem(SESSION_KEY);
      } catch {
        /* ignore */
      }
      navigate('/c/new', { replace: true });
      return;
    }

    if (!hasPendingRedirect) {
      navigate(staffHomePath(), { replace: true });
    }
  }, [isAuthenticated, isGuest, navigate, data, location.search, location.pathname]);

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
