import type { PageData } from "@workspace/seo-rules/shapes";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";
import { Textarea } from "@workspace/ui/components/textarea";
import { MessageSquare, Send } from "lucide-react";
import { type SyntheticEvent, useState } from "react";

const FEEDBACK_URL =
  import.meta.env.VITE_FEEDBACK_URL ??
  "https://seo-lens.dev/api/extension/feedback";

const MIN_LEN = 5;
const MAX_LEN = 4000;

type Status = "idle" | "sending" | "sent" | "error";

interface FeedbackDialogProps {
  readonly page?: PageData;
}

export const FeedbackDialog = ({ page }: FeedbackDialogProps) => {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  const trimmed = message.trim();
  const tooShort = trimmed.length > 0 && trimmed.length < MIN_LEN;
  const canSubmit = trimmed.length >= MIN_LEN && status !== "sending";

  const onSubmit = async (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canSubmit) {
      return;
    }
    setStatus("sending");
    setError(null);

    const body = {
      message: trimmed,
      email: email.trim() || undefined,
      context: {
        url: page?.url,
        title: page?.title,
        userAgent: navigator.userAgent,
        extensionVersion: browser.runtime.getManifest().version,
      },
    };

    try {
      const res = await fetch(FEEDBACK_URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      setStatus("sent");
      setMessage("");
      setEmail("");
      setTimeout(() => {
        setStatus("idle");
        setOpen(false);
      }, 1500);
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Send failed");
    }
  };

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button
          className="h-7 gap-1.5 px-2 font-mono text-[10px] uppercase tracking-wider"
          size="sm"
          variant="ghost"
        >
          <MessageSquare className="size-3" />
          Feedback
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Feedback</DialogTitle>
          <DialogDescription>
            Bug or idea? Sends the current URL, page title, user agent, and
            extension version along with your note. Only the maintainer sees
            this.
          </DialogDescription>
        </DialogHeader>

        <form className="contents" id="feedback-form" onSubmit={onSubmit}>
          <FieldGroup>
            <Field data-invalid={tooShort || undefined}>
              <FieldLabel htmlFor="feedback-message">Message</FieldLabel>
              <Textarea
                className="min-h-28"
                disabled={status === "sending"}
                id="feedback-message"
                maxLength={MAX_LEN}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="What's broken or what could be better?"
                value={message}
              />
              <FieldDescription className="tabular-nums">
                {trimmed.length}/{MAX_LEN}
              </FieldDescription>
              {tooShort && (
                <FieldError>
                  Please enter at least {MIN_LEN} characters.
                </FieldError>
              )}
            </Field>

            <Field>
              <FieldLabel htmlFor="feedback-email">
                Email{" "}
                <span className="text-muted-foreground/60">(optional)</span>
              </FieldLabel>
              <Input
                disabled={status === "sending"}
                id="feedback-email"
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                type="email"
                value={email}
              />
            </Field>
          </FieldGroup>
        </form>

        <DialogFooter>
          <div className="flex flex-1 items-center text-[11px]">
            {status === "sent" && (
              <span className="text-primary">Thanks — sent.</span>
            )}
            {status === "error" && (
              <span className="text-destructive">
                Couldn't send{error ? `: ${error}` : ""}.
              </span>
            )}
          </div>
          <Button
            disabled={!canSubmit}
            form="feedback-form"
            size="sm"
            type="submit"
          >
            <Send className="size-3" />
            {status === "sending" ? "Sending…" : "Send"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
