#!/usr/bin/env node

/**
 * Integration Test Runner for Hotel Booking System
 * Executes comprehensive testing suite for all 3 phases
 */

import { exec } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { TestResultsAggregator, QA_METRICS } from './integration-test-suite';

class IntegrationTestRunner {
  private aggregator: TestResultsAggregator;
  private startTime: number;

  constructor() {
    this.aggregator = new TestResultsAggregator();
    this.startTime = Date.now();
  }

  async runAllTests(): Promise<void> {
    console.log('🚀 Starting Hotel Booking System Integration Testing');
    console.log('📋 Testing all 3 phases: Design System + AI Search + 3D/AR features');
    console.log('=' .repeat(80));

    try {
      // Phase 1: Design System Tests
      await this.runPhaseTests('Phase 1: Design System Integration', [
        'integration-test-suite.ts --grep "Phase 1"'
      ]);

      // Phase 2: AI Search Tests
      await this.runPhaseTests('Phase 2: AI Search Integration', [
        'integration-test-suite.ts --grep "Phase 2"'
      ]);

      // Phase 3: 3D/AR/VR Tests
      await this.runPhaseTests('Phase 3: 3D/AR/VR Integration', [
        'integration-test-suite.ts --grep "Phase 3"'
      ]);

      // Cross-Browser Tests
      await this.runPhaseTests('Cross-Browser Compatibility', [
        'integration-test-suite.ts --grep "Cross-Browser"'
      ]);

      // Accessibility Tests
      await this.runPhaseTests('Accessibility Compliance', [
        'integration-test-suite.ts --grep "Accessibility"'
      ]);

      // Performance Tests
      await this.runPhaseTests('Performance Tests', [
        'integration-test-suite.ts --grep "Performance"'
      ]);

      // Generate final report
      await this.generateFinalReport();

    } catch (error) {
      console.error('❌ Test execution failed:', error);
      process.exit(1);
    }
  }

  private async runPhaseTests(phaseName: string, testFiles: string[]): Promise<void> {
    console.log(`\n🧪 Running ${phaseName}...`);
    console.log('-' .repeat(50));

    for (const testFile of testFiles) {
      try {
        const result = await this.executePlaywrightTest(testFile);
        this.processTestResults(phaseName, result);
      } catch (error) {
        console.error(`❌ ${phaseName} failed:`, error);
        this.aggregator.recordResult(
          this.getPhaseKey(phaseName), 
          'failed', 
          testFile, 
          error as Error
        );
      }
    }
  }

