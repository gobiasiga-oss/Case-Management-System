// Import Firebase SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-app.js";
import { getFirestore, collection, doc, setDoc, query, orderBy, limit, getDocs } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyC7LE6gdqgwfc14OMN_hmLyfT8qZRpybK0",
    authDomain: "fraud-data-explorer.firebaseapp.com",
    projectId: "fraud-data-explorer",
    storageBucket: "fraud-data-explorer.appspot.com",
    messagingSenderId: "1056225546907",
    appId: "1:1056225546907:web:951a7314a422f1c8d6ac3e",
    measurementId: "G-WBSXDZ8RX6"
};

// Initialize Firebase
console.log("🚀 Initializing Firebase...");
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
console.log("✅ Firebase initialized.");

/// Load Fraud Case Types from Firestore
async function loadCaseTypes() {
    const caseTypeSelect = document.getElementById('caseType');
    caseTypeSelect.innerHTML = '<option value="">Select Case Type</option>';

    try {
        const snapshot = await getDocs(collection(db, "fraudTypes"));

        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const option = document.createElement("option");

            option.value = data.description || docSnap.id;
            option.textContent = data.description || docSnap.id;

            // 🟡 Add description as tooltip
            if (data.type) {
                option.title = data.type;
            }

            caseTypeSelect.appendChild(option);
        });

        console.log("✅ Case types loaded.");
    } catch (error) {
        console.error("❌ Error loading case types:", error);
    }
}

async function loadCurrencies() {
    const currencySelect = document.getElementById('currency');
    currencySelect.innerHTML = '<option value="">Select Currency</option>';

    try {
        const snapshot = await getDocs(collection(db, "currencies"));

        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const option = document.createElement("option");
            option.value = data.code || docSnap.id;
            option.textContent = data.name || docSnap.id;
            currencySelect.appendChild(option);
        });
        console.log("✅ Currencies loaded.");
    } catch (error) {
        console.error("❌ Error loading currencies:", error);
    }
}


/// Load Subsidiaries from Firestore
async function loadSubsidiaries() {
    const subsidiarySelect = document.getElementById('subsidiary');
    subsidiarySelect.innerHTML = '<option value="">Select Subsidiary</option>';

    try {
        const snapshot = await getDocs(collection(db, "subsidiaries"));

        snapshot.forEach(docSnap => {
            const id = docSnap.id;
            const data = docSnap.data();
            const option = document.createElement("option");
            option.value = id;
            option.textContent = data.name || id;
            subsidiarySelect.appendChild(option);
        });

        console.log("✅ Subsidiaries loaded.");
    } catch (error) {
        console.error("❌ Error loading subsidiaries:", error);
    }
}

// Load Regions based on selected Subsidiary
window.regionIdMap = {};  // name => id
window.regionNameMap = {}; // id => name

async function updateRegions() {
    const subsidiaryId = document.getElementById('subsidiary').value;
    const regionSelect = document.getElementById('region');
    const branchSelect = document.getElementById('branch');

    regionSelect.innerHTML = '<option value="">Select Region</option>';
    branchSelect.innerHTML = '<option value="">Select Branch</option>';

    if (!subsidiaryId) return;

    try {
        const snapshot = await getDocs(collection(db, `subsidiaries/${subsidiaryId}/regions`));
        window.regionIdMap = {};
        window.regionNameMap = {};

        snapshot.forEach(regionDoc => {
            const regionId = regionDoc.id;
            const regionName = regionDoc.data().name;

            // Map name to ID and ID to name
            window.regionIdMap[regionName] = regionId;
            window.regionNameMap[regionId] = regionName;

            const option = document.createElement("option");
            option.value = regionName;
            option.textContent = regionName;
            regionSelect.appendChild(option);
        });

        console.log("📍 Regions loaded and mapped.");
    } catch (err) {
        console.error("❌ Failed to load regions", err);
    }
}


// Load Branches based on selected Region
async function loadBranches(country, region) {
    const branchSelect = document.getElementById("branch");
    branchSelect.innerHTML = '<option value="">Select Branch</option>';

    if (!country || !region) {
        console.warn("⛔ Country or region not selected.");
        return;
    }

    console.log(`🔍 Loading branches for path: branches/${country}/regions/${region}/branchList`);

    try {
        const branchListRef = collection(db, "branches", country, "regions", region, "branchList");
        const snapshot = await getDocs(branchListRef);

        console.log(`📦 Branch documents found: ${snapshot.size}`);

        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            console.log("📄 Branch doc:", docSnap.id, data);

            const option = document.createElement("option");
            option.value = data.branchName || docSnap.id;
            option.textContent = data.branchName || docSnap.id;
            branchSelect.appendChild(option);
        });

        console.log(`✅ Branches loaded for ${country} > ${region}`);
    } catch (err) {
        console.error("❌ Error loading branches:", err);
    }
}



