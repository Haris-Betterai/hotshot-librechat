import { useLocation } from 'react-router-dom';
import { useAuthContext } from '~/hooks/AuthContext';
import { isStaffPath } from '~/utils/staff';

/**
 * Single source of truth for whether raw model reasoning may be shown.
 * Customers (public chrome, guest/anonymous sessions) only get a progress label;
 * staff (/staff routes or a signed-in non-guest user) get the full thinking block.
 */
export default function useReasoningDetail(): boolean {
  const { pathname } = useLocation();
  const { user } = useAuthContext();

  if (isStaffPath(pathname)) {
    return true;
  }
  return user != null && user.provider !== 'anonymous';
}
