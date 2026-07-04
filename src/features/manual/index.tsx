/**
 * 利用マニュアル画面(screen-design/12-manual.md)。
 * store を一切参照しない静的コンテンツページ。アプリの目的・基本操作の流れ・
 * ステータスの見方・期限計算式・各画面の説明・バックアップ方法・ライセンスを1画面にまとめ、
 * 他画面への導線は react-router-dom の `Link` + `ROUTES` 定数経由で提供する。
 */

import { StatusBadge } from "@/components/domain";
import { ROUTES } from "@/constants/routes";
import { INSPECTION_ITEM_STATUS, type InspectionItemStatus } from "@/domain/inspectionItemStatus";
import type { ReactElement } from "react";
import { Link } from "react-router-dom";

/** ステータスの意味を平易な日本語で言い換えたもの(domain-model.md §4.3 の条件に対応) */
const STATUS_DESCRIPTIONS = {
  [INSPECTION_ITEM_STATUS.OVERDUE]: "次回期限を過ぎています",
  [INSPECTION_ITEM_STATUS.ORDER_NOW]:
    "外部点検校正の発注推奨日を過ぎていて、まだ進行中の点検校正外部案件がありません",
  [INSPECTION_ITEM_STATUS.IN_PROGRESS]: "外部点検校正で発注済み・校正中の案件があります",
  [INSPECTION_ITEM_STATUS.DUE_SOON]: "次回期限が近づいています(通知開始日数に到達)",
  [INSPECTION_ITEM_STATUS.OK]: "上記のいずれにも当てはまりません",
} as const satisfies Record<InspectionItemStatus, string>;

