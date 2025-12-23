// signup.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, updateProfile } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js";
import { getFirestore, doc, setDoc } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC7LE6gdqgwfc14OMN_hmLyvT8qZRpybK0",
  authDomain: "fraud-data-explorer.firebaseapp.com",
  projectId: "fraud-data-explorer",
  storageBucket: "fraud-data-explorer.firebasestorage.app",
  messagingSenderId: "1056225546907",
  appId: "1:1056225546907:web:951a7314a422f1c8d6ac3e",
  measurementId: "G-WBSXDZ8RX6"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Signup form handler
const signupForm = document.getElementById('signupForm');

signupForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const fullName = document.getElementById('fullName').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirmPassword').value;

  if (!fullName) {
    alert("❌ Full Name is required.");
    return;
  }

  if (password !== confirmPassword) {
    alert("❌ Passwords do not match. Please try again.");
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

    alert(`✅ Signup successful! Welcome, ${fullName}`);

    signupForm.reset();
    // window.location.href = 'dashboard.html'; // Optional redirect
  } catch (error) {
    const errorCode = error.code;
    const errorMessage = error.message;

    console.error("Signup error:", errorCode, errorMessage);

    switch (errorCode) {
      case 'auth/email-already-in-use':
        alert("❌ This email is already in use.");
        break;
      case 'auth/invalid-email':
        alert("❌ The email address is not valid.");
        break;
      case 'auth/weak-password':
        alert("❌ The password is too weak. Use at least 6 characters.");
        break;
      default:
        alert(`❌ Error: ${errorMessage}`);
    }
  }
});
