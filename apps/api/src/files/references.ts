import { BadRequestException } from '@nestjs/common';
import type { PoolClient } from 'pg';
import type { UiNode, UiSpec } from '@jjapgma/ui-spec';
export async function validateFileReferences(client: PoolClient, spec: UiSpec, projectId: string) {
  const files = new Map<string, NonNullable<UiNode['props']['attachment']>>();
  const references: NonNullable<UiNode['props']['attachment']>[] = [];
  function visit(node: UiNode) {
    for (const file of [
      ...(node.props.attachment ? [node.props.attachment] : []),
      ...(node.props.richTextFiles ?? []),
    ]) {
      files.set(file.fileId, file);
      references.push(file);
    }
    node.children.forEach(visit);
  }
  visit(spec.root);
  if (!files.size) return;
  const rows = (
    await client.query(
      'SELECT file_id,original_name,mime_type FROM project_files WHERE project_id=$1 AND file_id=ANY($2::text[])',
      [projectId, [...files.keys()]],
    )
  ).rows;
  if (
    rows.length !== files.size ||
    references.some(
      (file) =>
        !rows.some(
          (row) =>
            row.file_id === file.fileId &&
            row.original_name === file.name &&
            row.mime_type === file.mimeType,
        ),
    )
  )
    throw new BadRequestException('이 프로젝트에 등록한 첨부파일을 사용하세요.');
}
