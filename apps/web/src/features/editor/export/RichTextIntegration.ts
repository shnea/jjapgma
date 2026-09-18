import { createContext } from 'react';

/** Consuming apps own authentication, persistence and file metadata. */
export type RichTextIntegration = {
  onChange: (nodeId: string, documentJson: string) => void;
  /** Multipart contains file only; omit category upstream to use default retention. */
  uploadFile: (nodeId: string, body: FormData) => Promise<string>;
};

export const RichTextIntegrationContext = createContext<RichTextIntegration | undefined>(undefined);
