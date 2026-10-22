/** The internal collection_number is a database key, never a printed number. */
export default function HadithOriginalNumber({ originalNumber }) {
  return originalNumber ? `原书编号 ${originalNumber}` : '原书未编号';
}