// Wait for the DOM to load
document.addEventListener("DOMContentLoaded", function () {
    console.log("📄 DOM fully loaded.");

    // Initialize date pickers
    $("#dateReported, #dateCompleted, #dateOfIncidentStart, #dateOfIncidentEnd").datepicker({
        dateFormat: 'yy-mm-dd',
        changeMonth: true,
        changeYear: true
    });
    console.log("📅 Date pickers initialized.");

    // Attach change listener to subsidiary dropdown
    loadSubsidiaries(); // Load from Firestore
    loadCaseTypes(); // Load case types from Firestore
    loadCurrencies(); // Load currencies from Firestore

    document.getElementById("subsidiary").addEventListener("change", async (e) => {
        const subsidiaryId = e.target.value;
        await updateRegions(subsidiaryId);

        // Reset branch dropdown
        document.getElementById("branch").innerHTML = '<option value="">Select Branch</option>';
    });

    document.getElementById("region").addEventListener("change", async (e) => {
        const country = document.getElementById("subsidiary").value;
        const fixedCountry = country.charAt(0).toUpperCase() + country.slice(1); // Capitalize first letter

        const regionName = e.target.value;
        const regionId = window.regionIdMap[regionName];

        if (!regionId) {
            console.warn("⛔ No regionId found for", regionName);
            return;
        }

        await loadBranches(fixedCountry, regionId); // 👈 Use fixedCountry here
    });


    // Handle form submission
    document.getElementById('fraudForm').addEventListener('submit', async function (e) {
        e.preventDefault();
        console.log("📤 Submitting form...");

        try {
            const currentYear = new Date().getFullYear();
            const fraudCasesRef = collection(db, "fraudCases");
            const q = query(fraudCasesRef, orderBy("timestamp", "desc"), limit(1));
            const querySnapshot = await getDocs(q);

            let nextNumber = 1;

            if (!querySnapshot.empty) {
                const lastCase = querySnapshot.docs[0].data();
                console.log("📝 Last case data:", lastCase);

                const regex = /FORENSIC (\d{3})\/\d{4}/;
                const match = lastCase.forNumber.match(regex);

                if (match && match[1]) {
                    const lastNumber = parseInt(match[1], 10);
                    nextNumber = lastNumber + 1;
                    console.log(`🔢 Last case number: ${lastNumber}, Next: ${nextNumber}`);
                }
            } else {
                console.log("📭 No previous cases found. Starting from 001.");
            }

            const nextNumberStr = nextNumber.toString().padStart(3, '0');
            const newForNumber = `FORENSIC ${nextNumberStr}/${currentYear}`;
            const safeForNumber = newForNumber.replace("/", "_"); // Use underscore for Firestore doc ID

            // Set the forNumber field in the UI
            document.getElementById('forNumber').value = newForNumber;

            // Prepare form data
            const formData = {
                forNumber: newForNumber,
                dateReported: document.getElementById('dateReported').value,
                incidentStartDate: document.getElementById('dateOfIncidentStart').value,
                incidentEndDate: document.getElementById('dateOfIncidentEnd').value,
                region: document.getElementById('region').value,
                caseType: document.getElementById('caseType').value,
                subsidiary: document.getElementById('subsidiary').value,
                branch: document.getElementById('branch').value,
                currency: document.getElementById('currency').value,
                briefDetails: document.getElementById('briefDetails').value,
                amountInvolved: parseFloat(document.getElementById('amountInvolved').value) || 0,
                status: document.getElementById('status').value,
                successfulFraud: document.querySelector('input[name="successfulFraud"]:checked')?.value || null,
                timestamp: new Date().toISOString()
            };


            console.log("📦 Data ready to be sent to Firestore:", formData);

            await setDoc(doc(db, "fraudCases", safeForNumber), formData);

            alert(`✅ Fraud case submitted successfully! Case Number: ${newForNumber}`);
            console.log(`✅ Submission complete. Case Number: ${newForNumber}`);

            document.getElementById("fraudForm").reset();
            document.getElementById("region").innerHTML = '<option value="">Select Region</option>';
            document.getElementById("branch").innerHTML = '<option value="">Select Branch</option>';

        } catch (error) {
            console.error("❌ Error saving to Firestore:", error);
            alert("❌ Error submitting data: " + error.message);
        }
    });
});
