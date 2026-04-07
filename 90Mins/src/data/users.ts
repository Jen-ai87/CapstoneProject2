import { User } from './types';

/**
 * Dummy user accounts for development / demo purposes.
 * In production this would be replaced by a real auth backend.
 */
export const users: User[] = [
  {
    id: 'user-1',
    name: 'John Doe',
    email: 'john@example.com',
    avatarIcon: 'personCircleOutline',
    avatarColor: '#00B8DB',
  },
  {
    id: 'user-2',
    name: 'Jane Smith',
    email: 'jane@example.com',
    avatarIcon: 'personCircleOutline',
    avatarColor: '#00B8DB',
  },
];

/** Simple lookup for sign-in */
export const findUserByEmail = (email: string): User | undefined =>
  users.find((u) => u.email.toLowerCase() === email.toLowerCase());
