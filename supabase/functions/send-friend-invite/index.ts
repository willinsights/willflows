import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { validateEmail } from "../_shared/email-validator.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FriendInviteRequest {
  recipientEmail: string;
  recipientName: string;
  senderName: string;
  customMessage?: string;
}

const generateEmailHTML = (recipientName: string, senderName: string, customMessage?: string) => `
<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Convite WillFlow</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #09090b;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.5), 0 0 60px rgba(124, 58, 237, 0.15);">
          
          <!-- Header com gradiente roxo para cinza escuro -->
          <tr>
            <td style="background: linear-gradient(135deg, #7c3aed 0%, #1a1a2e 100%); border-radius: 16px 16px 0 0; padding: 40px 30px; text-align: center;">
              <img src="https://willflows.lovable.app/logo-willflow-white.png" alt="WillFlow" style="height: 40px; margin-bottom: 16px;">
              <h1 style="color: #ffffff; font-size: 28px; font-weight: 700; margin: 0; text-shadow: 0 2px 8px rgba(0,0,0,0.3);">
                ✨ Convite Especial ✨
              </h1>
            </td>
          </tr>
          
          <!-- Corpo principal -->
          <tr>
            <td style="background-color: #18181b; padding: 40px 30px;">
              
              <!-- Saudação -->
              <p style="color: #fafafa; font-size: 20px; font-weight: 600; margin: 0 0 16px 0;">
                Olá <span style="color: #00E5E5;">${recipientName}</span>! 👋
              </p>
              
              <p style="color: #a1a1aa; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                O(a) <strong style="color: #a78bfa;">${senderName}</strong> acha que o WillFlow vai transformar a forma como geres os teus projetos de foto e vídeo.
              </p>
              
              ${customMessage ? `
              <div style="background: linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%); border-left: 4px solid #00E5E5; padding: 16px; margin: 0 0 24px 0; border-radius: 0 8px 8px 0;">
                <p style="color: #d4d4d8; font-size: 14px; font-style: italic; margin: 0;">
                  "${customMessage}"
                </p>
                <p style="color: #00E5E5; font-size: 13px; font-weight: 500; margin: 8px 0 0 0;">
                  — ${senderName}
                </p>
              </div>
              ` : ''}
              
              <!-- Box destaque 30 dias com borda cyan -->
              <div style="background: linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%); border: 2px solid #00E5E5; border-radius: 12px; padding: 24px; text-align: center; margin: 0 0 32px 0; box-shadow: 0 0 30px rgba(0, 229, 229, 0.2);">
                <p style="color: #00E5E5; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 8px 0;">
                  🎁 Oferta Especial
                </p>
                <p style="color: #00E5E5; font-size: 32px; font-weight: 800; margin: 0 0 8px 0; text-shadow: 0 0 20px rgba(0, 229, 229, 0.5);">
                  30 DIAS GRÁTIS
                </p>
                <p style="color: #a1a1aa; font-size: 14px; margin: 0;">
                  Sem cartão de crédito. Sem compromisso.
                </p>
              </div>
              
              <!-- Headline -->
              <h2 style="color: #fafafa; font-size: 22px; font-weight: 700; text-align: center; margin: 0 0 8px 0;">
                O CRM + Kanban feito para Foto e Vídeo
              </h2>
              <p style="color: #a78bfa; font-size: 16px; font-weight: 500; text-align: center; margin: 0 0 24px 0;">
                Captação → Edição → Entrega. Tudo automático.
              </p>
              
              <!-- 3 Cards de fases com fundo escuro -->
              <table role="presentation" style="width: 100%; border-collapse: separate; border-spacing: 8px; margin: 0 0 32px 0;">
                <tr>
                  <td style="width: 33%; background-color: #27272a; border: 1px solid #3f3f46; border-radius: 8px; padding: 16px; text-align: center; vertical-align: top;">
                    <div style="background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); width: 40px; height: 40px; border-radius: 8px; margin: 0 auto 12px; display: flex; align-items: center; justify-content: center;">
                      <span style="font-size: 20px;">📸</span>
                    </div>
                    <p style="color: #a78bfa; font-size: 14px; font-weight: 600; margin: 0 0 4px 0;">CAPTAÇÃO</p>
                    <p style="color: #71717a; font-size: 12px; margin: 0;">Organiza sessões e gravações</p>
                  </td>
                  <td style="width: 33%; background-color: #27272a; border: 1px solid #3f3f46; border-radius: 8px; padding: 16px; text-align: center; vertical-align: top;">
                    <div style="background: linear-gradient(135deg, #00E5E5 0%, #06b6d4 100%); width: 40px; height: 40px; border-radius: 8px; margin: 0 auto 12px; display: flex; align-items: center; justify-content: center;">
                      <span style="font-size: 20px;">🎬</span>
                    </div>
                    <p style="color: #00E5E5; font-size: 14px; font-weight: 600; margin: 0 0 4px 0;">EDIÇÃO</p>
                    <p style="color: #71717a; font-size: 12px; margin: 0;">Fluxo automático de trabalho</p>
                  </td>
                  <td style="width: 33%; background-color: #27272a; border: 1px solid #3f3f46; border-radius: 8px; padding: 16px; text-align: center; vertical-align: top;">
                    <div style="background: linear-gradient(135deg, #22c55e 0%, #4ade80 100%); width: 40px; height: 40px; border-radius: 8px; margin: 0 auto 12px; display: flex; align-items: center; justify-content: center;">
                      <span style="font-size: 20px;">✅</span>
                    </div>
                    <p style="color: #34d399; font-size: 14px; font-weight: 600; margin: 0 0 4px 0;">ENTREGA</p>
                    <p style="color: #71717a; font-size: 12px; margin: 0;">Controla entregas e lucros</p>
                  </td>
                </tr>
              </table>
              
              <!-- Funcionalidades com ícones alternados -->
              <p style="color: #fafafa; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 16px 0; text-align: center;">
                Tudo num só lugar:
              </p>
              
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 0 0 32px 0;">
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #3f3f46;">
                    <span style="color: #a78bfa; font-size: 16px; margin-right: 8px;">📋</span>
                    <span style="color: #fafafa; font-size: 14px;"><strong>Kanban Visual</strong></span>
                    <span style="color: #71717a; font-size: 14px;"> — arrastar e largar projetos</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #3f3f46;">
                    <span style="color: #00E5E5; font-size: 16px; margin-right: 8px;">👥</span>
                    <span style="color: #fafafa; font-size: 14px;"><strong>CRM Clientes</strong></span>
                    <span style="color: #71717a; font-size: 14px;"> — histórico completo de cada cliente</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #3f3f46;">
                    <span style="color: #a78bfa; font-size: 16px; margin-right: 8px;">📅</span>
                    <span style="color: #fafafa; font-size: 14px;"><strong>Calendário</strong></span>
                    <span style="color: #71717a; font-size: 14px;"> — sincroniza com Google Calendar</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #3f3f46;">
                    <span style="color: #00E5E5; font-size: 16px; margin-right: 8px;">💰</span>
                    <span style="color: #fafafa; font-size: 14px;"><strong>Finanças</strong></span>
                    <span style="color: #71717a; font-size: 14px;"> — receitas, custos, lucro e margem</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #3f3f46;">
                    <span style="color: #a78bfa; font-size: 16px; margin-right: 8px;">🎥</span>
                    <span style="color: #fafafa; font-size: 14px;"><strong>Frame.io</strong></span>
                    <span style="color: #71717a; font-size: 14px;"> — review de vídeos integrado</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #3f3f46;">
                    <span style="color: #00E5E5; font-size: 16px; margin-right: 8px;">📊</span>
                    <span style="color: #fafafa; font-size: 14px;"><strong>Relatórios</strong></span>
                    <span style="color: #71717a; font-size: 14px;"> — analisa performance e metas</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #3f3f46;">
                    <span style="color: #a78bfa; font-size: 16px; margin-right: 8px;">💱</span>
                    <span style="color: #fafafa; font-size: 14px;"><strong>EUR ou BRL</strong></span>
                    <span style="color: #71717a; font-size: 14px;"> — Portugal e Brasil</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;">
                    <span style="color: #00E5E5; font-size: 16px; margin-right: 8px;">🤝</span>
                    <span style="color: #fafafa; font-size: 14px;"><strong>Equipa</strong></span>
                    <span style="color: #71717a; font-size: 14px;"> — convida freelancers e colaboradores</span>
                  </td>
                </tr>
              </table>
              
              <!-- Botão CTA com gradiente cyan para roxo -->
              <div style="text-align: center; margin: 0 0 24px 0;">
                <a href="https://willflow.app/auth" style="display: inline-block; background: linear-gradient(135deg, #00E5E5 0%, #7c3aed 100%); color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 16px 48px; border-radius: 8px; box-shadow: 0 4px 20px rgba(0, 229, 229, 0.4), 0 0 40px rgba(0, 229, 229, 0.2);">
                  Criar conta grátis →
                </a>
              </div>
              
              <p style="color: #71717a; font-size: 12px; text-align: center; margin: 0;">
                Começa em menos de 1 minuto. Cancela quando quiseres.
              </p>
              
            </td>
          </tr>
          
          <!-- Footer escuro -->
          <tr>
            <td style="background-color: #0a0a0a; border-radius: 0 0 16px 16px; padding: 24px 30px; text-align: center; border-top: 1px solid #27272a;">
              <p style="color: #71717a; font-size: 12px; margin: 0 0 8px 0;">
                © 2026 WillFlow. Todos os direitos reservados.
              </p>
              <p style="color: #52525b; font-size: 12px; margin: 0;">
                <a href="https://willflow.app" style="color: #00E5E5; text-decoration: none;">willflow.app</a>
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { recipientEmail, recipientName, senderName, customMessage }: FriendInviteRequest = await req.json();

    // Validate required fields
    if (!recipientName || !senderName) {
      return new Response(
        JSON.stringify({ error: "recipientName e senderName são obrigatórios" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate email with full validation (format, domain, MX records)
    const emailValidation = await validateEmail(recipientEmail);
    if (!emailValidation.valid) {
      console.error("Email validation failed:", emailValidation.error);
      return new Response(
        JSON.stringify({ error: emailValidation.error }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Sending friend invite to ${recipientEmail} from ${senderName}`);

    const emailHtml = generateEmailHTML(recipientName, senderName, customMessage);

    const emailResponse = await resend.emails.send({
      from: "WillFlow <noreply@willflow.app>",
      to: [recipientEmail],
      subject: `${senderName} convidou-te para o WillFlow - 30 dias grátis! 🎁`,
      html: emailHtml,
    });

    console.log("Friend invite email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Convite enviado para ${recipientEmail}`,
        data: emailResponse 
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Error sending friend invite:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
