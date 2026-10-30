[![MseeP.ai Security Assessment Badge](https://mseep.net/pr/alhwyn-canlii-mcp-badge.png)](https://mseep.ai/app/alhwyn-canlii-mcp)

# CanLII MCP Server

A Model Context Protocol (MCP) server that provides access to the CanLII (Canadian Legal Information Institute) API. This server allows AI assistants to search and retrieve Canadian legal information including court decisions, legislation, and legal citations.

## Prerequisites

- A CanLII API key (obtain from [CanLII API](https://api.canlii.org/))
- Node.js 22+ and npm (for local development)
- An [Apify](https://apify.com/) account (for hosting)

## Hosting on Apify

The server runs as an Apify Actor in [Standby mode](https://docs.apify.com/platform/actors/running/standby), exposing an MCP Streamable HTTP endpoint at `/mcp`.

1. In Apify Console, go to **Actors → Develop new → Link Git repository** and select this repository (or run `apify push` from a local checkout with the [Apify CLI](https://docs.apify.com/cli)).
2. In the Actor's **Source → Environment variables**, add `CANLII_API` with your CanLII API key and tick **Secret**.
3. Click **Build**. Standby mode is enabled by `.actor/actor.json`.
4. Your MCP endpoint is `https://<your-username>--canlii-mcp.apify.actor/mcp`. Requests must include your Apify API token as `Authorization: Bearer <APIFY_TOKEN>`.

## Local Development

```bash
npm install
npm run build
CANLII_API=your_canlii_api_key_here PORT=8080 npm start
```

The MCP endpoint is then available at `http://localhost:8080/mcp`.

## Available Tools

### 1. get_courts_and_tribunals

Retrieves a list of available courts and tribunals databases.

**Parameters:**

- `language` (required): "en" or "fr"
- Optional date filters: `publishedBefore`, `publishedAfter`, `modifiedBefore`, `modifiedAfter`, `changedBefore`, `changedAfter`, `decisionDateBefore`, `decisionDateAfter`

### 2. get_legislation_databases

Gets available legislation databases (statutes, regulations, etc.).

**Parameters:**

- `language` (required): "en" or "fr"
- Optional date filters (same as above)

### 3. browse_legislation

Browse legislation within a specific database.

**Parameters:**

- `language` (required): "en" or "fr"
- `databaseId` (required): Database code (e.g., "cas" for Canada Statutes, "car" for Canada Regulations)
- Optional date filters

### 4. get_legislation_regulation_metadata

Get detailed metadata for a specific piece of legislation.

**Parameters:**

- `language` (required): "en" or "fr"
- `databaseId` (required): Database identifier
- `legislationId` (required): Specific legislation ID

### 5. get_case_law_decisions

Retrieve case law decisions from a specific database.

**Parameters:**

- `language` (required): "en" or "fr"
- `databaseId` (required): Database identifier
- `offset` (required): Starting record number
- `resultCount` (required): Number of results (max 10,000)
- Optional date filters

### 6. get_case_metadata

Get detailed metadata for a specific court case.

**Parameters:**

- `language` (required): "en" or "fr"
- `databaseId` (required): Database identifier
- `caseId` (required): Case identifier
- Optional date filters

### 7. get_case_citator

Get citation information for cases (what cases cite this case, what this case cites, etc.).

**Parameters:**

- `language` (required): "en" or "fr"
- `databaseId` (required): Database identifier
- `caseId` (required): Case identifier
- `metadataType` (required): "citedCases", "citingCases", or "citedLegislations"
- Optional date filters

## Connecting an MCP Client

Add the server as a remote (Streamable HTTP) MCP server, using the Apify Standby URL and your Apify token. For example, in Claude Desktop (Settings > Developer > Edit Config) via [mcp-remote](https://www.npmjs.com/package/mcp-remote):

```json
{
  "mcpServers": {
    "canlii": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "https://<your-username>--canlii-mcp.apify.actor/mcp",
        "--header",
        "Authorization: Bearer ${APIFY_TOKEN}"
      ],
      "env": { "APIFY_TOKEN": "<your-apify-token>" }
    }
  }
}
```

## Usage Examples

### Finding Court Decisions

```typescript
// Get available courts and tribunals
await get_courts_and_tribunals({
  language: "en",
});

// Browse recent decisions from Supreme Court of Canada
await get_case_law_decisions({
  language: "en",
  databaseId: "scc-csc",
  offset: 0,
  resultCount: 10,
});
```

### Searching Legislation

```typescript
// Get legislation databases
await get_legislation_databases({
  language: "en",
});

// Browse federal statutes
await browse_legislation({
  language: "en",
  databaseId: "cas",
});

// Get specific act metadata
await get_legislation_regulation_metadata({
  language: "en",
  databaseId: "cas",
  legislationId: "criminal-code",
});
```

### Case Citations

```typescript
// Get case metadata
await get_case_metadata({
  language: "en",
  databaseId: "scc-csc",
  caseId: "2023scc1",
});

// Find cases that cite this case
await get_case_citator({
  language: "en",
  databaseId: "scc-csc",
  caseId: "2023scc1",
  metadataType: "citingCases",
});
```

## Development

### Scripts

- `npm run build` - Compile TypeScript to `dist/`
- `npm start` - Start the compiled server
- `npm run dev` - Build and start
- `npm run format` - Format code with Biome
- `npm run lint:fix` - Fix linting issues
- `npm run type-check` - Run TypeScript type checking

### Project Structure

```
.actor/
├── actor.json        # Apify Actor config (Standby mode, MCP path)
└── input_schema.json
src/
├── main.ts           # HTTP entry point (Streamable HTTP at /mcp)
├── server.ts         # MCP server and CanLII tools
└── schema.ts         # Zod schemas for API responses
Dockerfile            # Apify Actor image
```

## API Rate Limits

Be aware of CanLII API rate limits and usage terms. The API is intended for research and educational purposes.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request
