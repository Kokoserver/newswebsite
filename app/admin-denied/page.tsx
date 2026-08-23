import { ShieldX } from "lucide-react";
import Link from "next/link";

export default function AdminDeniedPage() {
  return (
    <main className="admin-denied-page">
      <ShieldX size={44} />
      <p className="route-kicker">Access restricted</p>
      <h1>Your role cannot open this area.</h1>
      <p>Ask a newsroom administrator if you need additional permissions.</p>
      <div><Link href="/admin">Return to admin</Link><Link href="/">View publication</Link></div>
    </main>
  );
}
