# Plan: Replace Milvus with Qdrant + Ollama-only + Remove Unused Packages

## Context

The project currently supports 4 embedding providers (OpenAI, VoyageAI, Gemini, Ollama) and uses Milvus/Zilliz Cloud as the vector database, with browser/VSCode extensions. The goal is to simplify to a fully local setup: **Qdrant** (local) for vector storage and **Ollama with nomic-embed-text** for embeddings, keeping only the core + MCP packages for use with Claude Code.

### 0. Rename packages (remove `@zilliz/` scope)
- `packages/core/package.json`: `"name"` → `"claude-context-core"`
- `packages/mcp/package.json`: `"name"` → `"claude-context-mcp"`, dependency `"claude-context-core": "workspace:*"`
- `packages/mcp/src/*.ts`: All imports `from "@zilliz/claude-context-core"` → `from "claude-context-core"`
- `root package.json`: Update all `--filter` references
- `tsconfig.json`: Update path aliases
- `examples/`, `docs/`, `README.md`, `*.md` files: Update package references

## Changes Overview

### 1. Delete unused packages
- Delete `packages/vscode-extension/` entirely
- Delete `packages/chrome-extension/` entirely
- Update `pnpm-workspace.yaml` (no changes needed since it uses `packages/*` glob, but the dirs are gone)

### 2. Replace Milvus with Qdrant in `packages/core/`

**New dependency**: `@qdrant/js-client-rest` (replaces `@zilliz/milvus2-sdk-node`)

**Files to modify/create:**

- **Delete** `src/vectordb/milvus-vectordb.ts`
- **Delete** `src/vectordb/milvus-restful-vectordb.ts`
- **Delete** `src/vectordb/zilliz-utils.ts` (Zilliz Cloud cluster management)
- **Create** `src/vectordb/qdrant-vectordb.ts` — implements `VectorDatabase` interface

The `VectorDatabase` interface in `src/vectordb/types.ts` stays mostly the same. Key changes:
- Remove `COLLECTION_LIMIT_MESSAGE` constant (Zilliz-specific)
- Remove `checkCollectionLimit()` from interface (Zilliz-specific)
- Simplify hybrid search types — Qdrant doesn't have built-in BM25 sparse vectors like Milvus. We'll use **dense-only search** (Qdrant cosine similarity). This is sufficient for local use with nomic-embed-text.

**`QdrantVectorDatabase` implementation:**
- Config: `{ url?: string; apiKey?: string }` defaulting to `http://localhost:6333`
- `createCollection()`: Create Qdrant collection with cosine distance, payload indexes on `relativePath`, `fileExtension`
- `createHybridCollection()`: Same as `createCollection()` (no sparse vectors in Qdrant local mode)
- `insert()` / `insertHybrid()`: Upsert points with vector + payload (content, relativePath, startLine, endLine, fileExtension, metadata)
- `search()` / `hybridSearch()`: Query nearest neighbors with optional filter expressions
- `delete()`: Delete points by IDs
- `query()`: Scroll/filter points by payload conditions
- `hasCollection()`: Check if collection exists
- `listCollections()`: List all collections
- `dropCollection()`: Delete collection
- `checkCollectionLimit()`: Always return `true` (no limit for local Qdrant)

**ID mapping**: Qdrant uses UUID or integer point IDs. We'll hash the string IDs to UUIDs using a deterministic approach (UUID v5 from the string ID).

**Filter expression translation**: The current code passes Milvus filter expressions like `fileExtension in ['.ts', '.py']`. We'll translate these to Qdrant filter format in the implementation.

**Update** `src/vectordb/index.ts` — export `QdrantVectorDatabase` instead of Milvus classes.

### 3. Strip to Ollama-only in `packages/core/`

**Delete:**
- `src/embedding/openai-embedding.ts`
- `src/embedding/voyageai-embedding.ts`
- `src/embedding/gemini-embedding.ts`

**Keep:**
- `src/embedding/base-embedding.ts` (abstract base class)
- `src/embedding/ollama-embedding.ts` (unchanged, already works well)

**Update** `src/embedding/index.ts` — only export `Embedding`, `EmbeddingVector`, `OllamaEmbedding`.

**Remove dependencies from `packages/core/package.json`:**
- `@google/genai`
- `@zilliz/milvus2-sdk-node`
- `faiss-node`
- `openai`
- `voyageai`

**Add dependency:**
- `@qdrant/js-client-rest`

