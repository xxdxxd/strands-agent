/**
 * Strands Agents SDK tool definitions for the demo chatbot.
 */

import { tool } from '@strands-agents/sdk';
import { z } from 'zod';
import type { ToolType } from '$lib/types';
import { evaluateMath, fetchWeather } from './tools';

export const calculatorTool = tool({
  name: 'calculator',
  description:
    'Calculates basic mathematical expressions. Supports operands +, -, *, /, brackets and exponents (^). Strictly enter expression string only.',
  inputSchema: z.object({
    expression: z
      .string()
      .describe('Mathematical expression to compute, e.g. "3.5 * (12 + 45)" or "2^4"'),
  }),
  callback: (input) => evaluateMath(input.expression),
});

export const weatherTool = tool({
  name: 'weather',
  description:
    'Retrieves coordinate locations and current Fahrenheit/Celsius temperatures for any worldwide city.',
  inputSchema: z.object({
    city: z.string().describe('Name of the city, e.g. "Seattle" or "Berlin"'),
  }),
  callback: async (input) => fetchWeather(input.city),
});

export function buildStrandsTools(enabledTools: ToolType[]) {
  const tools = [];
  if (enabledTools.includes('calculator')) tools.push(calculatorTool);
  if (enabledTools.includes('weather')) tools.push(weatherTool);
  return tools;
}
