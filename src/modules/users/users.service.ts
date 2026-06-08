import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UserEntity } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { UserMapper } from './mappers/user.mapper';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';
import { paginate, getSkip } from '../../common/utils/pagination.util';
import {
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '../../common/exceptions/base.exception';
import { UserRole } from '../../common/enums/user-role.enum';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  async create(dto: CreateUserDto): Promise<UserResponseDto> {
    const usernameTaken = await this.userRepository.findOne({
      where: { username: dto.username },
      withDeleted: true,
    });
    if (usernameTaken) {
      throw new ConflictException(`Username "${dto.username}" is already taken`);
    }

    if (dto.email) {
      const emailTaken = await this.userRepository.findOne({ where: { email: dto.email } });
      if (emailTaken) throw new ConflictException('Email already registered');
    }

    const hashed = await bcrypt.hash(dto.password, 10);
    const user = this.userRepository.create({
      ...dto,
      password: hashed,
      role: dto.role ?? UserRole.USER,
      isActive: dto.isActive ?? true,
    });

    const saved = await this.userRepository.save(user);
    return UserMapper.toResponse(saved);
  }

  async findAll(query: QueryUsersDto): Promise<PaginatedResponseDto<UserResponseDto>> {
    const { page, limit, search, role, isActive } = query;
    const skip = getSkip(page, limit);

    const qb = this.userRepository
      .createQueryBuilder('user')
      .where('user.deletedAt IS NULL');

    if (search) {
      qb.andWhere(
        '(user.fullName ILIKE :search OR user.username ILIKE :search OR user.email ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (role !== undefined) {
      qb.andWhere('user.role = :role', { role });
    }

    if (isActive !== undefined) {
      qb.andWhere('user.isActive = :isActive', { isActive });
    }

    qb.orderBy('user.createdAt', 'DESC').skip(skip).take(limit);

    const [users, total] = await qb.getManyAndCount();
    return paginate(UserMapper.toResponseList(users), total, page, limit);
  }

  async findOne(id: string): Promise<UserResponseDto> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User');
    return UserMapper.toResponse(user);
  }

  async update(id: string, dto: UpdateUserDto): Promise<UserResponseDto> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User');

    if (dto.username && dto.username !== user.username) {
      const taken = await this.userRepository.findOne({
        where: { username: dto.username },
        withDeleted: true,
      });
      if (taken) throw new ConflictException(`Username "${dto.username}" is already taken`);
    }

    if (dto.email && dto.email !== user.email) {
      const taken = await this.userRepository.findOne({ where: { email: dto.email } });
      if (taken) throw new ConflictException('Email already registered');
    }

    const updates: Partial<UserEntity> = { ...dto };
    if (dto.password) {
      updates.password = await bcrypt.hash(dto.password, 10);
    }

    Object.assign(user, updates);
    const saved = await this.userRepository.save(user);
    return UserMapper.toResponse(saved);
  }

  async remove(id: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User');
    await this.userRepository.softDelete(id);
  }

  // ─── Me ────────────────────────────────────────────────────

  async getMe(id: string): Promise<UserResponseDto> {
    return this.findOne(id);
  }

  async updateMe(id: string, dto: UpdateProfileDto): Promise<UserResponseDto> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User');
    Object.assign(user, dto);
    const saved = await this.userRepository.save(user);
    return UserMapper.toResponse(saved);
  }

  async changePassword(id: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.findByIdWithPassword(id);
    if (!user) throw new NotFoundException('User');

    const match = await bcrypt.compare(dto.currentPassword, user.password);
    if (!match) throw new UnauthorizedException('Current password is incorrect');

    user.password = await bcrypt.hash(dto.newPassword, 10);
    await this.userRepository.save(user);
  }

  // ─── Auth helpers ──────────────────────────────────────────

  async findByUsernameWithPassword(username: string): Promise<UserEntity | null> {
    return this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.username = :username', { username })
      .andWhere('user.deletedAt IS NULL')
      .getOne();
  }

  async findByIdentifierWithPassword(identifier: string): Promise<UserEntity | null> {
    const isEmail = identifier.includes('@');
    return this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where(
        isEmail ? 'user.email = :identifier' : 'user.username = :identifier',
        { identifier },
      )
      .andWhere('user.deletedAt IS NULL')
      .getOne();
  }

  async findByIdWithPassword(id: string): Promise<UserEntity | null> {
    return this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.id = :id', { id })
      .andWhere('user.deletedAt IS NULL')
      .getOne();
  }

  async findByIdWithRefreshToken(id: string): Promise<UserEntity | null> {
    return this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.refreshTokenHash')
      .where('user.id = :id', { id })
      .andWhere('user.deletedAt IS NULL')
      .getOne();
  }

  async setRefreshToken(userId: string, rawToken: string): Promise<void> {
    const hash = await bcrypt.hash(rawToken, 10);
    await this.userRepository.update(userId, { refreshTokenHash: hash });
  }

  async clearRefreshToken(userId: string): Promise<void> {
    await this.userRepository.update(userId, { refreshTokenHash: null });
  }

  // ─── Seed ──────────────────────────────────────────────────

  async hasAdmin(): Promise<boolean> {
    const count = await this.userRepository.count({
      where: { role: UserRole.ADMIN },
    });
    return count > 0;
  }

  async createAdminSeed(
    username: string,
    password: string,
    fullName: string,
  ): Promise<void> {
    const hashed = await bcrypt.hash(password, 10);
    const admin = this.userRepository.create({
      username,
      password: hashed,
      fullName,
      role: UserRole.ADMIN,
      isActive: true,
    });
    await this.userRepository.save(admin);
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  async createFromOtp(data: {
    email: string;
    username: string;
    passwordHash: string;
  }): Promise<UserEntity> {
    const user = this.userRepository.create({
      email: data.email,
      username: data.username,
      password: data.passwordHash,
      fullName: data.username,
      role: UserRole.USER,
      isActive: true,
    });
    return this.userRepository.save(user);
  }

  async resetPassword(userId: string, newPasswordHash: string): Promise<void> {
    await this.userRepository.update(userId, { password: newPasswordHash });
  }
}
