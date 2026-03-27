export class UserProfileDto {
  readonly id!: string;
  readonly email!: string;
  readonly firstName!: string;
  readonly lastName!: string;
  readonly avatarUrl?: string | null;
  readonly createdAt!: string;
}
