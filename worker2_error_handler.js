#!/usr/bin/env node

class Worker2ErrorHandler {
    constructor() {
        this.errors = [];
        this.startTime = new Date();
    }

    logError(error, context = '') {
        const errorData = {
            timestamp: new Date().toISOString(),
            error: error.message || error,
            stack: error.stack || '',
            context,
            severity: this.determineSeverity(error)
        };
        
        this.errors.push(errorData);
        console.error(`[WORKER2 ERROR] ${errorData.timestamp}: ${errorData.error}`);
        
        if (errorData.severity === 'critical') {
            this.reportCriticalError(errorData);
        }
    }

    determineSeverity(error) {
        const errorString = error.message || error.toString();
        
        if (errorString.includes('ENOENT') || errorString.includes('permission denied')) {
            return 'critical';
        }
        if (errorString.includes('timeout') || errorString.includes('network')) {
            return 'high';
        }
        return 'medium';
    }

    reportCriticalError(errorData) {
        console.error(`[CRITICAL ERROR DETECTED] Immediate boss1 notification required:`);
        console.error(JSON.stringify(errorData, null, 2));
        
        // 即座にboss1に報告
        const { spawn } = require('child_process');
        const reportCmd = spawn('./agent-send.sh', ['boss1', `CRITICAL ERROR in worker2: ${errorData.error}`]);
        
        reportCmd.on('error', (err) => {
            console.error(`Failed to send critical error report: ${err.message}`);
        });
    }

    getErrorSummary() {
        return {
            totalErrors: this.errors.length,
            criticalErrors: this.errors.filter(e => e.severity === 'critical').length,
            highErrors: this.errors.filter(e => e.severity === 'high').length,
            mediumErrors: this.errors.filter(e => e.severity === 'medium').length,
            uptime: Date.now() - this.startTime.getTime()
        };
    }

    async executeWithErrorHandling(taskName, asyncFunction) {
        try {
            console.log(`[WORKER2] Starting task: ${taskName}`);
            const result = await asyncFunction();
            console.log(`[WORKER2] Task completed: ${taskName}`);
            return result;
        } catch (error) {
            this.logError(error, `Task: ${taskName}`);
            throw error;
        }
    }
}

module.exports = Worker2ErrorHandler;

// 使用例
if (require.main === module) {
    const handler = new Worker2ErrorHandler();
    
    // テスト用のエラー処理
    handler.logError(new Error('Test error'), 'Testing error handler');
    
    console.log('Error Handler Summary:', handler.getErrorSummary());
}