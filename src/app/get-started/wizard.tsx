"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createInstitution, type CreateInstitutionForm } from "./_actions";

// ── Types ─────────────────────────────────────────────────────────────────────

type Step = 1 | 2 | 3;

interface FormData {
  institutionName: string;
  institutionType: string;
  city: string;
  emailDomain: string;
  canteenName: string;
  canteenBuilding: string;
  upiVpa: string;
  opensAt: string;
  closesAt: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
}

interface FieldErrors {
  [key: string]: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function validateStep1(data: FormData): FieldErrors {
  const errs: FieldErrors = {};
  if (!data.institutionName.trim()) errs.institutionName = "Institution name is required";
  if (!data.institutionType) errs.institutionType = "Please select an institution type";
  if (!data.city.trim()) errs.city = "City is required";
  return errs;
}

function validateStep2(data: FormData): FieldErrors {
  const errs: FieldErrors = {};
  if (!data.canteenName.trim()) errs.canteenName = "Canteen name is required";
  return errs;
}

function validateStep3(data: FormData): FieldErrors {
  const errs: FieldErrors = {};
  if (!data.adminName.trim()) errs.adminName = "Your name is required";
  if (!data.adminEmail.trim()) errs.adminEmail = "Email is required";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.adminEmail))
    errs.adminEmail = "Enter a valid email address";
  if (!data.adminPassword) errs.adminPassword = "Password is required";
  else if (data.adminPassword.length < 8)
    errs.adminPassword = "Password must be at least 8 characters";
  return errs;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ProgressBar({ step }: { step: Step }) {
  const steps = [
    { n: 1, label: "College" },
    { n: 2, label: "Canteen" },
    { n: 3, label: "Admin account" },
  ];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 36 }}>
      {steps.map((s, i) => (
        <React.Fragment key={s.n}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: 13,
                transition: "all 0.2s",
                background:
                  step > s.n
                    ? "#e60000"
                    : step === s.n
                    ? "#e60000"
                    : "transparent",
                color:
                  step >= s.n ? "#fff" : "var(--gs-ink-muted)",
                border:
                  step >= s.n ? "2px solid #e60000" : "2px solid var(--gs-line)",
              }}
            >
              {step > s.n ? (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2.5 7L5.5 10L11.5 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                s.n
              )}
            </div>
            <span
              style={{
                fontSize: 11,
                fontWeight: step === s.n ? 700 : 400,
                color: step === s.n ? "var(--gs-ink)" : "var(--gs-ink-muted)",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                whiteSpace: "nowrap",
              }}
            >
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              style={{
                flex: 1,
                height: 2,
                background: step > s.n ? "#e60000" : "var(--gs-line)",
                transition: "background 0.3s",
                marginBottom: 20,
                marginLeft: 8,
                marginRight: 8,
              }}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: 13, fontWeight: 600, color: "var(--gs-ink)", letterSpacing: "0.01em" }}>
        {label}
      </label>
      {children}
      {hint && !error && (
        <span style={{ fontSize: 12, color: "var(--gs-ink-muted)" }}>{hint}</span>
      )}
      {error && (
        <span style={{ fontSize: 12, color: "#ef5749", display: "flex", alignItems: "center", gap: 4 }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <circle cx="6" cy="6" r="5" stroke="#ef5749" strokeWidth="1.5" />
            <path d="M6 4v3M6 8.5v.01" stroke="#ef5749" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          {error}
        </span>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  height: 44,
  width: "100%",
  borderRadius: 10,
  border: "1.5px solid var(--gs-line)",
  background: "var(--gs-surface)",
  color: "var(--gs-ink)",
  padding: "0 14px",
  fontSize: 14,
  outline: "none",
  transition: "border-color 0.15s",
  boxSizing: "border-box",
};

const inputErrorStyle: React.CSSProperties = {
  ...inputStyle,
  borderColor: "#ef5749",
};

function TextInput({
  value,
  onChange,
  error,
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement> & { error?: string }) {
  return (
    <input
      style={error ? inputErrorStyle : inputStyle}
      value={value}
      onChange={onChange}
      {...rest}
    />
  );
}

function SelectInput({
  value,
  onChange,
  error,
  children,
  ...rest
}: React.SelectHTMLAttributes<HTMLSelectElement> & { error?: string }) {
  return (
    <select
      style={{ ...inputStyle, appearance: "none", backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23888' strokeWidth='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center", paddingRight: 36, ...(error ? { borderColor: "#ef5749" } : {}) }}
      value={value}
      onChange={onChange}
      {...rest}
    >
      {children}
    </select>
  );
}

// ── Step 1: Institution details ───────────────────────────────────────────────

/**
 * Institution types that should restrict ordering to an email domain.
 * All other types default to open access (allowed_domains = []).
 */
const DOMAIN_RESTRICTED_TYPES = new Set(["college_university", "school"]);

function Step1({
  data,
  errors,
  onChange,
}: {
  data: FormData;
  errors: FieldErrors;
  onChange: (k: keyof FormData, v: string) => void;
}) {
  const showDomainField = DOMAIN_RESTRICTED_TYPES.has(data.institutionType);

  function handleTypeChange(value: string) {
    onChange("institutionType", value);
    // When switching away from a domain-restricted type, clear the email
    // domain so we don't silently pass a stale value to the server action.
    if (!DOMAIN_RESTRICTED_TYPES.has(value)) {
      onChange("emailDomain", "");
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Field label="Institution name" error={errors.institutionName}>
        <TextInput
          placeholder="e.g. IIT Bombay, Hotel Taj, Infosys Campus"
          value={data.institutionName}
          onChange={(e) => onChange("institutionName", e.target.value)}
          error={errors.institutionName}
          autoFocus
        />
      </Field>

      <Field label="Institution type" error={errors.institutionType}>
        <SelectInput
          value={data.institutionType}
          onChange={(e) => handleTypeChange(e.target.value)}
          error={errors.institutionType}
        >
          <option value="">Select type…</option>
          <option value="college_university">College / University</option>
          <option value="school">School</option>
          <option value="corporate_campus">Corporate Campus</option>
          <option value="hospital">Hospital</option>
          <option value="hotel_restaurant">Hotel / Restaurant</option>
          <option value="standalone_canteen">Standalone Canteen</option>
          <option value="other">Other</option>
        </SelectInput>
      </Field>

      <Field label="City" error={errors.city}>
        <TextInput
          placeholder="e.g. Mumbai, Delhi, Bengaluru"
          value={data.city}
          onChange={(e) => onChange("city", e.target.value)}
          error={errors.city}
        />
      </Field>

      {showDomainField ? (
        <Field
          label="Restrict ordering to institutional emails only"
          error={errors.emailDomain}
          hint="Only users whose email ends in this domain can place orders. e.g. iitb.ac.in"
        >
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--gs-ink-muted)", fontSize: 14, pointerEvents: "none" }}>@</span>
            <input
              style={{ ...inputStyle, paddingLeft: 28 }}
              placeholder="iitb.ac.in"
              value={data.emailDomain}
              onChange={(e) => onChange("emailDomain", e.target.value)}
            />
          </div>
        </Field>
      ) : data.institutionType ? (
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
            padding: "12px 14px",
            borderRadius: 10,
            background: "rgba(22,163,74,0.06)",
            border: "1px solid rgba(22,163,74,0.18)",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ marginTop: 1, flexShrink: 0 }}>
            <circle cx="8" cy="8" r="7" stroke="#e60000" strokeWidth="1.5" />
            <path d="M8 5v4M8 10.5v.01" stroke="#e60000" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <p style={{ margin: 0, fontSize: 13, color: "rgba(22,163,74,0.95)", lineHeight: 1.5 }}>
            <strong>Open access</strong> — any signed-in user can order here. No email domain required.
          </p>
        </div>
      ) : null}
    </div>
  );
}

// ── Step 2: First canteen ────────────────────────────────────────────────────

function Step2({
  data,
  errors,
  onChange,
}: {
  data: FormData;
  errors: FieldErrors;
  onChange: (k: keyof FormData, v: string) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Field label="Canteen name" error={errors.canteenName}>
        <TextInput
          placeholder="e.g. Main Canteen, Block A Mess, Cafeteria"
          value={data.canteenName}
          onChange={(e) => onChange("canteenName", e.target.value)}
          error={errors.canteenName}
          autoFocus
        />
      </Field>

      <Field label="Location on campus" error={errors.canteenBuilding}>
        <TextInput
          placeholder="e.g. Academic Block, Ground Floor, Building C"
          value={data.canteenBuilding}
          onChange={(e) => onChange("canteenBuilding", e.target.value)}
          error={errors.canteenBuilding}
        />
      </Field>

      <Field
        label="UPI address (VPA)"
        hint="e.g. canteen@okaxis — students will pay directly to this VPA. Optional."
      >
        <TextInput
          placeholder="canteen@okaxis"
          value={data.upiVpa}
          onChange={(e) => onChange("upiVpa", e.target.value)}
        />
      </Field>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Field label="Opens at">
          <input
            type="time"
            style={inputStyle}
            value={data.opensAt}
            onChange={(e) => onChange("opensAt", e.target.value)}
          />
        </Field>
        <Field label="Closes at">
          <input
            type="time"
            style={inputStyle}
            value={data.closesAt}
            onChange={(e) => onChange("closesAt", e.target.value)}
          />
        </Field>
      </div>
    </div>
  );
}

// ── Step 3: Admin account ─────────────────────────────────────────────────────

function Step3({
  data,
  errors,
  onChange,
}: {
  data: FormData;
  errors: FieldErrors;
  onChange: (k: keyof FormData, v: string) => void;
}) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Field label="Your name" error={errors.adminName}>
        <TextInput
          placeholder="Full name"
          value={data.adminName}
          onChange={(e) => onChange("adminName", e.target.value)}
          error={errors.adminName}
          autoFocus
          autoComplete="name"
        />
      </Field>

      <Field label="Your email" error={errors.adminEmail}>
        <TextInput
          type="email"
          placeholder="you@example.com"
          value={data.adminEmail}
          onChange={(e) => onChange("adminEmail", e.target.value)}
          error={errors.adminEmail}
          autoComplete="email"
        />
      </Field>

      <Field label="Create password" error={errors.adminPassword} hint="Minimum 8 characters">
        <div style={{ position: "relative" }}>
          <input
            type={showPassword ? "text" : "password"}
            style={{ ...inputStyle, paddingRight: 44, ...(errors.adminPassword ? { borderColor: "#ef5749" } : {}) }}
            placeholder="At least 8 characters"
            value={data.adminPassword}
            onChange={(e) => onChange("adminPassword", e.target.value)}
            autoComplete="new-password"
          />
          <button
            type="button"
            onClick={() => setShowPassword((p) => !p)}
            style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--gs-ink-muted)", padding: 4, lineHeight: 1 }}
            tabIndex={-1}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            )}
          </button>
        </div>
      </Field>

      <div style={{ position: "relative", textAlign: "center", padding: "8px 0" }}>
        <hr style={{ border: "none", borderTop: "1.5px solid var(--gs-line)", margin: 0 }} />
        <span style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", background: "var(--gs-bg)", padding: "0 12px", fontSize: 12, color: "var(--gs-ink-muted)", fontWeight: 500 }}>OR</span>
      </div>

      <button
        type="button"
        disabled
        style={{
          height: 44,
          width: "100%",
          borderRadius: 10,
          border: "1.5px solid var(--gs-line)",
          background: "var(--gs-surface)",
          color: "var(--gs-ink-muted)",
          fontSize: 14,
          fontWeight: 500,
          cursor: "not-allowed",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
        }}
        title="Google OAuth coming soon"
      >
        <svg width="18" height="18" viewBox="0 0 24 24">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        Sign in with Google
        <span style={{ fontSize: 11, background: "var(--gs-line)", borderRadius: 4, padding: "1px 6px", marginLeft: 4 }}>Coming soon</span>
      </button>
    </div>
  );
}

