import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class TermQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  categoryId?: string;
}

export class TermSearchQueryDto {
  @ApiPropertyOptional({ description: 'Search query (required)' })
  @IsString()
  q: string;

  @ApiPropertyOptional({
    enum: ['uz', 'ru', 'en', 'kk', 'uzCyrl'],
    description: 'Language to search in. If omitted, searches all languages.',
  })
  @IsOptional()
  @IsIn(['uz', 'ru', 'en', 'kk', 'uzCyrl'])
  lang?: string;

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
