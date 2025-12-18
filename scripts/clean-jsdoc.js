#!/usr/bin/env node
/**
 * JSDoc Cleanup Script for TabDuke - Convert to Documentation-Ready Standard
 * Removes verbose JSDoc tags while preserving context-aware descriptions.
 *
 * Before: Academic-style with @since, @version, @author, verbose @example blocks
 * After:  Clean documentation with context + type annotations for auto-generation
 */

import fs from 'fs';
import { globSync } from 'glob';

console.log('🧹 Cleaning JSDoc to industry standard...\n');

const jsFiles = globSync('src/**/*.js');
let filesModified = 0;

// Tags to remove completely
const REMOVE_TAGS = [
    '@version',
    '@since',
    '@author',
    '@fileoverview',
    '@description',
    '@chrome-extension',
    '@requires',
    '@chrome-permissions',
    '@performance',
    '@error-handling',
    '@imports',
    '@complexity',
    '@throws'
];

// Clean up verbose examples and descriptions
const cleanJSDoc = (content) => {
    let cleaned = content;

    // Remove verbose file-level JSDoc headers
    cleaned = cleaned.replace(
        /\/\*\*\s*\n(\s*\*[^\n]*\n)*\s*\*\/\s*\n(?=import|class)/gm,
        (match) => {
            // Extract only essential info for file headers
            const lines = match.split('\n');
            const firstLine = lines.find(line =>
                line.includes('*') &&
                !line.includes('@') &&
                line.trim() !== '*' &&
                line.trim() !== '/**'
            );

            if (firstLine) {
                const description = firstLine.replace(/^\s*\*\s*/, '').replace(/\s*\*\/\s*$/, '');
                return `/**\n * ${description}\n */\n`;
            }
            return ''; // Remove if no meaningful content
        }
    );

    // Remove unwanted JSDoc tags
    REMOVE_TAGS.forEach(tag => {
        const tagRegex = new RegExp(`^\\s*\\*\\s*${tag.replace('@', '\\@')}.*$`, 'gm');
        cleaned = cleaned.replace(tagRegex, '');
    });

    // Clean up method JSDoc - keep context-aware descriptions + type annotations
    cleaned = cleaned.replace(
        /\/\*\*\s*\n((?:\s*\*[^\n]*\n)*)\s*\*\/\s*\n(\s*(?:async\s+)?(?:\w+\s*\(|\w+\s*:))/gm,
        (match, docContent, methodSignature) => {
            const lines = docContent.split('\n').map(line => line.trim());
            const cleanLines = [];

            // Extract meaningful description lines (first 1-2 non-tag lines)
            const descLines = lines.filter(line =>
                line.startsWith('*') &&
                !line.includes('@') &&
                line !== '*' &&
                line.length > 2
            ).slice(0, 2); // Max 2 context lines

            descLines.forEach(line => {
                const desc = line.replace(/^\*\s*/, '');
                cleanLines.push(` * ${desc}`);
            });

            // Extract @param, @returns, and other essential tags
            lines.forEach(line => {
                if (line.includes('@param') || line.includes('@returns') || line.includes('@throws')) {
                    cleanLines.push(line.replace(/^\*\s*/, ' * '));
                }
            });

            if (cleanLines.length === 0) return methodSignature;

            return '/**\n' + cleanLines.join('\n') + '\n */\n' + methodSignature;
        }
    );

    // Remove empty JSDoc blocks
    cleaned = cleaned.replace(/\/\*\*\s*\n\s*\*\/\s*\n/g, '');

    // Clean up multiple blank lines
    cleaned = cleaned.replace(/\n\s*\n\s*\n/g, '\n\n');

    return cleaned;
};

jsFiles.forEach(filePath => {
    const originalContent = fs.readFileSync(filePath, 'utf8');
    const cleanedContent = cleanJSDoc(originalContent);

    if (cleanedContent !== originalContent) {
        fs.writeFileSync(filePath, cleanedContent, 'utf8');
        console.log(`✅ Cleaned: ${filePath}`);
        filesModified++;
    }
});

console.log(`\n🎉 Cleaned JSDoc in ${filesModified} files`);
console.log('📋 Removed: verbose tags, examples, file headers');
console.log('✨ Kept: type annotations, essential context');