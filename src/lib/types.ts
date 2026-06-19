/**
 * Shared Type Definitions for Strands Agent Chatbot (SvelteKit)
 */

export type ToolType = 'calculator' | 'weather';

export interface ToolDefinition {
  id: ToolType;
  name: string;
  description: string;
  icon: string;
  parameterDescription: string;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  enabledTools: ToolType[];
  messages: Message[];
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
  reasoningSteps?: ReasoningStep[];
}

export interface ReasoningStep {
  id: string;
  timestamp: number;
  type: 'thought' | 'tool_call' | 'tool_response' | 'error';
  title: string;
  details: string; // The text content or JSON representation of inputs/outputs
  toolName?: string;
  elapsedMs?: number;
}

export interface ChatRequest {
  message: string;
  history: Message[];
  enabledTools: ToolType[];
}

export interface ChatResponse {
  answer: string;
  reasoningSteps: ReasoningStep[];
}
