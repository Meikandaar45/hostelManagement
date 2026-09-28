import os
import docx
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

DOCX_OUTPUT_PATH = r"C:\Users\meira\Downloads\PRO\SE\V1\Hostel_Management_System_Partial_Implementation.docx"
DOCX_COPY_PATH = r"C:\Users\meira\Downloads\PRO\SE\V1\Hostel_Management_Partial_Implementation\Hostel_Management_System_Partial_Implementation.docx"
REPO_SUBMISSION_PATH = r"c:\Users\meira\Downloads\PRO\SE\V1\hostel-management\submission\Hostel_Management_System_Partial_Implementation.docx"
SCREENSHOTS_DIR = r"C:\Users\meira\Downloads\PRO\SE\V1\Hostel_Management_Partial_Implementation\screenshots"

def set_cell_background(cell, fill_hex):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
    tcPr.append(shd)

def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = parse_xml(
        f'<w:tcMar {nsdecls("w")}>'
        f'<w:top w:w="{top}" w:type="dxa"/>'
        f'<w:bottom w:w="{bottom}" w:type="dxa"/>'
        f'<w:left w:w="{left}" w:type="dxa"/>'
        f'<w:right w:w="{right}" w:type="dxa"/>'
        f'</w:tcMar>'
    )
    tcPr.append(tcMar)

def add_styled_heading(doc, text, level):
    h = doc.add_heading(text, level=level)
    h.paragraph_format.space_before = Pt(14)
    h.paragraph_format.space_after = Pt(6)
    h.paragraph_format.keep_with_next = True
    for r in h.runs:
        r.font.name = 'Calibri'
        if level == 1:
            r.font.size = Pt(16)
            r.font.bold = True
            r.font.color.rgb = RGBColor(15, 23, 42) # Slate 900
        elif level == 2:
            r.font.size = Pt(13)
            r.font.bold = True
            r.font.color.rgb = RGBColor(30, 41, 59) # Slate 800
    return h

def add_code_block(doc, code_text):
    tbl = doc.add_table(rows=1, cols=1)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    cell = tbl.cell(0, 0)
    set_cell_background(cell, "F8FAFC")
    set_cell_margins(cell, top=120, bottom=120, left=180, right=180)
    
    # Border
    tcPr = cell._tc.get_or_add_tcPr()
    borders = parse_xml(
        f'<w:tcBorders {nsdecls("w")}>'
        f'<w:top w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>'
        f'<w:left w:val="single" w:sz="24" w:space="0" w:color="3B82F6"/>'
        f'<w:bottom w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>'
        f'<w:right w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>'
        f'</w:tcBorders>'
    )
    tcPr.append(borders)
    
    p = cell.paragraphs[0]
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(0)
    p.paragraph_format.line_spacing = 1.15
    run = p.add_run(code_text.strip())
    run.font.name = 'Consolas'
    run.font.size = Pt(8.5)
    run.font.color.rgb = RGBColor(30, 41, 59)
    doc.add_paragraph().paragraph_format.space_after = Pt(6)

def add_image_with_caption(doc, img_name, caption_text):
    img_path = os.path.join(SCREENSHOTS_DIR, img_name)
    if os.path.exists(img_path):
        p_img = doc.add_paragraph()
        p_img.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_img.paragraph_format.space_before = Pt(10)
        p_img.paragraph_format.space_after = Pt(4)
        run_img = p_img.add_run()
        run_img.add_picture(img_path, width=Inches(5.6))
        
        p_cap = doc.add_paragraph()
        p_cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_cap.paragraph_format.space_before = Pt(2)
        p_cap.paragraph_format.space_after = Pt(12)
        run_cap = p_cap.add_run(caption_text)
        run_cap.font.name = 'Calibri'
        run_cap.font.size = Pt(9.5)
        run_cap.font.italic = True
        run_cap.font.color.rgb = RGBColor(71, 85, 105)
    else:
        print(f"Warning: image {img_path} not found")

