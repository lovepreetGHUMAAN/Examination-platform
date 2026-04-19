// PATH: lib/email.ts
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER, // your gmail
    pass: process.env.EMAIL_PASS, // app password (NOT normal password)
  },
});

const FROM = process.env.EMAIL_USER;
const BASE_URL = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

export async function sendVerificationEmail(email: string, token: string) {
  const url = `${BASE_URL}/verify-email?token=${token}`;

  try {
    console.log("=== VERIFY EMAIL START ===");
    console.log("Sending to:", email);
    console.log("From:", FROM);
    console.log("EMAIL_USER exists:", !!process.env.EMAIL_USER);

    const info = await transporter.sendMail({
      from: `ExamHub <${FROM}>`,
      to: email,
      subject: "Verify your ExamHub account",
      html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2 style="color:#4f46e5">Welcome to ExamHub!</h2>
        <p>Click the button below to verify your email address. This link expires in <strong>24 hours</strong>.</p>
        <a href="${url}"
           style="display:inline-block;margin:16px 0;padding:12px 24px;background:#4f46e5;color:#fff;
                  border-radius:8px;text-decoration:none;font-weight:600">
          Verify Email
        </a>
        <p style="color:#6b7280;font-size:13px">
          Or copy this link into your browser:<br/>
          <span style="color:#4f46e5">${url}</span>
        </p>
        <p style="color:#6b7280;font-size:12px">If you didn't create an account, you can safely ignore this email.</p>
      </div>
    `,
    });

    console.log("EMAIL SENT SUCCESS:", info.response);
  } catch (error) {
    console.error("EMAIL SEND FAILED:", error);
  }
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const url = `${BASE_URL}/reset-password?token=${token}`;

  try {
    console.log("=== RESET EMAIL START ===");
    console.log("Sending to:", email);

    const info = await transporter.sendMail({
      from: `ExamHub <${FROM}>`,
      to: email,
      subject: "Reset your ExamHub password",
      html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2 style="color:#4f46e5">Password Reset Request</h2>
        <p>Click the button below to reset your password. This link expires in <strong>1 hour</strong>.</p>
        <a href="${url}"
           style="display:inline-block;margin:16px 0;padding:12px 24px;background:#4f46e5;color:#fff;
                  border-radius:8px;text-decoration:none;font-weight:600">
          Reset Password
        </a>
        <p style="color:#6b7280;font-size:13px">
          Or copy this link into your browser:<br/>
          <span style="color:#4f46e5">${url}</span>
        </p>
        <p style="color:#6b7280;font-size:12px">If you didn't request this, you can safely ignore this email.</p>
      </div>
    `,
    });
  } catch (error) {
    console.error("RESET EMAIL FAILED:", error);
  }
}
