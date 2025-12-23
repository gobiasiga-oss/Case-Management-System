// Firebase imports using Modular SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, updateProfile } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js";
import {
  doc, getFirestore, getDoc, updateDoc, deleteDoc, collection, getDocs, setDoc, query, where, addDoc, documentId
} from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";


// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyC7LE6gdqgwfc14OMN_hmLyvT8qZRpybK0",
  authDomain: "fraud-data-explorer.firebaseapp.com",
  projectId: "fraud-data-explorer",
  storageBucket: "fraud-data-explorer.appspot.com",
  messagingSenderId: "1056225546907",
  appId: "1:1056225546907:web:951a7314a422f1c8d6ac3e",
  measurementId: "G-WBSXDZ8RX6"
};

// Initialize Firebase and Firestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const userName = localStorage.getItem("userName") || "Guest";
document.getElementById("welcomeMessage").textContent = `Welcome, ${userName}`;

// Section toggle logic with history and auth check
const sections = document.querySelectorAll(".content-section");

// Listen for browser back/forward
window.addEventListener("popstate", function (event) {
  // Check auth state
  if (!auth.currentUser) {
    window.location.href = "index.html";
    return;
  }
  const sectionId = (event.state && event.state.sectionId) || window.location.hash.replace('#', '') || localStorage.getItem("lastSectionId") || "dashboard";
  showSection(sectionId, false);
});

// On page load, check auth and restore last section
document.addEventListener("DOMContentLoaded", function () {
  // Firebase auth check
  auth.onAuthStateChanged(function (user) {
    if (!user) {
      window.location.href = "index.html";
    } else {
      // Show last section or dashboard
      const sectionId = window.location.hash.replace('#', '') || localStorage.getItem("lastSectionId") || "dashboard";
      showSection(sectionId, false);
    }
  });
});

function showSection(sectionId, pushState = true) {
  console.log(`🔍 showSection called with: ${sectionId}`);

  // Hide all content sections
  document.querySelectorAll(".content-section").forEach((section) => {
    section.style.display = "none";
  });

  const target = document.getElementById(sectionId);
  if (target) {
    console.log(`✅ Showing section: ${sectionId}`);
    target.style.display = "block";

    // Optional logic for dashboard (you can extend this for others too)
    if (sectionId === "dashboard") {
      populateSubsidiaryCards();
    }

    // Push to browser history if needed
    if (pushState) {
      history.pushState({ sectionId }, "", `#${sectionId}`);
    }

    // Store the section in local storage
    localStorage.setItem("lastSectionId", sectionId);
  } else {
    console.warn(`❌ Section ID not found: ${sectionId}`);
  }
}

