/**
 * Kiro OSS Map v2.1.0 - 簡易版全サービス起動スクリプト
 * 開発・テスト用の簡易サービス群起動
 */

const { spawn } = require('child_process');

const services = [
  {
    name: 'Auth Service',
    script: 'auth-simple.cjs',
    port: 3001,
    color: '\x1b[32m' // 緑
  },
  {
    name: 'Map Service',
    script: 'map-simple.cjs',
    port: 3002,
    color: '\x1b[34m' // 青
  },
  {
    name: 'Search Service',
    script: 'search-simple-v2.cjs',
    port: 3003,
    color: '\x1b[33m' // 黄
  }
];

const processes = [];
const reset = '\x1b[0m';

console.log('🚀 Starting Kiro OSS Map v2.1.0 Simple Microservices...');
console.log('=' .repeat(60));

// 各サービスを起動
services.forEach((service, index) => {
  setTimeout(() => {
    console.log(`${service.color}[${service.name}]${reset} Starting on port ${service.port}...`);
    
    const child = spawn('node', [service.script], {
      cwd: __dirname,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    // 標準出力をキャプチャ
    child.stdout.on('data', (data) => {
      const lines = data.toString().split('\n').filter(line => line.trim());
      lines.forEach(line => {
        console.log(`${service.color}[${service.name}]${reset} ${line}`);
      });
    });

    // エラー出力をキャプチャ
    child.stderr.on('data', (data) => {
      const lines = data.toString().split('\n').filter(line => line.trim());
      lines.forEach(line => {
        console.error(`${service.color}[${service.name}]${reset} ERROR: ${line}`);
      });
    });

    // プロセス終了時の処理
    child.on('close', (code) => {
      console.log(`${service.color}[${service.name}]${reset} Process exited with code ${code}`);
    });

    child.on('error', (error) => {
      console.error(`${service.color}[${service.name}]${reset} Failed to start: ${error.message}`);
    });

    processes.push({ name: service.name, process: child, color: service.color });
  }, index * 1000); // 1秒間隔で起動
});

// 起動完了後の情報表示
setTimeout(() => {
  console.log('\n' + '=' .repeat(60));
  console.log('🎉 All simple services started successfully!');
  console.log('\n📋 Service URLs:');
  services.forEach(service => {
    console.log(`   ${service.name}: http://localhost:${service.port}`);
    console.log(`   ${service.name} Health: http://localhost:${service.port}/health`);
  });
  
  console.log('\n🧪 Test Commands:');
  console.log('   Run tests: node test-runner.cjs');
  console.log('   Stop all: Ctrl+C');
  console.log('\n' + '=' .repeat(60));
}, 4000);

// グレースフルシャットダウン
function shutdown() {
  console.log('\n🛑 Shutting down all services...');
  
  processes.forEach(({ name, process, color }) => {
    console.log(`${color}[${name}]${reset} Stopping...`);
    process.kill('SIGTERM');
  });

  setTimeout(() => {
    console.log('✅ All services stopped.');
    process.exit(0);
  }, 2000);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);