import { useEffect, useState } from "react";
import {
  PageContainer,
  ProTable,
  type ProColumns,
} from "@ant-design/pro-components";
import { Alert, Button, Input, Space } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import { api, errorText, validCatalog, type Catalog } from "../services/api";
export default function CatalogPage({ table }: { table: string }) {
  const [data, setData] = useState<Catalog>();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    void api<Catalog>(
      `catalog/${encodeURIComponent(table)}?${new URLSearchParams({ search: query, offset: String((page - 1) * 20) })}`,
      { signal: controller.signal },
    )
      .then((result) => {
        if (!validCatalog(result)) throw new Error("Invalid catalog");
        if (!controller.signal.aborted) setData(result);
      })
      .catch((reason) => {
        if (!controller.signal.aborted) {
          setError(errorText(reason));
          setData(undefined);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [table, query, page, refresh]);
  const columns: ProColumns<Catalog["rows"][number]>[] = (
    data?.columns ?? []
  ).map((title, index) => ({
    title,
    key: String(index),
    render: (_, row) => row.values[index] ?? "—",
  }));
  return (
    <PageContainer
      title={data?.title ?? "业务资料"}
      subTitle="俱乐部内的当前有效资料"
    >
      {error && (
        <Alert
          message={error}
          type="error"
          action={
            <Button onClick={() => setRefresh((v) => v + 1)}>重试</Button>
          }
          className="form-alert"
        />
      )}
      <ProTable
        rowKey="id"
        columns={columns}
        dataSource={data?.rows ?? []}
        loading={loading}
        search={false}
        options={false}
        scroll={{ x: "max-content" }}
        pagination={{
          current: page,
          pageSize: 20,
          total: data?.total ?? 0,
          showSizeChanger: false,
          onChange: setPage,
        }}
        toolBarRender={() => [
          <Space key="search">
            <Input.Search
              aria-label="搜索资料"
              placeholder="搜索姓名、名称或关键字"
              value={search}
              maxLength={60}
              onChange={(event) => setSearch(event.target.value)}
              onSearch={() => {
                setPage(1);
                setQuery(search.trim());
              }}
              allowClear
            />
            <Button
              icon={<ReloadOutlined />}
              onClick={() => setRefresh((v) => v + 1)}
            >
              刷新
            </Button>
          </Space>,
        ]}
        locale={{ emptyText: query ? "没有匹配的记录" : "暂无记录" }}
      />
    </PageContainer>
  );
}
