const $ = (id) => document.getElementById(id);
let students = [], fees = [], payments = [], reports = [];
const today = new Date().toISOString().slice(0, 10);
$("today-date").textContent = new Date().toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" });
$("payment-date").value = today;
$("fee-due").min = today;

function money(value) {
  return "₹" + Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits:2, maximumFractionDigits:2 });
}
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
}
function toast(message) {
  const el = $("toast"); el.textContent = message; el.classList.add("show");
  clearTimeout(window.toastTimer); window.toastTimer = setTimeout(() => el.classList.remove("show"), 2800);
}
async function api(url, options = {}) {
  const response = await fetch(url, {
    headers: { "Content-Type":"application/json", ...(options.headers || {}) },
    ...options
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Something went wrong.");
  return data;
}
function showPage(page) {
  document.querySelectorAll(".page").forEach(el => el.classList.remove("active"));
  $(page + "-page").classList.add("active");
  document.querySelectorAll(".nav-link").forEach(el => el.classList.toggle("active", el.dataset.page === page));
  $("page-title").textContent = page[0].toUpperCase() + page.slice(1);
  if (page === "dashboard") loadDashboard();
  if (page === "students") loadStudents();
  if (page === "fees") loadFees();
  if (page === "payments") loadPayments();
  if (page === "reports") loadReports();
}
document.querySelectorAll(".nav-link").forEach(btn => btn.addEventListener("click", () => showPage(btn.dataset.page)));
document.querySelectorAll("[data-go]").forEach(btn => btn.addEventListener("click", () => showPage(btn.dataset.go)));
document.querySelectorAll("[data-close]").forEach(btn => btn.addEventListener("click", () => $(btn.dataset.close).classList.add("hidden")));

async function loadDashboard() {
  try {
    const d = await api("/api/dashboard");
    $("total-students").textContent = d.totalStudents;
    $("total-fees").textContent = money(d.totalFees);
    $("total-paid").textContent = money(d.totalPaid);
    $("total-pending").textContent = money(d.pendingAmount);
  } catch (e) { toast(e.message); }
}

async function loadStudents() {
  try {
    students = await api("/api/students");
    renderStudents();
    $("student-count").textContent = `${students.length} students`;
    $("fee-student").innerHTML = '<option value="">Select student</option>' +
      students.map(s => `<option value="${s.student_id}">${escapeHtml(s.name)} — ${escapeHtml(s.class)} / ${escapeHtml(s.roll_no)}</option>`).join("");
  } catch (e) { toast(e.message); }
}
function renderStudents() {
  const q = $("student-search").value.toLowerCase();
  const rows = students.filter(s => [s.name,s.class,s.roll_no,s.phone,s.email].join(" ").toLowerCase().includes(q));
  $("students-table").innerHTML = rows.length ? rows.map(s => `<tr>
    <td>${s.student_id}</td><td>${escapeHtml(s.name)}</td><td>${escapeHtml(s.class)}</td><td>${escapeHtml(s.roll_no)}</td>
    <td>${escapeHtml(s.phone || "—")}</td><td>${escapeHtml(s.email || "—")}</td>
    <td><button class="action-btn" data-edit-student="${s.student_id}">Edit</button><button class="action-btn delete" data-delete-student="${s.student_id}">Delete</button></td></tr>`).join("") :
    '<tr><td colspan="7" class="empty">No student records found.</td></tr>';
  document.querySelectorAll("[data-edit-student]").forEach(b => b.onclick = () => editStudent(Number(b.dataset.editStudent)));
  document.querySelectorAll("[data-delete-student]").forEach(b => b.onclick = () => deleteStudent(Number(b.dataset.deleteStudent)));
}
$("student-search").addEventListener("input", renderStudents);
$("add-student-btn").onclick = () => {
  $("student-form").reset(); $("student-id").value = ""; $("student-form-title").textContent = "Add student";
  $("student-form-card").classList.remove("hidden");
};
function editStudent(id) {
  const s = students.find(x => x.student_id === id); if (!s) return;
  $("student-id").value = s.student_id; $("student-name").value = s.name; $("student-class").value = s.class;
  $("student-roll").value = s.roll_no; $("student-phone").value = s.phone || ""; $("student-email").value = s.email || "";
  $("student-form-title").textContent = "Edit student"; $("student-form-card").classList.remove("hidden");
  $("student-form-card").scrollIntoView({ behavior:"smooth", block:"center" });
}
async function deleteStudent(id) {
  if (!confirm("Delete this student and all related fee/payment records?")) return;
  try { await api(`/api/students/${id}`, { method:"DELETE" }); toast("Student deleted."); loadStudents(); loadDashboard(); }
  catch (e) { toast(e.message); }
}
$("student-form").onsubmit = async (event) => {
  event.preventDefault();
  const id = $("student-id").value;
  const body = { name:$("student-name").value, class:$("student-class").value, roll_no:$("student-roll").value, phone:$("student-phone").value, email:$("student-email").value };
  try {
    await api(id ? `/api/students/${id}` : "/api/students", { method:id ? "PUT":"POST", body:JSON.stringify(body) });
    $("student-form-card").classList.add("hidden"); toast(id ? "Student updated." : "Student added."); loadStudents(); loadDashboard();
  } catch (e) { toast(e.message); }
};

async function loadFees() {
  try {
    fees = await api("/api/fees"); renderFees();
    $("fee-count").textContent = `${fees.length} records`;
    $("payment-fee").innerHTML = '<option value="">Select fee record</option>' + fees.filter(f => Number(f.balance) > 0).map(f =>
      `<option value="${f.fee_id}">${escapeHtml(f.name)} — ${escapeHtml(f.fee_type)} (Balance: ${money(f.balance)})</option>`).join("");
    await loadStudents();
  } catch (e) { toast(e.message); }
}
function renderFees() {
  const q = $("fee-search").value.toLowerCase();
  const rows = fees.filter(f => [f.name,f.class,f.roll_no,f.fee_type,f.academic_year].join(" ").toLowerCase().includes(q));
  $("fees-table").innerHTML = rows.length ? rows.map(f => `<tr><td>${escapeHtml(f.name)}</td><td>${escapeHtml(f.class)} / ${escapeHtml(f.roll_no)}</td>
    <td>${escapeHtml(f.academic_year)}</td><td>${escapeHtml(f.fee_type)}</td><td>${money(f.total_amount)}</td><td>${money(f.amount_paid)}</td>
    <td><b>${money(f.balance)}</b></td><td>${escapeHtml(f.due_date)}</td></tr>`).join("") :
    '<tr><td colspan="8" class="empty">No fee records found.</td></tr>';
}
$("fee-search").addEventListener("input", renderFees);
$("add-fee-btn").onclick = async () => {
  await loadStudents();
  if (!students.length) return toast("Add a student before assigning a fee.");
  $("fee-form").reset(); $("fee-form-card").classList.remove("hidden");
};
$("fee-form").onsubmit = async (event) => {
  event.preventDefault();
  const body = { student_id:$("fee-student").value, academic_year:$("academic-year").value, fee_type:$("fee-type").value, total_amount:$("fee-amount").value, due_date:$("fee-due").value };
  try { await api("/api/fees", { method:"POST", body:JSON.stringify(body) }); $("fee-form-card").classList.add("hidden"); toast("Fee assigned."); loadFees(); loadDashboard(); }
  catch (e) { toast(e.message); }
};

async function loadPayments() {
  try { payments = await api("/api/payments"); renderPayments(); $("payment-count").textContent = `${payments.length} payments`; await loadFees(); }
  catch (e) { toast(e.message); }
}
function renderPayments() {
  const q = $("payment-search").value.toLowerCase();
  const rows = payments.filter(p => [p.name,p.receipt_no,p.fee_type,p.payment_method].join(" ").toLowerCase().includes(q));
  $("payments-table").innerHTML = rows.length ? rows.map(p => `<tr><td><b>${escapeHtml(p.receipt_no)}</b></td><td>${escapeHtml(p.name)}</td>
    <td>${escapeHtml(p.fee_type)}</td><td>${money(p.amount_paid)}</td><td>${escapeHtml(p.payment_date)}</td><td>${escapeHtml(p.payment_method)}</td></tr>`).join("") :
    '<tr><td colspan="6" class="empty">No payment records found.</td></tr>';
}
$("payment-search").addEventListener("input", renderPayments);
$("add-payment-btn").onclick = async () => {
  await loadFees();
  if (!fees.some(f => Number(f.balance) > 0)) return toast("No pending fee balance is available.");
  $("payment-form").reset(); $("payment-date").value = today; $("payment-form-card").classList.remove("hidden");
};
$("payment-form").onsubmit = async (event) => {
  event.preventDefault();
  const body = { fee_id:$("payment-fee").value, amount_paid:$("payment-amount").value, payment_date:$("payment-date").value, payment_method:$("payment-method").value, receipt_no:$("receipt-no").value };
  try { await api("/api/payments", { method:"POST", body:JSON.stringify(body) }); $("payment-form-card").classList.add("hidden"); toast("Payment recorded."); loadPayments(); loadDashboard(); }
  catch (e) { toast(e.message); }
};

async function loadReports() {
  try { reports = await api("/api/reports"); renderReports(); $("report-count").textContent = `${reports.length} rows`; }
  catch (e) { toast(e.message); }
}
function renderReports() {
  const q = $("report-search").value.toLowerCase();
  const rows = reports.filter(r => [r.name,r.class,r.roll_no,r.fee_type,r.academic_year].join(" ").toLowerCase().includes(q));
  $("reports-table").innerHTML = rows.length ? rows.map(r => {
    const balance = Number(r.balance || 0), total = Number(r.total_amount || 0), paid = Number(r.amount_paid || 0);
    const status = !r.fee_id ? "No fee assigned" : balance <= 0 ? "Paid" : paid > 0 ? "Partial" : "Pending";
    const cls = status === "Paid" ? "paid" : status === "Partial" ? "partial" : "pending";
    return `<tr><td>${escapeHtml(r.name)}</td><td>${escapeHtml(r.class)} / ${escapeHtml(r.roll_no)}</td><td>${escapeHtml(r.academic_year || "—")}</td>
      <td>${escapeHtml(r.fee_type || "—")}</td><td>${r.fee_id ? money(total) : "—"}</td><td>${r.fee_id ? money(paid) : "—"}</td>
      <td><b>${r.fee_id ? money(balance) : "—"}</b></td><td>${r.fee_id ? `<span class="status ${cls}">${status}</span>` : status}</td></tr>`;
  }).join("") : '<tr><td colspan="8" class="empty">No report rows found.</td></tr>';
}
$("report-search").addEventListener("input", renderReports);
$("export-report").onclick = () => {
  if (!reports.length) return toast("There are no report rows to export.");
  const header = ["Student","Class","Roll No","Academic Year","Fee Type","Total Amount","Amount Paid","Balance","Status"];
  const data = reports.map(r => [r.name,r.class,r.roll_no,r.academic_year || "",r.fee_type || "",r.total_amount || 0,r.amount_paid || 0,r.balance || 0,
    !r.fee_id ? "No fee assigned" : Number(r.balance) <= 0 ? "Paid" : Number(r.amount_paid) > 0 ? "Partial" : "Pending"]);
  const csv = [header,...data].map(row => row.map(v => `"${String(v ?? "").replace(/"/g,'""')}"`).join(",")).join("\n");
  const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob([csv],{type:"text/csv"}));
  link.download = "pavan-shreyas-school-fee-report.csv"; link.click(); URL.revokeObjectURL(link.href);
};
loadDashboard();
