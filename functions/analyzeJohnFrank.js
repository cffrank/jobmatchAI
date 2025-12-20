/**
 * Temporary Cloud Function to analyze John Frank's applications
 * Can be called from the frontend or via Firebase CLI
 */

const functions = require('firebase-functions/v2');
const admin = require('firebase-admin');

// John Frank's UID
const JOHN_FRANK_UID = 'B7JWGPNQCYVlTWxvNZOTvgpujbr2';

exports.analyzeJohnFrankApplications = functions.https.onCall(async (request) => {
  const db = admin.firestore();

  try {
    // Fetch all applications
    const applicationsRef = db.collection('users').doc(JOHN_FRANK_UID).collection('applications');
    const querySnapshot = await applicationsRef.orderBy('createdAt', 'desc').get();

    const applications = [];
    querySnapshot.forEach((doc) => {
      applications.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    return {
      success: true,
      count: applications.length,
      applications,
    };
  } catch (error) {
    console.error('Error fetching applications:', error);
    return {
      success: false,
      error: error.message,
    };
  }
});
