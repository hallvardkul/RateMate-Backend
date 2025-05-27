#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 MCP Server Diagnostic Tool');
console.log('==============================\n');

// Read MCP configuration
const mcpConfigPath = path.join(process.env.HOME, '.cursor', 'mcp.json');
const localMcpConfigPath = './mcp_config_fix.json';

let mcpConfig = null;

function readMcpConfig() {
    try {
        if (fs.existsSync(mcpConfigPath)) {
            console.log('✅ Found main MCP config at:', mcpConfigPath);
            mcpConfig = JSON.parse(fs.readFileSync(mcpConfigPath, 'utf8'));
        } else if (fs.existsSync(localMcpConfigPath)) {
            console.log('✅ Found local MCP config at:', localMcpConfigPath);
            mcpConfig = JSON.parse(fs.readFileSync(localMcpConfigPath, 'utf8'));
        } else {
            console.log('❌ No MCP configuration found');
            return false;
        }
        
        console.log('📋 MCP Configuration:');
        console.log(JSON.stringify(mcpConfig, null, 2));
        console.log('\n');
        return true;
    } catch (error) {
        console.error('❌ Error reading MCP config:', error.message);
        return false;
    }
}

function testCommand(command, args, serverName) {
    return new Promise((resolve) => {
        console.log(`🧪 Testing ${serverName}...`);
        console.log(`   Command: ${command} ${args.join(' ')}`);
        
        const child = spawn(command, [...args, '--help'], {
            stdio: ['pipe', 'pipe', 'pipe'],
            timeout: 10000
        });
        
        let stdout = '';
        let stderr = '';
        
        child.stdout.on('data', (data) => {
            stdout += data.toString();
        });
        
        child.stderr.on('data', (data) => {
            stderr += data.toString();
        });
        
        child.on('close', (code) => {
            if (code === 0 || stdout.includes('Available commands') || stdout.includes('Usage:')) {
                console.log(`   ✅ ${serverName} package is accessible`);
            } else {
                console.log(`   ❌ ${serverName} failed with code ${code}`);
                if (stderr) console.log(`   Error: ${stderr.split('\n')[0]}`);
            }
            resolve();
        });
        
        child.on('error', (error) => {
            console.log(`   ❌ ${serverName} command failed: ${error.message}`);
            resolve();
        });
        
        // Force timeout
        setTimeout(() => {
            child.kill();
            console.log(`   ⏰ ${serverName} test timed out`);
            resolve();
        }, 10000);
    });
}

async function testAllServers() {
    if (!mcpConfig || !mcpConfig.mcpServers) {
        console.log('❌ No MCP servers configured');
        return;
    }
    
    console.log('🚀 Testing MCP servers...\n');
    
    for (const [serverName, config] of Object.entries(mcpConfig.mcpServers)) {
        await testCommand(config.command, config.args, serverName);
        console.log('');
    }
}

function checkSystemRequirements() {
    console.log('🔧 System Requirements Check:');
    
    // Check Node.js
    const nodeVersion = process.version;
    console.log(`   Node.js: ${nodeVersion} ✅`);
    
    // Check npm/npx
    try {
        const { execSync } = require('child_process');
        const npxVersion = execSync('npx --version', { encoding: 'utf8' }).trim();
        console.log(`   npx: ${npxVersion} ✅`);
    } catch (error) {
        console.log(`   npx: ❌ Not available`);
    }
    
    console.log('');
}

function checkMcpProcesses() {
    console.log('🔄 Checking running MCP processes...');
    
    try {
        const { execSync } = require('child_process');
        const processes = execSync('ps aux | grep -i mcp | grep -v grep || echo "No MCP processes found"', { encoding: 'utf8' });
        
        if (processes.includes('No MCP processes found')) {
            console.log('   ❌ No MCP processes currently running');
        } else {
            console.log('   ✅ Found running MCP processes:');
            processes.split('\n').filter(line => line.trim()).forEach(line => {
                if (line.includes('mcp')) {
                    console.log(`   📍 ${line.split(/\s+/).slice(10).join(' ')}`);
                }
            });
        }
    } catch (error) {
        console.log('   ❌ Error checking processes:', error.message);
    }
    
    console.log('');
}

function generateRecommendations() {
    console.log('💡 Recommendations:');
    
    if (!mcpConfig) {
        console.log('   1. Create MCP configuration file at ~/.cursor/mcp.json');
        console.log('   2. Use the template from ./mcp_config_fix.json as a starting point');
    } else {
        console.log('   1. ✅ MCP configuration exists');
        
        // Check if postgres server is missing from main config
        if (!mcpConfig.mcpServers.postgres) {
            console.log('   2. ⚠️  Consider adding PostgreSQL MCP server to main config');
        } else {
            console.log('   2. ✅ PostgreSQL MCP server configured');
        }
        
        console.log('   3. Restart Cursor to reload MCP configuration');
        console.log('   4. Check Cursor Developer Tools (Help -> Developer Tools) for MCP errors');
    }
    
    console.log('');
}

async function main() {
    checkSystemRequirements();
    
    if (readMcpConfig()) {
        await testAllServers();
    }
    
    checkMcpProcesses();
    generateRecommendations();
    
    console.log('🏁 Diagnostic complete!');
}

main().catch(console.error); 