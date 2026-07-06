import type { Person } from "@/store/types";
import { useAppStore } from "@/store/useAppStore";

export const usePersonList = (): Person[] => {
  const persons = useAppStore((state) => state.persons);
  return Object.values(persons).toSorted((left, right) =>
    left.name.localeCompare(right.name, "ja"),
  );
};
