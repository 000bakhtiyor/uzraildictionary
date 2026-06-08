import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LocalizedString } from '../../../common/types/localized-string.type';

export class CategoryResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: LocalizedString;

  @ApiPropertyOptional()
  slug: string | null;

  @ApiPropertyOptional()
  description: LocalizedString | null;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
