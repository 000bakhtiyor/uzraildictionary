import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { UserEntity } from '../users/entities/user.entity';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { UnauthorizedException } from '../../common/exceptions/base.exception';
import { JwtPayload } from '../../common/types/jwt-payload.type';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto): Promise<LoginResponseDto> {
    const user = await this.usersService.findByUsernameWithPassword(dto.username);

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatch = await bcrypt.compare(dto.password, user.password);
    if (!passwordMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const accessToken = this.signAccessToken(user);
    const refreshToken = await this.generateRefreshToken(user);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        fullName: user.fullName,
        username: user.username,
        role: user.role,
      },
    };
  }

  async refresh(dto: RefreshTokenDto): Promise<{ accessToken: string; refreshToken: string }> {
    const user = await this.verifyRefreshToken(dto.refreshToken);
    const accessToken = this.signAccessToken(user);
    const refreshToken = await this.generateRefreshToken(user);
    return { accessToken, refreshToken };
  }

  async logout(userId: string): Promise<void> {
    await this.usersService.clearRefreshToken(userId);
  }

  // ─── Private ───────────────────────────────────────────────

  private signAccessToken(user: UserEntity): string {
    const payload: JwtPayload = {
      sub: user.id,
      username: user.username,
      role: user.role,
    };
    return this.jwtService.sign(payload);
  }

  private async generateRefreshToken(user: UserEntity): Promise<string> {
    // Format: base64url(userId.randomHex) — userId lets us look up the user on refresh
    const raw = `${user.id}.${randomBytes(40).toString('hex')}`;
    const token = Buffer.from(raw).toString('base64url');
    await this.usersService.setRefreshToken(user.id, raw);
    return token;
  }

  private async verifyRefreshToken(token: string): Promise<UserEntity> {
    try {
      const raw = Buffer.from(token, 'base64url').toString('utf-8');
      const dotIndex = raw.indexOf('.');
      if (dotIndex === -1) throw new Error('Malformed token');

      const userId = raw.substring(0, dotIndex);
      const user = await this.usersService.findByIdWithRefreshToken(userId);

      if (!user?.refreshTokenHash || !user.isActive) throw new Error('No token');

      const valid = await bcrypt.compare(raw, user.refreshTokenHash);
      if (!valid) throw new Error('Token mismatch');

      return user;
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }
}
