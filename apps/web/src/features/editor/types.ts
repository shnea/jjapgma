import type { UiSpec } from '@jjapgma/ui-spec';
import type { Project } from '../../lib/api';
export type PageSummary = { id: string; name: string; revision: number };
export type Page = PageSummary & { spec: UiSpec; project_id: string; role: Project['role'] };
