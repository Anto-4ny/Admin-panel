    import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
    import { getFirestore, doc, getDoc, collection, getDocs, onSnapshot, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
    import { getAuth, signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
    import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-analytics.js";

    // Firebase config
    const firebaseConfig = {
        apiKey: "AIzaSyB7t1wWHhPYBitqKC4SJ8lqP1WMLDefCxo",
        authDomain: "antocap-referrals.firebaseapp.com",
        projectId: "antocap-referrals",
        storageBucket: "antocap-referrals.appspot.com",
        messagingSenderId: "1071760453747",
        appId: "1:1071760453747:web:fafa7ac624ba7452e6fa06",
        measurementId: "G-EPLJB8MTRH"
    };

    // Initialize Firebase services
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    const auth = getAuth(app);
    const analytics = getAnalytics(app);

    // Login function
    async function login() {
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const errorMessage = document.getElementById('error-message');

        try {
            console.log("Attempting login with email:", email);
            await signInWithEmailAndPassword(auth, email, password);
            const user = auth.currentUser;

            if (user) {
                console.log("User signed in:", user.uid);
                const adminDoc = await getDoc(doc(db, 'admins', user.uid));

                if (adminDoc.exists()) {
                    // Hide login and show admin panel
                    document.getElementById('login-container').classList.add('hide');
                    document.getElementById('admin-content').classList.remove('hide');
                    loadUserData(); // Load user data after admin login
                    fetchPendingPayments(); // Fetch pending payments after admin login
                } else {
                    errorMessage.textContent = 'You are not authorized as an admin.';
                }
            }
        } catch (error) {
            console.error('Login error:', error);
            errorMessage.textContent = error.message;
        }
    }

    // Load user data for the admin panel
    async function loadUserData() {
        try {
            const usersCollection = collection(db, 'users');
            const querySnapshot = await getDocs(usersCollection);
            let totalUsers = 0;
            let totalPaidUsers = 0;
            let totalAmount = 0;

            querySnapshot.forEach((doc) => {
                totalUsers++;
                const data = doc.data();
                const paid = data.paymentConfirmation === 'true';

                if (paid) {
                    totalPaidUsers++;
                    totalAmount += 200; // Registration fee
                }

                // Insert user data into table
                const row = document.createElement('tr');
                row.innerHTML = `<td>${data.name}</td><td>${data.email}</td><td>${paid ? 'Paid' : 'Not Paid'}</td>`;
                document.querySelector('tbody').appendChild(row);
            });

            document.getElementById('total-users').textContent = totalUsers;
            document.getElementById('total-paid-users').textContent = totalPaidUsers;
            document.getElementById('total-amount').textContent = `${totalAmount} Ksh`;
        } catch (error) {
            console.error('Error fetching user data:', error);
        }
    }

    // Fetch pending payments
    function fetchPendingPayments() {
        const paymentsTableBody = document.getElementById('pending-payments-body');

        onSnapshot(collection(db, 'payments').where('status', '==', 'Pending'), (querySnapshot) => {
            paymentsTableBody.innerHTML = ''; // Clear the table before adding new rows

            querySnapshot.forEach((doc) => {
                const paymentData = doc.data();
                const paymentRow = `
                    <tr>
                        <td>${paymentData.phoneNumber}</td>
                        <td>${paymentData.amount}</td>
                        <td>${paymentData.mpesaCode}</td>
                        <td>${paymentData.userId}</td>
                        <td>
                            <button onclick="confirmPayment('${doc.id}')">Confirm</button>
                            <button onclick="rejectPayment('${doc.id}')">Reject</button>
                        </td>
                    </tr>
                `;
                paymentsTableBody.innerHTML += paymentRow;
            });
        });
    }

    // Confirm payment
    async function confirmPayment(paymentId) {
        try {
            await updateDoc(doc(db, 'payments', paymentId), {
                status: "Confirmed",
                adminAction: "Confirmed",
                confirmationTimestamp: serverTimestamp()
            });
            alert('Payment confirmed successfully.');
        } catch (error) {
            console.error('Error confirming payment:', error);
        }
    }

    // Reject payment
    async function rejectPayment(paymentId) {
        try {
            await updateDoc(doc(db, 'payments', paymentId), {
                status: "Rejected",
                adminAction: "Rejected",
                confirmationTimestamp: serverTimestamp()
            });
            alert('Payment rejected.');
        } catch (error) {
            console.error('Error rejecting payment:', error);
        }
    }

    // Monitor user authentication state and handle admin authorization
    onAuthStateChanged(auth, (user) => {
        if (user) {
            getDoc(doc(db, 'users', user.uid)).then((doc) => {
                if (doc.exists() && doc.data().role === 'admin') {
                    document.getElementById('admin-panel').style.display = 'block';
                } else {
                    alert('You are not authorized to view this page.');
                    window.location.href = '/';
                }
            });
        } else {
            window.location.href = '/login'; // Redirect to login if not authenticated
        }
    });

