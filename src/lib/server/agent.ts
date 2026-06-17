/**
 * Strands Agents SDK orchestration core (SvelteKit server-only).
 */

import {
  Agent,
  Message,
  TextBlock,
  type AgentResult,
  type AgentStreamEvent,
  type ToolResultBlock,
} from '@strands-agents/sdk';
import { OpenAIModel } from '@strands-agents/sdk/models/openai';
import type { Message as ChatMessage, ReasoningStep, ToolType, OpenAIConfig } from '$lib/types';
import { buildStrandsTools } from './strands-tools';

const SYSTEM_PROMPT =
  'You are a highly analytical, autonomous AI specialist powered by the AWS Strands Agents SDK. ' +
  'Your goal is to answer the user thoroughly and factually. ' +
  'You may execute tools in a sequential, multi-step manner when needed. ' +
  'Think step-by-step before calling tools, examine tool results carefully, and loop until you have a grounded final answer. ' +
  'If a tool fails, explain the issue and attempt a reasonable fallback. Do not hallucinate facts.';

function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

function resolveApiKey(config?: OpenAIConfig): string {
  const apiKey = config?.apiKey || process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey === 'MY_OPENAI_API_KEY' || apiKey === 'your_actual_api_key' || apiKey.trim() === '') {
    throw new Error(
      'No valid OPENAI_API_KEY was provided. Please configure your API key in the settings panel or in the server environment.'
    );
  }
  return apiKey;
}

function createStrandsModel(config?: OpenAIConfig): OpenAIModel {
  const apiKey = resolveApiKey(config);
  const baseURL = config?.baseURL || process.env.OPENAI_BASE_URL || 'https://openrouter.ai/api/v1';
  const modelId = config?.model || 'openai/gpt-4o-mini';

  const defaultHeaders: Record<string, string> = {};
  if (baseURL.includes('openrouter.ai')) {
    defaultHeaders['HTTP-Referer'] = process.env.APP_URL || 'https://github.com/xxdxxd/strands-agent';
    defaultHeaders['X-Title'] = 'Strands Agent Demo by Dave Xia';
  }

  return new OpenAIModel({
    api: 'chat',
    modelId,
    temperature: 0.15,
    apiKey,
    clientConfig: {
      baseURL,
      defaultHeaders,
    },
  });
}

function toStrandsHistory(history: ChatMessage[]): Message[] {
  return history.map(
    (item) =>
      new Message({
        role: item.role === 'user' ? 'user' : 'assistant',
        content: [new TextBlock(item.content)],
      })
  );
}

function extractMessageText(message: Message): string {
  return message.content
    .filter((block) => block.type === 'textBlock')
    .map((block) => block.text)
    .join('\n')
    .trim();
}

function formatToolResult(result: ToolResultBlock): string {
  const parts = result.content.map((block) => {
    if (block.type === 'textBlock') return block.text;
    if (block.type === 'jsonBlock') return JSON.stringify(block.json, null, 2);
    return JSON.stringify(block, null, 2);
  });

  if (parts.length > 0) {
    return parts.join('\n');
  }

  if (result.error) {
    return result.error.message;
  }

  return JSON.stringify({ toolUseId: result.toolUseId, status: result.status }, null, 2);
}

type StreamContext = {
  turn: number;
  modelCallStart?: number;
  toolStarts: Map<string, number>;
  toolNames: Map<string, string>;
};

