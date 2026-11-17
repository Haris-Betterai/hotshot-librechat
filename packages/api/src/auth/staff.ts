import { logger } from '@librechat/data-schemas';
import { SystemRoles } from 'librechat-data-provider';
import { GUEST_PROVIDER } from './guest';

export type StaffCandidate = {
  id?: string;
  _id?: { toString(): string };
  role?: string;
  provider?: string;
};

/** Admins and members of the Employees group count as staff; guests never do. Fails closed. */
export async function isStaffUser(
  user: StaffCandidate | undefined,
  isStaffMember: (userId: string) => Promise<boolean>,
): Promise<boolean> {
  if (!user || user.provider === GUEST_PROVIDER) {
    return false;
  }
  if (user.role === SystemRoles.ADMIN) {
    return true;
  }
  const userId = user.id ?? user._id?.toString();
  if (!userId) {
    return false;
  }
  try {
    return await isStaffMember(userId);
  } catch (error) {
    logger.error('[staff] Error checking Employees group membership', error);
    return false;
  }
}
