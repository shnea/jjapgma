import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Controller, Get, Inject, Module, ServiceUnavailableException } from '@nestjs/common';
import { json } from 'express';
import { Database, DatabaseModule } from './database/database.js';
import { AuthModule } from './auth/auth.module.js';
import { ProjectsModule } from './projects/projects.module.js';
import { PagesModule } from './pages/pages.module.js';
import { FilesModule } from './files/files.module.js';
import { SafeErrors } from './common/http.js';
import { SharingModule } from './sharing/sharing.module.js';
import { NotificationsModule } from './notifications/notifications.module.js';
import { TemplatesModule } from './templates/templates.module.js';
import { AiModule } from './ai/ai.module.js';
import { ChatService } from './ai/chat.service.js';
@Controller('api/health')
class HealthController {
  constructor(@Inject(Database) private readonly db: Database) {}
  @Get('live') live() {
    return { status: 'ok' };
  }
  @Get() async ready() {
    try {
      await this.db.pool.query('SELECT 1 FROM schema_migrations LIMIT 1');
      return { status: 'ok' };
    } catch {
      throw new ServiceUnavailableException('서비스를 준비하고 있습니다.');
    }
  }
}
@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    ProjectsModule,
    PagesModule,
    FilesModule,
    SharingModule,
    NotificationsModule,
    TemplatesModule,
    AiModule,
  ],
  controllers: [HealthController],
})
class AppModule {}
const app = await NestFactory.create(AppModule, {
  bodyParser: false,
  logger: ['error', 'warn', 'log'],
});
app.use(json({ limit: '2mb' }));
app.getHttpAdapter().getInstance().disable('x-powered-by');
app.useGlobalFilters(new SafeErrors());
// Persist interrupted AI runs while the database is still available, before Nest destroys providers.
let closing = false;
const shutdown = async () => {
  if (closing) return;
  closing = true;
  try {
    await app.get(ChatService).shutdown();
    await app.close();
  } catch {
    console.error(JSON.stringify({ event: 'shutdown_failed' }));
    process.exitCode = 1;
  }
};
process.once('SIGTERM', () => {
  void shutdown();
});
process.once('SIGINT', () => {
  void shutdown();
});
await app.listen(3000, '0.0.0.0');
