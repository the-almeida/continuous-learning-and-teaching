import { IsOptional, IsString, IsNumber, IsIn, Min } from "class-validator";
import { Type } from "class-transformer";

export class ProductQueryDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  limit?: number;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsIn(["ASC", "DESC", "asc", "desc"])
  order?: string;
}
