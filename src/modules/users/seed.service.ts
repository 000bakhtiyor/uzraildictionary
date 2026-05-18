import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { UsersService } from './users.service';

@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.enablePgTrgm();
    await this.createFtsIndex();
    await this.seedAdmin();
  }

  private async enablePgTrgm(): Promise<void> {
    try {
      await this.dataSource.query('CREATE EXTENSION IF NOT EXISTS pg_trgm;');
      this.logger.log('pg_trgm extension ready');
    } catch {
      this.logger.warn('Could not enable pg_trgm — fuzzy search unavailable');
    }
  }

  private async createFtsIndex(): Promise<void> {
    try {
      await this.dataSource.query(`
        CREATE INDEX IF NOT EXISTS idx_terms_fts
        ON terms USING GIN ((
          to_tsvector('simple',  COALESCE(term->>'uz',     '')) ||
          to_tsvector('russian', COALESCE(term->>'ru',     '')) ||
          to_tsvector('english', COALESCE(term->>'en',     '')) ||
          to_tsvector('simple',  COALESCE(term->>'kk',     '')) ||
          to_tsvector('simple',  COALESCE(term->>'uzCyrl', ''))
        ));
      `);
      this.logger.log('FTS GIN index ready');
    } catch {
      this.logger.warn('Could not create FTS index');
    }
  }

  private async seedAdmin(): Promise<void> {
    const hasAdmin = await this.usersService.hasAdmin();
    if (hasAdmin) return;

    const username = this.configService.get<string>('app.adminUsername')!;
    const password = this.configService.get<string>('app.adminPassword')!;
    const fullName = this.configService.get<string>('app.adminFullName')!;

    await this.usersService.createAdminSeed(username, password, fullName);
    this.logger.log(`Admin user "${username}" created via seed`);
  }
}
