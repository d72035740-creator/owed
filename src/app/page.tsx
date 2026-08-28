import { OwedJourney } from "@/components/OwedJourney";
import { loadConsumerRefund } from "@/services/demo-owed";

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: PageProps<"/">) {
  const state = await loadConsumerRefund();
  const query = await searchParams;
  return (
    <OwedJourney
      initialState={state}
      initiallyRepairing={query.repair === "destination"}
    />
  );
}
