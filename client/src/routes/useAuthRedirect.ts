import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { buildLoginRedirectUrl } from 'librechat-data-provider';
import { useGetStartupConfig } from '~/data-provider';
import { useAuthContext } from '~/hooks';
import { isStaffPath, wantsStaffLogin } from '~/utils';

export default function useAuthRedirect() {
  const { user, roles, isAuthenticated } = useAuthContext();
  const { data: startupConfig } = useGetStartupConfig();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (isAuthenticated) {
      return;
    }

    const staffRoute = isStaffPath(location.pathname);
    const staffLogin = wantsStaffLogin(location.search, location.pathname) || staffRoute;
    if (!staffLogin && startupConfig?.publicGuestMode === true) {
      return;
    }

    if (!staffLogin && startupConfig == null) {
      return;
    }

    if (/^\/login(\/|$)/.test(location.pathname)) {
      return;
    }

    const timeout = setTimeout(() => {
      if (isAuthenticated) {
        return;
      }

      navigate(buildLoginRedirectUrl(location.pathname, location.search, location.hash), {
        replace: true,
      });
    }, 300);

    return () => {
      clearTimeout(timeout);
    };
  }, [isAuthenticated, navigate, location, startupConfig]);

  return {
    user,
    roles,
    isAuthenticated,
  };
}
