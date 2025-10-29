"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import {
  CloudIcon,
  SettingsSlidersIcon,
  SparklesIcon,
} from "@/components/icons";
import { NetSuiteConnection } from "@/components/netsuite-connection";
import { NetSuiteMCPTools } from "@/components/netsuite-mcp-tools";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function SettingsContent() {
  const [activeTab, setActiveTab] = useState("netsuite");

  const tabs = [
    { id: "netsuite", label: "NetSuite", icon: CloudIcon },
    { id: "providers", label: "Providers", icon: SparklesIcon },
    { id: "preferences", label: "Preferences", icon: SettingsSlidersIcon },
  ];

  return (
    <div className="flex-1 overflow-auto">
      <div className="container mx-auto max-w-4xl p-6">
        {/* Tab Navigation */}
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
          initial={{ opacity: 0, y: 10 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex space-x-1 border-b">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <Button
                  className={`flex items-center gap-2 rounded-none border-b-2 px-4 py-2 font-medium text-base transition-colors hover:bg-transparent ${
                    activeTab === tab.id
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:border-muted-foreground hover:text-foreground"
                  }`}
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  variant="ghost"
                >
                  <Icon size={16} />
                  {tab.label}
                </Button>
              );
            })}
          </div>
        </motion.div>

        {/* Tab Content */}
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
          initial={{ opacity: 0, y: 10 }}
          transition={{ delay: 0.2 }}
        >
          {activeTab === "netsuite" ? (
            <div className="space-y-6">
              <NetSuiteConnection />
              <NetSuiteMCPTools />
            </div>
          ) : activeTab === "providers" ? (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">AI Providers</CardTitle>
                  <CardDescription>
                    Manage your AI model providers and API keys
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">
                    AI provider configuration will be available here.
                  </p>
                </CardContent>
              </Card>
            </div>
          ) : activeTab === "preferences" ? (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">General Preferences</CardTitle>
                  <CardDescription>
                    Adjust general application preferences
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">
                    General preferences will be available here.
                  </p>
                </CardContent>
              </Card>
            </div>
          ) : null}
        </motion.div>
      </div>
    </div>
  );
}
