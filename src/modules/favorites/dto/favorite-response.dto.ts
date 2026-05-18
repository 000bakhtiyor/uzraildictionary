import { ApiProperty } from '@nestjs/swagger';
import { TermResponseDto } from '../../terms/dto/term-response.dto';

export class FavoriteResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  termId: string;

  @ApiProperty({ type: TermResponseDto })
  term: TermResponseDto;

  @ApiProperty()
  createdAt: Date;
}
