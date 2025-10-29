import { auth } from "@/app/(auth)/auth";
import { updateNetSuiteAutoRefresh } from "@/lib/db/queries";
import { ChatSDKError } from "@/lib/errors";

export async function PATCH(request: Request) {
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

  try {
    const body = (await request.json()) as { autoRefresh: boolean };

    if (typeof body.autoRefresh !== "boolean") {
      return new ChatSDKError(
        "bad_request:api",
        "autoRefresh must be a boolean"
      ).toResponse();
    }

    await updateNetSuiteAutoRefresh({
      userId: session.user.id,
      autoRefresh: body.autoRefresh,
    });

    return Response.json({ success: true, autoRefresh: body.autoRefresh });
  } catch (error) {
    console.error("Failed to update auto-refresh setting:", error);
    return new ChatSDKError(
      "bad_request:database",
      "Failed to update auto-refresh setting"
    ).toResponse();
  }
}
