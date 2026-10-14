import { resourceByKey } from "./backoffice-resources.js";
import type { PersistentApiStore } from "../store.js";
import { featureEntries } from "./backoffice-content-resources.js";
/** Club-scoped public presentation, containing only enabled predefined content. */
export function clubPresentation(store: PersistentApiStore, clubId: string) {
  const rows = (key: string) =>
    store.repositories.backofficeManagement
      .list(resourceByKey(key)!, clubId)
      .filter((row) => row.values.status === "active");
  const now = Date.now();
  const branding = rows("branding")[0];
  const articles = new Set(
    store.listContentArticles(clubId).map((article) => article.id),
  );
  const ordered = (key: string) =>
    rows(key).sort(
      (a, b) =>
        Number(a.values.sortOrder ?? 0) - Number(b.values.sortOrder ?? 0) ||
        a.id.localeCompare(b.id),
    );
  return {
    branding: branding
      ? {
          name: branding.values.name,
          logoUrl: branding.values.logoUrl ?? null,
          primaryColor: branding.values.primaryColor ?? null,
        }
      : null,
    banners: ordered("banners")
      .filter(
        (row) =>
          (!row.values.startsAt ||
            Date.parse(String(row.values.startsAt)) <= now) &&
          (!row.values.endsAt || Date.parse(String(row.values.endsAt)) > now) &&
          (!row.values.articleId || articles.has(String(row.values.articleId))),
      )
      .map((row) => ({ id: row.id, ...row.values })),
    shareTemplates: rows("share-templates").map((row) => ({
      id: row.id,
      ...row.values,
    })),
    evaluationPhrases: rows("evaluation-phrases").map((row) => ({
      id: row.id,
      ...row.values,
    })),
    optionalFeatures: ordered("optional-features").map((row) => ({
      key: row.values.key,
      name: row.values.name,
      path: featureEntries.find((item) => item.value === row.values.key)!.path,
    })),
  };
}
