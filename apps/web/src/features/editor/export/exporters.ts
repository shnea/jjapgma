import type { UiSpec } from '@jjapgma/ui-spec';
import { createStorybookArchive } from './storybookExport';
import type { Page } from '../types';
import { createHtmlArchive } from './htmlExport';

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  // Some Chromium hosts discard a non-ASCII blob filename, including its extension.
  const extension = filename.match(/\.[a-z0-9]+$/i)?.[0] ?? '';
  const stem =
    filename
      .slice(0, filename.length - extension.length)
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'page';
  a.download = 'jjapgma-' + stem + extension;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportToJson(pageName: string, spec: UiSpec) {
  const json = JSON.stringify(spec, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  downloadBlob(blob, `${pageName.trim() || 'page'}.json`);
}

export async function exportToHtml(pageName: string, spec: UiSpec, projectId: string) {
  const archive = await createHtmlArchive(pageName, spec, projectId);
  downloadBlob(
    new Blob([new Uint8Array(archive)], { type: 'application/zip' }),
    `${pageName.trim() || 'page'}-html.zip`,
  );
}

export async function exportToStorybook(
  current: Pick<Page, 'id' | 'project_id' | 'name' | 'spec'>,
) {
  const archive = await createStorybookArchive(current);
  downloadBlob(
    new Blob([new Uint8Array(archive)], { type: 'application/zip' }),
    'project-storybook.zip',
  );
}
