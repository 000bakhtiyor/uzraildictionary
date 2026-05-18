import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, ValidateNested } from 'class-validator';
import { CreateTermDto } from '../../terms/dto/create-term.dto';

export class ImportTermsDto {
  @ApiProperty({ type: [CreateTermDto], description: 'Max 500 terms per request' })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => CreateTermDto)
  terms: CreateTermDto[];
}
