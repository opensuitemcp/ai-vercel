"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowLeftIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";

export function SettingsHeaderAnimated() {
  return (
    <div className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
      <Button asChild className="h-8 w-8" size="icon" variant="ghost">
        <Link href="/">
          <ArrowLeftIcon />
        </Link>
      </Button>
      <motion.h1
        animate={{ opacity: 1, y: 0 }}
        className="font-semibold text-lg md:text-xl"
        exit={{ opacity: 0, y: 10 }}
        initial={{ opacity: 0, y: 10 }}
        transition={{ delay: 0 }}
      >
        Settings
      </motion.h1>
    </div>
  );
}
