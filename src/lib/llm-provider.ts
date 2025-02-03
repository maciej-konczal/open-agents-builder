import { openai } from "@ai-sdk/openai";
import { createOllama, ollama } from "ollama-ai-provider";

export function llmProviderSetup() {
    console.log('LLM Setup: ', process.env.LLM_PROVIDER, process.env.LLM_MODEL, process.env.OLLAMA_URL)
    if (process.env.LLM_PROVIDER === 'ollama') {
        const olProvider = createOllama({
            baseURL: process.env.OLLAMA_URL
        });
        return olProvider.chat(process.env.LLM_MODEL || 'gpt-4o');
    } else {
        return openai(process.env.LLM_MODEL || 'gpt-4o');
    }
}