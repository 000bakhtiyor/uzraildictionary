import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SuggestionStatus } from '../../../common/enums/suggestion-status.enum';

export class SuggestionResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() termName: string;
  @ApiProperty() definition: string;
  @ApiPropertyOptional() categoryId: string | null;
  @ApiPropertyOptional() userId: string | null;
  @ApiProperty({ enum: SuggestionStatus }) status: SuggestionStatus;
  @ApiPropertyOptional() adminNote: string | null;
  @ApiPropertyOptional() reviewedBy: string | null;
  @ApiPropertyOptional() reviewedAt: Date | null;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}
