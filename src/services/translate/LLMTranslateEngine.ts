import OpenAI from 'openai';
import { TranslateEngine } from './TranslateEngine';
import { GoogleGenAI } from '@google/genai';

export interface LLMConfig {
  provider?: 'openai' | 'openrouter' | 'deepseek' | 'gemini' | 'custom';
  endpoint: string;
  apiKey: string;
  model: string;
  systemPrompt?: string;
}

export class LLMTranslateEngine implements TranslateEngine {
  id = 'llm';
  name = 'LLM (OpenAI Compatible)';

  private config: LLMConfig;

  constructor(config: LLMConfig) {
    this.config = config;
  }

  private adjustCount(translatedParagraphs: string[], expectedCount: number): string[] {
    if (translatedParagraphs.length === expectedCount) {
      return translatedParagraphs;
    }
    const result = [...translatedParagraphs];
    while (result.length < expectedCount) {
      result.push('');
    }
    return result.slice(0, expectedCount);
  }

  async fetchModels(): Promise<string[]> {
    try {
      if (this.config.provider === 'gemini') {
        const ai = new GoogleGenAI({ apiKey: this.config.apiKey });
        const models = (await ai.models.list()).page;
        return models.map((model: any) => model.name);
      } else {
        const client = new OpenAI({
          baseURL: this.config.endpoint || 'https://api.openai.com/v1',
          apiKey: this.config.apiKey || 'anonymous',
          dangerouslyAllowBrowser: true, // required for React Native client-side
        });
        const models = await client.models.list();
        return models.data.map(model => model.id);
      }
    } catch (e: any) {
      throw new Error(`Failed to fetch models: ${e.message}`);
    }
  }

  async translate(
    texts: string[],
    source: string,
    target: string,
    onProgress?: (progress: number) => void,
  ): Promise<string[]> {
    if (!texts.length) return [];

    const MARKER = '---PARAGRAPH_BREAK---';
    const combinedText = texts.join("\n" + MARKER + "\n");

    const defaultSystemPrompt = 'You are a professional translator. Do NOT add any extra notes or conversational text. Maintain paragraph structural integrity by keeping the exact same ---PARAGRAPH_BREAK--- markers between translated paragraphs.';
    const systemPrompt = (this.config.systemPrompt || defaultSystemPrompt) + `\nTranslate the following text from ${source} to ${target}`;
    const userPrompt = combinedText;

    let i: any;

    try {
      if (!this.config.model) {
        throw new Error('Model is not specified');
      }

      let progress = 0;
      i = setInterval(() => {
        if (Math.random() > 0.5 && progress < 96 && onProgress) {
          onProgress(progress++);
        }
      }, 500);

      let resultText = '';

      if (this.config.provider === 'gemini') {
        const ai = new GoogleGenAI({ apiKey: this.config.apiKey });
        const response = await ai.models.generateContent({
          model: this.config.model,
          contents: userPrompt,
          config: {
            systemInstruction: systemPrompt
          }
        });
        resultText = response.text || '';
        console.log("Gemini Response", response);
      } else {
        const client = new OpenAI({
          baseURL: this.config.endpoint || 'https://api.openai.com/v1',
          apiKey: this.config.apiKey || 'anonymous',
          dangerouslyAllowBrowser: true, // required for React Native client-side
        });
        const response = await client.responses.create({
          model: this.config.model,
          instructions: systemPrompt,
          input: userPrompt,
          store: false,
        });
        resultText = response.output_text;
        console.log("LLM Response", response);
      }

      clearInterval(i);

      const translatedParagraphs = resultText.split(MARKER).map((p: string) => p.trim());

      if (onProgress) {
        onProgress(100);
      }

      return this.adjustCount(translatedParagraphs, texts.length);
    } catch (e: any) {
      clearInterval(i);
      // console.error('LLM Translation failed:', e);
      const message = e?.message || 'Unknown LLM error';
      throw new Error(`LLM Translation failed: ${message}`);
    }
  }
}
