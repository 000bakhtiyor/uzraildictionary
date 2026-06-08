import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class UpdateSuggestionDto {
  @ApiPropertyOptional({ example: 'Lokomotiv' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  termName?: string;

  @ApiPropertyOptional({ minLength: 50 })
  @IsOptional()
  @IsString()
  @MinLength(50)
  @MaxLength(2000)
  definition?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  categoryId?: string;
}
