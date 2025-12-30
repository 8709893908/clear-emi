let currentStep = 1;

/* ================= HELPERS ================= */
function daysLeft(date) {
  const diff = new Date(date) - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}


function getLoans() {
  return JSON.parse(localStorage.getItem("loans")) || [];
}

function saveLoans(loans) {
  localStorage.setItem("loans", JSON.stringify(loans));
}

/* EMI Formula */
function calculateEMI(principal, annualRate, months) {
  if (!principal || !annualRate || !months) return 0;

  const r = annualRate / 12 / 100;
  return (principal * r * Math.pow(1 + r, months)) /
         (Math.pow(1 + r, months) - 1);
}

function addMonths(date, months) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}
function markPaid(index) {
  const loans = getLoans();
  loans[index].paidMonths = loans[index].paidMonths || [];
  loans[index].paidMonths.push(new Date().toISOString());
  saveLoans(loans);
  renderDashboard();
}
function editLoan(index) {
  const l = getLoans()[index];

  loanType.value = l.type;
  lender.value = l.lender;
  amount.value = l.amount;
  rate.value = l.rate;
  tenure.value = l.tenure;
  startDate.value = l.startDate;

  openAddLoan();
}


/* ================= SCREEN CONTROL ================= */

function showScreen(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

function goToDashboard() {
  showScreen("dashboard");
  renderDashboard();
}

function openAddLoan() {
  currentStep = 1;
  updateSteps();
  showScreen("addLoan");
}
function handleGetStarted() {
  const loans = getLoans();

  if (loans.length === 0) {
    openAddLoan();     // No loans → start add loan flow
  } else {
    goToDashboard();  // Loans exist → go to dashboard
  }
}


/* ================= STEPS ================= */

function updateProgress() {
  document.querySelectorAll(".progress span").forEach((s, i) => {
    s.classList.toggle("active", i < currentStep);
  });
}

function updateSteps() {
  document.querySelectorAll(".step").forEach(s => s.classList.remove("active"));
  document.getElementById(`step${currentStep}`).classList.add("active");
  document.getElementById("stepText").innerText = `Step ${currentStep} of 3`;
  updateProgress();
}

function nextStep() {
  if (currentStep < 3) currentStep++;
  if (currentStep === 3) showSummary();
  updateSteps();
}

function prevStep() {
  currentStep--;
  updateSteps();
}

/* ================= SUMMARY ================= */

function showSummary() {
  document.getElementById("summary").innerHTML = `
    <p><b>Loan Type:</b> ${loanType.value}</p>
    <p><b>Lender:</b> ${lender.value}</p>
    <p><b>Amount:</b> ₹${Number(amount.value).toLocaleString()}</p>
    <p><b>Interest:</b> ${rate.value}%</p>
    <p><b>Tenure:</b> ${tenure.value} months</p>
  `;
}

/* ================= CREATE LOAN ================= */

function createLoan() {
  const loans = getLoans();

  const loan = {
    type: loanType.value,
    lender: lender.value,
    amount: Number(amount.value),
    rate: Number(rate.value),
    tenure: Number(tenure.value),
    startDate: startDate.value || new Date().toISOString().split("T")[0]
  };

  loans.push(loan);
  saveLoans(loans);

  goToDashboard();
}

/* ================= DASHBOARD ================= */

function renderDashboard() {
  const loanList = document.getElementById("loanList");
  loanList.innerHTML = "";

  let loans = getLoans();

const sortBy = document.getElementById("sortLoan")?.value;

if (sortBy === "emi") {
  loans.sort((a, b) =>
    calculateEMI(b.amount, b.rate, b.tenure) -
    calculateEMI(a.amount, a.rate, a.tenure)
  );
}

if (sortBy === "date") {
  loans.sort((a, b) => {
    const da = new Date(a.startDate || 0);
    const db = new Date(b.startDate || 0);
    return da - db;
  });
}


  let totalOutstanding = 0;
  let totalMonthlyEMI = 0;

  const today = new Date();

  /* NEXT EMI LIST */
  const nextEmiText = document.getElementById("nextEmiText");
  nextEmiText.innerHTML = "";

  let hasAnyEmi = false;

  loans.forEach(l => {
    totalOutstanding += l.amount;

    const emi = calculateEMI(l.amount, l.rate, l.tenure);
    totalMonthlyEMI += emi;

    /* ---------- NEXT EMI PER LOAN ---------- */
    const start = new Date(l.startDate);
    if (!isNaN(start)) {
      let monthsPassed =
        (today.getFullYear() - start.getFullYear()) * 12 +
        (today.getMonth() - start.getMonth());

      if (monthsPassed < 0) monthsPassed = 0;

      if (monthsPassed < l.tenure) {
        const dueDate = addMonths(start, monthsPassed + 1);

        hasAnyEmi = true;

        nextEmiText.innerHTML += `
          <div style="margin-top:8px">
            ${l.lender} • ${l.type} • 
            ₹${Math.round(emi).toLocaleString()} • 
            ${dueDate.toDateString()}
          </div>
        `;
      }
    }

    /* ---------- LOAN CARD ---------- */
    loanList.innerHTML += `
      <div class="card">
        <p class="loan-type">${l.type}</p>
        <h4>${l.lender}</h4>
        <p class="loan-amount">₹${l.amount.toLocaleString()}</p>
        <p class="muted">EMI: ₹${Math.round(emi).toLocaleString()}</p>
      </div>
    `;
  });

  /* ---------- TOTALS ---------- */
  document.getElementById("totalOutstanding").innerText =
    `₹${totalOutstanding.toLocaleString()}`;

  document.getElementById("monthlyEMI").innerText =
    totalMonthlyEMI
      ? `₹${Math.round(totalMonthlyEMI).toLocaleString()}`
      : "₹0";

  /* ---------- NEXT EMI HEADER ---------- */
  if (hasAnyEmi) {
    document.querySelector(".gradient p").innerText = "Next EMI Due";
  } else {
    nextEmiText.innerText = "No EMIs yet";
  }
  const insightsList = document.getElementById("insightsList");
if (insightsList) {
  insightsList.innerHTML = "";

  if (loans.length) {
    const highest = loans.reduce((a, b) =>
      calculateEMI(b.amount, b.rate, b.tenure) >
      calculateEMI(a.amount, a.rate, a.tenure) ? b : a
    );

    insightsList.innerHTML += `
      <li>Highest EMI: ${highest.type} (${highest.lender})</li>
    `;
  }
}

}


/* ================= INIT ================= */

showScreen("landing");
/* ===== 3 DOT MENU LOGIC ===== */

function openMenu() {
  document.getElementById("menuOverlay").style.display = "flex";
}

function closeMenu() {
  document.getElementById("menuOverlay").style.display = "none";
}

function deleteAllData() {
  if (!confirm("This will delete all loans permanently. Continue?")) return;

  localStorage.removeItem("loans");

  closeMenu();
  renderDashboard();
}
function daysLeft(date) {
  const diff = new Date(date) - new Date();
  return Math.ceil(diff / (1000*60*60*24));
}
function toggleDarkMode() {
  document.body.classList.toggle("dark");
}
function exportCSV() {
  const loans = getLoans();
  let csv = "Type,Lender,Amount,Rate,Tenure,StartDate\n";

  loans.forEach(l => {
    csv += `${l.type},${l.lender},${l.amount},${l.rate},${l.tenure},${l.startDate}\n`;
  });

  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "ClearEMI_Data.csv";
  a.click();
}
function openCalendar() {
  document.getElementById("calendarOverlay").style.display = "flex";

  const list = document.getElementById("calendarList");
  list.innerHTML = "";

  getLoans().forEach(l => {
    list.innerHTML += `
      <p>${l.lender} • ${l.type} • ${l.startDate}</p>
    `;
  });
}

function closeCalendar() {
  document.getElementById("calendarOverlay").style.display = "none";
}
