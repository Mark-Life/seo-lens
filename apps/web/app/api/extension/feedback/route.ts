import { env } from "@workspace/env/web";
import { Bot } from "grammy";
import { after } from "next/server";
import { z } from "zod";

const bodySchema = z.object({
  message: z.string().min(5).max(4000),
  email: z.string().email().max(200).optional(),
  context: z.object({
    url: z.string().max(2000),
    title: z.string().max(500).optional(),
    userAgent: z.string().max(500).optional(),
    extensionVersion: z.string().max(50),
  }),
});

type Body = z.infer<typeof bodySchema>;

const corsHeaders = (origin: string | null) => {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
  if (origin?.startsWith("chrome-extension://")) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
  return headers;
};

const escapeHtml = (s: string) =>
  s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

const formatMessage = (body: Body) => {
  const { message, email, context } = body;
  const from = email ? escapeHtml(email) : "anonymous";
  const url = escapeHtml(context.url);
  const title = context.title ? escapeHtml(context.title) : "—";
  const ver = escapeHtml(context.extensionVersion);
  const ua = context.userAgent ? escapeHtml(context.userAgent) : "—";
  return [
    "<b>SEO Lens feedback</b>",
    `<b>From:</b> ${from}`,
    `<b>URL:</b> ${url}`,
    `<b>Title:</b> ${title}`,
    `<b>Ext:</b> ${ver} · <b>UA:</b> ${ua}`,
    "",
    escapeHtml(message),
  ].join("\n");
};

export const OPTIONS = (request: Request) =>
  new Response(null, {
    status: 204,
    headers: corsHeaders(request.headers.get("origin")),
  });

export const POST = async (request: Request) => {
  const origin = request.headers.get("origin");
  const headers = corsHeaders(origin);

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400, headers });
  }

  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return Response.json(
      { error: "invalid_body", issues: parsed.error.issues },
      { status: 400, headers }
    );
  }

  const body = parsed.data;

  after(async () => {
    try {
      const bot = new Bot(env.TELEGRAM_BOT_TOKEN);
      await bot.api.sendMessage(env.TELEGRAM_CHAT_ID, formatMessage(body), {
        parse_mode: "HTML",
        link_preview_options: { is_disabled: true },
      });
    } catch (error) {
      console.error("[feedback] telegram send failed", error);
    }
  });

  return Response.json({ ok: true }, { status: 200, headers });
};
