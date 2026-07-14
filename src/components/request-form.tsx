"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { requestSchema } from "@/lib/schemas";
import { categories, categoryLabels, urgencies, urgencyMeta } from "@/lib/constants";
import type { z } from "zod";
import dynamic from "next/dynamic";
import { enqueueAction } from "@/lib/offline-queue";
import { useTranslation } from "./i18n-provider";

const LocationPickerMap = dynamic(() => import("./location-picker-map"), { ssr: false });

type RequestInput = z.infer<typeof requestSchema>;

export function RequestForm() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { t } = useTranslation();
  const { data: session } = useSession();
  const form = useForm<RequestInput>({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "WATER",
      urgency: "MEDIUM",
      latitude: 18.963,
      longitude: 72.8258,
      locationName: "",
      contactName: "",
      contactPhone: "",
      contactEmail: "",
      clientUuid: crypto.randomUUID(),
    },
  });

  const values = useWatch({ control: form.control }) as RequestInput;

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
      if (res.ok) {
        const data = await res.json();
        form.setValue("locationName", data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`);
      } else {
        form.setValue("locationName", `${lat.toFixed(4)}, ${lng.toFixed(4)}`);
      }
    } catch (err) {
      console.error("Reverse geocoding error:", err);
      form.setValue("locationName", `${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    }
  };

  useEffect(() => {
    if (session?.user) {
      if (!form.getValues("contactName") && session.user.name) {
        form.setValue("contactName", session.user.name);
      }
      if (!form.getValues("contactEmail") && session.user.email) {
        form.setValue("contactEmail", session.user.email);
      }
      if (!form.getValues("contactPhone") && session.user.phone) {
        form.setValue("contactPhone", session.user.phone);
      }
    }
  }, [session, form]);

  useEffect(() => {
    if (typeof window !== "undefined" && "geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          form.setValue("latitude", latitude);
          form.setValue("longitude", longitude);
          await reverseGeocode(latitude, longitude);
        },
        (err) => console.log("Geolocation error:", err),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    }
  }, []);

  const stepCount = 4;

  async function onSubmit(data: RequestInput) {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        await enqueueAction({ type: "CREATE_REQUEST", payload: data });
        alert("You are offline. Your request has been safely queued and will sync when connection is restored.");
        router.replace("/dashboard");
        router.refresh();
        return;
      }

      const response = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const payload = await response.json();

      if (!response.ok) {
        setSubmitError(payload?.error?._errors?.[0] ?? "We could not submit the request. Please try again.");
        return;
      }

      router.replace(`/requests/${payload.request.id}`);
      router.refresh();
    } catch {
      setSubmitError("We could not submit the request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const canAdvance = useMemo(() => {
    if (!values) return false;

    if (step === 0) {
      return (values.title?.trim()?.length ?? 0) >= 4 && (values.description?.trim()?.length ?? 0) >= 20;
    }

    if (step === 1) {
      return Boolean(values.category && values.urgency);
    }

    if (step === 2) {
      const isNameValid = (values.contactName?.trim()?.length ?? 0) >= 2;
      const isPhoneValid = (values.contactPhone?.trim()?.length ?? 0) >= 7;
      const email = values.contactEmail?.trim() ?? "";
      const isEmailValid = email === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

      return isNameValid && isPhoneValid && isEmailValid;
    }

    return true;
  }, [step, values]);

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="glass-panel rounded-3xl p-5">
      <div className="mb-6 flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
        <span>{t.form.step} {step + 1} / {stepCount}</span>
        <span>{t.form.offlineReady}</span>
      </div>
      <div className="space-y-5">
        {step === 0 ? (
          <>
            <Field label={t.form.title} error={form.formState.errors.title?.message}>
              <input className="input" {...form.register("title")} />
            </Field>
            <Field label={t.form.description} error={form.formState.errors.description?.message}>
              <textarea className="input min-h-40" {...form.register("description")} minLength={20} />
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400 text-right">
                {values.description?.length || 0} / 20 minimum characters
              </div>
            </Field>
          </>
        ) : null}
        {step === 1 ? (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t.form.category}>
                <select className="input" {...form.register("category")}>
                  {categories.map((category) => <option key={category} value={category}>{categoryLabels[category]}</option>)}
                </select>
              </Field>
              <Field label={t.form.urgency}>
                <select className="input" {...form.register("urgency")}>
                  {urgencies.map((urgency) => <option key={urgency} value={urgency}>{urgencyMeta[urgency].label}</option>)}
                </select>
              </Field>
            </div>
            <div className="space-y-2">
              <span className="text-sm font-medium text-slate-800 dark:text-slate-100 block">Select exact location on map</span>
                <div className="h-64 w-full relative">
                  <LocationPickerMap
                    latitude={values.latitude}
                    longitude={values.longitude}
                    onChange={async (lat, lng) => {
                      form.setValue("latitude", lat);
                      form.setValue("longitude", lng);
                      await reverseGeocode(lat, lng);
                    }}
                  />
                </div>
              {values.locationName && (
                <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-3 text-xs leading-relaxed text-slate-700 dark:text-slate-350">
                  <strong>Exact Location Name:</strong> {values.locationName}
                </div>
              )}
            </div>
          </div>
        ) : null}
        {step === 2 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t.form.contactName}>
              <input className="input" placeholder={session?.user?.name ?? ""} {...form.register("contactName")} />
            </Field>
            <Field label={t.form.contactPhone}>
              <input className="input" placeholder={session?.user?.phone ?? ""} {...form.register("contactPhone")} />
            </Field>
            <Field label={t.form.contactEmail}>
              <input className="input sm:col-span-2" placeholder={session?.user?.email ?? ""} {...form.register("contactEmail")} />
            </Field>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  {t.form.photoOptional}
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const formData = new FormData();
                    formData.append("file", file);
                    try {
                      const res = await fetch("/api/upload", {
                        method: "POST",
                        body: formData,
                      });
                      if (res.ok) {
                        const data = await res.json();
                        form.setValue("photoUrl", data.url);
                      }
                    } catch (err) {
                      console.error("Photo upload failed", err);
                    }
                  }}
                  className="input py-2 text-sm text-[color:var(--foreground)]"
                />
                {values.photoUrl && (
                  <div className="mt-3 relative h-28 w-44 overflow-hidden rounded-2xl border border-[color:var(--border)] bg-slate-900/10 group">
                    <img src={values.photoUrl} alt="Upload preview" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => form.setValue("photoUrl", "")}
                      className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-slate-900/60 text-white opacity-0 transition-opacity hover:bg-slate-900/90 group-hover:opacity-100"
                      aria-label="Remove photo"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                    </button>
                  </div>
                )}
              </div>
          </div>
        ) : null}
        {step === 3 ? (
          <div className="space-y-3 text-sm text-slate-700 dark:text-slate-300">
            <p><strong className="text-slate-900 dark:text-white">{values.title}</strong> - {values.description}</p>
            <p>{categoryLabels[values.category]} · {urgencyMeta[values.urgency].label}</p>
            <p>{values.contactName} · {values.contactPhone}</p>
            <p>Location: {values.latitude.toFixed(4)}, {values.longitude.toFixed(4)}</p>
            {values.locationName && (
              <p>Address: {values.locationName}</p>
            )}
            {values.photoUrl && (
              <div className="mt-4">
                <p className="font-semibold text-slate-900 dark:text-white mb-2">Attached Photo:</p>
                <div className="h-32 w-52 overflow-hidden rounded-2xl border border-[color:var(--border)]">
                  <img src={values.photoUrl} alt="Attached verification" className="h-full w-full object-cover" />
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>
      {submitError ? <p className="mt-4 rounded-2xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">{submitError}</p> : null}
      <div className="mt-6 flex items-center justify-between">
        <button type="button" className="focus-ring rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-2 text-sm text-[color:var(--foreground)]/80 disabled:opacity-40" disabled={step === 0 || isSubmitting} onClick={() => setStep((current) => Math.max(current - 1, 0))}>{t.common.back}</button>
        {step < stepCount - 1 ? (
          <button type="button" className="focus-ring rounded-full bg-sky-500 px-5 py-2 text-sm font-semibold text-slate-950 disabled:opacity-40" disabled={!canAdvance || isSubmitting} onClick={() => setStep((current) => current + 1)}>{t.common.next}</button>
        ) : (
          <button type="submit" className="focus-ring rounded-full bg-emerald-400 px-5 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50" disabled={isSubmitting}>
            {isSubmitting ? t.common.loading : t.common.submit}
          </button>
        )}
      </div>
    </form>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-2 text-sm text-slate-600 dark:text-slate-300">
      <span className="font-medium text-slate-800 dark:text-slate-100">{label}</span>
      {children}
      {error ? <span className="text-xs text-red-400">{error}</span> : null}
    </label>
  );
}