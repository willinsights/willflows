import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SEND-WELCOME-EMAIL] ${step}${detailsStr}`);
};

interface WelcomeEmailRequest {
  email: string;
  name: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // Verify authentication - only authenticated users can trigger welcome emails
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      logStep("ERROR: No authorization header");
      return new Response(
        JSON.stringify({ error: "Unauthorized - No valid authorization header" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      logStep("ERROR: Invalid token", { error: claimsError?.message });
      return new Response(
        JSON.stringify({ error: "Unauthorized - Invalid token" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const userId = claimsData.claims.sub;
    const userEmail = claimsData.claims.email;
    logStep("User authenticated", { userId, userEmail });

    const { email, name }: WelcomeEmailRequest = await req.json();
    
    // Validate input
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      logStep("ERROR: Invalid email input");
      return new Response(
        JSON.stringify({ error: "Invalid email address" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!name || typeof name !== 'string' || name.length > 100) {
      logStep("ERROR: Invalid name input");
      return new Response(
        JSON.stringify({ error: "Invalid name" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Security check: Users can only send welcome emails to themselves
    // or admins can send to workspace members (simplified: only to self for now)
    if (email.toLowerCase() !== userEmail?.toLowerCase()) {
      logStep("ERROR: Cannot send email to different user", { requestedEmail: email, userEmail });
      return new Response(
        JSON.stringify({ error: "Cannot send email to a different user" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    logStep(`Sending welcome email to ${email} (${name})`);

    // Always use production domain for assets
    const appUrl = "https://willflow.app";

    const emailResponse = await resend.emails.send({
      from: "WillFlow <noreply@willflow.app>",
      to: [email],
      subject: "Bem-vindo ao WillFlow! 🎉",
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
                      <img src="${appUrl}/logo-willflow-white.png" alt="WillFlow" style="height: 40px; margin-bottom: 12px;" />
                      <p style="margin: 0; color: rgba(255,255,255,0.9); font-size: 14px;">Gestão de Projetos para Criativos</p>
                    </td>
                  </tr>
                  
                  <!-- Main content -->
                  <tr>
                    <td style="padding: 40px;">
                      <h2 style="margin: 0 0 20px; color: #18181b; font-size: 24px; font-weight: 600;">
                        Olá ${name}! 👋
                      </h2>
                      
                      <p style="margin: 0 0 20px; color: #52525b; font-size: 16px; line-height: 1.6;">
                        Bem-vindo ao <strong style="color: #7c3aed;">WillFlow</strong>! Estamos muito felizes por tê-lo connosco.
                      </p>
                      
                      <p style="margin: 0 0 30px; color: #52525b; font-size: 16px; line-height: 1.6;">
                        O WillFlow foi criado para fotógrafos e filmmakers que querem organizar o seu trabalho de forma profissional, desde a captação até a entrega final.
                      </p>
                      
                      <!-- Features list -->
                      <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
                        <tr>
                          <td style="padding: 12px 16px; background-color: #f4f4f5; border-radius: 8px; margin-bottom: 8px;">
                            <table role="presentation" style="width: 100%; border-collapse: collapse;">
                              <tr>
                                <td style="width: 40px; vertical-align: top;">
                                  <span style="font-size: 20px;">📋</span>
                                </td>
                                <td>
                                  <strong style="color: #18181b; display: block; margin-bottom: 4px;">Kanban Visual</strong>
                                  <span style="color: #71717a; font-size: 14px;">Acompanhe cada projeto no fluxo perfeito</span>
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
                                  <span style="font-size: 20px;">👥</span>
                                </td>
                                <td>
                                  <strong style="color: #18181b; display: block; margin-bottom: 4px;">CRM Integrado</strong>
                                  <span style="color: #71717a; font-size: 14px;">Todos os seus clientes num só lugar</span>
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
                                  <span style="font-size: 20px;">💰</span>
                                </td>
                                <td>
                                  <strong style="color: #18181b; display: block; margin-bottom: 4px;">Finanças</strong>
                                  <span style="color: #71717a; font-size: 14px;">Controle receitas e pagamentos</span>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>
                      
                      <!-- CTA Button -->
                      <table role="presentation" style="width: 100%; border-collapse: collapse;">
                        <tr>
                          <td align="center">
                            <a href="https://willflow.pt/app" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                              Começar a usar o WillFlow
                            </a>
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

    logStep("Welcome email sent successfully", { response: JSON.stringify(emailResponse) });

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    logStep("ERROR", { message: error.message });
    return new Response(
      JSON.stringify({ error: "Failed to send email" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
