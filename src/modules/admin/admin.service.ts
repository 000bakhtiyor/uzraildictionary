import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UserEntity } from '../users/entities/user.entity';
import { CategoryEntity } from '../categories/entities/category.entity';
import { TermEntity } from '../terms/entities/term.entity';
import { StatsResponseDto } from './dto/stats-response.dto';
import { ImportTermsDto } from './dto/import-terms.dto';
import { ImportResultDto } from './dto/import-result.dto';
import { generateSlug } from '../../common/utils/slug.util';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(CategoryEntity)
    private readonly categoryRepository: Repository<CategoryEntity>,
    @InjectRepository(TermEntity)
    private readonly termRepository: Repository<TermEntity>,
  ) {}

  async getStats(): Promise<StatsResponseDto> {
    const [totalUsers, activeUsers, totalCategories, activeCategories, totalTerms, activeTerms] =
      await Promise.all([
        this.userRepository.count(),
        this.userRepository.count({ where: { isActive: true } }),
        this.categoryRepository.count(),
        this.categoryRepository.count({ where: { isActive: true } }),
        this.termRepository.count(),
        this.termRepository.count({ where: { isActive: true } }),
      ]);

    return {
      users: { total: totalUsers, active: activeUsers },
      categories: { total: totalCategories, active: activeCategories },
      terms: { total: totalTerms, active: activeTerms },
    };
  }

  async bulkImport(dto: ImportTermsDto): Promise<ImportResultDto> {
    let imported = 0;
    const errors: ImportResultDto['errors'] = [];

    for (let i = 0; i < dto.terms.length; i++) {
      const item = dto.terms[i];
      try {
        const slug = item.slug
          ? generateSlug(item.slug)
          : item.term?.en
          ? generateSlug(item.term.en)
          : null;

        const term = this.termRepository.create({
          ...item,
          slug,
          tags: (item.tags ?? []).map((t) => t.toLowerCase().trim()),
          isAbbreviation: item.isAbbreviation ?? false,
          isActive: item.isActive ?? true,
        });
        await this.termRepository.save(term);
        imported++;
      } catch (err: unknown) {
        errors.push({
          index: i,
          term: item.term?.en ?? `item[${i}]`,
          message: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    return { imported, failed: errors.length, errors };
  }

  async exportTerms(): Promise<TermEntity[]> {
    return this.termRepository.find({
      relations: ['category'],
      order: { createdAt: 'ASC' },
    });
  }
}

export function termsToCSV(terms: TermEntity[]): string {
  const headers = ['id', 'slug', 'uz', 'ru', 'en', 'kk', 'uzCyrl', 'definition_en', 'category', 'tags', 'isAbbreviation', 'isActive', 'viewCount'];
  const escape = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;

  const rows = terms.map((t) =>
    [
      t.id,
      t.slug ?? '',
      t.term?.uz ?? '',
      t.term?.ru ?? '',
      t.term?.en ?? '',
      t.term?.kk ?? '',
      t.term?.uzCyrl ?? '',
      t.definition?.en ?? '',
      t.category?.name?.en ?? '',
      (t.tags ?? []).join('|'),
      t.isAbbreviation,
      t.isActive,
      t.viewCount,
    ]
      .map(escape)
      .join(','),
  );

  return [headers.join(','), ...rows].join('\n');
}
