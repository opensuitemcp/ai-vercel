import { auth } from "@/app/(auth)/auth";
import {
  getNetSuiteAuthByUserId,
  updateNetSuiteTokens,
} from "@/lib/db/queries";
import { ChatSDKError } from "@/lib/errors";

export async function POST() {
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

  if (!netsuiteAuth || !netsuiteAuth.refreshToken) {
    return new ChatSDKError(
      "bad_request:api",
      "No NetSuite connection found or refresh token missing"
    ).toResponse();
  }

  // Always refresh the token (manual refresh button)
  // The automatic refresh in tools route still checks expiration
  const tokenUrl = `https://${netsuiteAuth.accountId}.suitetalk.api.netsuite.com/services/rest/auth/oauth2/v1/token`;

  try {
    // Per NetSuite docs: "The request must include client credentials in the HTTP authorization request header"
    // For PKCE public clients, use client_id with empty password
    const tokenResponse = await fetch(tokenUrl, {
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

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("NetSuite token refresh failed:", errorText);
      return new ChatSDKError(
        "bad_request:api",
        "Failed to refresh NetSuite token"
      ).toResponse();
    }

    const tokenData = (await tokenResponse.json()) as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
      token_type: string;
    };

    // Calculate token expiration time
    const tokenExpiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

    // Update tokens in database
    await updateNetSuiteTokens({
      userId: session.user.id,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      tokenExpiresAt,
    });

    return Response.json({
      accessToken: tokenData.access_token,
      expiresAt: tokenExpiresAt,
    });
  } catch (error) {
    console.error("NetSuite token refresh error:", error);
    return new ChatSDKError(
      "bad_request:api",
      "Failed to refresh NetSuite token"
    ).toResponse();
  }
}
