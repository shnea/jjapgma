import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { config } from '../config.js';

@Injectable()
export class NotifyService {
  async send(id: string, payload: unknown): Promise<string | null> {
    if (!config.NOTIFY_API_TOKEN) return null;
    try {
      const response = await fetch(config.NOTIFY_API_URL, {
        method: 'POST',
        redirect: 'error',
        signal: AbortSignal.timeout(10000),
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.NOTIFY_API_TOKEN}`,
          'Idempotency-Key': `notify:email:project-invitation:${id}:created:v1`,
        },
        body: JSON.stringify(payload),
      });
      if (response.status !== 200 && response.status !== 202) return null;
      const parsed = z.object({ id: z.uuid() }).safeParse(await response.json());
      return parsed.success ? parsed.data.id : null;
    } catch {
      return null;
    }
  }
}
