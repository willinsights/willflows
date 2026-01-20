import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface BetaInviteEmailRequest {
  email: string;
  name?: string;
  inviteToken: string;
  freeDays?: number;
}

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SEND-BETA-INVITE] ${step}${detailsStr}`);
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Starting beta invite email process");

    // Verify the user is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      logStep("No authorization header found");
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const { email, name, inviteToken, freeDays = 30 }: BetaInviteEmailRequest = await req.json();
    logStep("Request data parsed", { email, hasName: !!name, hasToken: !!inviteToken, freeDays });

    if (!email || !inviteToken) {
      logStep("Missing required fields");
      return new Response(
        JSON.stringify({ error: "Email and inviteToken are required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Use production URL for invite links
    const baseUrl = "https://willflows.lovable.app";
    const inviteLink = `${baseUrl}/auth?token=${inviteToken}`;
    logStep("Generated invite link", { inviteLink });

    const displayName = name || email.split('@')[0];

    const emailResponse = await resend.emails.send({
      from: "Willflow <hello@willflow.pt>",
      to: [email],
      subject: `🎉 Convite Exclusivo: ${freeDays} dias grátis no Willflow!`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Convite Beta Willflow</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse;">
          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom: 32px;">
              <img src="https://willflows.lovable.app/logo-willflow-white.png" alt="Willflow" style="height: 40px; width: auto;">
            </td>
          </tr>
          
          <!-- Main Card -->
          <tr>
            <td style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; padding: 48px 40px; border: 1px solid rgba(139, 92, 246, 0.3);">
              <!-- Badge -->
              <table role="presentation" style="width: 100%; margin-bottom: 24px;">
                <tr>
                  <td align="center">
                    <span style="background: linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%); color: white; padding: 8px 16px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                      ✨ Acesso Exclusivo
                    </span>
                  </td>
                </tr>
              </table>
              
              <!-- Title -->
              <h1 style="color: #ffffff; font-size: 28px; font-weight: 700; text-align: center; margin: 0 0 16px 0; line-height: 1.3;">
                Olá${name ? `, ${displayName}` : ''}! 👋
              </h1>
              
              <!-- Subtitle -->
              <p style="color: #a1a1aa; font-size: 18px; text-align: center; margin: 0 0 32px 0; line-height: 1.6;">
                Foste selecionado para aceder ao <strong style="color: #8b5cf6;">Willflow</strong> com <strong style="color: #22c55e;">${freeDays} dias grátis!</strong>
              </p>
              
              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; margin-bottom: 32px;">
                <tr>
                  <td align="center">
                    <a href="${inviteLink}" style="display: inline-block; background: linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 12px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 24px rgba(139, 92, 246, 0.4);">
                      Criar Minha Conta →
                    </a>
                  </td>
                </tr>
              </table>
              
              <!-- Features -->
              <table role="presentation" style="width: 100%; background: rgba(0,0,0,0.2); border-radius: 12px; padding: 24px;">
                <tr>
                  <td>
                    <p style="color: #8b5cf6; font-size: 14px; font-weight: 600; text-transform: uppercase; margin: 0 0 16px 0; letter-spacing: 0.5px;">
                      O que vais ter acesso:
                    </p>
                    <table role="presentation" style="width: 100%;">
                      <tr>
                        <td style="padding: 8px 0;">
                          <span style="color: #22c55e; margin-right: 8px;">✓</span>
                          <span style="color: #e4e4e7;">Gestão completa de projetos</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0;">
                          <span style="color: #22c55e; margin-right: 8px;">✓</span>
                          <span style="color: #e4e4e7;">Calendário e agendamentos</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0;">
                          <span style="color: #22c55e; margin-right: 8px;">✓</span>
                          <span style="color: #e4e4e7;">Controlo financeiro simplificado</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0;">
                          <span style="color: #22c55e; margin-right: 8px;">✓</span>
                          <span style="color: #e4e4e7;">Chat e colaboração em equipa</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding-top: 32px;">
              <p style="color: #71717a; font-size: 14px; text-align: center; margin: 0 0 8px 0;">
                Este convite expira em ${freeDays} dias.
              </p>
              <p style="color: #52525b; font-size: 12px; text-align: center; margin: 0;">
                Se não conseguires clicar no botão, copia este link:<br>
                <a href="${inviteLink}" style="color: #8b5cf6; word-break: break-all;">${inviteLink}</a>
              </p>
            </td>
          </tr>
          
          <!-- Social -->
          <tr>
            <td align="center" style="padding-top: 32px;">
              <p style="color: #52525b; font-size: 12px; margin: 0;">
                © 2025 Willflow. Feito com 💜 em Portugal.
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

    logStep("Email sent successfully", { emailResponse });

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    logStep("Error in send-beta-invite function", { error: error.message });
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

Deno.serve(handler);