  private async executePlaywrightTest(testPattern: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const command = `npx playwright test ${testPattern} --reporter=json`;
      
      exec(command, { cwd: process.cwd() }, (error, stdout, stderr) => {
        if (error) {
          reject(error);
          return;
        }

        try {
          const result = JSON.parse(stdout);
          resolve(result);
        } catch (parseError) {
          reject(new Error(`Failed to parse test results: ${parseError}`));
        }
      });
    });
  }

  private processTestResults(phaseName: string, results: any): void {
    const phaseKey = this.getPhaseKey(phaseName);
    
    if (results.suites && results.suites.length > 0) {
      results.suites.forEach((suite: any) => {
        suite.tests?.forEach((test: any) => {
          const status = test.outcome === 'passed' ? 'passed' : 
                        test.outcome === 'skipped' ? 'skipped' : 'failed';
          
          this.aggregator.recordResult(phaseKey, status, test.title, 
            status === 'failed' ? new Error(test.error?.message || 'Test failed') : null);
        });
      });
    }

    console.log(`✅ ${phaseName} completed`);
  }

  private getPhaseKey(phaseName: string): string {
    if (phaseName.includes('Phase 1')) return 'phase1';
    if (phaseName.includes('Phase 2')) return 'phase2';
    if (phaseName.includes('Phase 3')) return 'phase3';
    if (phaseName.includes('Cross-Browser')) return 'crossBrowser';
    if (phaseName.includes('Accessibility')) return 'accessibility';
    if (phaseName.includes('Performance')) return 'performance';
    return 'unknown';
  }

  private async generateFinalReport(): Promise<void> {
    console.log('\n📊 Generating Test Report...');
    
    this.aggregator.results.endTime = new Date().toISOString();
    this.aggregator.results.duration = Date.now() - this.startTime;
    
    const report = this.aggregator.generateReport();
    
    // Create test results directory
    const resultsDir = path.join(process.cwd(), 'test-results');
    await fs.mkdir(resultsDir, { recursive: true });
    
    // Save JSON report
    await fs.writeFile(
      path.join(resultsDir, 'integration-test-report.json'),
      JSON.stringify(report, null, 2)
    );
    
    // Save HTML report
    const htmlReport = this.generateHTMLReport(report);
    await fs.writeFile(
      path.join(resultsDir, 'integration-test-report.html'),
      htmlReport
    );
    
    // Display summary
    this.displayTestSummary(report);
    
    // Check quality gates
    this.checkQualityGates(report);
  }

  private generateHTMLReport(report: any): string {
    return `<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Hotel Booking System - Integration Test Report</title>
    <style>
        body { font-family: 'Segoe UI', system-ui, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; padding: 30px; }
        .stat-card { background: #f8f9fa; border-radius: 8px; padding: 20px; text-align: center; border-left: 4px solid #28a745; }
        .stat-card.failed { border-left-color: #dc3545; }
        .stat-number { font-size: 2em; font-weight: bold; color: #333; }
        .stat-label { color: #666; margin-top: 5px; }
        .phases { padding: 0 30px 30px; }
        .phase { margin-bottom: 20px; border: 1px solid #ddd; border-radius: 8px; }
        .phase-header { background: #f8f9fa; padding: 15px; border-bottom: 1px solid #ddd; font-weight: bold; }
        .phase-stats { padding: 15px; display: flex; gap: 20px; }
        .phase-stat { text-align: center; }
        .passed { color: #28a745; }
        .failed { color: #dc3545; }
        .skipped { color: #ffc107; }
        .issues { padding: 30px; background: #fff3cd; border-top: 1px solid #ddd; }
        .issue { background: white; border-radius: 4px; padding: 15px; margin-bottom: 10px; border-left: 4px solid #dc3545; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🏨 Hotel Booking System</h1>
            <h2>Integration Test Report</h2>
            <p>Testing all 3 phases: Design System + AI Search + 3D/AR features</p>
            <p>Generated: ${new Date().toLocaleString('ja-JP')}</p>
        </div>
        
        <div class="summary">
            <div class="stat-card">
                <div class="stat-number">${report.summary.totalTests}</div>
                <div class="stat-label">Total Tests</div>
            </div>
            <div class="stat-card">
                <div class="stat-number passed">${report.summary.passed}</div>
                <div class="stat-label">Passed</div>
            </div>
            <div class="stat-card failed">
                <div class="stat-number failed">${report.summary.failed}</div>
                <div class="stat-label">Failed</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${report.summary.passRate}%</div>
                <div class="stat-label">Pass Rate</div>
            </div>
        </div>
        
        <div class="phases">
            <h3>📊 Phase Results</h3>
            ${Object.entries(report.phases).map(([phaseName, stats]: [string, any]) => `
                <div class="phase">
                    <div class="phase-header">${phaseName}</div>
                    <div class="phase-stats">
                        <div class="phase-stat">
                            <div class="passed">${stats.passed}</div>
                            <div>Passed</div>
                        </div>
                        <div class="phase-stat">
                            <div class="failed">${stats.failed}</div>
                            <div>Failed</div>
                        </div>
                        <div class="phase-stat">
                            <div class="skipped">${stats.skipped}</div>
                            <div>Skipped</div>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
        
        ${report.issues.length > 0 ? `
        <div class="issues">
            <h3>🚨 Issues Found</h3>
            ${report.issues.map((issue: any) => `
                <div class="issue">
                    <strong>${issue.phase} - ${issue.test}</strong>
                    <p>${issue.error}</p>
                    <small>${issue.timestamp}</small>
                </div>
            `).join('')}
        </div>
        ` : ''}
    </div>
</body>
</html>`;
  }

  private displayTestSummary(report: any): void {
    console.log('\n' + '=' .repeat(80));
    console.log('🏆 INTEGRATION TEST SUMMARY');
    console.log('=' .repeat(80));
    console.log(`📊 Total Tests: ${report.summary.totalTests}`);
    console.log(`✅ Passed: ${report.summary.passed}`);
    console.log(`❌ Failed: ${report.summary.failed}`);
    console.log(`⏭️  Skipped: ${report.summary.skipped}`);
    console.log(`📈 Pass Rate: ${report.summary.passRate}%`);
    console.log(`⏱️  Duration: ${(report.summary.duration / 1000).toFixed(2)}s`);
    console.log('=' .repeat(80));
    
    // Phase breakdown
    console.log('\n📋 Phase Breakdown:');
    Object.entries(report.phases).forEach(([phase, stats]: [string, any]) => {
      const total = stats.passed + stats.failed + stats.skipped;
      const passRate = total > 0 ? ((stats.passed / total) * 100).toFixed(1) : '0';
      console.log(`  ${phase}: ${stats.passed}/${total} (${passRate}%)`);
    });
  }

  private checkQualityGates(report: any): void {
    console.log('\n🚪 Quality Gates Check:');
    
    const passRate = parseFloat(report.summary.passRate);
    const passRateCheck = passRate >= QA_METRICS.minimumPassRate;
    console.log(`  Pass Rate (${passRate}% >= ${QA_METRICS.minimumPassRate}%): ${passRateCheck ? '✅' : '❌'}`);
    
    const accessibilityPassed = report.phases['Accessibility']?.failed === 0;
    console.log(`  Accessibility (0 violations): ${accessibilityPassed ? '✅' : '❌'}`);
    
    const criticalFailures = report.issues.filter((issue: any) => 
      issue.phase.includes('Phase')).length;
    const criticalCheck = criticalFailures === 0;
    console.log(`  Critical Features (0 failures): ${criticalCheck ? '✅' : '❌'}`);
    
    if (passRateCheck && accessibilityPassed && criticalCheck) {
      console.log('\n🎉 ALL QUALITY GATES PASSED - READY FOR PRODUCTION! 🎉');
    } else {
      console.log('\n⚠️  Quality gates failed - Review issues before deployment');
    }
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const runner = new IntegrationTestRunner();
  runner.runAllTests().catch(console.error);
}

export { IntegrationTestRunner };