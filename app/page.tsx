import { requireChatGPTUser } from "./chatgpt-auth";
import { AuditIntake } from "./AuditIntake";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await requireChatGPTUser("/");

  return <AuditIntake reviewerName={user.displayName} />;
}
