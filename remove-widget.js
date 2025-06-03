const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Path to the Xcode project file
const projectPath = path.join(__dirname, 'ios/boltexponativewind.xcodeproj/project.pbxproj');
const widgetPath = path.join(__dirname, 'ios/StreakWidget');

try {
  // Delete the StreakWidget folder if it exists
  if (fs.existsSync(widgetPath)) {
    console.log('Deleting StreakWidget folder...');
    if (process.platform === 'win32') {
      execSync(`rmdir /s /q "${widgetPath}"`);
    } else {
      execSync(`rm -rf "${widgetPath}"`);
    }
    console.log('StreakWidget folder deleted.');
  } else {
    console.log('StreakWidget folder not found.');
  }
  
  console.log('Reading project file...');
  let projectContent = fs.readFileSync(projectPath, 'utf8');
  
  // Check if the file contains references to the widget
  if (projectContent.includes('StreakWidget')) {
    console.log('Found StreakWidget references, removing...');
    
    // Remove the widget target
    projectContent = projectContent.replace(/^.*StreakWidget.*$/gm, '');
    
    // Remove any extension dependencies
    projectContent = projectContent.replace(/^.*appExtension.*$/gm, '');
    
    // Write the modified content back to the file
    fs.writeFileSync(projectPath, projectContent, 'utf8');
    console.log('Widget references removed from the project file.');
  } else {
    console.log('No StreakWidget references found in the project file.');
  }
  
  // Delete WidgetUpdaterModule files
  const widgetUpdaterMFile = path.join(__dirname, 'ios/WidgetUpdaterModule.m');
  const widgetUpdaterHFile = path.join(__dirname, 'ios/WidgetUpdaterModule.h');
  
  if (fs.existsSync(widgetUpdaterMFile)) {
    console.log('Deleting WidgetUpdaterModule.m...');
    fs.unlinkSync(widgetUpdaterMFile);
  }
  
  if (fs.existsSync(widgetUpdaterHFile)) {
    console.log('Deleting WidgetUpdaterModule.h...');
    fs.unlinkSync(widgetUpdaterHFile);
  }
  
  console.log('Complete!');
} catch (error) {
  console.error('Error:', error);
} 