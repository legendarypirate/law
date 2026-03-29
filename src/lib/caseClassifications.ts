/** Жагсаалтаас ирсэн «Хэргийн зүйлчлэл» — API `order` дарааллыг UI-д нэгэн жигнэхэд */
export type CaseClassificationListItem = {
  id: string;
  name: string;
  order: number;
};

export function sortCaseClassifications<T extends CaseClassificationListItem>(
  items: T[]
): T[] {
  return [...items].sort(
    (a, b) => a.order - b.order || a.name.localeCompare(b.name, "mn")
  );
}
