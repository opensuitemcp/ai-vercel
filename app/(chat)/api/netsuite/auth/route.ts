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
    return Response.json(null); // Return null instead of error for UI consistency
  }

  const netsuiteAuth = await getNetSuiteAuthByUserId({
    userId: session.user.id,
  });

  if (!netsuiteAuth) {
    return Response.json(null);
  }

  // Return fields needed for the UI
  // We need accessToken to check connection status, but we'll mark it as present/not present
  return Response.json({
    accountId: netsuiteAuth.accountId,
    clientId: netsuiteAuth.clientId,
    accessToken: netsuiteAuth.accessToken || null,
    tokenExpiresAt: netsuiteAuth.tokenExpiresAt,
    autoRefresh: netsuiteAuth.autoRefresh,
  });
}
