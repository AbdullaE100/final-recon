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

// Function to replace RecoveryCalendar with RecoveryCalendarWithoutButtons
function replaceRecoveryCalendar(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Replace import statements
    const importRegex = /import\s+(\{[^}]*\})?\s*RecoveryCalendar\s*(\{[^}]*\})?\s*from\s+['"][^'"]+['"]/g;
    content = content.replace(importRegex, match => {
      return match.replace('RecoveryCalendar', 'RecoveryCalendarWithoutButtons');
    });
    
    // Replace component usage
    const componentRegex = /<RecoveryCalendar([^>]*)>/g;
    content = content.replace(componentRegex, '<RecoveryCalendarWithoutButtons$1>');
    
    const closingTagRegex = /<\/RecoveryCalendar>/g;
    content = content.replace(closingTagRegex, '</RecoveryCalendarWithoutButtons>');
    
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
  console.log('Searching for files using RecoveryCalendar component...');
  
  // Find all TypeScript and JavaScript files
  const tsxFiles = findFiles('.', /\.(tsx|ts|jsx|js)$/);
  
  // Check each file for RecoveryCalendar references
  const recoveryCalendarFiles = tsxFiles.filter(file => 
    fileContains(file, 'RecoveryCalendar') && 
    !file.includes('RecoveryCalendarWithoutButtons.tsx') &&
    !file.includes('replace-recovery-calendar.js')
  );
  
  console.log(`Found ${recoveryCalendarFiles.length} files with RecoveryCalendar references:`);
  recoveryCalendarFiles.forEach(file => console.log(`- ${file}`));
  
  // Replace RecoveryCalendar with RecoveryCalendarWithoutButtons
  let modifiedCount = 0;
  for (const file of recoveryCalendarFiles) {
    if (replaceRecoveryCalendar(file)) {
      modifiedCount++;
    }
  }
  
  console.log(`\nModified ${modifiedCount} files to use RecoveryCalendarWithoutButtons.`);
  
  // Rename RecoveryCalendar.tsx to RecoveryCalendar.tsx.bak
  try {
    if (fs.existsSync('components/RecoveryCalendar.tsx')) {
      fs.renameSync('components/RecoveryCalendar.tsx', 'components/RecoveryCalendar.tsx.bak');
      console.log('Renamed components/RecoveryCalendar.tsx to components/RecoveryCalendar.tsx.bak');
    }
  } catch (error) {
    console.error('Error renaming RecoveryCalendar.tsx:', error);
  }
  
  // Rename RecoveryCalendarWithoutButtons.tsx to RecoveryCalendar.tsx
  try {
    if (fs.existsSync('components/RecoveryCalendarWithoutButtons.tsx')) {
      fs.renameSync('components/RecoveryCalendarWithoutButtons.tsx', 'components/RecoveryCalendar.tsx');
      console.log('Renamed components/RecoveryCalendarWithoutButtons.tsx to components/RecoveryCalendar.tsx');
    }
  } catch (error) {
    console.error('Error renaming RecoveryCalendarWithoutButtons.tsx:', error);
  }
  
  console.log('Done!');
}

// Run the script
main(); 