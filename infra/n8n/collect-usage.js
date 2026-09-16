// n8n Code node — Run Once for All Items. 실제 사용량만 수집합니다.
const APP_ORIGIN = 'https://jjapgma.shnea.kr';
const reports = [];
const skipped = {};
const skip = (reason) => {
  skipped[reason] = (skipped[reason] ?? 0) + 1;
};
const inputs = $input.all();
if (inputs.at(-1)?.json.nextCursor)
  throw new Error('조회 페이지 제한에 도달했습니다. 최대 페이지 수를 늘려 주세요.');
for (const item of inputs) {
  const executions = Array.isArray(item.json.data) ? item.json.data : [item.json];
  for (const execution of executions) {
    if (!['success', 'error', 'canceled', 'crashed'].includes(execution.status)) continue;
    const age = Date.now() - Date.parse(execution.startedAt);
    if (!Number.isFinite(age) || age < 0 || age > 6 * 86400000) continue;
    const runs = execution.data?.resultData?.runData;
    if (!runs || !Object.keys(runs).length) {
      skip('실행 상세 없음: includeData와 실행 저장 설정 확인');
      continue;
    }
    if (!Array.isArray(execution.workflowData?.nodes)) {
      skip('워크플로 노드 정보 없음');
      continue;
    }
    const webhook = execution.workflowData.nodes.find((n) => n.type === 'n8n-nodes-base.webhook');
    const body = webhook && runs[webhook.name]?.[0]?.data?.main?.[0]?.[0]?.json?.body;
    if (!body || !/^[0-9a-f-]{36}$/i.test(body.requestId ?? '')) {
      skip('짭그마 요청 정보 없음: 앱에서 새 대화 요청 필요');
      continue;
    }
    const url = APP_ORIGIN + '/api/ai/usage/' + body.requestId;
    if (body.usageReport?.url !== url || typeof body.usageReport?.token !== 'string') {
      skip('사용량 보고 정보 누락 또는 앱 주소 불일치');
      continue;
    }
    const calls = [];
    let missing = false;
    let modelRuns = 0;
    for (const node of execution.workflowData.nodes) {
      if (!/\.lmChat/.test(node.type)) continue;
      for (const [runIndex, run] of (runs[node.name] ?? []).entries()) {
        modelRuns++;
        const outputs = run.data?.ai_languageModel ?? run.data?.main;
        const entries = Array.isArray(outputs) ? outputs.flat().filter(Boolean) : [];
        if (!entries.length || run.error) missing = true;
        for (const [itemIndex, entry] of entries.entries()) {
          const json = entry.json ?? {};
          const response = json.response ?? json;
          // tokenUsageEstimate는 추정값이므로 합산하지 않습니다.
          // n8n N8nLlmTracing stores tokenUsage beside response, not inside it.
          const usage =
            json.tokenUsage ??
            response.tokenUsage ??
            response.llmOutput?.tokenUsage ??
            json.usage_metadata ??
            response.usage_metadata;
          const input = usage?.promptTokens ?? usage?.input_tokens ?? usage?.prompt_tokens;
          const output =
            usage?.completionTokens ?? usage?.output_tokens ?? usage?.completion_tokens;
          const total = usage?.totalTokens ?? usage?.total_tokens ?? input + output;
          if (
            ![input, output, total].every(
              (n) => Number.isSafeInteger(n) && n >= 0 && n <= 1000000000,
            ) ||
            total < input + output
          ) {
            missing = true;
            continue;
          }
          const metadata = response.generations?.[0]?.[0];
          const model =
            response.model ??
            response.model_name ??
            metadata?.generationInfo?.model_name ??
            metadata?.message?.response_metadata?.model_name;
          calls.push({
            id: execution.id + ':' + node.id + ':' + runIndex + ':' + itemIndex,
            ...(typeof model === 'string' ? { model: model.slice(0, 160) } : {}),
            inputTokens: input,
            outputTokens: output,
            totalTokens: total,
          });
        }
      }
    }
    if (!modelRuns || !calls.length) {
      skip(
        !modelRuns
          ? 'Chat Model 실행 기록 없음'
          : '실제 토큰 정보 없음: tokenUsageEstimate는 추정치라 제외',
      );
      continue;
    }
    if (calls.length > 200)
      throw new Error('모델 호출이 200개를 넘었습니다. 수집 범위를 확인하세요.');
    reports.push({
      json: { url, token: body.usageReport.token, usage: { complete: !missing, calls } },
    });
  }
}
if (!reports.length && Object.keys(skipped).length) {
  throw new Error(
    '사용량을 추출하지 못했습니다. ' +
      Object.entries(skipped)
        .map(([reason, count]) => `${reason} (${count}건)`)
        .join(' / '),
  );
}
return reports;
