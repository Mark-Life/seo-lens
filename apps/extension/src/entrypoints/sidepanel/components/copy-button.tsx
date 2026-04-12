import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import { Check, Copy } from "lucide-react";
import { type MouseEvent, useState } from "react";

interface CopyButtonProps {
  label?: string;
  payload: string;
  size?: "sm" | "md";
  stopPropagation?: boolean;
}

export function CopyButton({
  payload,
  label = "Copy",
  size = "md",
  stopPropagation,
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  function onClick(e: MouseEvent) {
    if (stopPropagation) {
      e.stopPropagation();
    }
    navigator.clipboard.writeText(payload).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    });
  }

  const dimensions = size === "sm" ? "size-5" : "size-7";
  const iconSize = size === "sm" ? "size-3" : "size-3.5";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          aria-label={copied ? "Copied" : label}
          className={`inline-flex ${dimensions} shrink-0 items-center justify-center rounded-sm border border-transparent text-muted-foreground transition-colors hover:border-border hover:bg-muted hover:text-foreground ${
            copied ? "text-primary" : ""
          }`}
          onClick={onClick}
          type="button"
        >
          {copied ? (
            <Check className={iconSize} />
          ) : (
            <Copy className={iconSize} />
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side="left">{copied ? "Copied" : label}</TooltipContent>
    </Tooltip>
  );
}
