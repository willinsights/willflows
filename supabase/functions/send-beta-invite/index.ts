import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface BetaInviteEmailRequest {
  email: string;
  name?: string;
  inviteToken: string;
}

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SEND-BETA-INVITE] ${step}${detailsStr}`);
};

const handler = async (req: Request): Promise<Response> => {
  logStep("Function started");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      logStep("ERROR: No authorization header");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      logStep("ERROR: Invalid token", { error: claimsError?.message });
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { email, name, inviteToken }: BetaInviteEmailRequest = await req.json();

    if (!email || !inviteToken) {
      logStep("ERROR: Missing required fields", { email: !!email, inviteToken: !!inviteToken });
      return new Response(
        JSON.stringify({ error: "Email and invite token are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep(`Sending beta invite email to ${email}`);

    // Build the invitation link
    const appUrl = Deno.env.get("APP_URL") || "https://willflow.app";
    const inviteLink = `${appUrl}/auth?invite=${inviteToken}`;

    // Send email using Resend API
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "WillFlow <onboarding@resend.dev>",
        to: [email],
        subject: "🎉 O teu convite para o WillFlow Beta chegou!",
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
                        <div style="display: inline-block; background: rgba(255,255,255,0.2); padding: 8px 16px; border-radius: 100px; margin-bottom: 16px;">
                          <span style="color: #ffffff; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Beta Exclusivo</span>
                        </div>
                        <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">WillFlow</h1>
                        <p style="margin: 10px 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">Gestão de Projetos para Criativos</p>
                      </td>
                    </tr>
                    
                    <!-- Main content -->
                    <tr>
                      <td style="padding: 40px;">
                        <h2 style="margin: 0 0 20px; color: #18181b; font-size: 24px; font-weight: 600;">
                          ${name ? `Olá ${name}! 👋` : 'Olá! 👋'}
                        </h2>
                        
                        <p style="margin: 0 0 20px; color: #52525b; font-size: 16px; line-height: 1.6;">
                          Tens acesso exclusivo ao <strong style="color: #7c3aed;">WillFlow Beta</strong>! Foste selecionado(a) para testar a nossa plataforma antes do lançamento oficial.
                        </p>
                        
                        <div style="background: linear-gradient(135deg, #f0e7ff 0%, #e9d5ff 100%); border-radius: 12px; padding: 20px; margin: 24px 0;">
                          <p style="margin: 0; color: #7c3aed; font-size: 14px; font-weight: 600;">
                            ✨ Como beta tester, vais poder:
                          </p>
                          <ul style="margin: 12px 0 0; padding-left: 20px; color: #52525b; font-size: 14px; line-height: 1.8;">
                            <li>Experimentar todas as funcionalidades em primeira mão</li>
                            <li>Dar feedback direto à equipa de desenvolvimento</li>
                            <li>Ajudar a moldar o futuro do WillFlow</li>
                            <li>Receber benefícios exclusivos no lançamento</li>
                          </ul>
                        </div>
                        
                        <!-- CTA Button -->
                        <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 32px 0;">
                          <tr>
                            <td align="center">
                              <a href="${inviteLink}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); color: #ffffff; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(124, 58, 237, 0.4);">
                                Criar minha conta Beta
                              </a>
                            </td>
                          </tr>
                        </table>
                        
                        <p style="margin: 0; color: #71717a; font-size: 14px; line-height: 1.6;">
                          Se não conseguires clicar no botão, copia e cola este link no teu navegador:
                        </p>
                        <p style="margin: 8px 0 0; padding: 12px; background: #f4f4f5; border-radius: 8px; word-break: break-all;">
                          <a href="${inviteLink}" style="color: #7c3aed; font-size: 13px; text-decoration: none;">${inviteLink}</a>
                        </p>
                        
                        <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 32px 0;">
                        
                        <p style="margin: 0; color: #a1a1aa; font-size: 12px; text-align: center;">
                          Este convite é pessoal e expira em 7 dias. Se não solicitaste este convite, podes ignorar este email.
                        </p>
                      </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                      <td style="padding: 24px 40px; background-color: #f4f4f5; text-align: center;">
                        <p style="margin: 0; color: #a1a1aa; font-size: 12px;">
                          © ${new Date().getFullYear()} WillFlow. Todos os direitos reservados.
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
      }),
    });

    const emailData = await emailResponse.json();

    if (!emailResponse.ok) {
      logStep("ERROR: Resend API error", emailData);
      return new Response(
        JSON.stringify({ error: emailData.message || "Failed to send email" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("Beta invite email sent successfully", { emailId: emailData.id });

    return new Response(JSON.stringify({ success: true, data: emailData }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    logStep("ERROR", { message: error.message });
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