def build_document():
    doc = Document()
    
    # 1. Page Setup: Standard Letter, 0.75-inch margins for optimal visual space
    sections = doc.sections
    for s in sections:
        s.top_margin = Inches(0.75)
        s.bottom_margin = Inches(0.75)
        s.left_margin = Inches(0.75)
        s.right_margin = Inches(0.75)

    # Document Header / Footer
    header = doc.sections[0].header
    p_head = header.paragraphs[0]
    p_head.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    r_head = p_head.add_run("Hostel Management System — Partial Implementation Report")
    r_head.font.name = 'Calibri'
    r_head.font.size = Pt(8.5)
    r_head.font.color.rgb = RGBColor(148, 163, 184)

    footer = doc.sections[0].footer
    p_foot = footer.paragraphs[0]
    p_foot.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_foot = p_foot.add_run("https://github.com/Meikandaar45/hostelManagement")
    r_foot.font.name = 'Calibri'
    r_foot.font.size = Pt(8.5)
    r_foot.font.color.rgb = RGBColor(148, 163, 184)

    # ─── COVER / TITLE BLOCK ─────────────────────────────────────────────
    title_p = doc.add_paragraph()
    title_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    title_p.paragraph_format.space_before = Pt(18)
    title_p.paragraph_format.space_after = Pt(4)
    run_sub = title_p.add_run("ACADEMIC PROJECT REPORT\n")
    run_sub.font.name = 'Calibri'
    run_sub.font.size = Pt(11)
    run_sub.font.bold = True
    run_sub.font.color.rgb = RGBColor(59, 130, 246)

    run_title = title_p.add_run("PARTIAL IMPLEMENTATION REPORT\n")
    run_title.font.name = 'Calibri'
    run_title.font.size = Pt(22)
    run_title.font.bold = True
    run_title.font.color.rgb = RGBColor(15, 23, 42)

    proj_p = doc.add_paragraph()
    proj_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    proj_p.paragraph_format.space_before = Pt(2)
    proj_p.paragraph_format.space_after = Pt(6)
    run_proj = proj_p.add_run("HOSTEL MANAGEMENT SYSTEM")
    run_proj.font.name = 'Calibri'
    run_proj.font.size = Pt(14)
    run_proj.font.bold = True
    run_proj.font.color.rgb = RGBColor(71, 85, 105)

    meta_p = doc.add_paragraph()
    meta_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    meta_p.paragraph_format.space_after = Pt(18)
    run_repo = meta_p.add_run("GitHub Repository: https://github.com/Meikandaar45/hostelManagement\n")
    run_repo.font.name = 'Calibri'
    run_repo.font.size = Pt(10)
    run_repo.font.color.rgb = RGBColor(37, 99, 235)
    
    run_date = meta_p.add_run("Stack: React 19 + TypeScript + Express + MySQL 8+ | Status: Verified & Complete")
    run_date.font.name = 'Calibri'
    run_date.font.size = Pt(9.5)
    run_date.font.color.rgb = RGBColor(100, 116, 139)

    doc.add_paragraph().paragraph_format.space_after = Pt(8)

    # ─── SECTION 1: AIM ──────────────────────────────────────────────────
    add_styled_heading(doc, "SECTION 1 — AIM", level=1)
    p_aim = doc.add_paragraph()
    p_aim.paragraph_format.line_spacing = 1.15
    p_aim.paragraph_format.space_after = Pt(10)
    r_aim = p_aim.add_run(
        "\"To develop a web-based Hostel Management System that digitizes hostel administration by managing "
        "students, rooms, fees, complaints, visitors, leave requests, gate passes, notifications, and reports "
        "through secure role-based access control.\""
    )
    r_aim.font.name = 'Calibri'
    r_aim.font.size = Pt(11)
    r_aim.font.italic = True
    r_aim.font.bold = True
    r_aim.font.color.rgb = RGBColor(30, 41, 59)

    p_aim_desc = doc.add_paragraph()
    p_aim_desc.paragraph_format.line_spacing = 1.15
    p_aim_desc.paragraph_format.space_after = Pt(14)
    r_desc = p_aim_desc.add_run(
        "The platform eliminates paper-based residence registers by introducing an ACID-compliant MySQL database, "
        "cryptographic session handling via HttpOnly cookies, real-time bed capacity validation, an automated maintenance "
        "work order pipeline, and transactional digital gate pass issuance."
    )
    r_desc.font.name = 'Calibri'
    r_desc.font.size = Pt(10.5)

    # ─── SECTION 2: PROJECT DETAILS ──────────────────────────────────────
    add_styled_heading(doc, "SECTION 2 — PROJECT DETAILS", level=1)
    
    details_data = [
        ("Project Title", "Hostel Management System"),
        ("Project Repository", "https://github.com/Meikandaar45/hostelManagement"),
        ("Frontend Framework", "React 19.0.0 + Vite 5.0.6 + TypeScript 5.3.2"),
        ("Backend Framework", "Node.js (Active LTS) + Express 4.18.2 + TypeScript 5.3.2"),
        ("Authoritative Database", "MySQL 8.0+ (InnoDB Engine, utf8mb4 encoding, UTC)"),
        ("Database Driver / Pool", "mysql2 3.6.5 (Promise-based connection pooling)"),
        ("Authentication Engine", "JSON Web Tokens (jsonwebtoken 9.0.2) in HttpOnly cookies"),
        ("Password Security", "bcryptjs 2.4.3 (10 salt rounds)"),
        ("Schema Validation", "Zod 3.22.4 (Request bodies, parameters, environment variables)"),
        ("User Interface Styling", "Tailwind CSS 4.3.3 + Lucide React 0.294.0"),
        ("System Architecture", "Multi-Tier Client-Server RESTful Web Architecture"),
        ("Target User Roles", "Administrator, Warden, Student, Maintenance Staff"),
        ("Automated Test Suite", "Vitest (153 unit/integration tests) + Playwright (33 E2E tests)")
    ]

    tbl_details = doc.add_table(rows=len(details_data) + 1, cols=2)
    tbl_details.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl_details.autofit = False

    # Header Row
    hdr_cells = tbl_details.rows[0].cells
    hdr_cells[0].text = "Project Dimension"
    hdr_cells[1].text = "Specification & Version"
    for c in hdr_cells:
        set_cell_background(c, "1E293B")
        set_cell_margins(c, top=100, bottom=100, left=150, right=150)
        p = c.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.LEFT
        for run in p.runs:
            run.font.name = 'Calibri'
            run.font.size = Pt(10)
            run.font.bold = True
            run.font.color.rgb = RGBColor(255, 255, 255)

    # Data Rows
    for idx, (dim, val) in enumerate(details_data):
        row_cells = tbl_details.rows[idx + 1].cells
        row_cells[0].text = dim
        row_cells[1].text = val
        bg_color = "F8FAFC" if idx % 2 == 0 else "FFFFFF"
        for i, c in enumerate(row_cells):
            set_cell_background(c, bg_color)
            set_cell_margins(c, top=80, bottom=80, left=150, right=150)
            p = c.paragraphs[0]
            for run in p.runs:
                run.font.name = 'Calibri'
                run.font.size = Pt(9.5)
                if i == 0:
                    run.font.bold = True
                    run.font.color.rgb = RGBColor(30, 41, 59)
                else:
                    run.font.color.rgb = RGBColor(51, 65, 85)

    # Set column widths
    for row in tbl_details.rows:
        row.cells[0].width = Inches(2.2)
        row.cells[1].width = Inches(4.8)

    doc.add_paragraph().paragraph_format.space_after = Pt(14)

    # ─── SECTION 3: TECHNOLOGY STACK & ARCHITECTURE ──────────────────────
    add_styled_heading(doc, "SECTION 3 — TECHNOLOGY STACK & ARCHITECTURE", level=1)
    
    arch_diagram_text = (
        "┌────────────────────────────────────────────────────────┐\n"
        "│                   React Frontend Layer                 │\n"
        "│   React 19 + TypeScript + Vite + Tailwind CSS          │\n"
        "└───────────────────────────┬────────────────────────────┘\n"
        "                            │ Axios Client (JSON / HttpOnly Cookie)\n"
        "                            ▼\n"
        "┌────────────────────────────────────────────────────────┐\n"
        "│               Express Backend API Gateway              │\n"
        "│   Node.js + Helmet + CORS + Rate Limiter Middleware    │\n"
        "└───────────────────────────┬────────────────────────────┘\n"
        "                            │\n"
        "            ┌───────────────┴───────────────┐\n"
        "            ▼                               ▼\n"
        "┌─────────────────────────┐   ┌──────────────────────────┐\n"
        "│   Authentication & RBAC │   │  Zod Schema Validation   │\n"
        "│  - requireAuth (JWT)    │   │  - Strict Request Shapes │\n"
        "│  - requireRole (Matrix) │   │  - Centralized Errors    │\n"
        "└───────────┬─────────────┘   └─────────────┬────────────┘\n"
        "            │                               │\n"
        "            └───────────────┬───────────────┘\n"
        "                            ▼\n"
        "┌────────────────────────────────────────────────────────┐\n"
        "│             Transactional Business Services            │\n"
        "│  authService, studentService, roomService, feeService, │\n"
        "│  complaintService, leaveService, visitorService, etc.  │\n"
        "└───────────────────────────┬────────────────────────────┘\n"
        "                            │ Parameterized SQL Queries\n"
        "                            ▼\n"
        "┌────────────────────────────────────────────────────────┐\n"
        "│                 MySQL 8+ Database Layer                │\n"
        "│   mysql2 Connection Pool (13 InnoDB Tables + Indexes)  │\n"
        "└────────────────────────────────────────────────────────┘"
    )
    add_code_block(doc, arch_diagram_text)

    arch_explanations = [
        ("Presentation Layer (Client)", "Built with React 19, TypeScript, and Vite. Renders responsive role-tailored dashboards and operational views using Tailwind CSS. Interacts with the backend using a pre-configured Axios instance that transmits HttpOnly credentials and intercepts 401 unauthenticated states."),
        ("API Gateway & Middleware Layer", "Node.js Express application protected by Helmet HTTP security headers, CORS origin whitelisting, and sliding-window rate limiting on authentication routes. Handles cookie parsing and passes requests through Zod validation schemas."),
        ("Authentication & RBAC Guard", "Verifies signed HMAC SHA-256 JSON Web Tokens. Checks user role against a declarative permission matrix (ADMIN, WARDEN, STUDENT, MAINTENANCE) and enforces server-side ownership isolation to eliminate Insecure Direct Object References (IDOR)."),
        ("Transactional Business Services", "Encapsulates domain logic including capacity checks, payment validations, complaint lifecycle transitions, and digital gate pass generations. Executes multi-statement updates inside ACID transactions with connection pass-through."),
        ("Persistence Layer (MySQL Database)", "Authoritative relational database consisting of 13 InnoDB tables. Employs parameterized queries to eliminate SQL injection vulnerabilities and utilizes composite indexes for fast search and aggregation.")
    ]

    for title, desc in arch_explanations:
        p = doc.add_paragraph()
        p.paragraph_format.line_spacing = 1.15
        p.paragraph_format.space_after = Pt(6)
        r_t = p.add_run(f"• {title}: ")
        r_t.font.name = 'Calibri'
        r_t.font.size = Pt(10)
        r_t.font.bold = True
        r_t.font.color.rgb = RGBColor(30, 41, 59)
        r_d = p.add_run(desc)
        r_d.font.name = 'Calibri'
        r_d.font.size = Pt(10)

    # ─── SECTION 4: CODE SNIPPETS ────────────────────────────────────────
    add_styled_heading(doc, "SECTION 4 — CODE SNIPPETS (ACTUAL IMPLEMENTATION)", level=1)

    snippets = [
        ("1. Role-Based Access Control (RBAC) Middleware (`server/src/middleware/requireRole.ts`)",
"""export function requireRole(...allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Access denied: insufficient permissions' });
    }
    next();
  };
}"""),
        ("2. MySQL Database Connection Pool (`server/src/db/pool.ts`)",
"""export const pool = mysql.createPool({
  ...buildConfig(),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: '+00:00',
  charset: 'utf8mb4',
});

export async function testConnection(): Promise<boolean> {
  try {
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();
    return true;
  } catch {
    return false;
  }
}"""),
        ("3. Room Capacity Validation & Allocation (`server/src/services/roomService.ts`)",
"""// Enforce room capacity limit before allocating student
const [occupancyRows] = await conn.query<RowDataPacket[]>(
  'SELECT COUNT(*) AS activeCount FROM room_allocations WHERE room_id = ? AND vacated_at IS NULL',
  [roomId]
);
if (occupancyRows[0].activeCount >= room.capacity) {
  throw new AppError('Room has reached maximum bed capacity', 400);
}

await conn.query(
  'INSERT INTO room_allocations (student_id, room_id, allocated_by) VALUES (?, ?, ?)',
  [studentId, roomId, allocatedBy]
);"""),
        ("4. Transactional Leave Approval & Gate Pass Generation (`server/src/services/leaveService.ts`)",
"""// Transactional approval with collision-safe gate pass number
const gatePassNumber = `GP-${new Date().getFullYear()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

await conn.query(
  `UPDATE leave_requests 
   SET status = 'APPROVED', review_notes = ?, reviewed_by = ?, reviewed_at = NOW(), gate_pass_number = ?
   WHERE id = ?`,
  [reviewNotes, reviewerId, gatePassNumber, leaveId]
);

await createAuditLog({
  action: 'LEAVE_APPROVED',
  entityType: 'leave_request',
  entityId: leaveId,
  actorUserId: reviewerId,
  details: { gatePassNumber }
}, conn);"""),
        ("5. Student Fee Balance Calculation & Payment Recording (`server/src/services/feeService.ts`)",
"""// Reject overpayment beyond outstanding balance
const balance = Number(fee.amount) - Number(fee.paidAmount || 0);
if (paymentAmount > balance) {
  throw new AppError(`Payment amount ($${paymentAmount}) exceeds outstanding balance ($${balance})`, 400);
}

const receiptNumber = `RCPT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;

await conn.query(
  `INSERT INTO payments (fee_id, receipt_number, amount, payment_method, recorded_by)
   VALUES (?, ?, ?, ?, ?)`,
  [feeId, receiptNumber, paymentAmount, paymentMethod, recordedBy]
);""")
    ]

    for title, code in snippets:
        p_t = doc.add_paragraph()
        p_t.paragraph_format.space_before = Pt(8)
        p_t.paragraph_format.space_after = Pt(2)
        r_t = p_t.add_run(title)
        r_t.font.name = 'Calibri'
        r_t.font.size = Pt(10)
        r_t.font.bold = True
        r_t.font.color.rgb = RGBColor(30, 41, 59)
        add_code_block(doc, code)

    # ─── SECTION 5: SCREENSHOTS ──────────────────────────────────────────
    doc.add_page_break()
    add_styled_heading(doc, "SECTION 5 — SCREENSHOTS (ACTUAL RUNNING APPLICATION)", level=1)
    
    p_sc_intro = doc.add_paragraph()
    p_sc_intro.paragraph_format.line_spacing = 1.15
    p_sc_intro.paragraph_format.space_after = Pt(10)
    p_sc_intro.add_run(
        "The following screenshots were captured directly from the running web application (Vite frontend on "
        "port 5173, Express API on port 5000, and local MySQL database) using automated Playwright browser execution. "
        "All screens reflect real UI state, live database queries, and role-based views without mock data."
    )

    screenshots_catalog = [
        ("01-home.png", "Figure 1: Hostel Management System Home / Sign-In Portal"),
        ("02-login.png", "Figure 2: Role-Based Authentication Interface with Rate Limiting"),
        ("03-admin-dashboard.png", "Figure 3: Administrator Executive Dashboard with Real-Time Metrics"),
        ("04-warden-dashboard.png", "Figure 4: Warden Operations Dashboard with Occupancy & Request Overview"),
        ("05-student-dashboard.png", "Figure 5: Student Self-Service Dashboard (Personal Room, Fee Balance, Leave Status)"),
        ("06-maintenance-dashboard.png", "Figure 6: Maintenance Staff Dedicated Task Workspace (/app/my-tasks)"),
        ("07-student-management.png", "Figure 7: Student Directory with Department Filters & Profile Management"),
        ("08-room-management.png", "Figure 8: Room Inventory Management with Real-Time Bed Occupancy"),
        ("09-room-allocation.png", "Figure 9: Room Bed Allocation Modal with Over-Capacity Safeguards"),
        ("10-fee-management.png", "Figure 10: Fee Assessment Ledger, Balance Tracking & Payment Modal"),
        ("11-complaints.png", "Figure 11: Maintenance Complaints Management & Ticket Workflow Tracking"),
        ("12-visitors.png", "Figure 12: Residence Visitor Check-In/Check-Out Security Gate Log"),
        ("13-leave-request.png", "Figure 13: Student Leave Application Modal & Status History"),
        ("14-leave-approval.png", "Figure 14: Warden Leave Review & Approval Interface with Action Notes"),
        ("15-gate-pass.png", "Figure 15: Official Digital Gate Pass View with QR Verification Code"),
        ("16-notifications.png", "Figure 16: In-App User Notification Center with Real-Time Badge"),
        ("17-reports.png", "Figure 17: Operational Reporting Suite across 7 Domains with CSV Export")
    ]

    for img_name, caption in screenshots_catalog:
        add_image_with_caption(doc, img_name, caption)

    # ─── SECTION 6: END-TO-END WORKFLOW ──────────────────────────────────
    doc.add_page_break()
    add_styled_heading(doc, "SECTION 6 — END-TO-END WORKFLOWS", level=1)

    add_styled_heading(doc, "6.1 Core Operational Workflow", level=2)
    core_flow = (
        "User Enters Credentials at /login\n"
        "           │\n"
        "           ▼\n"
        "POST /api/auth/login → Express API verifies bcrypt password hash\n"
        "           │\n"
        "           ▼\n"
        "JWT generated & signed with JWT_SECRET → issued via HttpOnly Cookie\n"
        "           │\n"
        "           ▼\n"
        "Frontend reads role → navigates to role-specific dashboard (/app/dashboard)\n"
        "           │\n"
        "           ▼\n"
        "User triggers operational action (e.g. Bed Allocation, Payment, Complaint)\n"
        "           │\n"
        "           ▼\n"
        "requireAuth & requireRole middleware validate permissions server-side\n"
        "           │\n"
        "           ▼\n"
        "Business service executes parameterized SQL query in MySQL InnoDB pool\n"
        "           │\n"
        "           ▼\n"
        "Audit log committed to audit_logs → UI updates with real-time feedback"
    )
    add_code_block(doc, core_flow)

    add_styled_heading(doc, "6.2 Complete Leave Approval & Gate Pass Lifecycle", level=2)
    leave_flow = (
        "Student submits Leave Application at /app/leave (Departure & Return dates, Reason)\n"
        "           │\n"
        "           ▼\n"
        "POST /api/leave → Server validates departure < return datetime\n"
        "           │\n"
        "           ▼\n"
        "Record inserted into leave_requests with status = 'PENDING'\n"
        "           │\n"
        "           ▼\n"
        "Warden inspects Pending Requests table at /app/leave/requests\n"
        "           │\n"
        "           ▼\n"
        "Warden inputs Review Notes & clicks 'Approve'\n"
        "           │\n"
        "           ▼\n"
        "PATCH /api/leave/:id/approve initiates ACID database transaction:\n"
        "  1. status updated to 'APPROVED'\n"
        "  2. reviewed_by and reviewed_at timestamps recorded\n"
        "  3. unique collision-safe gate pass number generated (GP-YYYY-XXXXXX)\n"
        "  4. audit log written to audit_logs table\n"
        "  5. in-app notification delivered to student user\n"
        "           │\n"
        "           ▼\n"
        "Student views updated status 'APPROVED' on /app/leave and opens 'View Gate Pass'\n"
        "           │\n"
        "           ▼\n"
        "Official printable Digital Gate Pass modal renders with verification details"
    )
    add_code_block(doc, leave_flow)

    # ─── SECTION 7: WHAT IS DONE ─────────────────────────────────────────
    add_styled_heading(doc, "SECTION 7 — WHAT IS DONE (IMPLEMENTATION INVENTORY)", level=1)

    done_items = [
        "Requirements Analysis, Database Normalization (3NF), and Multi-Tier Architecture Design",
        "Authentication Engine: bcrypt password hashing (10 salt rounds) and HttpOnly JWT cookie sessions",
        "Initial First-Time Setup Wizard (/setup) for bootstrap administrator provisioning",
        "Role-Based Access Control (RBAC) covering Administrator, Warden, Student, and Maintenance roles",
        "Role-Tailored Dashboards delivering real-time database aggregates and recent activity feeds",
        "Student Directory & Registry: CRUD operations, department filters, and user account auto-linking",
        "Room Inventory Management: block, floor, room type classification, and bed capacity configurations",
        "Transactional Room Allocation with capacity safeguards preventing over-allocation",
        "Room Vacate Workflow: releasing active bed occupancies with audit timestamps",
        "Fee Assessment Ledger: academic term itemization, dynamic balance calculation, and status badges",
        "Payment Processing: overpayment prevention and automated unique receipt generation (RCPT-YYYYMMDD-HEX)",
        "Printable Payment Receipts with browser print styling and student ownership IDOR verification",
        "Maintenance Complaints Module: categorized issue submission (Electrical, Plumbing, Carpentry, etc.)",
        "Maintenance Work Orders Workflow: strict status transitions (SUBMITTED → ASSIGNED → IN_PROGRESS → RESOLVED → CLOSED)",
        "Technician Resolution Enforcement: mandatory work notes required before closing or resolving tickets",
        "Dedicated Maintenance Staff Portal (/app/my-tasks) scoped strictly to assigned technician IDs",
        "Campus Visitor Management: check-in logging, host student links, and active stay tracking",
        "Student Leave Management: departure/return validation and pending application queue",
        "Warden Leave Review Pipeline: approve/reject actions with mandatory rejection justifications",
        "Digital Gate Pass System: automatic generation of tamper-resistant gate pass numbers (GP-YYYY-XXXXXX)",
        "Real-Time In-App Notification Center: dynamic unread badge counter in navigation header",
        "Operational Reporting Suite across 7 domains with RFC 4180 CSV export and responsive @media print layouts",
        "Automated Quality Assurance: 153 Vitest unit/integration tests and 33 Playwright E2E browser tests passing",
        "Database Reliability: idempotent composite performance indexes script (sql/04_final_hardening.sql)"
    ]

    for item in done_items:
        p = doc.add_paragraph()
        p.paragraph_format.line_spacing = 1.15
        p.paragraph_format.space_after = Pt(3)
        r = p.add_run(f"✓  {item}")
        r.font.name = 'Calibri'
        r.font.size = Pt(9.5)
        r.font.color.rgb = RGBColor(30, 41, 59)

    doc.add_paragraph().paragraph_format.space_after = Pt(10)

    # ─── SECTION 8: WHAT NEEDS TO BE DONE ────────────────────────────────
    add_styled_heading(doc, "SECTION 8 — WHAT NEEDS TO BE DONE (FUTURE ENHANCEMENTS)", level=1)

    todo_items = [
        ("Cloud Production Deployment", "Provisioning production hosting on AWS EC2 or DigitalOcean with Nginx reverse proxy, PM2 process management, and automated SSL certificate renewal via Let's Encrypt."),
        ("Automated Off-Site Backups", "Configuring cron-based automated mysqldump synchronization to an encrypted off-site cloud bucket (AWS S3 Glacier or Google Cloud Storage) following the 3-2-1 backup strategy."),
        ("Third-Party SMS / Email Gateway Integration", "Integrating Twilio or AWS SES to dispatch instant SMS/email alerts to parents upon visitor arrival or emergency student leave approvals."),
        ("Biometric & Turnstile Gate Integration", "Connecting physical campus turnstiles and RFID card readers to the visitor and gate pass APIs for automated barrier opening."),
        ("Native Mobile Security Guard App", "Packaging a lightweight Capacitor or React Native application for residence security staff to scan and verify QR codes on printed digital gate passes.")
    ]

    for title, desc in todo_items:
        p = doc.add_paragraph()
        p.paragraph_format.line_spacing = 1.15
        p.paragraph_format.space_after = Pt(6)
        r_t = p.add_run(f"• {title}: ")
        r_t.font.name = 'Calibri'
        r_t.font.size = Pt(10)
        r_t.font.bold = True
        r_t.font.color.rgb = RGBColor(30, 41, 59)
        r_d = p.add_run(desc)
        r_d.font.name = 'Calibri'
        r_d.font.size = Pt(10)

    doc.add_paragraph().paragraph_format.space_after = Pt(10)

    # ─── SECTION 9: IMPLEMENTATION STATUS ────────────────────────────────
    add_styled_heading(doc, "SECTION 9 — IMPLEMENTATION STATUS MATRIX", level=1)

    status_data = [
        ("Authentication & Session Handling", "COMPLETED", "Bcrypt password hashing, HttpOnly JWT cookies, rate limiting, and password reset tokens verified."),
        ("Role-Based Access Control (RBAC)", "COMPLETED", "Declarative middleware enforcing 4 system roles and server-side IDOR ownership checks."),
        ("Student Management", "COMPLETED", "Roster listing, profile creation, search, department filtering, and active room link verified."),
        ("Room Inventory Management", "COMPLETED", "Room directory with real-time occupancy counting and room type/capacity configuration."),
        ("Room Bed Allocation", "COMPLETED", "Transactional allocation with over-capacity rejection and vacate occupancy release."),
        ("Fee Assessment & Invoicing", "COMPLETED", "Semester fee billing, partial settlement tracking, and outstanding balance computation."),
        ("Payment Processing & Receipts", "COMPLETED", "Payment entry, receipt code generation (RCPT-YYYYMMDD-HEX), and printable views."),
        ("Complaint Ticketing System", "COMPLETED", "Categorized ticket filing, technician assignment, priority badges, and status machine."),
        ("Maintenance Staff Workflow", "COMPLETED", "Dedicated /app/my-tasks workspace with mandatory repair resolution work notes."),
        ("Visitor Security Management", "COMPLETED", "Visitor check-in/out tracking, host student validation, and active visitor badges."),
        ("Leave Request Management", "COMPLETED", "Student leave submission with departure < return datetime validation."),
        ("Leave Review & Approval", "COMPLETED", "Warden review interface with transactional status transition, reviewer audit, and notifications."),
        ("Digital Gate Pass Generation", "COMPLETED", "Automatic issuance of collision-safe gate pass numbers (GP-YYYY-XXXXXX) with QR verification."),
        ("In-App Notification Center", "COMPLETED", "Header badge counter with unread notifications feed and mark-as-read triggers."),
        ("Multi-Domain Operational Reports", "COMPLETED", "7 reporting domains with search filters, RFC 4180 CSV export, and print CSS."),
        ("Role-Specific Dashboards", "COMPLETED", "Real-time summary statistics for Admin, Warden, Student, and Maintenance staff."),
        ("Automated Testing Suite", "COMPLETED", "153 Vitest unit/integration tests and 33 Playwright E2E browser tests passing."),
        ("Production Build & Hardening", "COMPLETED", "Vite production bundle and TypeScript server build compiled with 0 errors.")
    ]

    tbl_status = doc.add_table(rows=len(status_data) + 1, cols=3)
    tbl_status.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl_status.autofit = False

    # Header Row
    hdr_s = tbl_status.rows[0].cells
    hdr_s[0].text = "Module / Functional Domain"
    hdr_s[1].text = "Status"
    hdr_s[2].text = "Verification Details"
    for c in hdr_s:
        set_cell_background(c, "1E293B")
        set_cell_margins(c, top=100, bottom=100, left=120, right=120)
        p = c.paragraphs[0]
        for run in p.runs:
            run.font.name = 'Calibri'
            run.font.size = Pt(9.5)
            run.font.bold = True
            run.font.color.rgb = RGBColor(255, 255, 255)

    for idx, (mod, stat, desc) in enumerate(status_data):
        row_cells = tbl_status.rows[idx + 1].cells
        row_cells[0].text = mod
        row_cells[1].text = stat
        row_cells[2].text = desc
        bg_color = "F8FAFC" if idx % 2 == 0 else "FFFFFF"
        for i, c in enumerate(row_cells):
            set_cell_background(c, bg_color)
            set_cell_margins(c, top=70, bottom=70, left=120, right=120)
            p = c.paragraphs[0]
            for run in p.runs:
                run.font.name = 'Calibri'
                run.font.size = Pt(9)
                if i == 0:
                    run.font.bold = True
                    run.font.color.rgb = RGBColor(30, 41, 59)
                elif i == 1:
                    run.font.bold = True
                    run.font.color.rgb = RGBColor(16, 185, 129) # Emerald Green for COMPLETED
                else:
                    run.font.color.rgb = RGBColor(71, 85, 105)

    for row in tbl_status.rows:
        row.cells[0].width = Inches(2.2)
        row.cells[1].width = Inches(1.1)
        row.cells[2].width = Inches(3.7)

    doc.add_paragraph().paragraph_format.space_after = Pt(14)

    # ─── SECTION 10: CONCLUSION ──────────────────────────────────────────
    add_styled_heading(doc, "SECTION 10 — CONCLUSION", level=1)
    p_concl = doc.add_paragraph()
    p_concl.paragraph_format.line_spacing = 1.15
    p_concl.paragraph_format.space_after = Pt(10)
    p_concl.add_run(
        "The Hostel Management System has successfully fulfilled all functional and architectural specifications "
        "defined in the project requirements. Built on a resilient stack combining React 19, Express, TypeScript, and MySQL 8+, "
        "the application delivers an intuitive, accessible user interface coupled with rigorous server-side authorization and "
        "transactional integrity.\n\n"
        "Key operational workflows—including room capacity validation, fee settlement, maintenance ticket resolution, "
        "and leave approval with digital gate pass generation—have been verified through comprehensive automated testing "
        "(153 Vitest tests and 33 Playwright E2E browser tests) and live DOM interaction. The system is fully documented, "
        "production-built, and prepared for final academic submission and institutional deployment."
    )

    # Save to primary target location
    os.makedirs(os.path.dirname(DOCX_OUTPUT_PATH), exist_ok=True)
    doc.save(DOCX_OUTPUT_PATH)
    print(f"Successfully saved {DOCX_OUTPUT_PATH}")

    # Copy to supporting folder
    os.makedirs(os.path.dirname(DOCX_COPY_PATH), exist_ok=True)
    doc.save(DOCX_COPY_PATH)
    print(f"Successfully saved {DOCX_COPY_PATH}")

    # Copy to repository submission folder
    os.makedirs(os.path.dirname(REPO_SUBMISSION_PATH), exist_ok=True)
    doc.save(REPO_SUBMISSION_PATH)
    print(f"Successfully saved {REPO_SUBMISSION_PATH}")

if __name__ == "__main__":
    build_document()
