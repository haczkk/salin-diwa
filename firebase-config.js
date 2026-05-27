// Firebase configuration – replace the placeholder values with your actual project config.
const firebaseConfig = {
  apiKey: "AIzaSyDAVO4waJIFTB9Lj89EBYWsJAz-kPIjjnM",
  authDomain: "salindiwa-a9ba8.firebaseapp.com",
  projectId: "salindiwa-a9ba8",
  storageBucket: "salindiwa-a9ba8.firebasestorage.app",
  messagingSenderId: "949386419611",
  appId: "1:949386419611:web:5cdc8cdcd101a08cd7953e"
};

// Initialize Firebase app (if not already initialized elsewhere)
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