export const Manual = (): ReactElement => (
  <div className="flex flex-col gap-4">
    <h1 className="text-xl font-bold">利用マニュアル</h1>

    <section className="flex flex-col gap-3 rounded border border-slate-200 p-4">
      <h2 className="border-b border-slate-200 pb-2 text-lg font-semibold">ご利用にあたって</h2>
      <p>このアプリは、機器の点検・校正の期限をまとめて管理するツールです。</p>
      <p>
        データはすべてお使いのブラウザー内(LocalStorage)に保存されます。外部のサーバーには
        送信されないため、インターネット接続がなくても利用できます。一方で、データは端末・
        ブラウザーごとに独立しており、別の環境から同じデータを見ることはできません。
      </p>
      <p>
        端末の故障やブラウザーデータの消去でデータが失われる可能性があるため、
        <Link to={ROUTES.SETTINGS} className="text-primary mx-1 underline">
          設定画面
        </Link>
        から定期的にCSVエクスポートでバックアップを取ることをおすすめします。
      </p>
    </section>

    <section className="flex flex-col gap-3 rounded border border-slate-200 p-4">
      <h2 className="border-b border-slate-200 pb-2 text-lg font-semibold">基本の流れ</h2>
      <ol className="flex list-decimal flex-col gap-2 pl-5">
        <li>
          はじめに、機器の登録で使う基本情報(
          <Link to={ROUTES.VENDOR_LIST} className="text-primary underline">
            メーカー/取引先
          </Link>
          ・
          <Link to={ROUTES.PERSON_LIST} className="text-primary underline">
            担当者
          </Link>
          )を追加します。
        </li>
        <li>
          <Link to={ROUTES.EQUIPMENT_CREATE} className="text-primary underline">
            機器を追加
          </Link>
          します。
        </li>
        <li>
          機器に点検校正項目(周期・内外区分など)を追加します。入力画面(モーダル)は、
          <Link to={ROUTES.EQUIPMENT_LIST} className="text-primary underline">
            機器一覧
          </Link>
          から対象機器の詳細を開くと表示されます。
        </li>
        <li>
          点検・校正を実施したら、
          <Link to={ROUTES.INSPECTION_ITEM_LIST} className="text-primary underline">
            点検校正項目一覧
          </Link>
          から実施記録を登録します。記録を登録すると、次回期限が自動で更新されます。
        </li>
        <li>
          外部の点検・校正が必要な項目は、
          <Link to={ROUTES.INSPECTION_ITEM_LIST} className="text-primary underline">
            点検校正項目一覧
          </Link>
          の各行にある「案件」ボタンから案件を作成します(「案件」ボタンは外部の点検・校正の項目で、
          まだ進行中の案件がないときに表示されます)。
        </li>
        <li>
          作成した案件は
          <Link to={ROUTES.ORDER_LIST} className="text-primary underline">
            点検校正外部案件
          </Link>
          画面のボードに表示され、発注から返却・記録の登録までの進み具合を管理できます。
        </li>
      </ol>
    </section>

    <section className="flex flex-col gap-3 rounded border border-slate-200 p-4">
      <h2 className="border-b border-slate-200 pb-2 text-lg font-semibold">ステータスの見方</h2>
      <ul className="flex flex-col gap-2">
        {Object.values(INSPECTION_ITEM_STATUS).map((status) => (
          <li key={status} className="flex items-center gap-2">
            <StatusBadge status={status} />
            <span>{STATUS_DESCRIPTIONS[status]}</span>
          </li>
        ))}
      </ul>
    </section>

    <section className="flex flex-col gap-3 rounded border border-slate-200 p-4">
      <h2 className="border-b border-slate-200 pb-2 text-lg font-semibold">
        期限と発注推奨日の計算
      </h2>
      <h3 className="border-primary border-l-4 pl-2 font-semibold">次回期限</h3>
      <p>
        次回期限は「前回実施日 + 周期」で自動計算されます。項目を登録した直後はまだ実施記録が
        ないため、初回の次回期限だけは手で入力します。以降は実施記録を登録するたびに、その実施日を
        起点に自動で更新されます。
      </p>
      <p>
        ただし、結果が「不合格」の記録では次回期限は更新されません。合格するまで期限は据え置かれ、
        要対応の状態として扱われます。
      </p>
      <p>
        月単位・年単位の周期は暦の月で計算します。加算した先の月に同じ日付が存在しない場合は、
        その月の末日になります(例: 1/31 の1か月後は 2/28、うるう年なら 2/29)。
      </p>

      <h3 className="border-primary border-l-4 pl-2 font-semibold">
        発注推奨日(外部の点検・校正のみ)
      </h3>
      <p>
        外部の点検・校正の項目には、期限に間に合うようにいつまでに発注すべきかの目安として発注推奨日が
        あり、「次回期限 − 納期(リードタイム) − 発注余裕日数」で計算されます。
      </p>
      <p>
        納期は、項目ごとに個別の設定があればそれを、なければ依頼先(メーカー/取引先)の標準納期を
        使います。どちらも設定されていない場合は発注推奨日を計算できないため、「要発注」の判定や
        発注をうながす通知は行われません。
      </p>
      <p>
        発注余裕日数は、発注してから業者に機器を引き渡すまでの社内手続きなどを見込んだ余裕分で、
        項目ごとに設定できます(はじめは14日)。
      </p>
      <p>
        例: 次回期限が 9/30、納期が30日、発注余裕日数が14日の場合、発注推奨日は 9/30
        から44日さかのぼった 8/17 になります。この日を過ぎても発注していない項目が「要発注」として
        表示されます。
      </p>
    </section>

    <section className="flex flex-col gap-3 rounded border border-slate-200 p-4">
      <h2 className="border-b border-slate-200 pb-2 text-lg font-semibold">各画面の説明</h2>

      <div>
        <h3 className="font-semibold">
          <Link to={ROUTES.DASHBOARD} className="text-primary underline">
            ダッシュボード
          </Link>
        </h3>
        <p>対応が必要な項目の全体像をひと目で確認し、そこから各項目へすぐに移動できる画面です。</p>
      </div>

      <div>
        <h3 className="font-semibold">
          <Link to={ROUTES.EQUIPMENT_LIST} className="text-primary underline">
            機器一覧・機器詳細
          </Link>
        </h3>
        <p>
          登録した機器の一覧表示と検索ができます。機器詳細では、1台の機器の基本情報・点検校正項目・
          実施記録をまとめて確認でき、項目の管理や記録の登録もここから行います。
        </p>
      </div>

      <div>
        <h3 className="font-semibold">
          <Link to={ROUTES.INSPECTION_ITEM_LIST} className="text-primary underline">
            点検校正項目一覧
          </Link>
        </h3>
        <p>
          全機器の点検校正項目を期限が近い順に確認できます。絞り込みや各行の操作で日々の点検・校正
          業務を進める、中心となる画面です。
        </p>
      </div>

      <div>
        <h3 className="font-semibold">
          <Link to={ROUTES.ORDER_LIST} className="text-primary underline">
            点検校正外部案件
          </Link>
        </h3>
        <p>
          外部点検校正の発注から返却・記録までの進み具合を、状態ごとのボード(かんばん)で管理します。
        </p>
      </div>

      <div>
        <h3 className="font-semibold">
          <Link to={ROUTES.VENDOR_LIST} className="text-primary underline">
            メーカー/取引先
          </Link>
        </h3>
        <p>機器のメーカーや、校正の依頼先となる取引先を追加・編集します。</p>
      </div>

      <div>
        <h3 className="font-semibold">
          <Link to={ROUTES.PERSON_LIST} className="text-primary underline">
            担当者
          </Link>
        </h3>
        <p>担当者を追加・編集します。使わなくなった担当者は無効化できます。</p>
      </div>

      <div>
        <h3 className="font-semibold">
          <Link to={ROUTES.NOTIFICATION_LIST} className="text-primary underline">
            通知
          </Link>
        </h3>
        <p>アプリ内の通知を確認し、既読にできます。</p>
      </div>

      <div>
        <h3 className="font-semibold">
          <Link to={ROUTES.SETTINGS} className="text-primary underline">
            設定
          </Link>
        </h3>
        <p>
          アプリのインストール(PWA)、CSVでのデータのバックアップ(エクスポート)と復元(インポート)、
          データの全削除を行います。
        </p>
      </div>
    </section>

    <section className="flex flex-col gap-3 rounded border border-slate-200 p-4">
      <h2 className="border-b border-slate-200 pb-2 text-lg font-semibold">バックアップと復元</h2>
      <p>
        <Link to={ROUTES.SETTINGS} className="text-primary underline">
          設定画面
        </Link>
        から、データの種類ごとにCSVファイルとしてエクスポートできます(UTF-8
        BOM付きで、Excelでもそのまま開けます)。同じ画面からCSVインポートによる復元もできます。
      </p>
      <p>
        端末の変更やブラウザーデータの消去でデータが失われる場合に備え、定期的にエクスポートして
        おくことをおすすめします。
      </p>
    </section>

    <section className="flex flex-col gap-3 rounded border border-slate-200 p-4">
      <h2 className="border-b border-slate-200 pb-2 text-lg font-semibold">
        ライセンスとソースコード
      </h2>
      <p>
        このアプリはMITライセンスで公開されているオープンソースソフトウェアです。ソースコードは
        <a
          href="https://github.com/KyoheiTashiro/calibration-manager"
          target="_blank"
          rel="noreferrer"
          className="text-primary mx-1 underline"
        >
          GitHubリポジトリ
        </a>
        で公開しています。
      </p>
      <p>
        ログイン機能やアカウントごとの権限管理、データベースサーバーを用意して複数人で同じデータを
        共有するといった拡張は、このアプリでは提供していません。必要な場合は、MITライセンスの
        範囲でソースコードを自由に改変・拡張してご利用ください。
      </p>
    </section>
  </div>
);
