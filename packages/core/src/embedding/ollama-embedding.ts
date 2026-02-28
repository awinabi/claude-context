import { Embedding, EmbeddingVector } from './base-embedding';

export interface OllamaEmbeddingConfig {
    model: string;
    host?: string;
    fetch?: any;
    keepAlive?: string | number;
    options?: Record<string, any>;
    dimension?: number;
    maxTokens?: number;
}

export class OllamaEmbedding extends Embedding {
    private host: string;
    private config: OllamaEmbeddingConfig;
    private dimension: number = 768;
    private dimensionDetected: boolean = false;
    protected maxTokens: number = 2048;

    constructor(config: OllamaEmbeddingConfig) {
        super();
        this.config = config;
        this.host = (config.host || 'http://127.0.0.1:11434').replace(/\/$/, '');

        if (config.dimension) {
            this.dimension = config.dimension;
            this.dimensionDetected = true;
        }

        if (config.maxTokens) {
            this.maxTokens = config.maxTokens;
        } else {
            this.setDefaultMaxTokensForModel(config.model);
        }
    }

    private setDefaultMaxTokensForModel(model: string): void {
        if (model?.includes('nomic-embed-text')) {
            this.maxTokens = 8192;
        } else if (model?.includes('snowflake-arctic-embed')) {
            this.maxTokens = 8192;
        } else {
            this.maxTokens = 2048;
        }
    }

    /**
     * Call Ollama embed API directly via HTTP to avoid ollama npm package proxy issues.
     */
    private async callEmbedApi(input: string | string[]): Promise<number[][]> {
        const body: any = {
            model: this.config.model,
            input,
        };
        if (this.config.keepAlive && this.config.keepAlive !== '') {
            body.keep_alive = this.config.keepAlive;
        }
        if (this.config.options) {
            body.options = this.config.options;
        }

        const response = await fetch(`${this.host}/api/embed`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`Ollama API error ${response.status}: ${text}`);
        }

        const data = await response.json() as { embeddings: number[][] };
        if (!data.embeddings || !Array.isArray(data.embeddings)) {
            throw new Error('Ollama API returned invalid response');
        }
        return data.embeddings;
    }

    async embed(text: string): Promise<EmbeddingVector> {
        const processedText = this.preprocessText(text);

        if (!this.dimensionDetected && !this.config.dimension) {
            this.dimension = await this.detectDimension();
            this.dimensionDetected = true;
            console.log(`[OllamaEmbedding] 📏 Detected embedding dimension: ${this.dimension} for model: ${this.config.model}`);
        }

        const embeddings = await this.callEmbedApi(processedText);

        return {
            vector: embeddings[0],
            dimension: this.dimension
        };
    }

    async embedBatch(texts: string[]): Promise<EmbeddingVector[]> {
        const processedTexts = this.preprocessTexts(texts);

        if (!this.dimensionDetected && !this.config.dimension) {
            this.dimension = await this.detectDimension();
            this.dimensionDetected = true;
            console.log(`[OllamaEmbedding] 📏 Detected embedding dimension: ${this.dimension} for model: ${this.config.model}`);
        }

        // Process individually with retry to handle transient Ollama errors
        const MAX_RETRIES = 3;
        const allEmbeddings: EmbeddingVector[] = [];

        for (const text of processedTexts) {
            let lastError: Error | null = null;
            for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
                try {
                    const embeddings = await this.callEmbedApi(text);
                    allEmbeddings.push({
                        vector: embeddings[0],
                        dimension: this.dimension
                    });
                    lastError = null;
                    break;
                } catch (error: any) {
                    lastError = error;
                    if (attempt < MAX_RETRIES - 1) {
                        const delay = 1000 * (attempt + 1);
                        console.warn(`[OllamaEmbedding] Embed attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
                        await new Promise(resolve => setTimeout(resolve, delay));
                    }
                }
            }
            if (lastError) {
                throw lastError;
            }
        }

        return allEmbeddings;
    }

    getDimension(): number {
        return this.dimension;
    }

    getProvider(): string {
        return 'Ollama';
    }

    async setModel(model: string): Promise<void> {
        this.config.model = model;
        this.dimensionDetected = false;
        this.setDefaultMaxTokensForModel(model);
        if (!this.config.dimension) {
            this.dimension = await this.detectDimension();
            this.dimensionDetected = true;
            console.log(`[OllamaEmbedding] 📏 Detected embedding dimension: ${this.dimension} for model: ${this.config.model}`);
        }
    }

    setHost(host: string): void {
        this.config.host = host;
        this.host = host.replace(/\/$/, '');
    }

    setKeepAlive(keepAlive: string | number): void {
        this.config.keepAlive = keepAlive;
    }

    setOptions(options: Record<string, any>): void {
        this.config.options = options;
    }

    setMaxTokens(maxTokens: number): void {
        this.config.maxTokens = maxTokens;
        this.maxTokens = maxTokens;
    }

    async detectDimension(testText: string = "test"): Promise<number> {
        console.log(`[OllamaEmbedding] Detecting embedding dimension...`);

        try {
            const processedText = this.preprocessText(testText);
            const embeddings = await this.callEmbedApi(processedText);
            const dimension = embeddings[0].length;
            console.log(`[OllamaEmbedding] Successfully detected embedding dimension: ${dimension}`);
            return dimension;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error(`[OllamaEmbedding] Failed to detect dimension: ${errorMessage}`);
            throw new Error(`Failed to detect Ollama embedding dimension: ${errorMessage}`);
        }
    }
}
