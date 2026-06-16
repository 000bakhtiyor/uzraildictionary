import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SuggestionEntity } from './entities/suggestion.entity';
import { TermEntity } from '../terms/entities/term.entity';
import { CreateSuggestionDto } from './dto/create-suggestion.dto';
import { UpdateSuggestionDto } from './dto/update-suggestion.dto';
import { ReviewSuggestionDto } from './dto/review-suggestion.dto';
import { QuerySuggestionsDto } from './dto/query-suggestions.dto';
import { SuggestionResponseDto } from './dto/suggestion-response.dto';
import { SuggestionStatsDto } from './dto/suggestion-stats.dto';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';
import { paginate, getSkip } from '../../common/utils/pagination.util';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '../../common/exceptions/base.exception';
import { SuggestionStatus } from '../../common/enums/suggestion-status.enum';

@Injectable()
export class SuggestionsService {
  constructor(
    @InjectRepository(SuggestionEntity)
    private readonly repo: Repository<SuggestionEntity>,
    @InjectRepository(TermEntity)
    private readonly termRepo: Repository<TermEntity>,
  ) {}

  async create(dto: CreateSuggestionDto, userId?: string): Promise<SuggestionResponseDto> {
    const existing = await this.termRepo
      .createQueryBuilder('t')
      .where(`t.term->>'uz'     ILIKE :name`, { name: dto.termName })
      .orWhere(`t.term->>'ru'     ILIKE :name`)
      .orWhere(`t.term->>'en'     ILIKE :name`)
      .orWhere(`t.term->>'kk'     ILIKE :name`)
      .orWhere(`t.term->>'uzCyrl' ILIKE :name`)
      .andWhere('t.isActive = true')
      .getOne();

    if (existing) {
      throw new ConflictException(`Term "${dto.termName}" already exists in the dictionary`);
    }

    const saved = await this.repo.save(
      this.repo.create({
        termName: dto.termName,
        definition: dto.definition,
        categoryId: dto.categoryId ?? null,
        userId: userId ?? null,
        status: SuggestionStatus.PENDING,
      }),
    );
    return this.toResponse(saved);
  }

  async getStats(): Promise<SuggestionStatsDto> {
    const rows = await this.repo
      .createQueryBuilder('s')
      .select('s.status', 'status')
      .addSelect('COUNT(s.id)', 'count')
      .groupBy('s.status')
      .getRawMany<{ status: SuggestionStatus; count: string }>();

    const map = Object.fromEntries(rows.map((r) => [r.status, Number(r.count)]));
    return {
      pending: map[SuggestionStatus.PENDING] ?? 0,
      approved: map[SuggestionStatus.APPROVED] ?? 0,
      rejected: map[SuggestionStatus.REJECTED] ?? 0,
      total: rows.reduce((sum, r) => sum + Number(r.count), 0),
    };
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

  async findOne(id: string): Promise<SuggestionResponseDto> {
    const suggestion = await this.repo.findOne({ where: { id } });
    if (!suggestion) throw new NotFoundException('Suggestion');
    return this.toResponse(suggestion);
  }

  async findMine(userId: string, query: QuerySuggestionsDto): Promise<PaginatedResponseDto<SuggestionResponseDto>> {
    const { page, limit, status } = query;
    const skip = getSkip(page, limit);

    const qb = this.repo.createQueryBuilder('s')
      .where('s.userId = :userId', { userId })
      .orderBy('s.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (status) qb.andWhere('s.status = :status', { status });

    const [items, total] = await qb.getManyAndCount();
    return paginate(items.map((s) => this.toResponse(s)), total, page, limit);
  }

  async update(id: string, dto: UpdateSuggestionDto): Promise<SuggestionResponseDto> {
    const suggestion = await this.repo.findOne({ where: { id } });
    if (!suggestion) throw new NotFoundException('Suggestion');

    if (suggestion.status === SuggestionStatus.REJECTED) {
      throw new BadRequestException('Rejected suggestions cannot be edited');
    }

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