### 4. Update `packages/core/src/context.ts`

- Remove `OpenAIEmbedding` import (default fallback) — default to `OllamaEmbedding` with `nomic-embed-text`
- Remove `COLLECTION_LIMIT_MESSAGE` export/references
- `getIsHybrid()` — hardcode to `false` (no hybrid/BM25 with Qdrant local). Collection names become `code_chunks_<hash>`.
- Remove hybrid-specific code paths in `indexCodebase()` and `semanticSearch()`

### 5. Update `packages/mcp/src/`

**`config.ts`:**
- Remove all provider-specific config (OpenAI, VoyageAI, Gemini API keys/URLs)
- Simplify `ContextMcpConfig` to: `{ name, version, ollamaHost?, ollamaModel?, qdrantUrl? }`
- Env vars: `OLLAMA_HOST`, `OLLAMA_MODEL` (or `EMBEDDING_MODEL`), `QDRANT_URL`
- Remove `getDefaultModelForProvider()` multi-provider logic — default model is `nomic-embed-text`
- Simplify `showHelpMessage()` and `logConfigurationSummary()`

**`embedding.ts`:**
- Remove all provider cases except Ollama
- `createEmbeddingInstance()` just creates `OllamaEmbedding`
- Simplify `logEmbeddingProviderInfo()`

**`index.ts`:**
- Import `QdrantVectorDatabase` instead of `MilvusVectorDatabase`
- Instantiate with `{ url: config.qdrantUrl }` defaulting to `http://localhost:6333`

**`handlers.ts`:**
- Remove `syncIndexedCodebasesFromCloud()` method (Zilliz Cloud-specific)
- Remove `COLLECTION_LIMIT_MESSAGE` checks and related error handling
- Remove cloud sync call from `handleIndexCodebase()` and `handleSearchCode()`

**`sync.ts`:**
- Remove cloud-related error handling (`Failed to query Milvus` checks)
- Keep the periodic re-index logic (Merkle tree based) — still useful

### 6. Update `packages/core/src/index.ts`
- Exports remain the same structure, just fewer classes

### 7. Update `packages/mcp/package.json`
- Remove `start:with-env` script referencing OPENAI_API_KEY

### 8. Update root `pnpm-workspace.yaml`
- Remove `faiss-node` from `ignoredBuiltDependencies` (no longer needed)

## Files Summary

| Action | File |
|--------|------|
| DELETE dir | `packages/vscode-extension/` |
| DELETE dir | `packages/chrome-extension/` |
| DELETE | `packages/core/src/vectordb/milvus-vectordb.ts` |
| DELETE | `packages/core/src/vectordb/milvus-restful-vectordb.ts` |
| DELETE | `packages/core/src/vectordb/zilliz-utils.ts` |
| DELETE | `packages/core/src/embedding/openai-embedding.ts` |
| DELETE | `packages/core/src/embedding/voyageai-embedding.ts` |
| DELETE | `packages/core/src/embedding/gemini-embedding.ts` |
| CREATE | `packages/core/src/vectordb/qdrant-vectordb.ts` |
| MODIFY | `packages/core/src/vectordb/types.ts` |
| MODIFY | `packages/core/src/vectordb/index.ts` |
| MODIFY | `packages/core/src/embedding/index.ts` |
| MODIFY | `packages/core/src/context.ts` |
| MODIFY | `packages/core/src/index.ts` |
| MODIFY | `packages/core/package.json` |
| MODIFY | `packages/mcp/src/config.ts` |
| MODIFY | `packages/mcp/src/embedding.ts` |
| MODIFY | `packages/mcp/src/index.ts` |
| MODIFY | `packages/mcp/src/handlers.ts` |
| MODIFY | `packages/mcp/src/sync.ts` |
| MODIFY | `packages/mcp/package.json` |
| MODIFY | `pnpm-workspace.yaml` |

## Verification

1. `pnpm install` — ensure dependencies resolve
2. `pnpm build` — ensure TypeScript compiles cleanly
3. Start local Qdrant: `docker run -p 6333:6333 qdrant/qdrant`
4. Start local Ollama with model: `ollama pull nomic-embed-text`
5. Run MCP server: `QDRANT_URL=http://localhost:6333 pnpm --filter claude-context-mcp start`
6. Test `index_codebase` tool with a small directory
7. Test `search_code` tool with a query
8. Test `clear_index` tool
9. Test `get_indexing_status` tool
