export type ExportComment = { body: string; client_name: string; timestamp_seconds: number };
export type ExportFormat = 'fcpxml' | 'avid' | 'premiere' | 'edl' | 'csv' | 'txt';
export const FPS_OPTIONS = [23.976, 24, 25, 29.97, 30, 50, 59.94, 60];
const FPS = 25;
/** Snap a measured frame rate to the nearest standard rate. */
export const snapFps = (m: number) => FPS_OPTIONS.reduce((b, f) => Math.abs(f - m) < Math.abs(b - m) ? f : b, 25);
const base = (fps: number) => Math.round(fps);
const ntsc = (fps: number) => !Number.isInteger(fps);
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const oneLine = (s: string) => s.replace(/\s+/g, ' ').trim();
export function toTimecode(sec: number, fps = FPS) {
  const f = Math.max(0, Math.round(sec * fps)); fps = base(fps);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(Math.floor(f / (3600 * fps)))}:${p(Math.floor(f / (60 * fps)) % 60)}:${p(Math.floor(f / fps) % 60)}:${p(f % fps)}`;
}

const sorted = (c: ExportComment[]) => [...c].sort((a, b) => a.timestamp_seconds - b.timestamp_seconds);
export function commentsAsText(c: ExportComment[], fps = FPS) {
  return sorted(c).map((x, i) => `#${i + 1} ${toTimecode(x.timestamp_seconds, fps)} — ${x.client_name}: ${x.body}`).join('\n');
}
export function buildExport(fmt: ExportFormat, list: ExportComment[], title: string, fps = FPS): { content: string; ext: string; mime: string } {
  const c = sorted(list); const t = esc(title); const R = base(fps);
  const frames = (x: number) => Math.max(0, Math.round(x * fps));
  const tc = (x: number) => toTimecode(x, fps);
  const fd = ntsc(fps) ? `1001/${R * 1000}s` : `1/${R}s`;
  const at = (n: number) => ntsc(fps) ? `${n * 1001}/${R * 1000}s` : `${n}/${R}s`;
  const end = Math.max(...c.map(x => frames(x.timestamp_seconds)), 0) + R * 10;
  switch (fmt) {
    case 'txt': return { content: commentsAsText(c, fps), ext: 'txt', mime: 'text/plain' };
    case 'csv': {
      const q = (s: string) => `"${s.replace(/"/g, '""')}"`;
      return { content: ['#,Timecode,Segundos,Autor,Comentário', ...c.map((x, i) => [i + 1, tc(x.timestamp_seconds), x.timestamp_seconds.toFixed(2), q(x.client_name), q(x.body)].join(','))].join('\n'), ext: 'csv', mime: 'text/csv' };
    }
    case 'edl': return { ext: 'edl', mime: 'text/plain', content: [`TITLE: ${oneLine(title)}`, 'FCM: NON-DROP FRAME', '', ...c.flatMap((x, i) => {
      const a = tc(x.timestamp_seconds), b = tc(x.timestamp_seconds + 1 / fps);
      return [`${String(i + 1).padStart(3, '0')}  001      V     C        ${a} ${b} ${a} ${b}`, ` |C:ResolveColorBlue |M:${oneLine(`${x.client_name}: ${x.body}`)} |D:1`, ''];
    })].join('\n') };
    case 'avid': return { ext: 'txt', mime: 'text/plain', content: c.map(x => [oneLine(x.client_name), tc(x.timestamp_seconds), 'V1', 'red', oneLine(x.body), '1'].join('\t')).join('\n') };
    case 'premiere': return { ext: 'xml', mime: 'application/xml', content: `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE xmeml>\n<xmeml version="4"><sequence><name>${t}</name><duration>${end}</duration><rate><timebase>${R}</timebase><ntsc>${ntsc(fps) ? 'TRUE' : 'FALSE'}</ntsc></rate>\n${c.map(x => `<marker><name>${esc(x.client_name)}</name><comment>${esc(x.body)}</comment><in>${frames(x.timestamp_seconds)}</in><out>-1</out></marker>`).join('\n')}\n<media><video><track/></video></media></sequence></xmeml>` };
    case 'fcpxml': return { ext: 'fcpxml', mime: 'application/xml', content: `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE fcpxml>\n<fcpxml version="1.10"><resources><format id="r1" frameDuration="${fd}" width="1920" height="1080"/></resources><library><event name="${t}"><project name="${t}"><sequence format="r1" duration="${at(end)}" tcStart="0s" tcFormat="NDF"><spine><gap name="Comentários" offset="0s" duration="${at(end)}" start="0s">\n${c.map(x => `<marker start="${at(frames(x.timestamp_seconds))}" duration="${fd}" value="${esc(oneLine(`${x.client_name}: ${x.body}`))}"/>`).join('\n')}\n</gap></spine></sequence></project></event></library></fcpxml>` };
  }
}