// ── "What you'll get" sidebar ─────────────────────────────────────────────────

function Sidebar() {
  const portals = [
    {
      color: "#e60000",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
        </svg>
      ),
      label: "Student portal",
      desc: "Students browse the menu, pay by UPI, and collect with a 4-digit code.",
    },
    {
      color: "#d52821",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="2" y="3" width="20" height="14" rx="2"/>
          <path d="M8 21h8M12 17v4"/>
        </svg>
      ),
      label: "Kitchen display",
      desc: "Live order queue for the canteen staff. Accept, prepare, and mark as ready.",
    },
    {
      color: "#16a34a",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 11l3 3L22 4"/>
          <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
        </svg>
      ),
      label: "Admin console",
      desc: "Manage your menu, view analytics, invite staff, and configure your canteen.",
    },
  ];

  return (
    <div
      style={{
        background: "var(--gs-surface)",
        border: "1.5px solid var(--gs-line)",
        borderRadius: 16,
        padding: "28px 24px",
        display: "flex",
        flexDirection: "column",
        gap: 24,
        position: "sticky",
        top: 32,
      }}
    >
      <div>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--gs-ink-muted)", margin: "0 0 6px" }}>What you get</p>
        <p style={{ fontSize: 14, color: "var(--gs-ink)", margin: 0, lineHeight: 1.5 }}>
          Three portals, set up in 3 minutes. Free to start — no card required.
        </p>
      </div>

      {portals.map((p) => (
        <div key={p.label} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: `${p.color}18`,
              color: p.color,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {p.icon}
          </div>
          <div>
            <p style={{ margin: "0 0 2px", fontSize: 14, fontWeight: 600, color: "var(--gs-ink)" }}>{p.label}</p>
            <p style={{ margin: 0, fontSize: 13, color: "var(--gs-ink-muted)", lineHeight: 1.5 }}>{p.desc}</p>
          </div>
        </div>
      ))}

      <div
        style={{
          borderTop: "1.5px solid var(--gs-line)",
          paddingTop: 20,
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {[
          "No payment required to start",
          "Open access or domain-restricted — your choice",
          "UPI payments, no gateway fees",
        ].map((item) => (
          <div key={item} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                width: 18,
                height: 18,
                borderRadius: "50%",
                background: "#e6000018",
                color: "#e60000",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M2 5l2.5 2.5L8 2.5" stroke="#e60000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span style={{ fontSize: 13, color: "var(--gs-ink-muted)" }}>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Wizard component ─────────────────────────────────────────────────────

const INITIAL_FORM: FormData = {
  institutionName: "",
  institutionType: "",
  city: "",
  emailDomain: "",
  canteenName: "",
  canteenBuilding: "",
  upiVpa: "",
  opensAt: "08:00",
  closesAt: "20:00",
  adminName: "",
  adminEmail: "",
  adminPassword: "",
};

const STEP_TITLES: Record<Step, { title: string; subtitle: string }> = {
  1: { title: "Tell us about your college or institution", subtitle: "We'll set up your account around it." },
  2: { title: "Set up your first canteen", subtitle: "You can add more canteens from the admin console later." },
  3: { title: "Create your admin account", subtitle: "This is the account you'll use to manage everything." },
};

export function GetStartedWizard() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleChange(key: keyof FormData, value: string) {
    setFormData((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => { const n = { ...prev }; delete n[key]; return n; });
  }

  function handleNext() {
    const validate = step === 1 ? validateStep1 : step === 2 ? validateStep2 : validateStep3;
    const errs = validate(formData);
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    if (step < 3) setStep((prev) => (prev + 1) as Step);
  }

  function handleBack() {
    if (step > 1) setStep((prev) => (prev - 1) as Step);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validateStep3(formData);
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    setSubmitError(null);

    startTransition(async () => {
      const payload: CreateInstitutionForm = {
        institutionName: formData.institutionName,
        institutionType: formData.institutionType,
        city: formData.city,
        emailDomain: formData.emailDomain.trim() || null,
        canteenName: formData.canteenName,
        canteenBuilding: formData.canteenBuilding.trim() || null,
        upiVpa: formData.upiVpa.trim() || null,
        opensAt: formData.opensAt || null,
        closesAt: formData.closesAt || null,
        adminEmail: formData.adminEmail,
        adminPassword: formData.adminPassword,
        adminName: formData.adminName,
      };

      const result = await createInstitution(payload);
      if (!result.ok) {
        setSubmitError(result.error ?? "Something went wrong. Please try again.");
        return;
      }
      router.push(`/c/${result.canteenSlug}/admin/dashboard?welcome=1`);
    });
  }

  const title = STEP_TITLES[step];

  return (
    <>
      <style>{`
        .gs-root {
          --gs-bg: #f8f9fa;
          --gs-surface: #ffffff;
          --gs-line: rgba(10, 22, 40, 0.1);
          --gs-ink: #0a1628;
          --gs-ink-muted: rgba(10, 22, 40, 0.55);
        }
        @media (prefers-color-scheme: dark) {
          .gs-root {
            --gs-bg: #0a0d12;
            --gs-surface: #0f131a;
            --gs-line: rgba(255, 255, 255, 0.1);
            --gs-ink: #e8ecf2;
            --gs-ink-muted: rgba(232, 236, 242, 0.55);
          }
        }
        html.dark .gs-root {
          --gs-bg: #0a0d12;
          --gs-surface: #0f131a;
          --gs-line: rgba(255, 255, 255, 0.1);
          --gs-ink: #e8ecf2;
          --gs-ink-muted: rgba(232, 236, 242, 0.55);
        }
        .gs-input:focus { border-color: #e60000 !important; box-shadow: 0 0 0 3px rgba(230,0,0,0.10); }
        .gs-btn-primary {
          height: 48px;
          border-radius: 12px;
          background: #e60000;
          color: #fff;
          border: none;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.15s, transform 0.1s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          flex: 1;
        }
        .gs-btn-primary:hover:not(:disabled) { background: #0052cc; }
        .gs-btn-primary:active:not(:disabled) { transform: scale(0.98); }
        .gs-btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
        .gs-btn-secondary {
          height: 48px;
          border-radius: 12px;
          background: transparent;
          color: var(--gs-ink);
          border: 1.5px solid var(--gs-line);
          font-size: 15px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.15s;
          padding: 0 20px;
        }
        .gs-btn-secondary:hover { background: var(--gs-line); }
      `}</style>

      <div
        className="gs-root"
        style={{
          minHeight: "100dvh",
          background: "var(--gs-bg)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <header style={{
          borderBottom: "1px solid var(--gs-line)",
          background: "var(--gs-surface)",
          padding: "0 24px",
          height: 56,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <rect width="28" height="28" rx="8" fill="#e60000" />
              <rect x="6" y="10" width="16" height="2.5" rx="1.25" fill="white" />
              <rect x="8" y="14.5" width="12" height="2.5" rx="1.25" fill="white" />
              <rect x="10" y="19" width="8" height="2.5" rx="1.25" fill="white" />
            </svg>
            <span style={{ fontWeight: 700, fontSize: 16, color: "var(--gs-ink)", letterSpacing: "-0.02em" }}>Tray</span>
          </Link>
          <Link href="/login" style={{ fontSize: 13, color: "var(--gs-ink-muted)", textDecoration: "none" }}>
            Already have an account? <span style={{ color: "#e60000", fontWeight: 600 }}>Sign in</span>
          </Link>
        </header>

        {/* Body */}
        <div style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "1fr",
          maxWidth: 1100,
          margin: "0 auto",
          width: "100%",
          padding: "40px 20px 80px",
          gap: 40,
          alignItems: "start",
        }}>
          <style>{`
            @media (min-width: 900px) {
              .gs-body-grid { grid-template-columns: 1fr 380px !important; }
            }
          `}</style>
          <div className="gs-body-grid" style={{ display: "contents" }}>
            {/* Form card */}
            <div
              style={{
                background: "var(--gs-surface)",
                border: "1.5px solid var(--gs-line)",
                borderRadius: 20,
                padding: "36px 32px",
              }}
            >
              <ProgressBar step={step} />

              <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--gs-ink)", margin: "0 0 6px", letterSpacing: "-0.02em" }}>
                {title.title}
              </h1>
              <p style={{ fontSize: 14, color: "var(--gs-ink-muted)", margin: "0 0 32px", lineHeight: 1.5 }}>
                {title.subtitle}
              </p>

              <form onSubmit={handleSubmit} noValidate>
                {step === 1 && <Step1 data={formData} errors={errors} onChange={handleChange} />}
                {step === 2 && <Step2 data={formData} errors={errors} onChange={handleChange} />}
                {step === 3 && <Step3 data={formData} errors={errors} onChange={handleChange} />}

                {submitError && (
                  <div
                    style={{
                      marginTop: 20,
                      padding: "12px 16px",
                      borderRadius: 10,
                      background: "#fbe9e7",
                      border: "1px solid #f7c8c2",
                      color: "#b51b15",
                      fontSize: 13,
                      lineHeight: 1.5,
                    }}
                  >
                    {submitError}
                  </div>
                )}

                <div style={{ display: "flex", gap: 12, marginTop: 32 }}>
                  {step > 1 && (
                    <button
                      type="button"
                      onClick={handleBack}
                      className="gs-btn-secondary"
                      disabled={isPending}
                    >
                      Back
                    </button>
                  )}
                  {step < 3 ? (
                    <button
                      type="button"
                      onClick={handleNext}
                      className="gs-btn-primary"
                      disabled={isPending}
                    >
                      Continue
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M6 12l4-4-4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  ) : (
                    <button
                      type="submit"
                      className="gs-btn-primary"
                      disabled={isPending}
                    >
                      {isPending ? (
                        <>
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ animation: "spin 0.8s linear infinite" }}>
                            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); }}`}</style>
                            <circle cx="8" cy="8" r="6" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
                            <path d="M8 2a6 6 0 016 6" stroke="white" strokeWidth="2" strokeLinecap="round" />
                          </svg>
                          Creating your account…
                        </>
                      ) : (
                        <>
                          Create account
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M6 12l4-4-4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* Sidebar — hidden on mobile, shown on ≥900px via CSS */}
            <div style={{ display: "none" }} className="gs-sidebar-visible">
              <style>{`@media (min-width: 900px) { .gs-sidebar-visible { display: block !important; } }`}</style>
              <Sidebar />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
