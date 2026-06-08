import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes, randomInt } from 'crypto';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { EmailService } from '../email/email.service';
import { OtpEntity } from './entities/otp.entity';
import { UserEntity } from '../users/entities/user.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ForgotVerifyDto } from './dto/forgot-verify.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import {
  UnauthorizedException,
  ConflictException,
  NotFoundException,
} from '../../common/exceptions/base.exception';
import { JwtPayload } from '../../common/types/jwt-payload.type';
import { OtpType } from '../../common/enums/otp-type.enum';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
    @InjectRepository(OtpEntity)
    private readonly otpRepository: Repository<OtpEntity>,
  ) {}

  async login(dto: LoginDto): Promise<LoginResponseDto> {
    const user = await this.usersService.findByIdentifierWithPassword(dto.identifier);

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatch = await bcrypt.compare(dto.password, user.password);
    if (!passwordMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.buildTokenResponse(user);
  }

  async register(dto: RegisterDto): Promise<{ message: string }> {
    if (dto.password !== dto.confirmPassword) {
      throw new ConflictException('Passwords do not match');
    }

    const [emailTaken, usernameTaken] = await Promise.all([
      this.usersService.findByEmailIncludingDeleted(dto.email),
      this.usersService.findByUsernameWithPassword(dto.username),
    ]);

    if (emailTaken) throw new ConflictException('Email already registered');
    if (usernameTaken) throw new ConflictException(`Username "${dto.username}" is already taken`);

    await this.otpRepository.update(
      { email: dto.email, used: false, type: OtpType.REGISTRATION },
      { used: true },
    );

    const code = randomInt(100000, 999999).toString();
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await this.otpRepository.save(
      this.otpRepository.create({
        email: dto.email,
        username: dto.username,
        passwordHash,
        type: OtpType.REGISTRATION,
        code,
        expiresAt,
      }),
    );

    await this.emailService.sendOtp(dto.email, code);

    return { message: `OTP sent to ${dto.email}` };
  }

  async verifyOtp(dto: VerifyOtpDto): Promise<LoginResponseDto> {
    const otp = await this.otpRepository.findOne({
      where: { email: dto.email, used: false, type: OtpType.REGISTRATION },
      order: { createdAt: 'DESC' },
    });

    if (!otp || otp.expiresAt < new Date()) {
      throw new UnauthorizedException('OTP is invalid or expired');
    }

    if (otp.code !== dto.code) {
      throw new UnauthorizedException('Incorrect OTP code');
    }

    // Atomic claim — prevents race condition where two concurrent requests both pass findOne
    const claimed = await this.otpRepository.update(
      { id: otp.id, used: false },
      { used: true },
    );
    if (!claimed.affected) {
      throw new UnauthorizedException('OTP is invalid or expired');
    }

    // Double-check email + username not taken between register and verify
    const [emailTaken, usernameTaken] = await Promise.all([
      this.usersService.findByEmailIncludingDeleted(otp.email),
      this.usersService.findByUsernameWithPassword(otp.username!),
    ]);

    if (emailTaken) throw new ConflictException('Email already registered');
    if (usernameTaken) throw new ConflictException(`Username "${otp.username}" is already taken`);

    const user = await this.usersService.createFromOtp({
      email: otp.email,
      username: otp.username!,
      passwordHash: otp.passwordHash!,
    });

    return this.buildTokenResponse(user);
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

  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string }> {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user || !user.isActive) {
      // Return same message to avoid email enumeration
      return { message: `If ${dto.email} is registered, a reset code was sent` };
    }

    await this.otpRepository.update(
      { email: dto.email, used: false, type: OtpType.PASSWORD_RESET },
      { used: true },
    );

    const code = randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await this.otpRepository.save(
      this.otpRepository.create({
        email: dto.email,
        username: null,
        passwordHash: null,
        type: OtpType.PASSWORD_RESET,
        code,
        expiresAt,
      }),
    );

    await this.emailService.sendPasswordResetOtp(dto.email, code);
    return { message: `If ${dto.email} is registered, a reset code was sent` };
  }

  async forgotVerify(dto: ForgotVerifyDto): Promise<{ resetToken: string }> {
    const otp = await this.otpRepository.findOne({
      where: { email: dto.email, used: false, type: OtpType.PASSWORD_RESET },
      order: { createdAt: 'DESC' },
    });

    if (!otp || otp.expiresAt < new Date()) {
      throw new UnauthorizedException('OTP is invalid or expired');
    }

    if (otp.code !== dto.code) {
      throw new UnauthorizedException('Incorrect OTP code');
    }

    const claimed = await this.otpRepository.update(
      { id: otp.id, used: false },
      { used: true },
    );
    if (!claimed.affected) {
      throw new UnauthorizedException('OTP is invalid or expired');
    }

    const user = await this.usersService.findByEmail(dto.email);
    if (!user) throw new NotFoundException('User not found');

    const resetToken = this.jwtService.sign(
      { sub: user.id, purpose: 'password-reset' },
      { expiresIn: '15m' } as any,
    );

    return { resetToken };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    if (dto.newPassword !== dto.confirmPassword) {
      throw new ConflictException('Passwords do not match');
    }

    let payload: { sub: string; purpose: string };
    try {
      payload = this.jwtService.verify(dto.resetToken);
    } catch {
      throw new UnauthorizedException('Reset token is invalid or expired');
    }

    if (payload.purpose !== 'password-reset') {
      throw new UnauthorizedException('Invalid reset token');
    }

    const newPasswordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.usersService.resetPassword(payload.sub, newPasswordHash);
  }

  // ─── Private ───────────────────────────────────────────────

  private async buildTokenResponse(user: UserEntity): Promise<LoginResponseDto> {
    const accessToken = this.signAccessToken(user);
    const refreshToken = await this.generateRefreshToken(user);
    return {
      accessToken,
      refreshToken,
      user: { id: user.id, fullName: user.fullName, username: user.username, role: user.role },
    };
  }

  private signAccessToken(user: UserEntity): string {
    const payload: JwtPayload = { sub: user.id, username: user.username, role: user.role };
    return this.jwtService.sign(payload);
  }

  private async generateRefreshToken(user: UserEntity): Promise<string> {
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
