import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FavoriteEntity } from './entities/favorite.entity';
import { FavoriteResponseDto } from './dto/favorite-response.dto';
import { TermMapper } from '../terms/mappers/term.mapper';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';
import { paginate, getSkip } from '../../common/utils/pagination.util';
import {
  ConflictException,
  NotFoundException,
} from '../../common/exceptions/base.exception';

@Injectable()
export class FavoritesService {
  constructor(
    @InjectRepository(FavoriteEntity)
    private readonly favoriteRepository: Repository<FavoriteEntity>,
  ) {}

  async add(userId: string, termId: string): Promise<FavoriteResponseDto> {
    const exists = await this.favoriteRepository.findOne({
      where: { userId, termId },
    });

    if (exists) {
      throw new ConflictException('Term is already in favorites');
    }

    const favorite = this.favoriteRepository.create({ userId, termId });
    const saved = await this.favoriteRepository.save(favorite);

    const withRelations = await this.favoriteRepository.findOne({
      where: { id: saved.id },
      relations: ['term', 'term.category'],
    });

    return this.toResponse(withRelations!);
  }

  async remove(userId: string, termId: string): Promise<void> {
    const favorite = await this.favoriteRepository.findOne({
      where: { userId, termId },
    });

    if (!favorite) throw new NotFoundException('Favorite');
    await this.favoriteRepository.delete(favorite.id);
  }

  async findAll(
    userId: string,
    query: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<FavoriteResponseDto>> {
    const { page, limit } = query;
    const skip = getSkip(page, limit);

    const [favorites, total] = await this.favoriteRepository.findAndCount({
      where: { userId },
      relations: ['term', 'term.category'],
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return paginate(favorites.map((f) => this.toResponse(f)), total, page, limit);
  }

  async isFavorite(userId: string, termId: string): Promise<{ isFavorite: boolean }> {
    const exists = await this.favoriteRepository.findOne({
      where: { userId, termId },
    });
    return { isFavorite: !!exists };
  }

  private toResponse(favorite: FavoriteEntity): FavoriteResponseDto {
    const dto = new FavoriteResponseDto();
    dto.id = favorite.id;
    dto.termId = favorite.termId;
    dto.term = TermMapper.toResponse(favorite.term);
    dto.createdAt = favorite.createdAt;
    return dto;
  }
}
