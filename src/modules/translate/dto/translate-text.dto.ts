import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export const SUPPORTED_LANGS = ['uz', 'uzCyrl', 'kk', 'ru', 'en'] as const;
export type SupportedLang = (typeof SUPPORTED_LANGS)[number];

export class TranslateTextDto {
  @ApiProperty({ example: 'Salom dunyo' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(5000)
  text!: string;

  @ApiPropertyOptional({ enum: SUPPORTED_LANGS, default: 'uz' })
  @IsOptional()
  @IsIn(SUPPORTED_LANGS)
  sourceLang?: SupportedLang;
}