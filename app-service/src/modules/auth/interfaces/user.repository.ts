import type { User } from '@app/modules/auth/entities/user';

export abstract class UserRepository {
  abstract findByGoogleId(googleId: string): Promise<User | null>;
  abstract findById(id: string): Promise<User | null>;
  abstract create(data: {
    googleId: string;
    email: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
  }): Promise<User>;
  abstract updateProfile(
    id: string,
    data: { firstName: string; lastName: string; avatarUrl: string | null },
  ): Promise<User>;
}
