"use client";

import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "@/components/toast";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

type MCPTool = {
  name: string;
  title: string;
  description: string;
  inputSchema: {
    type: string;
    properties?: Record<string, unknown>;
    required?: string[];
  };
  annotations?: Record<string, unknown>;
};

export function NetSuiteMCPTools() {
  const { data: session } = useSession();
  const [tools, setTools] = useState<MCPTool[]>([]);
  const [loading, setLoading] = useState(false);

  const isAuthenticated = !!session?.user;

  const fetchTools = useCallback(async () => {
    if (!isAuthenticated) {
      setTools([]);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/netsuite/tools");

      if (!response.ok) {
        // If we get a 400 or 401, it means no connection - clear tools
        if (response.status === 400 || response.status === 401) {
          setTools([]);
          return;
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to fetch MCP tools");
      }

      const data = (await response.json()) as { tools: MCPTool[] };
      setTools(data.tools || []);
    } catch (error) {
      console.error("Failed to fetch MCP tools:", error);
      // Clear tools on error (likely disconnected)
      setTools([]);
      toast({
        type: "error",
        description:
          error instanceof Error ? error.message : "Failed to fetch MCP tools",
      });
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // Check auth status and fetch/clear tools accordingly
  useEffect(() => {
    if (!isAuthenticated) {
      setTools([]);
      return;
    }

    // Check if user has NetSuite connection
    const checkAuthStatus = async () => {
      try {
        const authResponse = await fetch("/api/netsuite/auth");
        if (authResponse.ok) {
          const authData = await authResponse.json();
          if (authData?.accessToken) {
            // User has connection, fetch tools if we don't have any
            if (tools.length === 0) {
              fetchTools();
            }
          } else {
            // No connection, clear tools immediately
            setTools([]);
          }
        } else {
          // Auth fetch failed, clear tools
          setTools([]);
        }
      } catch {
        // Silently fail - user probably not connected, clear tools
        setTools([]);
      }
    };

    // Check immediately
    checkAuthStatus();

    // Listen for disconnect events (immediate response)
    const handleDisconnect = () => {
      setTools([]);
    };
    window.addEventListener("netsuite:disconnected", handleDisconnect);

    // Also listen for connect events to trigger tool fetch
    const handleConnect = () => {
      checkAuthStatus();
    };
    window.addEventListener("netsuite:connected", handleConnect);

    // Listen for visibility changes (when tab becomes active, check auth)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        checkAuthStatus();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Poll for auth status changes (every 3 seconds) as fallback
    const interval = setInterval(() => {
      checkAuthStatus();
    }, 3000);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("netsuite:disconnected", handleDisconnect);
      window.removeEventListener("netsuite:connected", handleConnect);
    };
  }, [isAuthenticated, fetchTools, tools.length]);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Available MCP Tools</CardTitle>
        <CardDescription>
          Tools available from your NetSuite MCP Server
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {tools.length === 0 ? (
          <div className="space-y-2">
            <p className="text-muted-foreground text-sm">
              No tools available. Connect to NetSuite and click "Refresh Tools"
              to fetch available MCP tools.
            </p>
            <Button
              disabled={loading}
              onClick={fetchTools}
              type="button"
              variant="outline"
            >
              {loading ? "Loading..." : "Refresh Tools"}
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-muted-foreground text-sm">
                {tools.length} tool{tools.length !== 1 ? "s" : ""} available
              </p>
              <Button
                disabled={loading}
                onClick={fetchTools}
                size="sm"
                type="button"
                variant="outline"
              >
                {loading ? "Refreshing..." : "Refresh Tools"}
              </Button>
            </div>

            <div className="max-h-[600px] space-y-2 overflow-y-auto">
              {tools.map((tool) => (
                <Collapsible key={tool.name}>
                  <CollapsibleTrigger className="flex w-full items-start justify-between rounded-md border p-3 text-left transition-colors hover:bg-muted">
                    <div className="flex flex-1 items-start gap-2">
                      <div className="mt-2 h-2 w-2 shrink-0 rounded-full bg-green-500" />
                      <div className="flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-sm">
                            {tool.title}
                          </span>
                          <span className="font-mono text-muted-foreground text-xs">
                            {tool.name}
                          </span>
                        </div>
                        <p className="text-muted-foreground text-xs">
                          {tool.description}
                        </p>
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="px-3 pb-3">
                    {tool.inputSchema?.properties && (
                      <div className="mt-2 space-y-2 rounded-md bg-muted p-3">
                        <p className="font-medium text-xs">Input Parameters:</p>
                        <div className="space-y-1">
                          {Object.entries(tool.inputSchema.properties).map(
                            ([key, value]) => {
                              const prop = value as {
                                type?: string;
                                description?: string;
                              };
                              return (
                                <div className="text-xs" key={key}>
                                  <span className="font-medium font-mono">
                                    {key}
                                  </span>
                                  {prop.type && (
                                    <span className="text-muted-foreground">
                                      {" "}
                                      ({prop.type})
                                    </span>
                                  )}
                                  {tool.inputSchema.required?.includes(key) && (
                                    <span className="text-destructive"> *</span>
                                  )}
                                  {prop.description && (
                                    <p className="ml-4 text-muted-foreground">
                                      {prop.description}
                                    </p>
                                  )}
                                </div>
                              );
                            }
                          )}
                        </div>
                      </div>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
