import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TermEntity } from './entities/term.entity';
import { CreateTermDto } from './dto/create-term.dto';
import { UpdateTermDto } from './dto/update-term.dto';
import { TermQueryDto, TermSearchQueryDto } from './dto/term-query.dto';
import { TermResponseDto } from './dto/term-response.dto';
import { TermMapper } from './mappers/term.mapper';
import { NotFoundException } from '../../common/exceptions/base.exception';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';
import { paginate, getSkip } from '../../common/utils/pagination.util';

@Injectable()
export class TermsService {
  constructor(
    @InjectRepository(TermEntity)
    private readonly termRepository: Repository<TermEntity>,
  ) {}

  async create(dto: CreateTermDto): Promise<TermResponseDto> {
    const term = this.termRepository.create({
      ...dto,
      tags: dto.tags ?? [],
      isAbbreviation: dto.isAbbreviation ?? false,
      isActive: dto.isActive ?? true,
    });
    const saved = await this.termRepository.save(term);
    const withRelations = await this.termRepository.findOne({
      where: { id: saved.id },
      relations: ['category'],
    });
    return TermMapper.toResponse(withRelations!);
  }

  async findAll(
    query: TermQueryDto,
    onlyActive = true,
  ): Promise<PaginatedResponseDto<TermResponseDto>> {
    const { page, limit, categoryId } = query;
    const skip = getSkip(page, limit);

    const qb = this.termRepository
      .createQueryBuilder('term')
      .leftJoinAndSelect('term.category', 'category')
      .skip(skip)
      .take(limit);

    if (onlyActive) {
      qb.andWhere('term.isActive = :isActive', { isActive: true });
    }

    if (categoryId) {
      qb.andWhere('term.categoryId = :categoryId', { categoryId });
    }

    const [terms, total] = await qb.getManyAndCount();
    return paginate(TermMapper.toResponseList(terms), total, page, limit);
  }

  async search(
    query: TermSearchQueryDto,
    onlyActive = true,
  ): Promise<PaginatedResponseDto<TermResponseDto>> {
    const { q, lang, page, limit } = query;
    const skip = getSkip(page, limit);
    const searchValue = `%${q}%`;

    const qb = this.termRepository
      .createQueryBuilder('term')
      .leftJoinAndSelect('term.category', 'category')
      .skip(skip)
      .take(limit);

    if (onlyActive) {
      qb.andWhere('term.isActive = :isActive', { isActive: true });
    }

    const langs = lang ? [lang] : ['uz', 'ru', 'en', 'kk', 'uzCyrl'];

    if (langs.length === 1) {
      qb.andWhere(`term.term->>'${langs[0]}' ILIKE :q`, { q: searchValue });
    } else {
      const conditions = langs.map(
        (l, i) => `term.term->>'${l}' ILIKE :q${i}`,
      );
      const params = langs.reduce(
        (acc, _l, i) => ({ ...acc, [`q${i}`]: searchValue }),
        {},
      );
      qb.andWhere(`(${conditions.join(' OR ')})`, params);
    }

    const [terms, total] = await qb.getManyAndCount();
    return paginate(TermMapper.toResponseList(terms), total, page, limit);
  }

  async findOne(id: string, onlyActive = false): Promise<TermResponseDto> {
    const qb = this.termRepository
      .createQueryBuilder('term')
      .leftJoinAndSelect('term.category', 'category')
      .where('term.id = :id', { id });

    if (onlyActive) {
      qb.andWhere('term.isActive = :isActive', { isActive: true });
    }

    const term = await qb.getOne();
    if (!term) throw new NotFoundException('Term');
    return TermMapper.toResponse(term);
  }

  async update(id: string, dto: UpdateTermDto): Promise<TermResponseDto> {
    const term = await this.termRepository.findOne({ where: { id } });
    if (!term) throw new NotFoundException('Term');

    Object.assign(term, dto);
    await this.termRepository.save(term);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const term = await this.termRepository.findOne({ where: { id } });
    if (!term) throw new NotFoundException('Term');
    await this.termRepository.softDelete(id);
  }
}
