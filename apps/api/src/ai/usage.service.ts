import { ConflictException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { z } from 'zod';
import { Database } from '../database/database.js';
import { hash } from '../auth/crypto.js';
import { parse } from '../common/http.js';

const tokens = z.number().int().min(0).max(1_000_000_000);
export const usageInput = z
  .object({
    complete: z.boolean(),
    calls: z
      .array(
        z
          .object({
            id: z.string().min(1).max(180),
            model: z.string().min(1).max(160).optional(),
            inputTokens: tokens,
            outputTokens: tokens,
            totalTokens: tokens.optional(),
          })
          .strict()
          .refine(
            (v) => v.totalTokens === undefined || v.totalTokens >= v.inputTokens + v.outputTokens,
          ),
      )
      .max(200),
  })
  .strict()
  .refine(
    (v) =>
      new Set(v.calls.map((c) => c.id)).size === v.calls.length &&
      (!v.complete || v.calls.length > 0),
  );

@Injectable()
export class UsageService {
  constructor(@Inject(Database) private readonly db: Database) {}
  async report(id: string, token: string, body: unknown) {
    if (!token || token.length > 200) throw new UnauthorizedException();
    const input = parse(usageInput, body);
    return this.db.transaction(async (db) => {
      const result = await db.query(
        'SELECT complete FROM ai_usage_runs WHERE id=$1 AND report_token_hash=$2 AND expires_at>now() FOR UPDATE',
        [id, hash(token)],
      );
      if (!result.rowCount) throw new UnauthorizedException();
      for (const call of input.calls) {
        const existing = (
          await db.query('SELECT * FROM ai_usage_calls WHERE run_id=$1 AND call_id=$2', [
            id,
            call.id,
          ])
        ).rows[0];
        const total = call.totalTokens ?? call.inputTokens + call.outputTokens;
        if (existing) {
          if (
            Number(existing.input_tokens) !== call.inputTokens ||
            Number(existing.output_tokens) !== call.outputTokens ||
            Number(existing.total_tokens) !== total ||
            existing.model !== (call.model ?? null)
          )
            throw new ConflictException('이미 기록된 호출과 사용량이 다릅니다.');
        } else {
          if (result.rows[0].complete) throw new ConflictException('집계가 완료된 요청입니다.');
          await db.query('INSERT INTO ai_usage_calls VALUES($1,$2,$3,$4,$5,$6)', [
            id,
            call.id,
            call.model ?? null,
            call.inputTokens,
            call.outputTokens,
            total,
          ]);
        }
      }
      const count = (
        await db.query('SELECT count(*)::int AS n FROM ai_usage_calls WHERE run_id=$1', [id])
      ).rows[0].n;
      if (count > 200) throw new ConflictException('호출 수가 허용 범위를 초과했습니다.');
      if (input.complete)
        await db.query('UPDATE ai_usage_runs SET complete=true WHERE id=$1', [id]);
      return { ok: true };
    });
  }
  async list(userId: string, offset: number) {
    // Usage is kept independently of deleted pages/projects. Dates use the account's current KST policy.
    const cte = `WITH usage AS (SELECT r.id,r.created_at,CASE WHEN r.status='running' AND r.created_at<now()-interval '6 minutes' THEN 'failed' ELSE r.status END AS status,r.complete,
      count(c.call_id)::int AS calls,COALESCE(sum(c.input_tokens),0)::float8 AS input_tokens,COALESCE(sum(c.output_tokens),0)::float8 AS output_tokens,COALESCE(sum(c.total_tokens),0)::float8 AS total_tokens,string_agg(DISTINCT c.model, ', ') AS model
      FROM ai_usage_runs r LEFT JOIN ai_usage_calls c ON c.run_id=r.id WHERE r.user_id=$1 GROUP BY r.id)`;
    const summary = (
      await this.db.pool.query(
        cte +
          ` SELECT period,count(*)::int AS requests,count(*) FILTER(WHERE NOT complete)::int AS unknown,COALESCE(sum(input_tokens),0)::float8 AS input_tokens,COALESCE(sum(output_tokens),0)::float8 AS output_tokens,COALESCE(sum(total_tokens),0)::float8 AS total_tokens FROM usage CROSS JOIN (VALUES('today'),('month'),('all')) p(period) WHERE period='all' OR (period='today' AND (created_at AT TIME ZONE 'Asia/Seoul')::date=(now() AT TIME ZONE 'Asia/Seoul')::date) OR (period='month' AND date_trunc('month',created_at AT TIME ZONE 'Asia/Seoul')=date_trunc('month',now() AT TIME ZONE 'Asia/Seoul')) GROUP BY period`,
        [userId],
      )
    ).rows;
    const rows = (
      await this.db.pool.query(
        cte + ' SELECT * FROM usage ORDER BY created_at DESC,id DESC LIMIT 21 OFFSET $2',
        [userId, offset],
      )
    ).rows;
    return { summary, items: rows.slice(0, 20), hasMore: rows.length > 20, timeZone: 'Asia/Seoul' };
  }
}
