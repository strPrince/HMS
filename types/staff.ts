export type StaffRole = 'manager' | 'waiter' | 'kitchen';

export type StaffProfile = {
  id: string;
  name: string;
  role: StaffRole;
  pin: string;
  initials: string;
  color: string;
  avatarBg: string;
};
