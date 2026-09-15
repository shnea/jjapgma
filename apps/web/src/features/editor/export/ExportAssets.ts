import { createContext } from 'react';
export type ExportAssets = Record<string, { src?: string; download?: string }>;
export const ExportAssetsContext = createContext<ExportAssets | null>(null);
