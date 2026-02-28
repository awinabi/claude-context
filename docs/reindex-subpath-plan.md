# Sub-path Re-indexing via new `reindex_subpath` MCP tool

## Context
Full codebase re-indexing takes 5+ minutes. When only a subset of files changed (e.g., a single package), users should be able to re-index just that sub-path instead of the entire codebase.

## Approach
Add a new `reindex_subpath` MCP tool that:
1. Takes `path` (codebase root) and `subpath` (relative directory to re-index)
2. Requires the codebase to already be indexed
3. Scans only files under `<path>/<subpath>`
4. Deletes existing chunks for those files
5. Re-indexes only those files

Reuses existing `getCodeFiles`, `deleteFileChunks`, and `processFileList` methods.

## Files to modify

### 1. `packages/core/src/context.ts`
- Add public `reindexSubpath(codebasePath, subpath, progressCallback)` method:
  - Loads ignore patterns via `loadIgnorePatterns(codebasePath)`
  - Calls `getCodeFiles(path.join(codebasePath, subpath))` to find files under the subpath
  - For each file, computes `relativePath` and calls `deleteFileChunks` to remove old chunks
  - Calls `processFileList` to re-index the files
  - Returns stats: `{ indexedFiles, totalChunks, deletedChunks }`

### 2. `packages/mcp/src/index.ts` (tool definition + routing)
- Add `reindex_subpath` tool to the tools list with params:
  - `path` (string, required): Absolute path to the already-indexed codebase
  - `subpath` (string, required): Relative sub-path within the codebase to re-index
- Add routing in `CallToolRequestSchema` handler to call `handlers.handleReindexSubpath`

### 3. `packages/mcp/src/handlers.ts`
- Add `handleReindexSubpath(args)` method:
  - Validate codebase is already indexed (error if not)
  - Validate `path.join(absolutePath, subpath)` exists and is a directory
  - Run re-indexing in background (same pattern as `startBackgroundIndexing`)
  - Track progress via snapshot manager

## Verification
- Build the project: `pnpm build`
- Test by indexing a codebase, then re-indexing a sub-path like `packages/core`
- Verify search still works across the full codebase after partial re-index
