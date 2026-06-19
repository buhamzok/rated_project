import type { Env } from '../types';

const TIMEOUT_MS = 30000;

interface RewriteInput {
  title: string;
  summary: string;
  source_name: string;
}

interface RewriteResult {
  title: string;
  content: string;
}

export async function rewriteArticle(
  env: Env,
  { title, summary, source_name }: RewriteInput
): Promise<RewriteResult> {
  if (!title || !summary || summary.trim().split(/\s+/).length < 15) {
    return {
      title,
      content: `${summary || title}\n\nSource: ${source_name}.`,
    };
  }

  const llmApiUrl = env.LLM_API_URL;
  const llmApiKey = env.LLM_API_KEY;
  const llmModel = env.LLM_MODEL || 'deepseek-v4-flash';

  if (!llmApiKey || !llmApiUrl) {
    return {
      title,
      content: `${summary}\n\nSource: ${source_name}.`,
    };
  }

  const systemPrompt = `You are a news rewriter for a Ugandan news aggregation platform. Rewrite the following article into a short original news piece of 150-300 words, in your own words, based ONLY on the provided title and summary. Never invent names, numbers, quotes, or claims not present in the source summary. Always end the piece with a line crediting the original source by name.`;

  const userPrompt = `Source: ${source_name}\nTitle: ${title}\nSummary: ${summary}\n\nWrite a short news article.`;

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
        stream: false,
        options: { temperature: 0.7, num_predict: 500 },
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
    const content = json.message?.content || json.response || '';

    const hasCredit =
      content.toLowerCase().includes('source:') ||
      content.toLowerCase().includes(source_name.toLowerCase());
    const finalContent = hasCredit
      ? content
      : `${content.trim()}\n\nSource: ${source_name}.`;

    return { title, content: finalContent };
  } catch (err) {
    clearTimeout(timeout);
    console.error('[LLM Rewrite] fallback due to error:', err instanceof Error ? err.message : err);
    return { title, content: `${summary}\n\nSource: ${source_name}.` };
  }
}
