// helper utilities related to tutoring session filtering

export function escapeRegex(s = "") {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function buildFilter(query) {
  const now = new Date();
  let filter = { "schedule.date": { $gte: now } };

  if (query.tutor) filter.tutor = query.tutor;
  if (query.subject) filter.subject = { $regex: query.subject, $options: "i" };
  if (query.level) filter.level = query.level;
  if (query.status) filter.status = query.status;

  if (query.grade) {
    const g = query.grade;
    const gradeNum = Number(g);
    const gradeOr = [{ level: { $regex: `^${escapeRegex(g)}$`, $options: "i" } }];
    if (!Number.isNaN(gradeNum)) gradeOr.push({ grade: gradeNum });
    else gradeOr.push({ grade: g });
    filter = { $and: [filter, { $or: gradeOr }] };
  }

  return filter;
}
