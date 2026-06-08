import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CategoryEntity } from './entities/category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoryResponseDto } from './dto/category-response.dto';
import { CategoryMapper } from './mappers/category.mapper';
import { generateSlug } from '../../common/utils/slug.util';
import {
  ConflictException,
  NotFoundException,
} from '../../common/exceptions/base.exception';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(CategoryEntity)
    private readonly categoryRepository: Repository<CategoryEntity>,
  ) {}

  async create(dto: CreateCategoryDto): Promise<CategoryResponseDto> {
    const slug = generateSlug(dto.slug);

    const existing = await this.categoryRepository.findOne({
      where: { slug },
      withDeleted: true,
    });

    if (existing) {
      throw new ConflictException(`Slug "${slug}" is already taken`);
    }

    const category = this.categoryRepository.create({
      ...dto,
      slug,
      isActive: dto.isActive ?? true,
    });

    const saved = await this.categoryRepository.save(category);
    return CategoryMapper.toResponse(saved);
  }

  async findAll(onlyActive = true): Promise<CategoryResponseDto[]> {
    const where = onlyActive ? { isActive: true } : {};
    const categories = await this.categoryRepository.find({ where });
    return CategoryMapper.toResponseList(categories);
  }

  async findOne(id: string, onlyActive = false): Promise<CategoryResponseDto> {
    const where = onlyActive ? { id, isActive: true } : { id };
    const category = await this.categoryRepository.findOne({ where });
    if (!category) throw new NotFoundException('Category');
    return CategoryMapper.toResponse(category);
  }

  async update(id: string, dto: UpdateCategoryDto): Promise<CategoryResponseDto> {
    const category = await this.categoryRepository.findOne({ where: { id } });
    if (!category) throw new NotFoundException('Category');

    if (dto.slug) {
      const slug = generateSlug(dto.slug);
      if (slug !== category.slug) {
        const taken = await this.categoryRepository.findOne({
          where: { slug },
          withDeleted: true,
        });
        if (taken) throw new ConflictException(`Slug "${slug}" is already taken`);
      }
      dto = { ...dto, slug };
    }

    Object.assign(category, dto);
    const saved = await this.categoryRepository.save(category);
    return CategoryMapper.toResponse(saved);
  }

  async remove(id: string): Promise<void> {
    const category = await this.categoryRepository.findOne({ where: { id } });
    if (!category) throw new NotFoundException('Category');
    await this.categoryRepository.softDelete(id);
  }
}
