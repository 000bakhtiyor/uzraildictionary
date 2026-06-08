import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SuggestionEntity } from './entities/suggestion.entity';
import { CreateSuggestionDto } from './dto/create-suggestion.dto';
import { UpdateSuggestionDto } from './dto/update-suggestion.dto';
import { ReviewSuggestionDto } from './dto/review-suggestion.dto';
import { QuerySuggestionsDto } from './dto/query-suggestions.dto';
import { SuggestionResponseDto } from './dto/suggestion-response.dto';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';
import { paginate, getSkip } from '../../common/utils/pagination.util';
import { NotFoundException } from '../../common/exceptions/base.exception';
import { SuggestionStatus } from '../../common/enums/suggestion-status.enum';

@Injectable()
export class SuggestionsService {
  constructor(
    @InjectRepository(SuggestionEntity)
    private readonly repo: Repository<SuggestionEntity>,
  ) {}

  async create(dto: CreateSuggestionDto, userId?: string): Promise<SuggestionResponseDto> {
    const saved = await this.repo.save(
      this.repo.create({
        termName: dto.termName ?? null,
        definition: dto.definition,
        categoryId: dto.categoryId ?? null,
        userId: userId ?? null,
        status: SuggestionStatus.PENDING,
      }),
    );
    return this.toResponse(saved);
  }

  async findAll(query: QuerySuggestionsDto): Promise<PaginatedResponseDto<SuggestionResponseDto>> {
    const { page, limit, status } = query;
    const skip = getSkip(page, limit);

    const where = status ? { status } : {};
    const [items, total] = await this.repo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return paginate(items.map((s) => this.toResponse(s)), total, page, limit);
  }

  async update(id: string, dto: UpdateSuggestionDto): Promise<SuggestionResponseDto> {
    const suggestion = await this.repo.findOne({ where: { id } });
    if (!suggestion) throw new NotFoundException('Suggestion');

    if (dto.termName !== undefined) suggestion.termName = dto.termName;
    if (dto.definition !== undefined) suggestion.definition = dto.definition;
    if (dto.categoryId !== undefined) suggestion.categoryId = dto.categoryId;

    return this.toResponse(await this.repo.save(suggestion));
  }

  async review(id: string, dto: ReviewSuggestionDto, reviewedBy: string): Promise<SuggestionResponseDto> {
    const suggestion = await this.repo.findOne({ where: { id } });
    if (!suggestion) throw new NotFoundException('Suggestion');

    suggestion.status = dto.status;
    suggestion.adminNote = dto.adminNote ?? null;
    suggestion.reviewedBy = reviewedBy;
    suggestion.reviewedAt = new Date();

    const saved = await this.repo.save(suggestion);
    return this.toResponse(saved);
  }

  private toResponse(s: SuggestionEntity): SuggestionResponseDto {
    const dto = new SuggestionResponseDto();
    dto.id = s.id;
    dto.termName = s.termName;
    dto.definition = s.definition;
    dto.categoryId = s.categoryId;
    dto.userId = s.userId;
    dto.status = s.status;
    dto.adminNote = s.adminNote;
    dto.reviewedBy = s.reviewedBy;
    dto.reviewedAt = s.reviewedAt;
    dto.createdAt = s.createdAt;
    dto.updatedAt = s.updatedAt;
    return dto;
  }
}
