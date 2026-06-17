// Generate PDF invoices using pdf-lib (pure Deno, no Python/Docker)
import { PDFDocument, rgb, StandardFonts, PDFFont, PDFPage } from "https://cdn.skypack.dev/pdf-lib@1.17.1?dts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const DARK = rgb(0.10, 0.10, 0.18);   // #1a1a2e
const MUTED = rgb(0.45, 0.45, 0.55);
const BORDER = rgb(0.85, 0.85, 0.90);
const TEXT = rgb(0.10, 0.10, 0.15);

const PAGE_W = 595;
const PAGE_H = 842;
const MARGIN = 50;

interface Invoice {
  id: string;
  workspace_id: string;
  project_id: string | null;
  client_id: string | null;
  invoice_number: string;
  status: string;
  issue_date: string | null;
  due_date: string | null;
  subtotal: number;
  tax_rate: number;
  tax_amount: number | null;
  vat_amount: number | null;
  vat_rate_applied: number | null;
  vat_source: string | null;
  total: number;
  notes: string | null;
}

interface Workspace {
  id: string;
  name: string;
  logo_url: string | null;
  currency: string | null;
  country: string | null;
}

interface Client {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  nif: string | null;
  vat_number: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  country: string | null;
}

interface Project {
  id: string;
  title: string | null;
  name?: string | null;
}

function fmtCurrency(amount: number, currency = "EUR"): string {
  const symbol = currency === "BRL" ? "R$ " : "€ ";
  return symbol + amount.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, "$&,");
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric" });
}

const STATUS_LABELS: Record<string, string> = {
  draft: "Rascunho",
  sent: "Enviada",
  paid: "Paga",
  overdue: "Vencida",
  cancelled: "Cancelada",
};

function sanitize(s: string | null | undefined): string {
  // pdf-lib StandardFonts (WinAnsi) cannot encode some glyphs. Strip what it can't.
  if (!s) return "";
  return s.replace(/[^\x00-\xFF]/g, "?");
}

async function tryFetchLogo(url: string | null): Promise<{ bytes: Uint8Array; type: "png" | "jpg" } | null> {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") || "";
    const buf = new Uint8Array(await res.arrayBuffer());
    if (ct.includes("png") || url.toLowerCase().endsWith(".png")) return { bytes: buf, type: "png" };
    if (ct.includes("jpeg") || ct.includes("jpg") || /\.(jpe?g)$/i.test(url)) return { bytes: buf, type: "jpg" };
    return null;
  } catch {
    return null;
  }
}

function drawText(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  opts: { font: PDFFont; size?: number; color?: ReturnType<typeof rgb> }
) {
  page.drawText(sanitize(text), {
    x,
    y,
    size: opts.size ?? 10,
    font: opts.font,
    color: opts.color ?? TEXT,
  });
}

