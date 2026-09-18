import {
  Body,
  Controller,
  Get,
  Inject,
  Injectable,
  Module,
  NotFoundException,
  Param,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { z } from 'zod';
import type { Response } from 'express';
import { AuthGuard, AuthModule } from '../auth/auth.module.js';
import type { AuthRequest } from '../auth/auth.service.js';
import { Database } from '../database/database.js';
import { config } from '../config.js';
import { parse, uuid } from '../common/http.js';
import { projectAccess } from '../projects/access.js';
import { FileClient, fileIdSchema } from './file-client.js';
import { validateUpload, type UploadFile } from './file-policy.js';
@Injectable()
class UploadGuard implements CanActivate {
  constructor(@Inject(Database) private readonly db: Database) {}
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthRequest>();
    await projectAccess(
      this.db.pool,
      parse(uuid, request.query.projectId),
      request.identity.id,
      true,
    );
    return true;
  }
}
@Controller('api')
@UseGuards(AuthGuard)
class FilesController {
  private readonly client = new FileClient(
    config.FILE_SERVICE_BASE_URL,
    config.FILE_SERVICE_BEARER_TOKEN,
  );
  constructor(@Inject(Database) private readonly db: Database) {}
  @Get('files/config') settings() {
    return { enabled: !!config.FILE_SERVICE_BEARER_TOKEN, maxBytes: config.UPLOAD_MAX_BYTES };
  }
  @Post('files/upload')
  @UseGuards(UploadGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: config.UPLOAD_MAX_BYTES, files: 1, fields: 1, fieldSize: 32, parts: 3 },
    }),
  )
  async upload(
    @Req() request: AuthRequest,
    @Query('projectId') project: string,
    @Body() body: unknown,
    @UploadedFile() file: UploadFile | undefined,
  ) {
    const projectId = parse(uuid, project);
    const { category } = parse(
      z.object({ category: z.enum(['month', 'tmp']).optional() }).strict(),
      body,
    );
    const metadata = validateUpload(file, config.UPLOAD_MAX_BYTES);
    const fileId = await this.client.upload(file!, metadata.name, category);
    await this.db.transaction(async (client) => {
      await projectAccess(client, projectId, request.identity.id, true);
      await client.query(
        'INSERT INTO project_files(project_id,file_id,original_name,mime_type,byte_size,uploaded_by) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(project_id,file_id) DO NOTHING',
        [projectId, fileId, metadata.name, metadata.mimeType, file!.size, request.identity.id],
      );
      await client.query(
        "INSERT INTO audit(user_id,project_id,action,target_id) VALUES($1,$2,'file.upload',$2)",
        [request.identity.id, projectId],
      );
    });
    return { fileId, ...metadata };
  }
  private async reference(projectId: string, fileId: string, userId: string) {
    await projectAccess(this.db.pool, parse(uuid, projectId), userId);
    const id = parse(fileIdSchema, fileId);
    const row = (
      await this.db.pool.query(
        'SELECT file_id FROM project_files WHERE project_id=$1 AND file_id=$2',
        [projectId, id],
      )
    ).rows[0];
    if (!row) throw new NotFoundException('첨부파일을 찾을 수 없습니다.');
    return id;
  }
  @Get('projects/:projectId/files') async list(
    @Req() request: AuthRequest,
    @Param('projectId') projectId: string,
  ) {
    await projectAccess(this.db.pool, parse(uuid, projectId), request.identity.id);
    return (
      await this.db.pool.query(
        'SELECT file_id AS "fileId",original_name AS name,mime_type AS "mimeType" FROM project_files WHERE project_id=$1 ORDER BY created_at,file_id',
        [projectId],
      )
    ).rows;
  }
  @Get('projects/:projectId/files/:fileId/content') async content(
    @Req() request: AuthRequest,
    @Param('projectId') projectId: string,
    @Param('fileId') fileId: string,
    @Res() response: Response,
  ) {
    const id = await this.reference(projectId, fileId, request.identity.id);
    const bytes = await this.client.content(id, config.UPLOAD_MAX_BYTES);
    response
      .set({
        'Content-Type': 'application/octet-stream',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      })
      .send(bytes);
  }
  @Get('templates/:templateId/files/:fileId/content') async templateContent(
    @Req() request: AuthRequest,
    @Param('templateId') templateId: string,
    @Param('fileId') fileId: string,
    @Res() response: Response,
  ) {
    const id = parse(fileIdSchema, fileId);
    const result = await this.db.pool.query(
      'SELECT f.file_id FROM template_files f JOIN personal_templates t ON t.id=f.template_id WHERE t.id=$1 AND t.user_id=$2 AND f.file_id=$3',
      [parse(uuid, templateId), request.identity.id, id],
    );
    if (!result.rowCount) throw new NotFoundException('첨부파일을 찾을 수 없습니다.');
    response
      .set({
        'Content-Type': 'application/octet-stream',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      })
      .send(await this.client.content(id, config.UPLOAD_MAX_BYTES));
  }
  @Get('projects/:projectId/files/:fileId/preview') async preview(
    @Req() request: AuthRequest,
    @Param('projectId') projectId: string,
    @Param('fileId') fileId: string,
  ) {
    return this.client.preview(await this.reference(projectId, fileId, request.identity.id));
  }
  @Get('templates/:templateId/files/:fileId/preview') async templatePreview(
    @Req() request: AuthRequest,
    @Param('templateId') templateId: string,
    @Param('fileId') fileId: string,
  ) {
    const id = parse(fileIdSchema, fileId);
    const result = await this.db.pool.query(
      'SELECT f.file_id FROM template_files f JOIN personal_templates t ON t.id=f.template_id WHERE t.id=$1 AND t.user_id=$2 AND f.file_id=$3',
      [parse(uuid, templateId), request.identity.id, id],
    );
    if (!result.rowCount) throw new NotFoundException('첨부파일을 찾을 수 없습니다.');
    return this.client.preview(id);
  }
  @Get('projects/:projectId/files/:fileId/download') async download(
    @Req() request: AuthRequest,
    @Param('projectId') projectId: string,
    @Param('fileId') fileId: string,
    @Res() response: Response,
  ) {
    response.redirect(
      303,
      this.client.downloadUrl(await this.reference(projectId, fileId, request.identity.id)),
    );
  }
}
@Module({ imports: [AuthModule], controllers: [FilesController], providers: [UploadGuard] })
export class FilesModule {}
