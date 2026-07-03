/**
 * 利用マニュアル画面(screen-design/12-manual.md)。
 * store を一切参照しない静的コンテンツページ。アプリの目的・基本操作の流れ・
 * ステータスの見方・期限計算式・各画面の説明・バックアップ方法を1画面にまとめ、
 * 他画面への導線は react-router-dom の `Link` + `ROUTES` 定数経由で提供する。
 */

import { StatusBadge } from "@/components/domain";
import { ROUTES } from "@/constants/routes";
import { INSPECTION_ITEM_STATUS, type InspectionItemStatus } from "@/domain/inspectionItemStatus";
import type { ReactElement } from "react";
import { Link } from "react-router-dom";

/** ステータスの意味を平易な日本語で言い換えたもの(domain-model.md §4.3 の条件に対応) */
const STATUS_DESCRIPTIONS = {
  [INSPECTION_ITEM_STATUS.OVERDUE]: "今日が次回期限を過ぎている",
  [INSPECTION_ITEM_STATUS.ORDER_NOW]: "外部校正で発注推奨日を過ぎており、進行中の案件がない",
  [INSPECTION_ITEM_STATUS.IN_PROGRESS]: "外部校正で発注済み・校正中の案件がある",
  [INSPECTION_ITEM_STATUS.DUE_SOON]: "次回期限が近づいている(通知開始日数に到達)",
  [INSPECTION_ITEM_STATUS.OK]: "上記のいずれにも該当しない",
} as const satisfies Record<InspectionItemStatus, string>;

