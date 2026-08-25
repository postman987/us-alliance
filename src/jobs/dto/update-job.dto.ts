import { IsOptional, IsString, IsNotEmpty } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateJobDto {
  @ApiPropertyOptional({ example: 'Deploy API' })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({
    example: 'Deploy the API to the production environment',
  })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  description?: string;
}
