import { KudosInbox } from "@/components/kudos-inbox";

export default function KudosPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <h1 className="text-3xl font-bold mb-8">Kudos</h1>
      <KudosInbox />
    </div>
  );
}