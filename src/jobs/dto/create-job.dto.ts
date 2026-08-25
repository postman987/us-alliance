import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateJobDto {
  @ApiProperty({ example: 'Deploy API' })
  @IsString()
  @IsNotEmpty({ message: 'Title is required' })
  title!: string;

  @ApiProperty({ example: 'Deploy the API to the production environment' })
  @IsString()
  @IsNotEmpty({ message: 'Description is required' })
  description!: string;
}
