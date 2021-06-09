import { GetServerSideProps } from "next";
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
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    fetch(`/api/settings/${id}`).then((res) => {
      if (res.ok) {
        res.json().then((data: Settings) => setSettings(data));
      }
    });
    return () => {};
  }, [id, setSettings]);

  return <>{settings ? <VBSettings {...settings} /> : null}</>;
};

export default dynamic(() => Promise.resolve(Index), {
  ssr: false,
});
