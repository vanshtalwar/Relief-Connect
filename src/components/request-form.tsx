"use client";

import { useMemo, useState, useEffect, useRef } from "react";
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
  const getSafeUuid = () =>
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
          const r = (Math.random() * 16) | 0;
          const v = c === "x" ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        });

  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ displayName: string; lat: number; lng: number }[]>([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [showResultsDropdown, setShowResultsDropdown] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowResultsDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectSearchResult = (
    result: { displayName: string; lat: number; lng: number },
    closeOptions = true
  ) => {
    // If the user entered a specific unit / flat / house number prefix, preserve it in the address
    let finalLocationName = result.displayName;
    const trimmedInput = searchQuery.trim();
    const houseMatch = trimmedInput.match(
      /^(flat\s*#?[a-z0-9\-\/]+|house\s*(?:no\.?|number)?\s*#?[a-z0-9\-\/]+|h\.?no\.?\s*#?[a-z0-9\-\/]+|bldg\s*[a-z0-9\-\/]+|[a-z0-9]{1,4}[\-\/][a-z0-9]{1,4})\b/i
    );

    if (houseMatch && !result.displayName.toLowerCase().includes(houseMatch[0].toLowerCase())) {
      finalLocationName = `${houseMatch[0].trim()}, ${result.displayName}`;
    }

    // Direct redirect / move map immediately to this coordinate:
    form.setValue("latitude", result.lat, { shouldValidate: true, shouldDirty: true });
    form.setValue("longitude", result.lng, { shouldValidate: true, shouldDirty: true });
    form.setValue("locationName", finalLocationName, { shouldValidate: true, shouldDirty: true });

    if (closeOptions) {
      setShowResultsDropdown(false);
      setSearchQuery(finalLocationName);
    }
    setSearchError(null);
  };

  const handleSearchLocation = async (
    queryToSearch?: string | React.FormEvent,
    autoFlyToFirst = true
  ) => {
    let query = typeof queryToSearch === "string" ? queryToSearch : searchQuery.trim();
    if (typeof queryToSearch !== "string" && queryToSearch?.preventDefault) {
      queryToSearch.preventDefault();
    }
    if (!query || query.trim().length === 0) return;

    setIsSearchingLocation(true);
    setSearchError(null);
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(query.trim())}`);
      if (res.ok) {
        const data = await res.json();
        if (data.results && data.results.length > 0) {
          setSearchResults(data.results);
          setShowResultsDropdown(true);

          // Direct redirect: immediately fly map to the top candidate!
          if (autoFlyToFirst) {
            handleSelectSearchResult(data.results[0], false);
          }
        } else {
          setSearchResults([]);
          setSearchError("No locations found for this query. Try another address, city, or landmark.");
        }
      } else {
        setSearchError("Location search failed. Please try again.");
      }
    } catch {
      setSearchError("Network error while searching location.");
    } finally {
      setIsSearchingLocation(false);
    }
  };

  // Debounced auto-search as user types (400ms debounce)
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (trimmed.length < 2) {
      setSearchResults([]);
      setSearchError(null);
      return;
    }

    // Don't auto-search if query matches the already selected locationName
    if (trimmed === form.getValues("locationName")?.trim()) {
      return;
    }

    const timer = setTimeout(() => {
      // For debounced typing, fetch options and fly to first match
      void handleSearchLocation(trimmed, true);
    }, 450);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleUseCurrentLocation = () => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      alert("Geolocation is not supported by your browser.");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        form.setValue("latitude", latitude, { shouldValidate: true, shouldDirty: true });
        form.setValue("longitude", longitude, { shouldValidate: true, shouldDirty: true });
        await reverseGeocode(latitude, longitude);
        setSearchResults([]);
        setShowResultsDropdown(false);
        setIsLocating(false);
      },
      (err) => {
        console.warn("Geolocation error:", err);
        alert("Could not access your location. Please check browser location permissions or enter an address in the search bar.");
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  };

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
      photoUrl: "",
      clientUuid: getSafeUuid(),
    },
  });

  const values = useWatch({ control: form.control }) as RequestInput;

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const res = await fetch(`/api/geocode?lat=${lat}&lng=${lng}`);
      if (res.ok) {
        const data = await res.json();
        form.setValue("locationName", data.locationName || `${lat.toFixed(4)}, ${lng.toFixed(4)}`);
      } else {
        form.setValue("locationName", `${lat.toFixed(4)}, ${lng.toFixed(4)}`);
      }
    } catch (err) {
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
        (err) => console.log("Geolocation notice:", err),
        { enableHighAccuracy: false, timeout: 5000, maximumAge: 300000 }
      );
    }
  }, []);

  const isSubmittingRef = useRef(false);
  const stepCount = 4;

  async function onSubmit(data: RequestInput) {
    if (isSubmittingRef.current || isSubmitting) {
      return;
    }
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        await enqueueAction({ type: "CREATE_REQUEST", payload: data });
        alert("You are offline. Your request has been safely queued and will sync when connection is restored.");
        window.location.href = "/dashboard";
        return;
      }

      // Retain stable UUID for this submission session for idempotency
      const formClientUuid = form.getValues("clientUuid") || data.clientUuid || getSafeUuid();
      const submissionData = {
        ...data,
        clientUuid: formClientUuid,
      };

      const response = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submissionData),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        const errorMsg =
          typeof payload?.error === "string"
            ? payload.error
            : payload?.error?._errors?.[0] ??
              payload?.message ??
              "We could not submit the request. Please try again.";
        setSubmitError(errorMsg);
        isSubmittingRef.current = false;
        setIsSubmitting(false);
        return;
      }

      // Submission succeeded: keep isSubmitting=true and lock locked so user cannot re-click while navigating
      if (payload?.request?.id) {
        window.location.href = `/requests/${payload.request.id}`;
      } else {
        window.location.href = "/dashboard";
      }
    } catch (err: any) {
      console.error("Submission error:", err);
      setSubmitError(err?.message || "We could not submit the request. Please check your connection and try again.");
      isSubmittingRef.current = false;
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
            <div className="space-y-3">
              <div>
                <span className="text-sm font-medium text-slate-800 dark:text-slate-100 block">Incident or Relief Location</span>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Making a request for someone else? Search their address, neighborhood, or landmark below.
                </p>
              </div>

              {/* Location Search Bar */}
              <div ref={searchContainerRef} className="relative z-30">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-xs">
                      {isSearchingLocation ? (
                        <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
                      ) : (
                        "📍"
                      )}
                    </span>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        if (searchError) setSearchError(null);
                        setShowResultsDropdown(true);
                      }}
                      onFocus={() => {
                        if (searchResults.length > 0) setShowResultsDropdown(true);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          void handleSearchLocation();
                        }
                      }}
                      placeholder="Search address, city, landmark, or coordinates (e.g. Bandra, Mumbai)..."
                      className="input w-full pl-8 pr-8 text-xs sm:text-sm py-2.5"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery("");
                          setSearchResults([]);
                          setShowResultsDropdown(false);
                          setSearchError(null);
                        }}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => void handleSearchLocation()}
                    disabled={isSearchingLocation || !searchQuery.trim()}
                    className="focus-ring px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-medium text-xs sm:text-sm transition disabled:opacity-50 shrink-0 flex items-center gap-1.5"
                  >
                    {isSearchingLocation ? (
                      <>
                        <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        <span>Searching...</span>
                      </>
                    ) : (
                      <>
                        <span>🔍</span>
                        <span>Search</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleUseCurrentLocation}
                    disabled={isLocating}
                    className="focus-ring px-3 py-2 rounded-xl bg-[color:var(--surface-strong)] hover:bg-[color:var(--border)] text-[color:var(--foreground)] font-medium text-xs sm:text-sm transition border border-[color:var(--border)] shrink-0 flex items-center gap-1"
                    title="Detect and use device GPS location"
                  >
                    <span>{isLocating ? "⏳" : "🎯"}</span>
                    <span className="hidden sm:inline">{isLocating ? "Locating..." : "My GPS"}</span>
                  </button>
                </div>

                {/* Search Results Options List */}
                {showResultsDropdown && searchResults.length > 0 && (
                  <div className="mt-2.5 rounded-2xl border-2 border-sky-400/40 bg-[color:var(--surface-strong)] p-3 space-y-2.5 shadow-xl animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center justify-between pb-1 border-b border-[color:var(--border)]">
                      <div className="flex items-center gap-2">
                        <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-xs font-bold text-[color:var(--foreground)]">
                          Address Options ({searchResults.length} found):
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowResultsDropdown(false)}
                        className="text-[11px] font-semibold text-slate-400 hover:text-slate-200 px-2 py-0.5 rounded-md hover:bg-[color:var(--surface)] transition-colors"
                      >
                        ✕ Close Options
                      </button>
                    </div>

                    <div className="max-h-56 overflow-y-auto space-y-2 pr-1 safe-scrollbar">
                      {searchResults.map((item, idx) => {
                        const isCurrentlyActive =
                          Math.abs(values.latitude - item.lat) < 0.0002 &&
                          Math.abs(values.longitude - item.lng) < 0.0002;

                        return (
                          <div
                            key={idx}
                            onClick={() => handleSelectSearchResult(item, false)}
                            className={`w-full p-2.5 rounded-xl border transition-all flex items-center justify-between gap-3 text-xs cursor-pointer ${
                              isCurrentlyActive
                                ? "bg-sky-500/15 border-sky-400 ring-1 ring-sky-400/40 shadow-sm"
                                : "bg-[color:var(--surface)] border-[color:var(--border)] hover:border-sky-400/50 hover:bg-[color:var(--surface-strong)]"
                            }`}
                          >
                            <div className="flex items-start gap-2.5 min-w-0 flex-1">
                              <span className="text-sky-500 mt-0.5 shrink-0 text-base">📍</span>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="font-bold text-[color:var(--foreground)] truncate text-xs sm:text-sm">
                                    {item.displayName.split(",")[0]}
                                  </p>
                                  {isCurrentlyActive && (
                                    <span className="shrink-0 text-[10px] font-extrabold px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                      ✓ Active on Map
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-[color:var(--foreground)]/70 truncate mt-0.5">
                                  {item.displayName}
                                </p>
                                <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
                                  GPS: {item.lat.toFixed(5)}, {item.lng.toFixed(5)}
                                </span>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectSearchResult(item, false);
                              }}
                              className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                                isCurrentlyActive
                                  ? "bg-emerald-500 text-white shadow-sm"
                                  : "bg-sky-500 hover:bg-sky-400 text-white shadow-sm"
                              }`}
                            >
                              {isCurrentlyActive ? "Selected ✓" : "Move Map →"}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {searchError && (
                  <p className="text-xs text-amber-500 mt-1.5">{searchError}</p>
                )}
              </div>

              {/* Map Picker */}
              <div className="h-64 w-full relative">
                <LocationPickerMap
                  latitude={values.latitude}
                  longitude={values.longitude}
                  onChange={async (lat, lng) => {
                    form.setValue("latitude", lat, { shouldValidate: true, shouldDirty: true });
                    form.setValue("longitude", lng, { shouldValidate: true, shouldDirty: true });
                    await reverseGeocode(lat, lng);
                  }}
                />
              </div>

              {values.locationName && (
                <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-3.5 text-xs leading-relaxed text-slate-700 dark:text-slate-350 flex items-start gap-2.5">
                  <span className="text-sky-500 mt-0.5 shrink-0 text-base">📌</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-slate-800 dark:text-slate-100">
                      Selected Location:
                    </p>
                    <p className="text-slate-600 dark:text-slate-300 mt-0.5 break-words">
                      {values.locationName}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1 font-mono">
                      GPS: {values.latitude.toFixed(5)}, {values.longitude.toFixed(5)} • Drag marker on map anytime to fine-tune exact building
                    </p>
                  </div>
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
                <input type="hidden" {...form.register("photoUrl")} />
                <input
                  type="file"
                  accept="image/*"
                  disabled={isUploadingPhoto || isSubmitting}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const formData = new FormData();
                    formData.append("file", file);
                    setIsUploadingPhoto(true);
                    try {
                      const res = await fetch("/api/upload", {
                        method: "POST",
                        body: formData,
                      });
                      if (res.ok) {
                        const data = await res.json();
                        form.setValue("photoUrl", data.url, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
                      } else {
                        const data = await res.json().catch(() => null);
                        alert(data?.error || "Failed to upload photo. Please try again.");
                      }
                    } catch (err) {
                      console.error("Photo upload failed", err);
                      alert("Photo upload failed. Please check your connection.");
                    } finally {
                      setIsUploadingPhoto(false);
                    }
                  }}
                  className="input py-2 text-sm text-[color:var(--foreground)]"
                />
                {isUploadingPhoto && (
                  <div className="flex items-center gap-2 mt-2 text-xs text-sky-500 dark:text-sky-400 font-medium animate-pulse">
                    <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    <span>Uploading and verifying photo...</span>
                  </div>
                )}
                {values.photoUrl && !isUploadingPhoto && (
                  <div className="mt-3 relative h-28 w-44 overflow-hidden rounded-2xl border border-[color:var(--border)] bg-slate-900/10 group">
                    <img src={values.photoUrl} alt="Upload preview" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => form.setValue("photoUrl", "", { shouldValidate: true, shouldDirty: true })}
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
        <button type="button" className="focus-ring rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-2 text-sm text-[color:var(--foreground)]/80 disabled:opacity-40" disabled={step === 0 || isSubmitting || isUploadingPhoto} onClick={() => setStep((current) => Math.max(current - 1, 0))}>{t.common.back}</button>
        {step < stepCount - 1 ? (
          <button type="button" className="focus-ring rounded-full bg-sky-500 px-5 py-2 text-sm font-semibold text-slate-950 disabled:opacity-40" disabled={!canAdvance || isSubmitting || isUploadingPhoto} onClick={() => setStep((current) => current + 1)}>
            {isUploadingPhoto ? "Uploading Photo..." : t.common.next}
          </button>
        ) : (
          <button type="submit" className="focus-ring flex items-center gap-2 rounded-full bg-emerald-400 px-6 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50" disabled={isSubmitting || isUploadingPhoto}>
            {isSubmitting ? (
              <>
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
                <span>Submitting &amp; Opening...</span>
              </>
            ) : isUploadingPhoto ? "Uploading Photo..." : t.common.submit}
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