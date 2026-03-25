import "dotenv/config";
import express from "express";
import { createServer as createViteServer } from "vite";
import { Resend } from "resend";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 20;
const rateLimitStore = new Map<string, { count: number; windowStart: number }>();

function isRateLimited(key: string, maxRequests: number) {
  const now = Date.now();
  const current = rateLimitStore.get(key);

  if (!current || now - current.windowStart >= RATE_LIMIT_WINDOW_MS) {
    rateLimitStore.set(key, { count: 1, windowStart: now });
    return false;
  }

  if (current.count >= maxRequests) {
    return true;
  }

  current.count += 1;
  rateLimitStore.set(key, current);
  return false;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "100kb" }));

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/send-email", async (req, res) => {
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    if (isRateLimited(`send-email:${ip}`, RATE_LIMIT_MAX_REQUESTS)) {
      return res.status(429).json({ error: "Too many requests" });
    }

    const { to, subject, html } = req.body || {};

    if (typeof to !== "string" || typeof subject !== "string" || typeof html !== "string") {
      return res.status(400).json({ error: "Invalid payload" });
    }

    const toEmail = to.trim().toLowerCase();
    const cleanSubject = subject.trim();
    const cleanHtml = html.trim();

    if (!toEmail || !cleanSubject || !cleanHtml) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (!EMAIL_REGEX.test(toEmail)) {
      return res.status(400).json({ error: "Invalid email address" });
    }

    if (cleanSubject.length > 160) {
      return res.status(400).json({ error: "Subject is too long" });
    }

    if (cleanHtml.length > 20_000) {
      return res.status(400).json({ error: "HTML content is too long" });
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      console.warn("RESEND_API_KEY is not set. Simulating email send.");
      console.log(`[Simulated Email] To: ${toEmail}\nSubject: ${cleanSubject}\nBody: ${cleanHtml}`);
      return res.json({ success: true, simulated: true });
    }

    try {
      const resend = new Resend(resendApiKey);
      const data = await resend.emails.send({
        from: "Smart Lab <support@cikgustem.com>",
        to: [toEmail],
        subject: cleanSubject,
        html: cleanHtml,
      });

      res.json({ success: true, data });
    } catch (error) {
      console.error("Error sending email:", error);
      res.status(500).json({ error: "Failed to send email" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
