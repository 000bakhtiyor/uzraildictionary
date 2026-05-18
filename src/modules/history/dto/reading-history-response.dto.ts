import { ApiProperty } from '@nestjs/swagger';
import { TermResponseDto } from '../../terms/dto/term-response.dto';

export class ReadingHistoryResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  termId: string;

  @ApiProperty({ type: TermResponseDto })
  term: TermResponseDto;

  @ApiProperty()
  viewsCount: number;

  @ApiProperty()
  firstViewedAt: Date;

  @ApiProperty()
  lastViewedAt: Date;
}
