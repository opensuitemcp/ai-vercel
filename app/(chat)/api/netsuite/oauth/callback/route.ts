import { redirect } from "next/navigation";
import { auth } from "@/app/(auth)/auth";
import {
  createOrUpdateNetSuiteAuth,
  getNetSuiteAuthByUserId,
} from "@/lib/db/queries";
import { ChatSDKError } from "@/lib/errors";

export async function GET(request: Request) {
  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError("unauthorized:chat").toResponse();
  }

  // NetSuite connections should only be available to regular users, not guests
  if (session.user.type === "guest") {
    redirect("/settings?error=guests_not_allowed");
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const oauthError = searchParams.get("error");

  if (oauthError) {
    redirect("/settings?error=netsuite_oauth_error");
  }

  if (!code) {
    redirect("/settings?error=no_authorization_code");
  }

  // Get stored NetSuite auth data including codeVerifier
  const netsuiteAuth = await getNetSuiteAuthByUserId({
    userId: session.user.id,
  });

  if (!netsuiteAuth || !netsuiteAuth.codeVerifier) {
    redirect("/settings?error=missing_code_verifier");
  }

  // Exchange authorization code for tokens
  const redirectUri = `${process.env.NEXTAUTH_URL}/api/netsuite/oauth/callback`;
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
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        code_verifier: netsuiteAuth.codeVerifier,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("NetSuite token exchange failed:", errorText);
      redirect("/settings?error=token_exchange_failed");
      return; // redirect throws, but TypeScript doesn't know that
    }

    const tokenData = (await tokenResponse.json()) as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
      token_type: string;
    };

    // Calculate token expiration time
    const tokenExpiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

    // Update NetSuite auth with tokens and clear codeVerifier
    await createOrUpdateNetSuiteAuth({
      userId: session.user.id,
      accountId: netsuiteAuth.accountId,
      clientId: netsuiteAuth.clientId,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      tokenExpiresAt,
      codeVerifier: null, // Clear after successful exchange
    });

    // Redirect to settings page with success
    redirect("/settings?tab=netsuite&success=connected");
  } catch (error) {
    // Next.js redirect() throws a special error that should not be caught
    // Check if this is a redirect error and re-throw it
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      typeof error.digest === "string" &&
      error.digest.startsWith("NEXT_REDIRECT")
    ) {
      throw error;
    }
    console.error("NetSuite OAuth callback error:", error);
    redirect("/settings?error=oauth_callback_failed");
  }
}