// --- Go to Custom Reports Button Functionality ---
document.addEventListener("DOMContentLoaded", function () {
  const goToCustomReportsBtn = document.getElementById("go-to-custom-reports-btn");
  if (goToCustomReportsBtn) {
    goToCustomReportsBtn.addEventListener("click", function () {
      showSection("custom-reports");
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }
});

async function populateSubsidiaryCards() {
  console.log("📊 populateSubsidiaryCards() called");

  try {
    const fraudCasesRef = collection(db, "fraudCases");
    const snapshot = await getDocs(fraudCasesRef);
    console.log(`📥 Fetched ${snapshot.size} fraud case documents`);

    if (snapshot.empty) {
      console.warn("⚠️ No fraud cases found in the database.");
      return;
    }

    const counts = {};
    const fraudTypeCounts = {};

    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const subsidiary = data.subsidiary?.trim();
      const fraudType = data.caseType?.trim();

      if (subsidiary) {
        counts[subsidiary] = (counts[subsidiary] || 0) + 1;
      } else {
        console.warn(`⚠️ Missing 'subsidiary' in doc ${docSnap.id}`);
      }

      if (fraudType) {
        fraudTypeCounts[fraudType] = (fraudTypeCounts[fraudType] || 0) + 1;
      }
    });

    console.log("📦 Subsidiary counts:", counts);
    console.log("📦 Fraud type counts:", fraudTypeCounts);


    const cardsContainer = document.getElementById("subsidiary-cards");
    if (!cardsContainer) {
      console.error("❌ #subsidiary-cards not found in DOM");
      return;
    }

    cardsContainer.innerHTML = ""; // Clear existing cards

    const subsidiaries = Object.entries(counts);
    if (subsidiaries.length === 0) {
      cardsContainer.innerHTML = "<p>No fraud case data available.</p>";
      return;
    }

    // Capitalize first letter of each word in subsidiary name
    function capitalizeWords(str) {
      return str.replace(/\b\w/g, c => c.toUpperCase());
    }
    subsidiaries.forEach(([subsidiary, count]) => {
      const displayName = capitalizeWords(subsidiary);
      console.log(`📌 Rendering card: ${displayName} - ${count} case(s)`);
      const flagCode = getCountryCode(subsidiary);
      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML = `
        <img class="flag-img" src="https://flagcdn.com/w320/${flagCode}.png" alt="${displayName} Flag">
        <h4>${displayName}</h4>
        <p>${count} fraud case${count !== 1 ? "s" : ""}</p>
      `;
      cardsContainer.appendChild(card);
    });

    // Update summary cards dynamically
    updateSummaryCards(counts, fraudTypeCounts);
    // Update the summary cards in the dashboard section
    function updateSummaryCards(counts, fraudTypeCounts) {
      const summaryCards = document.querySelectorAll("#dashboard .summary-card");
      // Defensive: check if summary cards exist
      if (!summaryCards || summaryCards.length < 4) return;

      // Find country with min and max cases
      const countryEntries = Object.entries(counts);
      let minCountry = ["N/A", 0];
      let maxCountry = ["N/A", 0];
      if (countryEntries.length > 0) {
        minCountry = countryEntries.reduce((min, curr) => curr[1] < min[1] ? curr : min, countryEntries[0]);
        maxCountry = countryEntries.reduce((max, curr) => curr[1] > max[1] ? curr : max, countryEntries[0]);
      }

      // Find most and least common fraud types
      const typeEntries = Object.entries(fraudTypeCounts);
      let mostCommon = ["N/A", 0];
      let leastCommon = ["N/A", 0];
      if (typeEntries.length > 0) {
        mostCommon = typeEntries.reduce((max, curr) => curr[1] > max[1] ? curr : max, typeEntries[0]);
        leastCommon = typeEntries.reduce((min, curr) => curr[1] < min[1] ? curr : min, typeEntries[0]);
      }

      // Update summary cards
      summaryCards[0].querySelector("p").textContent = `${minCountry[0]} - ${minCountry[1]} case${minCountry[1] !== 1 ? 's' : ''}`;
      summaryCards[1].querySelector("p").textContent = `${maxCountry[0]} - ${maxCountry[1]} case${maxCountry[1] !== 1 ? 's' : ''}`;
      summaryCards[2].querySelector("p").textContent = mostCommon[0];
      summaryCards[3].querySelector("p").textContent = leastCommon[0];
    }

    // === Render Fraud Cases Bar Graph ===
    // Only update the canvas, not the whole graph-placeholder structure
    const dashboardSection = document.getElementById("dashboard");
    if (dashboardSection) {
      const graphPlaceholder = dashboardSection.querySelector(".graph-placeholder");
      if (graphPlaceholder) {
        // Remove any previous canvas
        let canvas = graphPlaceholder.querySelector("#fraudGraph");
        if (!canvas) {
          // If canvas doesn't exist, create and append it
          canvas = document.createElement("canvas");
          canvas.id = "fraudGraph";
          canvas.width = 400;
          canvas.height = 200;
          graphPlaceholder.appendChild(canvas);
        } else {
          // If canvas exists, clear it
          const ctx = canvas.getContext("2d");
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        // Render enhanced chart
        const ctx = canvas.getContext("2d");
        // Destroy previous chart instance if it exists
        if (window.dashboardFraudGraphInstance) {
          window.dashboardFraudGraphInstance.destroy();
        }
        // Create gradient for bars
        const gradient = ctx.createLinearGradient(0, 0, 0, 200);
        gradient.addColorStop(0, "#8DC63F");
        gradient.addColorStop(1, "#003366");

        // Capitalize first letter of each country name for graph labels
        function capitalizeWords(str) {
          return str.replace(/\b\w/g, c => c.toUpperCase());
        }
        const countryLabels = Object.keys(counts).map(capitalizeWords);
        window.dashboardFraudGraphInstance = new Chart(ctx, {
          type: "bar",
          data: {
            labels: countryLabels,
            datasets: [{
              label: "Fraud Cases",
              data: Object.values(counts),
              backgroundColor: gradient,
              borderRadius: 12,
              borderSkipped: false,
              borderWidth: 2,
              borderColor: "#fff"
            }]
          },
          options: {
            responsive: true,
            plugins: {
              legend: { display: false },
              tooltip: {
                backgroundColor: "#003366",
                titleColor: "#8DC63F",
                bodyColor: "#fff",
                borderColor: "#8DC63F",
                borderWidth: 2
              }
            },
            scales: {
              x: {
                grid: {
                  color: "rgba(141,198,63,0.15)",
                  borderColor: "#8DC63F"
                },
                ticks: {
                  color: "#003366",
                  font: { weight: "bold" }
                }
              },
              y: {
                grid: {
                  color: "rgba(0,51,102,0.08)",
                  borderColor: "#003366"
                },
                ticks: {
                  color: "#8DC63F",
                  font: { weight: "bold" }
                }
              }
            }
          }
        });
      }
    }

  } catch (error) {
    console.error("❌ Error in populateSubsidiaryCards():", error);
  }
}

// === Generate Reports Mini Cards Population ===
async function populateReportMiniCards() {
  const assignedList = document.getElementById("assigned-cases-list");
  const firstReviewList = document.getElementById("first-review-cases-list");
  const unassignedList = document.getElementById("unassigned-cases-list");

  if (!assignedList || !firstReviewList || !unassignedList) return;

  assignedList.innerHTML = '<p style="color:#888; font-size:0.95em;">Loading...</p>';
  firstReviewList.innerHTML = '<p style="color:#888; font-size:0.95em;">Loading...</p>';
  unassignedList.innerHTML = '<p style="color:#888; font-size:0.95em;">Loading...</p>';

  try {
    const snapshot = await getDocs(collection(db, "fraudCases"));
    const assigned = [];
    const firstReview = [];
    const unassigned = [];

snapshot.forEach(docSnap => {
  const data = docSnap.data();
  const forNumber = data.forNumber || docSnap.id;
  const dateReported = data.dateReported 
    ? new Date(data.dateReported).toLocaleDateString() 
    : "-";

  // Handle investigators as an array
  const investigators = Array.isArray(data.investigators) && data.investigators.length > 0
    ? data.investigators.join(", ") 
    : null;

  const statusRaw = data.status || "";
  const status = statusRaw.toLowerCase();

  if (!investigators) {
    // No investigators assigned
    unassigned.push({ forNumber, dateReported, status: "Unassigned" });
  } else if (
    status === "first-review" ||
    status === "first review" ||
    status === "submitted for first review"
  ) {
    // Investigators exist, status means it's in first review
    firstReview.push({ forNumber, dateReported, investigator: investigators, status: "Submitted for First Review" });
  } else {
    // Otherwise it’s considered assigned
    assigned.push({ forNumber, dateReported, investigator: investigators, status: "assigned" });
  }
});

    // You can log or use the categorized arrays as needed
    console.log("📂 Unassigned Cases:", unassigned);
    console.log("📂 First Review Cases:", firstReview);
    console.log("📂 Assigned Cases:", assigned);



    // Assigned Cases
    if (assigned.length === 0) {
      assignedList.innerHTML = '<p style="color:#888; font-size:0.95em;">No assigned cases.</p>';
    } else {
      assignedList.innerHTML = assigned.map(c =>
        `<div class=\"mini-case-card\">
          <div class=\"mini-case-header\"><span class=\"mini-case-for\">FOR: ${c.forNumber}</span></div>
          <div class=\"mini-case-details\">
            <span><strong>Date Reported:</strong> ${c.dateReported}</span><br>
            <span><strong>Investigator(s):</strong> ${c.investigator}</span>
          </div>
        </div>`
      ).join("");
    }

    // First Review Cases
    if (firstReview.length === 0) {
      firstReviewList.innerHTML = '<p style="color:#888; font-size:0.95em;">No cases submitted for first review.</p>';
    } else {
      firstReviewList.innerHTML = firstReview.map(c =>
        `<div class=\"mini-case-card\">
          <div class=\"mini-case-header\"><span class=\"mini-case-for\">FOR: ${c.forNumber}</span></div>
          <div class=\"mini-case-details\">
            <span><strong>Date Reported:</strong> ${c.dateReported}</span><br>
            <span><strong>Investigator(s):</strong> ${c.investigator}</span>
          </div>
        </div>`
      ).join("");
    }

    // Unassigned Cases
    if (unassigned.length === 0) {
      unassignedList.innerHTML = '<p style="color:#888; font-size:0.95em;">No unassigned cases.</p>';
    } else {
      unassignedList.innerHTML = unassigned.map(c =>
        `<div class=\"mini-case-card\">
          <div class=\"mini-case-header\"><span class=\"mini-case-for\">FOR: ${c.forNumber}</span></div>
          <div class=\"mini-case-details\">
            <span><strong>Date Reported:</strong> ${c.dateReported}</span>
          </div>
        </div>`
      ).join("");
    }
  } catch (err) {
    assignedList.innerHTML = firstReviewList.innerHTML = unassignedList.innerHTML = '<p style="color:#c00; font-size:0.95em;">Error loading cases.</p>';
    console.error("Error populating report mini cards:", err);
  }
}

// Call this when the Generate Reports section is shown
function observeGenerateReportsSection() {
  const nav = document.querySelector("nav ul");
  nav.addEventListener("click", (e) => {
    if (e.target.tagName === "LI" && e.target.textContent.trim() === "Generate Reports") {
      populateReportMiniCards();
    }
  });
}
observeGenerateReportsSection();

// Also auto-populate if user lands directly on Generate Reports
document.addEventListener("DOMContentLoaded", () => {
  const sectionId = window.location.hash.replace('#', '') || localStorage.getItem("lastSectionId") || "dashboard";
  if (sectionId === "generate-reports") {
    populateReportMiniCards();
  }
});

// === Custom Report Generation Logic ===

// === Custom Report Generation Logic for Custom Reports Section ===
document.addEventListener("DOMContentLoaded", () => {
  const reportForm = document.getElementById("custom-report-form");
  const previewSection = document.getElementById("report-preview-section");
  const previewTableContainer = document.getElementById("report-preview-table-container");
  const downloadBtn = document.getElementById("download-report-btn");
  const caseTypeSelect = document.getElementById("reportCaseType");
  const subsidiarySelect = document.getElementById("subsidiaryselectmain");
  const regionSelect = document.getElementById("reportRegion");
  const branchSelect = document.getElementById("reportBranch");
  const investigatorSelect = document.getElementById("reportInvestigator");

  if (!reportForm || !previewSection || !previewTableContainer || !downloadBtn || !caseTypeSelect) return;

  // === Populate Case Types ===
  (async function populateCaseTypes() {
    try {
      const snapshot = await getDocs(collection(db, "fraudCases"));
      const types = new Set();
      snapshot.forEach(doc => {
        const t = doc.data().caseType;
        if (t) types.add(t);
      });
      caseTypeSelect.innerHTML = '<option value="">All</option>' +
        Array.from(types).map(t => `<option value="${t}">${t}</option>`).join("");
    } catch (e) {
      console.error("Error loading case types", e);
    }
  })();

  // === Populate Subsidiaries ===
  async function populateSubsidiaries() {
    try {
      const snapshot = await getDocs(collection(db, "subsidiaries"));
      const options = ['<option value="">All</option>'];
      snapshot.forEach(doc => {
        const data = doc.data();
        // Use doc.id as value, display name or country
        options.push(`<option value="${doc.id}">${data.name || data.country || doc.id}</option>`);
      });
      subsidiarySelect.innerHTML = options.join("");
    } catch (e) {
      console.error("Failed to load subsidiaries", e);
    }
  }

  async function populateRegions(subsidiaryId) {
    if (!subsidiaryId) {
      regionSelect.innerHTML = '<option value="">All</option>';
      branchSelect.innerHTML = '<option value="">All</option>';
      return;
    }

    try {
      const snapshot = await getDocs(collection(db, `subsidiaries/${subsidiaryId}/regions`));
      const options = ['<option value="">All</option>'];
      snapshot.forEach(doc => {
        const data = doc.data();
        // Use doc.id as value, display name or doc.id
        options.push(`<option value="${doc.id}">${data.name || doc.id}</option>`);
      });
      regionSelect.innerHTML = options.join("");
    } catch (e) {
      console.error("Failed to load regions", e);
    }
  }

  async function populateBranches(subsidiaryId, regionId) {
    const branchSelect = document.getElementById("reportBranch");
    branchSelect.innerHTML = '<option value="">All</option>';

    if (!subsidiaryId || !regionId) {
      console.warn("Subsidiary ID or Region ID missing.");
      return;
    }

    // Capitalize first letter of subsidiaryId (e.g., 'japan' → 'Japan')
    subsidiaryId = subsidiaryId.charAt(0).toUpperCase() + subsidiaryId.slice(1);

    try {
      console.log("🚀 Starting branch population...");
      console.log(`Subsidiary ID: ${subsidiaryId}`);
      console.log(`Region ID: ${regionId}`);

      const branchListRef = collection(db, "branches", subsidiaryId, "regions", regionId, "branchList");
      const branchSnapshot = await getDocs(branchListRef);
      console.log("📦 Documents fetched:", branchSnapshot.size);

      const options = ['<option value="">All</option>'];
      let branchCount = 0;

      branchSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.branchName) {
          options.push(`<option value="${data.branchName}">${data.branchName}</option>`);
          console.log(`✔️ Found branch: ${data.branchName} (ID: ${doc.id})`);
          branchCount++;
        } else {
          console.warn(`⚠️ Missing 'branchName' in doc: ${doc.id}`);
        }
      });

      if (branchCount === 0) {
        options.length = 0;
        options.push('<option value="">No branches available</option>');
      }

      branchSelect.innerHTML = options.join("");
      console.log(" Branch dropdown updated.");
    } catch (e) {
      console.error(" Failed to load branches:", e);
      branchSelect.innerHTML = '<option value="">All</option>';
    }
  }

  // === Populate Investigators for Select2 Multi-Select ===
  async function populateInvestigators() {
    try {
      const snapshot = await getDocs(query(collection(db, "users"), where("role", "==", "investigator")));

      const select = document.getElementById("investigators");

      // Clear existing options
      select.innerHTML = "";

      // Add options dynamically
      snapshot.forEach(doc => {
        const data = doc.data();
        const name = data.fullName || data.name || doc.id;
        const option = document.createElement("option");
        option.value = doc.id; // Use Firestore document ID for value
        option.textContent = name;
        select.appendChild(option);
      });

      // Initialize Select2 (if not already initialized)
      $(select).select2({
        placeholder: "Select Investigators",
        allowClear: true,
        width: '100%'
      });

    } catch (e) {
      console.error("Failed to load investigators", e);
    }
  }


  subsidiarySelect.addEventListener("change", async () => {
    const subId = subsidiarySelect.value;

    // Handle "All" selection directly
    if (!subId) {
      regionSelect.innerHTML = '<option value="">All</option>';
      branchSelect.innerHTML = '<option value="">All</option>';
      return; //  Skip populateRegions
    }

    // Only populate regions if a specific subsidiary is selected
    regionSelect.innerHTML = '<option value="">Loading...</option>';
    branchSelect.innerHTML = '<option value="">All</option>';
    await populateRegions(subId);
  });


  regionSelect.addEventListener("change", () => {
    const subId = subsidiarySelect.value;
    const regId = regionSelect.value;
    populateBranches(subId, regId);
  });

  // === Init Dropdowns ===
  populateSubsidiaries();
  populateInvestigators();

  // === Handle Report Form Submission ===
  reportForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    previewSection.style.display = "none";
    previewTableContainer.innerHTML = '<p style="color:#888;">Loading preview...</p>';

    const startDate = reportForm.reportStartDate.value;
    const endDate = reportForm.reportEndDate.value;
    const caseType = reportForm.reportCaseType.value;
    const status = reportForm.reportStatus.value;
    const subsidiary = reportForm.subsidiaryselectmain.value;
    const region = reportForm.reportRegion.value;
    const branch = reportForm.reportBranch.value;
    const investigator = reportForm.reportInvestigator.value;

    try {
      const snapshot = await getDocs(collection(db, "fraudCases"));
      let cases = [];
      snapshot.forEach(doc => {
        const d = doc.data();
        cases.push({ id: doc.id, ...d });
      });

      cases = cases.filter(c => {
        let ok = true;
        if (startDate && c.dateReported) ok = ok && c.dateReported >= startDate;
        if (endDate && c.dateReported) ok = ok && c.dateReported <= endDate;
        if (caseType) ok = ok && c.caseType === caseType;
        if (status) ok = ok && c.status === status;
        if (subsidiary) ok = ok && c.subsidiary === subsidiary;
        if (region) ok = ok && c.region === region;
        if (branch) ok = ok && c.branch === branch;
        if (investigator) ok = ok && c.investigator === investigator;
        return ok;
      });

      if (cases.length === 0) {
        previewTableContainer.innerHTML = '<p style="color:#c00;">No cases found for selected filters.</p>';
        previewSection.style.display = "block";
        return;
      }

      const columns = [
        "FOR Number", "Case Type", "Date Reported", "Status", "Amount Involved", "Currency", "Exchange Rate",
        "Branch", "Region", "Subsidiary", "Investigator", "Group Oversight", "HML",
        "Incident Start Date", "Incident End Date",
        "Staff Involved", "Successful Fraud",
        "Findings", "Conclusion", "Recommendations", "Submitted At"
      ];

      const keys = [
        "forNumber", "caseType", "dateReported", "status", "amountInvolved", "currency", "exchangeRate",
        "branch", "region", "subsidiary", "investigator", "groupOversight", "hml",
        "incidentStartDate", "incidentEndDate",
        "staffInvolved", "successfulFraud",
        "findings", "conclusion", "recommendationsFormatted", "submittedAt"
      ];

      let html = '<div style="overflow-x:auto;"><table style="width:100%; border-collapse:collapse;">';
      html += '<thead><tr>' + columns.map(c => `<th style="border-bottom:1px solid #ccc; padding:8px; text-align:left; background:#f5f5f5;">${c}</th>`).join("") + '</tr></thead>';
      html += '<tbody>' + cases.map(row =>
        '<tr>' + keys.map(k => `<td style="padding:8px; border-bottom:1px solid #eee;">${row[k] !== undefined ? row[k] : ""}</td>`).join("") + '</tr>'
      ).join("") + '</tbody></table></div>';
      previewTableContainer.innerHTML = html;
      previewSection.style.display = "block";
      previewSection._cases = cases;

    } catch (err) {
      console.error(err);
      previewTableContainer.innerHTML = '<p style="color:#c00;">Error loading report preview.</p>';
      previewSection.style.display = "block";
    }
  });

  downloadBtn.addEventListener("click", () => {
    const cases = previewSection._cases || [];
    if (!cases.length) return;

    const csvHeaders = [
      "FOR Number", "Case Type", "Date Reported", "Status", "Amount Involved", "Currency", "Exchange Rate",
      "Branch", "Region", "Investigator", "Subsidiary", "Group Oversight", "HML",
      "Incident Start Date", "Incident End Date", "Staff Involved", "Successful Fraud",
      "Brief Details", "Brief Instructions", "Findings", "Conclusion",
      "Recommendation", "Actioner", "Submitted At"
    ];

    const csvRows = [csvHeaders.join(",")];

    for (const row of cases) {
      const baseValues = [
        row.forNumber,
        row.caseType,
        formatDate(row.dateReported),
        row.status,
        row.amountInvolved,
        row.currency,
        row.exchangeRate,
        row.branch,
        row.region,
        row.investigator,
        row.subsidiary,
        row.groupOversight,
        row.hml,
        formatDate(row.incidentStartDate),
        formatDate(row.incidentEndDate),
        row.staffInvolved,
        row.successfulFraud,
        row.briefDetails,
        row.briefInstructions,
        row.findings,
        row.conclusion
      ];

      const recommendations = Array.isArray(row.recommendations) ? row.recommendations : [];
      const submitted = formatDate(row.submittedAt);

      if (recommendations.length > 0) {
        recommendations.forEach((rec, index) => {
          const base = index === 0 ? baseValues : Array(baseValues.length).fill(""); // Only include base info for first
          csvRows.push([
            ...base.map(v => `"${(v ?? "").toString().replace(/"/g, '""')}"`),
            `"${(rec.recommendation || "").replace(/"/g, '""')}"`,
            `"${(rec.actioner || "").replace(/"/g, '""')}"`,
            `"${submitted}"`
          ].join(","));
        });
      } else {
        csvRows.push([
          ...baseValues.map(v => `"${(v ?? "").toString().replace(/"/g, '""')}"`),
          "", "", `"${submitted}"`
        ].join(","));
      }

      // Add a blank row between cases for better spacing
      csvRows.push("");
    }

    const blob = new Blob(["\uFEFF" + csvRows.join("\r\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fraud_report_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);

    function formatDate(date) {
      if (!date) return "";
      try {
        const d = typeof date.toDate === "function" ? date.toDate() : new Date(date);
        return d.toLocaleDateString("en-GB");
      } catch {
        return "";
      }
    }
  });

});

async function populateDashboard() {
  const casesSnap = await getDocs(collection(db, "fraudCases"));
  const countryCounts = {};
  const fraudTypeCounts = {};

  casesSnap.forEach(doc => {
    const data = doc.data();
    const country = data.subsidiary;
    const fraudType = data.fraudType;

    if (country) {
      countryCounts[country] = (countryCounts[country] || 0) + 1;
    }
    if (fraudType) {
      fraudTypeCounts[fraudType] = (fraudTypeCounts[fraudType] || 0) + 1;
    }
  });

  // === 1. Populate Cards ===
  const cardsContainer = document.querySelector(".cards-container");
  cardsContainer.innerHTML = ""; // Clear existing

  for (const [country, count] of Object.entries(countryCounts)) {
    const flagCode = getCountryCode(country); // you define this mapping
    cardsContainer.innerHTML += `
            <div class="card">
                <img class="flag-img" src="https://flagcdn.com/w320/${flagCode}.png" alt="${country} Flag">
                <h4>${country}</h4>
                <p>${count} fraud case${count !== 1 ? "s" : ""}</p>
            </div>
        `;
  }

  // === 2. Populate Graph ===
  const graphContainer = document.querySelector(".graph-placeholder");
  graphContainer.innerHTML = `
        <canvas id="fraudGraph" width="400" height="200"></canvas>
    `;

  const ctx = document.getElementById("fraudGraph").getContext("2d");
  new Chart(ctx, {
    type: "bar",
    data: {
      labels: Object.keys(countryCounts),
      datasets: [{
        label: "Fraud Cases",
        data: Object.values(countryCounts),
        backgroundColor: "#006400",
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        title: { display: true, text: "Fraud Cases by Country" }
      }
    }
  });

  // === 3. Summary Cards ===
  const summaryCards = document.querySelectorAll(".summary-card");
  const maxCountry = Object.entries(countryCounts).sort((a, b) => b[1] - a[1])[0];
  const minCountry = Object.entries(countryCounts).sort((a, b) => a[1] - b[1])[0];
  const mostCommon = Object.entries(fraudTypeCounts).sort((a, b) => b[1] - a[1])[0];
  const leastCommon = Object.entries(fraudTypeCounts).sort((a, b) => a[1] - b[1])[0];

  summaryCards[0].querySelector("p").textContent = `${minCountry[0]} - ${minCountry[1]} case(s)`;
  summaryCards[1].querySelector("p").textContent = `${maxCountry[0]} - ${maxCountry[1]} case(s)`;
  summaryCards[2].querySelector("p").textContent = mostCommon[0];
  summaryCards[3].querySelector("p").textContent = leastCommon[0];
}

// Country name to flag code helper
function getCountryCode(countryName) {
  const map = {
    "United Kingdom": "gb",
    "United States": "us",
    "Germany": "de",
    "Japan": "jp",
    "Kenya": "ke",
    // Add more mappings as needed
  };
  return map[countryName] || "un"; // fallback
}


async function populateInvestigatorDropdown() {
  const investigatorSelect = document.getElementById("investigators");

  try {
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("role", "==", "investigator"));
    const querySnapshot = await getDocs(q);

    investigatorSelect.innerHTML = ""; // Clear previous options

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const option = document.createElement("option");
      option.value = doc.id; // ✅ Correct: store the document ID
      option.textContent = data.name || doc.id; // Display name, fallback to ID
      investigatorSelect.appendChild(option);
    });

    // ✅ Initialize Select2
    $(investigatorSelect).select2({
      placeholder: "Assign Investigators",
      allowClear: true,
      width: '100%'
    });

  } catch (error) {
    console.error("Error fetching investigators:", error);
  }
}

