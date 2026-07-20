import { randomUUID } from 'node:crypto';
import { SystemRoles } from 'librechat-data-provider';

export const GUEST_PROVIDER = 'anonymous';

export type GuestUser = {
  email: string;
  username: string;
  name: string;
  provider: typeof GUEST_PROVIDER;
  role: SystemRoles.USER;
  emailVerified: true;
  termsAccepted: true;
  termsAcceptedAt: Date;
};

export function createGuestUser(id: string = randomUUID()): GuestUser {
  const normalizedId = id.toLowerCase().replace(/[^a-z0-9]/g, '');

  return {
    email: `guest-${normalizedId}@anonymous.local`,
    username: `guest_${normalizedId}`,
    name: 'Guest',
    provider: GUEST_PROVIDER,
    role: SystemRoles.USER,
    emailVerified: true,
    termsAccepted: true,
    termsAcceptedAt: new Date(),
  };
}
