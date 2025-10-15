import { withRelatedProject } from '@vercel/related-projects';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Log service URLs on server startup
    console.log('\n🚀 ========== Katachi Public Site Configuration ==========');
    console.log('📍 Environment:', process.env.NODE_ENV || 'development');
    console.log('');

    // MCP Server URL
    const mcpServerUrl = withRelatedProject({
      defaultHost: process.env.MCP_SERVER_URL || 'http://localhost:3002/mcp',
      relatedProjectEnvVariable: 'VERCEL_MCP_SERVER_URL',
    });
    console.log('🔗 MCP Server URL:');
    console.log('   Resolved:', mcpServerUrl);
    console.log('   Env var MCP_SERVER_URL:', process.env.MCP_SERVER_URL || '(not set)');
    console.log('   Vercel related project:', process.env.VERCEL_MCP_SERVER_URL || '(not set)');
    console.log('');

    // Generator URL
    const generatorUrl = process.env.KATACHI_GENERATOR_URL || 'http://localhost:3001';
    console.log('🎨 Generator URL:');
    console.log('   Resolved:', generatorUrl);
    console.log('   Env var KATACHI_GENERATOR_URL:', process.env.KATACHI_GENERATOR_URL || '(not set)');
    console.log('');

    // Chain configuration
    console.log('⛓️  Chain Configuration:');
    console.log('   Read Chain ID:', process.env.NEXT_PUBLIC_READ_CHAIN_ID);
    console.log('   Mint Chain ID:', process.env.NEXT_PUBLIC_MINT_CHAIN_ID);
    console.log('   Allow Mainnet Minting:', process.env.NEXT_PUBLIC_ALLOW_MAINNET_MINTING);
    console.log('');

    // Contract addresses
    console.log('📝 Contract Addresses:');
    console.log('   Testnet:', process.env.NEXT_PUBLIC_KATACHI_CONTRACT_TESTNET || '(not set)');
    console.log('   Mainnet:', process.env.NEXT_PUBLIC_KATACHI_CONTRACT_MAINNET || '(not set)');

    console.log('========================================================\n');
  }
}
