import type { Metadata } from "next";
import { BRAND } from "@/constants/brand";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { StudioWorkspace } from "@/components/studio/StudioWorkspace";

export const metadata: Metadata = {
  title: "Design Studio",
  description:
    "Build a layout element by element: place posts, seating, planters, a tank and screens exactly where you want them, and edit each one's properties.",
};

export default function StudioPage() {
  return (
    <>
      <SiteHeader />
      <StudioWorkspace />
      <p className="sr-only">
        {BRAND.projectName} Design Studio — element-level layout tool.
      </p>
    </>
  );
}
