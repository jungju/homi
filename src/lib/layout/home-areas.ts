export type HomeAreaId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export type HomePlacementOrigin =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'center'
  | 'bottom-center'
  | 'bottom-right';

export interface HomePlacement {
  areas: HomeAreaId[];
  origin: HomePlacementOrigin;
  offsetX?: string;
  offsetY?: string;
  zIndex?: number;
}

export const HOME_AREA_IDS: HomeAreaId[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];

export const HOME_AREA_DEBUG_LABELS: Record<HomeAreaId, string> = {
  1: 'area-1 · 좌상단',
  2: 'area-2 · 상단 중앙',
  3: 'area-3 · 우상단',
  4: 'area-4 · 중앙 왼쪽',
  5: 'area-5 · 정중앙',
  6: 'area-6 · 중앙 오른쪽',
  7: 'area-7 · 좌하단',
  8: 'area-8 · 하단 중앙',
  9: 'area-9 · 우하단',
};

function areaToCell(area: HomeAreaId) {
  const index = area - 1;
  return {
    row: Math.floor(index / 3) + 1,
    col: (index % 3) + 1,
  };
}

function isContiguous(values: number[]) {
  for (let index = 1; index < values.length; index += 1) {
    if (values[index] !== values[index - 1] + 1) {
      return false;
    }
  }
  return true;
}

export function getHomeAreaSpan(areas: HomeAreaId[]) {
  const uniqueAreas = [...new Set(areas)].sort((left, right) => left - right) as HomeAreaId[];
  if (uniqueAreas.length === 0) {
    throw new Error('At least one home area is required.');
  }

  const cells = uniqueAreas.map(areaToCell);
  const rows = [...new Set(cells.map((cell) => cell.row))].sort((left, right) => left - right);
  const cols = [...new Set(cells.map((cell) => cell.col))].sort((left, right) => left - right);

  if (rows.length === 1 && isContiguous(cols)) {
    return {
      rowStart: rows[0],
      rowEnd: rows[0] + 1,
      colStart: cols[0],
      colEnd: cols[cols.length - 1] + 1,
    };
  }

  if (cols.length === 1 && isContiguous(rows)) {
    return {
      rowStart: rows[0],
      rowEnd: rows[rows.length - 1] + 1,
      colStart: cols[0],
      colEnd: cols[0] + 1,
    };
  }

  throw new Error(`Home areas must form a contiguous horizontal or vertical span: ${uniqueAreas.join(',')}`);
}

function getOriginAlignment(origin: HomePlacementOrigin) {
  switch (origin) {
    case 'top-left':
      return { justify: 'flex-start', align: 'flex-start' };
    case 'top-center':
      return { justify: 'center', align: 'flex-start' };
    case 'top-right':
      return { justify: 'flex-end', align: 'flex-start' };
    case 'center':
      return { justify: 'center', align: 'center' };
    case 'bottom-center':
      return { justify: 'center', align: 'flex-end' };
    case 'bottom-right':
      return { justify: 'flex-end', align: 'flex-end' };
  }
}

export function getHomePlacementStyle(placement: HomePlacement) {
  const span = getHomeAreaSpan(placement.areas);
  const align = getOriginAlignment(placement.origin);

  return [
    `--home-area-col-start:${span.colStart}`,
    `--home-area-col-end:${span.colEnd}`,
    `--home-area-row-start:${span.rowStart}`,
    `--home-area-row-end:${span.rowEnd}`,
    `--home-area-justify:${align.justify}`,
    `--home-area-align:${align.align}`,
    `--home-area-offset-x:${placement.offsetX ?? '0px'}`,
    `--home-area-offset-y:${placement.offsetY ?? '0px'}`,
    `--home-area-z:${placement.zIndex ?? 1}`,
  ].join(';');
}
