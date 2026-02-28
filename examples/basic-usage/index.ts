import { Context, QdrantVectorDatabase, AstCodeSplitter, LangChainCodeSplitter } from 'claude-context-core';
import { envManager } from 'claude-context-core';
import * as path from 'path';

// Try to load .env file
try {
    require('dotenv').config();
} catch (error) {
    // dotenv is not required, skip if not installed
}

async function main() {
    console.log('🚀 Context Real Usage Example');
    console.log('===============================');

    try {
        const qdrantUrl = envManager.get('QDRANT_URL') || 'http://localhost:6333';
        const splitterType = envManager.get('SPLITTER_TYPE')?.toLowerCase() || 'ast';

        console.log(`🔌 Connecting to Qdrant at: ${qdrantUrl}`);

        const vectorDatabase = new QdrantVectorDatabase({
            url: qdrantUrl,
        });

        // Create Context instance
        let codeSplitter;
        if (splitterType === 'langchain') {
            codeSplitter = new LangChainCodeSplitter(1000, 200);
        } else {
            codeSplitter = new AstCodeSplitter(2500, 300);
        }
        const context = new Context({
            vectorDatabase,
            codeSplitter,
            supportedExtensions: ['.ts', '.js', '.py', '.java', '.cpp', '.go', '.rs']
        });

        // Check if index already exists and clear if needed
        console.log('\n📖 Starting to index codebase...');
        const codebasePath = path.join(__dirname, '../..'); // Index entire project

        const hasExistingIndex = await context.hasIndex(codebasePath);
        if (hasExistingIndex) {
            console.log('🗑️  Existing index found, clearing it first...');
            await context.clearIndex(codebasePath);
        }

        // Index with progress tracking
        const indexStats = await context.indexCodebase(codebasePath);

        console.log(`\n📊 Indexing stats: ${indexStats.indexedFiles} files, ${indexStats.totalChunks} code chunks`);

        // Perform semantic search
        console.log('\n🔍 Performing semantic search...');

        const queries = [
            'vector database operations',
            'code splitting functions',
            'embedding generation',
            'typescript interface definitions'
        ];

        for (const query of queries) {
            console.log(`\n🔎 Search: "${query}"`);
            const results = await context.semanticSearch(codebasePath, query, 3, 0.3);

            if (results.length > 0) {
                results.forEach((result, index) => {
                    console.log(`   ${index + 1}. Similarity: ${(result.score * 100).toFixed(2)}%`);
                    console.log(`      File: ${path.join(codebasePath, result.relativePath)}`);
                    console.log(`      Language: ${result.language}`);
                    console.log(`      Lines: ${result.startLine}-${result.endLine}`);
                    console.log(`      Preview: ${result.content.substring(0, 100)}...`);
                });
            } else {
                console.log('   No relevant results found');
            }
        }

        console.log('\n🎉 Example completed successfully!');

    } catch (error) {
        console.error('❌ Error occurred:', error);

        if (error instanceof Error) {
            if (error.message.includes('Qdrant') || error.message.includes('connect')) {
                console.log('\n💡 Please make sure Qdrant is running');
                console.log('   - Default URL: http://localhost:6333');
                console.log('   - Start Qdrant: docker run -p 6333:6333 qdrant/qdrant');
            }
            if (error.message.includes('Ollama') || error.message.includes('embed')) {
                console.log('\n💡 Please make sure Ollama is running with nomic-embed-text');
                console.log('   - Pull model: ollama pull nomic-embed-text');
            }

            console.log('\n💡 Environment Variables:');
            console.log('   - QDRANT_URL: Qdrant server URL (default: http://localhost:6333)');
            console.log('   - OLLAMA_HOST: Ollama server host (default: http://127.0.0.1:11434)');
            console.log('   - OLLAMA_MODEL: Ollama model name (default: nomic-embed-text)');
            console.log('   - SPLITTER_TYPE: Code splitter type - "ast" or "langchain" (default: ast)');
        }

        process.exit(1);
    }
}

// Run main program
if (require.main === module) {
    main().catch(console.error);
}

export { main };
