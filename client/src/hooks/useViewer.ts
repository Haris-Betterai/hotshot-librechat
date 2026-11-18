import { useGetStartupConfig } from '~/data-provider';
import { useAuthContext } from '~/hooks/AuthContext';

export type Viewer = {
  isGuest: boolean;
  isStaff: boolean;
  /** Signed-up account outside the Employees group: customer view plus their own chat history. */
  isMember: boolean;
  /** The startup config for the current user has loaded and is not being refetched. */
  isSettled: boolean;
};

/**
 * Who is looking at the app. `isMember` waits for a settled startup config so a staff user is
 * never treated as a customer while the config is refetched after sign-in.
 */
export default function useViewer(): Viewer {
  const { user, isAuthenticated } = useAuthContext();
  const { data: startupConfig, isFetching } = useGetStartupConfig();
  const isGuest = user?.provider === 'anonymous';
  const isStaff = startupConfig?.isStaff === true;
  const isSettled = startupConfig != null && !isFetching;
  const isMember = isAuthenticated && user != null && !isGuest && isSettled && !isStaff;
  return { isGuest, isStaff, isMember, isSettled };
}
