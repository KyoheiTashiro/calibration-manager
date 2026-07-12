/* oxlint-disable eslint/max-lines -- 利用マニュアルは静的な文章の集合で、行数上限による機械分割は文章の見通しを損なうため(D-054) */
import { StatusBadge } from "@/components/domain";
import { ROUTES } from "@/constants/routes";
import { SERVICE_ITEM_STATUS, type ServiceItemStatus } from "@/domain/serviceItemStatus";
import type { ReactElement } from "react";
import { Link } from "react-router-dom";

import { ManualSection } from "./components/ManualSection";

const STATUS_DESCRIPTIONS = {
  [SERVICE_ITEM_STATUS.OVERDUE]: "次回期限を過ぎています",
  [SERVICE_ITEM_STATUS.ORDER_NOW]:
    "外部点検校正の発注推奨日を過ぎていて、まだ進行中の点検校正外部案件がありません",
  [SERVICE_ITEM_STATUS.IN_PROGRESS]: "外部点検校正で発注済み・校正中の案件があります",
  [SERVICE_ITEM_STATUS.DUE_SOON]: "次回期限が近づいています(通知開始日数に到達)",
  [SERVICE_ITEM_STATUS.OK]: "上記のいずれにも当てはまりません",
} as const satisfies Record<ServiceItemStatus, string>;

const SCREEN_GUIDES = [
  {
    route: ROUTES.DASHBOARD,
    title: "ダッシュボード",
    description:
      "対応が必要な項目の全体像をひと目で確認し、そこから各項目へすぐに移動できる画面です。",
  },
  {
    route: ROUTES.EQUIPMENT_LIST,
    title: "機器一覧・機器詳細",
    description:
      "登録した機器の一覧表示と検索ができます。機器詳細では、1台の機器の基本情報・点検校正項目・実施記録をまとめて確認でき、項目の管理や記録の登録もここから行います。",
  },
  {
    route: ROUTES.SERVICE_ITEM_LIST,
    title: "点検校正項目一覧",
    description:
      "全機器の点検校正項目を期限が近い順に確認できます。絞り込みや各行の操作で日々の点検・校正業務を進める、中心となる画面です。",
  },
  {
    route: ROUTES.SERVICE_ORDER_LIST,
    title: "点検校正外部案件",
    description:
      "外部点検校正の発注から返却・記録までの進み具合を、状態ごとのボード(かんばん)で管理します。",
  },
  {
    route: ROUTES.VENDOR_LIST,
    title: "メーカー/取引先",
    description: "機器のメーカーや、校正の依頼先となる取引先を追加・編集します。",
  },
  {
    route: ROUTES.PERSON_LIST,
    title: "担当者",
    description: "担当者を追加・編集します。",
  },
  {
    route: ROUTES.NOTIFICATION_LIST,
    title: "通知",
    description: "アプリ内の通知を確認し、既読にできます。",
  },
  {
    route: ROUTES.SETTINGS,
    title: "設定",
    description:
      "アプリのインストール(PWA)、CSVでのデータのバックアップ(エクスポート)と復元(インポート)、データの全削除を行います。",
  },
] as const;

