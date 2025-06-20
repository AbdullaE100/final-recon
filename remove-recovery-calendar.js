const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Function to recursively search for files
function findFiles(dir, pattern) {
  let results = [];
  
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && file !== 'node_modules' && file !== '.git') {
      results = results.concat(findFiles(filePath, pattern));
    } else if (stat.isFile() && pattern.test(file)) {
      results.push(filePath);
    }
  }
  
  return results;
}

// Function to check if a file contains a specific string
function fileContains(filePath, searchString) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return content.includes(searchString);
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
    return false;
  }
}

// Function to remove the Recovery Calendar buttons from a file
function removeRecoveryCalendarButtons(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Look for Set Start Date button
    const setStartDateRegex = /<(TouchableOpacity|View|Button)[^>]*>[\s\S]*?Set Start Date[\s\S]*?<\/(TouchableOpacity|View|Button)>/g;
    content = content.replace(setStartDateRegex, '');
    
    // Look for Reset button
    const resetButtonRegex = /<(TouchableOpacity|View|Button)[^>]*>[\s\S]*?Reset[\s\S]*?<\/(TouchableOpacity|View|Button)>/g;
    content = content.replace(resetButtonRegex, '');
    
    // Write the modified content back to the file
    fs.writeFileSync(filePath, content, 'utf8');
    
    console.log(`Modified file: ${filePath}`);
    return true;
  } catch (error) {
    console.error(`Error modifying file ${filePath}:`, error);
    return false;
  }
}

// Main function
function main() {
  console.log('Searching for Recovery Calendar components...');
  
  // Find all TypeScript and JavaScript files
  const tsxFiles = findFiles('.', /\.(tsx|ts|jsx|js)$/);
  
  // Check each file for Recovery Calendar references
  const recoveryCalendarFiles = tsxFiles.filter(file => 
    fileContains(file, 'Recovery Calendar') || 
    fileContains(file, 'RecoveryCalendar')
  );
  
  console.log(`Found ${recoveryCalendarFiles.length} files with Recovery Calendar references:`);
  recoveryCalendarFiles.forEach(file => console.log(`- ${file}`));
  
  // Remove Recovery Calendar buttons from each file
  let modifiedCount = 0;
  for (const file of recoveryCalendarFiles) {
    if (removeRecoveryCalendarButtons(file)) {
      modifiedCount++;
    }
  }
  
  console.log(`\nModified ${modifiedCount} files to remove Recovery Calendar buttons.`);
  console.log('Done!');
}

// Run the script
main(); 