import type { Person } from "@/store/types";
import { useAppStore } from "@/store/useAppStore";
import { useMemo, useState } from "react";

const matchesSearch = (person: Person, normalizedSearch: string): boolean => {
  if (normalizedSearch === "") return true;
  const haystack = [person.name, person.department ?? "", person.email].join("\n").toLowerCase();
  return haystack.includes(normalizedSearch);
};

type UsePersonListResult = {
  totalCount: number;
  filteredPersonList: Person[];
  searchText: string;
  setSearchText: (value: string) => void;
};

export const usePersonList = (): UsePersonListResult => {
  const persons = useAppStore((state) => state.persons);
  const [searchText, setSearchText] = useState("");

  const totalCount = Object.keys(persons).length;

  const filteredPersonList = useMemo(() => {
    const normalizedSearch = searchText.trim().toLowerCase();
    return Object.values(persons)
      .filter((entry) => matchesSearch(entry, normalizedSearch))
      .toSorted((left, right) => left.name.localeCompare(right.name, "ja"));
  }, [persons, searchText]);

  return {
    totalCount,
    filteredPersonList,
    searchText,
    setSearchText,
  };
};
