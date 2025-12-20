#!/usr/bin/env node

/**
 * Analyze John Frank's AI-generated applications using Admin SDK
 * Fetches from Firestore and outputs detailed analysis
 */

import admin from 'firebase-admin';

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'ai-career-os-139db',
  });
}

const db = admin.firestore();

// John Frank's UID from Firebase Auth export
const JOHN_FRANK_UID = 'B7JWGPNQCYVlTWxvNZOTvgpujbr2';

async function analyzeApplications() {
  try {
    console.log('Fetching John Frank\'s applications...');
    console.log('User ID:', JOHN_FRANK_UID);

    // Fetch all applications
    const applicationsRef = db.collection('users').doc(JOHN_FRANK_UID).collection('applications');
    const querySnapshot = await applicationsRef.orderBy('createdAt', 'desc').get();

    console.log(`\n${'='.repeat(80)}`);
    console.log(`FOUND ${querySnapshot.size} APPLICATIONS`);
    console.log('='.repeat(80));

    querySnapshot.forEach((doc, index) => {
      const app = doc.data();

      console.log(`\n\n${'#'.repeat(80)}`);
      console.log(`APPLICATION ${index + 1}: ${app.jobTitle} at ${app.company}`);
      console.log('#'.repeat(80));
      console.log(`ID: ${doc.id}`);
      console.log(`Status: ${app.status}`);
      console.log(`Created: ${app.createdAt?.toDate?.() || 'N/A'}`);
      console.log(`Variants: ${app.variants?.length || 0}`);
      console.log(`Selected Variant: ${app.selectedVariantId}`);

      if (app.variants && app.variants.length > 0) {
        app.variants.forEach((variant, vIndex) => {
          console.log(`\n${'-'.repeat(80)}`);
          console.log(`VARIANT ${vIndex + 1}: ${variant.name} (${variant.id})`);
          console.log('-'.repeat(80));

          // Resume Analysis
          console.log('\n📄 RESUME ANALYSIS:');
          if (variant.resume) {
            console.log(`  Summary: ${variant.resume.summary?.length || 0} characters`);
            console.log(`  Experience entries: ${variant.resume.experience?.length || 0}`);
            console.log(`  Skills: ${variant.resume.skills?.length || 0}`);
            console.log(`  Education: ${variant.resume.education?.length || 0}`);

            // Summary
            if (variant.resume.summary) {
              console.log(`\n  📌 Professional Summary:`);
              console.log(`  ${variant.resume.summary}`);

              // Analysis
              const hasMetrics = /\d+/.test(variant.resume.summary);
              const hasYears = /\d+\s*years?/i.test(variant.resume.summary);
              const length = variant.resume.summary.length;

              console.log(`\n  ✓ Quality Metrics:`);
              console.log(`    - Length: ${length} chars ${length >= 100 && length <= 300 ? '✓' : '✗ (should be 100-300)'}` );
              console.log(`    - Contains numbers: ${hasMetrics ? '✓' : '✗'}`);
              console.log(`    - Mentions years of experience: ${hasYears ? '✓' : '✗'}`);
            }

            // Experience
            if (variant.resume.experience && variant.resume.experience.length > 0) {
              console.log(`\n  📌 Experience Entries:`);
              variant.resume.experience.forEach((exp, eIndex) => {
                console.log(`\n    ${eIndex + 1}. ${exp.title} at ${exp.company}`);
                console.log(`       Location: ${exp.location || 'N/A'}`);
                console.log(`       Dates: ${exp.startDate} - ${exp.endDate}`);
                console.log(`       Bullets: ${exp.bullets?.length || 0}`);

                if (exp.bullets && exp.bullets.length > 0) {
                  exp.bullets.forEach((bullet, bIndex) => {
                    console.log(`         ${bIndex + 1}. ${bullet}`);

                    // Analyze bullet quality
                    const hasMetric = /\d+%|\d+x|\$\d+|\d+\+/i.test(bullet);
                    const hasActionVerb = /^(Led|Managed|Developed|Increased|Reduced|Improved|Created|Built|Designed|Implemented)/i.test(bullet.trim());
                    const length = bullet.length;

                    if (!hasMetric || !hasActionVerb || length < 20) {
                      console.log(`            ⚠️  Quality issues: ${!hasMetric ? 'No metrics' : ''} ${!hasActionVerb ? 'Weak verb' : ''} ${length < 20 ? 'Too short' : ''}`);
                    }
                  });
                }
              });
            }

            // Skills
            if (variant.resume.skills) {
              console.log(`\n  📌 Skills (${variant.resume.skills.length}):`);
              console.log(`    ${variant.resume.skills.join(', ')}`);
            }
          }

          // Cover Letter Analysis
          console.log(`\n\n📧 COVER LETTER ANALYSIS:`);
          if (variant.coverLetter) {
            const paragraphs = variant.coverLetter.split(/\n\n+/);
            console.log(`  Length: ${variant.coverLetter.length} characters`);
            console.log(`  Paragraphs: ${paragraphs.length}`);

            // Check for key elements
            const hasGreeting = /dear|hello|greetings/i.test(variant.coverLetter);
            const mentionsCompany = variant.coverLetter.includes(app.company);
            const mentionsJobTitle = variant.coverLetter.includes(app.jobTitle);
            const hasClosing = /sincerely|regards|best|thank you/i.test(variant.coverLetter);
            const hasSpecificAchievement = /\d+%|\d+ years|\$\d+/i.test(variant.coverLetter);

            console.log(`\n  ✓ Quality Metrics:`);
            console.log(`    - Has greeting: ${hasGreeting ? '✓' : '✗'}`);
            console.log(`    - Mentions company: ${mentionsCompany ? '✓' : '✗'}`);
            console.log(`    - Mentions job title: ${mentionsJobTitle ? '✓' : '✗'}`);
            console.log(`    - Has closing: ${hasClosing ? '✓' : '✗'}`);
            console.log(`    - Includes specific achievements: ${hasSpecificAchievement ? '✓' : '✗'}`);
            console.log(`    - Length appropriate: ${variant.coverLetter.length >= 500 && variant.coverLetter.length <= 1500 ? '✓' : '✗ (should be 500-1500)'}`);

            console.log(`\n  📝 Full Cover Letter:`);
            console.log(`  ${variant.coverLetter}`);
          }

          // AI Rationale
          if (variant.aiRationale && variant.aiRationale.length > 0) {
            console.log(`\n\n🤖 AI RATIONALE:`);
            variant.aiRationale.forEach((reason, rIndex) => {
              console.log(`  ${rIndex + 1}. ${reason}`);
            });
          }
        });
      }
    });

    console.log(`\n\n${'='.repeat(80)}`);
    console.log('ANALYSIS COMPLETE');
    console.log('='.repeat(80));

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

analyzeApplications();
