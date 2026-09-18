export type VisitorType = "staff" | "guest" | "visitor";

export interface OfficeStaff {
  id: string;
  name: string;
  email: string;
  department: string | null;
  active: boolean;
  created_at: string;
}

export interface AdminRow {
  id: string;
  name: string;
  email: string;
  created_at: string;
}

export interface VisitLog {
  id: string;
  visitor_type: VisitorType;
  office_staff_id: string | null;
  name: string;
  company: string | null;
  purpose: string | null;
  host_name: string | null;
  signed_in_at: string;
  signed_out_at: string | null;
  created_at: string;
}
