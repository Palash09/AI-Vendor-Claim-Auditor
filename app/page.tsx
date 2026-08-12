import { requireReviewer } from "./reviewer-auth";
import { AuditIntake } from "./AuditIntake";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await requireReviewer("/");

  return <AuditIntake reviewerName={user.displayName} />;
}
