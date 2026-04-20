import { notFound } from "next/navigation";
import { HeroBanner } from "@/components/dashboard/HeroBanner";
import { WeeklyUpdate } from "@/components/dashboard/WeeklyUpdate";
import { PrototypePreview } from "@/components/dashboard/PrototypePreview";
import { SprintTracker } from "@/components/dashboard/SprintTracker";
import { SpecTracker } from "@/components/dashboard/SpecTracker";
import { DocumentLibrary } from "@/components/dashboard/DocumentLibrary";
import { Horizon } from "@/components/dashboard/Horizon";
import { LaunchMetrics } from "@/components/dashboard/LaunchMetrics";

const VALID_SLUGS = ["lee-a3f8b2"];

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  if (!VALID_SLUGS.includes(slug)) {
    notFound();
  }

  return (
    <div className="space-y-16">
      <HeroBanner />
      <WeeklyUpdate />
      {/* LKID-75 — live launch metrics above the sprint tracker so Lee
          sees production numbers first once the app is public. */}
      <LaunchMetrics slug={slug} />
      <PrototypePreview />
      <SprintTracker />
      <SpecTracker />
      <DocumentLibrary />
      <Horizon />
    </div>
  );
}
