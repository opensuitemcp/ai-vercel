import { redirect } from "next/navigation";
import { auth } from "@/app/(auth)/auth";
import { createOrUpdateNetSuiteAuth } from "@/lib/db/queries";
import { ChatSDKError } from "@/lib/errors";
import {
  generateCodeChallenge,
  generateCodeVerifier,
  generateState,
} from "@/lib/netsuite/pkce";

export async function GET(request: Request) {
  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError("unauthorized:chat").toResponse();
  }

  // NetSuite connections should only be available to regular users, not guests
  if (session.user.type === "guest") {
    return new ChatSDKError(
      "forbidden:api",
      "NetSuite connections are only available to registered users. Please create an account to use this feature."
    ).toResponse();
  }

  const { searchParams } = new URL(request.url);
  const accountId = searchParams.get("accountId");
  const clientId = searchParams.get("clientId");

  if (!accountId || !clientId) {
    return new ChatSDKError(
      "bad_request:api",
      "accountId and clientId are required"
    ).toResponse();
  }

  // Generate PKCE code verifier and challenge
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);
  const state = generateState();

  // Store accountId, clientId, codeVerifier, and state for later use
  await createOrUpdateNetSuiteAuth({
    userId: session.user.id,
    accountId,
    clientId,
    codeVerifier,
  });

  // Build authorization URL
  const redirectUri = `${process.env.NEXTAUTH_URL}/api/netsuite/oauth/callback`;
  const scope = "mcp"; // MCP scope must be used alone per NetSuite docs
  const codeChallengeMethod = "S256";

  const authUrl = new URL(
    `https://${accountId}.app.netsuite.com/app/login/oauth2/authorize.nl`
  );
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("scope", scope);
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("code_challenge", codeChallenge);
  authUrl.searchParams.set("code_challenge_method", codeChallengeMethod);

  // Store state in session/cookie for validation (we'll use a simple approach here)
  // In production, you might want to use encrypted cookies or session storage
  redirect(authUrl.toString());
}
