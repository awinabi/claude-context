import { OllamaEmbedding } from "claude-context-core";
import { ContextMcpConfig } from "./config.js";

export function createEmbeddingInstance(config: ContextMcpConfig): OllamaEmbedding {
    console.log(`[EMBEDDING] Creating Ollama embedding instance...`);
    console.log(`[EMBEDDING] 🔧 Configuring Ollama with model: ${config.ollamaModel}, host: ${config.ollamaHost}`);

    const embedding = new OllamaEmbedding({
        model: config.ollamaModel,
        host: config.ollamaHost,
    });

    console.log(`[EMBEDDING] ✅ Ollama embedding instance created successfully`);
    return embedding;
}

export function logEmbeddingProviderInfo(config: ContextMcpConfig, embedding: OllamaEmbedding): void {
    console.log(`[EMBEDDING] ✅ Successfully initialized Ollama embedding provider`);
    console.log(`[EMBEDDING] Provider details - Model: ${config.ollamaModel}, Dimension: ${embedding.getDimension()}`);
    console.log(`[EMBEDDING] Ollama configuration - Host: ${config.ollamaHost}, Model: ${config.ollamaModel}`);
}
