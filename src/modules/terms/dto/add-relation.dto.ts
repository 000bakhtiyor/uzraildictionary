import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsUUID } from 'class-validator';
import { RelationType } from '../../../common/enums/relation-type.enum';

export class AddRelationDto {
  @ApiProperty({ description: 'Target term ID' })
  @IsUUID()
  toTermId: string;

  @ApiProperty({ enum: RelationType })
  @IsEnum(RelationType)
  type: RelationType;
}
