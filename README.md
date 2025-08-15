# Firebase Studio

This is a NextJS starter in Firebase Studio.

To get started, take a look at src/app/page.tsx.

## Firestore Security Rules

To allow your app to read and write to Firestore, you need to update your security rules in the Firebase console.

1.  Open your Firebase project.
2.  Navigate to **Firestore Database** in the **Build** section.
3.  Click on the **Rules** tab.
4.  Copy the content from the `firestore.rules` file in this project.
5.  Paste it into the editor in the Firebase console, replacing the existing rules.
6.  Click **Publish**.

**Note:** The provided rules are for development and allow open access to your database. Make sure to secure your rules before deploying to production.
