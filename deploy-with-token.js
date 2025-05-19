// This file automatically uses the token provided
const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Configuration
const PROJECT_REF = 'gtxigxwklomqdlihxjyd';
const SUPABASE_ACCESS_TOKEN = 'sbp_a173ac8747d8ee5723d02fadbff8f9922118b226';

// Paths to functions
const functionsDir = path.join(__dirname, 'supabase', 'functions');
const functions = [
  'stripe-webhooks',
  'stripe-checkout',
  'stripe-portal',
];

// Shared module
const sharedModule = '_shared';

// Create axios instance with auth
const api = axios.create({
  baseURL: 'https://api.supabase.com',
  headers: {
    'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}`,
    'Content-Type': 'application/json'
  }
});

// Deploy each function
async function deployFunctions() {
  try {
    console.log('Starting deployment of functions...');
    
    // First, try to list existing functions to see if they need to be created or updated
    const { data: existingFunctions } = await api.get(`/v1/projects/${PROJECT_REF}/functions`);
    console.log('Existing functions:', existingFunctions.map(f => f.name));
    
    // Deploy the _shared folder first (CORS utilities)
    const corsPath = path.join(functionsDir, sharedModule, 'cors.ts');
    if (fs.existsSync(corsPath)) {
      const corsContent = fs.readFileSync(corsPath, 'utf8');
      console.log('Deploying shared CORS module...');
      
      await deployOrUpdateFunction('cors-utils', corsContent, existingFunctions);
    }
    
    // Now deploy each main function
    for (const funcName of functions) {
      const indexPath = path.join(functionsDir, funcName, 'index.ts');
      
      if (fs.existsSync(indexPath)) {
        const content = fs.readFileSync(indexPath, 'utf8');
        console.log(`Deploying ${funcName}...`);
        
        await deployOrUpdateFunction(funcName, content, existingFunctions);
      } else {
        console.error(`Function ${funcName} index.ts not found at: ${indexPath}`);
      }
    }
    
    console.log('Deployment completed!');
    console.log(`Your webhook URL is: https://${PROJECT_REF}.functions.supabase.co/stripe-webhooks`);
  } catch (error) {
    console.error('Deployment failed:', error.message);
    if (error.response) {
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Helper to create or update a function
async function deployOrUpdateFunction(name, content, existingFunctions) {
  try {
    const existingFunc = existingFunctions.find(f => f.name === name);
    
    const payload = {
      name,
      slug: name.replace(/[^a-z0-9]/gi, '-').toLowerCase(),
      verify_jwt: false,
      body: content
    };
    
    if (existingFunc) {
      console.log(`Function ${name} exists, updating...`);
      const response = await api.patch(`/v1/projects/${PROJECT_REF}/functions/${existingFunc.id}`, payload);
      console.log(`Updated ${name}: ${response.status}`);
    } else {
      console.log(`Function ${name} doesn't exist, creating...`);
      const response = await api.post(`/v1/projects/${PROJECT_REF}/functions`, payload);
      console.log(`Created ${name}: ${response.status}`);
    }
  } catch (err) {
    console.error(`Error with function ${name}:`, err.message);
    if (err.response) {
      console.error('Response data:', JSON.stringify(err.response.data, null, 2));
    }
  }
}

// Run the deployment
async function main() {
  await deployFunctions();
}

main(); 