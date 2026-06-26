/**
 * Production activity logger for Swiggy Builders Club submission.
 * Stores structured logs in-memory, exposes via /api/logs and /admin UI.
 * Logs: auth events, MCP tool calls, errors, order placements.
 */

export interface LogEntry {
  ts: string;
  level: "info" | "warn" | "error";
  event: string;
  tool?: string;
  sessionId?: string;
  durationMs?: number;
  status: "ok" | "error" | "auth" | "retry";
  details?: string;
  userId?: string;
}

const MAX_LOGS = 500;
const logs: LogEntry[] = [];

export function log(entry: Omit<LogEntry, "ts">) {
  const full: LogEntry = { ts: new Date().toISOString(), ...entry };
  logs.push(full);
  if (logs.length > MAX_LOGS) logs.shift();

  // Also print to console for server-side capture
  const prefix = full.level === "error" ? "ERROR" : full.level === "warn" ? "WARN" : "INFO";
  console.log(`[${prefix}] ${full.event}${full.tool ? ` tool=${full.tool}` : ""}${full.sessionId ? ` sid=${full.sessionId}` : ""}${full.durationMs ? ` ${full.durationMs}ms` : ""} ${full.status}${full.details ? ` — ${full.details}` : ""}`);
}

export function getLogs(limit = 100, filter?: { level?: string; event?: string }): LogEntry[] {
  let filtered = [...logs];
  if (filter?.level) filtered = filtered.filter(l => l.level === filter.level);
  if (filter?.event) filtered = filtered.filter(l => l.event.includes(filter.event!));
  return filtered.slice(-limit).reverse();
}

export function getStats() {
  const total = logs.length;
  const errors = logs.filter(l => l.level === "error").length;
  const tools = logs.filter(l => l.event === "mcp_tool_call").length;
  const auths = logs.filter(l => l.event.startsWith("auth")).length;
  const avgLatency = logs.filter(l => l.durationMs).reduce((s, l) => s + (l.durationMs ?? 0), 0) / Math.max(1, tools);

  const toolCounts: Record<string, number> = {};
  logs.filter(l => l.tool).forEach(l => {
    toolCounts[l.tool!] = (toolCounts[l.tool!] || 0) + 1;
  });

  return {
    total,
    errors,
    toolCalls: tools,
    authEvents: auths,
    avgLatencyMs: Math.round(avgLatency),
    errorRate: total > 0 ? `${((errors / total) * 100).toFixed(1)}%` : "0%",
    toolBreakdown: toolCounts,
    upSince: logs.length > 0 ? logs[0].ts : new Date().toISOString(),
  };
}

export function clearLogs() {
  logs.length = 0;
}
