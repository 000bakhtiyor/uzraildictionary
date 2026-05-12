import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class LocalizedStringDto {
  @ApiProperty({ example: 'Tortish tarkibi' })
  @IsString()
  @IsNotEmpty()
  uz: string;

  @ApiProperty({ example: 'Тяговый состав' })
  @IsString()
  @IsNotEmpty()
  ru: string;

  @ApiProperty({ example: 'Rolling Stock' })
  @IsString()
  @IsNotEmpty()
  en: string;

  @ApiProperty({ example: 'Тарту жылжымалы' })
  @IsString()
  @IsNotEmpty()
  kk: string;

  @ApiPropertyOptional({ example: 'Тортиш таркиби' })
  @IsOptional()
  @IsString()
  uzCyrl?: string;
}

export class CreateCategoryDto {
  @ApiProperty({ type: LocalizedStringDto })
  @IsObject()
  @ValidateNested()
  @Type(() => LocalizedStringDto)
  name: LocalizedStringDto;

  @ApiProperty({ example: 'rolling-stock' })
  @IsString()
  @IsNotEmpty()
  slug: string;

  @ApiPropertyOptional({ type: LocalizedStringDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => LocalizedStringDto)
  description?: LocalizedStringDto;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
