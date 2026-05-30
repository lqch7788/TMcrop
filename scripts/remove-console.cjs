/**
 * 清理 console.* 调用脚本
 * 将 console.log/error/warn 替换为 logger 服务调用
 */
const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'src');

// 需要跳过的文件
const skipFiles = [
  'src\\App.tsx', // App.tsx 中的初始化调用
];

// 统计
let totalReplaced = 0;
let filesProcessed = 0;

function processFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  let modified = false;
  const newLines = [];

  // 检查是否已导入 logger
  const hasLoggerImport = content.includes("import { logger }") || content.includes('import {logger}');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 匹配 console.log, console.error, console.warn (可能有空格)
    const consoleLogMatch = line.match(/^(\s*)console\.log\s*\((.*)\);?$/);
    const consoleErrorMatch = line.match(/^(\s*)console\.error\s*\((.*)\);?$/);
    const consoleWarnMatch = line.match(/^(\s*)console\.warn\s*\((.*)\);?$/);

    if (consoleLogMatch) {
      const indent = consoleLogMatch[1];
      const args = consoleLogMatch[2];
      if (args.trim() === '' || args.trim() === '""' || args.trim() === "''") {
        // 空日志，删除
        newLines.push(indent + '// 日志已清理');
      } else if (hasLoggerImport) {
        newLines.push(`${indent}logger.info(${args});`);
      } else {
        // 没有 logger 导入，改为注释
        newLines.push(`${indent}// logger.info(${args});`);
      }
      modified = true;
      totalReplaced++;
    } else if (consoleErrorMatch) {
      const indent = consoleErrorMatch[1];
      const args = consoleErrorMatch[2];
      if (hasLoggerImport) {
        newLines.push(`${indent}logger.error(${args});`);
      } else {
        newLines.push(`${indent}// logger.error(${args});`);
      }
      modified = true;
      totalReplaced++;
    } else if (consoleWarnMatch) {
      const indent = consoleWarnMatch[1];
      const args = consoleWarnMatch[2];
      if (hasLoggerImport) {
        newLines.push(`${indent}logger.warn(${args});`);
      } else {
        newLines.push(`${indent}// logger.warn(${args});`);
      }
      modified = true;
      totalReplaced++;
    } else {
      newLines.push(line);
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, newLines.join('\n'));
    filesProcessed++;
  }
}

function walkDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // 跳过 node_modules 和 .git
      if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
        walkDir(fullPath);
      }
    } else if (entry.isFile() && entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
      const relativePath = path.relative(srcDir, fullPath);
      if (!skipFiles.includes(relativePath)) {
        processFile(fullPath);
      }
    }
  }
}

console.log('开始清理 console.* 调用...');
walkDir(srcDir);
console.log(`处理完成: ${filesProcessed} 个文件, ${totalReplaced} 处调用`);
