export interface User {
  id: number;
  telegramId: number;
  email: string;
  phoneNumber: string;
  isVerified: boolean;
  createdAt: Date;
}

export interface Domain {
  id: number;
  userId: number;
  domain: string;
  registrationDate: Date | null;
  expirationDate: Date | null;
  lastRenewDate: Date | null;
  registrar: string | null;
  status: string | null;
  createdAt: Date;
}

export interface VerificationCode {
  id: number;
  telegramId: number;
  email: string;
  code: string;
  expiresAt: Date;
  isUsed: boolean;
}
