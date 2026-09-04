import { Constants } from 'librechat-data-provider';
import type { TranslationKeys } from '~/hooks';

/**
 * Shared tool-name parsing + friendly-label mapping used by the main
 * tool-call UI and the subagent ticker. Centralized so the MCP
 * delimiter (`<tool>_mcp_<server>`) and native-tool short names read
 * consistently in every surface that renders tool lifecycle.
 */

/** Native tool id → translation key for a user-readable short name. */
export const TOOL_FRIENDLY_NAME_KEYS: Record<string, TranslationKeys> = {
  execute_code: 'com_ui_tool_name_code',
  run_tools_with_code: 'com_ui_tool_name_code',
  run_tools_with_bash: 'com_ui_tool_name_code',
  bash_tool: 'com_ui_tool_name_code',
  web_search: 'com_ui_tool_name_web_search',
  image_gen_oai: 'com_ui_tool_name_image_gen',
  image_edit_oai: 'com_ui_tool_name_image_edit',
  gemini_image_gen: 'com_ui_tool_name_image_gen',
  file_search: 'com_ui_tool_name_file_search',
  code_interpreter: 'com_ui_tool_name_code_analysis',
  retrieval: 'com_ui_tool_name_file_search',
  ask_user_question: 'com_ui_tool_name_ask_user_question',
};

/** Leading verbs stripped from an MCP tool id — the surrounding lifecycle
 *  copy ("Looking up …" / "Checked …") already supplies the verb, so keeping
 *  them reads as a doubled verb ("Looking up get all fluid capacities"). */
const MCP_TOOL_VERB_PREFIXES = [
  'get_all_',
  'get_',
  'list_all_',
  'list_',
  'fetch_',
  'search_',
  'recommend_',
  'lookup_',
];

/** Trailing qualifiers that add nothing once the name is a noun phrase. */
const MCP_TOOL_NAME_SUFFIXES = ['_by_name', '_by_url', '_details', '_mcp'];

/**
 * Turn a server-defined MCP tool id into a readable noun phrase for display.
 * Verb prefixes and trailing qualifiers are dropped so the phrase slots into
 * lifecycle copy that already carries the verb:
 *
 *   - `get_all_fluid_capacities` → `fluid capacities`
 *   - `search_products_by_name`  → `products`
 *   - `list_product_categories`  → `product categories`
 *
 * Falls back to the space-separated id when stripping would leave it empty.
 */
export function humanizeMcpToolName(toolName: string): string {
  if (!toolName) {
    return '';
  }

  const prefix = MCP_TOOL_VERB_PREFIXES.find((p) => toolName.startsWith(p));
  let name = prefix ? toolName.slice(prefix.length) : toolName;

  const suffix = MCP_TOOL_NAME_SUFFIXES.find((s) => name.endsWith(s) && name !== s);
  if (suffix) {
    name = name.slice(0, -suffix.length);
  }

  const phrase = name.replace(/_/g, ' ').trim();
  return phrase || toolName.replace(/_/g, ' ').trim();
}

export interface ParsedToolName {
  /** Original tool id (unchanged). */
  raw: string;
  /** MCP server name when the tool follows `<tool>_mcp_<server>`, else `''`. */
  mcpServer: string;
  /** Tool-specific name — the `<tool>` half of an MCP id, or the raw
   *  name for native tools. Useful as the "action" label shown in a
   *  code-style badge next to the server name. */
  toolName: string;
  /** Translation key for a user-friendly display name, when the raw
   *  name matches a built-in native tool (web_search, execute_code, …).
   *  Absent for MCP tools and unknown names. */
  friendlyKey?: TranslationKeys;
}

/**
 * Split an incoming tool id into its constituent parts:
 *
 *   - `search_code_mcp_github` → `{ mcpServer: 'github', toolName: 'search_code' }`
 *   - `web_search`             → `{ mcpServer: '', toolName: 'web_search', friendlyKey: 'com_ui_tool_name_web_search' }`
 *   - `some_custom_tool`       → `{ mcpServer: '', toolName: 'some_custom_tool' }`
 */
export function parseToolName(rawName: string): ParsedToolName {
  const idx = rawName.indexOf(Constants.mcp_delimiter);
  if (idx >= 0) {
    const mcpServer = rawName.slice(idx + Constants.mcp_delimiter.length);
    const toolName = rawName.slice(0, idx);
    return { raw: rawName, mcpServer, toolName };
  }
  const friendlyKey = TOOL_FRIENDLY_NAME_KEYS[rawName];
  return {
    raw: rawName,
    mcpServer: '',
    toolName: rawName,
    ...(friendlyKey ? { friendlyKey } : {}),
  };
}

/**
 * Resolve a tool id to a single user-facing short label. Pure string —
 * use `parseToolName` directly when you need structured parts (e.g. to
 * render a code-style badge for the tool name next to the server).
 *
 *   - MCP tool  → server name (keeps the header summary short)
 *   - Native   → localized friendly name from {@link TOOL_FRIENDLY_NAME_KEYS}
 *   - Unknown  → raw name
 */
export function getToolDisplayLabel(
  rawName: string,
  localize: (key: TranslationKeys) => string,
): string {
  const parsed = parseToolName(rawName);
  if (parsed.mcpServer) return parsed.mcpServer;
  if (parsed.friendlyKey) return localize(parsed.friendlyKey);
  return parsed.toolName;
}
