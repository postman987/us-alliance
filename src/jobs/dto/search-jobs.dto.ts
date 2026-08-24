import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class SearchJobsDto {
  @IsString()
  @IsNotEmpty({ message: 'Search term (q) is required' })
  q?: string;

  @IsString()
  @IsIn(['title', 'status'], {
    message: 'Type must be either "title" or "status"',
  })
  type?: 'title' | 'status';
}
