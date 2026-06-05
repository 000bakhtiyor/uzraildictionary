import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({ description: 'Reset token received from /auth/forgot-verify' })
  @IsString()
  resetToken: string;

  @ApiProperty({ example: 'newSecret123' })
  @IsString()
  @MinLength(6)
  newPassword: string;

  @ApiProperty({ example: 'newSecret123' })
  @IsString()
  @MinLength(6)
  confirmPassword: string;
}
