// WAF (Web Application Firewall) Rules Configuration
// 史上最強のWAF設定 - worker4実装
// Created: 2025-06-29

class WAFRulesEngine {
    constructor(config = {}) {
        this.config = {
            logMode: false, // Set to true for monitoring only
            blockMode: true, // Set to false for monitoring only
            
            // Rule categories
            enableSQLInjectionProtection: true,
            enableXSSProtection: true,
            enableLFIProtection: true,
            enableRFIProtection: true,
            enableCommandInjectionProtection: true,
            enablePathTraversalProtection: true,
            enablePHPInjectionProtection: true,
            enableLDAPInjectionProtection: true,
            enableSSIInjectionProtection: true,
            enableXMLInjectionProtection: true,
            
            // Custom rules for hotel booking
            enableHotelBookingProtection: true,
            enableAPIProtection: true,
            enableAuthenticationProtection: true,
            
            // Anomaly scoring
            anomalyThreshold: 5,
            criticalThreshold: 4,
            errorThreshold: 3,
            warningThreshold: 2,
            noticeThreshold: 1,
            
            ...config
        };
        
        this.rules = this.initializeRules();
        this.ruleStats = new Map();
    }

    // 🚀 Initialize WAF Rules
    initializeRules() {
        const rules = [];
        
        // SQL Injection Rules
        if (this.config.enableSQLInjectionProtection) {
            rules.push(...this.getSQLInjectionRules());
        }
        
        // XSS Rules
        if (this.config.enableXSSProtection) {
            rules.push(...this.getXSSRules());
        }
        
        // Local File Inclusion (LFI) Rules
        if (this.config.enableLFIProtection) {
            rules.push(...this.getLFIRules());
        }
        
        // Remote File Inclusion (RFI) Rules
        if (this.config.enableRFIProtection) {
            rules.push(...this.getRFIRules());
        }
        
        // Command Injection Rules
        if (this.config.enableCommandInjectionProtection) {
            rules.push(...this.getCommandInjectionRules());
        }
        
        // Path Traversal Rules
        if (this.config.enablePathTraversalProtection) {
            rules.push(...this.getPathTraversalRules());
        }
        
        // PHP Injection Rules
        if (this.config.enablePHPInjectionProtection) {
            rules.push(...this.getPHPInjectionRules());
        }
        
        // LDAP Injection Rules
        if (this.config.enableLDAPInjectionProtection) {
            rules.push(...this.getLDAPInjectionRules());
        }
        
        // SSI Injection Rules
        if (this.config.enableSSIInjectionProtection) {
            rules.push(...this.getSSIInjectionRules());
        }
        
        // XML Injection Rules
        if (this.config.enableXMLInjectionProtection) {
            rules.push(...this.getXMLInjectionRules());
        }
        
        // Hotel Booking Specific Rules
        if (this.config.enableHotelBookingProtection) {
            rules.push(...this.getHotelBookingRules());
        }
        
        // API Protection Rules
        if (this.config.enableAPIProtection) {
            rules.push(...this.getAPIProtectionRules());
        }
        
        // Authentication Protection Rules
        if (this.config.enableAuthenticationProtection) {
            rules.push(...this.getAuthenticationRules());
        }
        
        return rules;
    }

