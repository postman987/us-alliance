import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ListJobsDto {
  @ApiPropertyOptional({ type: 'number', default: 1, minimum: 1, example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({
    type: 'number',
    default: 100,
    minimum: 1,
    maximum: 100,
    example: 100,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  count = 100;
}
