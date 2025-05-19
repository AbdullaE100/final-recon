const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Configuration
const PROJECT_REF = 'gtxigxwklomqdlihxjyd';
const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

// Paths to functions
const functionsDir = path.join(__dirname, 'supabase', 'functions');
const functions = [
  'stripe-webhooks',
  'stripe-checkout',
  'stripe-portal',
  '_shared'
];

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
    
    for (const funcName of functions) {
      const funcPath = path.join(functionsDir, funcName);
      const indexPath = path.join(funcPath, 'index.ts');
      
      if (!fs.existsSync(indexPath) && funcName !== '_shared') {
        console.error(`Function ${funcName} does not have an index.ts file!`);
        continue;
      }
      
      console.log(`Deploying ${funcName}...`);
      
      // Read function code
      let codeContent = '';
      if (funcName !== '_shared') {
        codeContent = fs.readFileSync(indexPath, 'utf8');
      }
      
      // Special handling for _shared (create a package)
      if (funcName === '_shared') {
        const corsPath = path.join(funcPath, 'cors.ts');
        if (fs.existsSync(corsPath)) {
          const corsContent = fs.readFileSync(corsPath, 'utf8');
          
          // Create a simple module that exports the cors utility
          const response = await api.post(`/v1/projects/${PROJECT_REF}/functions`, {
            name: funcName,
            verify_jwt: false,
            body: corsContent
          });
          
          console.log(`Deployed ${funcName}: ${response.status}`);
        } else {
          console.error('_shared/cors.ts not found!');
        }
        continue;
      }
      
      // Deploy the function
      const response = await api.post(`/v1/projects/${PROJECT_REF}/functions`, {
        name: funcName,
        verify_jwt: false,
        body: codeContent
      });
      
      console.log(`Deployed ${funcName}: ${response.status}`);
    }
    
    console.log('Deployment completed!');
    console.log(`Your webhook URL is: https://${PROJECT_REF}.functions.supabase.co/stripe-webhooks`);
  } catch (error) {
    console.error('Deployment failed:', error.response?.data || error.message);
  }
}

// Set environment variables
async function setEnvironmentVariables() {
  try {
    console.log('Setting environment variables...');
    
    const variables = {
      STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
      STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
      SUPABASE_URL: `https://${PROJECT_REF}.supabase.co`,
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
      SUBSCRIPTION_PRICE_ID: process.env.SUBSCRIPTION_PRICE_ID
    };
    
    for (const [key, value] of Object.entries(variables)) {
      if (!value) {
        console.warn(`Warning: ${key} is not set!`);
        continue;
      }
      
      const response = await api.post(`/v1/projects/${PROJECT_REF}/secrets`, {
        name: key,
        value: value
      });
      
      console.log(`Set environment variable ${key}: ${response.status}`);
    }
    
    console.log('Environment variables set successfully!');
  } catch (error) {
    console.error('Failed to set environment variables:', error.response?.data || error.message);
  }
}

// Run the deployment
async function main() {
  if (!SUPABASE_ACCESS_TOKEN) {
    console.error('Error: SUPABASE_ACCESS_TOKEN environment variable is required!');
    process.exit(1);
  }
  
  await deployFunctions();
  await setEnvironmentVariables();
}

main(); 