import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateSuggestionDto {
  @ApiPropertyOptional({ example: 'Lokomotiv', description: 'Term name (optional)' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  termName?: string;

  @ApiProperty({ example: 'Poyezdni tortuvchi asosiy harakat birligi...', minLength: 50 })
  @IsString()
  @MinLength(50, { message: 'Definition must be at least 50 characters' })
  @MaxLength(2000)
  definition: string;

  @ApiPropertyOptional({ example: 'uuid-of-category' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;
}
