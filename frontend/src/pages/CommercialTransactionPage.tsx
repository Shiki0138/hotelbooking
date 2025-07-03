import React from 'react';

const CommercialTransactionPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">特定商取引法に基づく表記</h1>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-6">
          <section>
            <h2 className="text-lg font-semibold mb-2">販売業者</h2>
            <p className="text-gray-700 dark:text-gray-300">LastMinuteStay株式会社</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">運営責任者</h2>
            <p className="text-gray-700 dark:text-gray-300">山田 太郎</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">所在地</h2>
            <p className="text-gray-700 dark:text-gray-300">
              〒150-0001<br />
              東京都渋谷区神宮前1-2-3 LastMinuteStayビル 10F
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">連絡先</h2>
            <div className="text-gray-700 dark:text-gray-300">
              <p>電話番号：03-1234-5678（受付時間：平日10:00〜18:00）</p>
              <p>メールアドレス：support@lastminutestay.com</p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">サービスの料金</h2>
            <div className="text-gray-700 dark:text-gray-300">
              <p>各ホテルの宿泊料金は、予約画面に表示される金額となります。</p>
              <p>表示価格は税込価格です。</p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">料金以外に必要な費用</h2>
            <p className="text-gray-700 dark:text-gray-300">
              インターネット接続料金、通信料金等はお客様のご負担となります。
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">支払方法</h2>
            <ul className="list-disc pl-6 space-y-1 text-gray-700 dark:text-gray-300">
              <li>クレジットカード決済（VISA、MasterCard、JCB、American Express、Diners Club）</li>
              <li>現地払い（一部のホテルのみ）</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">支払時期</h2>
            <div className="text-gray-700 dark:text-gray-300">
              <p>クレジットカード決済：予約確定時</p>
              <p>現地払い：チェックイン時</p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">サービスの提供時期</h2>
            <p className="text-gray-700 dark:text-gray-300">
              予約確定後、チェックイン日からチェックアウト日まで
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">キャンセル・返金について</h2>
            <div className="text-gray-700 dark:text-gray-300">
              <p>キャンセルポリシーは各ホテルにより異なります。</p>
              <p>予約時に表示されるキャンセルポリシーをご確認ください。</p>
              <p>キャンセル料が発生する場合があります。</p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">返品・交換について</h2>
            <p className="text-gray-700 dark:text-gray-300">
              サービスの性質上、返品・交換はお受けできません。
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">動作環境</h2>
            <div className="text-gray-700 dark:text-gray-300">
              <p className="mb-2">推奨ブラウザ：</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Google Chrome（最新版）</li>
                <li>Safari（最新版）</li>
                <li>Firefox（最新版）</li>
                <li>Microsoft Edge（最新版）</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">免責事項</h2>
            <p className="text-gray-700 dark:text-gray-300">
              当社は、本サービスの提供の中断、停止、終了、利用不能または変更、ユーザーが本サービスに送信したメッセージまたは情報の削除または消失、ユーザーの登録の抹消、本サービスの利用による登録データの消失または機器の故障もしくは損傷、その他本サービスに関してユーザーが被った損害につき、賠償する責任を一切負わないものとします。
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">個人情報の取扱い</h2>
            <p className="text-gray-700 dark:text-gray-300">
              お客様の個人情報は、当社のプライバシーポリシーに基づき適切に管理いたします。
              詳細は<a href="/privacy" className="text-primary-600 hover:text-primary-500 underline">プライバシーポリシー</a>をご確認ください。
            </p>
          </section>

          <div className="pt-6 border-t">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              最終更新日：2025年7月2日
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommercialTransactionPage;