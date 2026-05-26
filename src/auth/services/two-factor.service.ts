import { Injectable } from '@nestjs/common';
import * as otplib from 'otplib';
import { User } from '../../users/entities/user.entity';
import { UsersService } from '../../users/services/users/users.service';
import * as qrcode from 'qrcode';

@Injectable()
export class TwoFactorService {
  constructor(private readonly usersService: UsersService) {}

  /**
   * Generates a 2FA secret and the corresponding otpauth URL.
   * Using otplib v13 modular exports.
   */
  async generateTwoFactorSecret(user: User) {
    const secret = otplib.generateSecret();
    
    // otplib.generateURI expects an options object in v13
    const otpauthUrl = otplib.generateURI({
      label: user.email,
      issuer: 'JustMe App',
      secret: secret
    });
    
    // Temporarily save secret to verify it later before enabling
    await this.usersService.updateUser(user.id, { twoFactorSecret: secret });
    
    return {
      secret,
      otpauthUrl
    };
  }

  async generateQrCodeDataURL(otpauthUrl: string) {
    return qrcode.toDataURL(otpauthUrl);
  }

  /**
   * Verifies the 2FA token.
   * otplib.verify in v13 returns a Promise.
   */
  async isTwoFactorCodeValid(twoFactorCode: string, user: User) {
    if (!user.twoFactorSecret) return false;
    
    return otplib.verify({
      token: twoFactorCode,
      secret: user.twoFactorSecret,
    });
  }

  async turnOnTwoFactorAuthentication(userId: number) {
    return this.usersService.updateUser(userId, { isTwoFactorEnabled: true });
  }

  async turnOffTwoFactorAuthentication(userId: number) {
    return this.usersService.updateUser(userId, { 
      isTwoFactorEnabled: false,
      twoFactorSecret: undefined
    });
  }
}
