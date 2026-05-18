import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LocalizedString } from '../../../common/types/localized-string.type';

export class AutocompleteResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  term: LocalizedString;

  @ApiPropertyOptional()
  slug: string | null;

  @ApiPropertyOptional()
  categoryId: string | null;
}
