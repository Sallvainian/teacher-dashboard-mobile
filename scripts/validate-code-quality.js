#!/usr/bin/env node
// scripts/validate-code-quality.js
// Validates practical code quality patterns that won't break anything

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SRC_DIR = path.resolve(__dirname, '..', 'src');
const warnings = [];
const errors = [];

function validateFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const fileName = path.basename(filePath);
  const relativePath = path.relative(process.cwd(), filePath);
  
  // Skip console checks for now - too noisy during development
  
  // Check for any type usage (but only warn if excessive)
  const anyMatches = content.match(/:\s*any\b/g);
  if (anyMatches && anyMatches.length > 5) {
    warnings.push(`${relativePath}: Uses 'any' type ${anyMatches.length} times (consider reducing)`);
  }
  
  // Check for TODO/FIXME comments
  const todoMatches = content.match(/\/\/\s*(TODO|FIXME|HACK|XXX|BUG):/gi);
  if (todoMatches) {
    warnings.push(`${relativePath}: Contains ${todoMatches.length} TODO/FIXME comments`);
  }
  
  // Check for hardcoded credentials (avoid false positives from type definitions)
  if ((content.includes('sk_live_') || content.includes('pk_live_') || 
      content.includes('secret_') || content.includes('password: "') || 
      content.includes("password: '")) && 
      !fileName.includes('.d.ts') && !fileName.includes('types')) {
    errors.push(`${relativePath}: May contain hardcoded credentials!`);
  }
  
  // Skip async error handling check - too many false positives
  
  // Check for Svelte 5 patterns in .svelte files
  if (fileName.endsWith('.svelte')) {
    // Check for old Svelte 4 patterns
    if (content.includes('export let ') && content.includes('<script')) {
      errors.push(`${relativePath}: Uses old 'export let' pattern instead of $props()`);
    }
    if (content.includes('createEventDispatcher')) {
      errors.push(`${relativePath}: Uses createEventDispatcher instead of callback props`);
    }
    if (content.match(/\$:\s/)) {
      errors.push(`${relativePath}: Uses old $: reactive statements instead of $derived()`);
    }
  }
  
  // Skip unused import check - too unreliable with destructuring and types
  
  // Skip array null check warnings - too many false positives
}

function walkDirectory(dir) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
      walkDirectory(fullPath);
    } else if ((file.endsWith('.ts') || file.endsWith('.svelte') || file.endsWith('.js')) && 
               !file.endsWith('.d.ts')) {
      validateFile(fullPath);
    }
  });
}

console.log('🔍 Validating code quality patterns...\n');

if (fs.existsSync(SRC_DIR)) {
  walkDirectory(SRC_DIR);
}

// Summary
if (errors.length > 0) {
  console.log('❌ ERRORS (must fix):\n');
  errors.forEach(error => console.log(`  ${error}`));
  console.log('');
}

if (warnings.length > 0) {
  console.log('⚠️  WARNINGS (consider fixing):\n');
  warnings.forEach(warning => console.log(`  ${warning}`));
  console.log('');
}

if (errors.length === 0 && warnings.length === 0) {
  console.log('✅ All code quality checks passed!');
}

// Exit with error code if there are errors
process.exit(errors.length > 0 ? 1 : 0);