import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface BetaWelcomeEmailRequest {
  email: string;
  name: string;
}

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SEND-BETA-WELCOME] ${step}${detailsStr}`);
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

    const { email, name }: BetaWelcomeEmailRequest = await req.json();

    if (!email) {
      logStep("ERROR: Missing email");
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep(`Sending beta welcome email to ${email}`);

    const appUrl = Deno.env.get("APP_URL") || "https://willflow.app";

    // Send email using Resend API
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "WillFlow <noreply@willflow.app>",
        to: [email],
        subject: "🎉 Bem-vindo ao WillFlow Beta!",
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
                        <img src="${appUrl}/logo-willflow-white.png" alt="WillFlow" style="height: 40px; margin-bottom: 16px;" />
                        <div style="display: inline-block; background: rgba(255,255,255,0.2); padding: 8px 16px; border-radius: 100px; margin-bottom: 8px;">
                          <span style="color: #ffffff; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">✓ Conta Criada</span>
                        </div>
                        <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">Bem-vindo!</h1>
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
                          A tua conta foi criada com sucesso! Estás oficialmente entre os primeiros a experimentar o <strong style="color: #7c3aed;">WillFlow</strong>.
                        </p>
                        
                        <div style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border-left: 4px solid #22c55e; border-radius: 0 12px 12px 0; padding: 20px; margin: 24px 0;">
                          <p style="margin: 0; color: #166534; font-size: 14px; font-weight: 600;">
                            🎁 Benefícios exclusivos de beta tester:
                          </p>
                          <ul style="margin: 12px 0 0; padding-left: 20px; color: #166534; font-size: 14px; line-height: 1.8;">
                            <li>Acesso antecipado a todas as funcionalidades</li>
                            <li>Desconto especial no lançamento oficial</li>
                            <li>Canal direto para feedback e suporte</li>
                            <li>Contribuição para moldar o produto final</li>
                          </ul>
                        </div>
                        
                        <h3 style="margin: 24px 0 16px; color: #18181b; font-size: 18px; font-weight: 600;">
                          Próximos passos:
                        </h3>
                        
                        <!-- Steps -->
                        <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
                          <tr>
                            <td style="padding: 12px 16px; background-color: #f4f4f5; border-radius: 8px; margin-bottom: 8px;">
                              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                                <tr>
                                  <td style="width: 40px; vertical-align: top;">
                                    <div style="width: 28px; height: 28px; background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); border-radius: 50%; text-align: center; line-height: 28px; color: white; font-weight: 600; font-size: 14px;">1</div>
                                  </td>
                                  <td>
                                    <strong style="color: #18181b; display: block; margin-bottom: 4px;">Cria o teu primeiro workspace</strong>
                                    <span style="color: #71717a; font-size: 14px;">Personaliza as colunas do Kanban para o teu fluxo</span>
                                  </td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                          <tr><td style="height: 8px;"></td></tr>
                          <tr>
                            <td style="padding: 12px 16px; background-color: #f4f4f5; border-radius: 8px;">
                              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                                <tr>
                                  <td style="width: 40px; vertical-align: top;">
                                    <div style="width: 28px; height: 28px; background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); border-radius: 50%; text-align: center; line-height: 28px; color: white; font-weight: 600; font-size: 14px;">2</div>
                                  </td>
                                  <td>
                                    <strong style="color: #18181b; display: block; margin-bottom: 4px;">Adiciona os teus clientes</strong>
                                    <span style="color: #71717a; font-size: 14px;">Centraliza toda a informação num só lugar</span>
                                  </td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                          <tr><td style="height: 8px;"></td></tr>
                          <tr>
                            <td style="padding: 12px 16px; background-color: #f4f4f5; border-radius: 8px;">
                              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                                <tr>
                                  <td style="width: 40px; vertical-align: top;">
                                    <div style="width: 28px; height: 28px; background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); border-radius: 50%; text-align: center; line-height: 28px; color: white; font-weight: 600; font-size: 14px;">3</div>
                                  </td>
                                  <td>
                                    <strong style="color: #18181b; display: block; margin-bottom: 4px;">Cria o teu primeiro projeto</strong>
                                    <span style="color: #71717a; font-size: 14px;">Acompanha cada detalhe da captação à entrega</span>
                                  </td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                        </table>
                        
                        <!-- CTA Button -->
                        <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 32px 0;">
                          <tr>
                            <td align="center">
                              <a href="${appUrl}/app" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); color: #ffffff; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(124, 58, 237, 0.4);">
                                Começar a usar o WillFlow
                              </a>
                            </td>
                          </tr>
                        </table>
                        
                        <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 32px 0;">
                        
                        <p style="margin: 0; color: #71717a; font-size: 14px; text-align: center;">
                          Tens alguma dúvida ou feedback? Responde diretamente a este email!
                        </p>
                      </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                      <td style="padding: 24px 40px; background-color: #f4f4f5; text-align: center;">
                        <p style="margin: 0 0 8px; color: #71717a; font-size: 12px;">
                          Obrigado por fazeres parte do beta! 💜
                        </p>
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

    logStep("Beta welcome email sent successfully", { emailId: emailData.id });

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
