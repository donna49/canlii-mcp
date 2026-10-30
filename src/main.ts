import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { CanLIIMcp } from "./server.js";

const apiKey = process.env.CANLII_API;
if (!apiKey) {
	console.error("CANLII_API environment variable is not set. Add it as a secret environment variable on the Actor.");
	process.exit(1);
}

// Apify Standby mode exposes this port; ACTOR_WEB_SERVER_PORT/PORT are fallbacks for local runs
const port = Number(process.env.ACTOR_STANDBY_PORT ?? process.env.ACTOR_WEB_SERVER_PORT ?? process.env.PORT ?? 8080);

function sendJson(res: ServerResponse, status: number, body: unknown) {
	res.writeHead(status, { "Content-Type": "application/json" });
	res.end(JSON.stringify(body));
}

async function readJson(req: IncomingMessage): Promise<unknown> {
	const chunks: Buffer[] = [];
	for await (const chunk of req) chunks.push(chunk as Buffer);
	const raw = Buffer.concat(chunks).toString("utf8");
	return raw ? JSON.parse(raw) : undefined;
}

// Stateless Streamable HTTP: a fresh server + transport per request
async function handleMcp(req: IncomingMessage, res: ServerResponse) {
	if (req.method !== "POST") {
		sendJson(res, 405, {
			jsonrpc: "2.0",
			error: { code: -32000, message: "Method not allowed." },
			id: null,
		});
		return;
	}

	let body: unknown;
	try {
		body = await readJson(req);
	} catch {
		sendJson(res, 400, {
			jsonrpc: "2.0",
			error: { code: -32700, message: "Parse error" },
			id: null,
		});
		return;
	}

	const { server } = new CanLIIMcp(apiKey as string);
	const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
	res.on("close", () => {
		transport.close();
		server.close();
	});

	try {
		await server.connect(transport);
		await transport.handleRequest(req, res, body);
	} catch (error) {
		console.error("Error handling MCP request:", error);
		if (!res.headersSent) {
			sendJson(res, 500, {
				jsonrpc: "2.0",
				error: { code: -32603, message: "Internal server error" },
				id: null,
			});
		}
	}
}

const httpServer = createServer((req, res) => {
	const { pathname } = new URL(req.url ?? "/", "http://localhost");

	if (pathname === "/mcp") {
		void handleMcp(req, res);
		return;
	}

	// Root path doubles as the Apify Standby readiness probe
	if (pathname === "/") {
		sendJson(res, 200, { name: "CanLII MCP", mcpEndpoint: "/mcp" });
		return;
	}

	sendJson(res, 404, { error: "Not found" });
});

httpServer.listen(port, () => {
	console.log(`CanLII MCP server listening on port ${port} (endpoint: /mcp)`);
});
