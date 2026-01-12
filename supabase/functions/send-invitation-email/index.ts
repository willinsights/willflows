import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface InvitationEmailRequest {
  invitationId: string;
  email: string;
  workspaceName: string;
  inviterName: string;
  role: string;
  token: string;
}

const getRoleLabel = (role: string): string => {
  const labels: Record<string, string> = {
    admin: "Administrador",
    editor: "Editor",
    captacao: "Captação",
    freelancer: "Freelancer",
    visualizador: "Visualizador",
  };
  return labels[role] || role;
};

const handler = async (req: Request): Promise<Response> => {
  console.log("send-invitation-email function called");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      console.error("No authorization header");
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
      console.error("Invalid token:", claimsError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { email, workspaceName, inviterName, role, token: inviteToken }: InvitationEmailRequest = await req.json();

    if (!email || !workspaceName || !inviteToken) {
      console.error("Missing required fields");
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Sending invitation email to ${email} for workspace ${workspaceName}`);

    // Build the invitation link
    const appUrl = Deno.env.get("APP_URL") || "https://willflow.app";
    const inviteLink = `${appUrl}/convite?token=${inviteToken}`;

    // Send email using Resend API directly via fetch
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "WillFlow <noreply@willflow.app>",
        to: [email],
        subject: `${inviterName || "Alguém"} convidou-te para o workspace "${workspaceName}"`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 40px 20px;">
            <div style="max-width: 560px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
              <!-- Header -->
              <div style="background: linear-gradient(135deg, #8224e3 0%, #a855f7 100%); padding: 32px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">WillFlow</h1>
              </div>
              
              <!-- Content -->
              <div style="padding: 32px;">
                <h2 style="color: #18181b; margin: 0 0 16px 0; font-size: 20px; font-weight: 600;">
                  Foste convidado(a) para colaborar! 🎉
                </h2>
                
                <p style="color: #52525b; margin: 0 0 24px 0; font-size: 16px; line-height: 1.6;">
                  <strong>${inviterName || "Um utilizador"}</strong> convidou-te para te juntares ao workspace <strong>"${workspaceName}"</strong> como <strong>${getRoleLabel(role)}</strong>.
                </p>
                
                <p style="color: #52525b; margin: 0 0 24px 0; font-size: 16px; line-height: 1.6;">
                  Clica no botão abaixo para aceitar o convite e começar a colaborar:
                </p>
                
                <!-- CTA Button -->
                <div style="text-align: center; margin: 32px 0;">
                  <a href="${inviteLink}" style="display: inline-block; background: linear-gradient(135deg, #8224e3 0%, #a855f7 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600;">
                    Aceitar Convite
                  </a>
                </div>
                
                <p style="color: #71717a; margin: 24px 0 0 0; font-size: 14px; line-height: 1.6;">
                  Se não conseguires clicar no botão, copia e cola este link no teu navegador:
                </p>
                <p style="color: #8224e3; margin: 8px 0 0 0; font-size: 14px; word-break: break-all;">
                  ${inviteLink}
                </p>
                
                <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 32px 0;">
                
                <p style="color: #a1a1aa; margin: 0; font-size: 12px; text-align: center;">
                  Este convite expira em 7 dias. Se não solicitaste este convite, podes ignorar este email.
                </p>
              </div>
            </div>
            
            <!-- Footer -->
            <div style="text-align: center; margin-top: 24px;">
              <p style="color: #a1a1aa; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} WillFlow. Todos os direitos reservados.
              </p>
            </div>
          </body>
          </html>
        `,
      }),
    });

    const emailData = await emailResponse.json();

    if (!emailResponse.ok) {
      console.error("Resend API error:", emailData);
      return new Response(
        JSON.stringify({ error: emailData.message || "Failed to send email" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Email sent successfully:", emailData);

    return new Response(JSON.stringify({ success: true, data: emailData }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-invitation-email function:", error);
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
