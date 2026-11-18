import { renderHook } from '@testing-library/react';
import useViewer from '../useViewer';

type AuthState = { isAuthenticated: boolean; user?: { provider?: string } };
type ConfigState = { data?: { isStaff?: boolean }; isFetching: boolean };

let mockAuth: AuthState = { isAuthenticated: false };
let mockConfig: ConfigState = { isFetching: false };

jest.mock('~/hooks/AuthContext', () => ({
  useAuthContext: () => mockAuth,
}));

jest.mock('~/data-provider', () => ({
  useGetStartupConfig: () => mockConfig,
}));

const render = (auth: AuthState, config: ConfigState) => {
  mockAuth = auth;
  mockConfig = config;
  return renderHook(() => useViewer()).result.current;
};

describe('useViewer', () => {
  it('treats a signed-up non-employee as a member', () => {
    const viewer = render(
      { isAuthenticated: true, user: { provider: 'local' } },
      { data: { isStaff: false }, isFetching: false },
    );
    expect(viewer).toEqual({ isGuest: false, isStaff: false, isMember: true, isSettled: true });
  });

  it('treats an employee as staff, not a member', () => {
    const viewer = render(
      { isAuthenticated: true, user: { provider: 'local' } },
      { data: { isStaff: true }, isFetching: false },
    );
    expect(viewer).toEqual({ isGuest: false, isStaff: true, isMember: false, isSettled: true });
  });

  it('does not call anyone a member while the startup config is refetching', () => {
    const viewer = render(
      { isAuthenticated: true, user: { provider: 'local' } },
      { data: { isStaff: false }, isFetching: true },
    );
    expect(viewer.isMember).toBe(false);
    expect(viewer.isSettled).toBe(false);
  });

  it('does not call anyone a member before the startup config loads', () => {
    const viewer = render(
      { isAuthenticated: true, user: { provider: 'local' } },
      { isFetching: false },
    );
    expect(viewer.isMember).toBe(false);
  });

  it('treats an anonymous session as a guest', () => {
    const viewer = render(
      { isAuthenticated: true, user: { provider: 'anonymous' } },
      { data: { isStaff: false }, isFetching: false },
    );
    expect(viewer).toEqual({ isGuest: true, isStaff: false, isMember: false, isSettled: true });
  });
});
