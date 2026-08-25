import { IsIn, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

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
}
