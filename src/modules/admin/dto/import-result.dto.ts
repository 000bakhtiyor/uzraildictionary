import { ApiProperty } from '@nestjs/swagger';

class ImportError {
  @ApiProperty()
  index: number;

  @ApiProperty()
  term: string;

  @ApiProperty()
  message: string;
}

export class ImportResultDto {
  @ApiProperty()
  imported: number;

  @ApiProperty()
  failed: number;

  @ApiProperty({ type: [ImportError] })
  errors: ImportError[];
}
