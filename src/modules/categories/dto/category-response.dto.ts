import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LocalizedString } from '../../../common/types/localized-string.type';

export class CategoryResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: LocalizedString;

  @ApiProperty()
  slug: string;

  @ApiPropertyOptional()
  description: LocalizedString | null;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
