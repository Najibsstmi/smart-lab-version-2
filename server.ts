import "dotenv/config";
import express from "express";
import { createServer as createViteServer } from "vite";
import { Resend } from "resend";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/send-email", async (req, res) => {
    const { to, subject, html } = req.body;

    if (!to || !subject || !html) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      console.warn("RESEND_API_KEY is not set. Simulating email send.");
      console.log(`[Simulated Email] To: ${to}\nSubject: ${subject}\nBody: ${html}`);
      return res.json({ success: true, simulated: true });
    }

    try {
      const resend = new Resend(resendApiKey);
      const data = await resend.emails.send({
        from: "Smart Lab <support@cikgustem.com>",
        to: [to],
        subject: subject,
        html: html,
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
