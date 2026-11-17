import { SystemRoles } from 'librechat-data-provider';
import { isStaffUser } from './staff';

describe('isStaffUser', () => {
  it('treats admins as staff without a lookup', async () => {
    const lookup = jest.fn();
    expect(await isStaffUser({ id: 'a', role: SystemRoles.ADMIN }, lookup)).toBe(true);
    expect(lookup).not.toHaveBeenCalled();
  });

  it('never treats guests as staff', async () => {
    const lookup = jest.fn(async () => true);
    expect(await isStaffUser({ id: 'g', provider: 'anonymous', role: 'ADMIN' }, lookup)).toBe(
      false,
    );
    expect(lookup).not.toHaveBeenCalled();
  });

  it('asks the Employees group for everyone else and fails closed', async () => {
    expect(await isStaffUser({ id: 'u', role: SystemRoles.USER }, async () => true)).toBe(true);
    expect(await isStaffUser({ _id: { toString: () => 'u' } }, async () => false)).toBe(false);
    expect(
      await isStaffUser({ id: 'u' }, async () => {
        throw new Error('db down');
      }),
    ).toBe(false);
    expect(await isStaffUser(undefined, async () => true)).toBe(false);
  });
});
