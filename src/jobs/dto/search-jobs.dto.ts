import { Type } from 'class-transformer';
import { IsIn, IsInt, IsNotEmpty, IsString, Max, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SearchJobsDto {
  @ApiProperty({ example: 'deploy' })
  @IsString()
  @IsNotEmpty({ message: 'Search term (q) is required' })
  q!: string;

  @ApiProperty({ enum: ['title', 'status'], example: 'title' })
  @IsString()
  @IsIn(['title', 'status'], {
    message: 'Type must be either "title" or "status"',
  })
  type!: 'title' | 'status';

  @ApiPropertyOptional({ type: 'number', default: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({
    type: 'number',
    default: 100,
    minimum: 1,
    maximum: 100,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  count = 100;
}
