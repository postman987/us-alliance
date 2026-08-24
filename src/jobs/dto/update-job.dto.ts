import { IsOptional, IsString, IsNotEmpty } from 'class-validator';

export class UpdateJobDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  title?: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  description?: string;
}
