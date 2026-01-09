// Quick test script to verify Resend API key works
const { Resend } = require('resend');

// Replace with your actual API key from .env.local
const RESEND_API_KEY = process.env.RESEND_API_KEY || 're_EnFAoomb_5mhsC14BaXamW5LZrCehVv4c';

const resend = new Resend(RESEND_API_KEY);

console.log('🧪 Testing Resend API...\n');
console.log('API Key:', RESEND_API_KEY.substring(0, 10) + '...');

resend.emails.send({
    from: 'StrainTrack <onboarding@resend.dev>',
    to: 'lethanhngeu@gmail.com', // Replace with your test email
    subject: 'Test Email from StrainTrack',
    html: '<h1>Hello!</h1><p>This is a test email to verify Resend is working.</p>'
})
    .then(result => {
        console.log('\n✅ SUCCESS! Email sent:');
        console.log('Email ID:', result.data?.id);
        console.log('\nCheck your inbox at: lethanhngeu@gmail.com');
        console.log('(Also check spam folder)');
    })
    .catch(error => {
        console.log('\n❌ ERROR sending email:');
        console.log('Message:', error.message);
        console.log('Status Code:', error.statusCode);
        console.log('Full error:', error);

        if (error.message.includes('API key')) {
            console.log('\n💡 TIP: Check your RESEND_API_KEY in .env.local');
        }
    });
