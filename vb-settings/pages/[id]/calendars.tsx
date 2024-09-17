import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/dist/client/router";
import dynamic from "next/dynamic";

import { Email } from "@prisma/client";

const CalendarSettings = dynamic(import("../../components/CalendarSettings"), {
  ssr: false,
});

const Calendars: React.FC = () => {
  const router = useRouter();
  const { id } = router.query;
  const configuredEmails = useQuery({
    queryKey: ["/settings/{id}/emails", id],
    queryFn: async () => {
      const resp = await fetch(`/api/settings/${id}/emails`);
      if (!resp.ok) {
        return [];
      }
      const emails = await resp.json();
      return emails as Email[];
    },
    enabled: !!id,
  });

  return (
    <CalendarSettings boardId={`${id}`} emails={configuredEmails.data ?? []} />
  );
};

export default dynamic(() => Promise.resolve(Calendars), {
  ssr: false,
});
