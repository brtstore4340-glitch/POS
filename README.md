# Deployment Guide for POS System

## Prerequisites
- Node.js installed.
- A Firebase Project created at [console.firebase.google.com](https://console.firebase.google.com).

## 1. Configure Firebase in Code
1. Open this folder in VS Code.
2. Open `app.js`.
3. Locate the `firebaseConfig` object at the top.
4. Replace the placeholder strings with your actual Firebase Web App configuration from the Firebase Console (Project settings > General > Your apps).

## 2. Install Firebase CLI
Open a terminal in this directory and run:
```bash
npm install -g firebase-tools
```

## 3. Login and Init
```bash
firebase login
firebase init hosting
```
- Select your project.
- Public directory: `.` (Current directory) or create a `public` folder and move html/js there (but `.` is fine for simple setup).
- Configure as single-page app? **No** (It's simple HTML).
- Set up automatic builds and deploys with GitHub? **No** (unless you want to).
- **IMPORTANT**: If it asks to overwrite `index.html`, say **NO**.

## 4. Deploy
```bash
firebase deploy --only hosting
```
The terminal will output a Hosting URL. Open it to use the POS.

## 5. Security Rules
Copy the content below into your Firestore Rules in the Firebase Console (Firestore Database > Rules):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Runs (Bills): Allow read/write if authenticated (Anonymous is fine)
    match /runs/{runId} {
      allow read, write: if request.auth != null;
      
      // Items subcollection
      match /items/{itemId} {
        allow read, write: if request.auth != null;
      }
    }

    // Products & Barcodes: Read-only for everyone (or auth users), Write restricted (Admin only or disabled)
    match /products/{productCode} {
      allow read: if true;
      allow write: if false; 
    }
    
    match /barcodes/{barcode} {
      allow read: if true;
      allow write: if false;
    }
    
    // Counters (if used)
    match /counters/{name} {
      allow read, write: if request.auth != null;
    }
  }
}
```
