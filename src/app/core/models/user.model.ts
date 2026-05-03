export type Role = 'Admin';

export interface User {
  id: string;
  username: string;
  password?: string;
  name: string;
  role: Role;
}
