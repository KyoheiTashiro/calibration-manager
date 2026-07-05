import { Table, TableBody, TableHead, Td, Th } from "@/components/ui/Table";
import { render, screen } from "@testing-library/react";
// なぜ: tsc -b はプロジェクト参照ごとに独立したプログラムのため、vitest.setup.ts
// （tsconfig.node.json側）の副作用importだけではtsconfig.app.json側の型解決に
// jest-domのmatcher拡張が伝播しない。テストファイル側でも明示的にimportし型を解決する
// （coding-standards.md §6・.oxlintrc.jsonのallowリストで明示的に許容されているパターン）。
import "@testing-library/jest-dom/vitest";
import { describe, expect, it } from "vitest";

describe("Table", () => {
  it("overflow-x-auto のコンテナで table を包む", () => {
    render(
      <Table>
        <TableHead>
          <tr>
            <th>管理番号</th>
          </tr>
        </TableHead>
        <TableBody>
          <tr>
            <td>EQ-001</td>
          </tr>
        </TableBody>
      </Table>,
    );

    const table = screen.getByRole("table");
    const container = table.parentElement;
    expect(container).not.toBeNull();
    expect(container?.className).toContain("overflow-x-auto");
  });

  it("table 要素に w-full border-collapse text-sm クラスが付与される", () => {
    render(
      <Table>
        <TableHead>
          <tr>
            <th>管理番号</th>
          </tr>
        </TableHead>
        <TableBody>
          <tr>
            <td>EQ-001</td>
          </tr>
        </TableBody>
      </Table>,
    );

    const table = screen.getByRole("table");
    expect(table.className).toContain("w-full");
    expect(table.className).toContain("border-collapse");
    expect(table.className).toContain("text-sm");
  });

  it("className を渡すと table 要素に追加される", () => {
    render(
      <Table className="min-w-max">
        <TableHead>
          <tr>
            <th>管理番号</th>
          </tr>
        </TableHead>
        <TableBody>
          <tr>
            <td>EQ-001</td>
          </tr>
        </TableBody>
      </Table>,
    );

    const table = screen.getByRole("table");
    expect(table.className).toContain("min-w-max");
  });

  it("children（行・セル）が正しくレンダーされる", () => {
    render(
      <Table>
        <TableHead>
          <tr>
            <th>管理番号</th>
          </tr>
        </TableHead>
        <TableBody>
          <tr>
            <td>EQ-001</td>
          </tr>
        </TableBody>
      </Table>,
    );

    expect(screen.getByText("管理番号")).toBeInTheDocument();
    expect(screen.getByText("EQ-001")).toBeInTheDocument();
  });
});

describe("TableHead", () => {
  it("bg-slate-50 系のヘッダー用クラスが付与される", () => {
    render(
      <table>
        <TableHead>
          <tr>
            <th>管理番号</th>
          </tr>
        </TableHead>
      </table>,
    );

    const columnHeader = screen.getByRole("columnheader", { name: "管理番号" });
    const headElement = columnHeader.closest("thead");
    expect(headElement).not.toBeNull();
    expect(headElement?.className).toContain("bg-slate-50");
    expect(headElement?.className).toContain("text-xs");
    expect(headElement?.className).toContain("font-medium");
    expect(headElement?.className).toContain("text-slate-600");
  });
});

describe("TableBody", () => {
  it("divide-y divide-slate-200 の罫線用クラスが付与される", () => {
    render(
      <table>
        <TableBody>
          <tr>
            <td>EQ-001</td>
          </tr>
        </TableBody>
      </table>,
    );

    const cell = screen.getByText("EQ-001");
    const bodyElement = cell.closest("tbody");
    expect(bodyElement).not.toBeNull();
    expect(bodyElement?.className).toContain("divide-y");
    expect(bodyElement?.className).toContain("divide-slate-200");
  });
});

describe("Th", () => {
  it("scope=col と左寄せ用クラスが付与される（デフォルト）", () => {
    render(
      <table>
        <thead>
          <tr>
            <Th>管理番号</Th>
          </tr>
        </thead>
      </table>,
    );

    const columnHeader = screen.getByRole("columnheader", { name: "管理番号" });
    expect(columnHeader).toHaveAttribute("scope", "col");
    expect(columnHeader.className).toContain("px-3");
    expect(columnHeader.className).toContain("py-2");
    expect(columnHeader.className).toContain("text-left");
  });

  it("align='right' を渡すと text-right クラスが付与される", () => {
    render(
      <table>
        <thead>
          <tr>
            <Th align="right">標準納期</Th>
          </tr>
        </thead>
      </table>,
    );

    const columnHeader = screen.getByRole("columnheader", { name: "標準納期" });
    expect(columnHeader.className).toContain("text-right");
    expect(columnHeader.className).not.toContain("text-left");
  });
});

describe("Td", () => {
  it("px-3 py-2 クラスが付与される", () => {
    render(
      <table>
        <tbody>
          <tr>
            <Td>EQ-001</Td>
          </tr>
        </tbody>
      </table>,
    );

    const cell = screen.getByText("EQ-001");
    expect(cell.className).toContain("px-3");
    expect(cell.className).toContain("py-2");
  });

  it("className を渡すと px-3 py-2 に追加でマージされる", () => {
    render(
      <table>
        <tbody>
          <tr>
            <Td className="text-right tabular-nums">123</Td>
          </tr>
        </tbody>
      </table>,
    );

    const cell = screen.getByText("123");
    expect(cell.className).toContain("px-3");
    expect(cell.className).toContain("py-2");
    expect(cell.className).toContain("text-right");
    expect(cell.className).toContain("tabular-nums");
  });
});
