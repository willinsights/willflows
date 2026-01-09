import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface PasswordResetEmailRequest {
  email: string;
  name?: string;
  resetLink: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, name, resetLink }: PasswordResetEmailRequest = await req.json();
    
    const displayName = name || email.split('@')[0];
    
    console.log(`Sending password reset email to ${email}`);

    const emailResponse = await resend.emails.send({
      from: "WillFlow <noreply@willflow.pt>",
      to: [email],
      subject: "Redefinir a sua password - WillFlow",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
          <table role="presentation" style="width: 100%; border-collapse: collapse;">
            <tr>
              <td align="center" style="padding: 40px 20px;">
                <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                  <!-- Header with gradient -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); padding: 40px 40px 30px; text-align: center;">
                      <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">WillFlow</h1>
                      <p style="margin: 10px 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">Gestão de Projetos para Criativos</p>
                    </td>
                  </tr>
                  
                  <!-- Main content -->
                  <tr>
                    <td style="padding: 40px;">
                      <div style="text-align: center; margin-bottom: 30px;">
                        <div style="width: 64px; height: 64px; background-color: #fef3c7; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;">
                          <span style="font-size: 32px;">🔐</span>
                        </div>
                      </div>
                      
                      <h2 style="margin: 0 0 20px; color: #18181b; font-size: 24px; font-weight: 600; text-align: center;">
                        Redefinir password
                      </h2>
                      
                      <p style="margin: 0 0 20px; color: #52525b; font-size: 16px; line-height: 1.6;">
                        Olá ${displayName},
                      </p>
                      
                      <p style="margin: 0 0 20px; color: #52525b; font-size: 16px; line-height: 1.6;">
                        Recebemos um pedido para redefinir a password da sua conta WillFlow. Clique no botão abaixo para criar uma nova password:
                      </p>
                      
                      <!-- CTA Button -->
                      <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 30px 0;">
                        <tr>
                          <td align="center">
                            <a href="${resetLink}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                              Redefinir password
                            </a>
                          </td>
                        </tr>
                      </table>
                      
                      <p style="margin: 0 0 20px; color: #71717a; font-size: 14px; line-height: 1.6;">
                        Se não conseguir clicar no botão, copie e cole o seguinte link no seu browser:
                      </p>
                      
                      <p style="margin: 0 0 20px; padding: 12px 16px; background-color: #f4f4f5; border-radius: 8px; word-break: break-all;">
                        <a href="${resetLink}" style="color: #7c3aed; font-size: 14px; text-decoration: none;">${resetLink}</a>
                      </p>
                      
                      <!-- Warning -->
                      <table role="presentation" style="width: 100%; border-collapse: collapse; margin-top: 30px;">
                        <tr>
                          <td style="padding: 16px; background-color: #fef3c7; border-radius: 8px; border-left: 4px solid #f59e0b;">
                            <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.5;">
                              <strong>⚠️ Nota de segurança:</strong><br>
                              Este link expira em 1 hora. Se não pediu para redefinir a sua password, pode ignorar este email com segurança.
                            </p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="padding: 30px 40px; background-color: #f4f4f5; text-align: center;">
                      <p style="margin: 0 0 10px; color: #71717a; font-size: 14px;">
                        Precisa de ajuda? Responda a este email ou visite o nosso centro de ajuda.
                      </p>
                      <p style="margin: 0; color: #a1a1aa; font-size: 12px;">
                        © 2025 WillFlow. Todos os direitos reservados.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    });

    console.log("Password reset email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-password-reset function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);