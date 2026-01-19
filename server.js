import express from "express";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import cors from "cors";
import rateLimit from "express-rate-limit";

dotenv.config();
console.log(
  "Loaded ENV:",
  process.env.SMTP_USER,
  process.env.SMTP_PASS ? "PASSWORD_LOADED" : "NO_PASSWORD"
);

const app = express();
app.use(express.json());
app.use(cors());

// Security: Rate limit Salesforce to avoid spam
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60
});
app.use(limiter);

// SMTP Transporter (WITH TIMEOUTS – IMPORTANT)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: Number(process.env.SMTP_PORT) === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  },
  connectionTimeout: 10_000, // 10 seconds
  greetingTimeout: 10_000,
  socketTimeout: 10_000,
  tls: {
    rejectUnauthorized: false
  }
});

// Health check
app.get("/", (req, res) => {
  res.send("Email API Running");
});

// Main email endpoint (ASYNC – NO POSTMAN TIMEOUT)
app.post("/sendEmail", async (req, res) => {
  const { to, subject, body } = req.body;

  if (!to || !subject || !body) {
    return res.status(400).json({
      status: "error",
      message: "Missing fields"
    });
  }

  // ✅ Respond immediately (important for Postman & Salesforce)
  res.status(202).json({
    status: "queued",
    message: "Email queued for delivery"
  });

  // Send email in background
  transporter
    .sendMail({
      from: `"${process.env.FROM_NAME}" <${process.env.FROM_EMAIL}>`,
      to,
      subject,
      text: body
    })
    .then(info => {
      console.log("Email sent:", info.messageId);
    })
    .catch(err => {
      console.error("Email send failed:", err.message);
    });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
