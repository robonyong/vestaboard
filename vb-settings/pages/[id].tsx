import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/dist/client/router";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

import { Settings } from "../components/SubscriptionSetting";

const VBSettings = dynamic(import("../components/SubscriptionSetting"), {
  ssr: false,
});

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
        transitDays: settings.transitDays.split(","),
        calendarDays: settings.calendarDays.split(","),
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
