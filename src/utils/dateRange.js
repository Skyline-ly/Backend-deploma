export function getCreatedAtRange(query) {
  const { fromDate, toDate } = query;
  if (!fromDate && !toDate) return { range: null };

  const parseDate = (value) => {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return null;
    }

    const date = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
      return null;
    }
    return date;
  };

  const range = {};
  if (fromDate) {
    const startDate = parseDate(fromDate);
    if (!startDate) {
      return {
        error: "fromDate must be a valid date in YYYY-MM-DD format",
      };
    }
    range.$gte = startDate;
  }

  if (toDate) {
    const endDate = parseDate(toDate);
    if (!endDate) {
      return {
        error: "toDate must be a valid date in YYYY-MM-DD format",
      };
    }
    endDate.setUTCDate(endDate.getUTCDate() + 1);
    range.$lt = endDate;
  }

  if (range.$gte && range.$lt && range.$gte >= range.$lt) {
    return { error: "fromDate must be on or before toDate" };
  }

  return { range };
}

export function applyCreatedAtRange(query, dateRange) {
  if (dateRange) query.createdAt = dateRange;
  return query;
}
