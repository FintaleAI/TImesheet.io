"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { apiRequest } from "@/lib/api";

type PasswordPayload = {
  current_password: string;
  new_password: string;
  confirm_new_password: string;
};

const initialForm: PasswordPayload = {
  current_password: "",
  new_password: "",
  confirm_new_password: "",
};

export function ChangePasswordPanel() {
  const router = useRouter();
  const [form, setForm] = useState<PasswordPayload>(initialForm);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await apiRequest<{ message: string }>("/auth/change-password", {
        method: "POST",
        body: form,
      });
      setSuccess(result.message);
      setForm(initialForm);
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "Unable to change password",
      );
    } finally {
      setSubmitting(false);
    }
  }

  function updateField<K extends keyof PasswordPayload>(key: K, value: PasswordPayload[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  return (
    <main className="shell">
      <section className="panel hero narrow-panel">
        <div className="helper">
          <div>
            <h1>Change Password</h1>
            <p className="muted">
              Update the current account password and clear the first-login password change
              requirement.
            </p>
          </div>
          <button className="button-primary" type="button" onClick={() => router.push("/dashboard")}>
            Back to dashboard
          </button>
        </div>

        <form className="login-form" onSubmit={onSubmit}>
          <div className="input-group">
            <label htmlFor="current_password">Current password</label>
            <input
              id="current_password"
              type="password"
              value={form.current_password}
              onChange={(event) => updateField("current_password", event.target.value)}
            />
          </div>
          <div className="input-group">
            <label htmlFor="new_password">New password</label>
            <input
              id="new_password"
              type="password"
              value={form.new_password}
              onChange={(event) => updateField("new_password", event.target.value)}
            />
          </div>
          <div className="input-group">
            <label htmlFor="confirm_new_password">Confirm new password</label>
            <input
              id="confirm_new_password"
              type="password"
              value={form.confirm_new_password}
              onChange={(event) => updateField("confirm_new_password", event.target.value)}
            />
          </div>
          {error ? <p className="error-text">{error}</p> : null}
          {success ? <p className="success-text">{success}</p> : null}
          <button className="button-primary" type="submit" disabled={submitting}>
            {submitting ? "Updating..." : "Update password"}
          </button>
        </form>
      </section>
    </main>
  );
}
