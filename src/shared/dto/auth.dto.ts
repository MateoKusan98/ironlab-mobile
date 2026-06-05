import { UserRole } from '../enums';

export interface RegisterDto {
  email: string;
  password: string;
  name: string;
  role: UserRole;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface RefreshTokenDto {
  refreshToken: string;
}
