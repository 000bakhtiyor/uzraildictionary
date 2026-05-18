import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { TermEntity } from './entities/term.entity';
import { TermViewEntity } from './entities/term-view.entity';
import { TermRelationEntity } from './entities/term-relation.entity';
import { CreateTermDto } from './dto/create-term.dto';
import { UpdateTermDto } from './dto/update-term.dto';
import { AddRelationDto } from './dto/add-relation.dto';
import { TermQueryDto, TermSearchQueryDto, SEARCHABLE_LANGS } from './dto/term-query.dto';
import { TermResponseDto } from './dto/term-response.dto';
import { TermRelationResponseDto } from './dto/term-relation-response.dto';
import { AutocompleteResponseDto } from './dto/autocomplete-response.dto';
import { TermMapper } from './mappers/term.mapper';
import {
  ConflictException,
  NotFoundException,
} from '../../common/exceptions/base.exception';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';
import { paginate, getSkip } from '../../common/utils/pagination.util';
import { generateSlug } from '../../common/utils/slug.util';
import { RelationType } from '../../common/enums/relation-type.enum';

const FTS_DICT: Record<string, string> = {
  uz: 'simple',
  ru: 'russian',
  en: 'english',
  kk: 'simple',
  uzCyrl: 'simple',
};

const TTL = {
  DAILY: 60 * 60 * 1000,       // 1 hour
  POPULAR: 5 * 60 * 1000,      // 5 min
  TRENDING: 5 * 60 * 1000,     // 5 min
  AUTOCOMPLETE: 2 * 60 * 1000, // 2 min
  ALPHABET: 60 * 60 * 1000,    // 1 hour
};

@Injectable()
export class TermsService {
  constructor(
    @InjectRepository(TermEntity)
    private readonly termRepository: Repository<TermEntity>,
    @InjectRepository(TermViewEntity)
    private readonly termViewRepository: Repository<TermViewEntity>,
    @InjectRepository(TermRelationEntity)
    private readonly relationRepository: Repository<TermRelationEntity>,
    @Inject(CACHE_MANAGER)
    private readonly cache: Cache,
  ) {}

  // ─── CRUD ──────────────────────────────────────────────────

