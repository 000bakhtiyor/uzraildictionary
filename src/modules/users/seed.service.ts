import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from './users.service';

@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    const hasAdmin = await this.usersService.hasAdmin();
    if (hasAdmin) return;

    const username = this.configService.get<string>('app.adminUsername')!;
    const password = this.configService.get<string>('app.adminPassword')!;
    const fullName = this.configService.get<string>('app.adminFullName')!;

    await this.usersService.createAdminSeed(username, password, fullName);
    this.logger.log(`Admin user "${username}" created via seed`);
  }
}
