export type EmbeddingResult = {
    content: string;
    embedding: number[];
    metadata: any;
  };
  
  export interface VectorStore {
    set: (id: string, value: EmbeddingResult) => Promise<void>;
    entries: () => Promise<[string, EmbeddingResult][]>;
  }
  
  export type GenerateEmbeddings = (content: string) => Promise<number[]>;
  

  /**
 * Use this function to create your own embeddings provider, with different model and API key.
 */
export const openAIEmbeddings = ({
    model = 'text-embedding-ada-002',
    baseUrl = 'https://api.openai.com/v1',
    apiKey = process.env.OPENAI_API_KEY,
  }: {
    model?: string
    baseUrl?: string
    apiKey?: string
  } = {}) => {
    return async (content: string): Promise<number[]> => {
      const response = await fetch(`${baseUrl}/embeddings`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: content,
          model,
          encoding_format: 'float',
        }),
      })
  
      if (!response.ok) {
        const error = await response.json()
        throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`)
      }
  
      const data = await response.json()
      return data.data[0].embedding
    }
  }

  /**
 * In-memory implementation of the VectorStore interface using functions.
 */
export const createInMemoryVectorStore = () => {
    const store = new Map<string, EmbeddingResult>()
  
    const set = async (id: string, value: EmbeddingResult): Promise<void> => {
      store.set(id, value)
    }
  
    const entries = async (): Promise<[string, EmbeddingResult][]> => {
      return Array.from(store.entries())
    }
  
    return {
      set,
      entries,
    }
  }