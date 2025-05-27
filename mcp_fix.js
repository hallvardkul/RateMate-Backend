#!/usr/bin/env node

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 MCP Server Fix & Restart Tool');
console.log('================================\n');

function killMcpProcesses() {
    console.log('🛑 Stopping existing MCP processes...');
    
    try {
        // Find and kill MCP processes
        const processes = execSync('ps aux | grep -i mcp | grep -v grep | grep -v "mcp_fix.js"', { encoding: 'utf8' });
        
        if (processes.trim()) {
            processes.split('\n').filter(line => line.trim()).forEach(line => {
                const parts = line.split(/\s+/);
                const pid = parts[1];
                
                if (pid && !isNaN(pid)) {
                    try {
                        process.kill(parseInt(pid), 'SIGTERM');
                        console.log(`   ✅ Stopped process ${pid}`);
                    } catch (error) {
                        console.log(`   ❌ Failed to stop process ${pid}: ${error.message}`);
                    }
                }
            });
        } else {
            console.log('   ℹ️  No MCP processes found to stop');
        }
    } catch (error) {
        console.log('   ℹ️  No MCP processes found to stop');
    }
    
    console.log('');
}

function validateMcpConfig() {
    console.log('✅ Validating MCP configuration...');
    
    const mcpConfigPath = path.join(process.env.HOME, '.cursor', 'mcp.json');
    
    try {
        const config = JSON.parse(fs.readFileSync(mcpConfigPath, 'utf8'));
        
        console.log('   📋 Current configuration:');
        Object.keys(config.mcpServers || {}).forEach(server => {
            console.log(`   - ${server}: ${config.mcpServers[server].command} ${config.mcpServers[server].args.join(' ')}`);
        });
        
        console.log('   ✅ Configuration is valid');
    } catch (error) {
        console.log(`   ❌ Configuration error: ${error.message}`);
        return false;
    }
    
    console.log('');
    return true;
}

function testPostgresConnection() {
    console.log('🐘 Testing PostgreSQL connection...');
    
    try {
        const { Client } = require('pg');
        const client = new Client('postgresql://ratemate_testuser:Emilia123@ratemate-dev-postgres.postgres.database.azure.com:5432/RateMate_dev_db?sslmode=require');
        
        return new Promise((resolve) => {
            client.connect()
                .then(() => {
                    console.log('   ✅ PostgreSQL connection successful');
                    client.end();
                    resolve(true);
                })
                .catch(err => {
                    console.log('   ❌ PostgreSQL connection failed:', err.message);
                    resolve(false);
                });
        });
    } catch (error) {
        console.log('   ❌ PostgreSQL module not available:', error.message);
        console.log('   💡 Install with: npm install pg');
        return Promise.resolve(false);
    }
}

function clearMcpCache() {
    console.log('🧹 Clearing MCP cache...');
    
    try {
        // Clear npm cache for MCP packages
        execSync('npm cache clean --force');
        console.log('   ✅ npm cache cleared');
        
        // Clear npx cache
        const npxCacheDir = path.join(process.env.HOME, '.npm', '_npx');
        if (fs.existsSync(npxCacheDir)) {
            execSync(`rm -rf "${npxCacheDir}"`);
            console.log('   ✅ npx cache cleared');
        }
        
    } catch (error) {
        console.log('   ⚠️  Cache clearing had issues (may be okay):', error.message);
    }
    
    console.log('');
}

function provideFinalInstructions() {
    console.log('📋 Final Steps:');
    console.log('===============');
    console.log('1. 🔄 Restart Cursor completely (Cmd+Q then reopen)');
    console.log('2. 🔍 Open Cursor Developer Tools: Help → Developer Tools');
    console.log('3. 📡 Check Console tab for MCP server startup messages');
    console.log('4. 🧪 Test MCP functionality by using the chat with AI features');
    console.log('');
    console.log('🔧 If issues persist:');
    console.log('- Check Cursor settings for MCP configuration');
    console.log('- Verify network connectivity to Azure PostgreSQL');
    console.log('- Try running MCP servers individually for debugging');
    console.log('');
    console.log('💡 Debug commands:');
    console.log('- Test GitHub MCP: npx -y @smithery/cli@latest run @smithery-ai/github --help');
    console.log('- Test Browser MCP: npx -y @agentdeskai/browser-tools-mcp@1.2.0 --help');
    console.log('- Test Postgres MCP: npx -y @modelcontextprotocol/server-postgres --help');
}

async function main() {
    killMcpProcesses();
    
    if (!validateMcpConfig()) {
        console.log('❌ Configuration invalid, please fix before proceeding');
        return;
    }
    
    clearMcpCache();
    
    await testPostgresConnection();
    
    provideFinalInstructions();
    
    console.log('🎉 MCP fix process complete!');
}

main().catch(console.error); 