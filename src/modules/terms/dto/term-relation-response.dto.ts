import { ApiProperty } from '@nestjs/swagger';
import { RelationType } from '../../../common/enums/relation-type.enum';
import { LocalizedString } from '../../../common/types/localized-string.type';

export class TermSummaryDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  term: LocalizedString;

  @ApiProperty({ nullable: true })
  slug: string | null;

  @ApiProperty({ nullable: true })
  categoryId: string | null;
}

export class TermRelationResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: RelationType })
  type: RelationType;

  @ApiProperty({ type: TermSummaryDto })
  term: TermSummaryDto;
}
