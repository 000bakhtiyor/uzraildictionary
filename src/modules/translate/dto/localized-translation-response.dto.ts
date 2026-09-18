import { ApiProperty } from '@nestjs/swagger';

export class LocalizedTranslationResponseDto {
  @ApiProperty() uz!: string;
  @ApiProperty() uzCyrl!: string;
  @ApiProperty({ description: 'Qoraqalpoqcha' }) kk!: string;
  @ApiProperty() ru!: string;
  @ApiProperty() en!: string;
}