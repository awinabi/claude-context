import { QdrantClient } from '@qdrant/js-client-rest';
import {
    VectorDocument,
    SearchOptions,
    VectorSearchResult,
    VectorDatabase,
    HybridSearchRequest,
    HybridSearchOptions,
    HybridSearchResult,
} from './types';
import * as crypto from 'crypto';

export interface QdrantConfig {
    url?: string;
    apiKey?: string;
}

/**
 * Convert a string ID to a deterministic UUID-like string for Qdrant point IDs.
 * Uses MD5 hash formatted as UUID v4-like structure.
 */
function stringToUuid(id: string): string {
    const hash = crypto.createHash('md5').update(id).digest('hex');
    return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`;
}

/**
 * Parse a Milvus-style filter expression into a Qdrant filter object.
 * Supports: `field in ['val1', 'val2']` patterns.
 */
function parseFilterExpr(filterExpr: string): Record<string, unknown> | undefined {
    if (!filterExpr || filterExpr.trim() === '') return undefined;

    const inMatch = filterExpr.match(/^(\w+)\s+in\s+\[(.+)\]$/i);
    if (inMatch) {
        const field = inMatch[1];
        const values = inMatch[2]
            .split(',')
            .map(v => v.trim().replace(/^['"]|['"]$/g, ''));
        return {
            must: [
                {
                    key: field,
                    match: { any: values },
                },
            ],
        };
    }

    console.warn(`[QdrantDB] Unsupported filter expression: ${filterExpr}`);
    return undefined;
}

export class QdrantVectorDatabase implements VectorDatabase {
    private client: QdrantClient;
    private config: QdrantConfig;

    constructor(config: QdrantConfig) {
        this.config = config;
        const url = config.url || 'http://localhost:6333';
        console.log(`🔌 Connecting to Qdrant at: ${url}`);
        this.client = new QdrantClient({
            url,
            ...(config.apiKey && { apiKey: config.apiKey }),
        });
    }

    async createCollection(collectionName: string, dimension: number, description?: string): Promise<void> {
        console.log(`[QdrantDB] Creating collection '${collectionName}' with dimension ${dimension}`);

        const exists = await this.hasCollection(collectionName);
        if (exists) {
            console.log(`[QdrantDB] Collection '${collectionName}' already exists, skipping creation`);
            return;
        }

        await this.client.createCollection(collectionName, {
            vectors: {
                size: dimension,
                distance: 'Cosine',
            },
        });

        // Create payload indexes for filtering
        await this.client.createPayloadIndex(collectionName, {
            field_name: 'relativePath',
            field_schema: 'keyword',
        });
        await this.client.createPayloadIndex(collectionName, {
            field_name: 'fileExtension',
            field_schema: 'keyword',
        });

        console.log(`[QdrantDB] Collection '${collectionName}' created successfully`);
    }

    async createHybridCollection(collectionName: string, dimension: number, description?: string): Promise<void> {
        // Qdrant local: no built-in BM25 sparse vectors, use dense-only
        await this.createCollection(collectionName, dimension, description);
    }

    async dropCollection(collectionName: string): Promise<void> {
        console.log(`[QdrantDB] Dropping collection '${collectionName}'`);
        try {
            await this.client.deleteCollection(collectionName);
            console.log(`[QdrantDB] Collection '${collectionName}' dropped`);
        } catch (error: any) {
            if (error.status === 404) {
                console.log(`[QdrantDB] Collection '${collectionName}' does not exist`);
                return;
            }
            throw error;
        }
    }

    async hasCollection(collectionName: string): Promise<boolean> {
        try {
            const result = await this.client.collectionExists(collectionName);
            return result.exists;
        } catch {
            return false;
        }
    }

    async listCollections(): Promise<string[]> {
        const result = await this.client.getCollections();
        return result.collections.map(c => c.name);
    }

    async insert(collectionName: string, documents: VectorDocument[]): Promise<void> {
        if (documents.length === 0) return;

        const points = documents.map(doc => ({
            id: stringToUuid(doc.id),
            vector: doc.vector,
            payload: {
                originalId: doc.id,
                content: doc.content,
                relativePath: doc.relativePath,
                startLine: doc.startLine,
                endLine: doc.endLine,
                fileExtension: doc.fileExtension,
                metadata: JSON.stringify(doc.metadata),
            },
        }));

        // Batch in groups of 100
        const batchSize = 100;
        for (let i = 0; i < points.length; i += batchSize) {
            const batch = points.slice(i, i + batchSize);
            await this.client.upsert(collectionName, {
                wait: true,
                points: batch,
            });
        }
    }

    async insertHybrid(collectionName: string, documents: VectorDocument[]): Promise<void> {
        // Same as insert for Qdrant (no sparse vectors)
        await this.insert(collectionName, documents);
    }

    async search(collectionName: string, queryVector: number[], options?: SearchOptions): Promise<VectorSearchResult[]> {
        const topK = options?.topK || 10;

        let filter: Record<string, unknown> | undefined;
        if (options?.filterExpr) {
            filter = parseFilterExpr(options.filterExpr);
        }

        const results = await this.client.search(collectionName, {
            vector: queryVector,
            limit: topK,
            with_payload: true,
            ...(filter && { filter }),
            ...(options?.threshold && { score_threshold: options.threshold }),
        });

        return results.map(result => ({
            document: {
                id: (result.payload as any)?.originalId || result.id.toString(),
                vector: [],
                content: (result.payload as any)?.content || '',
                relativePath: (result.payload as any)?.relativePath || '',
                startLine: (result.payload as any)?.startLine || 0,
                endLine: (result.payload as any)?.endLine || 0,
                fileExtension: (result.payload as any)?.fileExtension || '',
                metadata: JSON.parse((result.payload as any)?.metadata || '{}'),
            },
            score: result.score,
        }));
    }

    async hybridSearch(
        collectionName: string,
        searchRequests: HybridSearchRequest[],
        options?: HybridSearchOptions
    ): Promise<HybridSearchResult[]> {
        // For Qdrant, use the first dense vector request only
        const denseRequest = searchRequests.find(r => Array.isArray(r.data));
        if (!denseRequest || !Array.isArray(denseRequest.data)) {
            return [];
        }

        const topK = options?.limit || denseRequest.limit || 10;

        let filter: Record<string, unknown> | undefined;
        if (options?.filterExpr) {
            filter = parseFilterExpr(options.filterExpr);
        }

        const results = await this.client.search(collectionName, {
            vector: denseRequest.data as number[],
            limit: topK,
            with_payload: true,
            ...(filter && { filter }),
        });

        return results.map(result => ({
            document: {
                id: (result.payload as any)?.originalId || result.id.toString(),
                vector: [],
                content: (result.payload as any)?.content || '',
                relativePath: (result.payload as any)?.relativePath || '',
                startLine: (result.payload as any)?.startLine || 0,
                endLine: (result.payload as any)?.endLine || 0,
                fileExtension: (result.payload as any)?.fileExtension || '',
                metadata: JSON.parse((result.payload as any)?.metadata || '{}'),
            },
            score: result.score,
        }));
    }

    async delete(collectionName: string, ids: string[]): Promise<void> {
        if (ids.length === 0) return;

        const pointIds = ids.map(id => stringToUuid(id));
        await this.client.delete(collectionName, {
            wait: true,
            points: pointIds,
        });
    }

    async query(
        collectionName: string,
        filter: string,
        outputFields: string[],
        limit?: number
    ): Promise<Record<string, any>[]> {
        let qdrantFilter: Record<string, unknown> | undefined;
        if (filter && filter.trim() !== '') {
            qdrantFilter = parseFilterExpr(filter);
        }

        const result = await this.client.scroll(collectionName, {
            limit: limit || 10,
            with_payload: true,
            ...(qdrantFilter && { filter: qdrantFilter }),
        });

        return (result.points || []).map(point => {
            const payload = point.payload as Record<string, any> || {};
            const record: Record<string, any> = {};
            for (const field of outputFields) {
                if (field === 'metadata') {
                    record[field] = payload.metadata || '{}';
                } else {
                    record[field] = payload[field];
                }
            }
            return record;
        });
    }

    async checkCollectionLimit(): Promise<boolean> {
        // No collection limit for local Qdrant
        return true;
    }
}
