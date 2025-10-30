"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { User } from "next-auth";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useSWRConfig } from "swr";
import { unstable_serialize } from "swr/infinite";
import {
  LoaderCircleIcon,
  MoonIcon,
  OpenSuiteMCPLogo,
  PlusIcon,
  SettingsIcon,
  SidebarLeftIcon,
  SunIcon,
  TrashIcon,
} from "@/components/icons";
import {
  getChatHistoryPaginationKey,
  SidebarHistory,
} from "@/components/sidebar-history";
import { SidebarUserNav } from "@/components/sidebar-user-nav";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

export function AppSidebar({ user }: { user: User | undefined }) {
  const router = useRouter();
  const { setOpenMobile, toggleSidebar, state } = useSidebar();
  const { mutate } = useSWRConfig();
  const { setTheme, resolvedTheme } = useTheme();
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleDeleteAll = () => {
    const deletePromise = fetch("/api/history", {
      method: "DELETE",
    });

    toast.promise(deletePromise, {
      loading: "Deleting all chats...",
      success: () => {
        mutate(unstable_serialize(getChatHistoryPaginationKey));
        router.push("/");
        setShowDeleteAllDialog(false);
        return "All chats deleted successfully";
      },
      error: "Failed to delete all chats",
    });
  };

  return (
    <>
      <Sidebar className="group-data-[side=left]:border-r-0" collapsible="icon">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild className="gap-1">
                <Link
                  href="/"
                  onClick={() => {
                    setOpenMobile(false);
                  }}
                >
                  <div className="group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:w-full group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:justify-center">
                    <div className="h-6 w-6 group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:h-9 group-data-[collapsible=icon]:w-9 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:justify-center">
                      <OpenSuiteMCPLogo size={24} />
                    </div>
                  </div>
                  <span className="text-foreground text-xl group-data-[collapsible=icon]:hidden dark:text-foreground/80">
                    <span className="font-light tracking-tight">OpenSuite</span>
                    <span className="font-bold">MCP</span>
                  </span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
          <SidebarMenu className="mt-2">
            <SidebarMenuItem>
              <Tooltip>
                <TooltipTrigger asChild>
                  <SidebarMenuButton
                    onClick={() => {
                      setOpenMobile(false);
                      router.push("/");
                      router.refresh();
                    }}
                    type="button"
                  >
                    <PlusIcon />
                    <span>New Chat</span>
                  </SidebarMenuButton>
                </TooltipTrigger>
                <TooltipContent side="right">New Chat</TooltipContent>
              </Tooltip>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent className="group-data-[collapsible=icon]:hidden">
          <SidebarHistory user={user} />
        </SidebarContent>
        <SidebarFooter className="mt-auto">
          <SidebarMenu>
            <SidebarMenuItem>
              <Tooltip>
                <TooltipTrigger asChild>
                  <SidebarMenuButton onClick={toggleSidebar} type="button">
                    <SidebarLeftIcon />
                    <span>
                      {state === "expanded" ? "Close Sidebar" : "Open Sidebar"}
                    </span>
                  </SidebarMenuButton>
                </TooltipTrigger>
                <TooltipContent side="right">
                  {state === "expanded" ? "Close Sidebar" : "Open Sidebar"}
                </TooltipContent>
              </Tooltip>
            </SidebarMenuItem>
            {user && (
              <>
                <SidebarMenuItem>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <SidebarMenuButton
                        onClick={() =>
                          setTheme(resolvedTheme === "dark" ? "light" : "dark")
                        }
                        type="button"
                      >
                        {mounted ? (
                          resolvedTheme === "dark" ? (
                            <SunIcon />
                          ) : (
                            <MoonIcon />
                          )
                        ) : (
                          <div className="animate-spin">
                            <LoaderCircleIcon />
                          </div>
                        )}
                        {mounted && (
                          <span>
                            {resolvedTheme === "dark" ? "Light" : "Dark"} Mode
                          </span>
                        )}
                      </SidebarMenuButton>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      {mounted
                        ? resolvedTheme === "dark"
                          ? "Light"
                          : "Dark"
                        : "Theme"}{" "}
                      Mode
                    </TooltipContent>
                  </Tooltip>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <SidebarMenuButton
                        onClick={() => {
                          setOpenMobile(false);
                          router.push("/settings");
                        }}
                        type="button"
                      >
                        <SettingsIcon />
                        <span>Settings</span>
                      </SidebarMenuButton>
                    </TooltipTrigger>
                    <TooltipContent side="right">Settings</TooltipContent>
                  </Tooltip>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <SidebarMenuButton
                        onClick={() => setShowDeleteAllDialog(true)}
                        type="button"
                      >
                        <TrashIcon />
                        <span>Delete All Chats</span>
                      </SidebarMenuButton>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      Delete All Chats
                    </TooltipContent>
                  </Tooltip>
                </SidebarMenuItem>
              </>
            )}
          </SidebarMenu>
          {user && <SidebarUserNav user={user} />}
        </SidebarFooter>
      </Sidebar>

      <AlertDialog
        onOpenChange={setShowDeleteAllDialog}
        open={showDeleteAllDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete all chats?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete all
              your chats and remove them from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAll}>
              Delete All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
