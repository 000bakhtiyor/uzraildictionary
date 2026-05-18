import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class TermQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ example: 'diesel', description: 'Filter by tag' })
  @IsOptional()
  @IsString()
  tag?: string;
}

export const SEARCHABLE_LANGS = ['uz', 'ru', 'en', 'kk', 'uzCyrl'] as const;
export type SearchLang = (typeof SEARCHABLE_LANGS)[number];

export class TermSearchQueryDto {
  @ApiProperty({ description: 'Search query (min 1 character)', example: 'lokomotiv' })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  q: string;

  @ApiPropertyOptional({
    enum: SEARCHABLE_LANGS,
    description: 'Language to search in. Omit to search all languages.',
  })
  @IsOptional()
  @IsIn(SEARCHABLE_LANGS)
  lang?: SearchLang;

  @ApiPropertyOptional({
    type: Boolean,
    default: false,
    description: 'Enable fuzzy search (requires pg_trgm extension)',
  })
  @IsOptional()
  @Type(() => Boolean)
  fuzzy?: boolean;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;
}
