![](assets/claude-context.png)

### Your entire codebase as Claude's context

[![License](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-20%2B-green.svg)](https://nodejs.org/)
[![Documentation](https://img.shields.io/badge/Documentation-📚-orange.svg)](docs/)

**Claude Context** is an MCP plugin that adds semantic code search to Claude Code and other AI coding agents, giving them deep context from your entire codebase.

🧠 **Your Entire Codebase as Context**: Claude Context uses semantic search to find all relevant code from millions of lines. No multi-round discovery needed. It brings results straight into Claude's context.

💰 **Cost-Effective for Large Codebases**: Instead of loading entire directories into Claude for every request, which can be very expensive, Claude Context efficiently stores your codebase in a local vector database and only retrieves related code to keep your costs manageable.

🏠 **Fully Local**: Runs entirely on your machine using [Qdrant](https://qdrant.tech/) for vector storage and [Ollama](https://ollama.ai/) with `nomic-embed-text` for embeddings. No cloud services or API keys required.

---

## 🚀 Demo

![img](https://lh7-rt.googleusercontent.com/docsz/AD_4nXf2uIf2c5zowp-iOMOqsefHbY_EwNGiutkxtNXcZVJ8RI6SN9DsCcsc3amXIhOZx9VcKFJQLSAqM-2pjU9zoGs1r8GCTUL3JIsLpLUGAm1VQd5F2o5vpEajx2qrc77iXhBu1zWj?key=qYdFquJrLcfXCUndY-YRBQ)

Model Context Protocol (MCP) allows you to integrate Claude Context with your favorite AI coding assistants, e.g. Claude Code.

## Quick Start

### Prerequisites

1. **Node.js** >= 20.0.0 and < 24.0.0

2. **Qdrant** (local vector database):
   ```bash
   docker run -p 6333:6333 qdrant/qdrant
   ```

3. **Ollama** with the `nomic-embed-text` model:
   ```bash
   ollama pull nomic-embed-text
   ```

### Install

```bash
git clone https://github.com/zilliztech/claude-context.git
cd claude-context
pnpm install
pnpm build
```

### Configure MCP for Claude Code

Use the command line interface to add the Claude Context MCP server:

```bash
claude mcp add claude-context -- node /path/to/claude-context/packages/mcp/dist/index.js
```

Optionally, you can customize the Qdrant URL and Ollama settings:

```bash
claude mcp add claude-context \
  -e QDRANT_URL=http://localhost:6333 \
  -e OLLAMA_HOST=http://127.0.0.1:11434 \
  -e OLLAMA_MODEL=nomic-embed-text \
  -- node /path/to/claude-context/packages/mcp/dist/index.js
```

> Replace `/path/to/claude-context` with the actual path where you cloned the repository.

See the [Claude Code MCP documentation](https://docs.anthropic.com/en/docs/claude-code/mcp) for more details about MCP server management.

### Other MCP Client Configurations

<details>
<summary><strong>Cursor</strong></summary>

Go to: `Settings` -> `Cursor Settings` -> `MCP` -> `Add new global MCP server`

Paste the following configuration into your Cursor `~/.cursor/mcp.json` file:

```json
{
  "mcpServers": {
    "claude-context": {
      "command": "node",
      "args": ["/path/to/claude-context/packages/mcp/dist/index.js"],
      "env": {
        "QDRANT_URL": "http://localhost:6333"
      }
    }
  }
}
```

</details>

<details>
<summary><strong>VS Code</strong></summary>

Add the following configuration to your VS Code MCP settings:

```json
{
  "mcpServers": {
    "claude-context": {
      "command": "node",
      "args": ["/path/to/claude-context/packages/mcp/dist/index.js"],
      "env": {
        "QDRANT_URL": "http://localhost:6333"
      }
    }
  }
}
```

</details>

<details>
<summary><strong>Claude Desktop</strong></summary>

Add to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "claude-context": {
      "command": "node",
      "args": ["/path/to/claude-context/packages/mcp/dist/index.js"],
      "env": {
        "QDRANT_URL": "http://localhost:6333"
      }
    }
  }
}
```

</details>

<details>
<summary><strong>Windsurf</strong></summary>

Add the following configuration to your Windsurf MCP settings:

```json
{
  "mcpServers": {
    "claude-context": {
      "command": "node",
      "args": ["/path/to/claude-context/packages/mcp/dist/index.js"],
      "env": {
        "QDRANT_URL": "http://localhost:6333"
      }
    }
  }
}
```

</details>

<details>
<summary><strong>Other MCP Clients</strong></summary>

The server uses stdio transport and follows the standard MCP protocol. It can be integrated with any MCP-compatible client by running:

```bash
node /path/to/claude-context/packages/mcp/dist/index.js
```

</details>

---

### Usage in Your Codebase

1. **Open Claude Code**

   ```
   cd your-project-directory
   claude
   ```

2. **Index your codebase**:

   ```
   Index this codebase
   ```

3. **Check indexing status**:

   ```
   Check the indexing status
   ```

4. **Start searching**:

   ```
   Find functions that handle user authentication
   ```

🎉 **That's it!** You now have semantic code search in Claude Code.

---

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `QDRANT_URL` | Qdrant server URL | `http://localhost:6333` |
| `OLLAMA_HOST` | Ollama server host | `http://127.0.0.1:11434` |
| `OLLAMA_MODEL` | Ollama embedding model | `nomic-embed-text` |

### File Inclusion & Exclusion Rules

For detailed explanation of file inclusion and exclusion rules, and how to customize them, see our [File Inclusion & Exclusion Rules](docs/dive-deep/file-inclusion-rules.md).

### Available Tools

#### 1. `index_codebase`

Index a codebase directory for semantic search using dense vector embeddings.

#### 2. `search_code`

Search the indexed codebase using natural language queries with cosine similarity.

#### 3. `clear_index`

Clear the search index for a specific codebase.

#### 4. `get_indexing_status`

Get the current indexing status of a codebase. Shows progress percentage for actively indexing codebases and completion status for indexed codebases.

---

## 📊 Evaluation

Our controlled evaluation demonstrates that Claude Context MCP achieves ~40% token reduction under the condition of equivalent retrieval quality. This translates to significant cost and time savings in production environments. This also means that, under the constraint of limited token context length, using Claude Context yields better retrieval and answer results.

![MCP Efficiency Analysis](assets/mcp_efficiency_analysis_chart.png)

For detailed evaluation methodology and results, see the [evaluation directory](evaluation/).

---

## 🏗️ Architecture

![](assets/Architecture.png)

### 🔧 Implementation Details

- 🔍 **Semantic Code Search**: Ask questions like *"find functions that handle user authentication"* and get relevant, context-rich code instantly using cosine similarity search.
- 🧠 **Context-Aware**: Discover large codebase, understand how different parts of your codebase relate, even across millions of lines of code.
- ⚡ **Incremental Indexing**: Efficiently re-index only changed files using Merkle trees.
- 🧩 **Intelligent Code Chunking**: Analyze code in Abstract Syntax Trees (AST) for chunking.
- 🏠 **Fully Local**: Runs entirely on your machine with Qdrant and Ollama. No cloud services needed.
- 🛠️ **Customizable**: Configure file extensions, ignore patterns, and embedding models.

### Core Components

Claude Context is a monorepo containing two main packages:

- **`claude-context-core`**: Core indexing engine with Ollama embedding and Qdrant vector database integration
- **`claude-context-mcp`**: Model Context Protocol server for AI agent integration

### Supported Technologies

- **Embedding**: [Ollama](https://ollama.ai) with `nomic-embed-text`
- **Vector Database**: [Qdrant](https://qdrant.tech/) (local)
- **Code Splitters**: AST-based splitter (with automatic fallback), LangChain character-based splitter
- **Languages**: TypeScript, JavaScript, Python, Java, C++, C#, Go, Rust, PHP, Ruby, Swift, Kotlin, Scala, Markdown

---

## 📦 Using the Core Package

The `claude-context-core` package provides the fundamental functionality for code indexing and semantic search.

```typescript
import { Context, QdrantVectorDatabase, AstCodeSplitter } from 'claude-context-core';

// Initialize vector database (local Qdrant)
const vectorDatabase = new QdrantVectorDatabase({
    url: 'http://localhost:6333',
});

// Create context instance
const context = new Context({
    vectorDatabase,
    codeSplitter: new AstCodeSplitter(2500, 300),
    supportedExtensions: ['.ts', '.js', '.py', '.java', '.cpp', '.go', '.rs']
});

// Index your codebase with progress tracking
const stats = await context.indexCodebase('./your-project', (progress) => {
    console.log(`${progress.phase} - ${progress.percentage}%`);
});
console.log(`Indexed ${stats.indexedFiles} files, ${stats.totalChunks} chunks`);

// Perform semantic search
const results = await context.semanticSearch('./your-project', 'vector database operations', 5);
results.forEach(result => {
    console.log(`File: ${result.relativePath}:${result.startLine}-${result.endLine}`);
    console.log(`Score: ${(result.score * 100).toFixed(2)}%`);
    console.log(`Content: ${result.content.substring(0, 100)}...`);
});
```

---

## 🛠️ Development

### Setup Development Environment

#### Prerequisites

- Node.js 20.x or 22.x
- pnpm (recommended package manager)
- Docker (for Qdrant)
- Ollama

#### Setup

```bash
# Clone repository
git clone https://github.com/zilliztech/claude-context.git
cd claude-context

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Start development mode
pnpm dev
```

### Building

```bash
# Build all packages
pnpm build

# Build specific package
pnpm build:core
pnpm build:mcp
```

### Running Examples

```bash
# Development with file watching
cd examples/basic-usage
pnpm dev
```

---

## 📖 Examples

Check the `/examples` directory for complete usage examples:

- **Basic Usage**: Simple indexing and search example

---

## ❓ FAQ

**Common Questions:**

- **[What files does Claude Context decide to embed?](docs/troubleshooting/faq.md#q-what-files-does-claude-context-decide-to-embed)**
- **[Does it support multiple projects / codebases?](docs/troubleshooting/faq.md#q-does-it-support-multiple-projects--codebases)**
- **[How does Claude Context compare to other coding tools?](docs/troubleshooting/faq.md#q-how-does-claude-context-compare-to-other-coding-tools-like-serena-context7-or-deepwiki)**

❓ For detailed answers and more troubleshooting tips, see our [FAQ Guide](docs/troubleshooting/faq.md).

🔧 **Encountering issues?** Visit our [Troubleshooting Guide](docs/troubleshooting/troubleshooting-guide.md) for step-by-step solutions.

📚 **Need more help?** Check out our [complete documentation](docs/) for detailed guides and troubleshooting tips.

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details on how to get started.

**Package-specific contributing guides:**

- [Core Package Contributing](packages/core/CONTRIBUTING.md)
- [MCP Server Contributing](packages/mcp/CONTRIBUTING.md)

---

## 🗺️ Roadmap

- [x] AST-based code analysis for improved understanding
- [x] Fully local setup with Qdrant and Ollama
- [ ] Agent-based interactive search mode
- [x] Enhanced code chunking strategies
- [ ] Search result ranking optimization

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🔗 Links

- [GitHub Repository](https://github.com/zilliztech/claude-context)
- [Qdrant Documentation](https://qdrant.tech/documentation/)
- [Ollama Documentation](https://ollama.ai/)