export const Manual = (): ReactElement => (
  <div className="flex flex-col gap-4">
    <h1 className="text-xl font-bold">利用マニュアル</h1>

    <ManualSection title="ご利用にあたって">
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
    </ManualSection>

    <ManualSection title="基本の流れ">
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
          <Link to={ROUTES.SERVICE_ITEM_LIST} className="text-primary underline">
            点検校正項目一覧
          </Link>
          から実施記録を登録します。記録を登録すると、次回期限が自動で更新されます。
        </li>
        <li>
          外部の点検・校正が必要な項目は、
          <Link to={ROUTES.SERVICE_ITEM_LIST} className="text-primary underline">
            点検校正項目一覧
          </Link>
          の各行にある「案件」ボタンから案件を作成します(「案件」ボタンは外部の点検・校正の項目で、
          まだ進行中の案件がないときに表示されます)。
        </li>
        <li>
          作成した案件は
          <Link to={ROUTES.SERVICE_ORDER_LIST} className="text-primary underline">
            点検校正外部案件
          </Link>
          画面のボードに表示され、発注から返却・記録の登録までの進み具合を管理できます。
        </li>
      </ol>
    </ManualSection>

    <ManualSection title="ステータスの見方">
      <ul className="flex flex-col gap-2">
        {Object.values(SERVICE_ITEM_STATUS).map((status) => (
          <li key={status} className="flex items-center gap-2">
            <StatusBadge status={status} />
            <span>{STATUS_DESCRIPTIONS[status]}</span>
          </li>
        ))}
      </ul>
    </ManualSection>

    <ManualSection title="期限と発注推奨日の計算">
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
    </ManualSection>

    <ManualSection title="各画面の説明">
      {SCREEN_GUIDES.map((guide) => (
        <div key={guide.route}>
          <h3 className="font-semibold">
            <Link to={guide.route} className="text-primary underline">
              {guide.title}
            </Link>
          </h3>
          <p>{guide.description}</p>
        </div>
      ))}
    </ManualSection>

    <ManualSection title="バックアップと復元">
      <p>
        <Link to={ROUTES.SETTINGS} className="text-primary underline">
          設定画面
        </Link>
        から、CSVファイルによるデータのバックアップ(エクスポート)と復元(インポート)ができます。
        端末の変更やブラウザーデータの消去でデータが失われる場合に備え、定期的にエクスポートして
        おくことをおすすめします。
      </p>

      <h3 className="border-primary border-l-4 pl-2 font-semibold">CSVエクスポート</h3>
      <p>
        データの種類(機器・点検校正項目・実施記録・点検校正外部案件・メーカー/取引先・担当者・
        通知)ごとに、1つのCSVファイルをダウンロードできます。ファイルはUTF-8(BOM付き)で、
        Excelでもそのまま開けます。ファイル名は「equipment_2025-01-31.csv」のように、
        種類と出力日の組み合わせになります。データが1件もない種類でも、列名だけのCSVを出力できます。
      </p>
      <p>
        エクスポートしたCSVは、そのまま同じ種類のインポートで復元できます。1行目は列名の行
        (英語の項目名)で、インポート時に種類の照合に使われるため変更しないでください。
      </p>

      <h3 className="border-primary border-l-4 pl-2 font-semibold">CSVインポート(復元)の手順</h3>
      <ol className="flex list-decimal flex-col gap-2 pl-5">
        <li>
          <Link to={ROUTES.SETTINGS} className="text-primary underline">
            設定画面
          </Link>
          の「CSVインポート」で、対象となるデータの種類を選択します。
        </li>
        <li>
          CSVファイルを選択すると内容が自動でチェックされ、取り込み可能な行数と、エラー・警告が
          行番号付きでプレビューに表示されます。
        </li>
        <li>
          エラーが1件でもあると「確定」ボタンは押せません。エラーの行だけを除いて取り込む機能は
          ないため、CSVファイルを修正してから選び直してください。
        </li>
        <li>
          エラーがなければ「確定」を押し、確認ダイアログで取り込みを実行します。選択した種類の
          既存データは、CSVの内容でまるごと置き換えられます(追記や部分的な更新ではありません)。
        </li>
      </ol>

      <h3 className="border-primary border-l-4 pl-2 font-semibold">
        インポート時にチェックされる内容
      </h3>
      <ul className="flex list-disc flex-col gap-2 pl-5">
        <li>1行目の列名が、選択した種類のものと一致しているか(別の種類のCSVの取り違え防止)</li>
        <li>各行の列数が正しいか</li>
        <li>
          各セルの値の形式(必須項目が空でないか、日付は YYYY-MM-DD 形式か、数値・true/false・
          選択肢として正しい値か)
        </li>
        <li>ファイル内での重複(id の重複。機器は管理番号の重複も)</li>
        <li>
          参照先の存在(例: 機器のメーカーが、現在登録されているメーカー/取引先にあるか)
        </li>
      </ul>
      <p>
        このほか、「=」などで始まりExcel等で数式として解釈されるおそれのある値は、警告として
        表示されます。警告は取り込みを妨げませんが、心当たりのない値の場合は取り込む前に内容を
        確認してください。
      </p>

      <h3 className="border-primary border-l-4 pl-2 font-semibold">複数の種類を復元する順番</h3>
      <p>
        参照先の存在チェックは「現在登録されているデータ」に対して行われるため、複数の種類を
        まとめて復元するときは、参照される側から次の順にインポートしてください。
      </p>
      <p>
        メーカー/取引先・担当者 → 機器 → 点検校正項目 → 点検校正外部案件 → 実施記録 → 通知
      </p>

      <p>
        出所の分からないCSVファイルはインポートしないでください。また、エクスポートしたCSVを
        Excel等の表計算ソフトで開いた際に数式の実行を確認する警告が表示された場合は、
        内容を確認するまで許可しないでください。
      </p>
    </ManualSection>

    <ManualSection title="ライセンスとソースコード">
      <p>
        このアプリはオープンソースソフトウェアです。ソースコードはMITライセンスのもと、
        <a
          href="https://github.com/KyoheiTashiro/calibration-manager"
          target="_blank"
          rel="noreferrer"
          className="text-primary mx-1 underline"
        >
          GitHubリポジトリ
        </a>
        で公開されています。
      </p>
      <p>
        業務に合わせて機能を追加したい場合は、
        <a
          href="https://github.com/KyoheiTashiro/calibration-manager/blob/main/LICENSE.ja.md"
          target="_blank"
          rel="noreferrer"
          className="text-primary mx-1 underline"
        >
          ライセンスの条件
        </a>
        に従い、ソースコードを自由に改変・拡張してご利用いただけます。
      </p>
    </ManualSection>
  </div>
);
