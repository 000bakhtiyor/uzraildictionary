import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateSuggestionDto {
  @ApiProperty({ example: 'Lokomotiv' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  termName: string;

  @ApiProperty({ example: 'Poyezdni tortuvchi asosiy harakat birligi...' })
  @IsString()
  @IsNotEmpty()
  @MinLength(10, { message: 'Definition must be at least 10 characters' })
  @MaxLength(2000)
  definition: string;

  @ApiPropertyOptional({ example: 'uuid-of-category' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;
}