function mapStreamEvent(event: AgentStreamEvent, steps: ReasoningStep[], ctx: StreamContext): void {
  switch (event.type) {
    case 'beforeModelCallEvent':
      ctx.turn += 1;
      ctx.modelCallStart = Date.now();
      steps.push({
        id: generateId(),
        timestamp: Date.now(),
        type: 'thought',
        title: `Strands agent loop - Turn ${ctx.turn}`,
        details: 'Running the Strands Agents SDK model-driven reasoning loop.',
      });
      break;

    case 'modelMessageEvent': {
      const text = extractMessageText(event.message);
      if (text) {
        steps.push({
          id: generateId(),
          timestamp: Date.now(),
          type: 'thought',
          title: `Model response (Turn ${ctx.turn})`,
          details: text,
          elapsedMs: ctx.modelCallStart ? Date.now() - ctx.modelCallStart : undefined,
        });
      }
      break;
    }

    case 'beforeToolCallEvent':
      ctx.toolStarts.set(event.toolUse.toolUseId, Date.now());
      ctx.toolNames.set(event.toolUse.toolUseId, event.toolUse.name);
      steps.push({
        id: generateId(),
        timestamp: Date.now(),
        type: 'tool_call',
        title: `Executing tool: ${event.toolUse.name}`,
        details: `Parameters:\n${JSON.stringify(event.toolUse.input, null, 2)}`,
        toolName: event.toolUse.name,
      });
      break;

    case 'afterToolCallEvent': {
      const startedAt = ctx.toolStarts.get(event.toolUse.toolUseId);
      const elapsedMs = startedAt ? Date.now() - startedAt : undefined;

      if (event.error || event.result.status === 'error') {
        steps.push({
          id: generateId(),
          timestamp: Date.now(),
          type: 'error',
          title: `Tool failure: ${event.toolUse.name}`,
          details: event.error?.message || formatToolResult(event.result),
          toolName: event.toolUse.name,
          elapsedMs,
        });
        break;
      }

      steps.push({
        id: generateId(),
        timestamp: Date.now(),
        type: 'tool_response',
        title: `Tool output: ${event.toolUse.name}`,
        details: formatToolResult(event.result),
        toolName: event.toolUse.name,
        elapsedMs,
      });
      break;
    }

    case 'afterModelCallEvent':
      if (event.error) {
        steps.push({
          id: generateId(),
          timestamp: Date.now(),
          type: 'error',
          title: 'Model call failed',
          details: event.error.message,
        });
      }
      break;
  }
}

async function runStrandsAgent(
  message: string,
  history: ChatMessage[],
  enabledTools: ToolType[],
  openAIConfig?: OpenAIConfig
): Promise<{ answer: string; reasoningSteps: ReasoningStep[] }> {
  const reasoningSteps: ReasoningStep[] = [];
  const startTimer = Date.now();
  const activeModel = openAIConfig?.model || 'openai/gpt-4o-mini';
  const baseURL = openAIConfig?.baseURL || process.env.OPENAI_BASE_URL || 'https://openrouter.ai/api/v1';

  reasoningSteps.push({
    id: generateId(),
    timestamp: Date.now(),
    type: 'thought',
    title: 'Strands Agents SDK initialization',
    details: `Starting Strands agent with model "${activeModel}", base URL "${baseURL}", and tools: [${enabledTools.join(', ') || 'none'}].`,
  });

  const agent = new Agent({
    model: createStrandsModel(openAIConfig),
    tools: buildStrandsTools(enabledTools),
    systemPrompt: SYSTEM_PROMPT,
    messages: toStrandsHistory(history),
    printer: false,
    limits: { turns: 6 },
  });

  const ctx: StreamContext = {
    turn: 0,
    toolStarts: new Map(),
    toolNames: new Map(),
  };

  const stream = agent.stream(message);
  let result: AgentResult | undefined;

  while (true) {
    const next = await stream.next();
    if (next.done) {
      result = next.value;
      break;
    }
    mapStreamEvent(next.value, reasoningSteps, ctx);
  }

  if (!result) {
    throw new Error('Strands agent finished without returning a result.');
  }

  let finalAnswer = extractMessageText(result.lastMessage);

  if (!finalAnswer) {
    if (result.stopReason === 'limitTurns') {
      finalAnswer = 'The Strands agent reached the maximum number of reasoning turns before producing a final answer.';
      reasoningSteps.push({
        id: generateId(),
        timestamp: Date.now(),
        type: 'thought',
        title: 'Turn limit reached',
        details: 'The Strands Agents SDK stopped after the configured turn limit.',
      });
    } else {
      finalAnswer = 'The Strands agent finished, but no final text response was produced.';
    }
  }

  reasoningSteps.push({
    id: generateId(),
    timestamp: Date.now(),
    type: 'thought',
    title: 'Resolution finalised',
    details: `Strands agent completed with stop reason "${result.stopReason}". Total duration: ${Date.now() - startTimer}ms.`,
  });

  return {
    answer: finalAnswer,
    reasoningSteps,
  };
}

/**
 * Runs the multi-step Strands Agents SDK loop for a chat request.
 */
export async function runAgentLoop(
  message: string,
  history: ChatMessage[],
  enabledTools: ToolType[],
  openAIConfig?: OpenAIConfig
): Promise<{ answer: string; reasoningSteps: ReasoningStep[] }> {
  resolveApiKey(openAIConfig);
  return runStrandsAgent(message, history, enabledTools, openAIConfig);
}
