const BACKEND_URL = import.meta.env.VITE_GOOEY_SERVER_URL || 'http://localhost:3001';

export interface PineconeConfig {
  apiKey: string;
  indexName: string;
}

export interface EmbeddingResult {
  id: string;
  values: number[];
  metadata: Record<string, any>;
}

export interface QueryResult {
  id: string;
  score: number;
  metadata: Record<string, any>;
}

export async function upsertDocuments(
  companyId: string,
  documents: Array<{
    id: string;
    text: string;
    metadata: Record<string, any>;
  }>
): Promise<void> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/pinecone/upsert`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        companyId,
        documents,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to upsert documents');
    }

    const result = await response.json();
    console.log(result.message);
  } catch (error) {
    console.error('Error upserting documents to Pinecone:', error);
    throw error;
  }
}

export async function queryDocuments(
  companyId: string,
  query: string,
  topK: number = 5
): Promise<Array<{ text: string; score: number; metadata: Record<string, any> }>> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/pinecone/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        companyId,
        query,
        topK,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to query documents');
    }

    const result = await response.json();
    return result.results;
  } catch (error) {
    console.error('Error querying documents from Pinecone:', error);
    return [];
  }
}

export async function deleteDocuments(companyId: string, ids: string[]): Promise<void> {
  console.log('Delete documents not implemented yet');
}

export async function deleteAllCompanyDocuments(companyId: string): Promise<void> {
  console.log('Delete all company documents not implemented yet');
}