async function populateAssignForm(data) {
  const form = document.querySelector("#assign-cases form");
  if (!form) {
    console.warn("Assign Cases form not found.");
    return;
  }

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
  };

  const setValue = (selector, value) => {
    const el = form.querySelector(selector);
    if (el) el.value = value || "";
  };

  // Fill the simple fields
  setValue("#forNumber", data.forNumber);
  setValue("#region", data.region);
  setValue("#amountInvolved", data.amountInvolved);
  setValue("#branch", data.branch);
  setValue("#briefDetails", data.briefDetails);
  setValue("#caseType", data.caseType);
  setValue("#dateReported", formatDate(data.dateReported));
  setValue("#incidentStartDate", formatDate(data.incidentStartDate));
  setValue("#incidentEndDate", formatDate(data.incidentEndDate));
  setValue("#groupOversight", data.groupOversight);
  setValue("#hml", data.hml);
  setValue("#status", data.status || "open");
  setValue("#subsidiary", data.subsidiary);
  setValue("#currency", data.currency);

  try {
    const caseTypeSelect = form.querySelector("#caseType");
    if (caseTypeSelect) caseTypeSelect.innerHTML = "";
    const snapshot = await getDocs(collection(db, "fraudTypes"));
    let caseTypes = [];

    snapshot.forEach(doc => {
      const dataDoc = doc.data();
      const typeName = dataDoc.type || doc.id;
      caseTypes.push(typeName);
    });

    // Remove current case type from the list if present
    const filteredTypes = caseTypes.filter(type => type !== data.caseType);

    // Add current case type as the first option (selected)
    if (data.caseType) {
      const opt = document.createElement("option");
      opt.value = data.caseType;
      opt.textContent = `${data.caseType} (Current)`;
      opt.selected = true;
      caseTypeSelect.appendChild(opt);
    }

    // Add the rest of the types
    filteredTypes.forEach(type => {
      const opt = document.createElement("option");
      opt.value = type;
      opt.textContent = type;
      caseTypeSelect.appendChild(opt);
    });

  } catch (error) {
    console.error("Error loading case types:", error);
  }

  // Populate investigator dropdown
  await populateInvestigatorDropdown();

  // Radio buttons
  if (data.successfulFraud === "yes") {
    document.getElementById("successfulFraudYes").checked = true;
  } else if (data.successfulFraud === "no") {
    document.getElementById("successfulFraudNo").checked = true;
  } else {
    document.getElementById("successfulFraudOther").checked = true;
  }
}

