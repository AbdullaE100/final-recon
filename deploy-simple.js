const axios = require('axios');

// Supabase project reference and token
const PROJECT_REF = 'gtxigxwklomqdlihxjyd';
const TOKEN = 'sbp_a173ac8747d8ee5723d02fadbff8f9922118b226';

// Just list the functions to see what's already deployed
async function listFunctions() {
  try {
    const response = await axios.get(`https://api.supabase.com/v1/projects/${PROJECT_REF}/functions`, {
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Successfully connected to Supabase API');
    console.log('Current functions:', response.data.map(f => f.name));
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Status:', error.response.status);
    }
  }
}

listFunctions(); 