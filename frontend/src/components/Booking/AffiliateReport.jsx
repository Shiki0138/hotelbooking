import React, { useState, useEffect } from 'react';
import affiliateService from '../../services/AffiliateService';
import './AffiliateReport.css';

/**
 * アフィリエイトレポートコンポーネント
 * クリック数、コンバージョン数、収益などを表示
 */
const AffiliateReport = () => {
  const [reportData, setReportData] = useState(null);
  const [period, setPeriod] = useState('daily');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOta, setSelectedOta] = useState(null);

  useEffect(() => {
    loadReportData();
  }, [period]);

  const loadReportData = () => {
    setIsLoading(true);
    const data = affiliateService.getReportData(period);
    setReportData(data);
    setIsLoading(false);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY'
    }).format(amount);
  };

  const formatPercentage = (value) => {
    return `${value.toFixed(2)}%`;
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ja-JP', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  if (isLoading) {
    return (
      <div className="affiliate-report loading">
        <div className="loading-spinner"></div>
        <p>レポートを読み込み中...</p>
      </div>
    );
  }

  if (!reportData) {
    return (
      <div className="affiliate-report no-data">
        <p>データがありません</p>
      </div>
    );
  }

  const { summary, byOta, timeline } = reportData;

  return (
    <div className="affiliate-report">
      <div className="report-header">
        <h2>アフィリエイトレポート</h2>
        <div className="period-selector">
          <button
            className={period === 'daily' ? 'active' : ''}
            onClick={() => setPeriod('daily')}
          >
            日次
          </button>
          <button
            className={period === 'weekly' ? 'active' : ''}
            onClick={() => setPeriod('weekly')}
          >
            週次
          </button>
          <button
            className={period === 'monthly' ? 'active' : ''}
            onClick={() => setPeriod('monthly')}
          >
            月次
          </button>
        </div>
      </div>

      {/* サマリーカード */}
      <div className="summary-cards">
        <div className="summary-card clicks">
          <div className="card-icon">👆</div>
          <div className="card-content">
            <div className="card-label">総クリック数</div>
            <div className="card-value">{summary.totalClicks.toLocaleString()}</div>
          </div>
        </div>

        <div className="summary-card conversions">
          <div className="card-icon">✅</div>
          <div className="card-content">
            <div className="card-label">コンバージョン数</div>
            <div className="card-value">{summary.totalConversions.toLocaleString()}</div>
          </div>
        </div>

        <div className="summary-card rate">
          <div className="card-icon">📊</div>
          <div className="card-content">
            <div className="card-label">コンバージョン率</div>
            <div className="card-value">{formatPercentage(summary.conversionRate)}</div>
          </div>
        </div>

        <div className="summary-card revenue">
          <div className="card-icon">💰</div>
          <div className="card-content">
            <div className="card-label">推定収益</div>
            <div className="card-value">{formatCurrency(summary.estimatedRevenue)}</div>
          </div>
        </div>
      </div>

      {/* OTA別パフォーマンス */}
      <div className="ota-performance">
        <h3>OTA別パフォーマンス</h3>
        <div className="ota-grid">
          {Object.entries(byOta).map(([otaName, data]) => (
            <div
              key={otaName}
              className={`ota-card ${selectedOta === otaName ? 'selected' : ''}`}
              onClick={() => setSelectedOta(selectedOta === otaName ? null : otaName)}
            >
              <div className="ota-name">{otaName}</div>
              <div className="ota-metrics">
                <div className="metric">
                  <span className="metric-label">クリック</span>
                  <span className="metric-value">{data.clicks}</span>
                </div>
                <div className="metric">
                  <span className="metric-label">CV</span>
                  <span className="metric-value">{data.conversions}</span>
                </div>
                <div className="metric">
                  <span className="metric-label">CVR</span>
                  <span className="metric-value">
                    {data.clicks > 0 
                      ? formatPercentage((data.conversions / data.clicks) * 100)
                      : '0.00%'
                    }
                  </span>
                </div>
                <div className="metric revenue">
                  <span className="metric-label">収益</span>
                  <span className="metric-value">{formatCurrency(data.revenue)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* タイムラインチャート */}
      <div className="timeline-chart">
        <h3>時系列データ</h3>
        <div className="chart-container">
          <div className="chart-legend">
            <div className="legend-item clicks">
              <span className="legend-color"></span>
              <span>クリック数</span>
            </div>
            <div className="legend-item conversions">
              <span className="legend-color"></span>
              <span>コンバージョン数</span>
            </div>
          </div>
          
          <div className="chart-wrapper">
            <div className="chart-bars">
              {timeline.map((point, index) => {
                const maxValue = Math.max(
                  ...timeline.map(p => Math.max(p.clicks, p.conversions)),
                  1
                );
                const clickHeight = (point.clicks / maxValue) * 100;
                const conversionHeight = (point.conversions / maxValue) * 100;

                return (
                  <div key={index} className="chart-bar-group">
                    <div className="bar-values">
                      {point.clicks > 0 && (
                        <span className="value clicks">{point.clicks}</span>
                      )}
                      {point.conversions > 0 && (
                        <span className="value conversions">{point.conversions}</span>
                      )}
                    </div>
                    <div className="bars">
                      <div 
                        className="bar clicks"
                        style={{ height: `${clickHeight}%` }}
                      ></div>
                      <div 
                        className="bar conversions"
                        style={{ height: `${conversionHeight}%` }}
                      ></div>
                    </div>
                    <div className="bar-label">
                      {formatDateTime(point.time)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* アクションボタン */}
      <div className="report-actions">
        <button className="action-button export" onClick={() => exportReport()}>
          <span className="button-icon">📥</span>
          レポートをエクスポート
        </button>
        <button className="action-button refresh" onClick={loadReportData}>
          <span className="button-icon">🔄</span>
          データを更新
        </button>
      </div>
    </div>
  );

  function exportReport() {
    const csvContent = generateCSV(reportData);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `affiliate_report_${period}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function generateCSV(data) {
    const headers = ['期間', '総クリック数', '総コンバージョン数', 'コンバージョン率', '推定収益'];
    const summaryRow = [
      period,
      data.summary.totalClicks,
      data.summary.totalConversions,
      data.summary.conversionRate,
      data.summary.estimatedRevenue
    ];

    let csv = headers.join(',') + '\n';
    csv += summaryRow.join(',') + '\n\n';

    // OTA別データ
    csv += 'OTA,クリック数,コンバージョン数,コンバージョン率,収益\n';
    Object.entries(data.byOta).forEach(([ota, metrics]) => {
      csv += `${ota},${metrics.clicks},${metrics.conversions},${
        metrics.clicks > 0 ? ((metrics.conversions / metrics.clicks) * 100).toFixed(2) : 0
      }%,${metrics.revenue}\n`;
    });

    return csv;
  }
};

export default AffiliateReport;