import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export function Card({ className, ...rest }: ComponentProps<"div">) {
  return <div className={cn("rounded-2xl border border-gray-100 bg-white shadow-card", className)} {...rest} />;
}
