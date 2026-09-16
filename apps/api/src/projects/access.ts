import { ForbiddenException, NotFoundException } from '@nestjs/common';
import type { Pool, PoolClient } from 'pg';
export async function projectAccess(
  db: Pool | PoolClient,
  projectId: string,
  userId: string,
  write = false,
) {
  const result = await db.query(
    'SELECT role FROM members WHERE project_id=$1 AND user_id=$2 FOR SHARE',
    [projectId, userId],
  );
  if (!result.rowCount) throw new NotFoundException('프로젝트를 찾을 수 없습니다.');
  const role = result.rows[0].role as 'OWNER' | 'EDITOR' | 'VIEWER';
  if (write && role === 'VIEWER') throw new ForbiddenException('편집 권한이 필요합니다.');
  return role;
}
export async function ownerAccess(db: Pool | PoolClient, projectId: string, userId: string) {
  const role = await projectAccess(db, projectId, userId);
  if (role !== 'OWNER')
    throw new ForbiddenException('프로젝트 소유자만 공유를 관리할 수 있습니다.');
}
