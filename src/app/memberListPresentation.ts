export function memberCountLabel(query: string, visibleCount: number, totalCount: number): string {
  return query.trim()
    ? `검색 ${visibleCount}명 / 전체 ${totalCount}명`
    : `전체 ${totalCount}명`;
}
