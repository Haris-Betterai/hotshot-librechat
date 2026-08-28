import { chatPath, clearStaffLoginIntent, isStaffPath, markStaffLoginIntent, staffHomePath, viewPath, wantsStaffLogin } from '../staff';

describe('staff view paths', () => {
  it('detects staff routes', () => {
    expect(isStaffPath('/staff')).toBe(true);
    expect(isStaffPath('/staff/c/new')).toBe(true);
    expect(isStaffPath('/c/new')).toBe(false);
    expect(isStaffPath('/staffing')).toBe(false);
  });

  it('prefixes in-app paths while on staff routes', () => {
    expect(viewPath('/c/abc', '/staff/c/new')).toBe('/staff/c/abc');
    expect(viewPath('/c/new?projectId=1', '/staff/prompts')).toBe('/staff/c/new?projectId=1');
    expect(viewPath('/search', '/staff/c/x')).toBe('/staff/search');
  });

  it('leaves public paths unchanged off staff routes', () => {
    expect(viewPath('/c/abc', '/c/new')).toBe('/c/abc');
    expect(chatPath('new', '/c/old')).toBe('/c/new');
  });

  it('does not double-prefix staff, login, or embed paths', () => {
    expect(viewPath('/staff/c/new', '/staff/c/old')).toBe('/staff/c/new');
    expect(viewPath('/login?staff=1', '/staff/c/new')).toBe('/login?staff=1');
    expect(viewPath('/embed/abc', '/staff/c/new')).toBe('/embed/abc');
  });

  it('exposes the staff home chat route', () => {
    expect(staffHomePath()).toBe('/staff/c/new');
  });

  it('does not keep the staff-login flag on public chat after leaving /login', () => {
    markStaffLoginIntent();
    expect(wantsStaffLogin('?staff=1', '/login')).toBe(true);
    expect(wantsStaffLogin('', '/c/new')).toBe(false);
    expect(sessionStorage.getItem('lc-staff-login')).toBeNull();
    clearStaffLoginIntent();
  });
});
