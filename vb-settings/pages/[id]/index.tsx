import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/dist/client/router";
import dynamic from "next/dynamic";

import type { Settings } from "../../components/SubscriptionSetting";

const VBSettings = dynamic(() => import("../../components/SubscriptionSetting"), {
  ssr: false,
});

const parseDays = (days: string) => days.split(",").filter(Boolean);

const Index: React.FC = () => {
  const router = useRouter();
  const { id } = router.query;
  const storedSettings = useQuery({
    queryKey: ["/settings", id],
    queryFn: async () => {
      const resp = await fetch(`/api/settings/${id}`);
      if (!resp.ok) {
        return;
      }
      const settings = await resp.json();
      const deserializedSettings: Settings = {
        ...settings,
        transitDays: parseDays(settings.transitDays),
        calendarDays: parseDays(settings.calendarDays),
      };
      return deserializedSettings;
    },
    enabled: !!id,
  });

  return (
    <>
      {storedSettings.data ? (
        <VBSettings settings={storedSettings.data} />
      ) : null}
    </>
  );
};

export default dynamic(() => Promise.resolve(Index), {
  ssr: false,
});
