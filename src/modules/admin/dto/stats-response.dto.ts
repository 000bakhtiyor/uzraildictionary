import { ApiProperty } from '@nestjs/swagger';

class ResourceStats {
  @ApiProperty()
  total: number;

  @ApiProperty()
  active: number;
}

export class StatsResponseDto {
  @ApiProperty({ type: ResourceStats })
  users: ResourceStats;

  @ApiProperty({ type: ResourceStats })
  categories: ResourceStats;

  @ApiProperty({ type: ResourceStats })
  terms: ResourceStats;
}
