import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UserEntity } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { UserMapper } from './mappers/user.mapper';
import {
  ConflictException,
  NotFoundException,
} from '../../common/exceptions/base.exception';
import { UserRole } from '../../common/enums/user-role.enum';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  async create(dto: CreateUserDto): Promise<UserResponseDto> {
    const existing = await this.userRepository.findOne({
      where: { username: dto.username },
      withDeleted: true,
    });

    if (existing) {
      throw new ConflictException(`Username "${dto.username}" is already taken`);
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

  async findAll(): Promise<UserResponseDto[]> {
    const users = await this.userRepository.find();
    return UserMapper.toResponseList(users);
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
      if (taken) {
        throw new ConflictException(`Username "${dto.username}" is already taken`);
      }
    }

    if (dto.password) {
      dto.password = await bcrypt.hash(dto.password, 10);
    }

    Object.assign(user, dto);
    const saved = await this.userRepository.save(user);
    return UserMapper.toResponse(saved);
  }

  async remove(id: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User');
    await this.userRepository.softDelete(id);
  }

  async findByUsernameWithPassword(username: string): Promise<UserEntity | null> {
    return this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.username = :username', { username })
      .andWhere('user.deletedAt IS NULL')
      .getOne();
  }

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
}
