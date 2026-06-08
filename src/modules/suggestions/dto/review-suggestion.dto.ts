import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { SuggestionStatus } from '../../../common/enums/suggestion-status.enum';

export class ReviewSuggestionDto {
  @ApiProperty({ enum: [SuggestionStatus.APPROVED, SuggestionStatus.REJECTED] })
  @IsEnum([SuggestionStatus.APPROVED, SuggestionStatus.REJECTED])
  status: SuggestionStatus.APPROVED | SuggestionStatus.REJECTED;

  @ApiPropertyOptional({ example: 'Not relevant to railway domain' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  adminNote?: string;
}
