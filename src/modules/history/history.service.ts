import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReadingHistoryEntity } from './entities/reading-history.entity';
import { ReadingHistoryResponseDto } from './dto/reading-history-response.dto';
import { TermMapper } from '../terms/mappers/term.mapper';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';
import { paginate, getSkip } from '../../common/utils/pagination.util';

@Injectable()
export class HistoryService {
  constructor(
    @InjectRepository(ReadingHistoryEntity)
    private readonly historyRepository: Repository<ReadingHistoryEntity>,
  ) {}

  async track(userId: string, termId: string): Promise<void> {
    await this.historyRepository
      .createQueryBuilder()
      .insert()
      .into(ReadingHistoryEntity)
      .values({ userId, termId, viewsCount: 1 })
      .orUpdate(['viewsCount', 'lastViewedAt'], ['userId', 'termId'], {
        skipUpdateIfNoValuesChanged: false,
      })
      .execute();

    // Increment viewsCount on conflict
    await this.historyRepository
      .createQueryBuilder()
      .update(ReadingHistoryEntity)
      .set({ viewsCount: () => '"viewsCount" + 1' })
      .where('userId = :userId AND termId = :termId', { userId, termId })
      .execute();
  }

  async findAll(
    userId: string,
    query: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<ReadingHistoryResponseDto>> {
    const { page, limit } = query;
    const skip = getSkip(page, limit);

    const [items, total] = await this.historyRepository.findAndCount({
      where: { userId },
      relations: ['term', 'term.category'],
      order: { lastViewedAt: 'DESC' },
      skip,
      take: limit,
    });

    return paginate(items.map((h) => this.toResponse(h)), total, page, limit);
  }

  async clearAll(userId: string): Promise<void> {
    await this.historyRepository.delete({ userId });
  }

  async clearOne(userId: string, termId: string): Promise<void> {
    await this.historyRepository.delete({ userId, termId });
  }

  private toResponse(item: ReadingHistoryEntity): ReadingHistoryResponseDto {
    const dto = new ReadingHistoryResponseDto();
    dto.id = item.id;
    dto.termId = item.termId;
    dto.term = TermMapper.toResponse(item.term);
    dto.viewsCount = item.viewsCount;
    dto.firstViewedAt = item.firstViewedAt;
    dto.lastViewedAt = item.lastViewedAt;
    return dto;
  }
}
