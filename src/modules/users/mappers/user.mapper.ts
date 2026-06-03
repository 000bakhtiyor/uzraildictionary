import { UserResponseDto } from '../dto/user-response.dto';
import { UserEntity } from '../entities/user.entity';

export class UserMapper {
  static toResponse(user: UserEntity): UserResponseDto {
    const dto = new UserResponseDto();
    dto.id = user.id;
    dto.fullName = user.fullName;
    dto.username = user.username;
    dto.email = user.email;
    dto.role = user.role;
    dto.isActive = user.isActive;
    dto.createdAt = user.createdAt;
    dto.updatedAt = user.updatedAt;
    return dto;
  }

  static toResponseList(users: UserEntity[]): UserResponseDto[] {
    return users.map((u) => UserMapper.toResponse(u));
  }
}
