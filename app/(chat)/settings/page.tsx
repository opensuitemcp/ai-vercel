import { redirect } from "next/navigation";
import { SettingsContent } from "@/components/settings-content";
import { SettingsHeaderAnimated } from "@/components/settings-header";
import { auth } from "../../(auth)/auth";

export default async function SettingsPage() {
  const session = await auth();

  if (!session) {
    redirect("/api/auth/guest");
  }

  return (
    <div className="overscroll-behavior-contain flex h-dvh min-w-0 touch-pan-y flex-col bg-background">
      <SettingsHeaderAnimated />

      <SettingsContent />
    </div>
  );
}
