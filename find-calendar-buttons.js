const fs = require('fs');
const path = require('path');

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

// Function to check if a file contains both strings
function fileContainsBoth(filePath, string1, string2) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return content.includes(string1) && content.includes(string2);
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
    return false;
  }
}

// Main function
function main() {
  console.log('Searching for files with both "Set Start Date" and "Reset" buttons...');
  
  // Find all TypeScript and JavaScript files
  const tsxFiles = findFiles('.', /\.(tsx|ts|jsx|js)$/);
  
  // Check each file for both strings
  const matchingFiles = tsxFiles.filter(file => 
    fileContainsBoth(file, 'Set Start Date', 'Reset')
  );
  
  console.log(`Found ${matchingFiles.length} files with both "Set Start Date" and "Reset" buttons:`);
  matchingFiles.forEach(file => console.log(`- ${file}`));
  
  // For each matching file, print the relevant lines
  if (matchingFiles.length > 0) {
    console.log('\nRelevant code snippets:');
    
    for (const file of matchingFiles) {
      console.log(`\nFile: ${file}`);
      
      try {
        const content = fs.readFileSync(file, 'utf8');
        const lines = content.split('\n');
        
        // Find lines containing the strings
        const setStartDateLines = [];
        const resetLines = [];
        
        lines.forEach((line, index) => {
          if (line.includes('Set Start Date')) {
            setStartDateLines.push({ index, line });
          }
          if (line.includes('Reset')) {
            resetLines.push({ index, line });
          }
        });
        
        // Print the relevant lines with context
        console.log('Set Start Date lines:');
        setStartDateLines.forEach(({ index, line }) => {
          const start = Math.max(0, index - 2);
          const end = Math.min(lines.length - 1, index + 2);
          
          for (let i = start; i <= end; i++) {
            console.log(`${i + 1}: ${lines[i]}`);
          }
          console.log('---');
        });
        
        console.log('Reset lines:');
        resetLines.forEach(({ index, line }) => {
          const start = Math.max(0, index - 2);
          const end = Math.min(lines.length - 1, index + 2);
          
          for (let i = start; i <= end; i++) {
            console.log(`${i + 1}: ${lines[i]}`);
          }
          console.log('---');
        });
      } catch (error) {
        console.error(`Error reading file ${file}:`, error);
      }
    }
  }
  
  console.log('\nDone!');
}

// Run the script
main(); 