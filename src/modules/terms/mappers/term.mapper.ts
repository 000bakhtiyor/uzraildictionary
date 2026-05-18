import { CategoryMapper } from '../../categories/mappers/category.mapper';
import { TermResponseDto } from '../dto/term-response.dto';
import { TermEntity } from '../entities/term.entity';

export class TermMapper {
  static toResponse(term: TermEntity): TermResponseDto {
    const dto = new TermResponseDto();
    dto.id = term.id;
    dto.term = term.term;
    dto.definition = term.definition;
    dto.categoryId = term.categoryId;
    dto.category = term.category ? CategoryMapper.toResponse(term.category) : null;
    dto.tags = term.tags;
    dto.isAbbreviation = term.isAbbreviation;
    dto.isActive = term.isActive;
    dto.viewCount = term.viewCount;
    dto.slug = term.slug;
    dto.createdAt = term.createdAt;
    dto.updatedAt = term.updatedAt;
    return dto;
  }

  static toResponseList(terms: TermEntity[]): TermResponseDto[] {
    return terms.map((t) => TermMapper.toResponse(t));
  }
}