// This assumes the form has an ID of "assignCaseForm" 
document.getElementById("assignCaseForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const form = e.target;
  const caseId = form.forNumber.value.trim().replace(/\//g, "_");

  if (!caseId) {
    alert("FOR Number is required.");
    return;
  }

  const caseRef = doc(db, "fraudCases", caseId);

  // Get HML value and determine timeframe
  const hmlValue = form.hml.value.toUpperCase();
  let daysToComplete = 0;

  if (hmlValue === "H") daysToComplete = 60;
  else if (hmlValue === "M") daysToComplete = 30;
  else if (hmlValue === "L") daysToComplete = 10;

  // Function to calculate deadline excluding weekends
  function calculateDeadline(startDateStr, daysToAdd) {
    let date = new Date(startDateStr);
    let addedDays = 0;

    while (addedDays < daysToAdd) {
      date.setDate(date.getDate() + 1);
      const day = date.getDay(); // 0 = Sunday, 6 = Saturday
      if (day !== 0 && day !== 6) {
        addedDays++;
      }
    }

    return date.toISOString().split("T")[0]; // format as YYYY-MM-DD
  }

  const startDate = form.dateReported.value || new Date().toISOString().split("T")[0];
  const deadlineToComplete = calculateDeadline(startDate, daysToComplete);

  // Get selected investigator IDs and names
  const investigatorIDs = $('#investigators').val(); // Firestore document IDs
  const investigatorNames = $('#investigators option:selected')
    .map(function () {
      return $(this).text();
    })
    .get();

  if (!investigatorIDs || investigatorIDs.length === 0) {
    alert("Please assign the case to at least one investigator.");
    return;
  }

  // Fetch emails using IDs and filter by role === "investigator"
  let investigatorEmails = [];
  let foundAny = false;

  try {
    const batchSize = 10;

    for (let i = 0; i < investigatorIDs.length; i += batchSize) {
      const batchIDs = investigatorIDs.slice(i, i + batchSize);
      if (!batchIDs.length) continue;

      const q = query(
        collection(db, "users"),
        where(documentId(), "in", batchIDs)
      );

      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        querySnapshot.forEach(doc => {
          const data = doc.data();

          // ✅ Filter manually by role
          if (data.role === "investigator") {
            foundAny = true;
            if (data.email) {
              investigatorEmails.push(data.email);
            }
          }
        });
      }
    }

    if (!foundAny) {
      showCustomAlert("No matching investigators found. Please check your selection or add investigators in the Manage Users section.");
      return;
    }

    if (investigatorEmails.length === 0) {
      alert("None of the selected investigators have emails.");
      return;
    }

  } catch (err) {
    console.error("Error fetching investigator emails:", err);
    alert("Could not fetch investigator emails.");
    return;
  }


  const updatedData = {
    caseType: form.caseType.value,
    exchangeRate: parseFloat(form.exchangeRate.value),
    currency: form.currency.value,
    amountInvolved: parseFloat(form.amountInvolved.value),
    branch: form.branch.value,
    region: form.region.value,
    briefDetails: form.briefDetails.value,
    briefInstructions: form.briefInstructions.value,
    dateReported: form.dateReported.value,
    incidentStartDate: form.incidentStartDate.value,
    incidentEndDate: form.incidentEndDate.value,
    groupOversight: form.groupOversight.value,
    hml: hmlValue,
    investigators: investigatorNames,
    status: form.status.value,
    subsidiary: form.subsidiary.value,
    successfulFraud: form.successfulFraud.value,
    staffInvolved: form.staffInvolved.value,
    daysToComplete,
    deadlineToComplete,
    dateAssigned: new Date().toISOString(),
  };

  try {
    await updateDoc(caseRef, updatedData);
    alert("Case updated successfully!");

    // Send email to each investigator
    for (const email of investigatorEmails) {
      await fetch("http://127.0.0.1:5000/send-case-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email,
          caseId: form.forNumber.value,
          deadline: deadlineToComplete,
          details: `Assigned by ${userName} on ${new Date().toLocaleDateString()}`
        })
      });
    }
  } catch (error) {
    console.error("Error updating case or sending email:", error);
    alert("Failed to update case or send notification.");
  }

});



