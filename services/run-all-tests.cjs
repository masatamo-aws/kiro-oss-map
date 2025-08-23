#!/usr/bin/env node

/**
 * Kiro OSS Map - 統合テストランナー v2.2.0
 * 全サービスのテストを実行し、成功率を計算・レポート生成
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class TestRunner {
  constructor() {
    this.services = ['auth', 'map', 'search'];
    this.results = {
      total: 0,
      passed: 0,
      failed: 0,
      services: {}
    };
    this.startTime = Date.now();
  }

  async runAllTests() {
    console.log('🚀 Kiro OSS Map - 統合テスト実行開始 v2.2.0');
    console.log('=' .repeat(60));

    for (const service of this.services) {
      await this.runServiceTests(service);
    }

    this.generateReport();
    this.checkQualityGate();
  }

  async runServiceTests(serviceName) {
    console.log(`\n📦 ${serviceName.toUpperCase()} サービステスト実行中...`);
    
    const servicePath = path.join(__dirname, serviceName);
    
    if (!fs.existsSync(servicePath)) {
      console.log(`⚠️  ${serviceName} サービスが見つかりません`);
      return;
    }

    try {
      const result = await this.executeTest(servicePath);
      this.results.services[serviceName] = result;
      this.results.total += result.total;
      this.results.passed += result.passed;
      this.results.failed += result.failed;

      const successRate = ((result.passed / result.total) * 100).toFixed(1);
      console.log(`✅ ${serviceName}: ${result.passed}/${result.total} 成功 (${successRate}%)`);
    } catch (error) {
      console.error(`❌ ${serviceName} テスト実行エラー:`, error.message);
      this.results.services[serviceName] = { total: 0, passed: 0, failed: 1, error: error.message };
      this.results.failed += 1;
    }
  }

  executeTest(servicePath) {
    return new Promise((resolve, reject) => {
      const testProcess = spawn('npx', ['jest'], {
        cwd: servicePath,
        stdio: 'pipe'
      });

      let output = '';
      let errorOutput = '';

      testProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      testProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      testProcess.on('close', (code) => {
        const result = this.parseTestOutput(output);
        
        if (code === 0) {
          resolve(result);
        } else {
          // テストが失敗してもパース結果を返す
          resolve(result);
        }
      });

      testProcess.on('error', (error) => {
        reject(error);
      });
    });
  }

  parseTestOutput(output) {
    // Jest出力をパースしてテスト結果を抽出
    const lines = output.split('\n');
    let total = 0;
    let passed = 0;
    let failed = 0;

    for (const line of lines) {
      if (line.includes('Tests:')) {
        const match = line.match(/(\d+) passed.*?(\d+) total/);
        if (match) {
          passed = parseInt(match[1]);
          total = parseInt(match[2]);
          failed = total - passed;
          break;
        }
      }
    }

    // デフォルト値（パースできない場合）
    if (total === 0) {
      total = 1;
      passed = output.includes('PASS') ? 1 : 0;
      failed = total - passed;
    }

    return { total, passed, failed };
  }

  generateReport() {
    const endTime = Date.now();
    const duration = ((endTime - this.startTime) / 1000).toFixed(2);
    const overallSuccessRate = this.results.total > 0 
      ? ((this.results.passed / this.results.total) * 100).toFixed(1)
      : '0.0';

    console.log('\n' + '='.repeat(60));
    console.log('📊 テスト実行結果サマリー');
    console.log('='.repeat(60));
    console.log(`⏱️  実行時間: ${duration}秒`);
    console.log(`📈 総合成功率: ${overallSuccessRate}% (${this.results.passed}/${this.results.total})`);
    console.log(`✅ 成功: ${this.results.passed}`);
    console.log(`❌ 失敗: ${this.results.failed}`);

    console.log('\n📦 サービス別結果:');
    for (const [service, result] of Object.entries(this.results.services)) {
      const rate = result.total > 0 ? ((result.passed / result.total) * 100).toFixed(1) : '0.0';
      console.log(`  ${service.padEnd(8)}: ${result.passed}/${result.total} (${rate}%)`);
    }

    // レポートファイル生成
    this.saveReport(overallSuccessRate, duration);
  }

  saveReport(successRate, duration) {
    const report = {
      timestamp: new Date().toISOString(),
      version: '2.2.0',
      duration: parseFloat(duration),
      overall: {
        successRate: parseFloat(successRate),
        total: this.results.total,
        passed: this.results.passed,
        failed: this.results.failed
      },
      services: this.results.services,
      qualityGate: {
        target: 90.0,
        passed: parseFloat(successRate) >= 90.0
      }
    };

    const reportPath = path.join(__dirname, '..', 'test-results-v2.2.0.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 詳細レポート保存: ${reportPath}`);
  }

  checkQualityGate() {
    const successRate = this.results.total > 0 
      ? ((this.results.passed / this.results.total) * 100)
      : 0;

    console.log('\n🎯 品質ゲートチェック:');
    console.log(`目標成功率: 90%`);
    console.log(`現在成功率: ${successRate.toFixed(1)}%`);

    if (successRate >= 90) {
      console.log('🎉 品質ゲート: 合格! ✅');
      process.exit(0);
    } else {
      console.log('⚠️  品質ゲート: 未達成 - 改善が必要です');
      console.log(`📈 改善必要: ${(90 - successRate).toFixed(1)}ポイント`);
      process.exit(1);
    }
  }
}

// メイン実行
if (require.main === module) {
  const runner = new TestRunner();
  runner.runAllTests().catch(error => {
    console.error('❌ テスト実行エラー:', error);
    process.exit(1);
  });
}

module.exports = TestRunner;