async function buildPdf(
  invoice: Invoice,
  workspace: Workspace,
  client: Client | null,
  project: Project | null,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([PAGE_W, PAGE_H]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const currency = workspace.currency || "EUR";

  // === HEADER BAND ===
  const headerH = 110;
  page.drawRectangle({
    x: 0, y: PAGE_H - headerH, width: PAGE_W, height: headerH,
    color: DARK,
  });

  // Logo (optional)
  const logo = await tryFetchLogo(workspace.logo_url);
  let textOffsetX = MARGIN;
  if (logo) {
    try {
      const img = logo.type === "png"
        ? await pdf.embedPng(logo.bytes)
        : await pdf.embedJpg(logo.bytes);
      const scale = 60 / img.height;
      const w = img.width * scale;
      page.drawImage(img, {
        x: MARGIN,
        y: PAGE_H - headerH + (headerH - 60) / 2,
        width: w,
        height: 60,
      });
      textOffsetX = MARGIN + w + 16;
    } catch {
      // ignore embed errors
    }
  }

  drawText(page, workspace.name, textOffsetX, PAGE_H - 50, {
    font: fontBold, size: 18, color: rgb(1, 1, 1),
  });
  if (workspace.country) {
    drawText(page, workspace.country, textOffsetX, PAGE_H - 70, {
      font, size: 10, color: rgb(0.8, 0.8, 0.9),
    });
  }

  // "FATURA" big label, right aligned
  const bigLabel = "FATURA";
  const labelW = fontBold.widthOfTextAtSize(bigLabel, 22);
  drawText(page, bigLabel, PAGE_W - MARGIN - labelW, PAGE_H - 50, {
    font: fontBold, size: 22, color: rgb(1, 1, 1),
  });
  const numLabel = invoice.invoice_number;
  const numW = font.widthOfTextAtSize(numLabel, 11);
  drawText(page, numLabel, PAGE_W - MARGIN - numW, PAGE_H - 70, {
    font, size: 11, color: rgb(0.85, 0.85, 0.95),
  });

  // === CLIENT BOX + METADATA ===
  let y = PAGE_H - headerH - 40;

  drawText(page, "FATURAR A", MARGIN, y, { font: fontBold, size: 9, color: MUTED });
  drawText(page, "DETALHES", PAGE_W / 2 + 10, y, { font: fontBold, size: 9, color: MUTED });
  y -= 14;

  const clientName = client?.company || client?.name || "—";
  drawText(page, clientName, MARGIN, y, { font: fontBold, size: 11 });
  drawText(page, "Nº fatura:", PAGE_W / 2 + 10, y, { font, size: 10, color: MUTED });
  drawText(page, invoice.invoice_number, PAGE_W / 2 + 90, y, { font: fontBold, size: 10 });
  y -= 14;

  if (client?.vat_number || client?.nif) {
    drawText(page, `NIF/CNPJ: ${client.vat_number || client.nif}`, MARGIN, y, { font, size: 9, color: MUTED });
  }
  drawText(page, "Emissão:", PAGE_W / 2 + 10, y, { font, size: 10, color: MUTED });
  drawText(page, fmtDate(invoice.issue_date), PAGE_W / 2 + 90, y, { font, size: 10 });
  y -= 13;

  if (client?.address) {
    drawText(page, client.address, MARGIN, y, { font, size: 9, color: MUTED });
  }
  drawText(page, "Vencimento:", PAGE_W / 2 + 10, y, { font, size: 10, color: MUTED });
  drawText(page, fmtDate(invoice.due_date), PAGE_W / 2 + 90, y, { font, size: 10 });
  y -= 13;

  const cityLine = [client?.postal_code, client?.city, client?.country].filter(Boolean).join(" ");
  if (cityLine) {
    drawText(page, cityLine, MARGIN, y, { font, size: 9, color: MUTED });
  }
  drawText(page, "Estado:", PAGE_W / 2 + 10, y, { font, size: 10, color: MUTED });
  drawText(page, STATUS_LABELS[invoice.status] || invoice.status, PAGE_W / 2 + 90, y, {
    font: fontBold, size: 10, color: invoice.status === "paid" ? rgb(0.13, 0.55, 0.20) : TEXT,
  });
  y -= 30;

  // === ITEMS TABLE ===
  // Header
  page.drawRectangle({
    x: MARGIN, y: y - 4, width: PAGE_W - MARGIN * 2, height: 22,
    color: rgb(0.96, 0.96, 0.98),
  });
  drawText(page, "Descrição", MARGIN + 8, y + 4, { font: fontBold, size: 10 });
  drawText(page, "Qtd", PAGE_W - MARGIN - 230, y + 4, { font: fontBold, size: 10 });
  drawText(page, "Preço unit.", PAGE_W - MARGIN - 170, y + 4, { font: fontBold, size: 10 });
  drawText(page, "Subtotal", PAGE_W - MARGIN - 70, y + 4, { font: fontBold, size: 10 });
  y -= 24;

  // Single line item (data model has no separate items table — use project name)
  const desc = project?.title || project?.name || invoice.notes || "Serviços prestados";
  const unit = invoice.subtotal;
  drawText(page, desc.length > 60 ? desc.slice(0, 60) + "..." : desc, MARGIN + 8, y, { font, size: 10 });
  drawText(page, "1", PAGE_W - MARGIN - 230, y, { font, size: 10 });
  drawText(page, fmtCurrency(unit, currency), PAGE_W - MARGIN - 170, y, { font, size: 10 });
  drawText(page, fmtCurrency(unit, currency), PAGE_W - MARGIN - 70, y, { font, size: 10 });
  y -= 16;
  page.drawLine({
    start: { x: MARGIN, y }, end: { x: PAGE_W - MARGIN, y },
    thickness: 0.5, color: BORDER,
  });

  // === TOTALS ===
  y -= 24;
  const totalsX = PAGE_W - MARGIN - 200;
  const vatRate = invoice.vat_rate_applied ?? invoice.tax_rate ?? 0;
  const vatAmount = invoice.vat_amount ?? invoice.tax_amount ?? (invoice.subtotal * vatRate / 100);
  const vatSrcLabel = invoice.vat_source === "client" ? "cliente"
    : invoice.vat_source === "manual" ? "manual"
    : "workspace";

  drawText(page, "Subtotal:", totalsX, y, { font, size: 10, color: MUTED });
  drawText(page, fmtCurrency(invoice.subtotal, currency), PAGE_W - MARGIN - 70, y, { font, size: 10 });
  y -= 16;
  drawText(page, `IVA (${vatRate}% - ${vatSrcLabel}):`, totalsX, y, { font, size: 10, color: MUTED });
  drawText(page, fmtCurrency(vatAmount, currency), PAGE_W - MARGIN - 70, y, { font, size: 10 });
  y -= 6;
  page.drawLine({
    start: { x: totalsX, y }, end: { x: PAGE_W - MARGIN, y },
    thickness: 0.5, color: BORDER,
  });
  y -= 18;
  drawText(page, "TOTAL:", totalsX, y, { font: fontBold, size: 12 });
  drawText(page, fmtCurrency(invoice.total, currency), PAGE_W - MARGIN - 80, y, {
    font: fontBold, size: 12, color: DARK,
  });

  // === NOTES ===
  if (invoice.notes) {
    y -= 40;
    drawText(page, "NOTAS", MARGIN, y, { font: fontBold, size: 9, color: MUTED });
    y -= 14;
    const lines = wrapText(invoice.notes, 80);
    for (const line of lines.slice(0, 6)) {
      drawText(page, line, MARGIN, y, { font, size: 9, color: TEXT });
      y -= 12;
    }
  }

  // Footer
  drawText(page, `Gerado em ${fmtDate(new Date().toISOString())}`, MARGIN, 30, {
    font, size: 8, color: MUTED,
  });

  return await pdf.save();
}

function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/);
  const out: string[] = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > maxChars) {
      if (cur) out.push(cur);
      cur = w;
    } else {
      cur = (cur + " " + w).trim();
    }
  }
  if (cur) out.push(cur);
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    // Input
    const body = await req.json();
    const invoiceId = body?.invoice_id as string | undefined;
    const workspaceId = body?.workspace_id as string | undefined;
    if (!invoiceId || !workspaceId) {
      return new Response(JSON.stringify({ error: "invoice_id and workspace_id are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Membership check
    const { data: membership } = await supabase
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId)
      .eq("is_active", true)
      .maybeSingle();
    if (!membership) {
      return new Response(JSON.stringify({ error: "Not a member of this workspace" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch invoice
    const { data: invoice, error: invErr } = await supabase
      .from("invoices")
      .select("*")
      .eq("id", invoiceId)
      .eq("workspace_id", workspaceId)
      .single();
    if (invErr || !invoice) {
      return new Response(JSON.stringify({ error: "Invoice not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch workspace
    const { data: workspace } = await supabase
      .from("workspaces")
      .select("id,name,logo_url,currency,country")
      .eq("id", workspaceId)
      .single();
    if (!workspace) {
      return new Response(JSON.stringify({ error: "Workspace not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch client (optional)
    let client: Client | null = null;
    if (invoice.client_id) {
      const { data: c } = await supabase
        .from("clients")
        .select("id,name,company,email,nif,vat_number,address,city,postal_code,country")
        .eq("id", invoice.client_id)
        .maybeSingle();
      client = c as Client | null;
    }

    // Fetch project (optional)
    let project: Project | null = null;
    if (invoice.project_id) {
      const { data: p } = await supabase
        .from("projects")
        .select("id,title")
        .eq("id", invoice.project_id)
        .maybeSingle();
      project = p as Project | null;
    }

    const pdfBytes = await buildPdf(invoice as Invoice, workspace as Workspace, client, project);

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="invoice-${invoice.invoice_number}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[generate-pdf] ERROR", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
