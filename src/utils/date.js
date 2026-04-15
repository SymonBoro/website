function startOfDay(date = new Date()) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(date = new Date()) {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

function isSameDay(left, right) {
  if (!left || !right) {
    return false;
  }

  return startOfDay(left).getTime() === startOfDay(right).getTime();
}

function isYesterday(date, reference = new Date()) {
  if (!date) {
    return false;
  }

  const yesterday = startOfDay(reference);
  yesterday.setDate(yesterday.getDate() - 1);
  return startOfDay(date).getTime() === yesterday.getTime();
}

module.exports = {
  startOfDay,
  endOfDay,
  isSameDay,
  isYesterday
};
