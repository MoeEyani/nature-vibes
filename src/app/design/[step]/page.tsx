import { notFound } from "next/navigation";
import { isStepId, STEP_BY_ID, STEP_IDS } from "@/constants/steps";
import { ConfiguratorShell } from "@/components/configurator/ConfiguratorShell";
import { SiteHeader } from "@/components/layout/SiteHeader";

export function generateStaticParams() {
  return STEP_IDS.map((step) => ({ step }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ step: string }>;
}) {
  const { step } = await params;
  if (!isStepId(step)) return {};
  return { title: STEP_BY_ID[step].title };
}

export default async function DesignStepPage({
  params,
}: {
  params: Promise<{ step: string }>;
}) {
  const { step } = await params;
  if (!isStepId(step)) notFound();

  return (
    <>
      <SiteHeader />
      <ConfiguratorShell stepId={step} />
    </>
  );
}
