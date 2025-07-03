import React from 'react';

const TermsPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">利用規約</h1>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-6">
          <section>
            <h2 className="text-xl font-semibold mb-3">第1条（適用）</h2>
            <p className="text-gray-700 dark:text-gray-300">
              本規約は、LastMinuteStay（以下「当社」といいます）が提供するホテル予約サービス（以下「本サービス」といいます）の利用条件を定めるものです。登録ユーザーの皆様（以下「ユーザー」といいます）には、本規約に従って本サービスをご利用いただきます。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">第2条（利用登録）</h2>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 dark:text-gray-300">
              <li>登録希望者が当社の定める方法によって利用登録を申請し、当社がこれを承認することによって、利用登録が完了するものとします。</li>
              <li>当社は、利用登録の申請者に以下の事由があると判断した場合、利用登録の申請を承認しないことがあります。
                <ul className="list-circle pl-6 mt-2 space-y-1">
                  <li>虚偽の事項を届け出た場合</li>
                  <li>本規約に違反したことがある者からの申請である場合</li>
                  <li>その他、当社が利用登録を相当でないと判断した場合</li>
                </ul>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">第3条（ユーザーIDおよびパスワードの管理）</h2>
            <p className="text-gray-700 dark:text-gray-300">
              ユーザーは、自己の責任において、本サービスのユーザーIDおよびパスワードを管理するものとします。ユーザーは、いかなる場合にも、ユーザーIDおよびパスワードを第三者に譲渡または貸与することはできません。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">第4条（予約・キャンセル）</h2>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 dark:text-gray-300">
              <li>ユーザーは本サービスを通じてホテルの予約を行うことができます。</li>
              <li>予約の成立は、ユーザーが予約手続きを完了し、当社から予約確認通知を受信した時点とします。</li>
              <li>キャンセルについては、各ホテルのキャンセルポリシーに従うものとします。</li>
              <li>キャンセル料が発生する場合、ユーザーは当該キャンセル料を負担するものとします。</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">第5条（料金および支払い）</h2>
            <p className="text-gray-700 dark:text-gray-300">
              ユーザーは、本サービスの利用に対し、当社が定める料金を支払うものとします。支払い方法は、クレジットカード決済または現地払いとし、詳細は予約時に選択できます。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">第6条（禁止事項）</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-2">
              ユーザーは、本サービスの利用にあたり、以下の行為をしてはなりません。
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 dark:text-gray-300">
              <li>法令または公序良俗に違反する行為</li>
              <li>犯罪行為に関連する行為</li>
              <li>当社のサーバーまたはネットワークの機能を破壊したり、妨害したりする行為</li>
              <li>当社のサービスの運営を妨害するおそれのある行為</li>
              <li>他のユーザーに関する個人情報等を収集または蓄積する行為</li>
              <li>他のユーザーに成りすます行為</li>
              <li>当社のサービスに関連して、反社会的勢力に対して直接または間接に利益を供与する行為</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">第7条（本サービスの提供の停止等）</h2>
            <p className="text-gray-700 dark:text-gray-300">
              当社は、以下のいずれかの事由があると判断した場合、ユーザーに事前に通知することなく本サービスの全部または一部の提供を停止または中断することができるものとします。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">第8条（免責事項）</h2>
            <p className="text-gray-700 dark:text-gray-300">
              当社は、本サービスに関して、ユーザーと他のユーザーまたは第三者との間において生じた取引、連絡または紛争等について一切責任を負いません。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">第9条（サービス内容の変更等）</h2>
            <p className="text-gray-700 dark:text-gray-300">
              当社は、ユーザーに通知することなく、本サービスの内容を変更しまたは本サービスの提供を中止することができるものとし、これによってユーザーに生じた損害について一切の責任を負いません。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">第10条（利用規約の変更）</h2>
            <p className="text-gray-700 dark:text-gray-300">
              当社は、必要と判断した場合には、ユーザーに通知することなくいつでも本規約を変更することができるものとします。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">第11条（準拠法・裁判管轄）</h2>
            <p className="text-gray-700 dark:text-gray-300">
              本規約の解釈にあたっては、日本法を準拠法とします。本サービスに関して紛争が生じた場合には、当社の本店所在地を管轄する裁判所を専属的合意管轄とします。
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

export default TermsPage;