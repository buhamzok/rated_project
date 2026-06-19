import type { Env } from '../types';

const TIMEOUT_MS = 30000;

function stripCodeFences(text: string): string {
  if (!text) return '';
  const trimmed = text.trim();
  if (trimmed.startsWith('```')) {
    return trimmed
      .replace(/^```[\w]*\n?/, '')
      .replace(/\n?```$/, '')
      .trim();
  }
  return trimmed;
}

function extractJson(text: string): unknown {
  if (!text) return null;
  const cleaned = stripCodeFences(text);
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]);
    }
    throw new Error(`No JSON object found in: ${cleaned.slice(0, 200)}`);
  }
}

interface ValidationResult {
  valid: boolean;
  reason: string | null;
}

export async function validateArticle(
  env: Env,
  article: { title?: string; content?: string }
): Promise<ValidationResult> {
  const { title, content } = article || {};

  if (!title || !content || content.trim().length < 50) {
    return {
      valid: false,
      reason: 'Article title is empty or content is too short to be a valid news article.',
    };
  }

  const llmApiUrl = env.LLM_API_URL;
  const llmApiKey = env.LLM_API_KEY;
  const llmModel = env.LLM_MODEL || 'deepseek-v4-flash';

  if (!llmApiKey || !llmApiUrl) {
    return {
      valid: true,
      reason: 'LLM check unavailable, forwarded for manual review',
    };
  }

  const systemPrompt = `You are a content gatekeeper for a Ugandan news platform. Your only job is to decide whether the submitted text reads as a genuine, coherent news article (not spam, not gibberish, not empty boilerplate, and not test text like "asdf asdf"). Do NOT judge factual accuracy, political bias, or writing quality. Respond ONLY with a JSON object in this exact format: {"valid": true, "reason": "..."} or {"valid": false, "reason": "..."}.`;

  const userPrompt = `Title: ${title}\n\nContent:\n${content}\n\nIs this a structurally valid news article?`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(llmApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${llmApiKey}`,
      },
      body: JSON.stringify({
        model: llmModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        format: 'json',
        stream: false,
        options: {
          temperature: 0,
          num_predict: 200,
        },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`LLM API returned ${response.status}`);
    }

    const json = (await response.json()) as {
      message?: { content?: string };
      response?: string;
    };
    const raw = json.message?.content || json.response || '';
    const parsed = extractJson(raw) as Record<string, unknown> | null;

    if (!parsed || typeof parsed.valid !== 'boolean') {
      throw new Error('LLM response missing valid boolean');
    }

    return {
      valid: parsed.valid === true,
      reason: typeof parsed.reason === 'string' ? parsed.reason : null,
    };
  } catch (err) {
    clearTimeout(timeout);
    console.error('[LLM Validation] fail-open due to error:', err instanceof Error ? err.message : err);
    return {
      valid: true,
      reason: 'LLM check unavailable, forwarded for manual review',
    };
  }
}
