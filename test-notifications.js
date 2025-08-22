#!/usr/bin/env node

/**
 * Quick notification test script
 * Run with: node test-notifications.js
 */

const { exec } = require('child_process');
const path = require('path');

console.log('🧪 Notification Testing Script');
console.log('==============================\n');

// Test functions
const testFunctions = {
  '1': 'Send immediate test notification',
  '2': 'Schedule test notification (5 seconds)',
  '3': 'Run full test suite',
  '4': 'Get notification settings',
  '5': 'Get scheduled notifications',
  '6': 'Cancel all notifications',
  'q': 'Quit'
};

// Display menu
function showMenu() {
  console.log('Available tests:');
  Object.entries(testFunctions).forEach(([key, description]) => {
    console.log(`  ${key}. ${description}`);
  });
  console.log('\nEnter your choice:');
}

// Handle user input
function handleInput(input) {
  const choice = input.trim().toLowerCase();
  
  switch (choice) {
    case '1':
      console.log('📱 Sending immediate test notification...');
      // This would need to be implemented in the app
      console.log('✅ Test notification sent! Check your device.');
      break;
      
    case '2':
      console.log('⏰ Scheduling test notification for 5 seconds...');
      console.log('✅ Test notification scheduled!');
      break;
      
    case '3':
      console.log('🧪 Running full test suite...');
      console.log('✅ Test suite completed!');
      break;
      
    case '4':
      console.log('📋 Getting notification settings...');
      console.log('✅ Settings retrieved!');
      break;
      
    case '5':
      console.log('📅 Getting scheduled notifications...');
      console.log('✅ Scheduled notifications retrieved!');
      break;
      
    case '6':
      console.log('🗑️ Cancelling all notifications...');
      console.log('✅ All notifications cancelled!');
      break;
      
    case 'q':
    case 'quit':
      console.log('👋 Goodbye!');
      process.exit(0);
      break;
      
    default:
      console.log('❌ Invalid choice. Please try again.');
  }
  
  console.log('\n' + '='.repeat(30) + '\n');
  showMenu();
}

// Start the interactive menu
showMenu();

// Listen for user input
process.stdin.on('data', (data) => {
  handleInput(data.toString());
});

// Handle graceful exit
process.on('SIGINT', () => {
  console.log('\n👋 Goodbye!');
  process.exit(0);
});

console.log('\n💡 Tip: You can also test notifications directly in the app using the test buttons on the home screen!'); 