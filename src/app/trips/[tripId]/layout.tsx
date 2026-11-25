import { Suspense } from "react";
import UploadSessionBoundary from "@/components/upload/UploadSession";

// Shared by every page of a trip. Its job is to hold the photo upload above the
// cover and photo steps, so moving between them never interrupts an upload.
export default async function TripLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;
  return (
    <Suspense fallback={null}>
      <UploadSessionBoundary tripId={tripId}>{children}</UploadSessionBoundary>
    </Suspense>
  );
}