// Load Active Cases and render clickable cards (UPDATED)
async function loadActiveCases() {
  console.log("📦 Loading active cases...");
  const container = document.getElementById("cases-container");
  container.innerHTML = "<p>Loading active cases...</p>";

  try {
    const q = query(collection(db, "fraudCases"), where("status", "==", "unassigned"));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      console.log("⚠️ No active fraud cases found.");
      container.innerHTML = "<p>No active fraud cases found.</p>";
      return;
    }

    container.innerHTML = ""; // Clear loading message
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      console.log("📄 Found case:", data.forNumber);

      const card = document.createElement("div");
      card.className = "card";
      card.setAttribute("data-case-card", "true");
      card.setAttribute("data-id", docSnap.id);

      card.innerHTML = `
        <h4>${data.forNumber || 'Unnumbered Case'}</h4>
        <p><strong>Date Reported:</strong> ${data.dateReported || 'N/A'}</p>
        <p><strong>Case Type:</strong> ${data.caseType || 'N/A'}</p>
        <p><strong>Amount Involved:</strong> ${data.amountInvolved ? `${data.amountInvolved.toLocaleString()}` : 'N/A'}</p>
      `;

      // Handle card click - show form with case data
      card.addEventListener("click", () => {
        console.log(`🖱️ Case card clicked: ${data.forNumber}`);
        showSection("assign-cases");
        populateAssignForm(data);
      });

      container.appendChild(card);
    });
  } catch (error) {
    console.error("❌ Failed to load active cases:", error);
    container.innerHTML = "<p>Error loading active cases. Please try again.</p>";
  }
}
async function populateFirstCaseReviewForm(caseData) {
  const form = document.querySelector("#firstReviewCaseForm");
  if (!form) {
    console.warn("First Case Review Form Not Found.");
    return;
  }

  // Format Firestore dates into yyyy-mm-dd
  const formatDate = (value) => {
    if (!value) return "";

    let date;

    if (value.toDate) {
      // Firestore Timestamp -> JS Date
      date = value.toDate();
    } else {
      // String or number fallback
      date = new Date(value);
    }

    if (isNaN(date.getTime())) return "";

    // Input type="date" needs yyyy-mm-dd
    return date.toISOString().split("T")[0];
  };

  // Helper to set input values safely
  const setValue = (selector, value) => {
    const el = form.querySelector(selector);
    if (el) el.value = value || "";
  };

  // Populate recommendations table
  function populateRecommendationsTable(recommendations) {
    const tbody = document.querySelector("#recommendations-table tbody");
    tbody.innerHTML = ""; // clear old rows

    if (!Array.isArray(recommendations) || recommendations.length === 0) {
      const row = document.createElement("tr");
      row.innerHTML = `<td colspan="2" style="text-align:center;">No recommendations found</td>`;
      tbody.appendChild(row);
      return;
    }

    recommendations.forEach(item => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${item.recommendation || "N/A"}</td>
        <td>${item.actioner || "N/A"}</td>
      `;
      tbody.appendChild(row);
    });
  }

  // ✅ Use the caseData passed into the function
  populateRecommendationsTable(caseData.recommendations);

  // --- Identifiers ---
  setValue("#identifierForNumber", caseData.forNumber);
  setValue("#identifierCaseType", caseData.caseType);
  setValue("#identifierStatus", caseData.status || "open");

  // --- Case Details ---
  setValue("#detailsBrief", caseData.briefDetails);

  // --- Financials ---
  setValue("#financialAmount", caseData.amountInvolved);
  setValue("#financialCurrency", caseData.currency);
  setValue("#financialExchangeRate", caseData.exchangeRate);

  // --- Location ---
  setValue("#locationBranch", caseData.branch);
  setValue("#locationRegion", caseData.region);
  setValue("#locationSubsidiary", caseData.subsidiary);

  // --- Dates ---
  setValue("#dateReported", formatDate(caseData.dateReported));
  setValue("#dateIncidentStart", formatDate(caseData.incidentStartDate));
  setValue("#dateIncidentEnd", formatDate(caseData.incidentEndDate));
  setValue("#dateSubmitted", formatDate(caseData.submittedAt));

  // --- Assignment ---
  setValue("#assignmentGroupOversight", caseData.groupOversight);
  setValue("#assignmentHml", caseData.hml);

  if (Array.isArray(caseData.investigators)) {
    setValue("#assignmentInvestigator", caseData.investigators.join(", "));
  } else {
    setValue("#assignmentInvestigator", caseData.investigators || "");
  }

  // --- Outcome ---
  setValue("#outcomeFindings", caseData.findings);
  setValue("#outcomeConclusion", caseData.conclusion);

  // ✅ Fraud radios
  if (caseData.successfulFraud === "yes") {
    document.getElementById("outcomeFraudYes").checked = true;
  } else if (caseData.successfulFraud === "no") {
    document.getElementById("outcomeFraudNo").checked = true;
  } else if (caseData.successfulFraud) {
    document.getElementById("outcomeFraudOther").checked = true;
  }

  // ✅ Staff involved radios
  if (caseData.staffInvolved === "yes") {
    document.getElementById("outcomeStaffYes").checked = true;
  } else if (caseData.staffInvolved === "no") {
    document.getElementById("outcomeStaffNo").checked = true;
  }

  // --- Optional: Populate case type dropdown if you switch to <select> ---
  try {
    const caseTypeSelect = form.querySelector("#identifierCaseType");
    if (caseTypeSelect && caseTypeSelect.tagName === "SELECT") {
      caseTypeSelect.innerHTML = "";

      const snapshot = await getDocs(collection(db, "fraudTypes"));
      let caseTypes = [];

      snapshot.forEach(doc => {
        const dataDoc = doc.data();
        const typeName = dataDoc.type || doc.id;
        caseTypes.push(typeName);
      });

      const filteredTypes = caseTypes.filter(type => type !== caseData.caseType);

      // Add current case type as the first option (selected)
      if (caseData.caseType) {
        const opt = document.createElement("option");
        opt.value = caseData.caseType;
        opt.textContent = `${caseData.caseType} (Current)`;
        opt.selected = true;
        caseTypeSelect.appendChild(opt);
      }

      filteredTypes.forEach(type => {
        const opt = document.createElement("option");
        opt.value = type;
        opt.textContent = type;
        caseTypeSelect.appendChild(opt);
      });
    }
  } catch (error) {
    console.error("Error loading case types", error);
  }
}

async function loadFirstReviewCases(){
  const container = document.getElementById("first-review-cases-container");
  container.innerHTML = "<p>Loading first review cases...</p>";

  try {
    const q = query(collection(db, "fraudCases"), where("status", "==", "submitted for first review"));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      console.log("⚠️ No first review cases found.");
      container.innerHTML = "<p>No first review cases found.</p>";
      return;
    }

    container.innerHTML = ""; // Clear loading message
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      console.log("📄 Found first review case:", data.forNumber);
    
      const card = document.createElement("div");
      card.className = "card";
      card.setAttribute("data-case-card", "true");
      card.setAttribute("data-id", docSnap.id);

      card.innerHTML = `
        <h4>${data.forNumber || 'Unnumbered Case'}</h4>
        <p><strong>Date Reported:</strong> ${data.dateReported || 'N/A'}</p>
        <p><strong>Case Type:</strong> ${data.caseType || 'N/A'}</p>
        <p><strong>Amount Involved:</strong> ${data.amountInvolved ? `${data.amountInvolved.toLocaleString()}` : 'N/A'}</p>
      `;

      // Handle card click - show form with case data
      card.addEventListener("click", () => {
        console.log(`🖱️ First review case card clicked: ${data.forNumber}`);
        showSection("first-review-cases");
        populateFirstCaseReviewForm(data);
      });

      container.appendChild(card);
    });
  } catch (error) {
    console.error("❌ Failed to load first review cases:", error);
    container.innerHTML = "<p>Error loading first review cases. Please try again.</p>";
  }
}

// Load group oversight names into dropdown for Investigating Officer form
async function loadGroupOversights() {
  const select = document.getElementById("officer-reports-to");
  if (!select) return; // safety check
  select.innerHTML = "<option value=''>Select Group Oversight</option>";

  try {
    const snapshot = await getDocs(collection(db, "groupOversights"));
    snapshot.forEach(doc => {
      const option = document.createElement("option");
      option.value = doc.id;
      option.textContent = doc.data().name;
      select.appendChild(option);
    });
  } catch (error) {
    console.error("Error fetching group oversights:", error);
  }
}

async function loadCountries() {
  const select = document.getElementById("branch-country");
  if (!select) return;
  select.innerHTML = "<option value=''>Select Country</option>";

  try {
    const snapshot = await getDocs(collection(db, "subsidiaries"));
    snapshot.forEach(doc => {
      const option = document.createElement("option");
      option.value = doc.data().country;   // Use the country name as the value
      option.textContent = doc.data().country;
      select.appendChild(option);
    });
  } catch (error) {
    console.error("Error fetching countries:", error);
  }
}

async function loadCasesDeadlineChart() {
  const canvas = document.getElementById("casesDeadlineChart");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Destroy previous chart instance if it exists
  if (window.reportsCasesDeadlineChartInstance) {
    window.reportsCasesDeadlineChartInstance.destroy();
  }

  const snapshot = await getDocs(collection(db, "fraudCases"));
  if (snapshot.empty) return;

  const today = new Date();
  const cases = [];

  snapshot.forEach(docSnap => {
    const data = docSnap.data();
    let forNumber = data.forNumber || docSnap.id;

    // Shorten the format
    forNumber = forNumber
      .replace(/FORENSIC\s*/i, "FOR")  // Replace "FORENSIC " with "FOR"
      .replace(/\s+/g, "");             // Remove any extra spaces

    const deadlineStr = data.deadlineToComplete;
    if (deadlineStr) {
      const deadline = new Date(deadlineStr);
      // Calculate business days left (excluding weekends)
      function businessDaysBetween(start, end) {
        let count = 0;
        let current = new Date(start);
        current.setHours(0, 0, 0, 0);
        end = new Date(end);
        end.setHours(0, 0, 0, 0);
        const step = start < end ? 1 : -1;
        while ((step === 1 && current <= end) || (step === -1 && current >= end)) {
          const day = current.getDay();
          if (day !== 0 && day !== 6) count += step;
          current.setDate(current.getDate() + step);
        }
        return count;
      }
      const daysLeft = businessDaysBetween(today, deadline);
      cases.push({ label: forNumber, daysLeft });
    }
  });

  // Sort by days left
  cases.sort((a, b) => a.daysLeft - b.daysLeft);
  const labels = cases.map(c => c.label);
  const dataVals = cases.map(c => c.daysLeft);

  // Bar color: overdue = red, on-track = green
  const barColors = cases.map(c => {
    if (c.daysLeft < 0) return "#FF4C4C";        // Red - Overdue
    if (c.daysLeft < 10) return "#FFD700";        // Yellow - Very close to deadline
    if (c.daysLeft < 15) return "#FFA500";       // Orange - Medium
    return "#8DC63F";                            // Green - Plenty of time
  });


  // Chart rendering
  window.reportsCasesDeadlineChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "Days Until Deadline",
        data: dataVals,
        backgroundColor: barColors,
        borderRadius: 10,
        borderSkipped: false,
        borderWidth: 2,
        borderColor: "#fff"
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "#003366",
          titleColor: "#FFD700",
          bodyColor: "#fff",
          borderColor: "#FFD700",
          borderWidth: 2,
          callbacks: {
            label: function (context) {
              const days = context.parsed.y;
              return `${days} day${Math.abs(days) !== 1 ? 's' : ''} ${days < 0 ? 'overdue' : 'left'}`;
            }
          }
        },
      },
      scales: {
        x: {
          ticks: {
            color: "#003366",
            font: { weight: "bold" }
          }
        },
        y: {
          beginAtZero: true,
          ticks: {
            color: "#8DC63F",
            font: { weight: "bold" }
          }
        }
      }
    }
  });
}

// Case card click to open assign-cases form
document.getElementById("cases-container").addEventListener("click", (e) => {
  const card = e.target.closest("[data-case-card]");
  if (card) {
    const caseId = card.getAttribute("data-id");
    // Load the assign form here
    showSection("assign-cases");
  }
});

// Navigation item click handler
document.querySelector("nav ul").addEventListener("click", (e) => {
  if (e.target.tagName === "LI") {
    const text = e.target.textContent.trim();

    switch (text) {
      case "General Data":
        showSection("dashboard");
        break;
      case "Generate Reports":
        showSection("generate-reports");
        loadCasesDeadlineChart();
        break;
      case "Manage Users":
        showSection("manage-users");
        break;
      case "Assign Cases":
        showSection("active-cases");
        loadActiveCases();
        break;
      case "Add Currency":
        showSection("add-currency");
        break;
      case "Add Users":
        showSection("add-user");
        break;
      case "Add Region/State":
        showSection("add-region");
        break;
      case "Generate Reports":
        showSection("generate-reports");
        break;
      case "Add Group Oversight":
        showSection("add-group");
        break;
      case "Add Investigating Officer":
        loadGroupOversights();
        showSection("add-officer");
        break;
      case "Add Subsidiary":
        showSection("add-subsidiary");
        break;
      case "Add Branch":
        loadCountries();
        showSection("add-branch");
        break;
      case "Reassign Cases":
        showSection("reassign-cases");
        loadReassignableCases();
        break;
        case"First Review Cases":
        loadFirstReviewCases();
        showSection("review-first-cases");
        break;
      case "Add Fraud Type":
        showSection("add-fraud-type");
        break;
      default:
        break;
    }
  }
});

// ---- Form Submission Handlers ----
// --- Reassign Cases Feature ---
async function loadReassignableCases() {
  const container = document.getElementById("reassign-cases-container");
  if (!container) return;
  container.innerHTML = '<p>Loading assigned cases...</p>';

  try {
    // Fetch cases with status 'assigned'
    const q = query(collection(db, "fraudCases"), where("status", "==", "assigned"));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      container.innerHTML = '<p>No assigned cases found.</p>';
      return;
    }

    container.innerHTML = "";
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const card = document.createElement("div");
      card.className = "card reassign-case-card";
      card.setAttribute("data-case-id", docSnap.id);
      card.innerHTML = `
        <h4>${data.forNumber || 'Unnumbered Case'}</h4>
        <p><strong>Date Reported:</strong> ${data.dateReported || 'N/A'}</p>
        <p><strong>Case Type:</strong> ${data.caseType || 'N/A'}</p>
        <p><strong>Amount Involved:</strong> ${data.amountInvolved ? `${data.amountInvolved.toLocaleString()}` : 'N/A'}</p>
        <button class="view-reassign-btn">Reassign</button>
      `;
      card.querySelector(".view-reassign-btn").addEventListener("click", () => {
        showReassignModal(docSnap.id, data);
      });
      container.appendChild(card);
    });
  } catch (error) {
    console.error("Error loading reassignable cases:", error);
    container.innerHTML = '<p>Error loading cases.</p>';
  }
}

async function showReassignModal(caseId, caseData) {
  // Create or select modal
  let modal = document.getElementById("reassign-modal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "reassign-modal";
    modal.className = "modal";
    document.body.appendChild(modal);
  }

  modal.innerHTML = `<div class="modal-content">
    <span class="close-modal" style="float:right;cursor:pointer;font-size:1.5em">&times;</span>
    <h3>Reassign Case: ${caseData.forNumber || caseId}</h3>
    <p><strong>Current Investigators:</strong> <span id="current-investigators"></span></p>
    <p><strong>Available Investigators:</strong><br>
      <select id="new-investigators" multiple style="width:100%;margin-top:5px;"></select>
    </p>
    <button id="reassign-btn" style="margin-top:10px;">Reassign</button>
  </div>`;

  // Show modal
  modal.style.display = "block";
  modal.querySelector(".close-modal").onclick = () => { modal.style.display = "none"; };

  // Show current investigators
  const current = Array.isArray(caseData.investigators) ? caseData.investigators : [caseData.investigator || "None"];
  modal.querySelector("#current-investigators").textContent = current.join(", ");

  // Load available investigators
  const select = modal.querySelector("#new-investigators");
  select.innerHTML = "<option>Loading...</option>";
  try {
    const usersSnap = await getDocs(query(collection(db, "users"), where("role", "==", "investigator")));
    select.innerHTML = "";
    usersSnap.forEach(userDoc => {
      const data = userDoc.data();
      const option = document.createElement("option");
      option.value = userDoc.id;
      option.textContent = data.fullName || data.name || userDoc.id;
      // Exclude current investigators
      if (!current.includes(option.textContent)) {
        select.appendChild(option);
      }
    });
  } catch (err) {
    select.innerHTML = "<option>Error loading investigators</option>";
  }

  // Reassign button handler
  modal.querySelector("#reassign-btn").onclick = async () => {
    const selectedIds = Array.from(select.selectedOptions).map(opt => opt.value);
    const selectedNames = Array.from(select.selectedOptions).map(opt => opt.textContent);
    if (!selectedIds.length) {
      showCustomAlert("Please select at least one investigator to reassign.");
      return;
    }
    try {
      await updateDoc(doc(db, "fraudCases", caseId), {
        investigators: selectedNames,
        investigator: selectedNames[0],
        status: "assigned",
        dateAssigned: new Date().toISOString()
      });
      showCustomAlert(`✅ Case reassigned to: ${selectedNames.join(", ")}`);
      modal.style.display = "none";
      loadReassignableCases(); // Refresh list
    } catch (err) {
      console.error("Error reassigning case:", err);
      showCustomAlert("❌ Failed to reassign case.");
    }
  };
}

// Add Group Oversight form
const addGroupForm = document.querySelector("#add-group form");
addGroupForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const groupName = addGroupForm.querySelector("input[type='text']").value.trim();
  const description = addGroupForm.querySelector("textarea").value.trim();

  if (!groupName) {
    alert("Group Name is required");
    return;
  }

  try {
    await addDoc(collection(db, "groupOversights"), {
      name: groupName,
      description,
      createdAt: new Date()
    });
    alert("Group Oversight added successfully!");
    addGroupForm.reset();
  } catch (error) {
    console.error("Error adding group oversight:", error);
    alert("Failed to add group oversight.");
  }
});

// Add Investigating Officer form
const addOfficerForm = document.querySelector("#add-officer form");
addOfficerForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const officerName = addOfficerForm.querySelector("input[type='text']").value.trim();
  const reportsToSelect = document.getElementById("officer-reports-to");
  const reportsTo = reportsToSelect.value; // This is the group oversight document ID
  const reportsToName = reportsToSelect.options[reportsToSelect.selectedIndex].text;

  if (!officerName) {
    alert("Officer Name is required");
    return;
  }

  if (!reportsTo) {
    alert("Please select a Group Oversight to report to.");
    return;
  }

  try {
    await addDoc(collection(db, "investigatingOfficers"), {
      name: officerName,
      reportsToId: reportsTo,
      reportsToName: reportsToName,
      createdAt: new Date()
    });
    alert("Investigating Officer added successfully!");
    addOfficerForm.reset();
  } catch (error) {
    console.error("Error adding investigating officer:", error);
    alert("Failed to add investigating officer.");
  }
});

// Add Currency form
const addCurrencyForm = document.querySelector("#add-currency form");
addCurrencyForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const currencyName = document.getElementById("currencyName").value.trim();
  const currencyCode = document.getElementById("currencyCode").value.trim();


  if (!currencyName || !currencyCode) {
    alert("Both Currency Name and Code are required");
    return;
  }

  try {
    await addDoc(collection(db, "currencies"), {
      name: currencyName,
      code: currencyCode,
      createdAt: new Date()
    });
    alert("Currency added successfully!");
    addCurrencyForm.reset();
  } catch (error) {
    console.error("Error adding currency:", error);
    alert("Failed to add currency.");
  }
});

// Add Subsidiary form
const addSubsidiaryForm = document.querySelector("#add-subsidiary form");
addSubsidiaryForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const inputs = addSubsidiaryForm.querySelectorAll("input[type='text']");
  const countryName = inputs[0].value.trim();

  if (!countryName) {
    alert("Country Name is required");
    return;
  }

  const countryId = countryName.toLowerCase().replace(/\s+/g, ""); // e.g., "Uganda" -> "uganda"

  try {
    await setDoc(doc(db, "subsidiaries", countryId), {
      country: countryName,
      createdAt: new Date()
    });

    alert("✅ Subsidiary added successfully!");
    addSubsidiaryForm.reset();
  } catch (error) {
    console.error("❌ Error adding subsidiary:", error);
    alert("❌ Failed to add subsidiary.");
  }
});


document.addEventListener("DOMContentLoaded", () => {
  const fraudTypeForm = document.getElementById("fraudTypeForm");
  const fraudTypeSelect = document.getElementById("fraudTypeSelect");
  const fraudTypeInput = document.getElementById("fraudTypeInput");
  const fraudTypeDesc = document.getElementById("fraudTypeDesc");

  if (!fraudTypeForm || !fraudTypeSelect || !fraudTypeInput || !fraudTypeDesc) {
    console.error("Fraud Type form elements not found in the DOM");
    return;
  }

  // Populate dropdown with existing fraud types
  async function populateFraudTypeDropdown() {
    fraudTypeSelect.innerHTML = '<option value="">-- Add New Fraud Type --</option>';
    try {
      const snapshot = await getDocs(collection(db, "fraudTypes"));
      snapshot.forEach(doc => {
        const data = doc.data();
        const option = document.createElement("option");
        option.value = doc.id;
        option.textContent = data.type || data.type || doc.id;
        option.dataset.desc = data.description || "";
        fraudTypeSelect.appendChild(option);
      });
    } catch (err) {
      console.error("Error loading fraud types:", err);
    }
  }

  // Prefill fields when selecting an existing fraud type
  fraudTypeSelect.addEventListener("change", async (e) => {
    const selectedId = fraudTypeSelect.value;
    if (!selectedId) {
      fraudTypeInput.value = "";
      fraudTypeDesc.value = "";
      fraudTypeInput.disabled = false;
      return;
    }
    try {
      const docRef = doc(db, "fraudTypes", selectedId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        fraudTypeInput.value = data.type || "";
        fraudTypeDesc.value = data.description || "";
        fraudTypeInput.disabled = false;
      }
    } catch (err) {
      console.error("Error fetching fraud type:", err);
    }
  });

  // Handle add/update submit
  fraudTypeForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const selectedId = fraudTypeSelect.value;
    const typeVal = fraudTypeInput.value.trim();
    const descVal = fraudTypeDesc.value.trim();

    if (!typeVal) {
      showCustomAlert("Fraud Type is required");
      return;
    }

    try {
      if (!selectedId) {
        // Add new fraud type
        await addDoc(collection(db, "fraudTypes"), {
          type: typeVal,
          description: descVal,
          createdAt: new Date()
        });
        showCustomAlert("Fraud Type added successfully!");
      } else {
        // Update existing fraud type
        await updateDoc(doc(db, "fraudTypes", selectedId), {
          type: typeVal,
          description: descVal,
          updatedAt: new Date()
        });
        showCustomAlert("Fraud Type updated successfully!");
      }
      fraudTypeForm.reset();
      await populateFraudTypeDropdown();
    } catch (error) {
      console.error("Error saving fraud type:", error);
      showCustomAlert("Failed to save fraud type.");
    }
  });

  // Initial dropdown population
  populateFraudTypeDropdown();
});

// Add Branch form
const addBranchForm = document.querySelector("#add-branch form");

addBranchForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const countrySelect = document.getElementById("branch-country");
  const regionSelect = document.getElementById("branch-region");
  const branchNameInput = document.getElementById("branch-name");

  const countryId = countrySelect.value; // This should be the doc.id of the subsidiary
  const regionId = regionSelect.value;   // This should be the doc.id of the region
  const branchName = branchNameInput.value.trim();

  if (!countryId) {
    showCustomAlert("Please select a country");
    return;
  }

  if (!regionId) {
    showCustomAlert("Please select a region/state");
    return;
  }

  if (!branchName) {
    showCustomAlert("Please enter the branch name");
    return;
  }

  try {
    // Reference to Firestore path: branches/{countryId}/regions/{regionId}/branchList/
    const branchListRef = collection(db, "branches", countryId, "regions", regionId, "branchList");

    await addDoc(branchListRef, {
      branchName,
      createdAt: new Date()
    });

    showCustomAlert(`✅ Branch '${branchName}' added under '${countryId}'`);
    addBranchForm.reset();
  } catch (error) {
    console.error("❌ Error adding branch:", error);
    showCustomAlert("❌ Failed to add branch.");
  }
});

document.getElementById("branch-country").addEventListener("change", async (e) => {
  const selectedCountryId = e.target.value.toLowerCase(); // force lowercase
  const regionSelect = document.getElementById("branch-region");

  console.log(`🌍 Country changed to: ${selectedCountryId}`);

  // Clear current region options
  regionSelect.innerHTML = '<option value="">Select Region/State</option>';
  console.log("🧹 Cleared previous region options.");

  if (!selectedCountryId) {
    console.warn("⚠️ No country selected. Exiting...");
    return;
  }

  try {
    console.log(`🔍 Fetching regions for country ID: ${selectedCountryId}`);

    const regionsRef = collection(db, "subsidiaries", selectedCountryId, "regions");
    const snapshot = await getDocs(regionsRef);

    if (snapshot.empty) {
      console.warn(`⚠️ No regions found under country ID: ${selectedCountryId}`);
      showCustomAlert("⚠️ No regions found for the selected country.");
      return;
    }

    console.log(`📦 Retrieved ${snapshot.size} region(s). Populating dropdown...`);

    snapshot.forEach((doc) => {
      const regionData = doc.data();
      const option = document.createElement("option");
      option.value = doc.id;
      option.textContent = regionData.name || doc.id;
      regionSelect.appendChild(option);

      console.log(`➡️ Added region: ${regionData.name || doc.id} (ID: ${doc.id})`);
    });

    console.log(`✅ Loaded ${snapshot.size} regions for ${selectedCountryId}`);
  } catch (error) {
    console.error("❌ Error fetching regions:", error);
    showCustomAlert("Failed to load regions.");
  }
});

// Load and display user cards
async function loadUserCards() {
  const container = document.getElementById("user-cards-container");
  container.innerHTML = ""; // Clear previous cards

  try {
    const snapshot = await getDocs(collection(db, "users"));
    snapshot.forEach(userDoc => {
      const data = userDoc.data();
      const card = document.createElement("div");
      card.textContent = data.name || "Unnamed";
      card.style.cssText = `
        display: inline-block;
        padding: 10px 20px;
        background-color: #f2f2f2;
        border-radius: 10px;
        cursor: pointer;
        white-space: nowrap;
      `;
      card.addEventListener("click", () => populateUserForm(userDoc.id, data));
      container.appendChild(card);
    });
  } catch (error) {
    console.error("Error loading users:", error);
  }
}

// Populate form with user data
let selectedUserId = null;

function populateUserForm(uid, data) {
  selectedUserId = uid;
  document.getElementById("userName").value = data.name || "";
  document.getElementById("userEmail").value = data.email || "";
  document.getElementById("userRole").value = data.role || "";
}

// Update and delete handlers
const manageUserForm = document.querySelector("#manage-users form");

manageUserForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!selectedUserId) {
    showCustomAlert("Please select a user first.");
    return;
  }

  const name = document.getElementById("userName").value.trim();
  const email = document.getElementById("userEmail").value.trim();
  const role = document.getElementById("userRole").value;

  try {
    await updateDoc(doc(db, "users", selectedUserId), {
      name,
      email,
      role
    });
    showCustomAlert("✅ User updated successfully!");
    await loadUserCards(); // Refresh names
  } catch (error) {
    console.error("Update error:", error);
    showCustomAlert("❌ Failed to update user.");
  }
});

//Add region to a related subsidiary
document.addEventListener("DOMContentLoaded", async () => {
  const regionForm = document.getElementById("add-region-form");
  const subsidiarySelect = document.getElementById("subsidiary-select");

  async function loadSubsidiaries() {
    try {
      const snapshot = await getDocs(collection(db, "subsidiaries"));
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        const option = document.createElement("option");
        option.value = docSnap.id;
        option.textContent = data.country || data.name || docSnap.id;
        subsidiarySelect.appendChild(option);
      });
    } catch (err) {
      console.error("❌ Error loading subsidiaries:", err);
    }
  }

  await loadSubsidiaries();

  // 🟢 Handle form submission
  regionForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const subsidiaryId = subsidiarySelect.value;
    const regionName = document.getElementById("region-name").value.trim();

    if (!subsidiaryId || !regionName) {
      alert("Please select a subsidiary and enter a region name.");
      return;
    }

    try {
      const regionRef = doc(collection(db, "subsidiaries", subsidiaryId, "regions"));
      await setDoc(regionRef, {
        name: regionName,
        createdAt: new Date()
      });

      alert("✅ Region added successfully!");
      regionForm.reset();
    } catch (error) {
      console.error("❌ Error adding region:", error);
      alert("Failed to add region.");
    }
  });
});

manageUserForm.querySelector("button[type='button']").addEventListener("click", async () => {
  if (!selectedUserId) {
    showCustomAlert("Please select a user to delete.");
    return;
  }

  const confirmed = confirm("Are you sure you want to delete this user?");
  if (!confirmed) return;

  try {
    await deleteDoc(doc(db, "users", selectedUserId));
    showCustomAlert("🗑️ User deleted.");
    manageUserForm.reset();
    selectedUserId = null;
    await loadUserCards();
  } catch (error) {
    console.error("Delete error:", error);
    showCustomAlert("❌ Failed to delete user.");
  }
});

// Load users when "Manage Users" is shown
function observeManageUserSection() {
  const nav = document.querySelector("nav ul");
  nav.addEventListener("click", (e) => {
    if (e.target.tagName === "LI" && e.target.textContent.trim() === "Manage Users") {
      loadUserCards();
    }
  });
}
observeManageUserSection();

// Sign up User
signupForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const fullName = document.getElementById('fullName').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirmPassword').value;

  if (!fullName) {
    showCustomAlert("❌ Full Name is required.");
    return;
  }

  if (password !== confirmPassword) {
    showCustomAlert("❌ Passwords do not match. Please try again.");
    return;
  }

  try {
    // Create user in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Set display name
    await updateProfile(user, {
      displayName: fullName
    });

    // Store user info in Firestore under "users" collection
    await setDoc(doc(db, "users", user.uid), {
      name: fullName,
      email: email,
      role: "investigator",
      createdAt: new Date().toISOString()
    });

    showCustomAlert(`✅ Signup successful! Welcome, ${fullName}`);

    signupForm.reset();
    // window.location.href = 'dashboard.html'; // Optional redirect
  } catch (error) {
    const errorCode = error.code;
    const errorMessage = error.message;

    console.error("Signup error:", errorCode, errorMessage);

    switch (errorCode) {
      case 'auth/email-already-in-use':
        showCustomAlert("❌ This email is already in use.");
        break;
      case 'auth/invalid-email':
        showCustomAlert("❌ The email address is not valid.");
        break;
      case 'auth/weak-password':
        showCustomAlert("❌ The password is too weak. Use at least 6 characters.");
        break;
      default:
        showCustomAlert(`❌ Error: ${errorMessage}`);
    }
  }
});

