/** Shared with case create/edit and case detail «Хэргийн бүртгэлийн мэдээлэл» */

export const SUBJECT_TYPE_OPTIONS = [
  { value: "Хохирогч", label: "Хохирогч" },
  { value: "сэжигтэн", label: "сэжигтэн" },
  { value: "яллагдагч", label: "яллагдагч" },
  { value: "шүүгчдэгч", label: "шүүгчдэгч" },
  { value: "иргэний хариуцагч", label: "иргэний хариуцагч" },
  { value: "иргэний нэхэмжлэгч", label: "иргэний нэхэмжлэгч" },
  { value: "гэрчи", label: "гэрчи" },
  { value: "хуулийн этгээд холбогдсон", label: "хуулийн этгээд холбогдсон" },
] as const;

export const PARTICIPANT_COUNT_OPTIONS = [
  { value: "1-5", label: "1-5" },
  { value: "6-10", label: "6-10" },
  { value: "11-с дээш", label: "11-с дээш" },
] as const;

export const TSAH_TYPE_OPTIONS = [
  { value: "Үгүй", label: "Үгүй" },
  { value: "Хувийн баталгаа гаргах", label: "Хувийн баталгаа гаргах" },
  { value: "Цагдан хорих", label: "Цагдан хорих" },
  { value: "Түдгэлзүүлэх", label: "Түдгэлзүүлэх" },
  { value: "Хязгаарлалт тогтоох", label: "Хязгаарлалт тогтоох" },
  { value: "Барьцаа авах", label: "Барьцаа авах" },
  { value: "Цэргийн ангийн удирдлагад харгалзуулах", label: "Цэргийн ангийн удирдлагад харгалзуулах" },
] as const;
