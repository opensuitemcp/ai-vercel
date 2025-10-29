import { auth } from "@/app/(auth)/auth";
import { getNetSuiteAuthByUserId } from "@/lib/db/queries";
import { ChatSDKError } from "@/lib/errors";

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError("unauthorized:chat").toResponse();
  }

  // NetSuite connections should only be available to regular users, not guests
  if (session.user.type === "guest") {
    return new ChatSDKError(
      "forbidden:api",
      "NetSuite connections are only available to registered users"
    ).toResponse();
  }

  const netsuiteAuth = await getNetSuiteAuthByUserId({
    userId: session.user.id,
  });

  if (!netsuiteAuth || !netsuiteAuth.accessToken) {
    return new ChatSDKError(
      "bad_request:api",
      "No NetSuite connection found or not authenticated"
    ).toResponse();
  }

  // Check if token is expired or will expire soon (within 5 minutes)
  const now = new Date();
  const expiresAt = netsuiteAuth.tokenExpiresAt;
  let accessToken = netsuiteAuth.accessToken;

  // If token is expired or expiring soon, refresh it (only if auto-refresh is enabled)
  if (
    netsuiteAuth.autoRefresh &&
    (!expiresAt || expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) &&
    netsuiteAuth.refreshToken
  ) {
    // Refresh token
    const refreshUrl = `https://${netsuiteAuth.accountId}.suitetalk.api.netsuite.com/services/rest/auth/oauth2/v1/token`;

    try {
      // Per NetSuite docs: "The request must include client credentials in the HTTP authorization request header"
      // For PKCE public clients, use client_id with empty password
      const tokenResponse = await fetch(refreshUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${Buffer.from(
            `${netsuiteAuth.clientId}:`
          ).toString("base64")}`,
        },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: netsuiteAuth.refreshToken,
        }),
      });

      if (tokenResponse.ok) {
        const tokenData = (await tokenResponse.json()) as {
          access_token: string;
          refresh_token: string;
          expires_in: number;
        };

        // Update tokens (we'll need to import updateNetSuiteTokens)
        const { updateNetSuiteTokens } = await import("@/lib/db/queries");
        const tokenExpiresAt = new Date(
          Date.now() + tokenData.expires_in * 1000
        );

        await updateNetSuiteTokens({
          userId: session.user.id,
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
          tokenExpiresAt,
        });

        accessToken = tokenData.access_token;
      }
    } catch (error) {
      console.error("Failed to refresh token before fetching tools:", error);
    }
  }

  // Fetch MCP tools
  const mcpUrl = `https://${netsuiteAuth.accountId}.suitetalk.api.netsuite.com/services/mcp/v1/all`;
  const randomId = Math.random().toString(36).substring(7);

  try {
    const mcpResponse = await fetch(mcpUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: randomId,
        method: "tools/list",
        params: {},
      }),
    });

    if (!mcpResponse.ok) {
      const errorText = await mcpResponse.text();
      console.error("MCP tools fetch failed:", errorText);
      return new ChatSDKError(
        "bad_request:api",
        "Failed to fetch MCP tools"
      ).toResponse();
    }

    const mcpData = (await mcpResponse.json()) as {
      jsonrpc: string;
      id: string;
      result?: {
        tools: Array<{
          name: string;
          title: string;
          description: string;
          inputSchema: unknown;
          annotations?: unknown;
        }>;
      };
      error?: unknown;
    };

    if (mcpData.error) {
      console.error("MCP tools error:", mcpData.error);
      return new ChatSDKError(
        "bad_request:api",
        "MCP server returned an error"
      ).toResponse();
    }

    return Response.json({
      tools: mcpData.result?.tools ?? [],
    });
  } catch (error) {
    console.error("MCP tools fetch error:", error);
    return new ChatSDKError(
      "bad_request:api",
      "Failed to fetch MCP tools"
    ).toResponse();
  }
}