  async create(dto: CreateTermDto): Promise<TermResponseDto> {
    const slug = await this.resolveSlug(dto.slug, dto.term.en);

    const term = this.termRepository.create({
      ...dto,
      slug,
      tags: normalizeTags(dto.tags),
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
    const { page, limit, categoryId, tag } = query;
    const skip = getSkip(page, limit);

    const qb = this.termRepository
      .createQueryBuilder('term')
      .leftJoinAndSelect('term.category', 'category')
      .skip(skip)
      .take(limit);

    if (onlyActive) qb.andWhere('term.isActive = :isActive', { isActive: true });
    if (categoryId) qb.andWhere('term.categoryId = :categoryId', { categoryId });
    if (tag) qb.andWhere(':tag = ANY(term.tags)', { tag: tag.toLowerCase().trim() });

    const [terms, total] = await qb.getManyAndCount();
    return paginate(TermMapper.toResponseList(terms), total, page, limit);
  }

  async search(
    query: TermSearchQueryDto,
    onlyActive = true,
  ): Promise<PaginatedResponseDto<TermResponseDto>> {
    const { q, lang, page, limit, fuzzy } = query;
    const skip = getSkip(page, limit);

    const qb = this.termRepository
      .createQueryBuilder('term')
      .leftJoinAndSelect('term.category', 'category')
      .skip(skip)
      .take(limit);

    if (onlyActive) qb.andWhere('term.isActive = :isActive', { isActive: true });

    const langs = lang ? [lang] : [...SEARCHABLE_LANGS];

    if (fuzzy) {
      const conditions = langs.map((l, i) => {
        const col = safeJsonbKey(l);
        return `word_similarity(:fq${i}, term.term->>'${col}') > 0.3`;
      });
      const params = langs.reduce<Record<string, string>>(
        (acc, _l, i) => ({ ...acc, [`fq${i}`]: q }),
        {},
      );
      qb.andWhere(`(${conditions.join(' OR ')})`, params);
      qb.orderBy(`word_similarity(:orderQ, term.term->>'${safeJsonbKey(langs[0])}')`, 'DESC');
      qb.setParameter('orderQ', q);
    } else {
      if (lang) {
        const col = safeJsonbKey(lang);
        const dict = FTS_DICT[lang];
        qb.andWhere(
          `to_tsvector('${dict}', COALESCE(term.term->>'${col}', '')) @@ plainto_tsquery('${dict}', :ftsQ)`,
          { ftsQ: q },
        );
        qb.orderBy(
          `ts_rank(to_tsvector('${dict}', COALESCE(term.term->>'${col}', '')), plainto_tsquery('${dict}', :rankQ))`,
          'DESC',
        );
        qb.setParameter('rankQ', q);
      } else {
        const vec = buildTsvecExpr();
        qb.andWhere(`${vec} @@ plainto_tsquery('simple', :ftsQ)`, { ftsQ: q });
        qb.orderBy(`ts_rank(${vec}, plainto_tsquery('simple', :rankQ))`, 'DESC');
        qb.setParameter('rankQ', q);
      }
    }

    const [terms, total] = await qb.getManyAndCount();
    return paginate(TermMapper.toResponseList(terms), total, page, limit);
  }

  async findOne(id: string, onlyActive = false): Promise<TermResponseDto> {
    const qb = this.termRepository
      .createQueryBuilder('term')
      .leftJoinAndSelect('term.category', 'category')
      .where('term.id = :id', { id });

    if (onlyActive) qb.andWhere('term.isActive = :isActive', { isActive: true });

    const term = await qb.getOne();
    if (!term) throw new NotFoundException('Term');
    return TermMapper.toResponse(term);
  }

  async findBySlug(slug: string, onlyActive = false): Promise<TermResponseDto> {
    const qb = this.termRepository
      .createQueryBuilder('term')
      .leftJoinAndSelect('term.category', 'category')
      .where('term.slug = :slug', { slug });

    if (onlyActive) qb.andWhere('term.isActive = :isActive', { isActive: true });

    const term = await qb.getOne();
    if (!term) throw new NotFoundException('Term');
    return TermMapper.toResponse(term);
  }

  async update(id: string, dto: UpdateTermDto): Promise<TermResponseDto> {
    const term = await this.termRepository.findOne({ where: { id } });
    if (!term) throw new NotFoundException('Term');

    const updates: Partial<TermEntity> = { ...dto };
    if (dto.tags !== undefined) updates.tags = normalizeTags(dto.tags);
    if (dto.slug !== undefined && dto.slug !== term.slug) {
      updates.slug = await this.resolveSlug(dto.slug, undefined);
    }

    Object.assign(term, updates);
    await this.termRepository.save(term);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const term = await this.termRepository.findOne({ where: { id } });
    if (!term) throw new NotFoundException('Term');
    await this.termRepository.softDelete(id);
  }

  // ─── View + History ────────────────────────────────────────

  async incrementView(id: string): Promise<{ viewCount: number }> {
    const term = await this.termRepository.findOne({ where: { id, isActive: true } });
    if (!term) throw new NotFoundException('Term');

    await Promise.all([
      this.termRepository.increment({ id }, 'viewCount', 1),
      this.termViewRepository.save(this.termViewRepository.create({ termId: id })),
    ]);

    return { viewCount: term.viewCount + 1 };
  }

  // ─── Discovery ─────────────────────────────────────────────

  async getPopular(limit = 10): Promise<TermResponseDto[]> {
    const key = `popular:${limit}`;
    const cached = await this.cache.get<TermResponseDto[]>(key);
    if (cached) return cached;

    const terms = await this.termRepository.find({
      where: { isActive: true },
      order: { viewCount: 'DESC' },
      take: Math.min(limit, 50),
      relations: ['category'],
    });
    const result = TermMapper.toResponseList(terms);
    await this.cache.set(key, result, TTL.POPULAR);
    return result;
  }

  async getTrending(days = 7, limit = 10): Promise<TermResponseDto[]> {
    const key = `trending:${days}:${limit}`;
    const cached = await this.cache.get<TermResponseDto[]>(key);
    if (cached) return cached;

    const since = new Date();
    since.setDate(since.getDate() - days);

    const rows = await this.termViewRepository
      .createQueryBuilder('v')
      .select('v.termId', 'termId')
      .addSelect('COUNT(v.id)', 'cnt')
      .where('v.createdAt >= :since', { since })
      .groupBy('v.termId')
      .orderBy('cnt', 'DESC')
      .limit(Math.min(limit, 50))
      .getRawMany<{ termId: string; cnt: string }>();

    if (rows.length === 0) return [];

    const termIds = rows.map((r) => r.termId);
    const terms = await this.termRepository
      .createQueryBuilder('term')
      .leftJoinAndSelect('term.category', 'category')
      .where('term.id IN (:...ids)', { ids: termIds })
      .andWhere('term.isActive = true')
      .getMany();

    const termMap = new Map(terms.map((t) => [t.id, t]));
    const result = termIds
      .map((id) => termMap.get(id))
      .filter((t): t is TermEntity => !!t)
      .map((t) => TermMapper.toResponse(t));

    await this.cache.set(key, result, TTL.TRENDING);
    return result;
  }

  async getDailyTerm(): Promise<TermResponseDto> {
    const today = new Date().toISOString().split('T')[0];
    const key = `daily:${today}`;
    const cached = await this.cache.get<TermResponseDto>(key);
    if (cached) return cached;

    const term = await this.termRepository
      .createQueryBuilder('term')
      .leftJoinAndSelect('term.category', 'category')
      .where('term.isActive = :isActive', { isActive: true })
      .orderBy(`md5(term.id::text || :today)`, 'ASC')
      .setParameter('today', today)
      .getOne();

    if (!term) throw new NotFoundException('No active terms found');
    const result = TermMapper.toResponse(term);
    await this.cache.set(key, result, TTL.DAILY);
    return result;
  }

  async autocomplete(q: string, lang?: string): Promise<AutocompleteResponseDto[]> {
    const key = `ac:${lang ?? 'all'}:${q.toLowerCase()}`;
    const cached = await this.cache.get<AutocompleteResponseDto[]>(key);
    if (cached) return cached;

    const col = lang ? safeJsonbKey(lang) : 'en';
    const qb = this.termRepository
      .createQueryBuilder('term')
      .select(['term.id', 'term.term', 'term.slug', 'term.categoryId'])
      .where('term.isActive = true')
      .andWhere(`term.term->>'${col}' ILIKE :prefix`, { prefix: `${q}%` })
      .orderBy(`term.term->>'${col}'`, 'ASC')
      .limit(7);

    const terms = await qb.getMany();
    const result: AutocompleteResponseDto[] = terms.map((t) => ({
      id: t.id,
      term: t.term,
      slug: t.slug,
      categoryId: t.categoryId,
    }));

    await this.cache.set(key, result, TTL.AUTOCOMPLETE);
    return result;
  }

  async getAlphabetIndex(lang: string): Promise<Record<string, TermResponseDto[]>> {
    const col = safeJsonbKey(lang);
    const key = `alpha:${lang}`;
    const cached = await this.cache.get<Record<string, TermResponseDto[]>>(key);
    if (cached) return cached;

    const terms = await this.termRepository
      .createQueryBuilder('term')
      .leftJoinAndSelect('term.category', 'category')
      .where('term.isActive = true')
      .andWhere(`term.term->>'${col}' IS NOT NULL`)
      .andWhere(`term.term->>'${col}' != ''`)
      .orderBy(`UPPER(LEFT(term.term->>'${col}', 1))`, 'ASC')
      .addOrderBy(`term.term->>'${col}'`, 'ASC')
      .getMany();

    const grouped = terms.reduce<Record<string, TermResponseDto[]>>((acc, term) => {
      const letter = (term.term[col as keyof typeof term.term] as string || '')[0]
        ?.toUpperCase() ?? '#';
      if (!acc[letter]) acc[letter] = [];
      acc[letter].push(TermMapper.toResponse(term));
      return acc;
    }, {});

    await this.cache.set(key, grouped, TTL.ALPHABET);
    return grouped;
  }

  // ─── Relations ─────────────────────────────────────────────

  async addRelation(fromTermId: string, dto: AddRelationDto): Promise<TermRelationResponseDto> {
    const [from, to] = await Promise.all([
      this.termRepository.findOne({ where: { id: fromTermId } }),
      this.termRepository.findOne({ where: { id: dto.toTermId } }),
    ]);

    if (!from) throw new NotFoundException('Source term');
    if (!to) throw new NotFoundException('Target term');
    if (fromTermId === dto.toTermId) {
      throw new ConflictException('A term cannot relate to itself');
    }

    const existing = await this.relationRepository.findOne({
      where: { fromTermId, toTermId: dto.toTermId, type: dto.type },
    });
    if (existing) throw new ConflictException('This relation already exists');

    const relation = await this.relationRepository.save(
      this.relationRepository.create({ fromTermId, toTermId: dto.toTermId, type: dto.type }),
    );

    return this.toRelationResponse(relation, to);
  }

  async removeRelation(fromTermId: string, relationId: string): Promise<void> {
    const relation = await this.relationRepository.findOne({
      where: { id: relationId, fromTermId },
    });
    if (!relation) throw new NotFoundException('Relation');
    await this.relationRepository.delete(relationId);
  }

  async getRelations(termId: string): Promise<TermRelationResponseDto[]> {
    // Bidirectional: term can be either source or target
    const [outgoing, incoming] = await Promise.all([
      this.relationRepository.find({
        where: { fromTermId: termId },
        relations: ['toTerm'],
      }),
      this.relationRepository.find({
        where: { toTermId: termId },
        relations: ['fromTerm'],
      }),
    ]);

    const out = outgoing.map((r) => this.toRelationResponse(r, r.toTerm));
    const inc = incoming.map((r) => this.toRelationResponse(r, r.fromTerm));
    return [...out, ...inc];
  }

  // ─── Private helpers ───────────────────────────────────────

  private toRelationResponse(relation: TermRelationEntity, term: TermEntity): TermRelationResponseDto {
    return {
      id: relation.id,
      type: relation.type,
      term: { id: term.id, term: term.term, slug: term.slug, categoryId: term.categoryId },
    };
  }

  private async resolveSlug(provided: string | undefined, fallback: string | undefined): Promise<string | null> {
    const raw = provided ?? (fallback ? generateSlug(fallback) : null);
    if (!raw) return null;

    const slug = generateSlug(raw);
    if (!slug) return null;

    const existing = await this.termRepository.findOne({ where: { slug }, withDeleted: true });
    if (existing) throw new ConflictException(`Slug "${slug}" is already taken`);
    return slug;
  }
}

function normalizeTags(tags?: string[]): string[] {
  return (tags ?? []).map((t) => t.toLowerCase().trim());
}

function safeJsonbKey(lang: string): string {
  if (!(SEARCHABLE_LANGS as readonly string[]).includes(lang)) {
    throw new Error(`Invalid lang key: ${lang}`);
  }
  return lang;
}

function buildTsvecExpr(): string {
  return `(
    to_tsvector('simple',   COALESCE(term.term->>'uz',     '')) ||
    to_tsvector('russian',  COALESCE(term.term->>'ru',     '')) ||
    to_tsvector('english',  COALESCE(term.term->>'en',     '')) ||
    to_tsvector('simple',   COALESCE(term.term->>'kk',     '')) ||
    to_tsvector('simple',   COALESCE(term.term->>'uzCyrl', ''))
  )`;
}
