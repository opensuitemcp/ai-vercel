"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { EyeIcon, EyeOffIcon } from "@/components/icons";
import { toast } from "@/components/toast";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toggle } from "@/components/ui/toggle";

type NetSuiteAuthData = {
  accountId: string;
  clientId: string;
  accessToken?: string | null;
  tokenExpiresAt?: Date | null;
  autoRefresh?: boolean;
};

export function NetSuiteConnection() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [accountId, setAccountId] = useState("");
  const [clientId, setClientId] = useState("");
  const [netsuiteAuth, setNetsuiteAuth] = useState<NetSuiteAuthData | null>(
    null
  );
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [updatingAutoRefresh, setUpdatingAutoRefresh] = useState(false);
  const [showAccountId, setShowAccountId] = useState(true);
  const [showClientId, setShowClientId] = useState(false);

  const isAuthenticated = !!session?.user;
  const userId = session?.user?.id;
  const isGuest = session?.user?.type === "guest";
  const processedSuccessParam = useRef<string | null>(null);

  const fetchNetSuiteAuth = useCallback(async () => {
    if (!userId) {
      return;
    }

    try {
      const response = await fetch("/api/netsuite/auth");
      if (response.ok) {
        const data = (await response.json()) as NetSuiteAuthData | null;
        if (data) {
          setNetsuiteAuth(data);
          setAccountId(data.accountId);
          setClientId(data.clientId);
          setAutoRefresh(data.autoRefresh ?? true);
        } else {
          setNetsuiteAuth(null);
          setAccountId("");
          setClientId("");
          setAutoRefresh(true);
        }
      }
    } catch (error) {
      console.error("Failed to fetch NetSuite auth:", error);
    }
  }, [userId]);

  // Check for success/error from OAuth callback
  useEffect(() => {
    const success = searchParams.get("success");
    const error = searchParams.get("error");

    if (success === "connected") {
      // Only show toast once per unique success param value
      const successKey = `success-${success}`;
      if (processedSuccessParam.current !== successKey) {
        processedSuccessParam.current = successKey;
        toast({
          type: "success",
          description: "Successfully connected to NetSuite",
        });
        // Clear the query parameter immediately
        router.replace("/settings?tab=netsuite");
        // Refresh NetSuite auth data
        fetchNetSuiteAuth();
        // Dispatch event to notify MCP tools component
        window.dispatchEvent(new CustomEvent("netsuite:connected"));
      }
    } else if (error) {
      const errorMessages: Record<string, string> = {
        netsuite_oauth_error: "NetSuite OAuth authorization was declined",
        no_authorization_code: "No authorization code received",
        missing_code_verifier: "Missing code verifier. Please try again.",
        token_exchange_failed:
          "Failed to exchange authorization code for tokens",
        oauth_callback_failed: "OAuth callback failed. Please try again.",
        guests_not_allowed:
          "NetSuite connections are only available to registered users. Please create an account to use this feature.",
      };
      toast({
        type: "error",
        description: errorMessages[error] || "An error occurred during OAuth",
      });
      router.replace("/settings?tab=netsuite");
    }
  }, [searchParams, router, fetchNetSuiteAuth]);

  // Fetch NetSuite auth data on mount
  useEffect(() => {
    if (isAuthenticated && userId) {
      fetchNetSuiteAuth();
    }
  }, [isAuthenticated, userId, fetchNetSuiteAuth]);

  const handleConnect = () => {
    if (!accountId.trim() || !clientId.trim()) {
      toast({
        type: "error",
        description: "Please enter both Account ID and Client ID",
      });
      return;
    }

    setLoading(true);
    try {
      // Initiate OAuth flow - this will redirect to NetSuite
      const initiateUrl = `/api/netsuite/oauth/initiate?accountId=${encodeURIComponent(
        accountId.trim()
      )}&clientId=${encodeURIComponent(clientId.trim())}`;
      window.location.href = initiateUrl;
    } catch (error) {
      console.error("Failed to initiate OAuth:", error);
      toast({
        type: "error",
        description: "Failed to initiate NetSuite OAuth",
      });
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (!netsuiteAuth) {
      return;
    }

    setRefreshing(true);
    try {
      const response = await fetch("/api/netsuite/refresh", {
        method: "POST",
      });

      if (response.ok) {
        const refreshData = (await response.json()) as {
          accessToken: string;
          expiresAt: string; // JSON serializes Date as ISO string
        };

        // Parse the expiration date string to Date object
        const newExpiresAt = refreshData.expiresAt
          ? new Date(refreshData.expiresAt)
          : null;

        // Update state with the refreshed data immediately
        setNetsuiteAuth((prev) => {
          if (!prev) {
            return prev;
          }
          return {
            ...prev,
            accessToken: refreshData.accessToken || prev.accessToken,
            tokenExpiresAt: newExpiresAt,
          };
        });

        toast({
          type: "success",
          description: "Token refreshed successfully",
        });
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to refresh token");
      }
    } catch (error) {
      console.error("Failed to refresh token:", error);
      toast({
        type: "error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to refresh NetSuite token",
      });
    } finally {
      setRefreshing(false);
    }
  };

  const handleAutoRefreshToggle = async (checked: boolean) => {
    if (!isConnected || !isAuthenticated) {
      return;
    }

    setUpdatingAutoRefresh(true);
    try {
      const response = await fetch("/api/netsuite/auto-refresh", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ autoRefresh: checked }),
      });

      if (response.ok) {
        setAutoRefresh(checked);
        toast({
          type: "success",
          description: `Auto-refresh ${checked ? "enabled" : "disabled"}`,
        });
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to update auto-refresh");
      }
    } catch (error) {
      console.error("Failed to update auto-refresh:", error);
      toast({
        type: "error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to update auto-refresh setting",
      });
    } finally {
      setUpdatingAutoRefresh(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Are you sure you want to disconnect from NetSuite?")) {
      return;
    }

    setDisconnecting(true);
    try {
      const response = await fetch("/api/netsuite/disconnect", {
        method: "DELETE",
      });

      if (response.ok) {
        setNetsuiteAuth(null);
        setAccountId("");
        setClientId("");
        setAutoRefresh(true);
        // Dispatch custom event to notify other components (like MCP tools)
        window.dispatchEvent(new CustomEvent("netsuite:disconnected"));
        toast({
          type: "success",
          description: "Disconnected from NetSuite",
        });
      } else {
        throw new Error("Failed to disconnect");
      }
    } catch (error) {
      console.error("Failed to disconnect:", error);
      toast({
        type: "error",
        description: "Failed to disconnect from NetSuite",
      });
    } finally {
      setDisconnecting(false);
    }
  };

  const isConnected = !!netsuiteAuth?.accessToken;
  const tokenExpiresAt = netsuiteAuth?.tokenExpiresAt
    ? new Date(netsuiteAuth.tokenExpiresAt)
    : null;
  const isTokenExpired =
    tokenExpiresAt && tokenExpiresAt.getTime() < Date.now();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">NetSuite Connection</CardTitle>
        <CardDescription>
          Configure your NetSuite integration settings using OAuth 2.0 PKCE
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isGuest ? (
          <div className="space-y-3 rounded-md border border-muted bg-muted/50 p-4">
            <div className="space-y-2">
              <p className="font-medium text-sm">
                NetSuite connections require a registered account
              </p>
              <p className="text-muted-foreground text-xs">
                Guest users cannot connect to NetSuite. Please create an account
                or log in to use this feature.
              </p>
            </div>
            <Button asChild type="button">
              <Link href="/login">Log In</Link>
            </Button>
          </div>
        ) : isAuthenticated ? (
          <>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="accountId">NetSuite Account ID</Label>
                <div className="relative">
                  <Input
                    disabled={!isAuthenticated || isConnected}
                    id="accountId"
                    onChange={(e) => {
                      setAccountId(e.target.value);
                    }}
                    placeholder="TSTDRV123456"
                    type={showAccountId ? "text" : "password"}
                    value={accountId}
                  />
                  {isConnected && (
                    <Button
                      className="absolute top-1 right-1 h-7 w-7 p-0"
                      onClick={() => {
                        setShowAccountId(!showAccountId);
                      }}
                      type="button"
                      variant="ghost"
                    >
                      {showAccountId ? (
                        <EyeIcon size={14} />
                      ) : (
                        <EyeOffIcon size={14} />
                      )}
                      <span className="sr-only">
                        {showAccountId ? "Hide" : "Show"} Account ID
                      </span>
                    </Button>
                  )}
                </div>
                <p className="text-muted-foreground text-xs">
                  Your NetSuite account ID (without .app.netsuite.com)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="clientId">Client ID</Label>
                <div className="relative">
                  <Input
                    disabled={!isAuthenticated || isConnected}
                    id="clientId"
                    onChange={(e) => {
                      setClientId(e.target.value);
                    }}
                    placeholder="your-client-id"
                    type={showClientId ? "text" : "password"}
                    value={clientId}
                  />
                  {isConnected && (
                    <Button
                      className="absolute top-1 right-1 h-7 w-7 p-0"
                      onClick={() => {
                        setShowClientId(!showClientId);
                      }}
                      type="button"
                      variant="ghost"
                    >
                      {showClientId ? (
                        <EyeIcon size={14} />
                      ) : (
                        <EyeOffIcon size={14} />
                      )}
                      <span className="sr-only">
                        {showClientId ? "Hide" : "Show"} Client ID
                      </span>
                    </Button>
                  )}
                </div>
                <p className="text-muted-foreground text-xs">
                  Your OAuth 2.0 Client ID from the Integration record
                </p>
              </div>
            </div>

            {isConnected && (
              <div className="space-y-3 rounded-md bg-muted p-3">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <span className="font-medium text-sm">
                    Connected to NetSuite
                  </span>
                </div>
                {tokenExpiresAt && (
                  <p className="text-muted-foreground text-xs">
                    Token expires: {tokenExpiresAt.toLocaleString()}{" "}
                    {isTokenExpired && (
                      <span className="text-destructive">(Expired)</span>
                    )}
                  </p>
                )}
                <div className="flex items-center justify-between gap-4 border-muted-foreground/20 border-t pt-3">
                  <div className="flex-1">
                    <Label
                      className="cursor-pointer text-sm"
                      htmlFor="auto-refresh"
                    >
                      Auto-refresh
                    </Label>
                    <p className="text-muted-foreground text-xs">
                      Automatically refresh token when it&apos;s about to expire
                    </p>
                  </div>
                  <Toggle
                    aria-label="Auto-refresh NetSuite token"
                    checked={autoRefresh}
                    disabled={updatingAutoRefresh}
                    onChange={(checked) => {
                      handleAutoRefreshToggle(checked);
                    }}
                  />
                </div>
              </div>
            )}

            <div className="flex gap-2">
              {isConnected ? (
                <>
                  <Button
                    disabled={refreshing || disconnecting}
                    onClick={handleRefresh}
                    type="button"
                    variant="outline"
                  >
                    {refreshing ? "Refreshing..." : "Refresh Token"}
                  </Button>
                  <Button
                    disabled={refreshing || disconnecting}
                    onClick={handleDisconnect}
                    type="button"
                    variant="destructive"
                  >
                    {disconnecting ? "Disconnecting..." : "Disconnect"}
                  </Button>
                </>
              ) : (
                <Button
                  disabled={loading || !accountId.trim() || !clientId.trim()}
                  onClick={handleConnect}
                  type="button"
                >
                  {loading ? "Connecting..." : "Connect to NetSuite"}
                </Button>
              )}
            </div>
          </>
        ) : (
          <p className="text-muted-foreground text-sm">
            Please log in to configure NetSuite connection.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
