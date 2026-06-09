import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const normalized = email.trim().toLowerCase();
  return EMAIL_REGEX.test(normalized) && normalized.length <= 254;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { name, email, subject, message } = await req.json();

    if (!name?.trim() || !email?.trim() || !subject?.trim() || !message?.trim()) {
      return new Response(
        JSON.stringify({ error: "Todos os campos são obrigatórios" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!isValidEmail(email)) {
      return new Response(
        JSON.stringify({ error: "Formato de email inválido" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const sanitizedName = name.trim().substring(0, 100);
    const sanitizedSubject = subject.trim().substring(0, 200);
    const sanitizedMessage = message.trim().substring(0, 5000);
    const sanitizedEmail = email.trim().toLowerCase();

    console.log(`Sending contact email from ${sanitizedEmail}, subject: ${sanitizedSubject}`);

    const emailResponse = await resend.emails.send({
      from: "WillFlow <noreply@willflow.app>",
      to: ["geral@willflow.app"],
      replyTo: sanitizedEmail,
      subject: `[Contacto WillFlow] ${sanitizedSubject}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333; border-bottom: 2px solid #6366f1; padding-bottom: 10px;">Nova Mensagem de Contacto</h2>
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr>
              <td style="padding: 8px 12px; font-weight: bold; color: #555; width: 100px;">Nome:</td>
              <td style="padding: 8px 12px;">${sanitizedName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; font-weight: bold; color: #555;">Email:</td>
              <td style="padding: 8px 12px;"><a href="mailto:${sanitizedEmail}">${sanitizedEmail}</a></td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; font-weight: bold; color: #555;">Assunto:</td>
              <td style="padding: 8px 12px;">${sanitizedSubject}</td>
            </tr>
          </table>
          <div style="background: #f9fafb; border-radius: 8px; padding: 16px; margin-top: 16px;">
            <h3 style="margin: 0 0 8px; color: #555; font-size: 14px;">Mensagem:</h3>
            <p style="white-space: pre-wrap; color: #333; line-height: 1.6; margin: 0;">${sanitizedMessage.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
          </div>
          <p style="color: #999; font-size: 12px; margin-top: 24px;">Enviado através do formulário de contacto em willflow.app</p>
        </div>
      `,
    });

    console.log("Contact email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error sending contact email:", error);
    return new Response(
      JSON.stringify({ error: "Erro ao enviar mensagem. Tente novamente." }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