export const Manual = (): ReactElement => (
  <div className="flex flex-col gap-8">
    <h1 className="text-xl font-bold">利用マニュアル</h1>

    <section className="flex flex-col gap-2">
      <h2 className="text-lg font-semibold">このアプリについて</h2>
      <p>
        このアプリは、計測機器の点検・校正期限を一元管理するためのツールです。データはこの
        ブラウザの LocalStorage に保存され、サーバへは送信されません。そのため、ブラウザや
        端末が変わるとデータは引き継がれず、端末・ブラウザごとに独立したデータになります。
      </p>
      <p>
        端末の故障やブラウザデータの消去に備え、
        {/* oxlint-disable-next-line react/forbid-component-props -- Linkはclassnameでリンク色を渡す設計(Badgeと同様) */}
        <Link to={ROUTES.SETTINGS} className="text-primary mx-1 underline">
          設定画面
        </Link>
        から定期的にデータをバックアップ(CSVエクスポート)することを推奨します。
      </p>
    </section>

    <section className="flex flex-col gap-2">
      <h2 className="text-lg font-semibold">基本の流れ</h2>
      <ol className="flex list-decimal flex-col gap-2 pl-5">
        <li>
          マスタ(
          {/* oxlint-disable-next-line react/forbid-component-props -- Linkはclassnameでリンク色を渡す設計(Badgeと同様) */}
          <Link to={ROUTES.VENDOR_LIST} className="text-primary underline">
            メーカー・取引先
          </Link>
          ・
          {/* oxlint-disable-next-line react/forbid-component-props -- Linkはclassnameでリンク色を渡す設計(Badgeと同様) */}
          <Link to={ROUTES.PERSON_LIST} className="text-primary underline">
            担当者
          </Link>
          )を登録します。
        </li>
        <li>
          {/* oxlint-disable-next-line react/forbid-component-props -- Linkはclassnameでリンク色を渡す設計(Badgeと同様) */}
          <Link to={ROUTES.EQUIPMENT_NEW} className="text-primary underline">
            機器を登録
          </Link>
          します。
        </li>
        <li>
          機器に点検校正項目(周期・内外区分など)を登録します。項目の登録・編集はモーダルで
          行うため専用のページはなく、
          {/* oxlint-disable-next-line react/forbid-component-props -- Linkはclassnameでリンク色を渡す設計(Badgeと同様) */}
          <Link to={ROUTES.EQUIPMENT_LIST} className="text-primary underline">
            機器一覧
          </Link>
          から対象機器の詳細を開いて起動します。
        </li>
        <li>
          点検・校正を実施したら、
          {/* oxlint-disable-next-line react/forbid-component-props -- Linkはclassnameでリンク色を渡す設計(Badgeと同様) */}
          <Link to={ROUTES.INSPECTION_ITEM_LIST} className="text-primary underline">
            項目一覧
          </Link>
          から実施記録を登録します(こちらもモーダルで行い、登録すると次回期限が自動更新されます)。
        </li>
        <li>
          外部校正が必要な項目は、
          {/* oxlint-disable-next-line react/forbid-component-props -- Linkはclassnameでリンク色を渡す設計(Badgeと同様) */}
          <Link to={ROUTES.ORDER_LIST} className="text-primary underline">
            校正案件
          </Link>
          画面で発注から返却・記録登録までの進捗を管理します。
        </li>
      </ol>
    </section>

    <section className="flex flex-col gap-2">
      <h2 className="text-lg font-semibold">ステータスの見方</h2>
      <ul className="flex flex-col gap-2">
        {Object.values(INSPECTION_ITEM_STATUS).map((status) => (
          <li key={status} className="flex items-center gap-2">
            <StatusBadge status={status} />
            <span>{STATUS_DESCRIPTIONS[status]}</span>
          </li>
        ))}
      </ul>
    </section>

    <section className="flex flex-col gap-2">
      <h2 className="text-lg font-semibold">期限と発注推奨日の計算</h2>
      <p>次回期限 = 前回実施日 + 周期。</p>
      <p>
        月単位の周期を加算する場合は暦月ベースで計算します(例: 1/31 に1か月を加えると 2/28
        になります)。
      </p>
      <p>発注推奨日(外部校正の項目のみ) = 次回期限 − 納期(リードタイム) − 発注余裕日数。</p>
      <p>納期は項目ごとの個別設定値がなければ、依頼先(メーカー・取引先)の標準納期を使用します。</p>
    </section>

    <section className="flex flex-col gap-2">
      <h2 className="text-lg font-semibold">各画面の説明</h2>

      <div>
        <h3 className="font-semibold">
          {/* oxlint-disable-next-line react/forbid-component-props -- Linkはclassnameでリンク色を渡す設計(Badgeと同様) */}
          <Link to={ROUTES.DASHBOARD} className="text-primary underline">
            ダッシュボード
          </Link>
        </h3>
        <p>要対応の全体像を一目で把握し、対応が必要な項目へ最短で到達するための画面です。</p>
      </div>

      <div>
        <h3 className="font-semibold">
          {/* oxlint-disable-next-line react/forbid-component-props -- Linkはclassnameでリンク色を渡す設計(Badgeと同様) */}
          <Link to={ROUTES.EQUIPMENT_LIST} className="text-primary underline">
            機器一覧・機器詳細
          </Link>
        </h3>
        <p>
          登録機器を一覧・検索できます。機器詳細では1機器の基本情報・点検校正項目・実施履歴を
          集約表示し、項目管理と記録登録の起点になります。
        </p>
      </div>

      <div>
        <h3 className="font-semibold">
          {/* oxlint-disable-next-line react/forbid-component-props -- Linkはclassnameでリンク色を渡す設計(Badgeと同様) */}
          <Link to={ROUTES.INSPECTION_ITEM_LIST} className="text-primary underline">
            項目一覧
          </Link>
        </h3>
        <p>
          全機器の点検校正項目を期限順で俯瞰できます。フィルタと行アクションで日々の運用を
          回す中核画面です。
        </p>
      </div>

      <div>
        <h3 className="font-semibold">
          {/* oxlint-disable-next-line react/forbid-component-props -- Linkはclassnameでリンク色を渡す設計(Badgeと同様) */}
          <Link to={ROUTES.ORDER_LIST} className="text-primary underline">
            校正案件
          </Link>
        </h3>
        <p>外部校正の発注〜返却〜記録までの進捗を、状態別のかんばんで管理します。</p>
      </div>

      <div>
        <h3 className="font-semibold">
          {/* oxlint-disable-next-line react/forbid-component-props -- Linkはclassnameでリンク色を渡す設計(Badgeと同様) */}
          <Link to={ROUTES.VENDOR_LIST} className="text-primary underline">
            メーカー・取引先
          </Link>
        </h3>
        <p>校正業者を兼ねるメーカー・取引先の登録・編集を行います。</p>
      </div>

      <div>
        <h3 className="font-semibold">
          {/* oxlint-disable-next-line react/forbid-component-props -- Linkはclassnameでリンク色を渡す設計(Badgeと同様) */}
          <Link to={ROUTES.PERSON_LIST} className="text-primary underline">
            担当者
          </Link>
        </h3>
        <p>担当者の登録・編集・無効化を行います。</p>
      </div>

      <div>
        <h3 className="font-semibold">
          {/* oxlint-disable-next-line react/forbid-component-props -- Linkはclassnameでリンク色を渡す設計(Badgeと同様) */}
          <Link to={ROUTES.NOTIFICATION_LIST} className="text-primary underline">
            通知
          </Link>
        </h3>
        <p>アプリ内通知の閲覧・既読管理を行います。</p>
      </div>

      <div>
        <h3 className="font-semibold">
          {/* oxlint-disable-next-line react/forbid-component-props -- Linkはclassnameでリンク色を渡す設計(Badgeと同様) */}
          <Link to={ROUTES.SETTINGS} className="text-primary underline">
            設定
          </Link>
        </h3>
        <p>CSVによるデータのエクスポート/インポート、データ全削除を行います。</p>
      </div>
    </section>

    <section className="flex flex-col gap-2">
      <h2 className="text-lg font-semibold">バックアップと復元</h2>
      <p>
        {/* oxlint-disable-next-line react/forbid-component-props -- Linkはclassnameでリンク色を渡す設計(Badgeと同様) */}
        <Link to={ROUTES.SETTINGS} className="text-primary underline">
          設定画面
        </Link>
        からエンティティごとにCSVエクスポート(UTF-8 BOM付き、Excel互換)ができます。同じ画面から
        CSVインポートによる復元も可能です。
      </p>
      <p>端末変更やブラウザのデータ消去に備え、定期的にエクスポートしておくことを推奨します。</p>
    </section>
  </div>
);
