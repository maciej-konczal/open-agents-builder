import { createOpenAI, openai } from "@ai-sdk/openai";

export function llmProviderSetup() {
    if (process.env.LLM_PROVIDER === 'ollama') {
        const olProvider = createOpenAI({
            baseURL: process.env.OLLAMA_URL
        });
        return olProvider(process.env.LLM_MODEL || 'llama3.1');        
    } else {
        return openai(process.env.LLM_MODEL || 'gpt-4o');
    }
}