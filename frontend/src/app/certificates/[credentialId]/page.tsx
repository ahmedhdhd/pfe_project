import Image from "next/image";
import { notFound } from "next/navigation";
import { Award, CalendarDays, ShieldCheck } from "lucide-react";

interface CertificatePageProps {
  params: Promise<{
    credentialId: string;
  }>;
}

export default async function CertificateVerificationPage({
  params,
}: CertificatePageProps) {
  const { credentialId } = await params;
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL;

  if (!apiBaseUrl) {
    notFound();
  }

  const response = await fetch(
    `${apiBaseUrl}/api/batches/certificates/${credentialId}`,
    {
      cache: "no-store",
    }
  );

  if (!response.ok) {
    notFound();
  }

  const payload = (await response.json()) as {
    data?: {
      certificate?: {
        credentialId: string;
        recipientName: string;
        batchName: string;
        certificateTitle?: string | null;
        organizationName?: string | null;
        issuerName?: string | null;
        signerName?: string | null;
        issuedAt: string;
      };
      organization?: {
        name: string;
        slug: string;
      };
      batch?: {
        id: string;
        name: string;
        imageUrl?: string | null;
      };
    };
  };

  const certificate = payload.data?.certificate;
  const organization = payload.data?.organization;
  const batch = payload.data?.batch;

  if (!certificate) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 via-white to-emerald-50 px-4 py-10">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="rounded-3xl border border-emerald-200/70 bg-white/90 p-8 shadow-xl backdrop-blur">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-2 text-sm font-medium text-emerald-800">
                <ShieldCheck className="h-4 w-4" />
                Verified Certificate
              </div>
              <div className="space-y-2">
                <h1 className="text-3xl font-semibold text-slate-950">
                  {certificate.certificateTitle || certificate.batchName}
                </h1>
                <p className="text-lg text-slate-600">
                  Awarded to{" "}
                  <span className="font-semibold text-slate-900">
                    {certificate.recipientName}
                  </span>
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-600">
              <p className="font-medium text-slate-900">Credential ID</p>
              <p className="mt-1 break-all">{certificate.credentialId}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr,0.8fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <Award className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold text-slate-950">
                  Certificate Details
                </h2>
              </div>

              <dl className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <dt className="text-sm text-slate-500">Course</dt>
                  <dd className="mt-1 font-medium text-slate-900">
                    {certificate.batchName}
                  </dd>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <dt className="text-sm text-slate-500">Issued By</dt>
                  <dd className="mt-1 font-medium text-slate-900">
                    {certificate.organizationName ||
                      certificate.issuerName ||
                      organization?.name ||
                      "TeslaAcademy"}
                  </dd>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <dt className="text-sm text-slate-500">Issue Date</dt>
                  <dd className="mt-1 flex items-center gap-2 font-medium text-slate-900">
                    <CalendarDays className="h-4 w-4 text-slate-500" />
                    {new Date(certificate.issuedAt).toLocaleDateString(
                      "en-GB",
                      {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      }
                    )}
                  </dd>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <dt className="text-sm text-slate-500">Course Creator</dt>
                  <dd className="mt-1 font-medium text-slate-900">
                    {certificate.signerName || "Academic Team"}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          <div className="space-y-6">
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="relative aspect-[4/3] bg-slate-100">
                {batch?.imageUrl ? (
                  <Image
                    src={batch.imageUrl}
                    alt={batch.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 320px"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-slate-500">
                    Course image unavailable
                  </div>
                )}
              </div>
              <div className="space-y-2 p-5">
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
                  Verified By
                </p>
                <p className="text-lg font-semibold text-slate-950">
                  {organization?.name || "TeslaAcademy"}
                </p>
                {organization?.slug ? (
                  <p className="text-sm text-slate-600">
                    Organization slug: {organization.slug}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
