"use client";

import { useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useAlertCount } from "@/lib/api/alert-hooks";
import { AlertPanel } from "./alert-panel";

export function AlertBell() {
  const { count } = useAlertCount();
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          {count.total > 0 && (
            <span
              className={`absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white ${
                count.critical > 0 ? "bg-red-500" : "bg-yellow-500"
              }`}
            >
              {count.total > 99 ? "99+" : count.total}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[420px] sm:w-[480px] p-0 flex flex-col gap-0">
        <AlertPanel onClose={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
