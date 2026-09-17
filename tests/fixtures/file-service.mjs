// Contract fixture only. Never used by development or production Compose.
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
let nextId = 100;
const notifications = new Map();
const uploadedFiles = new Map();
createServer(async (request, response) => {
  if (request.method === 'POST' && request.url === '/ai') {
    if (request.headers.authorization !== 'Bearer isolated-ai-webhook-token-32-characters') {
      response.writeHead(401).end();
      return;
    }
    let body = '';
    for await (const chunk of request) body += chunk;
    const payload = JSON.parse(body);
    const prompt = payload.messages.at(-1).content;
    const emptyReply = [
      '빈 답변 제안 테스트',
      '제안 없는 빈 답변 테스트',
      '빈 답변 이미지 확인 누락 테스트',
      '제안 후 워크플로 오류 테스트',
      '제안 후 HTTP 오류 테스트',
    ].includes(prompt);
    if (payload.messages.at(-1).content === '느린 응답 검증') {
      await new Promise((resolve) => setTimeout(resolve, 5000));
      response
        .writeHead(200, { 'Content-Type': 'application/json' })
        .end(JSON.stringify({ reply: '늦게 도착한 응답' }));
      return;
    }
    if (payload.image) {
      const image = uploadedFiles.get(payload.image.fileId);
      if (
        !image ||
        payload.image.url !== `http://file-service:8080/files/download/${payload.image.fileId}` ||
        payload.image.mimeType !== image.mimeType
      ) {
        response.writeHead(400).end();
        return;
      }
      // Exercise the same public file download n8n uses, without calling a real model.
      const downloaded = await fetch(payload.image.url);
      if (!downloaded.ok || (await downloaded.arrayBuffer()).byteLength !== image.bytes.length) {
        response.writeHead(502).end();
        return;
      }
    }
    if (payload.messages.at(-1).content === '실패 테스트') {
      response.writeHead(503).end();
      return;
    }
    const client = new Client({
      name: 'isolated-n8n-fixture',
      version: '1.0.0',
    });
    try {
      await client.connect(
        new StreamableHTTPClientTransport(new URL(payload.mcp.url), {
          requestInit: {
            headers: {
              Authorization: 'Bearer isolated-ai-mcp-service-token-32-characters',
            },
          },
        }),
      );
      const result = await client.callTool({
        name: 'get_page_spec',
        arguments: { pageId: payload.context.pageId },
      });
      if (result.isError) throw new Error('read failed');
      const page = JSON.parse(result.content[0].text);
      const tools = await client.listTools();
      if (
        payload.messages.at(-1).content === '새 채팅 화면을 그려줘' &&
        tools.tools.some((t) => t.name === 'create_page')
      ) {
        const proposal = await client.callTool({
          name: 'create_page',
          arguments: {
            name: 'AI 채팅 화면',
            summary: '대화 목록, 메시지와 전송 입력창을 조합합니다.',
            operations: [
              {
                op: 'add',
                id: 'chat-layout',
                parentId: 'page-root',
                type: 'container',
                style: { direction: 'row', padding: 0 },
              },
              {
                op: 'add',
                id: 'conversations',
                parentId: 'chat-layout',
                type: 'list',
                props: { items: '디자인 질문\n프로젝트 대화' },
                style: { width: '180px' },
              },
              {
                op: 'add',
                id: 'chat-main',
                parentId: 'chat-layout',
                type: 'card',
                style: { width: '100%' },
              },
              {
                op: 'add',
                id: 'chat-title',
                parentId: 'chat-main',
                type: 'heading',
                props: { text: '팀 대화' },
              },
              {
                op: 'add',
                id: 'chat-message',
                parentId: 'chat-main',
                type: 'text',
                props: { text: '새로운 대화를 시작해 보세요.' },
              },
              {
                op: 'add',
                id: 'composer',
                parentId: 'chat-main',
                type: 'container',
                style: { direction: 'row', padding: 0 },
              },
              {
                op: 'add',
                id: 'message-input',
                parentId: 'composer',
                type: 'input',
                props: { text: '메시지', placeholder: '메시지를 입력하세요' },
              },
              {
                op: 'add',
                id: 'send-message',
                parentId: 'composer',
                type: 'button',
                props: { text: '전송' },
              },
              {
                op: 'update',
                nodeId: 'chat-layout',
                breakpoint: 'mobile',
                style: { direction: 'column' },
              },
              {
                op: 'update',
                nodeId: 'conversations',
                breakpoint: 'mobile',
                style: { hidden: true },
              },
            ],
          },
        });
        if (proposal.isError) throw new Error('page proposal failed');
      } else if (
        prompt !== '제안 없는 빈 답변 테스트' &&
        tools.tools.some((t) => t.name === 'apply_ui_patch')
      ) {
        const proposal = await client.callTool({
          name: 'apply_ui_patch',
          arguments: {
            pageId: page.id,
            baseRevision: page.revision,
            summary: '버튼 하나를 추가합니다.',
            operations: [
              {
                op: 'add',
                parentId: page.spec.root.id,
                id: `ai-${payload.requestId}`,
                type: 'button',
                props: { text: 'AI 생성 버튼' },
              },
            ],
          },
        });
        if (proposal.isError) throw new Error('proposal failed');
      }
      response
        .writeHead(prompt === '제안 후 HTTP 오류 테스트' ? 503 : 200, {
          'Content-Type': 'application/json',
        })
        .end(
          JSON.stringify({
            reply:
              prompt === '제안 후 응답 누락 테스트'
                ? undefined
                : emptyReply
                  ? ' \n '
                  : '화면 구조를 확인했습니다. 변경 제안을 미리보고 적용해 주세요.',
            ...(prompt === '제안 후 워크플로 오류 테스트'
              ? { error: 'fixture model failure' }
              : {}),
            ...(payload.messages.at(-1).content === '사용량 연동 테스트'
              ? {
                  usage: {
                    complete: true,
                    calls: [
                      { id: 'model:0', model: 'fixture/model', inputTokens: 100, outputTokens: 20 },
                      { id: 'model:1', model: 'fixture/model', inputTokens: 80, outputTokens: 10 },
                    ],
                  },
                }
              : {}),
            imageFileId: ['이미지 확인 누락 테스트', '빈 답변 이미지 확인 누락 테스트'].includes(
              prompt,
            )
              ? undefined
              : payload.image?.fileId,
          }),
        );
    } catch {
      response.writeHead(502).end();
    } finally {
      await client.close();
    }
    return;
  }
  if (request.url === '/test/notifications') {
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify([...notifications.values()]));
    return;
  }
  if (request.method === 'POST' && request.url === '/v1/notifications') {
    if (request.headers.authorization !== 'Bearer isolated-notify-test') {
      response.writeHead(401).end();
      return;
    }
    const key = request.headers['idempotency-key'];
    if (!key) {
      response.writeHead(400).end();
      return;
    }
    let body = '';
    for await (const chunk of request) body += chunk;
    const payload = JSON.parse(body);
    if (payload.to.email.startsWith('notify-failure-')) {
      response.writeHead(403).end();
      return;
    }
    const existing = notifications.get(key);
    const value = existing ?? {
      id: randomUUID(),
      status: 'PENDING',
      key,
      payload,
    };
    notifications.set(key, value);
    response.writeHead(existing ? 200 : 202, {
      'Content-Type': 'application/json',
    });
    response.end(JSON.stringify({ id: value.id, status: value.status }));
    return;
  }
  if (request.url === '/health') {
    response.end('ok');
    return;
  }
  if (request.method === 'POST' && request.url === '/files/upload') {
    if (request.headers.authorization !== 'Bearer isolated-file-test') {
      response.writeHead(401).end();
      return;
    }
    try {
      const form = await new Request('http://file-service/files/upload', {
        method: 'POST',
        headers: request.headers,
        body: request,
        duplex: 'half',
      }).formData();
      const file = form.get('file');
      if (!file || form.get('files')) {
        response.writeHead(400).end();
        return;
      }
      response.writeHead(201, { 'Content-Type': 'application/json' });
      const fileId = String(++nextId);
      uploadedFiles.set(fileId, {
        bytes: Buffer.from(await file.arrayBuffer()),
        mimeType: file.type,
        category: form.get('category'),
      });
      response.end(JSON.stringify({ files: [{ fileId }] }));
    } catch {
      response.writeHead(400).end();
    }
    return;
  }
  if (request.url.startsWith('/files/preview/')) {
    const file = uploadedFiles.get(request.url.split('/').at(-1));
    if (file?.mimeType.startsWith('image/')) {
      response.writeHead(200, { 'Content-Type': file.mimeType }).end(file.bytes);
      return;
    }
    response.writeHead(202).end();
    return;
  }
  if (request.url.startsWith('/files/download/')) {
    const file = uploadedFiles.get(request.url.split('/').at(-1));
    if (file) {
      response
        .writeHead(200, {
          'Content-Type': file.mimeType,
          'X-Fixture-Category': file.category ?? 'default',
        })
        .end(file.bytes);
      return;
    }
    response.writeHead(200, { 'Content-Type': 'text/plain' }).end('fixture');
    return;
  }
  response.writeHead(404).end();
}).listen(8080, '0.0.0.0');
