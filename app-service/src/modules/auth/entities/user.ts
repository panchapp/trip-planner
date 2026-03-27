export interface User {
  readonly id: string;
  readonly email: string;
  readonly googleId: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly avatarUrl: string | null;
  readonly createdAt: Date;
}
