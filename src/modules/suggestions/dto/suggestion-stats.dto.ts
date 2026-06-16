import { ApiProperty } from '@nestjs/swagger';

export class SuggestionStatsDto {
  @ApiProperty() pending: number;
  @ApiProperty() approved: number;
  @ApiProperty() rejected: number;
  @ApiProperty() total: number;
}
