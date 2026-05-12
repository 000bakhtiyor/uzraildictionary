import { CategoryResponseDto } from '../dto/category-response.dto';
import { CategoryEntity } from '../entities/category.entity';

export class CategoryMapper {
  static toResponse(category: CategoryEntity): CategoryResponseDto {
    const dto = new CategoryResponseDto();
    dto.id = category.id;
    dto.name = category.name;
    dto.slug = category.slug;
    dto.description = category.description;
    dto.isActive = category.isActive;
    dto.createdAt = category.createdAt;
    dto.updatedAt = category.updatedAt;
    return dto;
  }

  static toResponseList(categories: CategoryEntity[]): CategoryResponseDto[] {
    return categories.map((c) => CategoryMapper.toResponse(c));
  }
}
