import { envManager } from "claude-context-core";

export interface ContextMcpConfig {
    name: string;
    version: string;
    // Ollama configuration
    ollamaModel: string;
    ollamaHost: string;
    // Vector database configuration
    qdrantUrl: string;
}

// Legacy format (v1) - for backward compatibility
export interface CodebaseSnapshotV1 {
    indexedCodebases: string[];
    indexingCodebases: string[] | Record<string, number>;  // Array (legacy) or Map of codebase path to progress percentage
    lastUpdated: string;
}

// New format (v2) - structured with codebase information

// Base interface for common fields
interface CodebaseInfoBase {
    lastUpdated: string;
}

// Indexing state - when indexing is in progress
export interface CodebaseInfoIndexing extends CodebaseInfoBase {
    status: 'indexing';
    indexingPercentage: number;  // Current progress percentage
}

// Indexed state - when indexing completed successfully
export interface CodebaseInfoIndexed extends CodebaseInfoBase {
    status: 'indexed';
    indexedFiles: number;        // Number of files indexed
    totalChunks: number;         // Total number of chunks generated
    indexStatus: 'completed' | 'limit_reached';  // Status from indexing result
}

// Index failed state - when indexing failed
export interface CodebaseInfoIndexFailed extends CodebaseInfoBase {
    status: 'indexfailed';
    errorMessage: string;        // Error message from the failure
    lastAttemptedPercentage?: number;  // Progress when failure occurred
}

// Union type for all codebase information states
export type CodebaseInfo = CodebaseInfoIndexing | CodebaseInfoIndexed | CodebaseInfoIndexFailed;

export interface CodebaseSnapshotV2 {
    formatVersion: 'v2';
    codebases: Record<string, CodebaseInfo>;  // codebasePath -> CodebaseInfo
    lastUpdated: string;
}

// Union type for all supported formats
export type CodebaseSnapshot = CodebaseSnapshotV1 | CodebaseSnapshotV2;

export function createMcpConfig(): ContextMcpConfig {
    const ollamaModel = envManager.get('OLLAMA_MODEL') || envManager.get('EMBEDDING_MODEL') || 'nomic-embed-text';
    const ollamaHost = envManager.get('OLLAMA_HOST') || 'http://127.0.0.1:11434';
    const qdrantUrl = envManager.get('QDRANT_URL') || 'http://localhost:6333';

    console.log(`[DEBUG] 🔍 Environment Variables Debug:`);
    console.log(`[DEBUG]   OLLAMA_MODEL: ${envManager.get('OLLAMA_MODEL') || 'NOT SET'}`);
    console.log(`[DEBUG]   EMBEDDING_MODEL: ${envManager.get('EMBEDDING_MODEL') || 'NOT SET'}`);
    console.log(`[DEBUG]   OLLAMA_HOST: ${ollamaHost}`);
    console.log(`[DEBUG]   QDRANT_URL: ${qdrantUrl}`);

    const config: ContextMcpConfig = {
        name: envManager.get('MCP_SERVER_NAME') || "Context MCP Server",
        version: envManager.get('MCP_SERVER_VERSION') || "1.0.0",
        ollamaModel,
        ollamaHost,
        qdrantUrl,
    };

    return config;
}

export function logConfigurationSummary(config: ContextMcpConfig): void {
    console.log(`[MCP] 🚀 Starting Context MCP Server`);
    console.log(`[MCP] Configuration Summary:`);
    console.log(`[MCP]   Server: ${config.name} v${config.version}`);
    console.log(`[MCP]   Embedding: Ollama (${config.ollamaModel}) at ${config.ollamaHost}`);
    console.log(`[MCP]   Vector DB: Qdrant at ${config.qdrantUrl}`);
    console.log(`[MCP] 🔧 Initializing server components...`);
}

export function showHelpMessage(): void {
    console.log(`
Context MCP Server

Usage: npx claude-context-mcp [options]

Options:
  --help, -h                          Show this help message

Environment Variables:
  MCP_SERVER_NAME         Server name
  MCP_SERVER_VERSION      Server version

  Ollama Configuration:
  OLLAMA_HOST             Ollama server host (default: http://127.0.0.1:11434)
  OLLAMA_MODEL            Ollama model name (default: nomic-embed-text)
  EMBEDDING_MODEL         Alternative to OLLAMA_MODEL

  Vector Database Configuration:
  QDRANT_URL              Qdrant server URL (default: http://localhost:6333)

Examples:
  # Start MCP server with defaults (Ollama + local Qdrant)
  npx claude-context-mcp

  # Start MCP server with custom Ollama model
  OLLAMA_MODEL=mxbai-embed-large npx claude-context-mcp

  # Start MCP server with custom Qdrant URL
  QDRANT_URL=http://my-qdrant:6333 npx claude-context-mcp
        `);
}