    // 🔐 SQL Injection Rules
    getSQLInjectionRules() {
        return [
            {
                id: 'SQLI-001',
                name: 'SQL Injection - UNION SELECT',
                pattern: /(\b(union)\b\s*(\b(all|distinct)\b)?\s*(\b(select)\b))/i,
                severity: 'CRITICAL',
                score: 5,
                description: 'Detects UNION SELECT statements'
            },
            {
                id: 'SQLI-002',
                name: 'SQL Injection - OR 1=1',
                pattern: /(\b(or)\b\s*['"]*\s*\d+\s*[=<>]\s*\d+)/i,
                severity: 'CRITICAL',
                score: 5,
                description: 'Detects OR 1=1 type attacks'
            },
            {
                id: 'SQLI-003',
                name: 'SQL Injection - Comment Evasion',
                pattern: /(\/\*[\s\S]*?\*\/|--[\s\S]*?$|#[\s\S]*?$)/m,
                severity: 'WARNING',
                score: 2,
                description: 'Detects SQL comment evasion attempts'
            },
            {
                id: 'SQLI-004',
                name: 'SQL Injection - Information Schema',
                pattern: /(\b(information_schema|sysobjects|syscolumns)\b)/i,
                severity: 'CRITICAL',
                score: 5,
                description: 'Detects information schema attacks'
            },
            {
                id: 'SQLI-005',
                name: 'SQL Injection - Database Functions',
                pattern: /(\b(version|user|database|schema|concat|char|ascii|substring|length|count)\s*\()/i,
                severity: 'ERROR',
                score: 4,
                description: 'Detects database function usage'
            },
            {
                id: 'SQLI-006',
                name: 'SQL Injection - Time-based',
                pattern: /(\b(sleep|benchmark|waitfor|delay)\s*\()/i,
                severity: 'CRITICAL',
                score: 5,
                description: 'Detects time-based SQL injection'
            },
            {
                id: 'SQLI-007',
                name: 'SQL Injection - Boolean-based',
                pattern: /(\b(and|or)\b\s*\d+\s*[=<>]\s*\d+)/i,
                severity: 'ERROR',
                score: 3,
                description: 'Detects boolean-based SQL injection'
            }
        ];
    }

    // 🖥️ XSS Rules
    getXSSRules() {
        return [
            {
                id: 'XSS-001',
                name: 'XSS - Script Tag',
                pattern: /<script[\s\S]*?>[\s\S]*?<\/script>/i,
                severity: 'CRITICAL',
                score: 5,
                description: 'Detects script tag injection'
            },
            {
                id: 'XSS-002',
                name: 'XSS - JavaScript Event',
                pattern: /\bon\w+\s*=\s*['"]*\s*\w+/i,
                severity: 'ERROR',
                score: 4,
                description: 'Detects JavaScript event handlers'
            },
            {
                id: 'XSS-003',
                name: 'XSS - JavaScript Protocol',
                pattern: /javascript\s*:/i,
                severity: 'ERROR',
                score: 4,
                description: 'Detects javascript: protocol'
            },
            {
                id: 'XSS-004',
                name: 'XSS - Data Protocol',
                pattern: /data\s*:\s*[^,]*[,;]/i,
                severity: 'WARNING',
                score: 2,
                description: 'Detects data: protocol usage'
            },
            {
                id: 'XSS-005',
                name: 'XSS - VBScript',
                pattern: /vbscript\s*:/i,
                severity: 'ERROR',
                score: 4,
                description: 'Detects VBScript injection'
            },
            {
                id: 'XSS-006',
                name: 'XSS - Expression',
                pattern: /expression\s*\(/i,
                severity: 'ERROR',
                score: 4,
                description: 'Detects CSS expression() attacks'
            },
            {
                id: 'XSS-007',
                name: 'XSS - HTML Tags',
                pattern: /<(iframe|object|embed|applet|meta|link|base|form)/i,
                severity: 'WARNING',
                score: 2,
                description: 'Detects potentially dangerous HTML tags'
            }
        ];
    }

    // 📁 Local File Inclusion Rules
    getLFIRules() {
        return [
            {
                id: 'LFI-001',
                name: 'LFI - Path Traversal',
                pattern: /(\.\.[\/\\]){2,}/,
                severity: 'CRITICAL',
                score: 5,
                description: 'Detects path traversal attempts'
            },
            {
                id: 'LFI-002',
                name: 'LFI - System Files',
                pattern: /\/(etc\/passwd|etc\/shadow|etc\/hosts|proc\/self\/environ)/i,
                severity: 'CRITICAL',
                score: 5,
                description: 'Detects system file access attempts'
            },
            {
                id: 'LFI-003',
                name: 'LFI - Windows Files',
                pattern: /(boot\.ini|win\.ini|system\.ini|system32)/i,
                severity: 'CRITICAL',
                score: 5,
                description: 'Detects Windows system file access'
            }
        ];
    }

    // 🌐 Remote File Inclusion Rules
    getRFIRules() {
        return [
            {
                id: 'RFI-001',
                name: 'RFI - HTTP URL',
                pattern: /https?:\/\/[^\/\s]+/i,
                severity: 'ERROR',
                score: 3,
                description: 'Detects remote HTTP URL inclusion'
            },
            {
                id: 'RFI-002',
                name: 'RFI - FTP URL',
                pattern: /ftp:\/\/[^\/\s]+/i,
                severity: 'ERROR',
                score: 3,
                description: 'Detects remote FTP URL inclusion'
            }
        ];
    }

    // ⚡ Command Injection Rules
    getCommandInjectionRules() {
        return [
            {
                id: 'CMD-001',
                name: 'Command Injection - System Commands',
                pattern: /\b(cat|grep|ls|ps|id|whoami|uname|netstat|ping|wget|curl)\b/i,
                severity: 'CRITICAL',
                score: 5,
                description: 'Detects system command execution'
            },
            {
                id: 'CMD-002',
                name: 'Command Injection - Command Separators',
                pattern: /[;&|`$(){}]/,
                severity: 'ERROR',
                score: 3,
                description: 'Detects command separator characters'
            },
            {
                id: 'CMD-003',
                name: 'Command Injection - PowerShell',
                pattern: /powershell|cmd\.exe|bash|sh\s/i,
                severity: 'CRITICAL',
                score: 5,
                description: 'Detects shell execution attempts'
            }
        ];
    }

    // 🛤️ Path Traversal Rules
    getPathTraversalRules() {
        return [
            {
                id: 'PATH-001',
                name: 'Path Traversal - Encoded',
                pattern: /(%2e%2e%2f|%2e%2e%5c|%252e%252e%252f)/i,
                severity: 'CRITICAL',
                score: 5,
                description: 'Detects encoded path traversal'
            },
            {
                id: 'PATH-002',
                name: 'Path Traversal - Unicode',
                pattern: /(\u002e\u002e\u002f|\u002e\u002e\u005c)/,
                severity: 'ERROR',
                score: 4,
                description: 'Detects Unicode path traversal'
            }
        ];
    }

    // 🐘 PHP Injection Rules
    getPHPInjectionRules() {
        return [
            {
                id: 'PHP-001',
                name: 'PHP Injection - PHP Tags',
                pattern: /<\?php|<\?=|\?>/i,
                severity: 'CRITICAL',
                score: 5,
                description: 'Detects PHP tag injection'
            },
            {
                id: 'PHP-002',
                name: 'PHP Injection - Functions',
                pattern: /\b(eval|exec|system|shell_exec|passthru|file_get_contents|include|require)\s*\(/i,
                severity: 'CRITICAL',
                score: 5,
                description: 'Detects dangerous PHP functions'
            }
        ];
    }

    // 🔍 LDAP Injection Rules
    getLDAPInjectionRules() {
        return [
            {
                id: 'LDAP-001',
                name: 'LDAP Injection - Wildcards',
                pattern: /(\*|\)|\(|&|\|)/,
                severity: 'ERROR',
                score: 3,
                description: 'Detects LDAP wildcard injection'
            }
        ];
    }

    // 📄 SSI Injection Rules
    getSSIInjectionRules() {
        return [
            {
                id: 'SSI-001',
                name: 'SSI Injection - Include',
                pattern: /<!--#(include|exec|echo|config|set)/i,
                severity: 'ERROR',
                score: 4,
                description: 'Detects SSI include directives'
            }
        ];
    }

    // 📝 XML Injection Rules
    getXMLInjectionRules() {
        return [
            {
                id: 'XML-001',
                name: 'XXE - External Entity',
                pattern: /<!ENTITY.*>|<!DOCTYPE.*\[/i,
                severity: 'CRITICAL',
                score: 5,
                description: 'Detects XML External Entity injection'
            }
        ];
    }

    // 🏨 Hotel Booking Specific Rules
    getHotelBookingRules() {
        return [
            {
                id: 'HOTEL-001',
                name: 'Hotel Booking - Price Manipulation',
                pattern: /price\s*[=<>]\s*-?\d*\.?\d+/i,
                severity: 'CRITICAL',
                score: 5,
                description: 'Detects price manipulation attempts'
            },
            {
                id: 'HOTEL-002',
                name: 'Hotel Booking - Date Manipulation',
                pattern: /(checkin|checkout|date)\s*[=<>]\s*['"]?[\d-\/]+/i,
                severity: 'ERROR',
                score: 3,
                description: 'Detects date manipulation attempts'
            },
            {
                id: 'HOTEL-003',
                name: 'Hotel Booking - Room Enumeration',
                pattern: /(room|hotel)_id\s*[=<>]\s*\d+/i,
                severity: 'WARNING',
                score: 2,
                description: 'Detects room/hotel ID enumeration'
            },
            {
                id: 'HOTEL-004',
                name: 'Hotel Booking - Discount Manipulation',
                pattern: /(discount|coupon|promo)\s*[=<>]\s*['"]?\w+/i,
                severity: 'ERROR',
                score: 4,
                description: 'Detects discount code manipulation'
            },
            {
                id: 'HOTEL-005',
                name: 'Hotel Booking - User ID Tampering',
                pattern: /(user|customer)_id\s*[=<>]\s*\d+/i,
                severity: 'CRITICAL',
                score: 5,
                description: 'Detects user ID tampering'
            }
        ];
    }

    // 🔌 API Protection Rules
    getAPIProtectionRules() {
        return [
            {
                id: 'API-001',
                name: 'API - Mass Assignment',
                pattern: /\{.*"(admin|role|permission|is_admin)".*:/i,
                severity: 'CRITICAL',
                score: 5,
                description: 'Detects mass assignment attacks'
            },
            {
                id: 'API-002',
                name: 'API - Excessive Data Request',
                pattern: /limit\s*[=<>]\s*\d{3,}/i,
                severity: 'WARNING',
                score: 2,
                description: 'Detects excessive data requests'
            },
            {
                id: 'API-003',
                name: 'API - Function Call Injection',
                pattern: /\b(function|method|call|invoke)\s*\(/i,
                severity: 'ERROR',
                score: 4,
                description: 'Detects function call injection'
            }
        ];
    }

    // 🔐 Authentication Rules
    getAuthenticationRules() {
        return [
            {
                id: 'AUTH-001',
                name: 'Auth - SQL in Login',
                pattern: /(username|password|email)\s*[=<>]\s*['"].*['"\s]*(or|and)\s*['"]?\d+['"]?\s*[=<>]/i,
                severity: 'CRITICAL',
                score: 5,
                description: 'Detects SQL injection in authentication'
            },
            {
                id: 'AUTH-002',
                name: 'Auth - Credential Stuffing',
                pattern: /password\s*[=<>]\s*['"][^'"]{20,}/i,
                severity: 'WARNING',
                score: 2,
                description: 'Detects potential credential stuffing'
            },
            {
                id: 'AUTH-003',
                name: 'Auth - Admin Enumeration',
                pattern: /(admin|administrator|root|superuser)/i,
                severity: 'WARNING',
                score: 2,
                description: 'Detects admin account enumeration'
            }
        ];
    }

    // 🔍 WAF Middleware
    getWAFMiddleware() {
        return (req, res, next) => {
            try {
                const startTime = Date.now();
                const violations = this.analyzeRequest(req);
                const processingTime = Date.now() - startTime;

                // Add WAF headers
                res.setHeader('X-WAF-Status', violations.length > 0 ? 'BLOCKED' : 'ALLOWED');
                res.setHeader('X-WAF-Processing-Time', `${processingTime}ms`);
                res.setHeader('X-WAF-Rules-Checked', this.rules.length);

                if (violations.length > 0) {
                    const totalScore = violations.reduce((sum, v) => sum + v.score, 0);
                    
                    // Log violation
                    this.logViolation(req, violations, totalScore);
                    
                    // Check if should block
                    if (this.config.blockMode && totalScore >= this.config.anomalyThreshold) {
                        return res.status(403).json({
                            error: 'WAF Rule Violation',
                            message: 'Request blocked by Web Application Firewall',
                            ruleId: violations[0].id,
                            severity: violations[0].severity,
                            timestamp: new Date().toISOString()
                        });
                    }
                }

                next();
            } catch (error) {
                console.error('WAF Error:', error);
                // Fail open - allow request if WAF fails
                next();
            }
        };
    }

    // 🔍 Analyze Request
    analyzeRequest(req) {
        const violations = [];
        const targets = this.getAnalysisTargets(req);

        for (const rule of this.rules) {
            for (const target of targets) {
                if (rule.pattern.test(target.value)) {
                    violations.push({
                        ...rule,
                        target: target.location,
                        value: target.value.substring(0, 100), // Truncate for logging
                        timestamp: new Date().toISOString()
                    });
                    
                    // Update rule statistics
                    const stats = this.ruleStats.get(rule.id) || { hits: 0, lastHit: null };
                    stats.hits++;
                    stats.lastHit = new Date().toISOString();
                    this.ruleStats.set(rule.id, stats);
                }
            }
        }

        return violations;
    }

    // 🎯 Get Analysis Targets
    getAnalysisTargets(req) {
        const targets = [];

        // URL Path
        targets.push({
            location: 'url_path',
            value: req.path || ''
        });

        // Query Parameters
        if (req.query) {
            for (const [key, value] of Object.entries(req.query)) {
                targets.push({
                    location: `query_param:${key}`,
                    value: String(value)
                });
            }
        }

        // Request Body
        if (req.body) {
            if (typeof req.body === 'string') {
                targets.push({
                    location: 'request_body',
                    value: req.body
                });
            } else if (typeof req.body === 'object') {
                for (const [key, value] of Object.entries(req.body)) {
                    targets.push({
                        location: `body_param:${key}`,
                        value: String(value)
                    });
                }
            }
        }

        // Headers (selective)
        const headerWhitelist = ['user-agent', 'referer', 'x-forwarded-for'];
        for (const header of headerWhitelist) {
            if (req.headers[header]) {
                targets.push({
                    location: `header:${header}`,
                    value: req.headers[header]
                });
            }
        }

        // Cookies
        if (req.cookies) {
            for (const [key, value] of Object.entries(req.cookies)) {
                targets.push({
                    location: `cookie:${key}`,
                    value: String(value)
                });
            }
        }

        return targets;
    }

    // 📝 Log Violation
    logViolation(req, violations, totalScore) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            method: req.method,
            path: req.path,
            totalScore,
            violationCount: violations.length,
            violations: violations.map(v => ({
                ruleId: v.id,
                severity: v.severity,
                score: v.score,
                target: v.target,
                description: v.description
            }))
        };

        // In production, send to security logging system
        console.warn('WAF Violation:', JSON.stringify(logEntry));
    }

    // 📊 Get Statistics
    getStatistics() {
        const stats = {
            totalRules: this.rules.length,
            rulesByCategory: {},
            rulesBySeverity: {},
            topTriggeredRules: [],
            configuration: this.config
        };

        // Rules by category
        for (const rule of this.rules) {
            const category = rule.id.split('-')[0];
            stats.rulesByCategory[category] = (stats.rulesByCategory[category] || 0) + 1;
        }

        // Rules by severity
        for (const rule of this.rules) {
            stats.rulesBySeverity[rule.severity] = (stats.rulesBySeverity[rule.severity] || 0) + 1;
        }

        // Top triggered rules
        const sortedRules = Array.from(this.ruleStats.entries())
            .sort((a, b) => b[1].hits - a[1].hits)
            .slice(0, 10);

        stats.topTriggeredRules = sortedRules.map(([ruleId, ruleStats]) => ({
            ruleId,
            hits: ruleStats.hits,
            lastHit: ruleStats.lastHit
        }));

        return stats;
    }

    // 🔧 Update Configuration
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        this.rules = this.initializeRules();
        console.log('WAF Configuration updated');
    }

    // 📋 Get Status
    getStatus() {
        return {
            active: true,
            mode: this.config.blockMode ? 'BLOCKING' : 'MONITORING',
            rulesLoaded: this.rules.length,
            statistics: this.getStatistics()
        };
    }
}

module.exports = WAFRulesEngine;