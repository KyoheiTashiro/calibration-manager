import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState, type ReactElement } from 'react';

import { DEFAULT_PAGE_SIZE } from './pageItems';
import { Pagination } from './Pagination';

const meta = {
  title: 'UI/Pagination',
  component: Pagination,
} satisfies Meta<typeof Pagination>;

export default meta;

type Props = {
  totalCount: number;
};

// なぜ: Paginationは制御コンポーネント（page/pageSizeを親から受け取る）のため、
// Storybook上で実際にクリック・選択操作を確認できるようuseStateで状態を持つ
// デモ用ラッパーをストーリーファイル内に定義する。
const PaginationDemo = ({ totalCount }: Props): ReactElement => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);

  return (
    <Pagination
      page={page}
      pageSize={pageSize}
      totalCount={totalCount}
      onPageChange={setPage}
      onPageSizeChange={(nextPageSize) => {
        setPageSize(nextPageSize);
      }}
    />
  );
};

export const Default: StoryObj<typeof meta> = {
  // なぜargsが必要か: renderでPaginationDemo（useStateラッパー）を描画するため個々のargsは使わないが、
  // StoryObjの型上componentが要求するargsを満たす必要があるため代表値を渡す。
  args: {
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    totalCount: 123,
    onPageChange: (): void => undefined,
    onPageSizeChange: (): void => undefined,
  },
  render: (): ReactElement => <PaginationDemo totalCount={123} />,
};

export const SinglePage: StoryObj<typeof meta> = {
  args: {
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    totalCount: 5,
    onPageChange: (): void => undefined,
    onPageSizeChange: (): void => undefined,
  },
  render: (): ReactElement => <PaginationDemo totalCount={5} />,
};

export const Empty: StoryObj<typeof meta> = {
  args: {
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    totalCount: 0,
    onPageChange: (): void => undefined,
    onPageSizeChange: (): void => undefined,
  },
  render: (): ReactElement => <PaginationDemo totalCount={0} />,
};

export const ManyPages: StoryObj<typeof meta> = {
  args: {
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    totalCount: 1000,
    onPageChange: (): void => undefined,
    onPageSizeChange: (): void => undefined,
  },
  render: (): ReactElement => <PaginationDemo totalCount={1000} />,
};
