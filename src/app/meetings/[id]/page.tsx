import { Suspense } from "react";
import MeetingClient from "./MeetingClient";

export default function Page() {
  return (
    <Suspense fallback={<p>Loading...</p>}>
      <MeetingClient />
    </Suspense>
  );
}
