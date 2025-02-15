'use client'

import DataLoader from "@/components/data-loader";
import { useTranslation } from "react-i18next";

export default function Loading() {

  const { t } = useTranslation();
  return (
    <div className="p-4">
      <DataLoader />
    </div>
  );
}