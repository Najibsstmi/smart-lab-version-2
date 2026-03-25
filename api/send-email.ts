import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  const { to, subject, html } = req.body;

  try {
    const data = await resend.emails.send({
      from: "Smart Lab <support@cikgustem.com>",
      to: [to],
      subject,
      html,
    });

    res.status(200).json(data);
  } catch (error) {
    res.status(400).json(error);
  }
}
