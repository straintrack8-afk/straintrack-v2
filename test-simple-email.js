// Simple email test - minimal HTML to avoid spam filters
const { Resend } = require('resend');

const RESEND_API_KEY = 're_EnFAoomb_5mhsC14BaXamW5LZrCehVv4c';
const resend = new Resend(RESEND_API_KEY);

console.log('📧 Sending simple test email...\n');

resend.emails.send({
    from: 'Test <onboarding@resend.dev>',
    to: 'lethanhngeu@gmail.com',
    subject: 'Simple Test - StrainTrack',
    text: 'This is a plain text test email. If you receive this, Resend is working!',
    html: '<p>This is a <strong>simple</strong> test email.</p><p>If you receive this, Resend is working!</p>'
})
    .then(result => {
        console.log('✅ Email sent!');
        console.log('Result:', JSON.stringify(result, null, 2));
    })
    .catch(error => {
        console.log('❌ Error:', error.message);
        console.log('Details:', error);
    });
