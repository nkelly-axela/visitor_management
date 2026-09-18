import { Resend } from "resend";
import { formatLondon } from "@/lib/time";
import type { VisitLog } from "@/types/db";

function getResend() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  return new Resend(apiKey);
}

function recipients(env: string | undefined): string[] {
  return (env ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

async function send(to: string[], subject: string, html: string) {
  const resend = getResend();
  const from = process.env.RESEND_FROM_ADDRESS ?? "Visitor System <onboarding@resend.dev>";
  if (!resend || to.length === 0) {
    console.warn("[resend] skipped send (missing RESEND_API_KEY or no recipients):", subject);
    return { skipped: true };
  }
  return resend.emails.send({ from, to, subject, html });
}

export async function sendStaffNotSignedOutAlert(openStaffVisits: VisitLog[]) {
  if (openStaffVisits.length === 0) return { skipped: true, reason: "none open" };

  const rows = openStaffVisits
    .map(
      (v) =>
        `<tr><td style="padding:4px 12px;border-bottom:1px solid #eee">${v.name}</td><td style="padding:4px 12px;border-bottom:1px solid #eee">${formatLondon(
          v.signed_in_at
        )}</td></tr>`
    )
    .join("");

  const html = `
    <div style="font-family:sans-serif">
      <h2>Staff still signed in after 5:15pm</h2>
      <p>The following ${openStaffVisits.length} staff member(s) signed in today but have not signed out:</p>
      <table style="border-collapse:collapse">
        <tr><th style="text-align:left;padding:4px 12px">Name</th><th style="text-align:left;padding:4px 12px">Signed in</th></tr>
        ${rows}
      </table>
      <p style="color:#666;font-size:13px">Automated alert from the Visitor Management System.</p>
    </div>`;

  return send(
    recipients(process.env.ALERT_RECIPIENTS),
    `${openStaffVisits.length} staff not signed out (${formatLondon(new Date(), "d MMM")})`,
    html
  );
}

export async function sendWeeklyHrReport(params: {
  weekLabel: string;
  perStaff: { name: string; department: string | null; visits: VisitLog[] }[];
}) {
  const { weekLabel, perStaff } = params;

  const rows = perStaff
    .map((s) => {
      const visitCells = s.visits.length
        ? s.visits
            .map(
              (v) =>
                `${formatLondon(v.signed_in_at, "EEE d MMM HH:mm")} – ${
                  v.signed_out_at ? formatLondon(v.signed_out_at, "HH:mm") : "not signed out"
                }`
            )
            .join("<br/>")
        : '<span style="color:#999">No sign-ins recorded</span>';
      return `<tr>
        <td style="padding:6px 12px;border-bottom:1px solid #eee;vertical-align:top">${s.name}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #eee;vertical-align:top">${s.department ?? ""}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #eee;vertical-align:top">${visitCells}</td>
      </tr>`;
    })
    .join("");

  const html = `
    <div style="font-family:sans-serif">
      <h2>Weekly staff attendance summary: ${weekLabel}</h2>
      <p>Sign-in / sign-out record for all office staff this week.</p>
      <table style="border-collapse:collapse;width:100%">
        <tr>
          <th style="text-align:left;padding:6px 12px">Name</th>
          <th style="text-align:left;padding:6px 12px">Department</th>
          <th style="text-align:left;padding:6px 12px">Sign-ins this week</th>
        </tr>
        ${rows}
      </table>
      <p style="color:#666;font-size:13px">This summary is not yet cross-checked against the company calendar (holiday/WFH) &mdash; that integration is pending. Please verify absences manually for now.</p>
      <p style="color:#666;font-size:13px">Automated report from the Visitor Management System.</p>
    </div>`;

  return send(
    recipients(process.env.HR_REPORT_RECIPIENTS),
    `Weekly staff attendance summary: ${weekLabel}`,
    html
  );
}
