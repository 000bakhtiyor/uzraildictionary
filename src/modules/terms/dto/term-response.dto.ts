import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LocalizedString } from '../../../common/types/localized-string.type';
import { CategoryResponseDto } from '../../categories/dto/category-response.dto';

export class TermResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  term: LocalizedString;

  @ApiPropertyOptional()
  definition: LocalizedString | null;

  @ApiPropertyOptional()
  categoryId: string | null;

  @ApiPropertyOptional({ type: CategoryResponseDto })
  category: CategoryResponseDto | null;

  @ApiProperty({ type: [String] })
  tags: string[];

  @ApiProperty()
  isAbbreviation: boolean;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  viewCount: number;

  @ApiPropertyOptional()
  slug: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
