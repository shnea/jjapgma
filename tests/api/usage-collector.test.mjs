import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const code = await readFile(new URL('../../infra/n8n/collect-usage.js', import.meta.url), 'utf8');
const collect = new Function('$input', code);
function execution() {
  return {
    id: '123',
    status: 'success',
    startedAt: new Date().toISOString(),
    workflowData: {
      nodes: [
        { id: 'webhook', name: 'Webhook', type: 'n8n-nodes-base.webhook' },
        { id: 'model', name: 'Chat Model', type: '@n8n/n8n-nodes-langchain.lmChatOpenRouter' },
      ],
    },
    data: {
      resultData: {
        runData: {
          Webhook: [
            {
              data: {
                main: [
                  [
                    {
                      json: {
                        body: {
                          requestId: '00000000-0000-4000-8000-000000000000',
                          usageReport: {
                            url: 'https://jjapgma.shnea.kr/api/ai/usage/00000000-0000-4000-8000-000000000000',
                            token: 'test-only-token',
                          },
                        },
                      },
                    },
                  ],
                ],
              },
            },
          ],
          'Chat Model': [model(100, 20), model(80, 10)],
        },
      },
    },
  };
}
function model(input, output) {
  return {
    data: {
      ai_languageModel: [
        [
          {
            json: {
              response: {
                tokenUsage: {
                  promptTokens: input,
                  completionTokens: output,
                  totalTokens: input + output,
                },
                model_name: 'fixture/model',
              },
            },
          },
        ],
      ],
    },
  };
}
const run = (v) => collect({ all: () => [{ json: { data: [v], nextCursor: null } }] });
test('collector retains each real model call once with stable IDs and ignores estimates', () => {
  const data = execution(),
    report = run(data)[0].json;
  assert.equal(report.usage.complete, true);
  assert.equal(report.usage.calls.length, 2);
  assert.equal(
    report.usage.calls.reduce((n, c) => n + c.totalTokens, 0),
    210,
  );
  assert.deepEqual(run(data)[0].json, report);
  data.data.resultData.runData['Chat Model'][1].data.ai_languageModel[0][0].json.response = {
    tokenUsageEstimate: { promptTokens: 999, completionTokens: 888 },
  };
  const partial = run(data)[0].json.usage;
  assert.equal(partial.complete, false);
  assert.equal(partial.calls.length, 1);
  data.status = 'error';
  assert.equal(run(data)[0].json.usage.calls.length, 1);
});
test('collector only sends to the configured app and never reports unfinished/unsupported executions', () => {
  const data = execution();
  data.status = 'running';
  assert.equal(run(data).length, 0);
  data.status = 'success';
  data.data.resultData.runData.Webhook[0].data.main[0][0].json.body.usageReport.url =
    'https://attacker.invalid';
  assert.throws(() => run(data), /앱 주소 불일치/);
  delete data.data;
  assert.throws(() => run(data), /실행 상세 없음/);
});

test('n8n tracing sibling tokenUsage is collected once even with response and estimates present', () => {
  const data = execution();
  for (const entry of data.data.resultData.runData['Chat Model']) {
    const json = entry.data.ai_languageModel[0][0].json;
    json.tokenUsage = json.response.tokenUsage;
    json.tokenUsageEstimate = { promptTokens: 999, completionTokens: 888, totalTokens: 1887 };
    json.response = { generations: [[{ text: 'private answer', generationInfo: {} }]] };
  }
  const report = run(data)[0].json;
  assert.equal(report.usage.complete, true);
  assert.equal(report.usage.calls.length, 2);
  assert.equal(
    report.usage.calls.reduce((n, c) => n + c.totalTokens, 0),
    210,
  );
  assert.ok(!JSON.stringify(report).includes('private answer'));
});

test('empty extraction explains missing data without exposing prompts or report credentials', () => {
  const data = execution();
  for (const entry of data.data.resultData.runData['Chat Model']) {
    entry.data.ai_languageModel[0][0].json = {
      response: { generations: [[{ text: 'private answer' }]] },
      tokenUsageEstimate: { promptTokens: 100, completionTokens: 20, totalTokens: 120 },
    };
  }
  assert.throws(
    () => run(data),
    (error) => {
      assert.match(error.message, /실제 토큰 정보 없음/);
      assert.ok(!error.message.includes('test-only-token'));
      assert.ok(!error.message.includes('private answer'));
      return true;
    },
  );
  delete data.data.resultData.runData['Chat Model'];
  assert.throws(() => run(data), /Chat Model 실행 기록 없음/);
});

test('workflow import contains the same tested collector script', async () => {
  const workflow = JSON.parse(
    await readFile(
      new URL('../../infra/n8n/usage-collector.workflow.json', import.meta.url),
      'utf8',
    ),
  );
  assert.equal(
    workflow.nodes.find((node) => node.name === '모델 사용량 추출').parameters.jsCode,
    code,
  );
});
