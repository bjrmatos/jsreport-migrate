
export default function getTimestampFromNedbDate(value) {
  let result;

  if (typeof value === 'string' ||
    typeof value === 'number') {
    result = value;
  } else {
    result = value.$$date;
  }

  return new Date(result).getTime();
}
