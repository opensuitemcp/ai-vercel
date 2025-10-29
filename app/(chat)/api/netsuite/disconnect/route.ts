import { auth } from "@/app/(auth)/auth";
import { deleteNetSuiteAuthByUserId } from "@/lib/db/queries";
import { ChatSDKError } from "@/lib/errors";

export async function DELETE() {
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

  await deleteNetSuiteAuthByUserId({ userId: session.user.id });

  return Response.json({ success: true });
}
