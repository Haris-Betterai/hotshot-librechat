import { SystemRoles } from 'librechat-data-provider';
import { createGuestUser, GUEST_PROVIDER } from './guest';

describe('createGuestUser', () => {
  it('creates an isolated, non-admin guest identity', () => {
    const guest = createGuestUser('A1B2-C3D4');

    expect(guest).toMatchObject({
      email: 'guest-a1b2c3d4@anonymous.local',
      username: 'guest_a1b2c3d4',
      provider: GUEST_PROVIDER,
      role: SystemRoles.USER,
      emailVerified: true,
      termsAccepted: true,
    });
    expect(guest.termsAcceptedAt).toBeInstanceOf(Date);
  });
});
