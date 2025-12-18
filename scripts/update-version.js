#!/usr/bin/env node
/**
 * Version Update Script for TabDuke
 * Updates @version tags across all JSDoc headers to match package.json
 *
 * Usage: node scripts/update-version.js
 */

import fs from 'fs';
import path from 'path';
import { globSync } from 'glob';

// Read current version from package.json
const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
const newVersion = packageJson.version;

console.log(`🔄 Updating all @version tags to ${newVersion}...`);

// Find all JavaScript files with @version tags
const jsFiles = globSync('src/**/*.js');
let filesUpdated = 0;

jsFiles.forEach(filePath => {
    const content = fs.readFileSync(filePath, 'utf8');

    // Only update if file contains @version tag
    if (content.includes('@version')) {
        const updatedContent = content.replace(
            /(@version\s+)[\d.]+/g,
            `$1${newVersion}`
        );

        // Only write if content actually changed
        if (updatedContent !== content) {
            fs.writeFileSync(filePath, updatedContent, 'utf8');
            console.log(`✅ Updated: ${filePath}`);
            filesUpdated++;
        }
    }
});

console.log(`🎉 Updated ${filesUpdated} files to version ${newVersion}`);